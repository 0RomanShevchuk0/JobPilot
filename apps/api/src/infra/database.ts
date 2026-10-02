import { createDatabase, type DatabaseClient } from "@jobpilot/db";
import { Injectable, type OnApplicationShutdown } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

/**
 * The API's access to the database. The getters are the list of repositories the API is allowed
 * to use; the rest (postings, vacancies building...) belongs to the worker.
 */
@Injectable()
export class Database implements OnApplicationShutdown {
   private readonly client: DatabaseClient;

   constructor(config: ConfigService) {
      this.client = createDatabase(config.getOrThrow<string>("DATABASE_URL"));
   }

   get users() {
      return this.client.users;
   }

   get profiles() {
      return this.client.profiles;
   }

   get matches() {
      return this.client.matches;
   }

   get documents() {
      return this.client.documents;
   }

   ping() {
      return this.client.ping();
   }

   async onApplicationShutdown() {
      await this.client.close();
   }
}
