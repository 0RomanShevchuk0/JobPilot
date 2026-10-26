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
