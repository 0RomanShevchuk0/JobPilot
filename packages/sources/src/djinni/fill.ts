import type { FillOutcome, FillValue } from "@jobpilot/contracts";
import type { BrowserContext, Request } from "playwright";
import { launchBrowser } from "../browser.js";
import { fillFields, SLOW_MO_MS, waitForUser } from "../form-filling.js";
import { openSessionContext } from "../saved-session.js";
import { openApplyForm } from "./apply-form.js";
import { DJINNI_NAME } from "./site.js";

// "https://djinni.co/jobs/850626-full-stack-…/" → "850626"
const JOB_ID_IN_URL = /\/jobs\/(\d+)-/;

/**
 * Opens a job's application form in a visible browser with the user's session, fills in the values and
 * hands over to the user: they review, edit if they like, and press "Send application" themselves, or
 * close the window. Never sends anything on its own. Resolves once the form was sent or the window closed.
 */
export async function fillDjinniApplication(
   jobUrl: string,
   sessionPath: string,
   values: FillValue[],
): Promise<FillOutcome> {
   const browser = await launchBrowser({ visible: true, slowMo: SLOW_MO_MS });
   try {
      const context = await openSessionContext(browser, sessionPath, DJINNI_NAME);
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
      await fillFields(page.locator("#apply_form"), values);
      await page.locator("#job_apply").scrollIntoViewIfNeeded();
   } catch (err) {
      // the user closed the window before the form was filled in: nothing was sent, as after filling
      if (page.isClosed()) return { status: "cancelled" };
      await page.close();
      throw err;
   }

   const jobId = JOB_ID_IN_URL.exec(jobUrl)?.[1];
   if (!jobId) throw new Error(`not a Djinni job URL: ${jobUrl}`);
   // pressing "Send application" posts the form to the job's own page
   const isSending = (request: Request) => request.url().includes(`/jobs/${jobId}`);
   return waitForUser(page, isSending, DJINNI_NAME);
}
