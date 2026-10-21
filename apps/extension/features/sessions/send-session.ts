import type { BrowserSite } from "@jobpilot/sources/page";
import { sessionsApi } from "./api.js";
import { readSiteSession } from "./read-session.js";

export type SendResult =
   /** loginExpires: when the site's login cookie runs out, in seconds; -1 = when the browser closes */
   | { status: "sent"; loginExpires: number }
   /** no login cookie on the site: nothing was sent */
   | { status: "logged out" }
   /** the API is down or refused it */
   | { status: "failed"; error: string };

/** Sends the user's session on the site to the API, which encrypts it for the server's worker. */
export async function sendSession(site: BrowserSite): Promise<SendResult> {
   const session = await readSiteSession(site);
   if (!session) return { status: "logged out" };
   try {
      await sessionsApi.upload(site.source, session);
   } catch (err) {
      return { status: "failed", error: (err as Error).message };
   }
   const loginCookie = session.cookies.find((c) => c.name === site.loginCookie)!;
   return { status: "sent", loginExpires: loginCookie.expires };
}
