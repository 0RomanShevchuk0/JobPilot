import { browser } from "wxt/browser";
import { dom } from "../../shared/dom.js";
import { addJobPageMessage } from "./add-job-page-message.js";
import { readOpenJobPage } from "./read-job-page.js";

const ADD_BUTTON_SELECTOR = "#tracker-add";
const NOTE_SELECTOR = "#tracker-note";

/**
 * The popup's Add this job to the tracker: reads the page open in the tab and hands it to the
 * background, which adds the row and opens it in the tracker. Nothing happens until the button is
 * pressed: the popup is opened for the sessions too.
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
   note.textContent = "The tracker opens in a new tab in a few seconds; you can close this.";
   // no answer comes: the background opens the tracker's tab itself, and the popup closes with it
   browser.runtime.sendMessage(addJobPageMessage(page)).catch(() => undefined);
}
