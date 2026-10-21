import { browserSites } from "@jobpilot/sources/page";
import { browser } from "wxt/browser";
import { isSiteCookie } from "./read-session.js";
import {
   RESEND_ALARM,
   resendUnsent,
   SYNC_ALL_MESSAGE,
   syncAllSessions,
   syncSession,
} from "./sync-session.js";

/** The user's sessions on the job sites go to the API by themselves: on a login, and retried. */
export function registerSessionSync(): void {
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
}
