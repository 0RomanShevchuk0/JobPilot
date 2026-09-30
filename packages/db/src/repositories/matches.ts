import type { MatchAnalysis } from "@jobpilot/contracts";
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
   promptVersion: string | null;
}

export interface MatchesRepository {
   /** The profile version the stored evaluation was made for, if there is one. */
   evaluatedForVersion(userId: string, vacancyId: string): Promise<number | undefined>;
   /** Stores the evaluation, replacing the previous one for this user and vacancy. */
   save(match: MatchInput): Promise<void>;
}

export function createMatchesRepository(db: Drizzle): MatchesRepository {
   return {
      async evaluatedForVersion(userId, vacancyId) {
         const [row] = await db
            .select({ profileVersion: vacancyMatches.profileVersion })
            .from(vacancyMatches)
            .where(and(eq(vacancyMatches.userId, userId), eq(vacancyMatches.vacancyId, vacancyId)));
         return row?.profileVersion;
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
   };
}
