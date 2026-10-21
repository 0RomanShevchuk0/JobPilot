import { fillFields, scrollFormIntoView, type PageFillValue } from "@jobpilot/sources/page";
import { defineUnlistedScript } from "wxt/utils/define-unlisted-script";
import {
   findSitePage,
   PAGE_FUNCTIONS,
   type FileToAttach,
   type FillOnPage,
   type FillOnPageResult,
   type PageAnswer,
   type PageNotice,
} from "../utils/application-page-calls.js";

/*
 * Injected by the background into the tab of an application, on the job page: registers the functions
 * the background then calls. One opens the site's form and fills it in, leaving sending it to the
 * user; one, on the page the site answered the sent form with, tells whether it was taken; one shows
 * the user how it is going. Runs in the extension's own world on the page, apart from the site's scripts.
 */
export default defineUnlistedScript(() => {
   Object.assign(globalThis, {
      [PAGE_FUNCTIONS.fill]: fillOnPage,
      [PAGE_FUNCTIONS.isFormAccepted]: isFormAcceptedOnPage,
      [PAGE_FUNCTIONS.showNotice]: showNoticeOnPage,
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

const NOTICE_HOST_ID = "jobpilot-notice";

const NOTICE_COLORS: Record<PageNotice["tone"], { accent: string; background: string }> = {
   info: { accent: "#2563eb", background: "#eff6ff" },
   success: { accent: "#16a34a", background: "#f0fdf4" },
   warning: { accent: "#d97706", background: "#fffbeb" },
   error: { accent: "#dc2626", background: "#fef2f2" },
};

/**
 * Shows a note in the page's corner until the user closes it, in place of the one before. In a shadow
 * root: the site's styles don't reach it, its styles don't reach the site.
 */
function showNoticeOnPage({ tone, text }: PageNotice): void {
   document.getElementById(NOTICE_HOST_ID)?.remove();
   const host = document.createElement("div");
   host.id = NOTICE_HOST_ID;
   const root = host.attachShadow({ mode: "open" });
   const { accent, background } = NOTICE_COLORS[tone];
   root.innerHTML = `
      <style>
         .notice {
            position: fixed; top: 20px; right: 20px; z-index: 2147483647;
            display: flex; gap: 12px; align-items: flex-start;
            max-width: 360px; padding: 12px 14px;
            border: 1px solid ${accent}; border-left-width: 4px; border-radius: 8px;
            background: ${background}; color: #111827;
            box-shadow: 0 8px 24px rgb(0 0 0 / 0.15);
            font: 14px/1.4 system-ui, sans-serif;
         }
         .title { margin: 0 0 2px; font-weight: 600; color: ${accent}; }
         .text { margin: 0; }
         button {
            flex: none; margin: -4px -6px 0 0; padding: 0 6px;
            border: 0; background: none; color: #6b7280; font-size: 18px; cursor: pointer;
         }
      </style>
      <div class="notice" role="status">
         <div><p class="title">JobPilot</p><p class="text"></p></div>
         <button type="button" aria-label="Close">×</button>
      </div>`;
   // the text as text: a reason from the site or the API is never read as HTML
   root.querySelector(".text")!.textContent = text;
   root.querySelector("button")!.addEventListener("click", () => host.remove());
   document.body.append(host);
   // news goes by itself; a warning or an error says what to do, it stays until closed
   if (tone === "info" || tone === "success") hideLater(host);
}

// how long news stays on the page; held while the pointer is over it, not to vanish mid-reading
const NOTICE_SHOWN_MS = 10_000;

function hideLater(host: HTMLElement): void {
   let timer = setTimeout(() => host.remove(), NOTICE_SHOWN_MS);
   host.addEventListener("mouseenter", () => clearTimeout(timer));
   host.addEventListener("mouseleave", () => {
      timer = setTimeout(() => host.remove(), NOTICE_SHOWN_MS);
   });
}
