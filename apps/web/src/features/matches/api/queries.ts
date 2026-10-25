import type { MatchDetails, MatchListPage, MatchStatus } from "@jobpilot/contracts";
import {
   type InfiniteData,
   useInfiniteQuery,
   useMutation,
   useQuery,
   useQueryClient,
} from "@tanstack/react-query";
import { apiGet, apiPatch } from "../../../shared/api/client";
import { queryKeys } from "../../../shared/api/queryKeys";

/** The lists in Matches: what to decide on, and what I hid. The applied ones are on Applications. */
export type MatchesTab = "new" | "hidden";

/**
 * Vacancies evaluated for my current profile, a page at a time: the new ones best first, the hidden
 * ones the latest hidden first. A refetch reloads every page loaded, from the first.
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

/** Hides a vacancy; null shows it again. Applying is per job site: useMarkSentByHand. */
export function useMarkMatch(vacancyId: string) {
   const queryClient = useQueryClient();
   return useMutation({
      mutationFn: (status: MatchStatus) => apiPatch(`/matches/${vacancyId}`, { status }),
      onSuccess: () => {
         // the vacancy leaves the list it was in: taken out of the loaded pages, not every page
         // reloaded. A next page still starts after it: the API reads where it stands from the table
         queryClient.setQueriesData<InfiniteData<MatchListPage>>(
            { queryKey: queryKeys.matches.lists },
            (data) => data && withoutVacancy(data, vacancyId),
         );
         // the list it moves to isn't shown now: it loads anew when opened
         void queryClient.invalidateQueries({
            queryKey: queryKeys.matches.lists,
            type: "inactive",
         });
         void queryClient.invalidateQueries({ queryKey: queryKeys.matches.details(vacancyId) });
      },
   });
}

/** The loaded pages of a list without the vacancy. */
function withoutVacancy(
   data: InfiniteData<MatchListPage>,
   vacancyId: string,
): InfiniteData<MatchListPage> {
   const pages = data.pages.map((page) => ({
      ...page,
      items: page.items.filter((match) => match.vacancyId !== vacancyId),
   }));
   return { ...data, pages };
}
