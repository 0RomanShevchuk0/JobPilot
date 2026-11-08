import { jobAttemptStages, jobAttemptStatuses } from "@jobpilot/contracts";
import type { JobAttemptListFilter } from "../api/queries";

/** What the panel shows: a row, or the form to add one. */
export type TrackerPanel = { attempt: string } | "add";

/**
 * The tracker's address: the filter (?q=acme&stage=hr&status=active) and the panel open over the list
 * (?attempt=… or ?add). Each changes without the other: opening a row keeps the list as it's filtered.
 */
export const trackerAddress = {
   /** The filter in the address; a stage or status it doesn't know is every one. */
   readFilter(params: URLSearchParams): JobAttemptListFilter {
      return {
         q: params.get("q") ?? "",
         stage: jobAttemptStages.find((s) => s === params.get("stage")) ?? null,
         status: jobAttemptStatuses.find((s) => s === params.get("status")) ?? null,
      };
   },

   /** The address's query with another filter; the panel stays. */
   withFilter(params: URLSearchParams, filter: JobAttemptListFilter): URLSearchParams {
      const next = new URLSearchParams(params);
      setOrDelete(next, "q", filter.q);
      setOrDelete(next, "stage", filter.stage);
      setOrDelete(next, "status", filter.status);
      return next;
   },

   /**
    * The tracker searched for q, with a row open: the rows around it are the ones like it. "" =
    * unsearched.
    */
   attemptHref(attemptId: string, q: string): string {
      const filter = trackerAddress.withFilter(new URLSearchParams(), {
         q,
         stage: null,
         status: null,
      });
      return `/tracker${trackerAddress.withPanel(filter, { attempt: attemptId })}`;
   },

   /** The tracker searched for q. */
   searchHref(q: string): string {
      const filter = trackerAddress.withFilter(new URLSearchParams(), {
         q,
         stage: null,
         status: null,
      });
      return `/tracker?${filter}`;
   },

   /** The address's query with another panel, or none; the filter stays. */
   withPanel(params: URLSearchParams, panel: TrackerPanel | null): string {
      const next = new URLSearchParams(params);
      next.delete("attempt");
      next.delete("add");
      if (panel === "add") next.set("add", "");
      else if (panel) next.set("attempt", panel.attempt);
      return `?${next}`;
   },
};

// an empty value leaves the address: ?q= would be noise
function setOrDelete(params: URLSearchParams, name: string, value: string | null) {
   if (value) params.set(name, value);
   else params.delete(name);
}
