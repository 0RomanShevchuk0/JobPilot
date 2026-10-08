import { SessionExpiredError } from "@jobpilot/contracts";
import type { Page } from "playwright";
import { launchBrowser } from "../browser.js";
import { loginInChrome, openSessionContext } from "../saved-session.js";
import { DJINNI_BASE_URL, DJINNI_NAME } from "./site.js";

/** Logs in to Djinni in the real Chrome (see loginInChrome) and checks the saved session works. */
export async function loginToDjinni(sessionPath: string): Promise<void> {
   const site = { name: DJINNI_NAME, loginUrl: `${DJINNI_BASE_URL}/login`, domain: "djinni.co" };
   await loginInChrome(site, sessionPath);

   const browser = await launchBrowser();
   try {
      const context = await openSessionContext(browser, sessionPath, DJINNI_NAME);
      const page = await context.newPage();
      if (!(await isLoggedIn(page))) throw new SessionExpiredError(DJINNI_NAME);
   } finally {
      await browser.close();
   }
}

/** Djinni shows "Log In" links to anonymous visitors only. */
async function isLoggedIn(page: Page): Promise<boolean> {
   await page.goto(`${DJINNI_BASE_URL}/jobs/`);
   return (await page.locator("a.sign-in-link").count()) === 0;
}
