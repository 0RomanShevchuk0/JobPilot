// Queues match-user for every user, then exits. The running worker re-evaluates what is stale: after a
// change to the scoring prompt (SCORING_PROMPT_VERSION) every passed vacancy is scored again.
import { QueueNames, type MatchUserJobData } from "@jobpilot/contracts";
import { createDatabase } from "@jobpilot/db";
import { Queue } from "bullmq";
import { Redis } from "ioredis";
import { config } from "./config.js";

const connection = new Redis(config.redisUrl, { maxRetriesPerRequest: null });
const database = createDatabase(config.databaseUrl);
const queue = new Queue<MatchUserJobData>(QueueNames.matchUser, { connection });

const userIds = await database.users.listIds();
const jobs = userIds.map((userId) => ({
   name: "match-user",
   data: { userId },
   // as the API adds it after a profile change
   opts: {
      deduplication: { id: userId, keepLastIfActive: true },
      attempts: 3,
      removeOnComplete: 100,
      removeOnFail: 100,
   },
}));
await queue.addBulk(jobs);
console.log(`queued match-user for ${userIds.length} users`);

await queue.close();
await database.close();
await connection.quit();
