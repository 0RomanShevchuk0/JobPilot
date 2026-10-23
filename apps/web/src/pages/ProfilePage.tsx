import { CvCard, useDocuments } from "../features/documents";
import { ProfileForm, useProfile } from "../features/profile";
import { ExpiredSessionsNotice } from "../features/sessions";
import { PageLoader, ReevaluatesMark } from "../shared/ui";

/**
 * Me, as vacancies are evaluated and form answers written: the CV and the job-search profile. Each
 * saves on its own, and either change re-evaluates every open vacancy.
 */
export function ProfilePage() {
   const profile = useProfile();
   const documents = useDocuments();

   return (
      <main className="mx-auto max-w-4xl p-6">
         <header className="mb-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h1 className="text-2xl font-semibold">Profile</h1>
            {/* the legend for the mark on sections: what changing them costs */}
            <p className="flex items-center gap-1.5 text-xs text-gray-500">
               <ReevaluatesMark /> re-evaluates vacancies when changed
            </p>
         </header>
         <ExpiredSessionsNotice />
         {/* one loader for both: the form needs to know whether there is a CV, so the page shows once
             both are in, not the CV card first and the form jumping in under it */}
         {(documents.isPending || profile.isPending) && <PageLoader />}
         {documents.isError && <p className="mb-4 text-red-600">{documents.error.message}</p>}
         {profile.isError && <p className="text-red-600">{profile.error.message}</p>}
         {documents.isSuccess && profile.isSuccess && (
            <>
               <div className="mb-4">
                  <CvCard cv={documents.data.find((d) => d.isBase)} />
               </div>
               {/* not keyed by version: a CV upload bumps it too, and must not wipe unsaved edits */}
               <ProfileForm
                  saved={profile.data?.profile}
                  hasCv={documents.data.some((d) => d.isBase)}
               />
            </>
         )}
      </main>
   );
}
