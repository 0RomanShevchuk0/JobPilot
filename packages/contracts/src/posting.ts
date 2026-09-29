import { z } from "zod";

export const seniorities = ["intern", "junior", "middle", "senior", "lead", "principal"] as const;
export type Seniority = (typeof seniorities)[number];

export const employmentTypes = ["full_time", "part_time", "contract", "internship"] as const;
export type EmploymentType = (typeof employmentTypes)[number];

export const workModes = ["remote", "hybrid", "onsite"] as const;
export type WorkMode = (typeof workModes)[number];

export const salaryPeriods = ["hour", "month", "year"] as const;
export type SalaryPeriod = (typeof salaryPeriods)[number];

export const applyMethods = ["on_site", "external", "email"] as const;
export type ApplyMethod = (typeof applyMethods)[number];

export const rawContentTypes = ["html", "json", "xml"] as const;
export type RawContentType = (typeof rawContentTypes)[number];

/** office = where the job's office is; candidate = where the candidate is allowed to work from */
export const locationKinds = ["office", "candidate"] as const;
export type LocationKind = (typeof locationKinds)[number];

export const locationSchema = z.object({
   kind: z.enum(locationKinds),
   raw: z.string().min(1),
   country: z.string().length(2).optional(), // ISO 3166-1 alpha-2
   city: z.string().min(1).optional(),
});
export type Location = z.infer<typeof locationSchema>;

export const languageSchema = z.object({
   code: z.string().min(2), // ISO 639-1
   level: z.string().min(1).optional(), // as stated by the source, e.g. "B2", "Upper-Intermediate"
});
export type Language = z.infer<typeof languageSchema>;

export const salarySchema = z.object({
   min: z.number().nonnegative().optional(),
   max: z.number().nonnegative().optional(),
   currency: z.string().length(3), // ISO 4217
   period: z.enum(salaryPeriods),
   raw: z.string().optional(),
});
export type Salary = z.infer<typeof salarySchema>;

/**
 * What every source adapter's parse() must return. Stored as-is in postings.parsed (jsonb),
 * so it has to stay JSON-serializable: dates are ISO strings, not Date objects.
 * Adapters never guess: a field they are not sure about stays undefined.
 */
export const normalizedPostingSchema = z.object({
   source: z.string().min(1),
   externalId: z.string().min(1),
   url: z.url(),
   title: z.string().min(1),
   description: z.string().min(1), // markdown
   // undefined = the employer is hidden (confidential postings, recruiting agencies)
   company: z
      .object({
         name: z.string().min(1),
         website: z.url().optional(),
      })
      .optional(),

   publishedAt: z.iso.datetime({ offset: true }).optional(),
   seniority: z.enum(seniorities).optional(),
   employmentTypes: z.array(z.enum(employmentTypes)).optional(),
   workModes: z.array(z.enum(workModes)).optional(),
   locations: z.array(locationSchema).optional(),
   salary: salarySchema.optional(),
   skills: z.array(z.string().min(1)).optional(), // as written by the source; normalized later by the platform
   experienceYears: z.number().int().nonnegative().optional(),
   languages: z.array(languageSchema).optional(),
   apply: z
      .object({
         method: z.enum(applyMethods),
         url: z.url().optional(),
      })
      .optional(),
});
export type NormalizedPosting = z.infer<typeof normalizedPostingSchema>;
