import {
   QueueNames,
   type FillApplicationJobData,
   type PrepareApplicationJobData,
} from "@jobpilot/contracts";
import { Injectable, type OnApplicationShutdown } from "@nestjs/common";
import { Queue } from "bullmq";
import { RedisService } from "../infra/redis.service.js";

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
   async prepare(applicationId: string) {
      await this.queue.add(
         "prepare-application",
         { applicationId },
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

   async onApplicationShutdown() {
      await Promise.all([this.queue.close(), this.fillQueue.close()]);
   }
}
