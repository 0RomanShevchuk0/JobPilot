import type { DiscoverJobData, FetchJobData } from "@jobpilot/contracts";
import type { DatabaseClient } from "@jobpilot/db";
import { type Job, type Queue, UnrecoverableError } from "bullmq";
import { log } from "../log.js";
import { fetchJobOptions } from "../queues.js";
import { probeSessions } from "../session-probe.js";
import { findSource } from "../sources.js";

/**
 * The categories users picked on the source → its RSS/listing → postings table → one fetch job per
 * new, bumped or returned posting.
 */
export async function handleDiscover(
   job: Job<DiscoverJobData>,
   database: DatabaseClient,
   fetchQueues: Map<string, Queue<FetchJobData>>,
) {
   const { source } = job.data;
   const entry = findSource(source);
   const fetchQueue = fetchQueues.get(source);
   if (!entry || !fetchQueue) throw new UnrecoverableError(`unknown source "${source}"`);

   const keywords = await database.profiles.listAllUsersCategories(source);
   // nobody looks here: the site is left alone rather than read unfiltered
   if (keywords.length === 0) {
      log("discover", `${source}: no user picked a category, skipped`);
      return { found: 0, queued: 0 };
   }
   // one page per user's session per run: the web learns of one that is over even without new jobs
   const sessions = await probeSessions(source, database)
      .then((results) => results.map((r) => r.result).join(", ") || "none to try")
      .catch((err: Error) => `failed: ${err.message}`);
   log("discover", `${source} sessions: ${sessions}`);

   const refs = await entry.adapter.discover({ keywords });
   const toFetch = await database.postings.markSeen(source, refs);

   const jobs = toFetch.map(({ postingId, ref, cameBack }) => {
      // same posting + same bump + same parser = same job id, so a posting is never queued twice;
      // a new parserVersion gets a new id, so postings that failed to parse are retried after a fix
      const jobId = `${postingId}_${ref.updatedAt?.getTime() ?? 0}_v${entry.adapter.parserVersion}`;
      return {
         name: "fetch",
         data: { postingId, ref: { ...ref, updatedAt: ref.updatedAt?.toISOString() } },
         // one back from gone would repeat the id of its last fetch: it gets one of its own
         opts: { ...fetchJobOptions, jobId: cameBack ? `${jobId}_back_${Date.now()}` : jobId },
      };
   });
   await fetchQueue.addBulk(jobs);

   log(
      "discover",
      `${source} [${keywords.join(", ")}]: ${refs.length} found, ${toFetch.length} new or updated → queued for fetch`,
   );
   return { found: refs.length, queued: toFetch.length };
}
