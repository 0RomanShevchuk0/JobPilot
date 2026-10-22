import { authClient } from "../auth/client";

/**
 * Every request to the API goes through here. The session's cookie goes along by itself (the API is on
 * this same origin, under /api): the API answers for the signed-in user, nothing else in the app has to
 * know who it is.
 */
async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
   // a file goes as multipart/form-data: the browser sets that content type with its boundary itself
   const isForm = body instanceof FormData;
   const response = await fetch(`/api${path}`, {
      method,
      headers: body === undefined || isForm ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
   });
   // the session is over (expired, or signed out in another tab): the session is looked up again, and
   // without one the app gives way to the sign-in page (RequireSignIn)
   if (response.status === 401) authClient.$store.notify("$sessionSignal");
   if (!response.ok) {
      const message = await errorMessage(response, `${method} ${path}`);
      throw new Error(message);
   }
   // 204 and some 202s come with no body
   const text = await response.text();
   return (text ? JSON.parse(text) : undefined) as T;
}

/** The API's own message ("The CV must be a PDF") when it sent one, the status otherwise. */
async function errorMessage(response: Response, what: string): Promise<string> {
   try {
      const { message } = (await response.json()) as { message?: unknown };
      if (typeof message === "string") return message;
   } catch {
      // not JSON: a proxy error page or an empty body
   }
   return `${what} failed: ${response.status}`;
}

export const apiGet = <T>(path: string) => request<T>("GET", path);
export const apiPost = <T>(path: string, body?: unknown) => request<T>("POST", path, body);
export const apiPatch = <T>(path: string, body: unknown) => request<T>("PATCH", path, body);
export const apiPut = <T>(path: string, body: unknown) => request<T>("PUT", path, body);
export const apiDelete = (path: string) => request<void>("DELETE", path);
