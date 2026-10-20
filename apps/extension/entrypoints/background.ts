import { browser } from "wxt/browser";
import { defineBackground } from "wxt/utils/define-background";
import { sendSession } from "../utils/send-session.js";
import { isSiteCookie, SITES } from "../utils/sites.js";

export default defineBackground(() => {
   // installed, updated or reloaded: a user logged in long before has a session that won't change soon
   browser.runtime.onInstalled.addListener(async () => {
      await Promise.all(SITES.map(sendSession));
   });

   // logged in again, or the site renewed the login: the server's worker gets the new one.
   // A removed login cookie (logged out, expired) is not sent: the worker finds that out by itself, and
   // saving a session clears its "expired" mark. An overwrite comes as a removal, then the new cookie
   browser.cookies.onChanged.addListener(async ({ cookie, removed }) => {
      if (removed) return;
      const site = SITES.find((s) => s.loginCookie === cookie.name && isSiteCookie(s, cookie.domain));
      if (site) await sendSession(site);
   });
});
