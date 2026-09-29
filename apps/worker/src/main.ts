import { createDatabase } from "@jobpilot/db";
import { Queue, UnrecoverableError, Worker } from "bullmq";
import { Redis } from "ioredis";
import { config } from "./config.js";
import { handleDiscover } from "./jobs/discover.js";
import { handleFetch } from "./jobs/fetch.js";
import { log } from "./log.js";
import {
   DISCOVER_QUEUE,
   type DiscoverJobData,
   discoverJobOptions,
   type FetchJobData,
   fetchQueueName,
} from "./queues.js";
import { sources } from "./sources.js";

// BullMQ workers need maxRetriesPerRequest: null so blocking commands survive Redis reconnects
const connection = new Redis(config.redisUrl, { maxRetriesPerRequest: null });
const database = createDatabase(config.databaseUrl);

const discoverQueue = new Queue<DiscoverJobData>(DISCOVER_QUEUE, { connection });
const fetchQueues = new Map(
   sources.map((s) => [
      s.adapter.source,
      new Queue<FetchJobData>(fetchQueueName(s.adapter.source), { connection }),
   ]),
);
const workers: Worker[] = [];

for (const entry of sources) {
   const { source } = entry.adapter;
   await database.sources.register({ id: source, name: entry.name, baseUrl: entry.baseUrl });

   // a new scheduler runs right away; an existing one keeps its interval, so restarts don't re-trigger it
   await discoverQueue.upsertJobScheduler(
      `discover-${source}`,
      { every: config.discoverEveryMs },
      {
         name: "discover",
         data: { source, keywords: entry.keywords },
         opts: discoverJobOptions,
      },
   );

   workers.push(
      new Worker<FetchJobData>(
         fetchQueueName(source),
         (job) => handleFetch(job, entry, database),
         // one page at a time, at most one per fetchIntervalMs
         { connection, concurrency: 1, limiter: { max: 1, duration: entry.fetchIntervalMs } },
      ),
   );
}

workers.push(
   new Worker<DiscoverJobData>(
      DISCOVER_QUEUE,
      (job) => handleDiscover(job, database, fetchQueues),
      { connection, concurrency: 1 },
   ),
);

for (const worker of workers) {
   worker.on("failed", (job, err) => {
      const outcome =
         err instanceof UnrecoverableError
            ? "not retrying"
            : job && job.attemptsMade < (job.opts.attempts ?? 1)
              ? "will retry"
              : "gave up";
      log(worker.name, `job ${job?.id} failed (${outcome}): ${err.message}`);
   });
}

log(
   "worker",
   `started: ${sources.map((s) => `${s.adapter.source} [${s.keywords.join(", ") || "all"}]`).join(", ")}; ` +
      `discover every ${config.discoverEveryMs / 60_000} min`,
);

async function shutdown(signal: string) {
   log("worker", `${signal}: finishing current jobs...`);
   await Promise.all(workers.map((w) => w.close()));
   await Promise.all([discoverQueue.close(), ...[...fetchQueues.values()].map((q) => q.close())]);
   await database.close();
   await connection.quit();
   log("worker", "stopped");
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
