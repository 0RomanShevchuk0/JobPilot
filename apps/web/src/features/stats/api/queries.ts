import type { JobAttemptStats, Stats, StatsPeriod } from "@jobpilot/contracts";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiGet } from "../../../shared/api/client";
import { queryKeys } from "../../../shared/api/queryKeys";

/** What was found, matched and applied to over the period, with hours and days in my time zone. */
export function useStats(period: StatsPeriod) {
   return useQuery({
      queryKey: queryKeys.stats.period(period),
      queryFn: () => {
         const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
         const query = new URLSearchParams({ period, timeZone });
         return apiGet<Stats>(`/stats?${query}`);
      },
   });
}

/**
 * Every attempt to get a job, all time; the companies applied to more than once, the top ones or all.
 * Asking for all keeps the top ones shown meanwhile: no loader in place of the list.
 */
export function useAttemptStats(allCompanies: boolean) {
   return useQuery({
      queryKey: queryKeys.stats.attempts(allCompanies),
      queryFn: () =>
         apiGet<JobAttemptStats>(`/stats/attempts${allCompanies ? "?companies=all" : ""}`),
      placeholderData: keepPreviousData,
   });
}
