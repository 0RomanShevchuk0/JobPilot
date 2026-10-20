import { browser } from "wxt/browser";
import type { SendResult } from "../../utils/send-session.js";
import { SITES } from "../../utils/sites.js";
import { SYNC_ALL_MESSAGE } from "../../utils/sync-session.js";

const SEND_BUTTON_SELECTOR = "#send";
const RESULTS_SELECTOR = "#results";

const button = document.querySelector<HTMLButtonElement>(SEND_BUTTON_SELECTOR)!;
const list = document.querySelector<HTMLUListElement>(RESULTS_SELECTOR)!;

function describe(result: SendResult): string {
   if (result.status === "sent") return "sent";
   if (result.status === "logged out") return "not logged in, nothing sent";
   return `not sent: ${result.error}, will retry`;
}

/** Sends every site's session through the background and shows how each went. */
button.addEventListener("click", async () => {
   button.disabled = true;
   list.replaceChildren();
   try {
      const results: SendResult[] = await browser.runtime.sendMessage(SYNC_ALL_MESSAGE);
      const items = SITES.map((site, i) => {
         const item = document.createElement("li");
         item.textContent = `${site.name}: ${describe(results[i]!)}`;
         return item;
      });
      list.replaceChildren(...items);
   } finally {
      button.disabled = false;
   }
});
