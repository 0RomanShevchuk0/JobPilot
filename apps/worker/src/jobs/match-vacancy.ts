import type { MatchVacancyJobData } from "@jobpilot/contracts";
import type { DatabaseClient } from "@jobpilot/db";
import { prefilter } from "@jobpilot/matching";
import type { Job } from "bullmq";
import { log } from "../log.js";

/** One vacancy × one user → prefilter → vacancy_matches. AI scoring of what passes comes next. */
export async function handleMatchVacancy(job: Job<MatchVacancyJobData>, database: DatabaseClient) {
   const { userId, vacancyId } = job.data;

   const stored = await database.profiles.get(userId);
   if (!stored) return "no profile";
   const vacancy = await database.vacancies.getForMatching(vacancyId);
   if (!vacancy || vacancy.closedAt) return "closed";
   // vacancy updates don't re-trigger evaluation; only a new profile version does
   if ((await database.matches.evaluatedForVersion(userId, vacancyId)) === stored.version) {
      return "up to date";
   }

   const result = prefilter(stored.profile, vacancy);
   await database.matches.save({
      userId,
      vacancyId,
      profileVersion: stored.version,
      prefilterPassed: result.passed,
      score: null,
      analysis: { prefilter: result },
      model: null,
      promptVersion: null,
   });

   log(
      "match-vacancy",
      result.passed
         ? `✓ ${vacancy.title}`
         : `✗ ${vacancy.title} — ${result.rejectedBy.map((r) => `${r.check}: ${r.detail}`).join("; ")}`,
   );
   return result.passed ? "passed" : "rejected";
}
