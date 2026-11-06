import { TrackerList } from "../features/tracker";

/** Every attempt to get a job: how far each got and how it stands. */
export function TrackerPage() {
   return (
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
         <h1 className="mb-6 text-2xl font-semibold">Tracker</h1>
         <TrackerList />
      </main>
   );
}
