import {
   SourceIds,
   type BuildVacancyJobData,
   type CheckCanApplyJobData,
   type JobPageResult,
   type ScoreVacancyJobData,
} from "@jobpilot/contracts";
import { checkDjinniJobPage, DjinniSessionExpiredError } from "@jobpilot/sources";
import type { DatabaseClient } from "@jobpilot/db";
import { SCORING_PROMPT_VERSION } from "@jobpilot/matching";
import type { Job, Queue } from "bullmq";
import { sessionPath } from "../config.js";
import { log } from "../log.js";
import { buildVacancyJobOptions, scoreVacancyJobOptions } from "../queues.js";

// job sites that tell a logged-in user whether they can apply
const CHECKED_SOURCES = [SourceIds.djinni];

/**
 * One prefiltered vacancy × one user → asks the job site whether they can apply → what they can't
 * (applied already, the job is closed, unmet requirements) is dropped; the rest goes to scoring, with
 * what the site said of the salary against their expectations. Without a session the check is skipped,
 * not the vacancy: it is scored as before.
 */
export async function handleCheckCanApply(
   job: Job<CheckCanApplyJobData>,
   database: DatabaseClient,
   scoreVacancyQueue: Queue<ScoreVacancyJobData>,
   buildVacancyQueue: Queue<BuildVacancyJobData>,
) {
   const { userId, vacancyId } = job.data;

   const stored = await database.profiles.get(userId);
   if (!stored) return "no profile";
   // match-vacancy asked for this check; if the evaluation changed since, a newer job is on its way
   const match = await database.matches.get(userId, vacancyId);
   if (!match || match.profileVersion !== stored.version || !match.prefilterPassed) return "stale";

   const posting = await database.applications.findPostingToApply(vacancyId, CHECKED_SOURCES);
   // undefined: not asked, the vacancy has no Djinni posting or there is no session
   const result = posting ? await checkOnDjinni(posting.url) : undefined;
   if (posting && result?.status === "gone") {
      // as when fetching finds the page gone: the posting is gone, its vacancy may now be closed
      await database.postings.markGone(posting.id);
      await buildVacancyQueue.add(
         "build-vacancy",
         { postingId: posting.id },
         buildVacancyJobOptions(posting.id),
      );
      log("check-can-apply", `✗ ${posting.url} — gone (closed or removed)`);
      return "gone";
   }

   const pageCheck = result?.status === "ok" ? result.check : undefined;
   if (pageCheck) {
      const saved = await database.matches.saveJobPageCheck(
         userId,
         vacancyId,
         stored.version,
         pageCheck,
      );
      if (!saved) return "stale";
   }
   const applyCheck = pageCheck?.applyCheck;
   if (posting && applyCheck && !applyCheck.canApply) {
      log("check-can-apply", `✗ ${posting.url} — ${applyCheck.reason}`);
      return "cannot apply";
   }

   if (match.promptVersion !== SCORING_PROMPT_VERSION) {
      await scoreVacancyQueue.add(
         "score-vacancy",
         { userId, vacancyId },
         scoreVacancyJobOptions(userId, vacancyId),
      );
   }
   return applyCheck ? "can apply" : "not checked";
}

/** Asks Djinni; undefined when it can't be asked: no session, or it's over. */
async function checkOnDjinni(url: string): Promise<JobPageResult | undefined> {
   try {
      return await checkDjinniJobPage(url, sessionPath(SourceIds.djinni));
   } catch (err) {
      if (!(err instanceof DjinniSessionExpiredError)) throw err;
      log(
         "check-can-apply",
         "not logged in to Djinni: run `pnpm login djinni`; scoring without the check",
      );
      return undefined;
   }
}
