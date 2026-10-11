import { CvCard, useDocuments } from "../features/documents";
import { ProfileForm, useProfile } from "../features/profile";

/**
 * Me, as vacancies are evaluated and form answers written: the CV and the job-search profile. Each
 * saves on its own, and either change re-evaluates every open vacancy.
 */
export function ProfilePage() {
   const profile = useProfile();
   const documents = useDocuments();

   return (
      <main className="mx-auto max-w-4xl p-6">
         <h1 className="mb-6 text-2xl font-semibold">Profile</h1>
         <div className="mb-4">
            {documents.isPending && <p className="text-gray-500">Loading…</p>}
            {documents.isError && <p className="text-red-600">{documents.error.message}</p>}
            {documents.data && <CvCard cv={documents.data.find((d) => d.isBase)} />}
         </div>
         {profile.isPending && <p className="text-gray-500">Loading…</p>}
         {profile.isError && <p className="text-red-600">{profile.error.message}</p>}
         {/* not keyed by version: a CV upload bumps it too, and must not wipe unsaved edits */}
         {profile.isSuccess && <ProfileForm saved={profile.data?.profile} />}
      </main>
   );
}
