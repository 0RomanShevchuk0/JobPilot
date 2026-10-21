import { EXTENSION_PING, isExtensionFillCommand } from "@jobpilot/contracts";
import { browser } from "wxt/browser";
import { jobSiteHosts, jobSitePages } from "../../shared/job-sites.js";
import {
   fillOrConfirmApplicationTab,
   openApplicationTab,
   reportClosedApplicationTab,
   trackFormSubmission,
} from "./filling.js";

/** Applications filled in on their job pages, from the web's command to the site taking the form. */
export function registerApplicationFilling(): void {
   // the web app: "ping" says the extension is there; a fill command opens the application's job page,
   // and the answer says whether it did. `true`: the answer comes after the API is asked
   browser.runtime.onMessageExternal.addListener((message, _sender, sendResponse) => {
      if (message === EXTENSION_PING) {
         sendResponse({ ok: true });
         return;
      }
      if (!isExtensionFillCommand(message)) return;
      openApplicationTab(message.fill).then(sendResponse);
      return true;
   });

   // a job site's page has loaded: in a tab opened for an application, its form gets filled in, or the
   // site's answer to the sent form is checked. Only the job sites' pages wake the extension up, not
   // every page the browser loads
   browser.webNavigation.onCompleted.addListener(
      ({ tabId, frameId }) => {
         if (frameId === 0) void fillOrConfirmApplicationTab(tabId); // the page, not one of its frames
      },
      { url: jobSiteHosts.map((hostEquals) => ({ hostEquals })) },
   );

   // a job site answered a request of a page or its scripts: in an application's tab, it may be the form
   // being sent. Headers, not completion: a post the site answers with a redirect never completes itself
   browser.webRequest.onHeadersReceived.addListener(
      ({ tabId, method, url, statusCode }) => {
         void trackFormSubmission({ tabId, method, url, statusCode });
      },
      { urls: jobSitePages, types: ["main_frame", "xmlhttprequest"] },
   );

   // a tab closed: an application's, before the form was sent, ends with nothing sent
   browser.tabs.onRemoved.addListener((tabId) => void reportClosedApplicationTab(tabId));
}
