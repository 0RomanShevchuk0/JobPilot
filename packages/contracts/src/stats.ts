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
   /** my marks */
   applied: number;
   hidden: number;
}

/** Applications by when they were sent (or failed), not when the vacancy was found. */
export interface StatsApplications {
   submitted: number;
   failed: number;
}

/** One bar of the timeline: an hour for "day", a calendar day otherwise. */
export interface StatsBucket {
   start: string; // ISO
   found: number;
   /** apply + stretch */
   suitable: number;
}

/** GET /stats?period=week */
export interface Stats {
   period: StatsPeriod;
   funnel: StatsFunnel;
   applications: StatsApplications;
   timeline: StatsBucket[];
}
