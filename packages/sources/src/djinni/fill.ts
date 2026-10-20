import type { FillOutcome, FillValue, SiteSession } from "@jobpilot/contracts";
import type { BrowserContext, Page, Request } from "playwright";
import { launchBrowser } from "../browser.js";
import { fillFields, SLOW_MO_MS, waitForUser } from "../form-filling.js";
import { openSessionContext } from "../saved-session.js";
import { readApplyCheck } from "./account-page.js";
import { openApplyForm } from "./apply-form.js";
import { djinniPage } from "./page.js";
import { APPLY_FORM_SELECTOR, SEND_BUTTON_SELECTOR } from "./selectors.js";
import { DJINNI_NAME } from "./site.js";

/**
 * Opens a job's application form in a visible browser with the user's session, fills in the values and
 * hands over to the user: they review, edit if they like, and press "Send application" themselves, or
 * close the window. Never sends anything on its own. Resolves once the form was sent or the window closed.
 */
export async function fillDjinniApplication(
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
      await fillFields(page.locator(APPLY_FORM_SELECTOR), values);
      await page.locator(SEND_BUTTON_SELECTOR).scrollIntoViewIfNeeded();
   } catch (err) {
      // the user closed the window before the form was filled in: nothing was sent, as after filling
      if (page.isClosed()) return { status: "cancelled" };
      await page.close();
      throw err;
   }

   const isFormSubmission = (request: Request) =>
      djinniPage.isFormSubmission(request.url(), jobUrl);
   return waitForUser(page, isFormSubmission, DJINNI_NAME, isApplied);
}

/**
 * Whether the page Djinni answered the post with has the application through: the "Apply" button is
 * gone from it (the job page then links to the dialog). A rejected form comes back on the job page, the
 * button still there, with "Перегляньте форму" and the fields to fix.
 */
async function isApplied(page: Page): Promise<boolean> {
   const html = await page.content();
   return !readApplyCheck(html).canApply;
}
