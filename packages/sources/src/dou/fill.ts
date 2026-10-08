import type { FillOutcome, FillValue } from "@jobpilot/contracts";
import type { BrowserContext, Page, Request } from "playwright";
import { launchBrowser } from "../browser.js";
import { fillFields, SLOW_MO_MS, waitForUser } from "../form-filling.js";
import { openSessionContext } from "../saved-session.js";
import { APPLY_BUTTON_SELECTOR } from "./account-page.js";
import { APPLY_FORM_SELECTOR, checkFormToFill } from "./apply-form.js";
import { DOU_NAME } from "./site.js";

// "Відправити": the user presses it themselves
const SEND_BUTTON_SELECTOR = ".replied-btn.send";

/**
 * Opens a job's application form in a visible browser with the user's session, fills in the values
 * (the message, the CV file) and hands over to the user: they review, edit if they like, and press
 * "Відправити" themselves, or close the window. Never sends anything on its own. Resolves once the form
 * was sent or the window closed.
 */
export async function fillDouApplication(
   jobUrl: string,
   sessionPath: string,
   values: FillValue[],
): Promise<FillOutcome> {
   const browser = await launchBrowser({ visible: true, slowMo: SLOW_MO_MS });
   try {
      const context = await openSessionContext(browser, sessionPath, DOU_NAME);
      return await fillForm(context, jobUrl, values);
   } finally {
      await browser.close();
   }
}

async function fillForm(
   context: BrowserContext,
   jobUrl: string,
   values: FillValue[],
): Promise<FillOutcome> {
   const page = await context.newPage();
   try {
      await openApplyForm(page, jobUrl);
      const form = page.locator(APPLY_FORM_SELECTOR);
      await fillFields(form, values);
      await form.locator(SEND_BUTTON_SELECTOR).scrollIntoViewIfNeeded();
   } catch (err) {
      // the user closed the window before the form was filled in: nothing was sent, as after filling
      if (page.isClosed()) return { status: "cancelled" };
      await page.close();
      throw err;
   }

   // the form has no action: "Відправити" posts it to the job's own page
   const jobPath = new URL(page.url()).pathname;
   const isSending = (request: Request) => new URL(request.url()).pathname === jobPath;
   return waitForUser(page, isSending, DOU_NAME);
}

/** Opens a job page with the user's session and presses "Відгукнутися": the form is then on screen. */
async function openApplyForm(page: Page, jobUrl: string): Promise<void> {
   await page.goto(jobUrl);
   const html = await page.content();
   checkFormToFill(html);
   await page.locator(APPLY_BUTTON_SELECTOR).click();
   await page.locator(APPLY_FORM_SELECTOR).waitFor({ state: "visible" });
}
