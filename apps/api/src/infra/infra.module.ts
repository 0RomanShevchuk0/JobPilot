import { Global, Module } from '@nestjs/common';
import { Database } from './database.js';
import { RedisService } from './redis.service.js';

@Global()
@Module({
  providers: [Database, RedisService],
  exports: [Database, RedisService],
})
export class InfraModule {}
