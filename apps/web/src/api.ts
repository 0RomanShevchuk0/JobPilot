/**
 * Every request to the API goes through here, so this is the one place to add auth (a session cookie
 * or a token header) once there are several users. Nothing in the app knows who the user is: the API
 * answers for the current one.
 */
export async function apiGet<T>(path: string): Promise<T> {
   const response = await fetch(`/api${path}`);
   if (!response.ok) throw new Error(`GET ${path} failed: ${response.status}`);
   return (await response.json()) as T;
}
