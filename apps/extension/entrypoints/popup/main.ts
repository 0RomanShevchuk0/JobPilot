import { browserSites } from "@jobpilot/sources/page";
import { browser } from "wxt/browser";
import { fetchExpiredSessions } from "../../utils/api.js";
import { focusApplicationTab } from "../../utils/application-filling.js";
import { listApplicationTabs, type ApplicationTab } from "../../utils/application-tab-store.js";
import {
   type LastSync,
   readLastSyncs,
   RESEND_EVERY_MINUTES,
   SYNC_ALL_MESSAGE,
} from "../../utils/sync-session.js";

const SEND_BUTTON_SELECTOR = "#send";
const RESULTS_SELECTOR = "#results";
const IN_PROGRESS_SELECTOR = "#in-progress";
const IN_PROGRESS_LIST_SELECTOR = "#in-progress-list";

const button = document.querySelector<HTMLButtonElement>(SEND_BUTTON_SELECTOR)!;
const list = document.querySelector<HTMLUListElement>(RESULTS_SELECTOR)!;
const inProgress = document.querySelector<HTMLElement>(IN_PROGRESS_SELECTOR)!;
const inProgressList = document.querySelector<HTMLUListElement>(IN_PROGRESS_LIST_SELECTOR)!;

const OPEN_WEB_SELECTOR = "#open-web";
document.querySelector<HTMLAnchorElement>(OPEN_WEB_SELECTOR)!.href = import.meta.env.WEB_URL;

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

/** A site's card: a short status by its name, the details under it. */
interface SiteView {
   /** picks the status dot's color in style.css */
   status: LastSync["status"] | "never";
   label: string;
   detail?: string;
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

function element(tag: string, className: string, text: string): HTMLElement {
   const node = document.createElement(tag);
   node.className = className;
   node.textContent = text;
   return node;
}

/**
 * Each site's last sending, by the button or by itself (a login, a retry), and whether the session works:
 * the login cookie being there doesn't say, the site can log you out on its side. Only the server's
 * worker finds that out, using it; nothing is shown about it while the API isn't running.
 */
async function render(): Promise<void> {
   const [lastSyncs, expired] = await Promise.all([readLastSyncs(), fetchExpiredSessions()]);
   const items = browserSites.map((site, i) => {
      const view = describe(lastSyncs[i]);
      const item = document.createElement("li");
      item.className = "site";
      item.dataset.status = view.status;

      const head = element("div", "site-head", site.name);
      head.append(element("span", "site-status", view.label));
      item.append(head);
      if (view.detail) item.append(element("div", "site-detail", view.detail));

      const loggedOut = expired?.find((e) => e.source === site.source);
      if (loggedOut) {
         item.dataset.loggedOut = "";
         const since = formatTime(Date.parse(loggedOut.expiredAt));
         const text = `The site logged you out (found ${since}): log in there again.`;
         item.append(element("div", "warning", text));
      }
      return item;
   });
   list.replaceChildren(...items);
}

/** What an application's tab is at, for the user: what is happening and whose move it is. */
const PHASES: Record<ApplicationTab["phase"], { label: string; detail: string }> = {
   opening: { label: "Opening", detail: "Opening the job page to fill the form in" },
   waiting: { label: "Ready to send", detail: "Filled in: check it in the tab and send it" },
   sent: { label: "Sending", detail: "Sent: waiting for the site's answer" },
};

/** The applications open in tabs: each with where it stands and a way back to its tab. */
async function renderInProgress(): Promise<void> {
   const tabs = await listApplicationTabs();
   inProgress.hidden = tabs.length === 0;
   const items = tabs.map(({ tab }) => {
      const phase = PHASES[tab.phase];
      const item = document.createElement("li");
      item.className = "site";
      item.dataset.phase = tab.phase;

      const head = element("div", "site-head", "");
      const title = element("span", "site-title", tab.form.title ?? tab.form.jobUrl);
      title.title = title.textContent ?? ""; // the whole of a title cut short, on hover
      head.append(title);
      head.append(element("span", "site-status", phase.label));
      item.append(head);
      const siteName = browserSites.find((s) => s.source === tab.form.source)?.name;
      const detail = siteName ? `${siteName} · ${phase.detail}` : phase.detail;
      item.append(element("div", "site-detail", detail));

      const show = actionButton("Show tab", "secondary");
      // a tab closed meanwhile is forgotten by this: the list redraws without it
      show.addEventListener("click", () => void focusApplicationTab(tab.applicationId));
      const actions = element("div", "card-actions", "");
      actions.append(show);
      item.append(actions);
      return item;
   });
   inProgressList.replaceChildren(...items);
}

function actionButton(label: string, className = ""): HTMLButtonElement {
   const action = element("button", className, label) as HTMLButtonElement;
   action.type = "button";
   return action;
}

button.addEventListener("click", async () => {
   const label = button.textContent;
   button.disabled = true;
   button.textContent = "Sending…";
   try {
      await browser.runtime.sendMessage(SYNC_ALL_MESSAGE);
   } finally {
      button.disabled = false;
      button.textContent = label;
   }
});

// the background writes everything down: sessions sent (storage.local), applications' tabs
// (storage.session). Shown as it comes, whatever started it
const renderAll = () => Promise.all([render(), renderInProgress()]);
browser.storage.onChanged.addListener(() => void renderAll());
await renderAll();
