import type { ApplicationListItem } from "@jobpilot/contracts";
import { Link } from "react-router";
import { Badge } from "../../../shared/ui";
import { applicationStatusLabels, applicationStatusStyles } from "../lib/status";

/** One application in the list: its status, the job, why it failed, when it last changed. */
export function ApplicationRow({ app }: { app: ApplicationListItem }) {
   return (
      <li>
         <Link
            to={`/applications/${app.id}`}
            className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50"
         >
            <Badge tone={applicationStatusStyles[app.status]} className="w-20 text-center">
               {applicationStatusLabels[app.status]}
            </Badge>
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
