/** A job site whose session the extension sends to the API. */
export interface Site {
   /** the source's id in the API and the database, e.g. "djinni" */
   source: string;
   /** the job site's name to show, e.g. "Djinni" */
   name: string;
   /** the cookies of this domain and its subdomains are the session */
   domain: string;
   /**
    * The cookie the site keeps the login in: the session is sent when it changes. The other cookies
    * (analytics mostly) change on nearly every page, saying nothing new about the login.
    */
   loginCookie: string;
}

export const SITES: Site[] = [
   { source: "djinni", name: "Djinni", domain: "djinni.co", loginCookie: "sessionid" },
   { source: "dou", name: "DOU", domain: "dou.ua", loginCookie: "sessionid" },
];

/** Whether a cookie's domain is the site's or a subdomain's: ".djinni.co", "djinni.co", "www.djinni.co". */
export function isSiteCookie(site: Site, cookieDomain: string): boolean {
   const host = cookieDomain.replace(/^\./, ""); // ".djinni.co" → "djinni.co"
   return host === site.domain || host.endsWith(`.${site.domain}`);
}
