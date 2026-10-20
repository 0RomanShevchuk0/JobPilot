import { visibleForm, type SitePage } from "../page/site-page.js";
import {
   APPLY_BUTTON_SELECTOR,
   APPLY_FORM_SELECTOR,
   SEND_BUTTON_SELECTOR,
   SIGN_IN_LINK_SELECTOR,
} from "./selectors.js";

// "https://djinni.co/jobs/850626-full-stack-…/" → "850626"
const JOB_ID_IN_URL = /\/jobs\/(\d+)-/;

/** Djinni's application form, filled in on the job page in the user's browser. */
export const djinniPage: SitePage = {
   async openForm(document) {
      if (document.querySelector(SIGN_IN_LINK_SELECTOR)) {
         throw new Error("Not logged in to Djinni in this browser: log in there, then fill again");
      }
      const button = document.querySelector<HTMLElement>(APPLY_BUTTON_SELECTOR);
      if (!button) {
         throw new Error(
            "Djinni shows no Apply button on this job: closed, applied to already, or the profile doesn't meet its requirements",
         );
      }
      button.click();
      return visibleForm(document, APPLY_FORM_SELECTOR);
   },

   sendButton: (form) => form.querySelector<HTMLElement>(SEND_BUTTON_SELECTOR),

   // pressing "Send application" posts the form to the job's own page
   isFormSubmission(requestUrl, jobUrl) {
      const jobId = JOB_ID_IN_URL.exec(jobUrl)?.[1];
      return jobId !== undefined && requestUrl.includes(`/jobs/${jobId}`);
   },

   /**
    * The application went through when the "Apply" button is gone from the page Djinni answered with
    * (the job page then links to the dialog). A rejected form comes back on the job page, the button
    * still there, with "Перегляньте форму" and the fields to fix.
    */
   isFormAccepted: (document) => document.querySelector(APPLY_BUTTON_SELECTOR) === null,
};
