import type { AppliedVacancy } from "@jobpilot/contracts";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { Badge } from "../../../shared/ui";

const ROW_STYLES = "flex items-center gap-4 px-4 py-3";

/**
 * One vacancy in the history: when I applied, where, and how (through JobPilot or on my own). It
 * leads to the application it went through, else to the vacancy's page while that shows it.
 */
export function AppliedVacancyRow({ vacancy }: { vacancy: AppliedVacancy }) {
   const content = (
      <>
         <span className="w-24 shrink-0 text-sm text-gray-500 tabular-nums">
            {new Date(vacancy.appliedAt).toLocaleDateString()}
         </span>
         <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">{vacancy.title}</span>
            {vacancy.company && (
               <span className="block truncate text-sm text-gray-500">{vacancy.company}</span>
            )}
         </span>
         <span className="flex shrink-0 items-center gap-1">
            {vacancy.sourceNames.map((name) => (
               <Badge key={name} tone="bg-indigo-50 text-indigo-700">
                  {name}
               </Badge>
            ))}
            {vacancy.closed && <Badge tone="bg-gray-100 text-gray-600">closed</Badge>}
         </span>
         <span className="w-28 shrink-0 text-right text-sm text-gray-500">
            {vacancy.application ? "via JobPilot" : "on my own"}
         </span>
      </>
   );
   return <li>{rowLink(vacancy, content)}</li>;
}

/** The row as a link to where it is best seen; a plain row when there is nowhere to go. */
function rowLink(vacancy: AppliedVacancy, content: ReactNode) {
   const to = vacancy.application
      ? `/applications/${vacancy.application.id}`
      : vacancy.evaluated
        ? `/matches/${vacancy.vacancyId}`
        : undefined;
   if (!to) return <div className={ROW_STYLES}>{content}</div>;
   return (
      <Link to={to} className={`${ROW_STYLES} hover:bg-gray-50`}>
         {content}
      </Link>
   );
}
