import type { AiAssessment, MatchAnalysis, MatchListItem } from "@jobpilot/contracts";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { Drizzle } from "../drizzle.js";
import { companies, postings, profiles, vacancies, vacancyMatches } from "../schema.js";

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

export interface MatchesRepository {
   /**
    * Open vacancies evaluated for the user's current profile version, best score first. By default only
    * the ones worth a look (verdict apply or stretch); includeSkipped adds AI skips, prefilter rejections
    * and the ones still waiting for a score.
    */
   listForUser(userId: string, options: { includeSkipped: boolean }): Promise<MatchListItem[]>;
   get(userId: string, vacancyId: string): Promise<StoredMatch | undefined>;
   /** Stores the prefilter evaluation, replacing the previous one (and its AI part) for this user and vacancy. */
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
}

export function createMatchesRepository(db: Drizzle): MatchesRepository {
   return {
      async listForUser(userId, { includeSkipped }) {
         const verdict = sql`${vacancyMatches.analysis}->'ai'->>'verdict'`;
         const rows = await db
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
            .where(
               and(
                  eq(vacancyMatches.userId, userId),
                  isNull(vacancies.closedAt),
                  includeSkipped ? undefined : inArray(verdict, ["apply", "stretch"]),
               ),
            )
            .orderBy(
               sql`${vacancyMatches.score} desc nulls last`,
               desc(vacancyMatches.evaluatedAt),
            );

         const urls = rows.length
            ? await db
                 .select({ vacancyId: postings.vacancyId, url: postings.url })
                 .from(postings)
                 .where(
                    and(
                       inArray(
                          postings.vacancyId,
                          rows.map((r) => r.vacancyId),
                       ),
                       isNull(postings.goneAt),
                    ),
                 )
                 .orderBy(postings.firstSeenAt)
            : [];

         return rows.map(
            ({ analysis, salaryMin, salaryMax, salaryCurrency, salaryPeriod, ...r }) => ({
               ...r,
               evaluatedAt: r.evaluatedAt.toISOString(),
               urls: urls.filter((u) => u.vacancyId === r.vacancyId).map((u) => u.url),
               verdict: analysis.ai?.verdict ?? null,
               summary: analysis.ai?.summary ?? null,
               concerns: analysis.ai?.concerns ?? [],
               matchedSkills: analysis.ai?.matchedSkills ?? [],
               missingSkills: analysis.ai?.missingSkills ?? [],
               rejectedBy: analysis.prefilter.rejectedBy,
               salary:
                  salaryCurrency && salaryPeriod && (salaryMin !== null || salaryMax !== null)
                     ? {
                          min: salaryMin ?? undefined,
                          max: salaryMax ?? undefined,
                          currency: salaryCurrency,
                          period: salaryPeriod,
                       }
                     : null,
            }),
         );
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
   };
}
