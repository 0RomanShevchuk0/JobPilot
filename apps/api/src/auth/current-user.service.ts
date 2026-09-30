import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Database } from "../infra/database.js";

/**
 * Single-user mode until auth exists: the user is the one whose email is in USER_EMAIL.
 * With auth, the id will come from the request instead.
 */
@Injectable()
export class CurrentUser {
   private userId?: string;

   constructor(
      private readonly config: ConfigService,
      private readonly db: Database,
   ) {}

   /**
    * Found (or created) on first use and remembered, so the API starts even while the database
    * is down. If the lookup fails nothing is remembered, and the next request tries again.
    */
   async id(): Promise<string> {
      this.userId ??= await this.db.users.ensure(this.config.getOrThrow<string>("USER_EMAIL"));
      return this.userId;
   }
}
