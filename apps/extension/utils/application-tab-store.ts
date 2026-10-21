import type { FormToFill } from "@jobpilot/contracts";
import { browser } from "wxt/browser";

/** A tab the extension opened to fill an application in. */
export interface ApplicationTab {
   applicationId: string;
   form: FormToFill;
   /** opening: the job page is loading, nothing filled in yet; waiting: filled in, the user sends it */
   phase: "opening" | "waiting";
}

// in storage.session: the background is stopped when idle and forgets everything else, and the tabs
// are gone with the browser anyway. One key per tab, so two tabs don't overwrite each other's
const KEY_PREFIX = "application-tab:";
const tabKey = (tabId: number) => `${KEY_PREFIX}${tabId}`;

export async function getApplicationTab(tabId: number): Promise<ApplicationTab | undefined> {
   const stored = await browser.storage.session.get(tabKey(tabId));
   return stored[tabKey(tabId)] as ApplicationTab | undefined;
}

export async function saveApplicationTab(tabId: number, tab: ApplicationTab): Promise<void> {
   await browser.storage.session.set({ [tabKey(tabId)]: tab });
}

export async function forgetApplicationTab(tabId: number): Promise<void> {
   await browser.storage.session.remove(tabKey(tabId));
}

/** The tab an application is being filled in, if one is open for it. */
export async function findApplicationTabId(applicationId: string): Promise<number | undefined> {
   const stored = await browser.storage.session.get(null);
   for (const [key, tab] of Object.entries(stored)) {
      if (key.startsWith(KEY_PREFIX) && (tab as ApplicationTab).applicationId === applicationId) {
         return Number(key.slice(KEY_PREFIX.length));
      }
   }
   return undefined;
}
