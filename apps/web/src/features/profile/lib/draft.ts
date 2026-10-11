import {
   type LanguageLevel,
   type LocationKind,
   type Profile,
   type ProfileCurrency,
   profileSchema,
   type SalaryPeriod,
   type Seniority,
   type WorkMode,
} from "@jobpilot/contracts";
import { z } from "zod";

/**
 * The profile as the form edits it: inputs as typed, lists of words one per line. Shaped as the
 * profile, so the schema's complaints about a field ("salary.target") land on the input of that name.
 */
export interface ProfileDraft {
   contacts: {
      fullName: string;
      email: string;
      phone: string;
      links: { name: string; url: string }[];
   };
   titles: string;
   experienceYears: string;
   skills: string;
   salary: { min: string; target: string; currency: ProfileCurrency; period: SalaryPeriod };
   locations: { kind: LocationKind; raw: string; city: string; country: string }[];
   workModes: WorkMode[];
   languages: { code: string; level: LanguageLevel | "" }[];
   hardFilters: {
      seniorities: Seniority[];
      excludeCompanies: string;
      stopWords: string;
      maxRequiredYears: string;
   };
   notes: string;
   applicationMessage: string;
}

/** What the profile schema takes: fields with a default may be missing. */
type ProfileInput = z.input<typeof profileSchema>;

/** The form's values checked as the profile they make; what passes is the profile to send. */
export const profileFormSchema = z.custom<ProfileDraft>().transform(toProfile).pipe(profileSchema);

/** The form's starting values: the saved profile, or an empty one before the first save. */
export function fromProfile(saved?: Profile): ProfileDraft {
   const p = saved ?? profileSchema.parse({});
   return {
      contacts: {
         fullName: p.contacts.fullName ?? "",
         email: p.contacts.email ?? "",
         phone: p.contacts.phone ?? "",
         links: Object.entries(p.contacts.links ?? {}).map(([name, url]) => ({ name, url })),
      },
      titles: p.titles.join("\n"),
      experienceYears: p.experienceYears?.toString() ?? "",
      skills: p.skills.join("\n"),
      salary: {
         min: p.salary?.min.toString() ?? "",
         target: p.salary?.target?.toString() ?? "",
         currency: p.salary?.currency ?? "USD",
         period: p.salary?.period ?? "month",
      },
      locations: p.locations.map((l) => ({
         kind: l.kind,
         raw: l.raw,
         city: l.city ?? "",
         country: l.country ?? "",
      })),
      workModes: p.workModes,
      languages: p.languages.map((l) => ({ code: l.code, level: l.level ?? "" })),
      hardFilters: {
         seniorities: p.hardFilters.seniorities ?? [],
         excludeCompanies: (p.hardFilters.excludeCompanies ?? []).join("\n"),
         stopWords: (p.hardFilters.stopWords ?? []).join("\n"),
         maxRequiredYears: p.hardFilters.maxRequiredYears?.toString() ?? "",
      },
      notes: p.notes,
      applicationMessage: p.applicationMessage,
   };
}

/**
 * The profile the form would send. Empty inputs become absent fields; what is typed wrong (letters in
 * a number) goes as it is, for the schema to point at.
 */
function toProfile(d: ProfileDraft): ProfileInput {
   const links = d.contacts.links
      .filter((l) => l.name.trim())
      .map((l) => [l.name.trim(), l.url.trim()] as const);
   return {
      contacts: {
         fullName: text(d.contacts.fullName),
         email: text(d.contacts.email),
         phone: text(d.contacts.phone),
         links: links.length > 0 ? Object.fromEntries(links) : undefined,
      },
      titles: lines(d.titles),
      experienceYears: number(d.experienceYears),
      skills: lines(d.skills),
      salary: salary(d.salary),
      locations: d.locations.map((l) => ({
         kind: l.kind,
         raw: l.raw.trim(),
         city: text(l.city),
         country: text(l.country)?.toUpperCase(),
      })),
      workModes: d.workModes,
      languages: d.languages.map((l) => ({
         code: l.code.trim().toLowerCase(),
         level: l.level || undefined,
      })),
      hardFilters: {
         seniorities: nonEmpty(d.hardFilters.seniorities),
         excludeCompanies: nonEmpty(lines(d.hardFilters.excludeCompanies)),
         stopWords: nonEmpty(lines(d.hardFilters.stopWords)),
         maxRequiredYears: number(d.hardFilters.maxRequiredYears),
      },
      notes: d.notes.trim(),
      applicationMessage: d.applicationMessage.trim(),
   };
}

/** No salary when neither amount is given; a target alone still goes, for the schema to ask for min. */
function salary(s: ProfileDraft["salary"]): Profile["salary"] {
   const min = number(s.min);
   const target = number(s.target);
   if (min === undefined && target === undefined) return undefined;
   return { min: min!, target, currency: s.currency, period: s.period };
}

function text(value: string): string | undefined {
   return value.trim() || undefined;
}

/** "abc" becomes NaN, which the schema rejects as not a number. */
function number(value: string): number | undefined {
   return value.trim() === "" ? undefined : Number(value);
}

function lines(value: string): string[] {
   return value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
}

/** Empty hard filters mean no restriction: left out instead of stored as []. */
function nonEmpty<T>(list: T[]): T[] | undefined {
   return list.length > 0 ? list : undefined;
}
