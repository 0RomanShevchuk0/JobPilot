import type { ExpiredSession, SiteSession } from "@jobpilot/contracts";
import { api } from "../../shared/api.js";

/** The API's side of the sessions. */
export const sessionsApi = {
   /** The user's session on a site, for the API to encrypt for the server's worker. */
   async upload(source: string, session: SiteSession): Promise<void> {
      await api.call(`/sources/${source}/session`, { method: "PUT", ...api.jsonBody(session) });
   },

   /**
    * The sites where the server's worker found the user's session logged out, as the web's warning
    * shows them; undefined when the API isn't running, nothing is known then.
    */
   async fetchExpired(): Promise<ExpiredSession[] | undefined> {
      try {
         const response = await api.call("/sources/sessions");
         return (await response.json()) as ExpiredSession[];
      } catch {
         return undefined;
      }
   },
};
