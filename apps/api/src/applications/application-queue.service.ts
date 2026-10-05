import {
   QueueNames,
   type FillApplicationJobData,
   type PrepareApplicationJobData,
} from "@jobpilot/contracts";
import { Injectable, type OnApplicationShutdown } from "@nestjs/common";
import { Queue, type JobState } from "bullmq";
import { RedisService } from "../infra/redis.service.js";

// a fill job in one of these states has not finished: its browser window is open, or about to open
const UNFINISHED_JOB_STATES: readonly (JobState | "unknown")[] = [
   "waiting",
   "prioritized",
   "delayed",
   "active",
];

/** The API only adds jobs; the worker opens the browser and calls the model. */
@Injectable()
export class ApplicationQueue implements OnApplicationShutdown {
   private readonly queue: Queue<PrepareApplicationJobData>;
   private readonly fillQueue: Queue<FillApplicationJobData>;

   constructor(redis: RedisService) {
      this.queue = new Queue(QueueNames.prepareApplication, { connection: redis.client });
      this.fillQueue = new Queue(QueueNames.fillApplication, { connection: redis.client });
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
    * One fill per application at a time and no retries: a retry would pop the browser window up again
    * on its own. The user starts it again if they want to.
    */
   async fill(applicationId: string) {
      await this.fillQueue.add(
         "fill-application",
         { applicationId },
         {
            deduplication: { id: applicationId },
            attempts: 1,
            removeOnComplete: 100,
            removeOnFail: 100,
         },
      );
   }

   /**
    * The application's form is open in a browser window: its fill job is still queued or running.
    * The job ends when the user sends the form, closes the window or lets it time out, so this needs
    * no state of its own, and a crashed worker's job is cleaned up by BullMQ, not left "open".
    */
   async isFilling(applicationId: string): Promise<boolean> {
      const jobId = await this.fillQueue.getDeduplicationJobId(applicationId);
      if (!jobId) return false;
      const state = await this.fillQueue.getJobState(jobId);
      return UNFINISHED_JOB_STATES.includes(state);
   }

   async onApplicationShutdown() {
      await Promise.all([this.queue.close(), this.fillQueue.close()]);
   }
}
