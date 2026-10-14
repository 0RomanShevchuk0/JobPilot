import type { MatchDetails, MatchListPage, MatchStatus } from "@jobpilot/contracts";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPatch } from "../../../shared/api/client";
import { queryKeys } from "../../../shared/api/queryKeys";

export type MatchesTab = "new" | "applied" | "hidden";

/**
 * Vacancies evaluated for my current profile, best first, a page at a time: new ones, or the ones I
 * marked. A refetch reloads every page loaded, from the first.
 */
export function useMatches(tab: MatchesTab, includeSkipped: boolean) {
   // skipped ones are only among the new
   const withSkipped = tab === "new" && includeSkipped;
   return useInfiniteQuery({
      queryKey: queryKeys.matches.list({ status: tab, includeSkipped: withSkipped }),
      queryFn: ({ pageParam }) => {
         const query = new URLSearchParams({ status: tab });
         if (withSkipped) query.set("include", "skipped");
         if (pageParam) query.set("after", pageParam);
         return apiGet<MatchListPage>(`/matches?${query}`);
      },
      initialPageParam: null as string | null,
      getNextPageParam: (page) => page.nextCursor, // null: no next page
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
