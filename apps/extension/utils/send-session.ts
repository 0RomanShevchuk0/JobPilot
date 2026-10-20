import { API_URL } from "./api.js";
import { readSiteSession } from "./site-session.js";
import type { Site } from "./sites.js";

export type SendResult =
   /** loginExpires: when the site's login cookie runs out, in seconds; -1 = when the browser closes */
   | { status: "sent"; loginExpires: number }
   /** no login cookie on the site: nothing was sent */
   | { status: "logged out" }
   /** the API is down or refused it */
   | { status: "failed"; error: string };

/** Sends the user's session on the site to the API, which encrypts it for the server's worker. */
export async function sendSession(site: Site): Promise<SendResult> {
   const session = await readSiteSession(site);
   if (!session) return { status: "logged out" };

   const url = `${API_URL}/sources/${site.source}/session`;
   try {
      const response = await fetch(url, {
         method: "PUT",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify(session),
      });
      if (!response.ok) return { status: "failed", error: `API answered ${response.status}` };
      const loginCookie = session.cookies.find((c) => c.name === site.loginCookie)!;
      return { status: "sent", loginExpires: loginCookie.expires };
   } catch {
      return { status: "failed", error: "API is not running" };
   }
}
