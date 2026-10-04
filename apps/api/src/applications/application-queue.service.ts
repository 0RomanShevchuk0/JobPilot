import { QueueNames, type PrepareApplicationJobData } from "@jobpilot/contracts";
import { Injectable, type OnApplicationShutdown } from "@nestjs/common";
import { Queue } from "bullmq";
import { RedisService } from "../infra/redis.service.js";

/** The API only adds jobs; the worker opens the browser and calls the model. */
@Injectable()
export class ApplicationQueue implements OnApplicationShutdown {
   private readonly queue: Queue<PrepareApplicationJobData>;

   constructor(redis: RedisService) {
      this.queue = new Queue(QueueNames.prepareApplication, { connection: redis.client });
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

   async onApplicationShutdown() {
      await this.queue.close();
   }
}
