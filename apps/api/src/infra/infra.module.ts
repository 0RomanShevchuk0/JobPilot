import { Module } from "@nestjs/common";
import { Database } from "./database.js";
import { RedisService } from "./redis.service.js";
import { Storage } from "./storage.js";

@Module({
   providers: [Database, RedisService, Storage],
   exports: [Database, RedisService, Storage],
})
export class InfraModule {}
