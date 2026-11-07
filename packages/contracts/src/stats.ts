import type { JobAttemptStage, JobAttemptStatus } from "./job-attempt.js";

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

/** GET /stats/attempts: every attempt to get a job, all time. Every list is in its values' order. */
export interface JobAttemptStats {
   total: number;
   /** the attempts that got to each stage: there or further, a stage skipped counts as passed */
   reached: StageCount[];
   /** the attempts that ended without a job (rejected, declined, ghosted, no answer), by their stage */
   stopped: StageCount[];
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
