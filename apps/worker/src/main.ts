import {
   QueueNames,
   type DiscoverJobData,
   fetchQueueName,
   type FetchJobData,
   type BuildVacancyJobData,
   type MatchVacancyJobData,
   type CheckCanApplyJobData,
   type MatchUserJobData,
   type ScoreVacancyJobData,
   type PrepareApplicationJobData,
   type FillApplicationJobData,
} from "@jobpilot/contracts";
import { createDatabase } from "@jobpilot/db";
import { Queue, UnrecoverableError, Worker } from "bullmq";
import { Redis } from "ioredis";
import { config } from "./config.js";
import { handleDiscover } from "./jobs/discover.js";
import { handleFetch } from "./jobs/fetch.js";
import { handleBuildVacancy } from "./jobs/build-vacancy.js";
import { handleMatchUser } from "./jobs/match-user.js";
import { handleMatchVacancy } from "./jobs/match-vacancy.js";
import { handleCheckCanApply } from "./jobs/check-can-apply.js";
import { handleScoreVacancy } from "./jobs/score-vacancy.js";
import { handlePrepareApplication } from "./jobs/prepare-application.js";
import { handleFillApplication } from "./jobs/fill-application.js";
import { createScoringLlm } from "./llm.js";
import { log } from "./log.js";
import { discoverJobOptions } from "./queues.js";
import { sources } from "./sources.js";

// BullMQ workers need maxRetriesPerRequest: null so blocking commands survive Redis reconnects
const connection = new Redis(config.redisUrl, { maxRetriesPerRequest: null });
const database = createDatabase(config.databaseUrl);
const scoring = createScoringLlm();

const discoverQueue = new Queue<DiscoverJobData>(QueueNames.discover, { connection });
const fetchQueues = new Map(
   sources.map((s) => [
      s.adapter.source,
      new Queue<FetchJobData>(fetchQueueName(s.adapter.source), { connection }),
   ]),
);
const buildVacancyQueue = new Queue<BuildVacancyJobData>(QueueNames.buildVacancy, { connection });
const matchVacancyQueue = new Queue<MatchVacancyJobData>(QueueNames.matchVacancy, { connection });
const checkCanApplyQueue = new Queue<CheckCanApplyJobData>(QueueNames.checkCanApply, {
   connection,
});
const scoreVacancyQueue = new Queue<ScoreVacancyJobData>(QueueNames.scoreVacancy, { connection });
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
         (job) => handleFetch(job, entry, database, buildVacancyQueue),
         // one page at a time, at most one per fetchIntervalMs
         { connection, concurrency: 1, limiter: { max: 1, duration: entry.fetchIntervalMs } },
      ),
   );
}

workers.push(
   new Worker<DiscoverJobData>(
      QueueNames.discover,
      (job) => handleDiscover(job, database, fetchQueues),
      { connection, concurrency: 1 },
   ),
   new Worker<BuildVacancyJobData>(
      QueueNames.buildVacancy,
      (job) => handleBuildVacancy(job, database, matchVacancyQueue),
      {
         connection,
         concurrency: 1,
      },
   ),
   new Worker<MatchUserJobData>(
      QueueNames.matchUser,
      (job) => handleMatchUser(job, database, matchVacancyQueue),
      { connection, concurrency: 1 },
   ),
   new Worker<MatchVacancyJobData>(
      QueueNames.matchVacancy,
      (job) => handleMatchVacancy(job, database, checkCanApplyQueue, scoreVacancyQueue),
      { connection, concurrency: 1 },
   ),
   new Worker<CheckCanApplyJobData>(
      QueueNames.checkCanApply,
      (job) => handleCheckCanApply(job, database, scoreVacancyQueue),
      // the requests are the user's own: one job page per 5 s at most, like a person going through jobs
      { connection, concurrency: 1, limiter: { max: 1, duration: 5000 } },
   ),
   new Worker<ScoreVacancyJobData>(
      QueueNames.scoreVacancy,
      (job) => handleScoreVacancy(job, database, scoring.llm),
      { connection, concurrency: scoring.concurrency, limiter: scoring.limiter },
   ),
   new Worker<PrepareApplicationJobData>(
      QueueNames.prepareApplication,
      (job) => handlePrepareApplication(job, database, scoring.llm),
      // one browser at a time: a person applies to one job at a time too
      { connection, concurrency: 1 },
   ),
   new Worker<FillApplicationJobData>(
      QueueNames.fillApplication,
      (job) => handleFillApplication(job, database),
      // one visible window at a time; a job can wait up to 30 min for the user, the lock is renewed meanwhile
      { connection, concurrency: 1 },
   ),
);

// A queue fed one job at a time (e.g. match-vacancy while pages are fetched one per 3 s) empties after
// every job; the summary waits until it has stayed empty this long, so a run gets one line, not one
// per job. Longer than the slowest fetch interval for that reason.
const SUMMARY_QUIET_MS = 10_000;

for (const worker of workers) {
   // counts since the last summary
   let completed = 0;
   let failed = 0;
   let summaryTimer: NodeJS.Timeout | undefined;

   worker.on("active", () => clearTimeout(summaryTimer));
   worker.on("completed", () => completed++);
   worker.on("failed", (job, err) => {
      failed++;
      const outcome =
         err instanceof UnrecoverableError
            ? "not retrying"
            : job && job.attemptsMade < (job.opts.attempts ?? 1)
              ? "will retry"
              : "gave up";
      log(worker.name, `job ${job?.id} failed (${outcome}): ${err.message}`);
   });
   worker.on("drained", () => {
      if (completed + failed === 0) return; // idle: nothing happened since the last summary
      clearTimeout(summaryTimer);
      summaryTimer = setTimeout(() => {
         log(worker.name, `queue empty: ${completed} completed, ${failed} failed`);
         completed = 0;
         failed = 0;
      }, SUMMARY_QUIET_MS).unref(); // never keeps the process alive on shutdown
   });
}

log(
   "worker",
   `started: ${sources.map((s) => `${s.adapter.source} [${s.keywords.join(", ") || "all"}]`).join(", ")}; ` +
      `discover every ${config.discoverEveryMs / 60_000} min; scoring with ${scoring.llm.model}`,
);

async function shutdown(signal: string) {
   log("worker", `${signal}: finishing current jobs...`);
   await Promise.all(workers.map((w) => w.close()));
   await Promise.all([
      discoverQueue.close(),
      buildVacancyQueue.close(),
      matchVacancyQueue.close(),
      checkCanApplyQueue.close(),
      scoreVacancyQueue.close(),
      ...[...fetchQueues.values()].map((q) => q.close()),
   ]);
   await database.close();
   await connection.quit();
   log("worker", "stopped");
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
