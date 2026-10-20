import type { ExpiredSession } from "@jobpilot/contracts";

/** The API runs on the user's machine for now (API_PORT in the monorepo's .env). */
export const API_URL = "http://localhost:4000";

/**
 * The sites where the server's worker found the user's session logged out, as the web's warning shows
 * them; undefined when the API isn't running, nothing is known then.
 */
export async function fetchExpiredSessions(): Promise<ExpiredSession[] | undefined> {
   try {
      const response = await fetch(`${API_URL}/sources/sessions`);
      if (!response.ok) return undefined;
      return (await response.json()) as ExpiredSession[];
   } catch {
      return undefined;
   }
}
