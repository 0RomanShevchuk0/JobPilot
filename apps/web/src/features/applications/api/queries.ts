import type {
   ApplicationListPage,
   ApplicationListTab,
   ApplicationOrigin,
   ApplicationView,
} from "@jobpilot/contracts";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiGet, apiPatch, apiPost } from "../../../shared/api/client";
import { queryKeys } from "../../../shared/api/queryKeys";
import { fillInExtension, isExtensionInstalled } from "../../../shared/extension/client";

// how often to check on the worker: answering takes seconds, sending is up to the user
const PREPARING_POLL_MS = 3000;
const FILLING_POLL_MS = 5000;

/** Which applications a list shows: its tab, narrowed by a search and filters. */
export interface ApplicationListFilter {
   tab: ApplicationListTab;
   /** text in the vacancy's title or its company's name; "" = every one */
   q: string;
   /** the job site's id; null = every site */
   source: string | null;
   /** null = sent either way */
   origin: ApplicationOrigin | null;
}

/** An answer I changed, by the form field's name. */
export interface AnswerChange {
   name: string;
   value: string;
}

/**
 * My applications in one of the lists, a page at a time: in progress the latest activity first, sent
 * the latest sent first. A refetch reloads every page loaded, from the first.
 */
export function useApplications(filter: ApplicationListFilter) {
   return useInfiniteQuery({
      queryKey: queryKeys.applications.list(filter),
      queryFn: ({ pageParam }) => {
         const query = new URLSearchParams({ tab: filter.tab });
         if (filter.q) query.set("q", filter.q);
         if (filter.source) query.set("source", filter.source);
         if (filter.origin) query.set("origin", filter.origin);
         if (pageParam) query.set("after", pageParam);
         return apiGet<ApplicationListPage>(`/applications?${query}`);
      },
      initialPageParam: null as string | null,
      getNextPageParam: (page) => page.nextCursor, // null: no next page
      // the list stays while a new search loads: no loader blinking in its place as I type. Not
      // across tabs: the other tab's rows would show, with its buttons
      placeholderData: (previous, previousQuery) =>
         previousQuery?.queryKey[2].tab === filter.tab ? previous : undefined,
   });
}

/** One application, polled while the worker answers it or the form is open in a browser. */
export function useApplication(id: string) {
   return useQuery({
      queryKey: queryKeys.applications.details(id),
      queryFn: () => apiGet<ApplicationView>(`/applications/${id}`),
      refetchInterval: (query) => {
         const app = query.state.data;
         if (app?.status === "preparing" && app.preparationRunning) return PREPARING_POLL_MS;
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

/**
 * Whether the JobPilot extension is installed and on in this browser: without it (a phone, another
 * browser) an application can't be opened here to send. Asked once a page load: installing it means a
 * reload anyway.
 */
export function useExtensionInstalled() {
   return useQuery({
      queryKey: queryKeys.extension.installed,
      queryFn: isExtensionInstalled,
      staleTime: Infinity,
   });
}

/**
 * Opens the job page in a tab of this browser, the form filled in there by the extension, for me to
 * send; my unsaved changes are saved first.
 */
export function useFillApplication(id: string) {
   const refresh = useRefreshApplications();
   return useMutation({
      mutationFn: async (changes: AnswerChange[]) => {
         if (!(await isExtensionInstalled())) {
            throw new Error(
               "Install the JobPilot extension (README, Extension) to fill the form in in this browser",
            );
         }
         if (changes.length > 0) await apiPatch(`/applications/${id}/fields`, { values: changes });
         const answer = await fillInExtension(id);
         if (!answer) throw new Error("The JobPilot extension didn't answer: is it on?");
         if (!answer.ok) throw new Error(answer.reason);
      },
      onSuccess: refresh,
   });
}

/**
 * I applied through the posting myself (on the employer's site it sends to, or on the job site): it
 * is marked sent. A vacancy applied to on all its job sites leaves the new ones.
 */
export function useMarkSentByHand() {
   const refresh = useRefreshApplications();
   return useMutation({
      mutationFn: (postingId: string) =>
         apiPost<{ id: string }>("/applications/sent-by-hand", { postingId }),
      onSuccess: refresh,
   });
}

/**
 * Takes back marking an application sent by hand: the posting is to apply through again, with
 * JobPilot's answers when it had them.
 */
export function useUnmarkSentByHand() {
   const refresh = useRefreshApplications();
   return useMutation({
      mutationFn: (applicationId: string) =>
         apiDelete(`/applications/${applicationId}/sent-by-hand`),
      onSuccess: refresh,
   });
}

/** Removes an application in progress, its answers with it: the posting is to apply through again. */
export function useDeleteApplication() {
   const refresh = useRefreshApplications();
   return useMutation({
      mutationFn: (applicationId: string) => apiDelete(`/applications/${applicationId}`),
      onSuccess: refresh,
   });
}
