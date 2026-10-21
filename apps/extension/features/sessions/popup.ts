import { browserSites } from "@jobpilot/sources/page";
import { browser } from "wxt/browser";
import { dom } from "../../shared/dom.js";
import { sessionsApi } from "./api.js";
import {
   type LastSync,
   readLastSyncs,
   RESEND_EVERY_MINUTES,
   SYNC_ALL_MESSAGE,
} from "./sync-session.js";

const SESSIONS_LIST_SELECTOR = "#sessions-list";
const SEND_BUTTON_SELECTOR = "#send-sessions";

/** The cards' dates: "21 Oct, 14:32". */
const formatTime = (ms: number) =>
   new Date(ms).toLocaleString([], {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
   });

/** A site's card: a short status by its name, the details under it. */
interface SiteView {
   /** picks the status dot's color in style.css */
   status: LastSync["status"] | "never";
   label: string;
   detail?: string;
}

/**
 * The popup's Sessions: each site's last sending and whether the session works, with the button to
 * send them all now. Returns the function that draws it anew.
 */
export function mountSessionsSection(): () => Promise<void> {
   const list = document.querySelector<HTMLUListElement>(SESSIONS_LIST_SELECTOR)!;
   const button = document.querySelector<HTMLButtonElement>(SEND_BUTTON_SELECTOR)!;
   button.addEventListener("click", () => void sendAllNow(button));
   return () => renderSessions(list);
}

/**
 * Each site's last sending, by the button or by itself (a login, a retry), and whether the session works:
 * the login cookie being there doesn't say, the site can log you out on its side. Only the server's
 * worker finds that out, using it; nothing is shown about it while the API isn't running.
 */
async function renderSessions(list: HTMLUListElement): Promise<void> {
   const [lastSyncs, expired] = await Promise.all([readLastSyncs(), sessionsApi.fetchExpired()]);
   const items = browserSites.map((site, i) => {
      const view = describe(lastSyncs[i]);
      const item = document.createElement("li");
      item.className = "site";
      item.dataset.status = view.status;

      const head = dom.element("div", "site-head", site.name);
      head.append(dom.element("span", "site-status", view.label));
      item.append(head);
      if (view.detail) item.append(dom.element("div", "site-detail", view.detail));

      const loggedOut = expired?.find((e) => e.source === site.source);
      if (loggedOut) {
         item.dataset.loggedOut = "";
         const since = formatTime(Date.parse(loggedOut.expiredAt));
         const text = `The site logged you out (found ${since}): log in there again.`;
         item.append(dom.element("div", "warning", text));
      }
      return item;
   });
   list.replaceChildren(...items);
}

/** Sends every site's session through the background, the button busy meanwhile. */
async function sendAllNow(button: HTMLButtonElement): Promise<void> {
   const label = button.textContent;
   button.disabled = true;
   button.textContent = "Sending…";
   try {
      await browser.runtime.sendMessage(SYNC_ALL_MESSAGE);
   } finally {
      button.disabled = false;
      button.textContent = label;
   }
}

function describe(lastSync: LastSync | undefined): SiteView {
   if (!lastSync) return { status: "never", label: "Nothing sent yet" };
   const at = formatTime(lastSync.at);
   switch (lastSync.status) {
      case "sent":
         return {
            status: "sent",
            label: `Sent ${at}`,
            detail: `Login valid ${loginValidity(lastSync.loginExpires)}`,
         };
      case "logged out":
         return { status: "logged out", label: "Not logged in", detail: `Checked ${at}` };
      case "failed":
         return {
            status: "failed",
            label: "Not sent",
            detail: `${lastSync.error} (${at}); retrying every ${RESEND_EVERY_MINUTES} min`,
         };
   }
}

/** Until when the login lasts, from the login cookie's expiry in seconds. */
function loginValidity(expires: number): string {
   if (expires === -1) return "until the browser closes";
   const date = new Date(expires * 1000).toLocaleDateString([], { day: "numeric", month: "short" });
   return `until ${date}`;
}
