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
   /**
    * +1 to the version without changing the profile: something else matching reads changed (the CV),
    * so every evaluation is stale. Returns the new version, or undefined when there is no profile yet.
    */
   bumpVersion(userId: string): Promise<number | undefined>;
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
               experienceYears: row.experienceYears ?? undefined,
               skills: row.skills,
               salary:
                  row.salaryMin !== null && row.salaryCurrency && row.salaryPeriod
                     ? {
                          min: row.salaryMin,
                          target: row.salaryTarget ?? undefined,
                          currency: row.salaryCurrency,
                          period: row.salaryPeriod,
                       }
                     : undefined,
               locations: row.locations,
               workModes: row.workModes,
               languages: row.languages,
               hardFilters: row.hardFilters,
               notes: row.notes,
               applicationMessage: row.applicationMessage,
            },
         };
      },

      async save(userId, p) {
         const columns = {
            contacts: p.contacts,
            titles: p.titles,
            experienceYears: p.experienceYears ?? null,
            skills: p.skills,
            salaryMin: p.salary ? Math.round(p.salary.min) : null,
            salaryTarget: p.salary?.target !== undefined ? Math.round(p.salary.target) : null,
            salaryCurrency: p.salary?.currency ?? null,
            salaryPeriod: p.salary?.period ?? null,
            locations: p.locations,
            workModes: p.workModes,
            languages: p.languages,
            hardFilters: p.hardFilters,
            notes: p.notes,
            applicationMessage: p.applicationMessage,
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

      async bumpVersion(userId) {
         const [row] = await db
            .update(profiles)
            .set({ version: sql`${profiles.version} + 1`, updatedAt: sql`now()` })
            .where(eq(profiles.userId, userId))
            .returning({ version: profiles.version });
         return row?.version;
      },
   };
}
