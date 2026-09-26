import { createDatabase, type DatabaseClient } from '@jobpilot/db';
import { Injectable, type OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class Database implements OnApplicationShutdown {
  private readonly client: DatabaseClient;

  constructor(config: ConfigService) {
    this.client = createDatabase(config.getOrThrow<string>('DATABASE_URL'));
  }

  ping() {
    return this.client.ping();
  }

  async onApplicationShutdown() {
    await this.client.close();
  }
}
