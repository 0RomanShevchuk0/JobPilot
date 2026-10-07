import { ApplicationRow, useApplications } from "../features/applications";

/** My applications, the latest activity first. */
export function ApplicationsPage() {
   const applications = useApplications();

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
               <ApplicationRow key={app.id} app={app} />
            ))}
         </ul>
      </main>
   );
}
