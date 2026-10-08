import { SessionExpiredError } from "@jobpilot/contracts";
import * as cheerio from "cheerio";
import { getText } from "../http.js";
import { loginInChrome, sessionCookieHeader } from "../saved-session.js";
import { DOU_BASE_URL, DOU_NAME } from "./site.js";

// "Вхід і реєстрація" in the header, opens the login dialog: on every page, for anonymous visitors only
export const LOGIN_BUTTON_SELECTOR = "#login-link";

/** Logs in to DOU in the real Chrome (see loginInChrome) and checks the saved session works. */
export async function loginToDou(sessionPath: string): Promise<void> {
   // one account for all of dou.ua: the login page is on the main site, the session works on jobs.dou.ua
   const site = { name: DOU_NAME, loginUrl: "https://dou.ua/login/", domain: "dou.ua" };
   await loginInChrome(site, sessionPath);
   if (!(await isLoggedIn(sessionPath))) throw new SessionExpiredError(DOU_NAME);
}

/** Loads the jobs page with the session, over plain HTTP: the header shows who is logged in. */
async function isLoggedIn(sessionPath: string): Promise<boolean> {
   const cookie = await sessionCookieHeader(sessionPath, DOU_NAME);
   const res = await getText(`${DOU_BASE_URL}/`, { cookie });
   if (res.status !== 200) throw new Error(`dou ${DOU_BASE_URL}/: HTTP ${res.status}`);
   const $ = cheerio.load(res.body);
   return $(LOGIN_BUTTON_SELECTOR).length === 0;
}
