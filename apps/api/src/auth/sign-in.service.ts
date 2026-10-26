import type { DatabaseClient } from "@jobpilot/db";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { betterAuth } from "better-auth";
import { fromNodeHeaders } from "better-auth/node";
import { bearer } from "better-auth/plugins";
import type { IncomingHttpHeaders } from "node:http";
import { Database } from "../infra/database.js";
import { devLoginPlugin } from "./dev-login.plugin.js";
import { EXTENSION_ORIGINS } from "./extension-origins.js";

/** Where the sign-in routes live (SignInController): under the API's /api, as the browser asks for them. */
const SIGN_IN_BASE_PATH = "/api/auth";

/**
 * Signing in with Google (Better Auth): the users, their sessions and Google accounts in our database.
 * A session is a browser's: the web's cookie, and the same session's token the web hands the extension
 * (Authorization: Bearer).
 */
@Injectable()
export class SignIn {
   readonly auth: ReturnType<typeof createAuth>;

   constructor(config: ConfigService, db: Database) {
      this.auth = createAuth(config, db.authDatabase);
   }

   /** Who sent the request, by the session's cookie or its token; undefined when nobody is signed in. */
   async userIdOf(headers: IncomingHttpHeaders): Promise<string | undefined> {
      const session = await this.auth.api.getSession({ headers: fromNodeHeaders(headers) });
      return session?.user.id;
   }
}

function createAuth(config: ConfigService, database: DatabaseClient["authDatabase"]) {
   const webUrl = config.getOrThrow<string>("WEB_URL");
   // a dev-only sign-in link (dev-login.plugin): never on the server, which runs with NODE_ENV=production,
   // and only when the secret is set. Left out otherwise, so the route doesn't exist at all
   const devLoginSecret = config.get<string>("DEV_LOGIN_SECRET");
   const devLogin =
      process.env.NODE_ENV !== "production" && devLoginSecret
         ? [devLoginPlugin({ secret: devLoginSecret, webUrl })]
         : [];
   return betterAuth({
      // the web's address: the browser signs in there, the API is behind its /api
      baseURL: webUrl,
      basePath: SIGN_IN_BASE_PATH,
      secret: config.getOrThrow<string>("BETTER_AUTH_SECRET"),
      database,
      socialProviders: {
         google: {
            clientId: config.getOrThrow<string>("GOOGLE_CLIENT_ID"),
            clientSecret: config.getOrThrow<string>("GOOGLE_CLIENT_SECRET"),
         },
      },
      // a user from before sign-in (or one whose email was set by hand) signs in with the Google
      // account of that email: Google vouches for the address, so it joins the existing user
      account: { accountLinking: { enabled: true, trustedProviders: ["google"] } },
      // the extension sends the web's session token as Authorization: Bearer
      plugins: [bearer(), ...devLogin],
      trustedOrigins: [webUrl, ...EXTENSION_ORIGINS],
      // ids are the database's own: uuidv7(), like every other table
      advanced: { database: { generateId: false } },
      telemetry: { enabled: false },
   });
}
