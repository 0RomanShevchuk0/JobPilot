import type { AddedJobPage, AddJobPage } from "@jobpilot/contracts";
import { browser } from "wxt/browser";
import { WEB_URL } from "../../shared/api.js";
import { isAddJobPageMessage } from "./add-job-page-message.js";
import { trackerApi } from "./api.js";

/**
 * The popup's Add this job to the tracker, done here: the popup closes when the tracker's tab opens,
 * and closing it would cut the request off. The row added, or the one already there, opens in the
 * tracker; with none (no job found on the page, the API refused) the tracker's Add form opens with the
 * link, to fill in by hand.
 */
export function registerTrackerAdding(): void {
   browser.runtime.onMessage.addListener((message: unknown) => {
      if (!isAddJobPageMessage(message)) return;
      void addJobPageAndOpenTracker(message.page);
   });
}

async function addJobPageAndOpenTracker(page: AddJobPage): Promise<void> {
   let added: AddedJobPage;
   try {
      added = await trackerApi.addFromPage(page);
   } catch (err) {
      // not signed in, the server down: the form still saves typing the link
      console.error("adding the job page to the tracker failed", err);
      added = { outcome: "not_a_job" };
   }
   const query =
      added.outcome === "not_a_job"
         ? new URLSearchParams({ add: "", url: page.url })
         : new URLSearchParams({ attempt: added.attemptId });
   await browser.tabs.create({ url: `${WEB_URL}/tracker?${query}` });
}
