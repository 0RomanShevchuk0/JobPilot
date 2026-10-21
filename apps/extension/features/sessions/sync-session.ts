import { browserSites, type BrowserSite } from "@jobpilot/sources/page";
import { browser } from "wxt/browser";
import { sendSession, type SendResult } from "./send-session.js";

/** Fires while a session didn't reach the API (not running, mostly), to send it again. */
export const RESEND_ALARM = "resend-sessions";
/** Only the delay after the API starts depends on it: the server's worker doesn't need it sooner. */
export const RESEND_EVERY_MINUTES = 5;

/** How the last sending of a site's session went, kept for the popup to show. */
export type LastSync = SendResult & {
   /** when, ms since the epoch */
   at: number;
};

// one key per site, so two sites sent at once don't overwrite each other's. In storage.local: the
// background is stopped when idle and forgets everything else
const unsentKey = (site: BrowserSite) => `unsent:${site.source}`;
const lastSyncKey = (site: BrowserSite) => `last-sync:${site.source}`;

/**
 * Sends the session; one that failed to is sent again every RESEND_EVERY_MINUTES until it goes through,
 * with the site's cookies as they are then. One the user logged out of meanwhile has nothing left to send.
 */
export async function syncSession(site: BrowserSite): Promise<void> {
   const result = await sendSession(site);
   const lastSync: LastSync = { ...result, at: Date.now() };
   await browser.storage.local.set({ [lastSyncKey(site)]: lastSync });
   if (result.status === "failed") {
      await browser.storage.local.set({ [unsentKey(site)]: true });
      await browser.alarms.create(RESEND_ALARM, { periodInMinutes: RESEND_EVERY_MINUTES });
   } else {
      await browser.storage.local.remove(unsentKey(site));
   }
}

/** What the popup asks the background for: send every site's session now. */
export const SYNC_ALL_MESSAGE = "sync-all-sessions";

export async function syncAllSessions(): Promise<void> {
   await Promise.all(browserSites.map(syncSession));
}

/** The sessions that didn't go through, sent again; the alarm stops once none are left. */
export async function resendUnsent(): Promise<void> {
   const marks = await browser.storage.local.get(browserSites.map(unsentKey));
   const unsent = browserSites.filter((site) => marks[unsentKey(site)]);
   if (!unsent.length) {
      await browser.alarms.clear(RESEND_ALARM);
      return;
   }
   await Promise.all(unsent.map(syncSession));
}

/** Each site's last sending in browserSites order; undefined for a site never sent yet. */
export async function readLastSyncs(): Promise<(LastSync | undefined)[]> {
   const stored = await browser.storage.local.get(browserSites.map(lastSyncKey));
   return browserSites.map((site) => stored[lastSyncKey(site)] as LastSync | undefined);
}
