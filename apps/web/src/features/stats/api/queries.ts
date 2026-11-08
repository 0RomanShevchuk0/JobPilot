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
 * Every attempt to get a job, all time, or at one salary level (salaryLevelParam's; null = all); the
 * companies applied to more than once, the top ones or all. Asking for more, or another level, keeps
 * what is shown meanwhile: no loader in place of it.
 */
export function useAttemptStats(allCompanies: boolean, salary: string | null) {
   return useQuery({
      queryKey: queryKeys.stats.attempts({ allCompanies, salary }),
      queryFn: () => {
         const query = new URLSearchParams();
         if (allCompanies) query.set("companies", "all");
         if (salary !== null) query.set("salary", salary);
         return apiGet<JobAttemptStats>(`/stats/attempts?${query}`);
      },
      placeholderData: keepPreviousData,
   });
}
