import type { ReactNode } from "react";
import { authClient } from "../../../shared/auth/client";
import { SignInScreen } from "./SignInScreen";

/**
 * The app for a signed-in user, the sign-in page for anyone else, on whatever address they opened.
 * Nothing shows while the session is being looked up, so the sign-in page doesn't flash on a reload.
 */
export function RequireSignIn({ children }: { children: ReactNode }) {
   const { data: session, isPending } = authClient.useSession();
   if (isPending) return null;
   if (!session) return <SignInScreen />;
   return children;
}
