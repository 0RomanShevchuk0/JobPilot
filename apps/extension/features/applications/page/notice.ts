import type { PageNotice } from "../page-calls.js";

/* On the job page: a note to the user in the page's corner, how the application is going. */

const NOTICE_HOST_ID = "jobpilot-notice";

const NOTICE_COLORS: Record<PageNotice["tone"], { accent: string; background: string }> = {
   info: { accent: "#2563eb", background: "#eff6ff" },
   success: { accent: "#16a34a", background: "#f0fdf4" },
   warning: { accent: "#d97706", background: "#fffbeb" },
   error: { accent: "#dc2626", background: "#fef2f2" },
};

// how long news stays on the page; held while the pointer is over it, not to vanish mid-reading
const NOTICE_SHOWN_MS = 10_000;

/**
 * Shows a note in the page's corner, in place of the one before. In a shadow root: the site's styles
 * don't reach it, its styles don't reach the site.
 */
export function showNoticeOnPage({ tone, text }: PageNotice): void {
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

function hideLater(host: HTMLElement): void {
   let timer = setTimeout(() => host.remove(), NOTICE_SHOWN_MS);
   host.addEventListener("mouseenter", () => clearTimeout(timer));
   host.addEventListener("mouseleave", () => {
      timer = setTimeout(() => host.remove(), NOTICE_SHOWN_MS);
   });
}
