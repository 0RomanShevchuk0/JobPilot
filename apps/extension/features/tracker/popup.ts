import type { AddJobPage } from "@jobpilot/contracts";
import { browser } from "wxt/browser";
import { WEB_URL } from "../../shared/api.js";
import { dom } from "../../shared/dom.js";
import { addJobPageMessage } from "./add-job-page-message.js";
import type { JobPageAdding } from "./background.js";
import { readOpenJobPage } from "./read-job-page.js";

const ADD_BUTTON_SELECTOR = "#tracker-add";
const NOTE_SELECTOR = "#tracker-note";
const BUTTON_LABEL = "Add this job to the tracker";

/**
 * The popup's Add this job to the tracker: reads the page open in the tab, has the background add
 * it, and says here what came of it, with a link to the row or to the tracker's Add form. Nothing
 * opens by itself. Nothing happens until the button is pressed: the popup is opened for the sessions
 * too.
 */
export function mountTrackerSection(): void {
   const button = document.querySelector<HTMLButtonElement>(ADD_BUTTON_SELECTOR)!;
   const note = document.querySelector<HTMLElement>(NOTE_SELECTOR)!;
   button.addEventListener("click", () => void addOpenJobPage(button, note));
}

async function addOpenJobPage(button: HTMLButtonElement, note: HTMLElement): Promise<void> {
   button.disabled = true;
   const page = await readOpenJobPage();
   if (!page) {
      button.disabled = false;
      note.textContent = "This page can't be read: add the job in the tracker by hand.";
      return;
   }
   button.replaceChildren(dom.spinner(), "Reading the page…");
   note.textContent = "A few seconds. Closing this doesn't stop it.";
   const adding = await sendAddJobPage(page);
   button.replaceChildren(BUTTON_LABEL);
   button.disabled = false;
   note.replaceChildren(...describeAdding(adding, page));
}

/** Hands the page to the background and waits for what came of it; "failed" when no answer comes. */
async function sendAddJobPage(page: AddJobPage): Promise<JobPageAdding> {
   try {
      const answer = (await browser.runtime.sendMessage(addJobPageMessage(page))) as
         JobPageAdding | undefined;
      return answer ?? { outcome: "failed" };
   } catch {
      return { outcome: "failed" };
   }
}

/** The note's text and link for what came of adding the page. */
function describeAdding(adding: JobPageAdding, page: AddJobPage): Node[] {
   if (adding.outcome === "added" || adding.outcome === "existing") {
      const said =
         adding.outcome === "added" ? "Added to the tracker. " : "Already in the tracker. ";
      const address = new URLSearchParams({ attempt: adding.attemptId });
      return [document.createTextNode(said), trackerLink("Open it", address)];
   }
   const said =
      adding.outcome === "not_a_job"
         ? "No job found on this page. "
         : "Couldn't reach JobPilot: are you signed in? ";
   const address = new URLSearchParams({ add: "", url: page.url });
   return [document.createTextNode(said), trackerLink("Add it by hand", address)];
}

/** A link to the tracker, opening in a new tab when clicked. */
function trackerLink(text: string, address: URLSearchParams): HTMLAnchorElement {
   const link = dom.element("a", "tracker-link", text) as HTMLAnchorElement;
   link.href = `${WEB_URL}/tracker?${address}`;
   link.target = "_blank";
   return link;
}
