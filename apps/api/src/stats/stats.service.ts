import {
   jobAttemptStages,
   jobAttemptStatuses,
   type JobAttemptStats,
   type RequestedSalary,
   type Stats,
   type StatsPeriod,
} from "@jobpilot/contracts";
import { Injectable } from "@nestjs/common";
import { Database } from "../infra/database.js";

const HOUR_MS = 60 * 60 * 1000;

// the repeated companies shown at first; the rest when asked
const TOP_COMPANIES = 10;

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
    * Every attempt to get a job, all time, or the ones that asked for a salary (null = for none): how
    * far they got, how they stand now, and the companies applied to more than once (the top ones, or
    * all). And every salary asked for, to pick from.
    */
   async attempts(
      userId: string,
      {
         allCompanies,
         salaryLevel,
      }: { allCompanies: boolean; salaryLevel?: RequestedSalary | null },
   ): Promise<JobAttemptStats> {
      const { salaryLevels, byStageAndStatus, companies } = await this.db.stats.attemptsForUser(
         userId,
         { companiesLimit: allCompanies ? null : TOP_COMPANIES, salaryLevel },
      );
      const countOf = (matches: (row: (typeof byStageAndStatus)[number]) => boolean) =>
         byStageAndStatus.filter(matches).reduce((sum, row) => sum + row.count, 0);
      // a stage's place in the order: there or further counts as reached
      const order = (stage: (typeof jobAttemptStages)[number]) => jobAttemptStages.indexOf(stage);

      return {
         salaryLevels,
         total: countOf(() => true),
         reached: jobAttemptStages.map((stage) => ({
            stage,
            count: countOf((row) => order(row.stage) >= order(stage)),
         })),
         statuses: jobAttemptStatuses.map((status) => ({
            status,
            count: countOf((row) => row.status === status),
         })),
         companies,
      };
   }
}
