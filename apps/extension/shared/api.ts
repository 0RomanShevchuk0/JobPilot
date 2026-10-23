import { signInToken } from "./sign-in-token.js";

/** The API, from the monorepo's .env at build time (wxt.config.ts). */
export const API_URL = import.meta.env.API_URL;

/** The web app, from the monorepo's .env at build time (wxt.config.ts). */
export const WEB_URL = import.meta.env.WEB_URL;

/** Requests to the API, as the features' own API objects make them. */
export const api = {
   /**
    * A request to the API as the user signed in on the web; throws with its reason when it refuses, or
    * when it isn't running.
    */
   async call(path: string, init?: RequestInit): Promise<Response> {
      const token = await signInToken.read();
      const headers = new Headers(init?.headers);
      if (token) headers.set("Authorization", `Bearer ${token}`);
      let response: Response;
      try {
         response = await fetch(`${API_URL}${path}`, { ...init, headers });
      } catch {
         throw new Error("API is not running");
      }
      if (response.ok) return response;
      // no token yet, or its session is over (signed out, expired): the web hands over a new one
      if (response.status === 401) throw new Error("Not signed in: open JobPilot and sign in");
      const body = (await response.json().catch(() => undefined)) as
         { message?: unknown } | undefined;
      const reason = typeof body?.message === "string" ? body.message : `HTTP ${response.status}`;
      throw new Error(`API: ${reason}`);
   },

   /** A JSON body for call. */
   jsonBody(value: unknown): RequestInit {
      return { headers: { "Content-Type": "application/json" }, body: JSON.stringify(value) };
   },
};
