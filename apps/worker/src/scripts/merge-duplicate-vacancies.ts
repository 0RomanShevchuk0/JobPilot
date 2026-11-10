// Folds open vacancies that the vacancy rules (findSameVacancy) now tell are one job into the oldest of
// them, then exits. For duplicates made before the rules changed: a posting already linked keeps its
// vacancy, building it again doesn't move it. Prints the pairs and changes nothing unless run with
// --apply; then the running worker rebuilds the merged vacancies, and re-evaluates those that changed.
import { QueueNames, type BuildVacancyJobData } from "@jobpilot/contracts";
import { createDatabase } from "@jobpilot/db";
import {
   findSameVacancy,
   vacanciesWithMatchingTitle,
   type OpenVacancyPosting,
} from "@jobpilot/vacancies";
import { Queue } from "bullmq";
import { Redis } from "ioredis";
import { config } from "../config.js";
import { buildVacancyJobOptions } from "../queues.js";

const dryRun = !process.argv.includes("--apply");

const connection = new Redis(config.redisUrl, { maxRetriesPerRequest: null });
const database = createDatabase(config.databaseUrl);
const queue = new Queue<BuildVacancyJobData>(QueueNames.buildVacancy, { connection });

type Posting = Awaited<
   ReturnType<typeof database.vacancies.listOpenPostingsOfKnownEmployers>
>[number];

interface Duplicate {
   duplicateId: string;
   vacancyId: string;
   company: string;
   duplicatePostings: Posting[];
   vacancyPostings: Posting[];
}

const postings = await database.vacancies.listOpenPostingsOfKnownEmployers();
const duplicates = [...groupBy(postings, (p) => p.companyId).values()].flatMap(findDuplicates);

console.log(`${dryRun ? "dry run: " : ""}${duplicates.length} duplicates`);
const toRebuild = new Set<string>();
for (const d of duplicates) {
   const result = await database.vacancies.mergeDuplicateInto(d.duplicateId, d.vacancyId, {
      dryRun,
   });
   // what to look at closer: a tracker row on either, a hidden one, one left for a person
   const notes: string[] = [];
   if (result.vacancyTracked) notes.push("kept one tracked");
   if (result.movedAttempts > 0) notes.push(`${result.movedAttempts} tracker rows moved`);
   if (result.carriedHidden > 0) notes.push(`hidden for ${result.carriedHidden} users`);
   if (result.outcome === "both_tracked") notes.push("SKIPPED: tracked on both");
   console.log(
      `${d.company}${notes.length > 0 ? `  [${notes.join(", ")}]` : ""}\n` +
         `   keeps  ${d.vacancyId}  ${postingsLine(d.vacancyPostings)}\n` +
         `   folds  ${d.duplicateId}  ${postingsLine(d.duplicatePostings)}`,
   );
   if (result.outcome === "merged") toRebuild.add(d.vacancyPostings[0].postingId);
}

if (!dryRun) {
   const jobs = [...toRebuild].map((postingId) => ({
      name: "build-vacancy",
      data: { postingId },
      opts: buildVacancyJobOptions(postingId),
   }));
   await queue.addBulk(jobs);
   console.log(`merged; build-vacancy queued for ${jobs.length} vacancies`);
}

await queue.close();
await database.close();
await connection.quit();

/**
 * One employer's duplicates: its vacancies oldest first, each checked against the ones before it
 * that stay, as a new posting would be. A folded one's postings count as its vacancy's from then on.
 */
function findDuplicates(employerPostings: Posting[]): Duplicate[] {
   const byVacancy = [...groupBy(employerPostings, (p) => p.vacancyId).entries()].sort(
      ([, a], [, b]) => firstSeenTime(a) - firstSeenTime(b),
   );
   const staying: (OpenVacancyPosting & { posting: Posting })[] = [];
   const found: Duplicate[] = [];
   for (const [vacancyId, own] of byVacancy) {
      const first = own.reduce((a, b) => (a.firstSeenAt <= b.firstSeenAt ? a : b));
      const similar = findSameVacancy(first, staying);
      // every posting of it, not the first only: one on a site the vacancy has under another title
      // makes them two jobs
      const into = similar && allTitlesMatch(own, staying, similar) ? similar : undefined;
      const keptUnder = into ?? vacancyId;
      if (into) {
         found.push({
            duplicateId: vacancyId,
            vacancyId: into,
            company: first.companyName,
            duplicatePostings: own,
            vacancyPostings: staying.filter((s) => s.vacancyId === into).map((s) => s.posting),
         });
      }
      staying.push(...own.map((posting) => ({ ...posting, vacancyId: keptUnder, posting })));
   }
   return found;
}

/** Whether each of a vacancy's postings has a title that may be the other vacancy's. */
function allTitlesMatch(own: Posting[], staying: OpenVacancyPosting[], vacancyId: string): boolean {
   const titles = staying
      .filter((s) => s.vacancyId === vacancyId)
      .map((s) => ({ vacancyId, source: s.parsed.source, title: s.parsed.title }));
   return own.every((p) => vacanciesWithMatchingTitle(p.parsed, titles).has(vacancyId));
}

function firstSeenTime(vacancyPostings: Posting[]): number {
   return Math.min(...vacancyPostings.map((p) => p.firstSeenAt.getTime()));
}

/** "djinni: Middle Full-Stack Developer | dou: …" */
function postingsLine(vacancyPostings: Posting[]): string {
   return vacancyPostings.map((p) => `${p.parsed.source}: ${p.parsed.title}`).join(" | ");
}

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
   const groups = new Map<string, T[]>();
   for (const item of items) groups.set(key(item), [...(groups.get(key(item)) ?? []), item]);
   return groups;
}
