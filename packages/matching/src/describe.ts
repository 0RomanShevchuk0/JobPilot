import type { Language, Location, Profile, Salary, Seniority, WorkMode } from "@jobpilot/contracts";
import { redactContacts } from "./redact.js";

// How the candidate and a vacancy are written into prompts: shared by scoring and application answers.

// a few long postings shouldn't eat the tokens-per-minute limit; real ones are 2-6k characters
const MAX_DESCRIPTION_CHARS = 15_000;
// a one or two page CV is 3-6k characters
const MAX_CV_CHARS = 10_000;

/** The parts of a vacancy a model reads. Empty arrays and undefined mean "not stated". */
export interface VacancyForPrompt {
   title: string;
   /** undefined when the employer is hidden */
   companyName?: string;
   description: string; // markdown
   seniority?: Seniority;
   experienceYears?: number;
   workModes: WorkMode[];
   locations: Location[];
   languages: Language[];
   salary?: Salary;
   skills: string[];
}

/** The CV text for a prompt: without contacts, cut to a sane length, wrapped in <cv> tags. */
export function describeCv(cv: string, profile: Profile): string {
   const redacted = redactContacts(cv, profile.contacts);
   return `<cv>\n${cut(redacted, MAX_CV_CHARS)}\n</cv>`;
}

export function describeProfile(p: Profile): string {
   const s = p.salary;
   return lines([
      ["Looking for", list(p.titles)],
      ["Experience", p.experienceYears !== undefined ? `${p.experienceYears} years` : undefined],
      ["Skills", list(p.skills)],
      [
         "Salary",
         s && `min ${s.min}${s.target ? `, target ${s.target}` : ""} ${s.currency} per ${s.period}`,
      ],
      ["Works from", places(p.locations, "candidate")],
      ["Office cities", places(p.locations, "office")],
      ["Work modes", list(p.workModes)],
      ["Languages", list(p.languages.map(language))],
      ["Notes", p.notes || undefined],
   ]);
}

export function describeVacancy(v: VacancyForPrompt): string {
   const description = cut(v.description, MAX_DESCRIPTION_CHARS);
   return `${lines([
      ["Title", v.title],
      ["Company", v.companyName ?? "hidden"],
      ["Level", v.seniority ?? "not stated"],
      [
         "Required experience",
         v.experienceYears !== undefined ? `${v.experienceYears}+ years` : "not stated",
      ],
      ["Work modes", list(v.workModes) ?? "not stated"],
      ["Office", places(v.locations, "office")],
      ["Candidates from", places(v.locations, "candidate")],
      ["Languages", list(v.languages.map(language))],
      ["Salary", v.salary ? salary(v.salary) : "not stated"],
      ["Skill tags", list(v.skills)],
   ])}\n\nDescription:\n<description>\n${description}\n</description>`;
}

function cut(text: string, max: number): string {
   return text.length > max ? `${text.slice(0, max)}\n[cut]` : text;
}

/** "Key: value" lines; empty values are left out. */
function lines(entries: [string, string | undefined][]): string {
   return entries
      .filter((e): e is [string, string] => Boolean(e[1]))
      .map(([key, value]) => `${key}: ${value}`)
      .join("\n");
}

function list(items: string[]): string | undefined {
   return items.length > 0 ? items.join(", ") : undefined;
}

/** The locations of one kind, as written in the source, in one line. */
function places(locations: Location[], kind: Location["kind"]): string | undefined {
   const raw = locations.filter((l) => l.kind === kind).map((l) => l.raw);
   return list(raw);
}

function language(l: Language): string {
   return l.level ? `${l.code} ${l.level}` : l.code;
}

function salary(s: Salary): string {
   const range = [s.min, s.max].filter((n) => n !== undefined).join("-");
   return range ? `${range} ${s.currency} per ${s.period}` : "not stated";
}
