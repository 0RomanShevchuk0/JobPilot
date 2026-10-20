import { sourceCatalog } from "@jobpilot/sources/catalog";
import { useExpiredSessions } from "../api/queries";

/**
 * A warning for each job site where my session is over: until I log in again, the worker can't
 * check whether I can apply there, nor prepare an application. Nothing when every session works.
 */
export function ExpiredSessionsNotice() {
   const expired = useExpiredSessions();
   if (!expired.data?.length) return null;

   return (
      <div className="mb-4 space-y-2">
         {expired.data.map(({ source, expiredAt }) => {
            const name = sourceCatalog.find((s) => s.id === source)?.name ?? source;
            return (
               <div
                  key={source}
                  className="rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
               >
                  <p className="font-medium">
                     Logged out of {name} since {new Date(expiredAt).toLocaleString()}
                  </p>
                  <p className="mt-1">
                     Until you log in again, vacancies there are scored without checking whether you
                     can apply, and applications can't be prepared. Log in to {name} in Chrome with
                     the JobPilot extension: it sends the new session by itself (or press “Send
                     sessions now” in its popup). The warning goes away once it does.
                  </p>
               </div>
            );
         })}
      </div>
   );
}
