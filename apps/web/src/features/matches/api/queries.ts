import type { MatchDetails, MatchListItem, MatchStatus } from "@jobpilot/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPatch } from "../../../shared/api/client";
import { queryKeys } from "../../../shared/api/queryKeys";

export type MatchesTab = "new" | "applied" | "hidden";

/** Vacancies evaluated for my current profile, best first: new ones, or the ones I marked. */
export function useMatches(tab: MatchesTab, includeSkipped: boolean) {
   // skipped ones are only among the new
   const withSkipped = tab === "new" && includeSkipped;
   return useQuery({
      queryKey: queryKeys.matches.list({ status: tab, includeSkipped: withSkipped }),
      queryFn: () => {
         const query = new URLSearchParams({ status: tab });
         if (withSkipped) query.set("include", "skipped");
         return apiGet<MatchListItem[]>(`/matches?${query}`);
      },
   });
}

/** One vacancy as evaluated for my current profile. */
export function useMatch(vacancyId: string) {
   return useQuery({
      queryKey: queryKeys.matches.details(vacancyId),
      queryFn: () => apiGet<MatchDetails>(`/matches/${vacancyId}`),
   });
}

/** Marks a vacancy as applied or hidden; null makes it new again. */
export function useMarkMatch(vacancyId: string) {
   const queryClient = useQueryClient();
   return useMutation({
      mutationFn: (status: MatchStatus) => apiPatch(`/matches/${vacancyId}`, { status }),
      // the vacancy moves to another tab: every list may have changed, and its own page
      onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.matches.all }),
   });
}
