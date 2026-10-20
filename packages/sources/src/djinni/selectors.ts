// Djinni's markup that both reading its pages (cheerio) and filling the form in the browser (/page) go
// by: dependency-free, so the browser gets these without the rest.

// "Apply for the job": in the page's HTML from the start, no waiting for it
export const APPLY_BUTTON_SELECTOR = "button.js-inbox-toggle-reply-form";
// a page loaded without a valid session offers to sign in
export const SIGN_IN_LINK_SELECTOR = "a.sign-in-link";
// Djinni's application form: in the page from the start, hidden until "Apply for the job" is pressed
export const APPLY_FORM_SELECTOR = "#apply_form";
// "Send application": the user presses it themselves
export const SEND_BUTTON_SELECTOR = "#job_apply";
