import type { JobAttemptChanges, JobAttemptListPage } from "@jobpilot/contracts";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPatch } from "../../../shared/api/client";
import { queryKeys } from "../../../shared/api/queryKeys";

/** My tracker a page at a time, the latest applied first. A refetch reloads every page loaded. */
export function useJobAttempts() {
   return useInfiniteQuery({
      queryKey: queryKeys.jobAttempts.all,
      queryFn: ({ pageParam }) => {
         const query = pageParam ? `?${new URLSearchParams({ after: pageParam })}` : "";
         return apiGet<JobAttemptListPage>(`/job-attempts${query}`);
      },
      initialPageParam: null as string | null,
      getNextPageParam: (page) => page.nextCursor, // null: no next page
   });
}

/** Changes a row's stage, status or notes. Under way until the list shows the change. */
export function useUpdateJobAttempt(attemptId: string) {
   const queryClient = useQueryClient();
   return useMutation({
      mutationFn: (changes: JobAttemptChanges) => apiPatch(`/job-attempts/${attemptId}`, changes),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.jobAttempts.all }),
   });
}
