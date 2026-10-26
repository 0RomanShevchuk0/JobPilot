import { APIError, createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import type { BetterAuthPlugin } from "better-auth";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";

const LOGIN_PATH = "/dev-login";

/** Constant-time compare; the length is checked first (a dev secret's length isn't sensitive). */
function secretMatches(given: string, expected: string): boolean {
   const a = Buffer.from(given);
   const b = Buffer.from(expected);
   return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Signing in as any user without Google, for dev only. Two routes under /api/auth, added to Better Auth
 * only outside production (SignIn), so the deployed API has neither:
 *
 * - GET /dev-login?email=…&secret=… — logs the browser in as that user and redirects to the app. Gated
 *   by the secret: this is the one that grants a session.
 * - GET /dev-login/users — the users with a ready /dev-login link each (the sign-in page lists them, so
 *   switching accounts is a click). Built here so the secret stays on the server; the links carry it,
 *   but the response is only readable same-origin (CORS lets in the extension alone), so no other site
 *   can read it out.
 *
 * Nothing is stored for any of this: /dev-login makes an ordinary session, the same a Google sign-in would.
 */
export function devLoginPlugin({
   secret,
   webUrl,
}: {
   secret: string;
   webUrl: string;
}): BetterAuthPlugin {
   const loginLink = (email: string) =>
      `${webUrl}/api/auth${LOGIN_PATH}?email=${encodeURIComponent(email)}&secret=${encodeURIComponent(secret)}`;

   return {
      id: "dev-login",
      endpoints: {
         devLogin: createAuthEndpoint(
            LOGIN_PATH,
            { method: "GET", query: z.object({ email: z.email(), secret: z.string() }) },
            async (ctx) => {
               if (!secretMatches(ctx.query.secret, secret)) {
                  throw new APIError("UNAUTHORIZED", { message: "Wrong dev-login secret" });
               }
               const user = await ctx.context.internalAdapter
                  .findUserByEmail(ctx.query.email)
                  .then((found) => found?.user);
               if (!user) {
                  throw new APIError("NOT_FOUND", {
                     message: `No user with email ${ctx.query.email}`,
                  });
               }
               const session = await ctx.context.internalAdapter.createSession(user.id);
               await setSessionCookie(ctx, { session, user });
               // to the app, the session cookie now set: the browser lands signed in
               throw ctx.redirect(webUrl);
            },
         ),
         devLoginUsers: createAuthEndpoint(
            `${LOGIN_PATH}/users`,
            { method: "GET" },
            async (ctx) => {
               const users = await ctx.context.internalAdapter.listUsers(200, 0);
               return ctx.json(
                  users.map((user) => ({
                     email: user.email,
                     name: user.name,
                     url: loginLink(user.email),
                  })),
               );
            },
         ),
      },
   };
}
