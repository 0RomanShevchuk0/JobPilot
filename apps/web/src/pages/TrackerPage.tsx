import { Link, useSearchParams } from "react-router";
import { TrackerList, trackerAddress } from "../features/tracker";
import { buttonStyles } from "../shared/ui";

/** Every attempt to get a job: how far each got and how it stands. Add is for jobs from elsewhere. */
export function TrackerPage() {
   const [params] = useSearchParams();
   // wider than the other pages: the table's columns don't fit in theirs
   return (
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
         <div className="mb-6 flex items-center justify-between gap-4">
            <h1 className="text-2xl font-semibold">Tracker</h1>
            <Link
               to={{ search: trackerAddress.withPanel(params, "add") }}
               // the form opens over the list: the list stays where I scrolled it
               preventScrollReset
               className={buttonStyles({ variant: "primary" })}
            >
               Add
            </Link>
         </div>
         <TrackerList />
      </main>
   );
}
