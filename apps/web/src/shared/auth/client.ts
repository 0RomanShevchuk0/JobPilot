import { createAuthClient } from "better-auth/react";

/**
 * Signing in (Better Auth, Google only): its routes are on this same origin, under the API's /api, so
 * the session's cookie goes with every request to the API by itself.
 */
export const authClient = createAuthClient({ basePath: "/api/auth" });
