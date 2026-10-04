import type { BrowserContext, Page } from "playwright";
import { DjinniSessionExpiredError } from "./session.js";

export interface FillValue {
   /** the input's name in the form */
   name: string;
   value: string;
}

export type FillOutcome =
   | { status: "submitted"; screenshot?: Uint8Array }
   /** the user closed the window or let it sit too long: nothing was sent */
   | { status: "cancelled" };

// how long the window waits for the user to send or close it
const REVIEW_TIMEOUT_MS = 30 * 60_000;
// "https://djinni.co/jobs/850626-full-stack-…/" → "850626"
const JOB_ID_IN_URL = /\/jobs\/(\d+)-/;
// a pause between fields, so the user can follow what is being filled in
const STEP_PAUSE_MS = 400;

/**
 * Opens a job's application form in the given (visible) browser, fills in the values and hands over to
 * the user: they review, edit if they like, and press "Send application" themselves, or close the
 * window. Never sends anything on its own. Resolves once the form was sent or the window closed.
 */
export async function fillDjinniApplication(
   context: BrowserContext,
   jobUrl: string,
   values: FillValue[],
): Promise<FillOutcome> {
   const page = await context.newPage();
   await page.goto(jobUrl);
   if ((await page.locator("a.sign-in-link").count()) > 0) {
      await page.close();
      throw new DjinniSessionExpiredError();
   }
   await page.locator("button.js-inbox-toggle-reply-form").first().click();
   await page.locator("#apply_form").waitFor({ state: "visible" });

   for (const { name, value } of values) {
      const field = page.locator(`#apply_form [name="${name}"]`).first();
      await field.scrollIntoViewIfNeeded();
      await field.fill(value);
      await page.waitForTimeout(STEP_PAUSE_MS);
   }
   await page.locator("#job_apply").scrollIntoViewIfNeeded();

   const jobId = JOB_ID_IN_URL.exec(jobUrl)?.[1];
   if (!jobId) throw new Error(`not a Djinni job URL: ${jobUrl}`);
   return waitForUser(page, jobId);
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
         // sent: from here on it counts as submitted, whatever happens to the screenshot
         finish(
            () =>
               void screenshotOf(page).then((screenshot) =>
                  resolve({ status: "submitted", screenshot }),
               ),
         );
      });
   });
}

/** The page after sending, as proof; undefined when the user closed it too soon. */
async function screenshotOf(page: Page): Promise<Uint8Array | undefined> {
   try {
      await page.waitForLoadState("load");
      const screenshot = await page.screenshot({ fullPage: true });
      await page.close();
      return screenshot;
   } catch {
      return undefined;
   }
}
