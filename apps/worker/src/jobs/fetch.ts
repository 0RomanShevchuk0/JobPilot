import { normalizedPostingSchema, type NormalizedPosting } from "@jobpilot/contracts";
import type { DatabaseClient } from "@jobpilot/db";
import { type Job, UnrecoverableError } from "bullmq";
import { log } from "../log.js";
import type { FetchJobData } from "../queues.js";
import type { SourceEntry } from "../sources.js";

/** One posting page → parse → validate against the contract → database. */
export async function handleFetch(
   job: Job<FetchJobData>,
   entry: SourceEntry,
   database: DatabaseClient,
) {
   const { postingId, ref } = job.data;
   const { adapter } = entry;

   // network errors throw here and the queue retries with backoff
   const result = await adapter.fetch({
      ...ref,
      updatedAt: ref.updatedAt ? new Date(ref.updatedAt) : undefined,
   });

   if (result.status === "gone") {
      await database.postings.markGone(postingId);
      log(`fetch:${adapter.source}`, `${ref.externalId} gone (closed or removed)`);
      return "gone";
   }

   let parsed: NormalizedPosting;
   try {
      parsed = normalizedPostingSchema.parse(adapter.parse(result.raw));
   } catch (err) {
      // the same page would fail the same way again: no point retrying, the job stays in "failed" to look at
      throw new UnrecoverableError(`parse failed for ${ref.url}: ${(err as Error).message}`);
   }

   await database.postings.saveFetched(postingId, result.raw, parsed, adapter.parserVersion);
   log(
      `fetch:${adapter.source}`,
      `${ref.externalId} saved: ${parsed.title} @ ${parsed.company?.name ?? "(employer hidden)"}`,
   );
   return "saved";
}
