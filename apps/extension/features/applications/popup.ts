import { browserSites } from "@jobpilot/sources/page";
import { dom } from "../../shared/dom.js";
import { focusApplicationTab } from "./filling.js";
import { applicationTabs, type ApplicationTab } from "./tab-store.js";

const SECTION_SELECTOR = "#application-tabs";
const LIST_SELECTOR = "#application-tabs-list";

/** What an application's tab is at, for the user: what is happening and whose move it is. */
const PHASES: Record<ApplicationTab["phase"], { label: string; detail: string }> = {
   opening: { label: "Opening", detail: "Opening the job page to fill the form in" },
   waiting: { label: "Ready to send", detail: "Filled in: check it in the tab and send it" },
   sent: { label: "Sending", detail: "Sent: waiting for the site's answer" },
};

/**
 * The popup's In progress: the applications open in tabs, each with where it stands and a way back to
 * its tab; hidden while there are none. Returns the function that draws it anew.
 */
export function mountApplicationTabsSection(): () => Promise<void> {
   const section = document.querySelector<HTMLElement>(SECTION_SELECTOR)!;
   const list = document.querySelector<HTMLUListElement>(LIST_SELECTOR)!;
   return () => renderApplicationTabs(section, list);
}

async function renderApplicationTabs(section: HTMLElement, list: HTMLUListElement): Promise<void> {
   const tabs = await applicationTabs.list();
   section.hidden = tabs.length === 0;
   const items = tabs.map(({ tab }) => {
      const phase = PHASES[tab.phase];
      const item = document.createElement("li");
      item.className = "site";
      item.dataset.phase = tab.phase;

      const head = dom.element("div", "site-head", "");
      head.append(dom.cardTitle(tab.form.title ?? tab.form.jobUrl));
      head.append(dom.element("span", "site-status", phase.label));
      item.append(head);
      const siteName = browserSites.find((s) => s.source === tab.form.source)?.name;
      const detail = siteName ? `${siteName} · ${phase.detail}` : phase.detail;
      item.append(dom.element("div", "site-detail", detail));

      const show = dom.button("Show tab", "secondary");
      // a tab closed meanwhile is forgotten by this: the list redraws without it
      show.addEventListener("click", () => void focusApplicationTab(tab.applicationId));
      const actions = dom.element("div", "card-actions", "");
      actions.append(show);
      item.append(actions);
      return item;
   });
   list.replaceChildren(...items);
}
