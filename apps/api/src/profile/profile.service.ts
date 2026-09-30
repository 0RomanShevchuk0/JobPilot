import type { Profile } from "@jobpilot/contracts";
import type { StoredProfile } from "@jobpilot/db";
import { Injectable } from "@nestjs/common";
import { Database } from "../infra/database.js";
import { MatchQueue } from "../matching/match-queue.service.js";

@Injectable()
export class ProfileService {
   constructor(
      private readonly db: Database,
      private readonly matchQueue: MatchQueue,
   ) {}

   get(userId: string): Promise<StoredProfile | undefined> {
      return this.db.profiles.get(userId);
   }

   /** Replaces the whole profile, then every open vacancy is re-evaluated against it. */
   async save(userId: string, profile: Profile): Promise<StoredProfile> {
      const version = await this.db.profiles.save(userId, profile);
      await this.matchQueue.rematchUser(userId);
      return { version, profile };
   }
}
