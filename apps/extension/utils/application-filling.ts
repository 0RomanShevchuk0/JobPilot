import type { ExtensionAnswer, FillAnswer, FillReport, FormToFill } from "@jobpilot/contracts";
import { browser } from "wxt/browser";
import { claimFormToFill, downloadDocument, reportFillOutcome } from "./api.js";
import {
   findSitePage,
   PAGE_FUNCTIONS,
   type FillOnPage,
   type FillOnPageResult,
   type PageAnswer,
   type PageNotice,
} from "./application-page-calls.js";
import {
   findApplicationTabId,
   forgetApplicationTab,
   getApplicationTab,
   saveApplicationTab,
   type ApplicationTab,
} from "./application-tab-store.js";

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
      form = await claimFormToFill(applicationId);
   } catch (err) {
      return { ok: false, reason: (err as Error).message };
   }
   const tab = await browser.tabs.create({ url: form.jobUrl, active: true });
   await saveApplicationTab(tab.id!, { applicationId, form, phase: "opening" });
   return { ok: true };
}

/**
 * A job site's page has loaded in a tab: in an application's tab, the job page gets its form filled
 * in; after the form was sent, the page the site answered with tells whether it took it.
 */
export async function fillOrConfirmApplicationTab(tabId: number): Promise<void> {
   const tab = await getApplicationTab(tabId);
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
   const tab = await getApplicationTab(tabId);
   if (tab?.phase !== "waiting") return; // not a form waiting to be sent
   if (!findSitePage(tab.form.source)?.isFormSubmission(url, tab.form.jobUrl)) return;
   if (statusCode >= 400) {
      const reason = `The site answered ${statusCode} to the application`;
      await endApplicationTab(tabId, tab, { status: "failed", reason });
      return;
   }
   await saveApplicationTab(tabId, { ...tab, phase: "sent" });
}

/**
 * The user closed a tab: an application's one closed before the form was sent ends with nothing sent.
 * One closed while the site's answer was loading counts as sent: the post went through, it is all
 * there is to go by.
 */
export async function reportClosedApplicationTab(tabId: number): Promise<void> {
   const tab = await getApplicationTab(tabId);
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
   await saveApplicationTab(tabId, { ...tab, phase: "waiting" });
   const result = await fillFormInTab(tabId, tab.form);
   if (result.ok) {
      const text = "Filled in the form: check the answers and send it yourself.";
      await showNoticeInTab(tabId, { tone: "info", text });
      return;
   }
   // the tab stays as it is, for the user to see; the reason shows with the answers in the web too
   await endApplicationTab(tabId, tab, { status: "failed", reason: result.reason });
   await showNoticeInTab(tabId, {
      tone: "error",
      text: `Couldn't fill the form in: ${result.reason}`,
   });
}

/**
 * The site's answer to the sent form has loaded: taken, the application is submitted; shown back with
 * errors, the form waits for the user again, to fix and send once more.
 */
async function confirmSubmission(tabId: number, tab: ApplicationTab): Promise<void> {
   const accepted = await callOnPage<string, boolean>(
      tabId,
      PAGE_FUNCTIONS.isFormAccepted,
      tab.form.source,
   ).catch(() => true); // the page can't be read: the post going through is all there is to go by
   if (accepted === false) {
      await saveApplicationTab(tabId, { ...tab, phase: "waiting" });
      const text = "The site didn't take the form: fix what it marks and send it again.";
      await showNoticeInTab(tabId, { tone: "warning", text });
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
   await showNoticeInTab(tabId, notice);
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
   await forgetApplicationTab(tabId);
   try {
      await reportFillOutcome(tab.applicationId, report);
      return true;
   } catch {
      return false;
   }
}

/** A note to the user over the tab's page; a page that can't take one (an error page) goes without. */
async function showNoticeInTab(tabId: number, notice: PageNotice): Promise<void> {
   await callOnPage(tabId, PAGE_FUNCTIONS.showNotice, notice).catch(() => undefined);
}

/** Brings an application's open tab forward; false when there is none (it was closed). */
export async function focusApplicationTab(applicationId: string): Promise<boolean> {
   const tabId = await findApplicationTabId(applicationId);
   if (tabId === undefined) return false;
   const tab = await browser.tabs.get(tabId).catch(() => undefined);
   if (!tab) {
      await forgetApplicationTab(tabId);
      return false;
   }
   await browser.tabs.update(tabId, { active: true });
   await browser.windows.update(tab.windowId, { focused: true });
   return true;
}

/** Fills the form in on the job page, with the CV downloaded here, where the API lets the extension in. */
async function fillFormInTab(tabId: number, form: FormToFill): Promise<FillOnPageResult> {
   try {
      const answers = await Promise.all(form.answers.map(withDownloadedFile));
      const data: FillOnPage = { source: form.source, answers };
      const result = await callOnPage<FillOnPage, FillOnPageResult>(
         tabId,
         PAGE_FUNCTIONS.fill,
         data,
      );
      return result ?? { ok: false, reason: "The page didn't answer the filling" };
   } catch (err) {
      return { ok: false, reason: (err as Error).message };
   }
}

/**
 * Calls one of the page script's functions on the tab's page: injects the script (application-page),
 * which registers them, then calls the function with the argument. Two injections: a script file takes
 * no arguments, a function takes only its own source, without imports.
 */
async function callOnPage<Arg, Result>(
   tabId: number,
   functionName: string,
   arg: Arg,
): Promise<Result | undefined> {
   await browser.scripting.executeScript({ target: { tabId }, files: ["/application-page.js"] });
   const [injection] = await browser.scripting.executeScript({
      target: { tabId },
      // runs on the page, serialized: it knows nothing but its arguments
      func: (name: string, value: Arg) => {
         const registered = globalThis as unknown as Record<string, (value: Arg) => unknown>;
         return registered[name]!(value);
      },
      args: [functionName, arg],
   });
   return injection?.result as Result | undefined;
}

async function withDownloadedFile(answer: FillAnswer): Promise<PageAnswer> {
   if (answer.kind !== "file") return answer;
   const file = await downloadDocument(answer.document.id);
   const base64 = await toBase64(file);
   return {
      name: answer.name,
      kind: "file",
      file: { fileName: answer.document.fileName, type: file.type, base64 },
   };
}

async function toBase64(blob: Blob): Promise<string> {
   const bytes = new Uint8Array(await blob.arrayBuffer());
   let binary = "";
   // in chunks: spreading a whole file into fromCharCode overflows the call stack
   for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
   }
   return btoa(binary);
}
