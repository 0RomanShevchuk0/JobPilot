import type {
   CheckCanApplyJobData,
   MatchVacancyJobData,
   ScoreVacancyJobData,
} from "@jobpilot/contracts";
import type { DatabaseClient } from "@jobpilot/db";
import { prefilter, SCORING_PROMPT_VERSION } from "@jobpilot/matching";
import type { Job, Queue } from "bullmq";
import { log } from "../log.js";
import { checkCanApplyJobOptions, scoreVacancyJobOptions } from "../queues.js";

/**
 * One vacancy × one user → prefilter → vacancy_matches → check-can-apply for what passes, which
 * sends it on to score-vacancy. Re-evaluates only what is stale: the prefilter when the profile or the vacancy
 * changed since the last evaluation, the can-apply check when it wasn't made for this evaluation, the
 * AI score when there is none for the current prompt version.
 */
export async function handleMatchVacancy(
   job: Job<MatchVacancyJobData>,
   database: DatabaseClient,
   checkCanApplyQueue: Queue<CheckCanApplyJobData>,
   scoreVacancyQueue: Queue<ScoreVacancyJobData>,
) {
   const { userId, vacancyId } = job.data;

   const stored = await database.profiles.get(userId);
   if (!stored) return "no profile";
   const vacancy = await database.vacancies.getForMatching(vacancyId);
   if (!vacancy || vacancy.closedAt) return "closed";

   const match = await database.matches.get(userId, vacancyId);
   const fresh =
      match !== undefined &&
      match.profileVersion === stored.version &&
      match.evaluatedAt >= vacancy.updatedAt;

   let passed: boolean;
   if (fresh) {
      passed = match.prefilterPassed;
   } else {
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
      passed = result.passed;
      log(
         "match-vacancy",
         result.passed
            ? `✓ ${vacancy.title}`
            : `✗ ${vacancy.title} — ${result.rejectedBy.map((r) => `${r.check}: ${r.detail}`).join("; ")}`,
      );
   }

   // a fresh prefilter result has no can-apply check yet; the check queues the scoring itself
   const applyCheck = fresh ? match.analysis.applyCheck : undefined;
   if (passed && !applyCheck) {
      await checkCanApplyQueue.add(
         "check-can-apply",
         { userId, vacancyId },
         checkCanApplyJobOptions(userId, vacancyId),
      );
      return fresh ? "check site" : "passed";
   }
   if (!fresh) return "rejected";

   // an old evaluation may lack the AI part or have it from an older prompt
   const needsScore =
      passed && applyCheck?.canApply !== false && match.promptVersion !== SCORING_PROMPT_VERSION;
   if (needsScore) {
      await scoreVacancyQueue.add(
         "score-vacancy",
         { userId, vacancyId },
         scoreVacancyJobOptions(userId, vacancyId),
      );
   }
   return needsScore ? "rescore" : "up to date";
}
