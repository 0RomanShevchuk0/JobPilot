// Queues one discover run per source right now, then exits. The running worker picks the jobs up.
import { QueueNames, type DiscoverJobData } from "@jobpilot/contracts";
import { Queue } from "bullmq";
import { Redis } from "ioredis";
import { config } from "../config.js";
import { discoverJobOptions } from "../queues.js";
import { sources } from "../sources.js";

const connection = new Redis(config.redisUrl, { maxRetriesPerRequest: null });
const queue = new Queue<DiscoverJobData>(QueueNames.discover, { connection });

for (const entry of sources) {
   const job = await queue.add(
      "discover",
      { source: entry.adapter.source, keywords: entry.keywords },
      discoverJobOptions,
   );
   console.log(`queued discover for ${entry.adapter.source} (job ${job.id})`);
}

await queue.close();
await connection.quit();
