import {
   jobAttemptStages,
   jobAttemptStatuses,
   type JobAttemptStats,
   type JobAttemptStatus,
   type Stats,
   type StatsPeriod,
} from "@jobpilot/contracts";
import { Injectable } from "@nestjs/common";
import { Database } from "../infra/database.js";

const HOUR_MS = 60 * 60 * 1000;

// the repeated companies shown at first; the rest when asked
const TOP_COMPANIES = 10;

// the attempts that ended without a job: where they stopped. An accepted one ended with it, a held or
// active one hasn't ended
const stoppedStatuses: JobAttemptStatus[] = ["rejected", "declined", "ghosted", "no_answer"];

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

   /**
    * Every attempt to get a job, all time: how far they got, where the ended ones stopped, how they
    * stand now, and the companies applied to more than once (the top ones, or all).
    */
   async attempts(userId: string, allCompanies: boolean): Promise<JobAttemptStats> {
      const { byStageAndStatus, companies } = await this.db.stats.attemptsForUser(
         userId,
         allCompanies ? null : TOP_COMPANIES,
      );
      const countOf = (matches: (row: (typeof byStageAndStatus)[number]) => boolean) =>
         byStageAndStatus.filter(matches).reduce((sum, row) => sum + row.count, 0);
      // a stage's place in the order: there or further counts as reached
      const order = (stage: (typeof jobAttemptStages)[number]) => jobAttemptStages.indexOf(stage);

      return {
         total: countOf(() => true),
         reached: jobAttemptStages.map((stage) => ({
            stage,
            count: countOf((row) => order(row.stage) >= order(stage)),
         })),
         stopped: jobAttemptStages.map((stage) => ({
            stage,
            count: countOf((row) => row.stage === stage && stoppedStatuses.includes(row.status)),
         })),
         statuses: jobAttemptStatuses.map((status) => ({
            status,
            count: countOf((row) => row.status === status),
         })),
         companies,
      };
   }
}
