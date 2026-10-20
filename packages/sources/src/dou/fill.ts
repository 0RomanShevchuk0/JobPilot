import type { FillOutcome, FillValue, SiteSession } from "@jobpilot/contracts";
import type { BrowserContext, Page, Request } from "playwright";
import { launchBrowser } from "../browser.js";
import { fillFields, SLOW_MO_MS, waitForUser } from "../form-filling.js";
import { openSessionContext } from "../saved-session.js";
import { checkFormToFill } from "./apply-form.js";
import { douPage } from "./page.js";
import {
   ALREADY_APPLIED_SELECTOR,
   APPLY_BUTTON_SELECTOR,
   APPLY_FORM_SELECTOR,
   SEND_BUTTON_SELECTOR,
} from "./selectors.js";
import { DOU_NAME } from "./site.js";

/**
 * Opens a job's application form in a visible browser with the user's session, fills in the values
 * (the message, the CV file) and hands over to the user: they review, edit if they like, and press
 * "Відправити" themselves, or close the window. Never sends anything on its own. Resolves once the form
 * was sent or the window closed.
 */
export async function fillDouApplication(
   jobUrl: string,
   session: SiteSession,
   values: FillValue[],
): Promise<FillOutcome> {
   const browser = await launchBrowser({ visible: true, slowMo: SLOW_MO_MS });
   try {
      const context = await openSessionContext(browser, session);
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

   const isFormSubmission = (request: Request) =>
      douPage.isFormSubmission(request.url(), page.url());
   return waitForUser(page, isFormSubmission, DOU_NAME, isApplied);
}

/** Whether the page DOU answered the post with has the application through: the form there is marked sent. */
async function isApplied(page: Page): Promise<boolean> {
   return (await page.locator(ALREADY_APPLIED_SELECTOR).count()) > 0;
}

/** Opens a job page with the user's session and presses "Відгукнутися": the form is then on screen. */
async function openApplyForm(page: Page, jobUrl: string): Promise<void> {
   await page.goto(jobUrl);
   const html = await page.content();
   checkFormToFill(html);
   await page.locator(APPLY_BUTTON_SELECTOR).click();
   await page.locator(APPLY_FORM_SELECTOR).waitFor({ state: "visible" });
}
