import type { SiteSession } from "@jobpilot/contracts";

/**
 * The session as a Cookie header, for plain HTTP requests without a browser. Expired cookies are left
 * out; whether the site still accepts the rest only a request tells.
 */
export function sessionCookieHeader(session: SiteSession): string {
   const nowSeconds = Date.now() / 1000;
   const live = session.cookies.filter((c) => c.expires === -1 || c.expires > nowSeconds);
   return live.map((c) => `${c.name}=${c.value}`).join("; ");
}
