import { createDatabase, type DatabaseConnection, type Db } from '@jobpilot/db';
import { Injectable, type OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class Database implements OnApplicationShutdown {
  private readonly connection: DatabaseConnection;

  constructor(config: ConfigService) {
    this.connection = createDatabase(config.getOrThrow<string>('DATABASE_URL'));
  }

  get db(): Db {
    return this.connection.db;
  }

  async ping() {
    await this.connection.pool.query('SELECT 1');
  }

  async onApplicationShutdown() {
    await this.connection.pool.end();
  }
}
