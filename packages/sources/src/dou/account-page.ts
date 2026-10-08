import { SessionExpiredError, type ApplyCheck, type JobPageResult } from "@jobpilot/contracts";
import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";
import { getText } from "../http.js";
import { sessionCookieHeader } from "../saved-session.js";
import { CLOSED_JOB_SELECTOR, EXTERNAL_APPLY_SELECTOR } from "./job-page.js";
import { LOGIN_BUTTON_SELECTOR } from "./session.js";
import { DOU_NAME } from "./site.js";

// "Відгукнутися" opening DOU's own form: shown to a logged-in user who hasn't applied yet
export const APPLY_BUTTON_SELECTOR = ".reply #reply-btn-id";
// on a job applied to already, the form says so instead: "Ви відгукнулись на цю вакансію"
const ALREADY_APPLIED_SELECTOR = "form#replied-id.sent";

/**
 * What DOU shows the user on a job page: whether they can apply, or that the job is gone (closed or
 * removed). Loads the page with their session over plain HTTP, no browser. DOU says nothing of the
 * salary against the user's expectations. Throws SessionExpiredError when the session is missing or over.
 */
export async function checkDouJobPage(jobUrl: string, sessionPath: string): Promise<JobPageResult> {
   const cookie = await sessionCookieHeader(sessionPath, DOU_NAME);
   const res = await getText(jobUrl, { cookie });
   if (res.status === 404 || res.status === 410) return { status: "gone" };
   if (res.status !== 200) throw new Error(`dou ${jobUrl}: HTTP ${res.status}`);
   return readJobPage(res.body);
}

/** The job page as loaded with the session; throws SessionExpiredError when DOU didn't accept it. */
export function readJobPage(html: string): JobPageResult {
   const $ = cheerio.load(html);
   if ($(LOGIN_BUTTON_SELECTOR).length > 0) throw new SessionExpiredError(DOU_NAME);
   if ($(CLOSED_JOB_SELECTOR).length > 0) return { status: "gone" };
   return { status: "ok", check: { applyCheck: applyCheckOnPage($) } };
}

/**
 * DOU's own form or a link to the employer's site both let the user apply; only the first goes through
 * DOU, which is for applying to tell apart.
 */
function applyCheckOnPage($: CheerioAPI): ApplyCheck {
   if ($(ALREADY_APPLIED_SELECTOR).length > 0) {
      return { canApply: false, reason: "Already applied to this job on DOU" };
   }
   if ($(APPLY_BUTTON_SELECTOR).length > 0 || $(EXTERNAL_APPLY_SELECTOR).length > 0) {
      return { canApply: true };
   }
   return { canApply: false, reason: "DOU shows no way to apply to this job" };
}
