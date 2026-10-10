import type { Stats, StatsPeriod } from "@jobpilot/contracts";
import { Injectable } from "@nestjs/common";
import { Database } from "../infra/database.js";

const HOUR_MS = 60 * 60 * 1000;

/** How far back each period goes; "all" has no start. */
const periodHours: Record<Exclude<StatsPeriod, "all">, number> = {
   day: 24,
   week: 7 * 24,
   month: 30 * 24,
};

@Injectable()
export class StatsService {
   constructor(private readonly db: Database) {}

   /** What was found, matched and applied to over the period; hours and days are counted in timeZone. */
   async get(userId: string, period: StatsPeriod, timeZone: string): Promise<Stats> {
      const since = period === "all" ? null : new Date(Date.now() - periodHours[period] * HOUR_MS);
      const stats = await this.db.stats.forUser(userId, {
         since,
         bucket: period === "day" ? "hour" : "day",
         timeZone,
      });
      return { period, ...stats };
   }
}
