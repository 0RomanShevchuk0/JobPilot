import { SessionExpiredError, type SiteSession } from "@jobpilot/contracts";
import { readFile } from "node:fs/promises";

/**
 * The session saved to sessionPath for a worker on the user's machine (the API writes it as the
 * extension sends it); SessionExpiredError when there is none yet.
 */
export async function readSessionFile(sessionPath: string, siteName: string): Promise<SiteSession> {
   let file: string;
   try {
      file = await readFile(sessionPath, "utf8");
   } catch {
      throw new SessionExpiredError(siteName); // no session file yet
   }
   return JSON.parse(file) as SiteSession;
}

/**
 * The session as a Cookie header, for plain HTTP requests without a browser. Expired cookies are left
 * out; whether the site still accepts the rest only a request tells.
 */
export function sessionCookieHeader(session: SiteSession): string {
   const nowSeconds = Date.now() / 1000;
   const live = session.cookies.filter((c) => c.expires === -1 || c.expires > nowSeconds);
   return live.map((c) => `${c.name}=${c.value}`).join("; ");
}
