import type {
   AiAssessment,
   ApplyCheck,
   JobPageCheck,
   ApplicationStatus,
   MatchAnalysis,
   MatchDetails,
   MatchListItem,
   MatchStatus,
} from "@jobpilot/contracts";
import { and, desc, eq, inArray, isNull, sql, type SQL } from "drizzle-orm";
import type { Drizzle } from "../drizzle.js";
import {
   applications,
   companies,
   postings,
   profiles,
   sources,
   vacancies,
   vacancyMatches,
} from "../schema.js";

export interface MatchInput {
   userId: string;
   vacancyId: string;
   profileVersion: number;
   prefilterPassed: boolean;
   /** null until AI scoring has run; stays null when the prefilter rejected the vacancy */
   score: number | null;
   analysis: MatchAnalysis;
   model: string | null;
   promptVersion: number | null;
}

export interface StoredMatch {
   profileVersion: number;
   prefilterPassed: boolean;
   analysis: MatchAnalysis;
   /** null until AI scoring has run */
   promptVersion: number | null;
   evaluatedAt: Date;
}

export interface Assessment {
   ai: AiAssessment;
   model: string;
   promptVersion: number;
}

export interface MatchListOptions {
   /** which of the user's marks to list: null = new vacancies */
   status: MatchStatus;
   /** new vacancies only: add AI skips, prefilter rejections and the ones waiting for a score */
   includeSkipped: boolean;
}

export interface MatchesRepository {
   /**
    * Open vacancies evaluated for the user's current profile version, best score first. New ones are
    * by default only those worth a look (verdict apply or stretch); marked ones are listed whatever
    * their verdict, since the user has already decided about them.
    */
   listForUser(userId: string, options: MatchListOptions): Promise<MatchListItem[]>;
   /**
    * One vacancy evaluated for the user's current profile version, with what only its own page shows;
    * closed ones too. Undefined when there is no such evaluation.
    */
   getDetails(userId: string, vacancyId: string): Promise<MatchDetails | undefined>;
   /** Marks a vacancy (null clears the mark). Returns false when it has no evaluation for the user. */
   setStatus(userId: string, vacancyId: string, status: MatchStatus): Promise<boolean>;
   get(userId: string, vacancyId: string): Promise<StoredMatch | undefined>;
   /**
    * Stores the prefilter evaluation, replacing the previous one (and its AI part) for this user and
    * vacancy. The user's status is not part of the evaluation and stays as it is.
    */
   save(match: MatchInput): Promise<void>;
   /**
    * Adds the AI part to the evaluation it was made for: only if that evaluation is still there, made for
    * the same profile version and passed. Returns false when it was replaced meanwhile.
    */
   saveAssessment(
      userId: string,
      vacancyId: string,
      profileVersion: number,
      assessment: Assessment,
   ): Promise<boolean>;
   /**
    * Adds what the job pages showed the user (whether they can apply, the salary against their
    * expectations) to the evaluation it was asked for, on the same terms as saveAssessment. Without
    * applyCheck the can-apply question stays open: match-vacancy asks again. Returns false when the
    * evaluation was replaced meanwhile.
    */
   saveJobPageCheck(
      userId: string,
      vacancyId: string,
      profileVersion: number,
      check: Partial<JobPageCheck>,
   ): Promise<boolean>;
}

