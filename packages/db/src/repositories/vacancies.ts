import { isDeepStrictEqual } from "node:util";
import type {
   Language,
   Location,
   NormalizedPosting,
   Salary,
   Seniority,
   VacancyFields,
   WorkMode,
} from "@jobpilot/contracts";
import { and, eq, isNotNull, isNull, sql } from "drizzle-orm";
import type { Drizzle } from "../drizzle.js";
import { companies, postings, vacancies } from "../schema.js";

export interface LinkPostingInput {
   postingId: string;
   fingerprint: string;
   /** undefined when the employer is hidden */
   company?: { name: string; normalizedName: string; website?: string };
   // a new vacancy starts from its first posting; mergeVacancy fills in the rest
   title: string;
   description: string;
}

export interface VacancyPosting {
   postingId: string;
   parsed: NormalizedPosting;
   firstSeenAt: Date;
   goneAt: Date | null;
}

/** What matching needs to know about a vacancy: the prefilter and the scoring prompt. */
export interface VacancyForMatching {
   id: string;
   title: string;
   description: string; // markdown
   seniority?: Seniority;
   workModes: WorkMode[];
   locations: Location[];
   languages: Language[];
   salary?: Salary;
   skills: string[];
   /** undefined when the employer is hidden */
   companyName?: string;
   companyNormalizedName?: string;
   experienceYears?: number;
   /** evaluations made before this are stale */
   updatedAt: Date;
   closedAt: Date | null;
}

export interface VacanciesRepository {
   /**
    * Attaches a posting to its vacancy: the one it is already linked to, else an open vacancy with
    * the same fingerprint, else a new one. Returns the vacancy id.
    */
   linkPosting(input: LinkPostingInput): Promise<string>;
   /** All parsed postings of a vacancy, to merge its fields from. */
   postingsOf(vacancyId: string): Promise<VacancyPosting[]>;
   /** Stores the merged fields. Returns false when they are the same as stored: updatedAt stays as is. */
   update(vacancyId: string, fields: VacancyFields): Promise<boolean>;
   getForMatching(vacancyId: string): Promise<VacancyForMatching | undefined>;
   /** Ids of vacancies that still have an active posting. */
   listOpenIds(): Promise<string[]>;
}

export function createVacanciesRepository(db: Drizzle): VacanciesRepository {
   return {
      async linkPosting({ postingId, fingerprint, company, title, description }) {
         return db.transaction(async (tx) => {
            let companyId: string | null = null;
            if (company) {
               const [row] = await tx
                  .insert(companies)
                  .values(company)
                  .onConflictDoUpdate({
                     target: companies.normalizedName,
                     // keep the first name seen; learn the website if we didn't know it
                     set: { website: sql`coalesce(${companies.website}, excluded.website)` },
                  })
                  .returning({ id: companies.id });
               companyId = row.id;
            }

            const [posting] = await tx
               .select({ vacancyId: postings.vacancyId })
               .from(postings)
               .where(eq(postings.id, postingId));
            if (!posting) throw new Error(`posting ${postingId} not found`);
            if (posting.vacancyId) return posting.vacancyId;

            const [open] = await tx
               .select({ id: vacancies.id })
               .from(vacancies)
               .where(and(eq(vacancies.fingerprint, fingerprint), isNull(vacancies.closedAt)))
               .limit(1);

            const vacancyId =
               open?.id ??
               (
                  await tx
                     .insert(vacancies)
                     .values({ companyId, title, description, fingerprint })
                     .returning({ id: vacancies.id })
               )[0].id;

            await tx.update(postings).set({ vacancyId }).where(eq(postings.id, postingId));
            return vacancyId;
         });
      },

      async postingsOf(vacancyId) {
         const rows = await db
            .select({
               postingId: postings.id,
               parsed: postings.parsed,
               firstSeenAt: postings.firstSeenAt,
               goneAt: postings.goneAt,
            })
            .from(postings)
            .where(and(eq(postings.vacancyId, vacancyId), isNotNull(postings.parsed)));
         return rows.map((r) => ({ ...r, parsed: r.parsed! }));
      },

      async update(vacancyId, v) {
         const fields = {
            title: v.title,
            description: v.description,
            seniority: v.seniority ?? null,
            employmentTypes: v.employmentTypes,
            workModes: v.workModes,
            locations: v.locations,
            languages: v.languages,
            salaryMin: v.salary?.min ?? null,
            salaryMax: v.salary?.max ?? null,
            salaryCurrency: v.salary?.currency ?? null,
            salaryPeriod: v.salary?.period ?? null,
            skills: v.skills,
            experienceYears: v.experienceYears ?? null,
            closedAt: v.closedAt,
         };
         // a bump on the source rebuilds the vacancy from the same postings: only a real change counts
         const [stored] = await db.select().from(vacancies).where(eq(vacancies.id, vacancyId));
         if (stored && sameValues(stored, fields)) return false;

         await db
            .update(vacancies)
            .set({ ...fields, updatedAt: new Date() })
            .where(eq(vacancies.id, vacancyId));
         return true;
      },

      async getForMatching(vacancyId) {
         const [row] = await db
            .select({
               id: vacancies.id,
               title: vacancies.title,
               description: vacancies.description,
               seniority: vacancies.seniority,
               workModes: vacancies.workModes,
               locations: vacancies.locations,
               languages: vacancies.languages,
               salaryMin: vacancies.salaryMin,
               salaryMax: vacancies.salaryMax,
               salaryCurrency: vacancies.salaryCurrency,
               salaryPeriod: vacancies.salaryPeriod,
               skills: vacancies.skills,
               experienceYears: vacancies.experienceYears,
               companyName: companies.name,
               companyNormalizedName: companies.normalizedName,
               updatedAt: vacancies.updatedAt,
               closedAt: vacancies.closedAt,
            })
            .from(vacancies)
            .leftJoin(companies, eq(companies.id, vacancies.companyId))
            .where(eq(vacancies.id, vacancyId));
         if (!row) return undefined;

         const { salaryMin, salaryMax, salaryCurrency, salaryPeriod, ...rest } = row;
         return {
            ...rest,
            seniority: rest.seniority ?? undefined,
            companyName: rest.companyName ?? undefined,
            companyNormalizedName: rest.companyNormalizedName ?? undefined,
            experienceYears: rest.experienceYears ?? undefined,
            salary:
               salaryCurrency && salaryPeriod && (salaryMin !== null || salaryMax !== null)
                  ? {
                       min: salaryMin ?? undefined,
                       max: salaryMax ?? undefined,
                       currency: salaryCurrency,
                       period: salaryPeriod,
                    }
                  : undefined,
         };
      },

      async listOpenIds() {
         const rows = await db
            .select({ id: vacancies.id })
            .from(vacancies)
            .where(isNull(vacancies.closedAt));
         return rows.map((r) => r.id);
      },
   };
}

/**
 * Whether the stored row already holds these values. Compared as JSON: jsonb returns object keys in its
 * own order and drops undefined properties, and dates are compared by value.
 */
function sameValues(stored: Record<string, unknown>, values: Record<string, unknown>): boolean {
   const json = (v: unknown) => JSON.parse(JSON.stringify(v ?? null));
   return Object.entries(values).every(([key, value]) =>
      isDeepStrictEqual(json(stored[key]), json(value)),
   );
}
