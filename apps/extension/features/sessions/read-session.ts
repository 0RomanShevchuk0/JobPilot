import type { SiteSession } from "@jobpilot/contracts";
import type { BrowserSite } from "@jobpilot/sources/page";
import { browser, type Browser } from "wxt/browser";

type Cookie = Browser.cookies.Cookie;
type SameSite = SiteSession["cookies"][number]["sameSite"];

const SAME_SITE: Record<Cookie["sameSite"], SameSite> = {
   strict: "Strict",
   lax: "Lax",
   no_restriction: "None",
   // set without the attribute: Chrome treats it as Lax
   unspecified: "Lax",
};

/**
 * The user's session on the site, as the browser has it, in the format the worker's browser takes.
 * Undefined when the user isn't logged in there: a session without the login cookie isn't one.
 * The site's localStorage stays out, the extension's background can't read it and no site needs it.
 */
export async function readSiteSession(site: BrowserSite): Promise<SiteSession | undefined> {
   const cookies = await browser.cookies.getAll({ domain: site.cookieDomain });
   if (!cookies.some((c) => c.name === site.loginCookie)) return undefined;
   return { cookies: cookies.map(toSessionCookie), origins: [] };
}

function toSessionCookie(cookie: Cookie): SiteSession["cookies"][number] {
   return {
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path,
      expires: cookie.expirationDate ?? -1, // none: lives as long as the browser session
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: SAME_SITE[cookie.sameSite],
   };
}

/** Whether a cookie's domain is the site's or a subdomain's: ".djinni.co", "djinni.co", "www.djinni.co". */
export function isSiteCookie(site: BrowserSite, cookieDomain: string): boolean {
   const host = cookieDomain.replace(/^\./, ""); // ".djinni.co" → "djinni.co"
   return host === site.cookieDomain || host.endsWith(`.${site.cookieDomain}`);
}
