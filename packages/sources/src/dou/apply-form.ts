import { CannotApplyError, type ApplyForm, type ApplyFormField } from "@jobpilot/contracts";
import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";
import type { Element } from "domhandler";
import { getText } from "../http.js";
import { sessionCookieHeader } from "../saved-session.js";
import { readJobPage } from "./account-page.js";
import { EXTERNAL_APPLY_SELECTOR } from "./job-page.js";
import { DOU_NAME } from "./site.js";

// DOU's application form: in the page from the start, hidden until "Відгукнутися" is pressed
export const APPLY_FORM_SELECTOR = "form#replied-id";
// "Напишіть трохи про себе і про те, чому вакансія вам підходить": the message to the recruiter
const MESSAGE_NAME = "descr";
// "Прикріпіть резюме": DOU won't send the form without a CV, unless the message has a link
const CV_NAME = "user_cv";

/**
 * Reads the job's application form, loading the page with the user's session over plain HTTP: DOU's
 * form is in the page as it comes. Reads only: nothing is filled in or sent. Throws SessionExpiredError,
 * or CannotApplyError when there is no form to fill in on DOU.
 */
export async function readDouApplyForm(jobUrl: string, sessionPath: string): Promise<ApplyForm> {
   const cookie = await sessionCookieHeader(sessionPath, DOU_NAME);
   const res = await getText(jobUrl, { cookie });
   if (res.status === 404 || res.status === 410) {
      throw new CannotApplyError("The job is no longer on DOU");
   }
   if (res.status !== 200) throw new Error(`dou ${jobUrl}: HTTP ${res.status}`);
   return readApplyFormOnPage(res.body);
}

/** The form on a job page loaded with the session; throws as readDouApplyForm does. */
export function readApplyFormOnPage(html: string): ApplyForm {
   checkFormToFill(html);
   const $ = cheerio.load(html);
   const form = $(APPLY_FORM_SELECTOR).first();
   const fields = form
      .find("input, textarea, select")
      .toArray()
      .map((el) => fieldOf($, el))
      .filter((field) => field !== undefined);
   return {
      // DOU's form has no questions from the recruiter
      questions: [],
      message: fields.find((f) => f.name === MESSAGE_NAME),
      cv: fields.find((f) => f.name === CV_NAME),
      other: fields.filter((f) => f.name !== MESSAGE_NAME && f.name !== CV_NAME),
      html: $.html(form),
   };
}

/**
 * Throws unless the job page, loaded with the session, has DOU's own form for the user to fill in:
 * SessionExpiredError without a session, CannotApplyError when applying can't go through DOU.
 */
export function checkFormToFill(html: string): void {
   const result = readJobPage(html); // throws SessionExpiredError without a session
   const $ = cheerio.load(html);
   if (result.status === "gone") throw new CannotApplyError("The job is no longer active on DOU");
   const { applyCheck } = result.check;
   if (!applyCheck.canApply) throw new CannotApplyError(applyCheck.reason);
   const external = $(EXTERNAL_APPLY_SELECTOR).attr("href");
   if (external) {
      throw new CannotApplyError(`This job is applied to on the employer's site: ${external}`);
   }
   if ($(APPLY_FORM_SELECTOR).length === 0) {
      throw new CannotApplyError("DOU shows no application form on this job");
   }
}

/** One input of the form as the contract describes it; undefined for what isn't filled in. */
function fieldOf($: CheerioAPI, el: Element): ApplyFormField | undefined {
   const input = $(el);
   const name = input.attr("name");
   const type = el.tagName === "input" ? (input.attr("type") ?? "text") : el.tagName;
   if (!name || ["hidden", "submit", "button"].includes(type)) return undefined;
   const id = input.attr("id");
   const label = id ? $(`label[for="${id}"]`).text() : "";
   return {
      name,
      label: label.replace(/\s+/g, " ").trim(), // runs of whitespace → one space
      kind: kindOf(type),
      required: input.attr("required") !== undefined,
      options:
         type === "select"
            ? input
                 .find("option")
                 .toArray()
                 .map((o) => $(o).text().trim())
            : undefined,
   };
}

function kindOf(type: string): ApplyFormField["kind"] {
   switch (type) {
      case "textarea":
      case "select":
      case "file":
      case "number":
      case "radio":
      case "checkbox":
         return type;
      default:
         return "text"; // text, email, tel, url: typed in alike
   }
}
