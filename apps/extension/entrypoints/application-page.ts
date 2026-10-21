import { defineUnlistedScript } from "wxt/utils/define-unlisted-script";
import { PAGE_FUNCTIONS } from "../features/applications/page-calls.js";
import { fillOnPage, isFormAcceptedOnPage } from "../features/applications/page/fill.js";
import { showNoticeOnPage } from "../features/applications/page/notice.js";

/*
 * Injected by the background into the tab of an application, on the job page: registers the functions
 * the background then calls (features/applications/in-tab.ts). Runs in the extension's own world on the
 * page, apart from the site's scripts.
 */
export default defineUnlistedScript(() => {
   Object.assign(globalThis, {
      [PAGE_FUNCTIONS.fill]: fillOnPage,
      [PAGE_FUNCTIONS.isFormAccepted]: isFormAcceptedOnPage,
      [PAGE_FUNCTIONS.showNotice]: showNoticeOnPage,
   });
});
