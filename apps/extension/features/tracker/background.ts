import type { AddedJobPage, AddJobPage } from "@jobpilot/contracts";
import { browser } from "wxt/browser";
import { isAddJobPageMessage } from "./add-job-page-message.js";
import { trackerApi } from "./api.js";

/** What adding a page came to, as the popup shows it: the API's answer, or the request failing. */
export type JobPageAdding = AddedJobPage | { outcome: "failed" };

/**
 * The popup's Add this job to the tracker, done here: closing the popup would cut the request off.
 * The answer goes back to the popup, which says what happened; nothing opens by itself. `true` keeps
 * the channel open for the answer, it comes after the request.
 */
export function registerTrackerAdding(): void {
   browser.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
      if (!isAddJobPageMessage(message)) return;
      addJobPage(message.page).then(sendResponse);
      return true;
   });
}

/** Adds the page's job to the tracker; "failed" when the request does (not signed in, the server down). */
async function addJobPage(page: AddJobPage): Promise<JobPageAdding> {
   try {
      return await trackerApi.addFromPage(page);
   } catch (err) {
      console.error("adding the job page to the tracker failed", err);
      return { outcome: "failed" };
   }
}
