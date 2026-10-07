export { createDjinniAdapter } from "./djinni/adapter.js";
export { DJINNI_BASE_URL } from "./djinni/rss.js";
export { createDouAdapter } from "./dou/adapter.js";
export { DOU_BASE_URL } from "./dou/rss.js";

// Djinni's account side, still called by the worker directly: each goes behind the adapter's account
// as the contract grows to cover it
export { launchBrowser, type LaunchOptions } from "./browser.js";
export {
   DjinniCannotApplyError,
   readDjinniApplyForm,
   type ApplyForm,
   type ApplyFormField,
} from "./djinni/apply-form.js";
export { fillDjinniApplication, type FillOutcome, type FillValue } from "./djinni/fill.js";
export { openDjinniContext } from "./djinni/session.js";
