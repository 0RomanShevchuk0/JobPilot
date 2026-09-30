import { QueueNames, type MatchUserJobData } from "@jobpilot/contracts";
import { Injectable, type OnApplicationShutdown } from "@nestjs/common";
import { Queue } from "bullmq";
import { RedisService } from "../infra/redis.service.js";

/** The API only adds jobs; the worker runs them. */
@Injectable()
export class MatchQueue implements OnApplicationShutdown {
   private readonly queue: Queue<MatchUserJobData>;

   constructor(redis: RedisService) {
      this.queue = new Queue(QueueNames.matchUser, { connection: redis.client });
   }

   /**
    * Re-evaluate every open vacancy for the user. One request per user at a time: a waiting one is
    * reused; if one is running, another runs after it so the latest profile is always evaluated.
    * A failed request never blocks the next one.
    */
   async rematchUser(userId: string) {
      await this.queue.add(
         "match-user",
         { userId },
         {
            deduplication: { id: userId, keepLastIfActive: true },
            attempts: 3,
            removeOnComplete: 100,
            removeOnFail: 100,
         },
      );
   }

   async onApplicationShutdown() {
      await this.queue.close();
   }
}
