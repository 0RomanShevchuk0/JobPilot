import type { Profile } from "@jobpilot/contracts";
import type { StoredProfile } from "@jobpilot/db";
import { sameForMatching } from "@jobpilot/matching";
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

   /**
    * Replaces the whole profile. When the change is one matching reads, every open vacancy is
    * re-evaluated against it; a new phone number or an unchanged save re-evaluates nothing.
    */
   async save(userId: string, profile: Profile): Promise<StoredProfile> {
      const before = await this.db.profiles.get(userId);
      const stale = !before || !sameForMatching(before.profile, profile);
      const version = await this.db.profiles.save(userId, profile, { newVersion: stale });
      if (stale) await this.matchQueue.rematchUser(userId);
      return { version, profile };
   }
}
