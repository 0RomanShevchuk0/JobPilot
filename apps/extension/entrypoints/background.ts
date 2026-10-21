import { EXTENSION_PING, isExtensionFillCommand } from "@jobpilot/contracts";
import { browserSites } from "@jobpilot/sources/page";
import { browser } from "wxt/browser";
import { defineBackground } from "wxt/utils/define-background";
import {
   fillOrConfirmApplicationTab,
   openApplicationTab,
   reportClosedApplicationTab,
   trackFormSubmission,
} from "../utils/application-filling.js";
import { jobSiteHosts, jobSitePages } from "../utils/job-sites.js";
import { isSiteCookie } from "../utils/site-session.js";
import {
   RESEND_ALARM,
   resendUnsent,
   SYNC_ALL_MESSAGE,
   syncAllSessions,
   syncSession,
} from "../utils/sync-session.js";

export default defineBackground(() => {
   // installed, updated or reloaded: a user logged in long before has a session that won't change soon
   browser.runtime.onInstalled.addListener(async () => {
      await syncAllSessions();
   });

   // logged in again, or the site renewed the login: the server's worker gets the new one.
   // A removed login cookie (logged out, expired) is not sent: the worker finds that out by itself, and
   // saving a session clears its "expired" mark. An overwrite comes as a removal, then the new cookie
   browser.cookies.onChanged.addListener(async ({ cookie, removed }) => {
      if (removed) return;
      const site = browserSites.find(
         (s) => s.loginCookie === cookie.name && isSiteCookie(s, cookie.domain),
      );
      if (site) await syncSession(site);
   });

   browser.alarms.onAlarm.addListener(async (alarm) => {
      if (alarm.name === RESEND_ALARM) await resendUnsent();
   });

   // Chrome may drop alarms when it restarts, the unsent marks in storage stay: picked up again here
   browser.runtime.onStartup.addListener(resendUnsent);

   // the popup's button. Sent from here, not the popup: closing the popup would cut the requests off.
   // The answer only says it's done, the popup reads the results from storage; `true` keeps the
   // channel open for it, it comes after the requests
   browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message !== SYNC_ALL_MESSAGE) return;
      syncAllSessions().then(() => sendResponse());
      return true;
   });

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
});
