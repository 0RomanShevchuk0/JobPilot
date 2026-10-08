import {
   languageLevels,
   type Language,
   type Location,
   type PrefilterResult,
   type Profile,
   type RejectReason,
   type Salary,
   type Seniority,
   type WorkMode,
} from "@jobpilot/contracts";
import { normalizeCompanyName, normalizeTitle } from "@jobpilot/vacancies";
import { toUsdPerMonth } from "./salary.js";

/** The parts of a vacancy the prefilter looks at. Empty arrays and undefined mean "unknown". */
export interface VacancyForPrefilter {
   title: string;
   seniority?: Seniority;
   workModes: WorkMode[];
   locations: Location[];
   languages: Language[];
   salary?: Salary;
   /** undefined when the employer is hidden */
   companyNormalizedName?: string;
   /** minimum years of experience the vacancy asks for */
   experienceYears?: number;
}

/**
 * Cheap deal-breaker checks that run before any AI call.
 * The rule everywhere: what is unknown never rejects. A vacancy without a stated salary, level
 * or location passes those checks — better to spend one AI call than to lose a good job.
 */
export function prefilter(profile: Profile, vacancy: VacancyForPrefilter): PrefilterResult {
   const rejectedBy = [
      checkSeniority(profile, vacancy),
      checkWorkMode(profile, vacancy),
      checkOfficeCity(profile, vacancy),
      checkCandidateCountry(profile, vacancy),
      checkSalary(profile, vacancy),
      ...checkLanguages(profile, vacancy),
      checkStopWords(profile, vacancy),
      checkExperience(profile, vacancy),
      checkCompany(profile, vacancy),
   ].filter((r): r is RejectReason => r !== undefined);
   return { passed: rejectedBy.length === 0, rejectedBy };
}

function checkSeniority(p: Profile, v: VacancyForPrefilter): RejectReason | undefined {
   const wanted = p.hardFilters.seniorities ?? [];
   if (!v.seniority || wanted.length === 0 || wanted.includes(v.seniority)) return;
   return { check: "seniority", detail: `${v.seniority}, looking for ${wanted.join("/")}` };
}

function checkWorkMode(p: Profile, v: VacancyForPrefilter): RejectReason | undefined {
   if (p.workModes.length === 0 || v.workModes.length === 0) return;
   if (v.workModes.some((m) => p.workModes.includes(m))) return;
   return {
      check: "work_mode",
      detail: `${v.workModes.join("/")}, looking for ${p.workModes.join("/")}`,
   };
}

/** Office or hybrid only: the office has to be in a city I named. */
function checkOfficeCity(p: Profile, v: VacancyForPrefilter): RejectReason | undefined {
   const needsOffice = v.workModes.length > 0 && !v.workModes.includes("remote");
   const myCities = cities(p.locations, "office");
   const officeCities = cities(v.locations, "office");
   if (!needsOffice || myCities.length === 0 || officeCities.length === 0) return;
   if (officeCities.some((c) => myCities.includes(c))) return;
   return { check: "office_city", detail: `office in ${officeCities.join("/")}` };
}

/** Where candidates may work from vs. where I work from. Regions ("Europe", "Worldwide") pass. */
function checkCandidateCountry(p: Profile, v: VacancyForPrefilter): RejectReason | undefined {
   const mine = p.locations.find((l) => l.kind === "candidate" && l.country)?.country;
   const allowed = v.locations.filter((l) => l.kind === "candidate");
   if (!mine || allowed.length === 0 || allowed.some((l) => !l.country)) return;
   if (allowed.some((l) => l.country === mine)) return;
   return {
      check: "candidate_country",
      detail: `candidates from ${allowed.map((l) => l.country).join("/")}, I am in ${mine}`,
   };
}

/** Compares the top of the vacancy's range with my minimum, both converted to USD per month. */
function checkSalary(p: Profile, v: VacancyForPrefilter): RejectReason | undefined {
   const top = v.salary?.max ?? v.salary?.min;
   if (!p.salary || !v.salary || top === undefined) return;
   const offered = toUsdPerMonth(top, v.salary.currency, v.salary.period);
   const wanted = toUsdPerMonth(p.salary.min, p.salary.currency, p.salary.period);
   if (offered === undefined || wanted === undefined || offered >= wanted) return;
   return {
      check: "salary",
      detail: `up to ${top} ${v.salary.currency}/${v.salary.period}, my minimum ${p.salary.min} ${p.salary.currency}/${p.salary.period}`,
   };
}

/**
 * Only compares languages I listed: a language missing from my profile may simply not be filled in.
 * Levels are compared when both sides state one.
 */
function checkLanguages(p: Profile, v: VacancyForPrefilter): RejectReason[] {
   return v.languages.flatMap((required) => {
      const mine = p.languages.find((l) => l.code === required.code);
      if (!mine?.level || !required.level) return [];
      const have = languageLevels.indexOf(mine.level);
      const need = languageLevels.indexOf(required.level);
      if (have >= need) return [];
      return [
         {
            check: "language" as const,
            detail: `${required.code} ${required.level} required, I have ${mine.level}`,
         },
      ];
   });
}

function checkExperience(p: Profile, v: VacancyForPrefilter): RejectReason | undefined {
   const max = p.hardFilters.maxRequiredYears;
   if (max === undefined || v.experienceYears === undefined || v.experienceYears <= max) return;
   return {
      check: "experience",
      detail: `${v.experienceYears}+ years required, my limit is ${max}`,
   };
}

function checkStopWords(p: Profile, v: VacancyForPrefilter): RejectReason | undefined {
   const title = ` ${normalizeTitle(v.title)} `;
   const hit = (p.hardFilters.stopWords ?? []).find((w) =>
      title.includes(` ${normalizeTitle(w)} `),
   );
   return hit ? { check: "stop_word", detail: `"${hit}" in the title` } : undefined;
}

function checkCompany(p: Profile, v: VacancyForPrefilter): RejectReason | undefined {
   if (!v.companyNormalizedName) return;
   const excluded = (p.hardFilters.excludeCompanies ?? []).map(normalizeCompanyName);
   if (!excluded.includes(v.companyNormalizedName)) return;
   return { check: "company", detail: `${v.companyNormalizedName} is excluded` };
}

function cities(locations: Location[], kind: Location["kind"]): string[] {
   return locations.filter((l) => l.kind === kind && l.city).map((l) => l.city!.toLowerCase());
}
