import { z } from "zod";
import {
   languageSchema,
   locationSchema,
   salaryPeriods,
   seniorities,
   workModes,
} from "./posting.js";

/** What goes into application forms: "Full name", "Phone", "LinkedIn"... */
export const profileContactsSchema = z.object({
   fullName: z.string().min(1).optional(),
   email: z.email().optional(),
   phone: z.string().min(1).optional(),
   links: z.record(z.string(), z.url()).optional(), // { linkedin: "...", github: "..." }
});
export type ProfileContacts = z.infer<typeof profileContactsSchema>;

/** Deal-breakers checked by the prefilter before any AI call. Empty = no restriction. */
export const hardFiltersSchema = z.object({
   /** Vacancy levels worth looking at, e.g. ["middle", "senior"]. */
   seniorities: z.array(z.enum(seniorities)).optional(),
   /** Employers to skip, named as on job sites; case, punctuation and legal forms (LLC, Ltd…) are ignored. */
   excludeCompanies: z.array(z.string().min(1)).optional(),
   /** Words that rule a vacancy out when they appear in its title, e.g. "PHP". */
   stopWords: z.array(z.string().min(1)).optional(),
   /** Skip vacancies that ask for more years of experience than this. */
   maxRequiredYears: z.number().int().nonnegative().optional(),
});
export type HardFilters = z.infer<typeof hardFiltersSchema>;

/**
 * The job-search profile, as the user sends it to PUT /profile.
 * locations reuse the posting meaning: "candidate" = where I work from, "office" = office cities I'd go to.
 */
export const profileSchema = z.object({
   contacts: profileContactsSchema.default({}),
   titles: z.array(z.string().min(1)).default([]),
   experienceYears: z.number().int().nonnegative().optional(), // total professional experience in whole years
   skills: z.array(z.string().min(1)).default([]), // as written: "Node.js", "React"...
   // expectations in one currency and period; min drives the prefilter, target is for AI scoring
   salary: z
      .object({
         min: z.number().positive(),
         target: z.number().positive().optional(),
         currency: z.string().length(3),
         period: z.enum(salaryPeriods),
      })
      .refine((s) => s.target === undefined || s.target >= s.min, {
         message: "target must not be below min",
         path: ["target"],
      })
      .optional(),
   locations: z.array(locationSchema).default([]),
   workModes: z.array(z.enum(workModes)).default([]),
   languages: z.array(languageSchema).default([]),
   hardFilters: hardFiltersSchema.default({}),
   notes: z.string().default(""), // free-form facts for AI: notice period, work permit, relocation...
});
export type Profile = z.infer<typeof profileSchema>;
