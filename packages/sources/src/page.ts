import { djinniPage } from "./djinni/page.js";
import {
   DJINNI_BASE_URL,
   DJINNI_COOKIE_DOMAIN,
   DJINNI_ID,
   DJINNI_LOGIN_COOKIE,
   DJINNI_NAME,
} from "./djinni/site.js";
import { douPage } from "./dou/page.js";
import { DOU_BASE_URL, DOU_COOKIE_DOMAIN, DOU_ID, DOU_LOGIN_COOKIE, DOU_NAME } from "./dou/site.js";
import type { SitePage } from "./page/site-page.js";

/*
 * The job sites as the user's browser works with them (the extension): their session's cookies, their
 * pages, filling the application form there. The package's own entry (@jobpilot/sources/page), DOM
 * only, so the browser gets this without the adapters and their Node dependencies. A new source goes
 * here as well as into the worker's sources.
 */

export { fillFields, type PageFillValue } from "./page/fill-fields.js";
export type { SitePage } from "./page/site-page.js";

/** A job site in the user's browser. */
export interface BrowserSite {
   /** the source's id in the API and the database, e.g. "djinni" */
   source: string;
   /** the job site's name to show, e.g. "Djinni" */
   name: string;
   /** the cookies of this domain and its subdomains are the user's session */
   cookieDomain: string;
   /** the cookie the site keeps the login in: the session changes with it, the rest is analytics */
   loginCookie: string;
   /** where the site lives: the session's cookies and the job pages, e.g. "https://djinni.co" */
   origins: string[];
   /** filling the application form on its job pages */
   page: SitePage;
}

export const browserSites: BrowserSite[] = [
   {
      source: DJINNI_ID,
      name: DJINNI_NAME,
      cookieDomain: DJINNI_COOKIE_DOMAIN,
      loginCookie: DJINNI_LOGIN_COOKIE,
      origins: [DJINNI_BASE_URL],
      page: djinniPage,
   },
   {
      source: DOU_ID,
      name: DOU_NAME,
      cookieDomain: DOU_COOKIE_DOMAIN,
      loginCookie: DOU_LOGIN_COOKIE,
      // the login cookies are on dou.ua, the jobs with their forms on jobs.dou.ua
      origins: [`https://${DOU_COOKIE_DOMAIN}`, DOU_BASE_URL],
      page: douPage,
   },
];
