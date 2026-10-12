import { Module } from "@nestjs/common";
import { Database } from "./database.js";
import { Llm } from "./llm.js";
import { RedisService } from "./redis.service.js";
import { Storage } from "./storage.js";

@Module({
   providers: [Database, Llm, RedisService, Storage],
   exports: [Database, Llm, RedisService, Storage],
})
export class InfraModule {}
