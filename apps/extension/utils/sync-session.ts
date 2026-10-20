import { browser } from "wxt/browser";
import { sendSession, type SendResult } from "./send-session.js";
import { SITES, type Site } from "./sites.js";

/** Fires while a session didn't reach the API (not running, mostly), to send it again. */
export const RESEND_ALARM = "resend-sessions";

// one key per site, so two sites sent at once don't overwrite each other's mark. In storage.local: the
// background is stopped when idle and forgets everything else
const unsentKey = (site: Site) => `unsent:${site.source}`;

/**
 * Sends the session; one that failed to is sent again every 5 minutes until it goes through, with the
 * site's cookies as they are then. One the user logged out of meanwhile has nothing left to send.
 * Only the delay after the API starts depends on the period: the server's worker doesn't need it sooner.
 */
export async function syncSession(site: Site): Promise<SendResult> {
   const result = await sendSession(site);
   if (result.status === "failed") {
      await browser.storage.local.set({ [unsentKey(site)]: true });
      await browser.alarms.create(RESEND_ALARM, { periodInMinutes: 5 });
   } else {
      await browser.storage.local.remove(unsentKey(site));
   }
   return result;
}

/** The sessions that didn't go through, sent again; the alarm stops once none are left. */
export async function resendUnsent(): Promise<void> {
   const marks = await browser.storage.local.get(SITES.map(unsentKey));
   const unsent = SITES.filter((site) => marks[unsentKey(site)]);
   if (!unsent.length) {
      await browser.alarms.clear(RESEND_ALARM);
      return;
   }
   await Promise.all(unsent.map(syncSession));
}
