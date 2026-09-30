import type { Profile } from "@jobpilot/contracts";
import { eq, sql } from "drizzle-orm";
import type { Drizzle } from "../drizzle.js";
import { profiles } from "../schema.js";

export interface StoredProfile {
   profile: Profile;
   /** +1 on every save; matches made for a lower version are stale */
   version: number;
}

export interface ProfilesRepository {
   get(userId: string): Promise<StoredProfile | undefined>;
   /** Creates or replaces the profile. Returns its new version. */
   save(userId: string, profile: Profile): Promise<number>;
}

export function createProfilesRepository(db: Drizzle): ProfilesRepository {
   return {
      async get(userId) {
         const [row] = await db.select().from(profiles).where(eq(profiles.userId, userId));
         if (!row) return undefined;
         return {
            version: row.version,
            profile: {
               contacts: row.contacts,
               titles: row.titles,
               seniority: row.seniority ?? undefined,
               skills: row.skills,
               salary:
                  row.salaryMin !== null && row.salaryCurrency && row.salaryPeriod
                     ? {
                          min: row.salaryMin,
                          currency: row.salaryCurrency,
                          period: row.salaryPeriod,
                       }
                     : undefined,
               locations: row.locations,
               workModes: row.workModes,
               languages: row.languages,
               hardFilters: row.hardFilters,
               notes: row.notes,
            },
         };
      },

      async save(userId, p) {
         const columns = {
            contacts: p.contacts,
            titles: p.titles,
            seniority: p.seniority ?? null,
            skills: p.skills,
            salaryMin: p.salary ? Math.round(p.salary.min) : null,
            salaryCurrency: p.salary?.currency ?? null,
            salaryPeriod: p.salary?.period ?? null,
            locations: p.locations,
            workModes: p.workModes,
            languages: p.languages,
            hardFilters: p.hardFilters,
            notes: p.notes,
         };
         const [row] = await db
            .insert(profiles)
            .values({ userId, ...columns })
            .onConflictDoUpdate({
               target: profiles.userId,
               set: { ...columns, version: sql`${profiles.version} + 1`, updatedAt: sql`now()` },
            })
            .returning({ version: profiles.version });
         return row.version;
      },
   };
}
