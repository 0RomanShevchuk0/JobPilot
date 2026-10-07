import {
   CannotApplyError,
   SessionExpiredError,
   SourceIds,
   type ApplyForm,
   type ApplyFormField,
} from "@jobpilot/contracts";
import type { Page } from "playwright";
import { launchBrowser } from "../browser.js";
import { APPLY_BUTTON, readApplyCheck, SIGN_IN_LINK } from "./account-page.js";
import { openDjinniContext } from "./session.js";

// Djinni names the recruiter's questions after their id: "answer_167872"
const QUESTION_NAME = /^answer_\d+$/;

/** Opens a job page with the user's session and presses "Apply for the job": the form is then on screen. */
export async function openApplyForm(page: Page, jobUrl: string): Promise<void> {
   await page.goto(jobUrl);
   if ((await page.locator(SIGN_IN_LINK).count()) > 0)
      throw new SessionExpiredError(SourceIds.djinni);
   const html = await page.content();
   const applyCheck = readApplyCheck(html);
   if (!applyCheck.canApply) throw new CannotApplyError(SourceIds.djinni, applyCheck.reason);
   await page.locator(APPLY_BUTTON).first().click();
   await page.locator("#apply_form").waitFor({ state: "visible" });
}

/**
 * Opens a job page with the user's session in a browser of its own, presses "Apply for the job" and
 * reads the form that appears. Reads only: nothing is filled in or sent.
 */
export async function readDjinniApplyForm(jobUrl: string, sessionPath: string): Promise<ApplyForm> {
   const browser = await launchBrowser();
   try {
      const context = await openDjinniContext(browser, sessionPath);
      const page = await context.newPage();
      await openApplyForm(page, jobUrl);
      const form = page.locator("#apply_form");

      const fields = await form.evaluate((formEl) => {
         const labelOf = (el: Element): string => {
            const byFor = el.id ? formEl.querySelector(`label[for="${CSS.escape(el.id)}"]`) : null;
            const label =
               byFor ?? el.closest("label") ?? el.closest("fieldset")?.querySelector("legend");
            return (label?.textContent ?? "").replace(/\s+/g, " ").trim(); // runs of whitespace → one space
         };
         const found = new Map<string, ApplyFormFieldInPage>();
         for (const el of formEl.querySelectorAll("input, textarea, select")) {
            const input = el as HTMLInputElement;
            const type = el.tagName === "INPUT" ? input.type : el.tagName.toLowerCase();
            if (!input.name || ["hidden", "submit", "button"].includes(type)) continue;
            const kind = type === "email" || type === "url" || type === "tel" ? "text" : type;
            const existing = found.get(input.name);
            if ((type === "radio" || type === "checkbox") && existing) {
               existing.options?.push(labelOf(el)); // one group per name: its options are the boxes
               continue;
            }
            found.set(input.name, {
               name: input.name,
               label: type === "radio" || type === "checkbox" ? groupLabel(el) : labelOf(el),
               kind,
               required: input.required,
               options:
                  el.tagName === "SELECT"
                     ? [...(el as HTMLSelectElement).options].map((o) => o.text.trim())
                     : type === "radio" || type === "checkbox"
                       ? [labelOf(el)]
                       : undefined,
            });
         }
         return [...found.values()];

         function groupLabel(el: Element): string {
            const group = el.closest("fieldset, .mb-2, .mb-3, .form-group");
            const title = group?.querySelector("legend, .form-label, h3, h4, p");
            return (title?.textContent ?? "").replace(/\s+/g, " ").trim(); // runs of whitespace → one space
         }
         interface ApplyFormFieldInPage {
            name: string;
            label: string;
            kind: string;
            required: boolean;
            options?: string[];
         }
      });

      const all = fields as ApplyFormField[];
      return {
         questions: all.filter((f) => QUESTION_NAME.test(f.name)),
         message: all.find((f) => f.name === "message"),
         other: all.filter((f) => !QUESTION_NAME.test(f.name) && f.name !== "message"),
         html: await form.evaluate((el) => el.outerHTML),
      };
   } finally {
      await browser.close();
   }
}
