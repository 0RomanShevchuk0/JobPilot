import type { FetchJobData, DetectClosedPostingsJobData } from "@jobpilot/contracts";
import type { DatabaseClient } from "@jobpilot/db";
import { type Job, type Queue, UnrecoverableError } from "bullmq";
import { log } from "../log.js";
import { fetchJobOptions } from "../queues.js";

/** How often a source is checked for closed postings. */
export const DETECT_CLOSED_EVERY_MS = 3 * 60 * 60 * 1000;
// A posting gone from the listings for this long gets its page opened: not to close it for the time
// passed, only the page can say it is closed. An open one is looked at again after as long.
const UNSEEN_FOR_MS = 3 * 24 * 60 * 60 * 1000;
// at the source's pace of one page per fetchIntervalMs, so a run's pages take minutes
const PAGES_PER_RUN = 100;

/**
 * Listings show the latest jobs, so a closed posting usually just stops appearing in them: the ones
 * long gone from there → one fetch job each, which finds out whether the page is closed.
 */
export async function handleDetectClosedPostings(
   job: Job<DetectClosedPostingsJobData>,
   database: DatabaseClient,
   fetchQueues: Map<string, Queue<FetchJobData>>,
) {
   const { source } = job.data;
   const fetchQueue = fetchQueues.get(source);
   if (!fetchQueue) throw new UnrecoverableError(`unknown source "${source}"`);

   const keywords = await database.profiles.listAllUsersCategories(source);
   // nobody looks here: the site is left alone
   if (keywords.length === 0) {
      log("detect-closed-postings", `${source}: no user picked a category, skipped`);
      return 0;
   }

   const unseenSince = new Date(Date.now() - UNSEEN_FOR_MS);
   const longUnseen = await database.postings.listLongUnseen(source, unseenSince, PAGES_PER_RUN);
   const today = new Date().toISOString().slice(0, 10);
   const jobs = longUnseen.map(({ postingId, ref }) => ({
      name: "fetch",
      data: { postingId, ref: { externalId: ref.externalId, url: ref.url } },
      // once a day at most: one that failed stays on the list, its page isn't opened again and again
      opts: { ...fetchJobOptions, jobId: `${postingId}_detect_closed_${today}` },
   }));
   await fetchQueue.addBulk(jobs);

   log("detect-closed-postings", `${source}: ${jobs.length} queued for fetch`);
   return jobs.length;
}
