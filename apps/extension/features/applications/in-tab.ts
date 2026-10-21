import type { FillAnswer, FormToFill } from "@jobpilot/contracts";
import { browser } from "wxt/browser";
import { applicationsApi } from "./api.js";
import {
   PAGE_FUNCTIONS,
   type FillOnPage,
   type FillOnPageResult,
   type PageAnswer,
   type PageNotice,
} from "./page-calls.js";

/*
 * The background's side of the script on an application's job page (entrypoints/application-page.ts):
 * the calls into it, and what they take there.
 */

/** Calls into the page script on an application's tab. */
export const pageInTab = {
   /** Fills the form in on the job page, with the CV downloaded here, where the API lets the extension in. */
   fill: fillFormInTab,
   /**
    * Whether the page the site answered the sent form with shows it taken; true when the page can't be
    * read: the post going through is all there is to go by.
    */
   isFormAccepted: isFormAcceptedInTab,
   /** A note to the user over the tab's page; a page that can't take one (an error page) goes without. */
   showNotice: showNoticeInTab,
};

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

async function isFormAcceptedInTab(tabId: number, source: string): Promise<boolean> {
   const accepted = await callOnPage<string, boolean>(
      tabId,
      PAGE_FUNCTIONS.isFormAccepted,
      source,
   ).catch(() => true);
   return accepted !== false;
}

async function showNoticeInTab(tabId: number, notice: PageNotice): Promise<void> {
   await callOnPage(tabId, PAGE_FUNCTIONS.showNotice, notice).catch(() => undefined);
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
   const file = await applicationsApi.downloadDocument(answer.document.id);
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
