import type { ApplicationListItem } from "@jobpilot/contracts";
import { Link } from "react-router";
import { Badge } from "../../../shared/ui";
import { applicationStatusLabels, applicationStatusStyles } from "../lib/status";

/**
 * One application in the list: its status, the job and the job site it goes through, why it failed or
 * can't go, and when it was sent (or last changed, until it is). The row opens the application, the
 * job's title its vacancy: one marked applied has left the new matches, this is the way back to it.
 */
export function ApplicationRow({ app }: { app: ApplicationListItem }) {
   const title = app.title ?? app.postingUrl;
   return (
      <li className="relative hover:bg-gray-50">
         {/* the whole row, under the title's link: a link can't hold another one */}
         <Link to={`/applications/${app.id}`} aria-label={title} className="absolute inset-0" />
         <div className="flex items-center gap-4 px-4 py-3">
            <Badge tone={applicationStatusStyles[app.status]} className="w-24 text-center">
               {applicationStatusLabels[app.status]}
            </Badge>
            <span className="min-w-0 flex-1">
               <span className="block truncate font-medium">
                  {/* gone vacancies have no page */}
                  {app.vacancyId ? (
                     <Link to={`/matches/${app.vacancyId}`} className="relative hover:underline">
                        {title}
                     </Link>
                  ) : (
                     title
                  )}
               </span>
               <span className="block truncate text-sm text-gray-500">
                  {app.sourceName}
                  {app.origin === "manual" && " · marked by hand"}
               </span>
               {app.status === "failed" && app.failureReason && (
                  <span className="block truncate text-sm text-red-600">{app.failureReason}</span>
               )}
               {app.status === "cannot_apply" && app.failureReason && (
                  <span className="block truncate text-sm text-gray-500">{app.failureReason}</span>
               )}
            </span>
            <span className="shrink-0 text-sm text-gray-500">
               {new Date(app.submittedAt ?? app.updatedAt).toLocaleDateString()}
            </span>
         </div>
      </li>
   );
}
