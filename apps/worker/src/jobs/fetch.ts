import {
   normalizedPostingSchema,
   type NormalizedPosting,
   type FetchJobData,
   type BuildVacancyJobData,
} from "@jobpilot/contracts";
import type { DatabaseClient } from "@jobpilot/db";
import { type Job, type Queue, UnrecoverableError } from "bullmq";
import { log } from "../log.js";
import { buildVacancyJobOptions } from "../queues.js";
import type { SourceEntry } from "../sources.js";

/** One posting page → parse → validate against the contract → database → build its vacancy. */
export async function handleFetch(
   job: Job<FetchJobData>,
   entry: SourceEntry,
   database: DatabaseClient,
   buildVacancyQueue: Queue<BuildVacancyJobData>,
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
      // its vacancy may now be closed
      await buildVacancyQueue.add(
         "build-vacancy",
         { postingId },
         buildVacancyJobOptions(postingId),
      );
      log(`fetch:${adapter.source}`, `${ref.externalId} gone (closed or removed)`);
      return "gone";
   }

   // a page the parser can't read is retried: a site may answer 200 with a page not ready yet (DOU on a
   // job published moments ago); a real layout change still ends in "failed" after the last attempt
   let posting: NormalizedPosting;
   try {
      posting = adapter.parse(result.raw);
   } catch (err) {
      throw new Error(`parse failed for ${ref.url}: ${(err as Error).message}`);
   }
   const validated = normalizedPostingSchema.safeParse(posting);
   if (!validated.success) {
      // the parser's own output breaks the contract: the same page would fail the same way again
      throw new UnrecoverableError(`invalid posting from ${ref.url}: ${validated.error.message}`);
   }
   const parsed = validated.data;

   await database.postings.saveFetched(postingId, result.raw, parsed, adapter.parserVersion);
   await buildVacancyQueue.add("build-vacancy", { postingId }, buildVacancyJobOptions(postingId));
   log(
      `fetch:${adapter.source}`,
      `${ref.externalId} saved: ${parsed.title} @ ${parsed.company?.name ?? "(employer hidden)"}`,
   );
   return "saved";
}
