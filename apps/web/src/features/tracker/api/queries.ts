import type {
   JobAttemptChanges,
   JobAttemptListPage,
   JobAttemptStage,
   JobAttemptStatus,
   NewJobAttempt,
} from "@jobpilot/contracts";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiGet, apiPatch, apiPost } from "../../../shared/api/client";
import { queryKeys } from "../../../shared/api/queryKeys";
import { useProfile } from "../../profile";
import { defaultRequestedSalaryUnits, type RequestedSalaryUnits } from "../lib/requested-salary";

export interface JobAttemptListFilter {
   /** text in the job's title or its company's name; "" = every row */
   q: string;
   /** null = every stage */
   stage: JobAttemptStage | null;
   /** null = every status */
   status: JobAttemptStatus | null;
}

/**
 * My tracker a page at a time, the latest applied first, only the rows matching the filter. A refetch
 * reloads every page loaded.
 */
export function useJobAttempts(filter: JobAttemptListFilter) {
   return useInfiniteQuery({
      queryKey: queryKeys.jobAttempts.list(filter),
      queryFn: ({ pageParam }) => {
         const query = new URLSearchParams();
         if (filter.q) query.set("q", filter.q);
         if (filter.stage) query.set("stage", filter.stage);
         if (filter.status) query.set("status", filter.status);
         if (pageParam) query.set("after", pageParam);
         return apiGet<JobAttemptListPage>(`/job-attempts?${query}`);
      },
      initialPageParam: null as string | null,
      getNextPageParam: (page) => page.nextCursor, // null: no next page
      // the list stays while a new search loads: no loader blinking in its place as I type
      placeholderData: (previous) => previous,
   });
}

/** Adds a job JobPilot doesn't know about. onCreated runs once the list has it. */
export function useCreateJobAttempt(onCreated: () => void) {
   const queryClient = useQueryClient();
   return useMutation({
      mutationFn: (attempt: NewJobAttempt) => apiPost<{ id: string }>("/job-attempts", attempt),
      onSuccess: async () => {
         await queryClient.invalidateQueries({ queryKey: queryKeys.jobAttempts.all });
         onCreated();
      },
   });
}

/** Changes a row: any of its fields. Under way until the list shows the change. */
export function useUpdateJobAttempt(attemptId: string) {
   const queryClient = useQueryClient();
   return useMutation({
      mutationFn: (changes: JobAttemptChanges) => apiPatch(`/job-attempts/${attemptId}`, changes),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.jobAttempts.all }),
   });
}

/**
 * Removes a row; its applications stay sent. onDeleted runs before the list reloads: whoever shows the
 * row is gone with it by then, and couldn't close anymore.
 */
export function useDeleteJobAttempt(onDeleted: () => void) {
   const queryClient = useQueryClient();
   return useMutation({
      mutationFn: (attemptId: string) => apiDelete(`/job-attempts/${attemptId}`),
      onSuccess: () => {
         onDeleted();
         return queryClient.invalidateQueries({ queryKey: queryKeys.jobAttempts.all });
      },
   });
}

/**
 * What a requested salary is picked in when a row has none: the profile's currency and period, USD
 * a month without them. Undefined while the profile loads: a form's fields take their first values
 * only.
 */
export function useRequestedSalaryUnits(): RequestedSalaryUnits | undefined {
   const profile = useProfile();
   if (profile.isPending) return undefined;
   const salary = profile.data?.profile.salary;
   return salary
      ? { currency: salary.currency, period: salary.period }
      : defaultRequestedSalaryUnits;
}
