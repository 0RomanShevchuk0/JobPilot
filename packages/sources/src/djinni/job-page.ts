import type {
   EmploymentType,
   Language,
   Location,
   NormalizedPosting,
   RawPosting,
   Salary,
   WorkMode,
} from "@jobpilot/contracts";
import * as cheerio from "cheerio";
import TurndownService from "turndown";
import { countryCode, EMPLOYMENT_TYPES, LANGUAGE_CODES, SALARY_PERIODS } from "./mappings.js";

/** The subset of schema.org JobPosting that Djinni fills in. */
interface JsonLdAddress {
   addressCountry?: string | string[] | null;
   addressLocality?: string | string[] | null;
   addressRegion?: string | null;
}
type OneOrMany<T> = T | T[];
interface JobPostingLd {
   "@type": string;
   title?: string;
   url?: string;
   datePosted?: string;
   category?: string;
   directApply?: boolean;
   employmentType?: OneOrMany<string>;
   jobLocationType?: string | null;
   hiringOrganization?: { name?: string; sameAs?: string };
   experienceRequirements?: { monthsOfExperience?: number };
   baseSalary?: {
      currency?: string;
      value?: { minValue?: number; maxValue?: number; unitText?: string };
   };
   jobLocation?: OneOrMany<{ address?: JsonLdAddress }>;
   applicantLocationRequirements?: OneOrMany<{ address?: JsonLdAddress }>;
}

const CLOSED_MARKER = "The job ad is no longer active";

/** Closed jobs still answer 200, with this banner instead of the job. */
export function isClosedPage(html: string): boolean {
   return html.includes(CLOSED_MARKER);
}

export function parseJobPage(raw: RawPosting): NormalizedPosting {
   const $ = cheerio.load(raw.body);
   const ld = findJobPosting($);
   const descriptionHtml = $(".job-post__description").first().html();
   if (!ld?.title || !ld.hiringOrganization?.name || !descriptionHtml) {
      // a layout change, not a closed job: fail loudly instead of saving half a posting
      throw new Error(`djinni ${raw.externalId}: job page layout not recognized`);
   }
   const url = ld.url ?? raw.url;

   return {
      source: "djinni",
      externalId: raw.externalId,
      url,
      title: ld.title.trim(),
      description: toMarkdown(descriptionHtml),
      company: {
         name: ld.hiringOrganization.name.trim(),
         website: validUrl(ld.hiringOrganization.sameAs),
      },
      publishedAt: ld.datePosted ? kyivTimeToIso(ld.datePosted) : undefined,
      employmentTypes: nonEmpty(employmentTypes(ld)),
      workModes: nonEmpty(workModes($, ld)),
      locations: nonEmpty([...officeLocations(ld), ...candidateLocations($, ld)]),
      salary: salary(ld),
      skills: nonEmpty(skills($, ld)),
      experienceYears:
         ld.experienceRequirements?.monthsOfExperience != null
            ? Math.floor(ld.experienceRequirements.monthsOfExperience / 12)
            : undefined,
      languages: nonEmpty(languages($)),
      apply: ld.directApply ? { method: "on_site", url } : undefined,
   };
}

function findJobPosting($: cheerio.CheerioAPI): JobPostingLd | undefined {
   for (const el of $('script[type="application/ld+json"]').toArray()) {
      let data: unknown;
      try {
         data = JSON.parse($(el).text());
      } catch {
         continue;
      }
      const found = toArray(data as OneOrMany<JobPostingLd>).find(
         (d) => d?.["@type"] === "JobPosting",
      );
      if (found) return found;
   }
   return undefined;
}

const turndown = new TurndownService({ headingStyle: "atx", bulletListMarker: "-" });

