import { useEffect, type ReactNode } from "react";
import { authClient } from "../../../shared/auth/client";
import { sendSignInToExtension } from "../../../shared/extension/client";
import { SignInScreen } from "./SignInScreen";

/**
 * The app for a signed-in user, the sign-in page for anyone else, on whatever address they opened.
 * Nothing shows while the session is being looked up, so the sign-in page doesn't flash on a reload.
 * The session goes to the extension too: it can't read the web's cookie, it sends the token instead.
 */
export function RequireSignIn({ children }: { children: ReactNode }) {
   const { data: session, isPending } = authClient.useSession();
   const sessionToken = session?.session.token;
   useEffect(() => {
      if (sessionToken) void sendSignInToExtension(sessionToken);
   }, [sessionToken]);

   if (isPending) return null;
   if (!session) return <SignInScreen />;
   return children;
}
