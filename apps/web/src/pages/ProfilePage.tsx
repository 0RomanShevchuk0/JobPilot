import { ProfileForm, useProfile } from "../features/profile";

/** My job-search profile: what vacancies are evaluated against and form answers are written from. */
export function ProfilePage() {
   const profile = useProfile();

   return (
      <main className="mx-auto max-w-4xl p-6">
         <h1 className="mb-6 text-2xl font-semibold">Profile</h1>
         {profile.isPending && <p className="text-gray-500">Loading…</p>}
         {profile.isError && <p className="text-red-600">{profile.error.message}</p>}
         {profile.isSuccess && (
            // a save brings a new version: the form starts over from what was saved
            <ProfileForm key={profile.data?.version ?? "new"} saved={profile.data?.profile} />
         )}
      </main>
   );
}
