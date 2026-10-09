import type { ApplicationListItem, ApplicationView } from "@jobpilot/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPatch, apiPost } from "../../../shared/api/client";
import { queryKeys } from "../../../shared/api/queryKeys";

// how often to check on the worker: answering takes seconds, sending is up to the user
const PREPARING_POLL_MS = 3000;
const FILLING_POLL_MS = 5000;

/** An answer I changed, by the form field's name. */
export interface AnswerChange {
   name: string;
   value: string;
}

/** My applications, the latest activity first. */
export function useApplications() {
   return useQuery({
      queryKey: queryKeys.applications.list(),
      queryFn: () => apiGet<ApplicationListItem[]>("/applications"),
   });
}

/** One application, polled while the worker answers it or the form is open in a browser. */
export function useApplication(id: string) {
   return useQuery({
      queryKey: queryKeys.applications.details(id),
      queryFn: () => apiGet<ApplicationView>(`/applications/${id}`),
      refetchInterval: (query) => {
         const app = query.state.data;
         if (app?.status === "preparing") return PREPARING_POLL_MS;
         // the window is open: watch for the user sending the form or closing it
         if (app?.filling) return FILLING_POLL_MS;
         return false;
      },
   });
}

/**
 * Refreshes what an application's change shows in: the application, the list, and the vacancy's card
 * and page in Matches.
 */
function useRefreshApplications() {
   const queryClient = useQueryClient();
   return () =>
      Promise.all([
         queryClient.invalidateQueries({ queryKey: queryKeys.applications.all }),
         queryClient.invalidateQueries({ queryKey: queryKeys.matches.all }),
      ]);
}

/**
 * Starts preparing an application through one of the vacancy's postings, or prepares it again: the
 * worker reads the form and answers it. Resolves to the application's id.
 */
export function useStartApplication() {
   const refresh = useRefreshApplications();
   return useMutation({
      mutationFn: (postingId: string) => apiPost<{ id: string }>("/applications", { postingId }),
      onSuccess: refresh,
   });
}

/** Saves my own answers in place of the proposed ones. */
export function useSaveAnswers(id: string) {
   const refresh = useRefreshApplications();
   return useMutation({
      mutationFn: (changes: AnswerChange[]) =>
         apiPatch(`/applications/${id}/fields`, { values: changes }),
      onSuccess: refresh,
   });
}

/** Opens the form in a browser on this machine, filled in; my unsaved changes are saved first. */
export function useFillApplication(id: string) {
   const refresh = useRefreshApplications();
   return useMutation({
      mutationFn: async (changes: AnswerChange[]) => {
         if (changes.length > 0) await apiPatch(`/applications/${id}/fields`, { values: changes });
         await apiPost(`/applications/${id}/fill`);
      },
      onSuccess: refresh,
   });
}
