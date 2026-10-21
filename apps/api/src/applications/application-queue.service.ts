import { QueueNames, type PrepareApplicationJobData } from "@jobpilot/contracts";
import { Injectable, type OnApplicationShutdown } from "@nestjs/common";
import { Queue, type JobState } from "bullmq";
import { RedisService } from "../infra/redis.service.js";

// a job in one of these states has not finished: it runs now, or is about to (again)
const UNFINISHED_JOB_STATES: readonly (JobState | "unknown")[] = [
   "waiting",
   "prioritized",
   "delayed",
   "active",
];

/** The API only adds jobs; the worker reads the form and calls the model. */
@Injectable()
export class ApplicationQueue implements OnApplicationShutdown {
   private readonly queue: Queue<PrepareApplicationJobData>;

   constructor(redis: RedisService) {
      this.queue = new Queue(QueueNames.prepareApplication, { connection: redis.client });
   }

   /** One preparation per application at a time; a failed one can be started again. */
   async prepare(applicationId: string, refreshForm: boolean) {
      await this.queue.add(
         "prepare-application",
         { applicationId, refreshForm },
         {
            deduplication: { id: applicationId },
            attempts: 2,
            backoff: { type: "exponential", delay: 30_000 },
            removeOnComplete: 100,
            removeOnFail: 100,
         },
      );
   }

   /**
    * The application's prepare job is queued, running or waiting to retry in this machine's Redis. The
    * worker always settles the application before its job ends, so "preparing" without one is lost.
    */
   isPreparing(applicationId: string): Promise<boolean> {
      return hasUnfinishedJob(this.queue, applicationId);
   }

   async onApplicationShutdown() {
      await this.queue.close();
   }
}

/** The application's job in this queue (one at a time, by deduplication) has not finished. */
async function hasUnfinishedJob(queue: Queue, applicationId: string): Promise<boolean> {
   const jobId = await queue.getDeduplicationJobId(applicationId);
   if (!jobId) return false;
   const state = await queue.getJobState(jobId);
   return UNFINISHED_JOB_STATES.includes(state);
}
