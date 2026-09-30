import { Module } from "@nestjs/common";
import { Database } from "./database.js";
import { RedisService } from "./redis.service.js";

@Module({
   providers: [Database, RedisService],
   exports: [Database, RedisService],
})
export class InfraModule {}
