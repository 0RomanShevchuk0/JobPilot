import type { DiscoverJobData, FetchJobData } from "@jobpilot/contracts";
import type { DatabaseClient } from "@jobpilot/db";
import { type Job, type Queue, UnrecoverableError } from "bullmq";
import { log } from "../log.js";
import { fetchJobOptions } from "../queues.js";
import { findSource } from "../sources.js";

/** RSS/listing → postings table → one fetch job per new or bumped posting. */
export async function handleDiscover(
   job: Job<DiscoverJobData>,
   database: DatabaseClient,
   fetchQueues: Map<string, Queue<FetchJobData>>,
) {
   const { source, keywords } = job.data;
   const entry = findSource(source);
   const fetchQueue = fetchQueues.get(source);
   if (!entry || !fetchQueue) throw new UnrecoverableError(`unknown source "${source}"`);

   const refs = await entry.adapter.discover({ keywords });
   const toFetch = await database.postings.markSeen(source, refs);

   await fetchQueue.addBulk(
      toFetch.map(({ postingId, ref }) => ({
         name: "fetch",
         data: { postingId, ref: { ...ref, updatedAt: ref.updatedAt?.toISOString() } },
         // same posting + same bump + same parser = same job id, so a posting is never queued twice;
         // a new parserVersion gets a new id, so postings that failed to parse are retried after a fix
         opts: {
            ...fetchJobOptions,
            jobId: `${postingId}_${ref.updatedAt?.getTime() ?? 0}_v${entry.adapter.parserVersion}`,
         },
      })),
   );

   log(
      "discover",
      `${source} [${keywords.join(", ") || "all"}]: ${refs.length} found, ${toFetch.length} new or updated → queued for fetch`,
   );
   return { found: refs.length, queued: toFetch.length };
}
