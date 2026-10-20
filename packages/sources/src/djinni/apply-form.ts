import {
   CannotApplyError,
   SessionExpiredError,
   type ApplyForm,
   type ApplyFormField,
   type SiteSession,
} from "@jobpilot/contracts";
import * as cheerio from "cheerio";
import type { Cheerio, CheerioAPI } from "cheerio";
import type { Element } from "domhandler";
import type { Page } from "playwright";
import { fieldKind } from "../form-field-kind.js";
import { getText } from "../http.js";
import { sessionCookieHeader } from "../saved-session.js";
import { applyCheckOnPage, readApplyCheck } from "./account-page.js";
import { APPLY_BUTTON_SELECTOR, APPLY_FORM_SELECTOR, SIGN_IN_LINK_SELECTOR } from "./selectors.js";
import { DJINNI_BASE_URL, DJINNI_NAME } from "./site.js";

// Djinni names the recruiter's questions after their id: "answer_167872"
const QUESTION_NAME = /^answer_\d+$/;
// what holds a group of radios or checkboxes with its title
const CHOICE_GROUP_SELECTOR = "fieldset, .mb-2, .mb-3, .form-group";
const CHOICE_GROUP_TITLE_SELECTOR = "legend, .form-label, h3, h4, p";

/** Opens a job page with the user's session and presses "Apply for the job": the form is then on screen. */
export async function openApplyForm(page: Page, jobUrl: string): Promise<void> {
   await page.goto(jobUrl);
   if ((await page.locator(SIGN_IN_LINK_SELECTOR).count()) > 0)
      throw new SessionExpiredError(DJINNI_NAME);
   const html = await page.content();
   const applyCheck = readApplyCheck(html);
   if (!applyCheck.canApply) throw new CannotApplyError(applyCheck.reason);
   await page.locator(APPLY_BUTTON_SELECTOR).first().click();
   await page.locator(APPLY_FORM_SELECTOR).waitFor({ state: "visible" });
}

/**
 * Reads the job's application form, loading the page with the user's session over plain HTTP: the form
 * is in the page as it comes, so no browser is needed. Reads only: nothing is filled in or sent. Throws
 * SessionExpiredError, or CannotApplyError when Djinni offers no form.
 */
export async function readDjinniApplyForm(
   jobUrl: string,
   session: SiteSession,
): Promise<ApplyForm> {
   const cookie = sessionCookieHeader(session);
   const res = await getText(jobUrl, { cookie, Referer: `${DJINNI_BASE_URL}/jobs/` });
   if (res.status === 404 || res.status === 410) {
      throw new CannotApplyError("The job is no longer on Djinni");
   }
   if (res.status !== 200) throw new Error(`djinni ${jobUrl}: HTTP ${res.status}`);
   return readApplyFormOnPage(res.body);
}

/** The form on a job page loaded with the session; throws as readDjinniApplyForm does. */
export function readApplyFormOnPage(html: string): ApplyForm {
   const $ = cheerio.load(html);
   if ($(SIGN_IN_LINK_SELECTOR).length > 0) throw new SessionExpiredError(DJINNI_NAME);
   const applyCheck = applyCheckOnPage($);
   if (!applyCheck.canApply) throw new CannotApplyError(applyCheck.reason);
   const form = $(APPLY_FORM_SELECTOR).first();
   if (form.length === 0)
      throw new CannotApplyError("Djinni shows no application form on this job");

   const fields = readFields($, form);
   return {
      questions: fields.filter((f) => QUESTION_NAME.test(f.name)),
      message: fields.find((f) => f.name === "message"),
      other: fields.filter((f) => !QUESTION_NAME.test(f.name) && f.name !== "message"),
      html: $.html(form),
   };
}

/** The inputs to fill in, in the form's order; radios and checkboxes of a name are one field. */
function readFields($: CheerioAPI, form: Cheerio<Element>): ApplyFormField[] {
   const found = new Map<string, ApplyFormField>();
   for (const el of form.find("input, textarea, select").toArray()) {
      const input = $(el);
      const name = input.attr("name");
      const type = el.tagName === "input" ? (input.attr("type") ?? "text") : el.tagName;
      if (!name || ["hidden", "submit", "button"].includes(type)) continue;
      const isChoice = type === "radio" || type === "checkbox";
      const existing = found.get(name);
      if (isChoice && existing) {
         existing.options?.push(labelOf($, el)); // one group per name: its options are the boxes
         continue;
      }
      found.set(name, {
         name,
         label: isChoice ? groupLabel($, el) : labelOf($, el),
         kind: fieldKind(type),
         required: input.attr("required") !== undefined,
         options:
            type === "select"
               ? input
                    .find("option")
                    .toArray()
                    .map((o) => $(o).text().trim())
               : isChoice
                 ? [labelOf($, el)]
                 : undefined,
      });
   }
   return [...found.values()];
}

/** An input's own label: the one pointing at it, the one around it, or its fieldset's legend. */
function labelOf($: CheerioAPI, el: Element): string {
   const id = $(el).attr("id");
   const byFor = id ? $(`label[for="${id}"]`).first() : undefined;
   const label = byFor?.length
      ? byFor
      : $(el).closest("label").length
        ? $(el).closest("label")
        : $(el).closest("fieldset").find("legend").first();
   return cleanText(label.text());
}

/** The title over a group of radios or checkboxes, where each box has a label of its own. */
function groupLabel($: CheerioAPI, el: Element): string {
   const group = $(el).closest(CHOICE_GROUP_SELECTOR);
   return cleanText(group.find(CHOICE_GROUP_TITLE_SELECTOR).first().text());
}

const cleanText = (text: string) => text.replace(/\s+/g, " ").trim(); // runs of whitespace → one space
