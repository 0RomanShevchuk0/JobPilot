// Queues one discover run per source right now, then exits. The running worker picks the jobs up.
import { Queue } from "bullmq";
import { Redis } from "ioredis";
import { config } from "./config.js";
import { DISCOVER_QUEUE, type DiscoverJobData, discoverJobOptions } from "./queues.js";
import { sources } from "./sources.js";

const connection = new Redis(config.redisUrl, { maxRetriesPerRequest: null });
const queue = new Queue<DiscoverJobData>(DISCOVER_QUEUE, { connection });

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
