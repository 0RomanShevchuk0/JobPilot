import type { Location, NormalizedPosting, VacancyFields } from "@jobpilot/contracts";
import { normalizeCompanyName } from "./company.js";
import { normalizeSkills } from "./skills.js";
import { normalizeTitle, seniorityFromTitle } from "./title.js";

export interface PostingForMerge {
   postingId: string;
   parsed: NormalizedPosting;
   firstSeenAt: Date;
   goneAt: Date | null;
}

/** A posting of an open vacancy, for a new posting with the same fingerprint to compare itself with. */
export interface OpenVacancyPosting {
   vacancyId: string;
   parsed: NormalizedPosting;
}

// The share of two texts' words they must have in common to be one position. Lower is not safe: at
// 50% a company's boilerplate alone joins 3% of its plainly different jobs, at 60% about 0.5%.
const MIN_SHARED_WORDS = 0.6;

/**
 * Key of the postings that may be one vacancy: employer + title; findSameVacancy tells whether they are.
 * Location is left out on purpose: sources write it too differently ("Kyiv", "Київ", "Remote, Ukraine").
 * With a hidden employer there is nothing reliable to match on, so the posting gets a key of its own.
 */
export function vacancyFingerprint(posting: Pick<PostingForMerge, "postingId" | "parsed">): string {
   const company = posting.parsed.company;
   if (!company) return `posting:${posting.postingId}`;
   return `${normalizeCompanyName(company.name)}|${normalizeTitle(posting.parsed.title)}`;
}

/**
 * The vacancy a posting belongs to among the postings of open vacancies with its fingerprint: the
 * one with the most similar posting, or undefined for a vacancy of its own. An extra card is better
 * than two jobs in one vacancy, so when in doubt the postings stay apart: a translation does too.
 * Places don't count: the same text for UA and for Europe is one job posted twice.
 */
export function findSameVacancy(
   posting: NormalizedPosting,
   openPostings: OpenVacancyPosting[],
): string | undefined {
   const words = wordsOf(posting.description);
   const samePosition = openPostings
      .map((open) => ({
         vacancyId: open.vacancyId,
         shared: shareOfCommonWords(words, wordsOf(open.parsed.description)),
      }))
      .filter((open) => open.shared >= MIN_SHARED_WORDS);
   const [mostSimilar] = samePosition.sort((a, b) => b.shared - a.shared);
   return mostSimilar?.vacancyId;
}

/** A text's distinct words of 3+ letters or digits, any alphabet: "Node.js & C#, UI" → node. */
function wordsOf(text: string): Set<string> {
   return new Set(text.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu)); // runs of 3+ letters or digits
}

/** The share of all the words of two texts that both have: 1 for the same words, 0 for none. */
function shareOfCommonWords(a: Set<string>, b: Set<string>): number {
   const shared = [...a].filter((word) => b.has(word)).length;
   const all = a.size + b.size - shared;
   return all === 0 ? 0 : shared / all;
}

/**
 * Builds the vacancy from all of its postings. Recomputed from scratch every time, so the result
 * doesn't depend on the order postings arrived in: postings are sorted by when they were first
 * seen, and each field takes the first non-empty value. The exceptions are united instead:
 * - skills: sources list different ones;
 * - work modes and locations: one source says "remote", another leaves it out, and the earliest one
 *   would hide it. Only open postings count, so a closed one's remote doesn't outlive it; when all
 *   are closed, all count.
 */
export function mergeVacancy(postings: PostingForMerge[]): VacancyFields {
   if (postings.length === 0) throw new Error("mergeVacancy: a vacancy needs at least one posting");
   const ordered = [...postings].sort((a, b) => a.firstSeenAt.getTime() - b.firstSeenAt.getTime());
   const all = ordered.map((p) => p.parsed);
   const first = <T>(pick: (p: NormalizedPosting) => T | undefined): T | undefined =>
      all.map(pick).find((v) => v !== undefined && (!Array.isArray(v) || v.length > 0));

   const goneAt = ordered.map((p) => p.goneAt);
   const allGone = goneAt.every((d) => d !== null);
   const lastGoneAt = Math.max(...goneAt.map((d) => d?.getTime() ?? 0));
   const skills = all.flatMap((p) => p.skills ?? []);
   const open = allGone ? all : ordered.filter((p) => p.goneAt === null).map((p) => p.parsed);
   const workModes = [...new Set(open.flatMap((p) => p.workModes ?? []))];
   const locations = uniqueLocations(open.flatMap((p) => p.locations ?? []));

   return {
      title: all[0].title,
      description: all[0].description,
      seniority: first((p) => p.seniority) ?? first((p) => seniorityFromTitle(p.title)),
      employmentTypes: first((p) => p.employmentTypes) ?? [],
      workModes,
      locations,
      languages: first((p) => p.languages) ?? [],
      salary: first((p) => p.salary),
      skills: normalizeSkills(skills),
      experienceYears: first((p) => p.experienceYears),
      closedAt: allGone ? new Date(lastGoneAt) : null,
   };
}

/** The same place listed by two sources is kept once. */
function uniqueLocations(locations: Location[]): Location[] {
   const seen = new Set<string>();
   return locations.filter((l) => {
      const key = `${l.kind}|${l.country ?? ""}|${l.city ?? ""}|${l.raw}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
   });
}
