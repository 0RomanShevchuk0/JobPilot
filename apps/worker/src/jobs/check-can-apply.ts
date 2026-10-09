import {
   SessionExpiredError,
   type ApplyCheck,
   type BuildVacancyJobData,
   type CheckCanApplyJobData,
   type JobPageCheck,
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
 * One prefiltered vacancy × one user → asks the job site of every active posting whether they can
 * apply → a vacancy every site refuses (applied already, the job is closed, unmet requirements) is
 * dropped; the rest goes to scoring, with what a site said of the salary against their expectations.
 * A site without a session isn't asked: while it might still allow applying, the question stays open
 * and match-vacancy asks again later (refresh-matches); the vacancy is scored meanwhile.
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

   const active = await database.postings.listActive(vacancyId);
   const checks: JobPageCheck[] = [];
   let notAsked = 0;
   let gone = 0;
   for (const posting of active) {
      const result = await checkJobPage(posting);
      if (!result) {
         notAsked++;
      } else if (result.status === "gone") {
         // as when fetching finds the page gone: the posting is gone, its vacancy may now be closed
         await database.postings.markGone(posting.id);
         await buildVacancyQueue.add(
            "build-vacancy",
            { postingId: posting.id },
            buildVacancyJobOptions(posting.id),
         );
         log("check-can-apply", `✗ ${posting.url} — gone (closed or removed)`);
         gone++;
      } else {
         checks.push(result.check);
      }
   }
   // the rebuild closes the vacancy: nothing left to score
   if (active.length > 0 && gone === active.length) return "gone";

   const pageCheck = combineChecks(checks, notAsked);
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
   if (applyCheck && !applyCheck.canApply) {
      const urls = active.map((p) => p.url).join(", ");
      log("check-can-apply", `✗ ${urls} — ${applyCheck.reason}`);
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

/**
 * What the sites said, as one answer: the user can apply if any site lets them, can't if every one
 * refuses (with all the reasons); the salary as the first site that told it. undefined when no site
 * was asked. Refusals with a site not asked leave the can-apply question open: that one may allow it.
 */
function combineChecks(
   checks: JobPageCheck[],
   notAsked: number,
): Partial<JobPageCheck> | undefined {
   if (checks.length === 0) return undefined;
   const salaryFit = checks.find((c) => c.salaryFit)?.salaryFit;
   const refusals = checks.flatMap((c) => (c.applyCheck.canApply ? [] : [c.applyCheck.reason]));
   let applyCheck: ApplyCheck | undefined;
   if (refusals.length < checks.length) applyCheck = { canApply: true };
   else if (notAsked === 0) applyCheck = { canApply: false, reason: refusals.join("; ") };
   return { applyCheck, salaryFit };
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
