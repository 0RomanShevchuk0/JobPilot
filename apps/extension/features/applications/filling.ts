import type { ExtensionAnswer, FillReport, FormToFill } from "@jobpilot/contracts";
import { browser } from "wxt/browser";
import { applicationsApi } from "./api.js";
import { pageInTab } from "./in-tab.js";
import { findSitePage, type PageNotice } from "./page-calls.js";
import { applicationTabs, type ApplicationTab } from "./tab-store.js";

/*
 * An application filled in on its job page in the user's own browser: the tab opened for it, the form
 * filled in there, the user sending it, the site taking it. Nothing is ever sent but by the user.
 */

/** A response the browser got for a page, as webRequest tells of it. */
export interface PageResponse {
   tabId: number;
   method: string;
   url: string;
   statusCode: number;
}

/**
 * The web's "fill application X": its job page opens in a new tab, where the form is filled in once
 * the page has loaded. A tab already open for it is brought forward instead of a second one.
 */
export async function openApplicationTab(applicationId: string): Promise<ExtensionAnswer> {
   if (await focusApplicationTab(applicationId)) return { ok: true };
   let form: FormToFill;
   try {
      form = await applicationsApi.claimFormToFill(applicationId);
   } catch (err) {
      return { ok: false, reason: (err as Error).message };
   }
   const tab = await browser.tabs.create({ url: form.jobUrl, active: true });
   await applicationTabs.save(tab.id!, { applicationId, form, phase: "opening" });
   return { ok: true };
}

/** Brings an application's open tab forward; false when there is none (it was closed). */
export async function focusApplicationTab(applicationId: string): Promise<boolean> {
   const tabId = await applicationTabs.findTabId(applicationId);
   if (tabId === undefined) return false;
   const tab = await browser.tabs.get(tabId).catch(() => undefined);
   if (!tab) {
      await applicationTabs.forget(tabId);
      return false;
   }
   await browser.tabs.update(tabId, { active: true });
   await browser.windows.update(tab.windowId, { focused: true });
   return true;
}

/**
 * A job site's page has loaded in a tab: in an application's tab, the job page gets its form filled
 * in; after the form was sent, the page the site answered with tells whether it took it.
 */
export async function fillOrConfirmApplicationTab(tabId: number): Promise<void> {
   const tab = await applicationTabs.get(tabId);
   if (!tab) return; // not a tab opened for an application
   switch (tab.phase) {
      case "opening":
         return fillApplicationTab(tabId, tab);
      case "sent":
         return confirmSubmission(tabId, tab);
      case "waiting":
         return; // the page reloaded while the form waits for the user
   }
}

/**
 * A response in an application's tab: the form being sent, when it is the site's form post. A post
 * the site refused ends the filling; one that went through waits for the answer page (sites answer a
 * rejected form with the form again, with a status below 400 all the same). Both sites post the form
 * natively, so their answer is a page load.
 */
export async function trackFormSubmission({
   tabId,
   method,
   url,
   statusCode,
}: PageResponse): Promise<void> {
   if (method !== "POST") return;
   const tab = await applicationTabs.get(tabId);
   if (tab?.phase !== "waiting") return; // not a form waiting to be sent
   if (!findSitePage(tab.form.source)?.isFormSubmission(url, tab.form.jobUrl)) return;
   if (statusCode >= 400) {
      const reason = `The site answered ${statusCode} to the application`;
      await endApplicationTab(tabId, tab, { status: "failed", reason });
      return;
   }
   await applicationTabs.save(tabId, { ...tab, phase: "sent" });
}

/**
 * The user closed a tab: an application's one closed before the form was sent ends with nothing sent.
 * One closed while the site's answer was loading counts as sent: the post went through, it is all
 * there is to go by.
 */
export async function reportClosedApplicationTab(tabId: number): Promise<void> {
   const tab = await applicationTabs.get(tabId);
   if (!tab) return;
   const report: FillReport =
      tab.phase === "sent" ? { status: "submitted" } : { status: "cancelled" };
   await endApplicationTab(tabId, tab, report);
}

/**
 * The job page has loaded: the form gets filled in; a problem ends the filling with its reason. The
 * user is told on the page either way.
 */
async function fillApplicationTab(tabId: number, tab: ApplicationTab): Promise<void> {
   // marked before filling, so a reload meanwhile doesn't fill it twice
   await applicationTabs.save(tabId, { ...tab, phase: "waiting" });
   const result = await pageInTab.fill(tabId, tab.form);
   if (result.ok) {
      const text = "Filled in the form: check the answers and send it yourself.";
      await pageInTab.showNotice(tabId, { tone: "info", text });
      return;
   }
   // the tab stays as it is, for the user to see; the reason shows with the answers in the web too
   await endApplicationTab(tabId, tab, { status: "failed", reason: result.reason });
   await pageInTab.showNotice(tabId, {
      tone: "error",
      text: `Couldn't fill the form in: ${result.reason}`,
   });
}

/**
 * The site's answer to the sent form has loaded: taken, the application is submitted; shown back with
 * errors, the form waits for the user again, to fix and send once more.
 */
async function confirmSubmission(tabId: number, tab: ApplicationTab): Promise<void> {
   if (!(await pageInTab.isFormAccepted(tabId, tab.form.source))) {
      await applicationTabs.save(tabId, { ...tab, phase: "waiting" });
      const text = "The site didn't take the form: fix what it marks and send it again.";
      await pageInTab.showNotice(tabId, { tone: "warning", text });
      return;
   }
   const recorded = await endApplicationTab(tabId, tab, { status: "submitted" });
   const notice: PageNotice = recorded
      ? {
           tone: "success",
           text: "Sent, and recorded in JobPilot: the vacancy is in Applied. You can close this tab.",
        }
      : {
           tone: "warning",
           text: "Sent, but JobPilot didn't get it (is the API running?): mark the vacancy as applied there.",
        };
   await pageInTab.showNotice(tabId, notice);
}

/**
 * The tab is no longer an application's; the API learns how the filling ended. False when it didn't:
 * the API is down, and the application stops showing as open by itself.
 */
async function endApplicationTab(
   tabId: number,
   tab: ApplicationTab,
   report: FillReport,
): Promise<boolean> {
   await applicationTabs.forget(tabId);
   try {
      await applicationsApi.reportFillOutcome(tab.applicationId, report);
      return true;
   } catch {
      return false;
   }
}
