import type { FillAnswer, FormToFill } from "@jobpilot/contracts";
import { browser } from "wxt/browser";
import { claimFormToFill, downloadDocument, reportFillOutcome } from "./api.js";
import {
   findApplicationTabId,
   forgetApplicationTab,
   getApplicationTab,
   saveApplicationTab,
} from "./application-tab-store.js";
import {
   FILL_FUNCTION,
   type FillOnPage,
   type FillOnPageResult,
   type PageAnswer,
} from "./fill-data.js";

/** How the web's command went: the tab is open with the form coming, or why not. */
export type OpenTabResult = { ok: true } | { ok: false; reason: string };

/**
 * The web's "fill application X": its job page opens in a new tab, where the form is filled in once
 * the page has loaded. A tab already open for it is brought forward instead of a second one.
 */
export async function openApplicationTab(applicationId: string): Promise<OpenTabResult> {
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

/** A tab finished loading: an application's job page, still to be filled in, gets its form filled. */
export async function fillApplicationTab(tabId: number): Promise<void> {
   const applicationTab = await getApplicationTab(tabId);
   if (!applicationTab) return; // not a tab opened for an application
   if (applicationTab.phase !== "opening") return; // filled in already: a reload, or the page the form went to
   // marked before filling, so a reload meanwhile doesn't fill it twice
   await saveApplicationTab(tabId, { ...applicationTab, phase: "waiting" });
   const result = await fillFormInTab(tabId, applicationTab.form);
   if (result.ok) return;
   // the tab stays as it is, for the user to see; the reason shows with the answers in the web
   await forgetApplicationTab(tabId);
   await reportFillOutcome(applicationTab.applicationId, {
      status: "failed",
      reason: result.reason,
   }).catch(
      () => undefined, // the API is down: the application stops showing as open by itself
   );
}

/** Brings an application's open tab forward; false when there is none (it was closed). */
async function focusApplicationTab(applicationId: string): Promise<boolean> {
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

/**
 * Fills the form in on the job page: injects the script that knows the site's page (fill-form), then
 * calls it with the answers, the CV downloaded here, where the API lets the extension in.
 */
async function fillFormInTab(tabId: number, form: FormToFill): Promise<FillOnPageResult> {
   try {
      const answers = await Promise.all(form.answers.map(withDownloadedFile));
      const data: FillOnPage = { source: form.source, answers };
      await browser.scripting.executeScript({ target: { tabId }, files: ["/fill-form.js"] });
      const [injection] = await browser.scripting.executeScript({
         target: { tabId },
         // runs on the page, serialized: it knows nothing but its arguments
         func: (name: string, data: FillOnPage) => {
            const registered = globalThis as unknown as Record<
               string,
               (data: FillOnPage) => Promise<FillOnPageResult>
            >;
            return registered[name]!(data);
         },
         args: [FILL_FUNCTION, data],
      });
      return (
         (injection?.result as FillOnPageResult | undefined) ?? {
            ok: false,
            reason: "The page didn't answer the filling",
         }
      );
   } catch (err) {
      return { ok: false, reason: (err as Error).message };
   }
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
