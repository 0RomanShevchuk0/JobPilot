import { browser } from "wxt/browser";
import { fetchExpiredSessions } from "../../utils/api.js";
import { SITES } from "../../utils/sites.js";
import {
   type LastSync,
   readLastSyncs,
   RESEND_EVERY_MINUTES,
   SYNC_ALL_MESSAGE,
} from "../../utils/sync-session.js";

const SEND_BUTTON_SELECTOR = "#send";
const RESULTS_SELECTOR = "#results";

const button = document.querySelector<HTMLButtonElement>(SEND_BUTTON_SELECTOR)!;
const list = document.querySelector<HTMLUListElement>(RESULTS_SELECTOR)!;

const formatTime = (ms: number) =>
   new Date(ms).toLocaleString([], {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
   });

/** Until when the login lasts, from the login cookie's expiry in seconds. */
function loginValidity(expires: number): string {
   if (expires === -1) return "until the browser closes";
   const date = new Date(expires * 1000).toLocaleDateString([], { day: "numeric", month: "short" });
   return `until ${date}`;
}

function describe(lastSync: LastSync | undefined): string {
   if (!lastSync) return "nothing sent yet";
   const at = formatTime(lastSync.at);
   switch (lastSync.status) {
      case "sent":
         return `sent ${at}, login valid ${loginValidity(lastSync.loginExpires)}`;
      case "logged out":
         return `not logged in (${at}), nothing sent`;
      case "failed":
         return `not sent ${at}: ${lastSync.error}; retrying every ${RESEND_EVERY_MINUTES} min`;
   }
}

/**
 * Each site's last sending, by the button or by itself (a login, a retry), and whether the session works:
 * the login cookie being there doesn't say, the site can log you out on its side. Only the server's
 * worker finds that out, using it; nothing is shown about it while the API isn't running.
 */
async function render(): Promise<void> {
   const [lastSyncs, expired] = await Promise.all([readLastSyncs(), fetchExpiredSessions()]);
   const items = SITES.map((site, i) => {
      const item = document.createElement("li");
      item.textContent = `${site.name}: ${describe(lastSyncs[i])}`;
      const loggedOut = expired?.find((e) => e.source === site.source);
      if (loggedOut) {
         const warning = document.createElement("div");
         warning.style.color = "#b45309";
         const since = formatTime(Date.parse(loggedOut.expiredAt));
         warning.textContent = `the site logged you out (found ${since}): log in there again`;
         item.append(warning);
      }
      return item;
   });
   list.replaceChildren(...items);
}

button.addEventListener("click", async () => {
   button.disabled = true;
   try {
      await browser.runtime.sendMessage(SYNC_ALL_MESSAGE);
   } finally {
      button.disabled = false;
   }
});

// the background writes each result down: shown as it comes, the button's and the automatic ones alike
browser.storage.onChanged.addListener(render);
await render();
