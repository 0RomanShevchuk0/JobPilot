import { useQueryClient } from "@tanstack/react-query";
import { apiGet } from "../../../shared/api/client";
import { authClient } from "../../../shared/auth/client";

// TEMPORARY — verifying Sentry in prod: hits GET /debug/error, which throws so the API reports it to
// Sentry. The 500 is expected, so the rejection is swallowed. Remove with the debug controller (revert).
const triggerTestError = () => void apiGet("/debug/error").catch(() => {});

/** Who is signed in, by their Google account, and the way out. */
export function UserMenu() {
   const { data: session } = authClient.useSession();
   const queryClient = useQueryClient();
   if (!session) return null;
   const { name, email, image } = session.user;

   const signOut = async () => {
      await authClient.signOut();
      // the signed-out user's data stays out of reach of whoever signs in next in this tab
      queryClient.clear();
   };

   return (
      <div className="flex items-center gap-2 text-sm">
         {image && (
            <img src={image} alt="" className="size-6 rounded-full" referrerPolicy="no-referrer" />
         )}
         <span className="text-gray-700" title={email}>
            {name || email}
         </span>
         {/* TEMPORARY: trigger a server error to verify Sentry, then revert this */}
         <button
            type="button"
            onClick={triggerTestError}
            className="text-gray-400 hover:text-red-600"
         >
            Test error
         </button>
         <button type="button" onClick={signOut} className="text-gray-500 hover:text-gray-900">
            Sign out
         </button>
      </div>
   );
}
