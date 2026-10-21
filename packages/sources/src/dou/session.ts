import { SessionExpiredError, type SiteSession } from "@jobpilot/contracts";
import * as cheerio from "cheerio";
import { getText } from "../http.js";
import { loginInChrome, readSessionFile, sessionCookieHeader } from "../saved-session.js";
import { LOGIN_BUTTON_SELECTOR } from "./selectors.js";
import { DOU_BASE_URL, DOU_COOKIE_DOMAIN, DOU_NAME } from "./site.js";

/** Logs in to DOU in the real Chrome (see loginInChrome) and checks the saved session works. */
export async function loginToDou(sessionPath: string): Promise<void> {
   // one account for all of dou.ua: the login page is on the main site, the session works on jobs.dou.ua
   const site = {
      name: DOU_NAME,
      loginUrl: `https://${DOU_COOKIE_DOMAIN}/login/`,
      domain: DOU_COOKIE_DOMAIN,
   };
   await loginInChrome(site, sessionPath);
   const session = await readSessionFile(sessionPath, DOU_NAME);
   if (!(await isLoggedIn(session))) throw new SessionExpiredError(DOU_NAME);
}

/** Loads the jobs page with the session, over plain HTTP: the header shows who is logged in. */
async function isLoggedIn(session: SiteSession): Promise<boolean> {
   const cookie = sessionCookieHeader(session);
   const res = await getText(`${DOU_BASE_URL}/`, { cookie });
   if (res.status !== 200) throw new Error(`dou ${DOU_BASE_URL}/: HTTP ${res.status}`);
   const $ = cheerio.load(res.body);
   return $(LOGIN_BUTTON_SELECTOR).length === 0;
}
