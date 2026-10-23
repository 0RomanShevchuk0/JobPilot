import {
   ApplicationRow,
   AppliedVacancyRow,
   useApplications,
   useAppliedVacancies,
} from "../features/applications";
import { PageLoader } from "../shared/ui";

const LIST_STYLES = "divide-y divide-gray-200 rounded border border-gray-200";

/**
 * What I did with vacancies: the applications JobPilot is on or waiting for me with, the latest
 * activity first, and everything I applied to, through JobPilot or on my own, the latest first.
 */
export function ApplicationsPage() {
   const applications = useApplications();
   const applied = useAppliedVacancies();
   // sent ones are in the history, with the vacancy they went to
   const inProgress = applications.data?.filter((app) => app.status !== "submitted");

   return (
      <main className="mx-auto max-w-4xl p-6">
         <h1 className="mb-6 text-2xl font-semibold">Applications</h1>
         {/* one loader for both lists: they show together, not one jumping in under the other */}
         {(applications.isPending || applied.isPending) && <PageLoader />}
         {applications.isError && <p className="text-red-600">{applications.error.message}</p>}
         {applied.isError && <p className="text-red-600">{applied.error.message}</p>}

         {inProgress && applied.data && (
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
                  <h2 className="mb-2 text-sm font-medium text-gray-600">Applied</h2>
                  {applied.data.length === 0 ? (
                     <p className="text-sm text-gray-500">
                        Nothing yet: what you send through JobPilot, or mark Applied in Matches,
                        shows here.
                     </p>
                  ) : (
                     <ul className={LIST_STYLES}>
                        {applied.data.map((vacancy) => (
                           <AppliedVacancyRow key={vacancy.vacancyId} vacancy={vacancy} />
                        ))}
                     </ul>
                  )}
               </section>
            </div>
         )}
      </main>
   );
}
