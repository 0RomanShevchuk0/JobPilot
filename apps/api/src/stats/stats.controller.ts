import { salaryLevelParamSchema, statsPeriods } from "@jobpilot/contracts";
import { Controller, Get, Query } from "@nestjs/common";
import { z } from "zod";
import { CurrentUserId } from "../auth/current-user-id.decorator.js";
import { ZodValidationPipe } from "../common/zod-validation.pipe.js";
import { StatsService } from "./stats.service.js";

/** Whether the runtime knows the IANA time zone, e.g. "Europe/Kyiv". */
function isTimeZone(value: string): boolean {
   try {
      new Intl.DateTimeFormat("en", { timeZone: value });
      return true;
   } catch {
      return false;
   }
}

const statsQuerySchema = z.object({
   period: z.enum(statsPeriods).default("week"),
   /** the browser's time zone: a day of the timeline is the user's calendar day */
   timeZone: z.string().refine(isTimeZone, "Unknown time zone").default("UTC"),
});

const attemptsQuerySchema = z.object({
   /** every company applied to more than once; by default the top ones */
   companies: z.enum(["top", "all"]).default("top"),
   /** the attempts at one salary level: "3000-USD-month", or "none"; absent = all of them */
   salary: salaryLevelParamSchema.optional(),
});

@Controller("stats")
export class StatsController {
   constructor(private readonly stats: StatsService) {}

   /** How many vacancies were found over the period, how many suited me and what I did with them. */
   @Get()
   async get(
      @CurrentUserId() userId: string,
      @Query(new ZodValidationPipe(statsQuerySchema)) query: z.infer<typeof statsQuerySchema>,
   ) {
      return this.stats.get(userId, query.period, query.timeZone);
   }

   /** Every attempt to get a job, all time, or at one salary level: stages reached, statuses, companies. */
   @Get("attempts")
   attempts(
      @CurrentUserId() userId: string,
      @Query(new ZodValidationPipe(attemptsQuerySchema)) query: z.infer<typeof attemptsQuerySchema>,
   ) {
      return this.stats.attempts(userId, {
         allCompanies: query.companies === "all",
         salaryLevel: query.salary,
      });
   }
}