export function createMatchesRepository(db: Drizzle): MatchesRepository {
   /** The user's evaluations made for their current profile version that also meet the condition, best first. */
   function selectMatches(userId: string, condition: SQL | undefined) {
      // gone postings count too: a closed vacancy on its own page still has a date
      const publishedAt = sql`(
         select max(coalesce((${postings.parsed}->>'publishedAt')::timestamptz, ${postings.firstSeenAt}))
         from ${postings}
         where ${postings.vacancyId} = ${vacancies.id}
      )`.mapWith(postings.firstSeenAt);
      return (
         db
            .select({
               vacancyId: vacancies.id,
               title: vacancies.title,
               company: companies.name,
               score: vacancyMatches.score,
               analysis: vacancyMatches.analysis,
               salaryMin: vacancies.salaryMin,
               salaryMax: vacancies.salaryMax,
               salaryCurrency: vacancies.salaryCurrency,
               salaryPeriod: vacancies.salaryPeriod,
               workModes: vacancies.workModes,
               publishedAt,
               status: vacancyMatches.status,
               evaluatedAt: vacancyMatches.evaluatedAt,
            })
            .from(vacancyMatches)
            // evaluations made for an older profile version are stale: a re-evaluation is on its way
            .innerJoin(
               profiles,
               and(
                  eq(profiles.userId, vacancyMatches.userId),
                  eq(profiles.version, vacancyMatches.profileVersion),
               ),
            )
            .innerJoin(vacancies, eq(vacancies.id, vacancyMatches.vacancyId))
            .leftJoin(companies, eq(companies.id, vacancies.companyId))
            .where(and(eq(vacancyMatches.userId, userId), condition))
            .orderBy(sql`${vacancyMatches.score} desc nulls last`, desc(vacancyMatches.evaluatedAt))
      );
   }

   /** The selected evaluations with their vacancies' active postings and the user's applications. */
   async function toListItems(
      userId: string,
      rows: Awaited<ReturnType<typeof selectMatches>>,
   ): Promise<MatchListItem[]> {
      if (rows.length === 0) return [];
      const vacancyIds = rows.map((r) => r.vacancyId);
      const activePostings = await db
         .select({
            vacancyId: postings.vacancyId,
            source: postings.sourceId,
            sourceName: sources.name,
            url: postings.url,
         })
         .from(postings)
         .innerJoin(sources, eq(sources.id, postings.sourceId))
         .where(and(inArray(postings.vacancyId, vacancyIds), isNull(postings.goneAt)))
         .orderBy(postings.firstSeenAt);
      // a vacancy can have several postings, each with its own application: the latest one counts
      const userApplications = await db
         .select({
            vacancyId: postings.vacancyId,
            id: applications.id,
            status: applications.status,
         })
         .from(applications)
         .innerJoin(postings, eq(postings.id, applications.postingId))
         .where(and(eq(applications.userId, userId), inArray(postings.vacancyId, vacancyIds)))
         .orderBy(desc(applications.updatedAt));

      return rows.map(({ analysis, salaryMin, salaryMax, salaryCurrency, salaryPeriod, ...r }) => ({
         ...r,
         evaluatedAt: r.evaluatedAt.toISOString(),
         publishedAt: r.publishedAt.toISOString(),
         postings: activePostings
            .filter((p) => p.vacancyId === r.vacancyId)
            .map(({ source, sourceName, url }) => ({ source, sourceName, url })),
         application: applicationOf(userApplications, r.vacancyId),
         verdict: analysis.ai?.verdict ?? null,
         summary: analysis.ai?.summary ?? null,
         concerns: analysis.ai?.concerns ?? [],
         matchedSkills: analysis.ai?.matchedSkills ?? [],
         missingSkills: analysis.ai?.missingSkills ?? [],
         rejectedBy: analysis.prefilter.rejectedBy,
         cannotApplyReason: cannotApplyReason(analysis.applyCheck),
         salaryFit: analysis.salaryFit ?? null,
         salary:
            salaryCurrency && salaryPeriod && (salaryMin !== null || salaryMax !== null)
               ? {
                    min: salaryMin ?? undefined,
                    max: salaryMax ?? undefined,
                    currency: salaryCurrency,
                    period: salaryPeriod,
                 }
               : null,
      }));
   }

   return {
      async listForUser(userId, { status, includeSkipped }) {
         const verdict = sql`${vacancyMatches.analysis}->'ai'->>'verdict'`;
         // absent when the job site wasn't asked: such vacancies stay
         const canApply = sql`(${vacancyMatches.analysis}->'applyCheck'->>'canApply') is distinct from 'false'`;
         const rows = await selectMatches(
            userId,
            and(
               isNull(vacancies.closedAt),
               status === null ? isNull(vacancyMatches.status) : eq(vacancyMatches.status, status),
               status === null && !includeSkipped
                  ? inArray(verdict, ["apply", "stretch"])
                  : undefined,
               // what the job site won't let me apply to is no use among the new ones
               status === null && !includeSkipped ? canApply : undefined,
            ),
         );
         return toListItems(userId, rows);
      },

      async getDetails(userId, vacancyId) {
         const rows = await selectMatches(userId, eq(vacancies.id, vacancyId));
         const [item] = await toListItems(userId, rows);
         if (!item) return undefined;
         const [vacancy] = await db
            .select({ description: vacancies.description, locations: vacancies.locations })
            .from(vacancies)
            .where(eq(vacancies.id, vacancyId));
         return { ...item, ...vacancy };
      },

      async get(userId, vacancyId) {
         const [row] = await db
            .select({
               profileVersion: vacancyMatches.profileVersion,
               prefilterPassed: vacancyMatches.prefilterPassed,
               analysis: vacancyMatches.analysis,
               promptVersion: vacancyMatches.promptVersion,
               evaluatedAt: vacancyMatches.evaluatedAt,
            })
            .from(vacancyMatches)
            .where(and(eq(vacancyMatches.userId, userId), eq(vacancyMatches.vacancyId, vacancyId)));
         return row;
      },

      async setStatus(userId, vacancyId, status) {
         const rows = await db
            .update(vacancyMatches)
            .set({ status })
            .where(and(eq(vacancyMatches.userId, userId), eq(vacancyMatches.vacancyId, vacancyId)))
            .returning({ vacancyId: vacancyMatches.vacancyId });
         return rows.length > 0;
      },

      async save(m) {
         const { userId, vacancyId, ...evaluation } = m;
         await db
            .insert(vacancyMatches)
            .values(m)
            .onConflictDoUpdate({
               target: [vacancyMatches.userId, vacancyMatches.vacancyId],
               set: { ...evaluation, evaluatedAt: sql`now()` },
            });
      },

      async saveAssessment(userId, vacancyId, profileVersion, { ai, model, promptVersion }) {
         const rows = await db
            .update(vacancyMatches)
            .set({
               score: ai.score,
               analysis: sql`${vacancyMatches.analysis} || jsonb_build_object('ai', ${JSON.stringify(ai)}::jsonb)`,
               model,
               promptVersion,
            })
            .where(
               and(
                  eq(vacancyMatches.userId, userId),
                  eq(vacancyMatches.vacancyId, vacancyId),
                  eq(vacancyMatches.profileVersion, profileVersion),
                  eq(vacancyMatches.prefilterPassed, true),
               ),
            )
            .returning({ vacancyId: vacancyMatches.vacancyId });
         return rows.length > 0;
      },

      async saveJobPageCheck(userId, vacancyId, profileVersion, check) {
         const rows = await db
            .update(vacancyMatches)
            .set({
               // its keys (applyCheck, salaryFit) go next to the prefilter's in the analysis
               analysis: sql`${vacancyMatches.analysis} || ${JSON.stringify(check)}::jsonb`,
            })
            .where(
               and(
                  eq(vacancyMatches.userId, userId),
                  eq(vacancyMatches.vacancyId, vacancyId),
                  eq(vacancyMatches.profileVersion, profileVersion),
                  eq(vacancyMatches.prefilterPassed, true),
               ),
            )
            .returning({ vacancyId: vacancyMatches.vacancyId });
         return rows.length > 0;
      },
   };
}

function applicationOf(
   userApplications: { vacancyId: string | null; id: string; status: ApplicationStatus }[],
   vacancyId: string,
): MatchListItem["application"] {
   const found = userApplications.find((a) => a.vacancyId === vacancyId);
   return found ? { id: found.id, status: found.status } : null;
}

function cannotApplyReason(applyCheck: ApplyCheck | undefined): string | null {
   return applyCheck && !applyCheck.canApply ? applyCheck.reason : null;
}
