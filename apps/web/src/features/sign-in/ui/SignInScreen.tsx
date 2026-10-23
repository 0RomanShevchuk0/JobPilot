import { useState } from "react";
import { authClient } from "../../../shared/auth/client";
import { Button } from "../../../shared/ui";

/**
 * What a visitor without a session sees, on whichever page they opened: signing in with Google takes
 * them back to it. A sign-in that failed comes back here with ?error=… in the address.
 */
export function SignInScreen() {
   const [starting, setStarting] = useState(false);
   const failed = new URLSearchParams(window.location.search).get("error");

   const signIn = async () => {
      setStarting(true);
      // Better Auth answers with Google's page and the browser goes there; back on this page after
      await authClient.signIn.social({ provider: "google", callbackURL: window.location.href });
   };

   return (
      <main className="mx-auto mt-24 max-w-sm px-6 text-center">
         <h1 className="text-2xl font-semibold text-gray-900">JobPilot</h1>
         <p className="mt-2 text-sm text-gray-600">
            Finds jobs on Djinni and DOU, scores them against your profile and fills in applications
            for you to send.
         </p>
         <Button variant="primary" className="mt-8 w-full" onClick={signIn} loading={starting}>
            {starting ? "Opening Google…" : "Sign in with Google"}
         </Button>
         {failed && <p className="mt-4 text-sm text-red-600">Signing in failed: {failed}</p>}
      </main>
   );
}
