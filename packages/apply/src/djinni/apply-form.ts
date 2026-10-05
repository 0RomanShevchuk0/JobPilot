import type { FormFieldKind } from "@jobpilot/contracts";
import type { BrowserContext, Page } from "playwright";
import { DjinniSessionExpiredError } from "./session.js";

/**
 * Djinni offers no application form on this job: applied already, the job is closed, or the profile
 * doesn't meet its requirements. The message says which, for the user to read.
 */
export class DjinniCannotApplyError extends Error {}

/** One field of the Djinni application form, as the page shows it. */
export interface ApplyFormField {
   /** the input's name, to fill it later */
   name: string;
   label: string;
   kind: FormFieldKind;
   required: boolean;
   /** for select, radio and checkbox groups */
   options?: string[];
}

export interface ApplyForm {
   /** the recruiter's questions, in the form's order */
   questions: ApplyFormField[];
   /** the message to the recruiter; Djinni makes it required on some jobs */
   message?: ApplyFormField;
   /** every other field (CV choice, salary, message templates): Djinni's defaults are kept */
   other: ApplyFormField[];
   /** the form's HTML as rendered, to see what the parser missed */
   html: string;
}

// Djinni names the recruiter's questions after their id: "answer_167872"
const QUESTION_NAME = /^answer_\d+$/;
// "Apply for the job": in the page's HTML from the start, no waiting for it
const APPLY_BUTTON = "button.js-inbox-toggle-reply-form";
// on a job applied to already, a card with a link to that dialog replaces the button
const ALREADY_APPLIED = '.card-body a[href^="/my/inbox/"]';
// on a closed job, an alert after the empty apply block: "The job ad is no longer active"
const JOB_CLOSED = "#apply_job ~ .alert";
// the requirements the profile fails, listed in the main column (the sidebar lists all of them)
const UNMET_REQUIREMENTS = ".col-lg-8 .job-matching-info li strong";

/** Opens a job page with the user's session and presses "Apply for the job": the form is then on screen. */
export async function openApplyForm(page: Page, jobUrl: string): Promise<void> {
   await page.goto(jobUrl);
   if ((await page.locator("a.sign-in-link").count()) > 0) throw new DjinniSessionExpiredError();
   const button = page.locator(APPLY_BUTTON).first();
   if ((await button.count()) === 0) throw new DjinniCannotApplyError(await whyNoApplyButton(page));
   await button.click();
   await page.locator("#apply_form").waitFor({ state: "visible" });
}

/** Why a job page has no "Apply" button, as the page tells it. */
async function whyNoApplyButton(page: Page): Promise<string> {
   if ((await page.locator(ALREADY_APPLIED).count()) > 0)
      return "Already applied to this job on Djinni";
   if ((await page.locator(JOB_CLOSED).count()) > 0) return "The job is no longer active on Djinni";
   const unmet = (await page.locator(UNMET_REQUIREMENTS).allInnerTexts())
      .map((text) => text.replace(/\s+/g, " ").trim()) // "English\n   C1 - Advanced" → "English C1 - Advanced"
      .filter(Boolean);
   if (unmet.length > 0) {
      return `Your Djinni profile doesn't meet the job's requirements: ${unmet.join(", ")}`;
   }
   return "Djinni shows no Apply button on this job";
}

/**
 * Opens a job page with the user's session, presses "Apply for the job" and reads the form that
 * appears. Reads only: nothing is filled in or sent.
 */
export async function readDjinniApplyForm(
   context: BrowserContext,
   jobUrl: string,
): Promise<ApplyForm> {
   const page = await context.newPage();
   try {
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
      await page.close();
   }
}
