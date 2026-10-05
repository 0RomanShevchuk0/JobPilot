import type { ApplicationListItem } from "@jobpilot/contracts";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { apiGet } from "./api";
import { applicationStatusLabels, applicationStatusStyles } from "./applicationStatus";

/** My applications, the latest activity first. */
export function ApplicationsPage() {
   const applications = useQuery({
      queryKey: ["applications"],
      queryFn: () => apiGet<ApplicationListItem[]>("/applications"),
   });

   return (
      <main className="mx-auto max-w-4xl p-6">
         <h1 className="mb-6 text-2xl font-semibold">Applications</h1>
         {applications.isPending && <p className="text-gray-500">Loading…</p>}
         {applications.isError && <p className="text-red-600">{applications.error.message}</p>}
         {applications.data?.length === 0 && (
            <p className="text-gray-500">
               No applications yet: press Apply on a vacancy in Matches.
            </p>
         )}

         <ul className="divide-y divide-gray-200 rounded border border-gray-200">
            {applications.data?.map((app) => (
               <li key={app.id}>
                  <Link
                     to={`/applications/${app.id}`}
                     className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50"
                  >
                     <span
                        className={`w-20 shrink-0 rounded px-2 py-0.5 text-center text-xs font-medium ${applicationStatusStyles[app.status]}`}
                     >
                        {applicationStatusLabels[app.status]}
                     </span>
                     <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">
                           {app.title ?? app.postingUrl}
                        </span>
                        {app.status === "failed" && app.failureReason && (
                           <span className="block truncate text-sm text-red-600">
                              {app.failureReason}
                           </span>
                        )}
                     </span>
                     <span className="shrink-0 text-sm text-gray-500">
                        {new Date(app.updatedAt).toLocaleDateString()}
                     </span>
                  </Link>
               </li>
            ))}
         </ul>
      </main>
   );
}
