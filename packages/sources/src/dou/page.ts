import { waitForVisibleForm, type SitePage } from "../page/site-page.js";
import {
   ALREADY_APPLIED_SELECTOR,
   APPLY_BUTTON_SELECTOR,
   APPLY_FORM_SELECTOR,
   EXTERNAL_APPLY_SELECTOR,
   LOGIN_BUTTON_SELECTOR,
} from "./selectors.js";

/** DOU's application form, filled in on the job page in the user's browser. */
export const douPage: SitePage = {
   async openForm(document) {
      if (document.querySelector(LOGIN_BUTTON_SELECTOR)) {
         throw new Error("Not logged in to DOU in this browser: log in there, then fill again");
      }
      const external = document.querySelector<HTMLAnchorElement>(EXTERNAL_APPLY_SELECTOR)?.href;
      if (external) throw new Error(`This job is applied to on the employer's site: ${external}`);
      const button = document.querySelector<HTMLElement>(APPLY_BUTTON_SELECTOR);
      if (!button) {
         throw new Error(
            "DOU shows no Відгукнутися button on this job: closed or applied to already",
         );
      }
      button.click();
      return waitForVisibleForm(document, APPLY_FORM_SELECTOR);
   },

   // the form has no action: "Відправити" posts it to the job's own page
   isFormSubmission: (requestUrl, jobUrl) =>
      new URL(requestUrl).pathname === new URL(jobUrl).pathname,

   /**
    * The post reloads the job page (DOU's script submits the form natively): the application went
    * through when the form there is marked sent, "Ви відгукнулись на цю вакансію".
    */
   isFormAccepted: (document) => document.querySelector(ALREADY_APPLIED_SELECTOR) !== null,
};
