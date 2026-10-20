import { browser } from "wxt/browser";
import { defineBackground } from "wxt/utils/define-background";
import { isSiteCookie, SITES } from "../utils/sites.js";
import { RESEND_ALARM, resendUnsent, syncSession } from "../utils/sync-session.js";

export default defineBackground(() => {
   // installed, updated or reloaded: a user logged in long before has a session that won't change soon
   browser.runtime.onInstalled.addListener(async () => {
      await Promise.all(SITES.map(syncSession));
   });

   // logged in again, or the site renewed the login: the server's worker gets the new one.
   // A removed login cookie (logged out, expired) is not sent: the worker finds that out by itself, and
   // saving a session clears its "expired" mark. An overwrite comes as a removal, then the new cookie
   browser.cookies.onChanged.addListener(async ({ cookie, removed }) => {
      if (removed) return;
      const site = SITES.find((s) => s.loginCookie === cookie.name && isSiteCookie(s, cookie.domain));
      if (site) await syncSession(site);
   });

   browser.alarms.onAlarm.addListener(async (alarm) => {
      if (alarm.name === RESEND_ALARM) await resendUnsent();
   });

   // Chrome may drop alarms when it restarts, the unsent marks in storage stay: picked up again here
   browser.runtime.onStartup.addListener(resendUnsent);
});
