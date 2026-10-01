import type { AiAssessment, MatchAnalysis } from "@jobpilot/contracts";
import { and, eq, sql } from "drizzle-orm";
import type { Drizzle } from "../drizzle.js";
import { vacancyMatches } from "../schema.js";

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
