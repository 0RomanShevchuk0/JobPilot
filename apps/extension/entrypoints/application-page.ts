import { fillFields, scrollFormIntoView, type PageFillValue } from "@jobpilot/sources/page";
import { defineUnlistedScript } from "wxt/utils/define-unlisted-script";
import {
   findSitePage,
   PAGE_FUNCTIONS,
   type FileToAttach,
   type FillOnPage,
   type FillOnPageResult,
   type PageAnswer,
} from "../utils/application-page-calls.js";

/*
 * Injected by the background into the tab of an application, on the job page: registers the functions
 * the background then calls. One opens the site's form and fills it in, leaving sending it to the
 * user; the other, on the page the site answered the sent form with, tells whether it was taken. Runs in
 * the extension's own world on the page, apart from the site's scripts.
 */
export default defineUnlistedScript(() => {
   Object.assign(globalThis, {
      [PAGE_FUNCTIONS.fill]: fillOnPage,
      [PAGE_FUNCTIONS.isFormAccepted]: isFormAcceptedOnPage,
   });
});

async function fillOnPage({ source, answers }: FillOnPage): Promise<FillOnPageResult> {
   const page = findSitePage(source);
   if (!page) return { ok: false, reason: `Filling ${source} is not supported` };
   try {
      const form = await page.openForm(document);
      await fillFields(form, answers.map(toPageValue));
      scrollFormIntoView(form);
      return { ok: true };
   } catch (err) {
      return { ok: false, reason: (err as Error).message };
   }
}

function isFormAcceptedOnPage(source: string): boolean {
   return findSitePage(source)?.isFormAccepted(document) ?? false;
}

function toPageValue(answer: PageAnswer): PageFillValue {
   if (answer.kind !== "file") return answer;
   return { name: answer.name, kind: "file", value: toFile(answer.file) };
}

function toFile({ fileName, type, base64 }: FileToAttach): File {
   const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
   return new File([bytes], fileName, { type });
}
