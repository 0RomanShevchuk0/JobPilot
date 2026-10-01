// Parses stored pages again with the current parsers, then queues build-vacancy for them and exits.
// Use it after bumping an adapter's parserVersion: only postings parsed by an older version are touched,
// and nothing is fetched — the pages come from posting_raw. The running worker rebuilds the vacancies.
import { normalizedPostingSchema, QueueNames, type BuildVacancyJobData } from "@jobpilot/contracts";
import { createDatabase } from "@jobpilot/db";
import { Queue } from "bullmq";
import { Redis } from "ioredis";
import { config } from "./config.js";
import { buildVacancyJobOptions } from "./queues.js";
import { sources } from "./sources.js";

const connection = new Redis(config.redisUrl, { maxRetriesPerRequest: null });
const database = createDatabase(config.databaseUrl);
const queue = new Queue<BuildVacancyJobData>(QueueNames.buildVacancy, { connection });

for (const { adapter } of sources) {
   const ids = await database.postings.listOutdatedIds(adapter.source, adapter.parserVersion);
   const reparsed: string[] = [];
   for (const postingId of ids) {
      const raw = await database.postings.getRaw(postingId);
      if (!raw) continue;
      try {
         const parsed = normalizedPostingSchema.parse(adapter.parse(raw));
         await database.postings.saveParsed(postingId, parsed, adapter.parserVersion);
         reparsed.push(postingId);
      } catch (err) {
         // keeps the old parsed form; the parser needs a fix
         console.error(`${adapter.source}: ${raw.url} failed to parse: ${(err as Error).message}`);
      }
   }
   await queue.addBulk(
      reparsed.map((postingId) => ({
         name: "build-vacancy",
         data: { postingId },
         opts: buildVacancyJobOptions(postingId),
      })),
   );
   console.log(
      `${adapter.source}: ${reparsed.length} of ${ids.length} postings re-parsed with v${adapter.parserVersion}, build-vacancy queued`,
   );
}

await queue.close();
await database.close();
await connection.quit();
