import type { Stats, StatsPeriod } from "@jobpilot/contracts";
import { useQuery } from "@tanstack/react-query";
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
