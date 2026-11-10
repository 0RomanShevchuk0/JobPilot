import type { Location, NormalizedPosting, VacancyFields } from "@jobpilot/contracts";
import { normalizeSkills } from "./skills.js";
import { normalizeTitle, seniorityFromTitle } from "./title.js";

export interface PostingForMerge {
   postingId: string;
   parsed: NormalizedPosting;
   firstSeenAt: Date;
   goneAt: Date | null;
}

/** A posting of an open vacancy of the same employer, for a new posting to compare itself with. */
export interface OpenVacancyPosting extends Pick<PostingForMerge, "parsed" | "firstSeenAt"> {
   vacancyId: string;
}

/** The title of a posting of an open vacancy: all vacanciesWithMatchingTitle needs. */
export interface OpenPostingTitle {
   vacancyId: string;
   source: string;
   title: string;
}

// The share of two texts' words they must have in common to be one position. Lower is not safe: at
// 50% a company's boilerplate alone joins 3% of its plainly different jobs, at 60% about 0.5%.
const MIN_SHARED_WORDS = 0.6;
// A posting this long after the vacancy's first one is the job posted anew, a new attempt to apply,
// even with the first one still up. Counted from the first: reposts every few weeks would go on forever.
const MAX_VACANCY_SPAN_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * The open vacancies of the employer whose titles may be the posting's, by its title alone:
 * - on its own site a title is the same, words and all: one site lists "Product Analyst" and "Junior
 *   Product Analyst" as two jobs;
 * - across sites one title's words are all in the other's: "Middle Full-Stack Developer (AI Native)"
 *   on one is "Middle Full-Stack Developer" on the other.
 * A vacancy with a posting on the posting's site under another title is another job, however alike
 * its postings elsewhere: that site tells them apart. findSameVacancy compares the texts.
 */
export function vacanciesWithMatchingTitle(
   posting: Pick<OpenPostingTitle, "source" | "title">,
   openTitles: OpenPostingTitle[],
): Set<string> {
   const otherOnItsSite = new Set(
      openTitles
         .filter((open) => open.source === posting.source && !titlesMatch(posting, open))
         .map((open) => open.vacancyId),
   );
   return new Set(
      openTitles
         .filter((open) => !otherOnItsSite.has(open.vacancyId) && titlesMatch(posting, open))
         .map((open) => open.vacancyId),
   );
}

/** Same site: the same title. Different sites: one title's words all in the other's. */
function titlesMatch(
   a: Pick<OpenPostingTitle, "source" | "title">,
   b: Pick<OpenPostingTitle, "source" | "title">,
): boolean {
   const aWords = titleWordsOf(a.title);
   const bWords = titleWordsOf(b.title);
   // a title of no words ("—") says nothing: not even that it's the same as another such
   if (aWords.size === 0 || bWords.size === 0) return false;
   if (a.source === b.source) return normalizeTitle(a.title) === normalizeTitle(b.title);
   return isSubset(aWords, bWords) || isSubset(bWords, aWords);
}

/** A title's distinct words, as normalizeTitle writes them: "Node.js (Sr.)" → node, js, sr. */
function titleWordsOf(title: string): Set<string> {
   return new Set(normalizeTitle(title).split(" ").filter(Boolean));
}

function isSubset(part: Set<string>, whole: Set<string>): boolean {
   return [...part].every((word) => whole.has(word));
}

/**
 * The vacancy a posting belongs to among the postings of its employer's open vacancies: one whose
 * title may be its (vacanciesWithMatchingTitle), with the most similar text, or undefined for a
 * vacancy of its own. An extra card is better than two jobs in one vacancy, so when in doubt the
 * postings stay apart: a translation does too. Places don't count: the same text for UA and for
 * Europe is one job posted twice.
 */
export function findSameVacancy(
   posting: Pick<PostingForMerge, "parsed" | "firstSeenAt">,
   openPostings: OpenVacancyPosting[],
): string | undefined {
   const titled = vacanciesWithMatchingTitle(posting.parsed, openPostings.map(openPostingTitle));
   const postedTime = postedAt(posting);
   const firstPostedTimes = firstPostedTimeByVacancy(openPostings);
   const words = wordsOf(posting.parsed.description);
   const samePosition = openPostings
      .filter((open) => titled.has(open.vacancyId))
      .filter((open) => {
         const firstPostedTime = firstPostedTimes.get(open.vacancyId)!;
         return Math.abs(postedTime - firstPostedTime) <= MAX_VACANCY_SPAN_MS;
      })
      .map((open) => ({
         vacancyId: open.vacancyId,
         shared: shareOfCommonWords(words, wordsOf(open.parsed.description)),
      }))
      .filter((open) => open.shared >= MIN_SHARED_WORDS);
   const [mostSimilar] = samePosition.sort((a, b) => b.shared - a.shared);
   return mostSimilar?.vacancyId;
}

function openPostingTitle({ vacancyId, parsed }: OpenVacancyPosting): OpenPostingTitle {
   return { vacancyId, source: parsed.source, title: parsed.title };
}

/**
 * When a posting came out, as a time: the earlier of its site's date and our first sighting. A bump
 * rewrites the site's date forward: the sighting keeps the start from moving with it.
 */
function postedAt({
   parsed,
   firstSeenAt,
}: Pick<PostingForMerge, "parsed" | "firstSeenAt">): number {
   const seenTime = firstSeenAt.getTime();
   if (!parsed.publishedAt) return seenTime;
   return Math.min(new Date(parsed.publishedAt).getTime(), seenTime);
}

function firstPostedTimeByVacancy(openPostings: OpenVacancyPosting[]): Map<string, number> {
   const firstPostedTimes = new Map<string, number>();
   for (const open of openPostings) {
      const postedTime = postedAt(open);
      const earliest = firstPostedTimes.get(open.vacancyId) ?? postedTime;
      firstPostedTimes.set(open.vacancyId, Math.min(earliest, postedTime));
   }
   return firstPostedTimes;
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
