import type { ApplicationListItem } from "@jobpilot/contracts";
import { Link } from "react-router";
import { applicationStatusLabels, applicationStatusStyles } from "../lib/status";

/** One application in the list: its status, the job, why it failed, when it last changed. */
export function ApplicationRow({ app }: { app: ApplicationListItem }) {
   return (
      <li>
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
               <span className="block truncate font-medium">{app.title ?? app.postingUrl}</span>
               {app.status === "failed" && app.failureReason && (
                  <span className="block truncate text-sm text-red-600">{app.failureReason}</span>
               )}
            </span>
            <span className="shrink-0 text-sm text-gray-500">
               {new Date(app.updatedAt).toLocaleDateString()}
            </span>
         </Link>
      </li>
   );
}
