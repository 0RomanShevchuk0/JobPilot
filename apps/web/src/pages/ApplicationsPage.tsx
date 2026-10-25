import type { ApplicationListItem } from "@jobpilot/contracts";
import {
   ApplicationRow,
   inWorkApplicationStatuses,
   useApplications,
} from "../features/applications";
import { PageLoader } from "../shared/ui";

/**
 * An application something can still be done with, while its vacancy isn't hidden: once I hide it,
 * I'm done with it. One the job site refused isn't: its vacancy, with nowhere else left to apply,
 * shows in Matches with "Show skipped", the reason on its card.
 */
const isInProgress = (app: ApplicationListItem) =>
   inWorkApplicationStatuses.includes(app.status) && app.vacancyStatus === null;

// the latest sent first; a sent one always has its date
const bySentDate = (a: ApplicationListItem, b: ApplicationListItem) =>
   (b.submittedAt ?? "").localeCompare(a.submittedAt ?? "");

const LIST_STYLES = "divide-y divide-gray-200 rounded border border-gray-200";

/**
 * My applications, one per job site I apply through: the ones JobPilot is on or waiting for me with,
 * the latest activity first, and every one sent, by JobPilot or marked by hand, the latest first.
 */
export function ApplicationsPage() {
   const applications = useApplications();
   const inProgress = applications.data?.filter(isInProgress);
   const sent = applications.data?.filter((app) => app.status === "submitted").sort(bySentDate);

   return (
      <main className="mx-auto max-w-4xl p-6">
         <h1 className="mb-6 text-2xl font-semibold">Applications</h1>
         {applications.isPending && <PageLoader />}
         {applications.isError && <p className="text-red-600">{applications.error.message}</p>}

         {inProgress && sent && (
            <div className="space-y-8">
               <section>
                  <h2 className="mb-2 text-sm font-medium text-gray-600">In progress</h2>
                  {inProgress.length === 0 ? (
                     <p className="text-sm text-gray-500">
                        Nothing in progress: press Apply on a vacancy in Matches.
                     </p>
                  ) : (
                     <ul className={LIST_STYLES}>
                        {inProgress.map((app) => (
                           <ApplicationRow key={app.id} app={app} />
                        ))}
                     </ul>
                  )}
               </section>

               <section>
                  <h2 className="mb-2 text-sm font-medium text-gray-600">Sent</h2>
                  {sent.length === 0 ? (
                     <p className="text-sm text-gray-500">
                        Nothing yet: what you send through JobPilot, or Mark applied on a job site
                        in Matches, shows here.
                     </p>
                  ) : (
                     <ul className={LIST_STYLES}>
                        {sent.map((app) => (
                           <ApplicationRow key={app.id} app={app} />
                        ))}
                     </ul>
                  )}
               </section>
            </div>
         )}
      </main>
   );
}
