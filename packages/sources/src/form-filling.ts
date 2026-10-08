import type { FillOutcome, FillValue } from "@jobpilot/contracts";
import type { Locator, Page, Request } from "playwright";

// slows every browser action down a little, so the user can follow the filling
export const SLOW_MO_MS = 150;
// a pause between fields, so the user can follow what is being filled in
const STEP_PAUSE_MS = 200;
// how long the window waits for the user to send or close it
const REVIEW_TIMEOUT_MS = 30 * 60_000;
// after sending, the window stays a moment so the user sees the site's answer
const RESULT_PAUSE_MS = 3000;

/** Puts the values into the form one by one, with a pause between them for the user to follow. */
export async function fillFields(form: Locator, values: FillValue[]): Promise<void> {
   for (const value of values) {
      await fillField(form, value);
      await form.page().waitForTimeout(STEP_PAUSE_MS);
   }
}

/**
 * Puts one value into the form the way its kind takes it: typed in, an option checked or selected,
 * a file attached.
 */
async function fillField(form: Locator, { name, kind, value }: FillValue): Promise<void> {
   const inputs = form.locator(`[name="${name}"]`);
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
      case "file":
         // the value is the path of a local file
         await inputs.first().setInputFiles(value);
         return;
      default:
         throw new Error(`Filling a ${kind} field is not supported yet ("${name}")`);
   }
}

/**
 * Waits for the user with the filled-in form: a POST that isSending tells apart is them sending it
 * (any status below 400: sites answer a form post with a redirect); the page closing is them giving up,
 * and so is the window sitting too long.
 */
export function waitForUser(
   page: Page,
   isSending: (request: Request) => boolean,
   siteName: string,
): Promise<FillOutcome> {
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
         if (request.method() !== "POST" || !isSending(request)) return;
         if (response.status() >= 400) {
            finish(() =>
               reject(new Error(`${siteName} answered ${response.status()} to the application`)),
            );
            return;
         }
         // sent: from here on it counts as submitted, whatever happens to the page
         finish(() => void showResult(page).then(() => resolve({ status: "submitted" })));
      });
   });
}

/** Lets the page after sending load and stay on screen for a moment; the user may have closed it already. */
async function showResult(page: Page): Promise<void> {
   try {
      await page.waitForLoadState("load");
      await page.waitForTimeout(RESULT_PAUSE_MS);
   } catch {
      // closed by the user: nothing to show
   }
}
