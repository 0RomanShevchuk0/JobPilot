import { fillFields, scrollFormIntoView, type PageFillValue } from "@jobpilot/sources/page";
import {
   findSitePage,
   type FileToAttach,
   type FillOnPage,
   type FillOnPageResult,
   type PageAnswer,
} from "../page-calls.js";

/*
 * On the job page: the site's form opened and filled in, and the page the site answered the sent form
 * with read. Sending is left to the user.
 */

export async function fillOnPage({ source, answers }: FillOnPage): Promise<FillOnPageResult> {
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

export function isFormAcceptedOnPage(source: string): boolean {
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
