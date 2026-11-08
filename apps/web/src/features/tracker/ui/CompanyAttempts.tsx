import type { JobAttemptSummary } from "@jobpilot/contracts";
import { Link } from "react-router";
import { Badge } from "../../../shared/ui";
import { useCompanyAttemptHistory } from "../api/queries";
import { trackerAddress } from "../lib/address";
import { stageLabels, stageStyles, statusLabels, statusStyles } from "../lib/labels";
import { shortDate } from "../lib/short-date";

const headingClasses = "mb-2 text-xs font-semibold tracking-wide text-gray-500 uppercase";

/**
 * On a vacancy's page, what I already tried at its employer: the latest few of its other jobs, each
 * opening its row in the tracker. Not this job: the job sites above already say how applying to it
 * went. Nothing when I tried none, or while it loads: the page is about the vacancy.
 */
export function CompanyAttempts({ vacancyId }: { vacancyId: string }) {
   const history = useCompanyAttemptHistory(vacancyId);
   if (history.isError) {
      return <p className="mt-6 text-sm text-red-600">{history.error.message}</p>;
   }
   if (!history.data) return null;
   const { company, otherCount, latestOther } = history.data;
   if (!company || otherCount === 0) return null;

   return (
      <section className="mt-6">
         {/* says whose and what: "in your tracker" alone didn't tell they're my applications */}
         <h2 className={headingClasses}>
            {otherCount === 1 ? "Previous application" : "Previous applications"} to {company}
         </h2>
         <AttemptList attempts={latestOther} search={company} />
         {otherCount > latestOther.length && (
            <Link
               to={trackerAddress.searchHref(company)}
               className="mt-2 inline-block text-sm text-blue-600 hover:underline"
            >
               All {otherCount} in Tracker →
            </Link>
         )}
      </section>
   );
}

interface AttemptListProps {
   attempts: JobAttemptSummary[];
   /** what the tracker is searched for when a row opens: the rows around it are its company's */
   search: string;
}

/** Attempts a line each: what, when, how far it got and how it stands. */
function AttemptList({ attempts, search }: AttemptListProps) {
   return (
      <ul className="divide-y divide-gray-200 rounded border border-gray-200">
         {attempts.map((attempt) => (
            <li key={attempt.id}>
               <Link
                  to={trackerAddress.attemptHref(attempt.id, search)}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 hover:bg-gray-50"
               >
                  <span className="min-w-0 flex-1 basis-48 truncate text-sm text-gray-900">
                     {attempt.title ?? "Untitled job"}
                  </span>
                  <span className="text-sm text-gray-500">{shortDate(attempt.appliedAt)}</span>
                  <span className="flex gap-1.5">
                     <Badge tone={stageStyles[attempt.stage]}>{stageLabels[attempt.stage]}</Badge>
                     <Badge tone={statusStyles[attempt.status]}>
                        {statusLabels[attempt.status]}
                     </Badge>
                  </span>
               </Link>
            </li>
         ))}
      </ul>
   );
}
