import type { FormToFill } from "@jobpilot/contracts";
import { browser } from "wxt/browser";

/** A tab the extension opened to fill an application in. */
export interface ApplicationTab {
   applicationId: string;
   form: FormToFill;
   /**
    * opening: the job page is loading, nothing filled in yet; waiting: filled in, the user sends it;
    * sent: the site got the form, its answer page is loading, to tell whether it took it
    */
   phase: "opening" | "waiting" | "sent";
}

// in storage.session: the background is stopped when idle and forgets everything else, and the tabs
// are gone with the browser anyway. One key per tab, so two tabs don't overwrite each other's
const KEY_PREFIX = "application-tab:";
const tabKey = (tabId: number) => `${KEY_PREFIX}${tabId}`;

/** The tabs open for applications, by the tab's id. */
export const applicationTabs = {
   async get(tabId: number): Promise<ApplicationTab | undefined> {
      const stored = await browser.storage.session.get(tabKey(tabId));
      return stored[tabKey(tabId)] as ApplicationTab | undefined;
   },

   async save(tabId: number, tab: ApplicationTab): Promise<void> {
      await browser.storage.session.set({ [tabKey(tabId)]: tab });
   },

   async forget(tabId: number): Promise<void> {
      await browser.storage.session.remove(tabKey(tabId));
   },

   /** Every tab open for an application, with its id. */
   async list(): Promise<{ tabId: number; tab: ApplicationTab }[]> {
      const stored = await browser.storage.session.get(null);
      return Object.entries(stored)
         .filter(([key]) => key.startsWith(KEY_PREFIX))
         .map(([key, tab]) => ({
            tabId: Number(key.slice(KEY_PREFIX.length)),
            tab: tab as ApplicationTab,
         }));
   },

   /** The tab an application is being filled in, if one is open for it. */
   async findTabId(applicationId: string): Promise<number | undefined> {
      const tabs = await applicationTabs.list();
      return tabs.find(({ tab }) => tab.applicationId === applicationId)?.tabId;
   },
};
