import { JOB_PAGE_TEXT_MAX_LENGTH, type AddJobPage } from "@jobpilot/contracts";
import { browser } from "wxt/browser";
import { directJobUrl } from "./job-page.js";

/**
 * The job page open in the current tab, which the popup may read while it is open (activeTab): the
 * job's own link, the tab's title and the page's visible text, as much as the API takes. Undefined when
 * the tab can't be read: Chrome's own pages, the extension store, a page still loading.
 */
export async function readOpenJobPage(): Promise<AddJobPage | undefined> {
   const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
   if (tab?.id === undefined || !tab.url?.startsWith("http")) return undefined;
   let page: AddJobPage | undefined;
   try {
      const [result] = await browser.scripting.executeScript({
         target: { tabId: tab.id },
         func: readVisiblePage,
         args: [JOB_PAGE_TEXT_MAX_LENGTH],
      });
      page = result?.result as AddJobPage | undefined;
   } catch {
      return undefined; // a page the extension isn't let into
   }
   return page && { ...page, url: directJobUrl(page.url) };
}

/** Runs in the page itself: everything it uses is in here or passed in. */
function readVisiblePage(maxTextLength: number): AddJobPage {
   return {
      url: location.href,
      title: document.title.slice(0, 1000),
      text: (document.body?.innerText ?? "").slice(0, maxTextLength),
   };
}