function toMarkdown(html: string): string {
   return turndown
      .turndown(html)
      .replace(/ /g, " ") // &nbsp; that Djinni editors leave after <br>
      .replace(/^(\s*)([-*]|\d+\.) {2,}/gm, "$1$2 ") // turndown pads list markers: "-   item"
      .replace(/[ \t]+$/gm, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
}

function employmentTypes(ld: JobPostingLd): EmploymentType[] {
   return toArray(ld.employmentType)
      .map((t) => EMPLOYMENT_TYPES[t])
      .filter((t): t is EmploymentType => t !== undefined);
}

/** Djinni labels: "Full Remote", "Office Work", "Hybrid Remote", "Office or Remote". */
function workModes($: cheerio.CheerioAPI, ld: JobPostingLd): WorkMode[] {
   const label = $("strong.d-block.font-weight-600")
      .filter((_, el) => $(el).find(".location-text").length === 0)
      .map((_, el) => $(el).text().trim())
      .get()
      .find((text) => /remote|office|hybrid/i.test(text));

   if (label) {
      if (/hybrid/i.test(label)) return ["hybrid"];
      const modes: WorkMode[] = [];
      if (/office/i.test(label)) modes.push("onsite");
      if (/remote/i.test(label)) modes.push("remote");
      return modes;
   }
   return ld.jobLocationType === "TELECOMMUTE" ? ["remote"] : [];
}

function officeLocations(ld: JobPostingLd): Location[] {
   return toArray(ld.jobLocation).flatMap(({ address }) => {
      if (!address) return [];
      const countryName = toArray(address.addressCountry)[0] ?? undefined;
      const country = countryName ? countryCode(countryName) : undefined;
      const cities = toArray(address.addressLocality).filter(Boolean) as string[];
      if (cities.length === 0) {
         return countryName ? [{ kind: "office" as const, raw: countryName, country }] : [];
      }
      return cities.map((city) => ({
         kind: "office" as const,
         raw: [city, countryName].filter(Boolean).join(", "),
         city,
         country,
      }));
   });
}

function candidateLocations($: cheerio.CheerioAPI, ld: JobPostingLd): Location[] {
   const fromLd = toArray(ld.applicantLocationRequirements).flatMap(({ address }) => {
      if (!address) return [];
      const countries = toArray(address.addressCountry).filter(Boolean) as string[];
      const byCountry = countries.map((c) => ({
         kind: "candidate" as const,
         raw: c,
         country: countryCode(c),
      }));
      const byRegion = address.addressRegion
         ? [{ kind: "candidate" as const, raw: address.addressRegion }]
         : [];
      return [...byCountry, ...byRegion];
   });
   if (fromLd.length > 0) return fromLd;

   // JSON-LD omits some cases, e.g. "Worldwide"; the page still shows them under
   // "Countries where we consider candidates"
   return $(".location-text")
      .map((_, el) => $(el).text().replace(/\s+/g, " ").trim())
      .get()
      .filter(Boolean)
      .map((raw) => ({ kind: "candidate" as const, raw }));
}

function salary(ld: JobPostingLd): Salary | undefined {
   const s = ld.baseSalary;
   const period = s?.value?.unitText ? SALARY_PERIODS[s.value.unitText] : undefined;
   if (!s?.currency || !period || (s.value?.minValue == null && s.value?.maxValue == null)) {
      return undefined;
   }
   return {
      min: s.value?.minValue ?? undefined,
      max: s.value?.maxValue ?? undefined,
      currency: s.currency,
      period,
   };
}

/** Explicit "Required skills experience" list plus the job's category (its main specialization). */
function skills($: cheerio.CheerioAPI, ld: JobPostingLd): string[] {
   const names = detailRows($, "Required skills experience").map((r) => r.name);
   if (ld.category) names.push(ld.category);
   const seen = new Set<string>();
   return names.filter((n) => {
      const key = n.toLowerCase();
      if (!n || seen.has(key)) return false;
      seen.add(key);
      return true;
   });
}

function languages($: cheerio.CheerioAPI): Language[] {
   return detailRows($, "Required languages").flatMap(({ name, value }) => {
      const code = LANGUAGE_CODES[name.toLowerCase()];
      if (!code) return [];
      // "B2 - Upper Intermediate" → "B2"; "Native" stays as is
      const level = /\b[ABC][12]\b/.exec(value)?.[0] ?? (value || undefined);
      return [{ code, level }];
   });
}

/**
 * Rows of a "name ····· value" section: the siblings after an <h2> with the given title,
 * up to the next sibling that starts another section (the next section's <h2> may be nested).
 */
function detailRows($: cheerio.CheerioAPI, heading: string): { name: string; value: string }[] {
   const h2 = $("h2")
      .filter((_, el) => $(el).text().trim() === heading)
      .first();
   const siblings = h2.nextAll().toArray();
   const end = siblings.findIndex((el) => $(el).is("h2") || $(el).find("h2").length > 0);
   const section = end === -1 ? siblings : siblings.slice(0, end);
   return $(section)
      .find(".detail-rows__line")
      .map((_, el) => ({
         name: $(el).find(".detail-rows__name").text().trim(),
         value: $(el).find(".detail-rows__value").text().trim(),
      }))
      .get();
}

/** Djinni's datePosted has no offset; it is Kyiv wall-clock time. */
export function kyivTimeToIso(value: string): string {
   if (/(Z|[+-]\d{2}:\d{2})$/.test(value)) return new Date(value).toISOString();
   const asUtc = new Date(`${value.slice(0, 23)}Z`); // JS dates keep milliseconds only
   const offsetMinutes = timeZoneOffsetMinutes(asUtc, "Europe/Kyiv");
   return new Date(asUtc.getTime() - offsetMinutes * 60_000).toISOString();
}

function timeZoneOffsetMinutes(date: Date, timeZone: string): number {
   const name = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" })
      .formatToParts(date)
      .find((p) => p.type === "timeZoneName")?.value;
   const m = /GMT([+-])(\d{2}):(\d{2})/.exec(name ?? "");
   if (!m) return 0;
   return (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3]));
}

function validUrl(value: string | undefined): string | undefined {
   return value && URL.canParse(value) ? value : undefined;
}

function toArray<T>(value: T | T[] | null | undefined): T[] {
   if (value == null) return [];
   return Array.isArray(value) ? value : [value];
}

function nonEmpty<T>(items: T[]): T[] | undefined {
   return items.length > 0 ? items : undefined;
}
