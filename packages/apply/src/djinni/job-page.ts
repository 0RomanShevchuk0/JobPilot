import type { ApplyCheck } from "@jobpilot/contracts";
import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";
import { DJINNI_URL, DjinniSessionExpiredError, djinniCookieHeader } from "./session.js";

// "Apply for the job": in the page's HTML from the start, no waiting for it
export const APPLY_BUTTON = "button.js-inbox-toggle-reply-form";
// a page loaded without a valid session offers to sign in
export const SIGN_IN_LINK = "a.sign-in-link";
// on a job applied to already, a card with a link to that dialog replaces the button
const ALREADY_APPLIED = '.card-body a[href^="/my/inbox/"]';
// on a closed job, an alert after the empty apply block: "The job ad is no longer active"
const JOB_CLOSED = "#apply_job ~ .alert";
// the requirements the profile fails, listed in the main column (the sidebar lists all of them)
const UNMET_REQUIREMENTS = ".col-lg-8 .job-matching-info li strong";

// an ordinary desktop Chrome: the page is loaded as the user's own browser would
const USER_AGENT =
   "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";
const TIMEOUT_MS = 30_000;

const JOB_CLOSED_REASON = "The job is no longer active on Djinni";

/**
 * Whether a job page, loaded with the user's session, lets them apply: it shows the "Apply" button, or
 * why not. The page is in the account's language, so only the markup is read, never the wording.
 */
export function readApplyCheck(html: string): ApplyCheck {
   const $ = cheerio.load(html);
   return applyCheckOnPage($);
}

function applyCheckOnPage($: CheerioAPI): ApplyCheck {
   if ($(APPLY_BUTTON).length > 0) return { canApply: true };
   return { canApply: false, reason: whyNoApplyButton($) };
}

function whyNoApplyButton($: CheerioAPI): string {
   if ($(ALREADY_APPLIED).length > 0) return "Already applied to this job on Djinni";
   if ($(JOB_CLOSED).length > 0) return JOB_CLOSED_REASON;
   const unmet = $(UNMET_REQUIREMENTS)
      .toArray()
      .map((el) => $(el).text().replace(/\s+/g, " ").trim()) // "English\n   C1 - Advanced" → "English C1 - Advanced"
      .filter(Boolean);
   if (unmet.length > 0) {
      const requirements = unmet.join(", ");
      return `Your Djinni profile doesn't meet the job's requirements: ${requirements}`;
   }
   return "Djinni shows no Apply button on this job";
}

/**
 * Asks Djinni whether the user can apply to a job: loads its page with their session over plain HTTP,
 * no browser. Throws DjinniSessionExpiredError when the session is missing or over.
 */
export async function checkCanApply(jobUrl: string, sessionPath: string): Promise<ApplyCheck> {
   const cookie = await djinniCookieHeader(sessionPath);
   const response = await fetch(jobUrl, {
      headers: { cookie, "User-Agent": USER_AGENT, Referer: `${DJINNI_URL}/jobs/` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
   });
   if (response.status === 404 || response.status === 410) {
      return { canApply: false, reason: JOB_CLOSED_REASON };
   }
   if (response.status !== 200) throw new Error(`djinni ${jobUrl}: HTTP ${response.status}`);
   const html = await response.text();
   const $ = cheerio.load(html);
   if ($(SIGN_IN_LINK).length > 0) throw new DjinniSessionExpiredError();
   return applyCheckOnPage($);
}
