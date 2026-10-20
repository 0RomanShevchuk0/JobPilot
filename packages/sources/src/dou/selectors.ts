// DOU's markup that both reading its pages (cheerio) and filling the form in the browser (/page) go by:
// dependency-free, so the browser gets these without the rest.

// "Вхід і реєстрація" in the header, opens the login dialog: on every page, for anonymous visitors only
export const LOGIN_BUTTON_SELECTOR = "#login-link";
// "Відгукнутися" opening DOU's own form: shown to a logged-in user who hasn't applied yet
export const APPLY_BUTTON_SELECTOR = ".reply #reply-btn-id";
// applying goes through DOU's redirect to the employer's site or ATS
export const EXTERNAL_APPLY_SELECTOR = ".reply a.replied-external";
// DOU's application form: in the page from the start, hidden until "Відгукнутися" is pressed
export const APPLY_FORM_SELECTOR = "form#replied-id";
// "Відправити": the user presses it themselves
export const SEND_BUTTON_SELECTOR = ".replied-btn.send";
// on a job applied to already, and on the page DOU answers a sent form with, the form says so instead:
// "Ви відгукнулись на цю вакансію"
export const ALREADY_APPLIED_SELECTOR = "form#replied-id.sent";
