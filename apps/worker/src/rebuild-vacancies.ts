// Queues a build-vacancy job for every parsed posting, then exits. The running worker rebuilds the vacancies.
// Use it after the rules for building vacancies change, or to build vacancies from postings collected earlier.
import { createDatabase } from "@jobpilot/db";
import { Queue } from "bullmq";
import { Redis } from "ioredis";
import { config } from "./config.js";
import { BUILD_VACANCY_QUEUE, type BuildVacancyJobData, buildVacancyJobOptions } from "./queues.js";

const connection = new Redis(config.redisUrl, { maxRetriesPerRequest: null });
const database = createDatabase(config.databaseUrl);
const queue = new Queue<BuildVacancyJobData>(BUILD_VACANCY_QUEUE, { connection });

const ids = await database.postings.listParsedIds();
await queue.addBulk(
   ids.map((postingId) => ({
      name: "build-vacancy",
      data: { postingId },
      opts: buildVacancyJobOptions(postingId),
   })),
);
console.log(`queued build-vacancy for ${ids.length} postings`);

await queue.close();
await database.close();
await connection.quit();
