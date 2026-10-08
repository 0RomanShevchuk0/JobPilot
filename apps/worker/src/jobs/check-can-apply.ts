import {
   SessionExpiredError,
   type BuildVacancyJobData,
   type CheckCanApplyJobData,
   type JobPageResult,
   type ScoreVacancyJobData,
} from "@jobpilot/contracts";
import type { DatabaseClient } from "@jobpilot/db";
import { SCORING_PROMPT_VERSION } from "@jobpilot/matching";
import type { Job, Queue } from "bullmq";
import { loginHint, sessionPath } from "../config.js";
import { log } from "../log.js";
import { buildVacancyJobOptions, scoreVacancyJobOptions } from "../queues.js";
import { findSource } from "../sources.js";

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

   // one posting is asked, the last seen; asking all of them is in TODO.md
   const posting = await database.applications.findPostingToApply(vacancyId);
   // undefined: not asked, the vacancy has no active posting or there is no session on its site
   const result = posting ? await checkJobPage(posting) : undefined;
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

/** Asks the posting's job site; undefined when it can't be asked: no session, or it's over. */
async function checkJobPage(posting: {
   source: string;
   url: string;
}): Promise<JobPageResult | undefined> {
   const entry = findSource(posting.source);
   if (!entry) throw new Error(`no adapter for source ${posting.source}`);
   try {
      return await entry.adapter.account.checkJobPage(posting.url, sessionPath(posting.source));
   } catch (err) {
      if (!(err instanceof SessionExpiredError)) throw err;
      log(
         "check-can-apply",
         `${err.message} (${loginHint(posting.source)}); scoring without the check`,
      );
      return undefined;
   }
}
