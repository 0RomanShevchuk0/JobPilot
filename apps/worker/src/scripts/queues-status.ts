// Prints how many jobs every queue holds right now, in pipeline order, then exits: the queue where
// they pile up is the slow link.
import { fetchQueueName, QueueNames } from "@jobpilot/contracts";
import { Queue } from "bullmq";
import { Redis } from "ioredis";
import { config } from "../config.js";
import { sources } from "../sources.js";

const connection = new Redis(config.redisUrl, { maxRetriesPerRequest: null });
const names = [
   QueueNames.discover,
   ...sources.map((s) => fetchQueueName(s.adapter.source)),
   QueueNames.buildVacancy,
   QueueNames.matchUser,
   QueueNames.matchVacancy,
   QueueNames.checkCanApply,
   QueueNames.scoreVacancy,
   QueueNames.prepareApplication,
   QueueNames.fillApplication,
];

const rows: Record<string, Record<string, number>> = {};
for (const name of names) {
   const queue = new Queue(name, { connection });
   const counts = await queue.getJobCounts("wait", "prioritized", "active", "delayed", "failed");
   // a job with a priority waits in its own list; for the eye it's just waiting
   const waiting = counts.wait + counts.prioritized;
   rows[name] = { waiting, active: counts.active, delayed: counts.delayed, failed: counts.failed };
   await queue.close();
}
console.table(rows);

await connection.quit();
