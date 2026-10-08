import type { FillOutcome, FillValue } from "@jobpilot/contracts";
import type { BrowserContext, Page } from "playwright";
import { launchBrowser } from "../browser.js";
import { openSessionContext } from "../saved-session.js";
import { openApplyForm } from "./apply-form.js";
import { DJINNI_NAME } from "./site.js";

// slows every browser action down a little, so the user can follow the filling
const SLOW_MO_MS = 150;
// how long the window waits for the user to send or close it
const REVIEW_TIMEOUT_MS = 30 * 60_000;
// "https://djinni.co/jobs/850626-full-stack-…/" → "850626"
const JOB_ID_IN_URL = /\/jobs\/(\d+)-/;
// a pause between fields, so the user can follow what is being filled in
const STEP_PAUSE_MS = 200;

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
      for (const value of values) {
         await fillField(page, value);
         await page.waitForTimeout(STEP_PAUSE_MS);
      }
      await page.locator("#job_apply").scrollIntoViewIfNeeded();
   } catch (err) {
      // the user closed the window before the form was filled in: nothing was sent, as after filling
      if (page.isClosed()) return { status: "cancelled" };
      await page.close();
      throw err;
   }

   const jobId = JOB_ID_IN_URL.exec(jobUrl)?.[1];
   if (!jobId) throw new Error(`not a Djinni job URL: ${jobUrl}`);
   return waitForUser(page, jobId);
}

/** Puts one value into the form the way its kind takes it: typed in, an option checked or selected. */
async function fillField(page: Page, { name, kind, value }: FillValue): Promise<void> {
   const inputs = page.locator(`#apply_form [name="${name}"]`);
   switch (kind) {
      case "text":
      case "textarea":
      case "number": {
         const field = inputs.first();
         await field.scrollIntoViewIfNeeded();
         await field.fill(value);
         return;
      }
      case "select":
         await inputs.first().selectOption({ label: value });
         return;
      case "radio": {
         // the options of a group share the name: the one to check is the one labelled with the value
         for (const option of await inputs.all()) {
            const label = await option.evaluate((el) =>
               // runs of whitespace → one space: "\n   Так  " → "Так"
               ((el as HTMLInputElement).labels?.[0]?.textContent ?? "")
                  .replace(/\s+/g, " ")
                  .trim(),
            );
            if (label === value) {
               await option.scrollIntoViewIfNeeded();
               await option.check();
               return;
            }
         }
         throw new Error(`No option "${value}" in the form for "${name}"`);
      }
      default:
         throw new Error(`Filling a ${kind} field is not supported yet ("${name}")`);
   }
}

/**
 * Waits for the user: the form posting is them pressing "Send application" (any status below 400:
 * Django answers a form post with a redirect); the page closing is them giving up.
 */
function waitForUser(page: Page, jobId: string): Promise<FillOutcome> {
   return new Promise((resolve, reject) => {
      let done = false;
      const finish = (settle: () => void) => {
         if (done) return;
         done = true;
         clearTimeout(timer);
         settle();
      };
      const timer = setTimeout(
         () => finish(() => void page.close().then(() => resolve({ status: "cancelled" }))),
         REVIEW_TIMEOUT_MS,
      );
      page.on("close", () => finish(() => resolve({ status: "cancelled" })));
      page.on("response", (response) => {
         const request = response.request();
         if (request.method() !== "POST" || !request.url().includes(`/jobs/${jobId}`)) return;
         if (response.status() >= 400) {
            finish(() =>
               reject(new Error(`Djinni answered ${response.status()} to the application`)),
            );
            return;
         }
         // sent: from here on it counts as submitted, whatever happens to the page
         finish(() => void showResult(page).then(() => resolve({ status: "submitted" })));
      });
   });
}

// after sending, the window stays a moment so the user sees Djinni's answer
const RESULT_PAUSE_MS = 3000;

/** Lets the page after sending load and stay on screen for a moment; the user may have closed it already. */
async function showResult(page: Page): Promise<void> {
   try {
      await page.waitForLoadState("load");
      await page.waitForTimeout(RESULT_PAUSE_MS);
   } catch {
      // closed by the user: nothing to show
   }
}
