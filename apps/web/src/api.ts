/**
 * Every request to the API goes through here, so this is the one place to add auth (a session cookie
 * or a token header) once there are several users. Nothing in the app knows who the user is: the API
 * answers for the current one.
 */
async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
   // a file goes as multipart/form-data: the browser sets that content type with its boundary itself
   const isForm = body instanceof FormData;
   const response = await fetch(`/api${path}`, {
      method,
      headers: body === undefined || isForm ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
   });
   if (!response.ok) throw new Error(await errorMessage(response, `${method} ${path}`));
   if (response.status === 204) return undefined as T;
   return (await response.json()) as T;
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
export const apiPatch = <T>(path: string, body: unknown) => request<T>("PATCH", path, body);
export const apiPut = <T>(path: string, body: unknown) => request<T>("PUT", path, body);
export const apiDelete = (path: string) => request<void>("DELETE", path);
