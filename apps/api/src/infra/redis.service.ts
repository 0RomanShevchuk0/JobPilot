import { Injectable, Logger, type OnApplicationShutdown } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Redis } from "ioredis";

@Injectable()
export class RedisService implements OnApplicationShutdown {
   private readonly logger = new Logger(RedisService.name);
   readonly client: Redis;

   constructor(config: ConfigService) {
      this.client = new Redis(config.getOrThrow<string>("REDIS_URL"));
      // ioredis reconnects on its own; without a listener errors are reported as "unhandled"
      // connection failures arrive as AggregateError (IPv4 + IPv6 attempts) with an empty message, so prefer the code
      this.client.on("error", (err: NodeJS.ErrnoException) =>
         this.logger.warn(`Redis connection error: ${err.code ?? err.message}`),
      );
   }

   async onApplicationShutdown() {
      await this.client.quit();
   }
}
