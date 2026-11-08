import { z } from "zod";
import {
   requestedSalarySchema,
   type JobAttemptStage,
   type JobAttemptStatus,
   type RequestedSalary,
} from "./job-attempt.js";

/** last 24 hours, 7 days, 30 days, everything */
export const statsPeriods = ["day", "week", "month", "all"] as const;
export type StatsPeriod = (typeof statsPeriods)[number];

/** Vacancies found in the period and how far each got; every step counts the same vacancies. */
export interface StatsFunnel {
   found: number;
   prefilterPassed: number;
   scored: number;
   /** AI verdicts among scored */
   apply: number;
   stretch: number;
   /** apply + stretch the job site doesn't refuse (or wasn't asked about) */
   canApply: number;
   /** applied to through at least one of its job sites (by JobPilot or by hand) */
   applied: number;
   /** hidden by me */
   hidden: number;
}

/** Applications by when they were sent (or failed), not when the vacancy was found. */
export interface StatsApplications {
   submitted: number;
   failed: number;
   /** the job site took no application: applied already, closed, external only */
   cannotApply: number;
}

/** One bar of the timeline: an hour for "day", a calendar day otherwise. */
export interface StatsBucket {
   start: string; // ISO
   found: number;
   /** apply + stretch */
   suitable: number;
   /** applications sent in this hour or day, whenever their vacancy was found */
   submitted: number;
}

/** GET /stats?period=week */
export interface Stats {
   period: StatsPeriod;
   funnel: StatsFunnel;
   applications: StatsApplications;
   timeline: StatsBucket[];
}

/** How many attempts stand at one stage, or got to it. */
export interface StageCount {
   stage: JobAttemptStage;
   count: number;
}

/** A company I applied to more than once, and how many times. */
export interface RepeatedCompany {
   name: string;
   attempts: number;
}

/** A salary I asked for, and how many attempts asked for it; null = the attempts with none. */
export interface SalaryLevel {
   salary: RequestedSalary | null;
   attempts: number;
}

/**
 * A salary level in an address: "3000-USD-month", or "none" for the attempts with no requested salary.
 * The stats tab keeps it in the page's address and sends it to GET /stats/attempts?salary=… as is.
 */
export function salaryLevelParam(salary: RequestedSalary | null): string {
   return salary ? `${salary.amount}-${salary.currency}-${salary.period}` : "none";
}

/**
 * Reads what salaryLevelParam wrote: a requested salary, or null for "none". Only as it writes it:
 * "03000-USD-month" or "3000-USD-month-x" would pick the same attempts under another name, and no
 * level would show as picked.
 */
export const salaryLevelParamSchema = z.string().transform((value, ctx): RequestedSalary | null => {
   if (value === "none") return null;
   const [amount, currency, period] = value.split("-");
   const parsed = requestedSalarySchema.safeParse({ amount: Number(amount), currency, period });
   if (!parsed.success || salaryLevelParam(parsed.data) !== value) {
      ctx.addIssue({ code: "custom", message: "Not a salary level" });
      return z.NEVER;
   }
   return parsed.data;
});

/**
 * GET /stats/attempts: every attempt to get a job, all time, or the ones at one salary level. Every
 * list is in its values' order.
 */
export interface JobAttemptStats {
   /**
    * every salary I asked for, of all the attempts whatever level is picked: grouped by period and
    * currency, the higher amount first within them; "none" last
    */
   salaryLevels: SalaryLevel[];
   total: number;
   /** the attempts that got to each stage: there or further, a stage skipped counts as passed */
   reached: StageCount[];
   /** how many stand at each status now */
   statuses: { status: JobAttemptStatus; count: number }[];
   companies: {
      /** the companies applied to, rows without one aside */
      total: number;
      /** of them, the ones applied to more than once */
      repeated: number;
      /** the repeated ones, the most attempts first: the top ones, or all of them when asked */
      list: RepeatedCompany[];
   };
}
