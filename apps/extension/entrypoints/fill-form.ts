import { browserSites, fillFields, type PageFillValue } from "@jobpilot/sources/page";
import { defineUnlistedScript } from "wxt/utils/define-unlisted-script";
import {
   FILL_FUNCTION,
   type FileToAttach,
   type FillOnPage,
   type FillOnPageResult,
   type PageAnswer,
} from "../utils/fill-data.js";

/*
 * Injected by the background into the tab of an application, on the job page: registers the function
 * the background then calls with the answers. Opens the site's form, fills it in and leaves sending it
 * to the user. Runs in the extension's own world on the page, apart from the site's scripts.
 */
export default defineUnlistedScript(() => {
   Object.assign(globalThis, { [FILL_FUNCTION]: fillOnPage });
});

async function fillOnPage({ source, answers }: FillOnPage): Promise<FillOnPageResult> {
   const page = browserSites.find((site) => site.source === source)?.page;
   if (!page) return { ok: false, reason: `Filling ${source} is not supported` };
   try {
      const form = await page.openForm(document);
      await fillFields(form, answers.map(toPageValue));
      page.sendButton(form)?.scrollIntoView({ block: "center" });
      return { ok: true };
   } catch (err) {
      return { ok: false, reason: (err as Error).message };
   }
}

function toPageValue(answer: PageAnswer): PageFillValue {
   if (answer.kind === "file")
      return { name: answer.name, kind: "file", value: toFile(answer.file) };
   return answer;
}

function toFile({ fileName, type, base64 }: FileToAttach): File {
   const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
   return new File([bytes], fileName, { type });
}
