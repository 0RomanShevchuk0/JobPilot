/**
 * Every request to the API goes through here, so this is the one place to add auth (a session cookie
 * or a token header) once there are several users. Nothing in the app knows who the user is: the API
 * answers for the current one.
 */
async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
   const response = await fetch(`/api${path}`, {
      method,
      headers: body === undefined ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
   });
   if (!response.ok) throw new Error(`${method} ${path} failed: ${response.status}`);
   return (await response.json()) as T;
}

export const apiGet = <T>(path: string) => request<T>("GET", path);
export const apiPatch = <T>(path: string, body: unknown) => request<T>("PATCH", path, body);
