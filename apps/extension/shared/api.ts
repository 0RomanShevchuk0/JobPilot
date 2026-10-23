import { signInToken } from "./sign-in-token.js";

/** The API, from the monorepo's .env at build time (wxt.config.ts). */
export const API_URL = import.meta.env.API_URL;

/** The web app, from the monorepo's .env at build time (wxt.config.ts). */
export const WEB_URL = import.meta.env.WEB_URL;

/** Requests to the API, as the features' own API objects make them. */
export const api = {
   /**
    * A request to the API as the user signed in on the web. Throws with what the user is shown: the
    * API's own reason when it refuses the request ("No such application"), the extension's when the
    * request didn't get that far.
    */
   async call(path: string, init?: RequestInit): Promise<Response> {
      const token = await signInToken.read();
      const headers = new Headers(init?.headers);
      if (token) headers.set("Authorization", `Bearer ${token}`);
      const url = `${API_URL}${path}`;
      let response: Response;
      try {
         response = await fetch(url, { ...init, headers });
      } catch {
         throw new Error("JobPilot server is not reachable");
      }
      if (response.ok) return response;
      // no token yet, or its session is over (signed out, expired): the web hands over a new one
      if (response.status === 401) throw new Error("Not signed in: open JobPilot and sign in");

      const text = await response.text();
      const reason = refusalReason(response.status, text);
      if (reason) throw new Error(reason);
      // nothing the user can act on: the details for the service worker's console
      console.error(`${init?.method ?? "GET"} ${url}: ${response.status}`, text);
      throw new Error(`JobPilot server error (HTTP ${response.status})`);
   },

   /** A JSON body for call. */
   jsonBody(value: unknown): RequestInit {
      return { headers: { "Content-Type": "application/json" }, body: JSON.stringify(value) };
   },
};

/**
 * The API's message for a request it refused (4xx), written for the user: "The job is no longer on this
 * site". Undefined for a server error, or an answer without one (a proxy's page, an empty body).
 */
function refusalReason(status: number, body: string): string | undefined {
   if (status < 400 || status >= 500) return undefined;
   try {
      const { message } = JSON.parse(body) as { message?: unknown };
      return typeof message === "string" ? message : undefined;
   } catch {
      return undefined;
   }
}
