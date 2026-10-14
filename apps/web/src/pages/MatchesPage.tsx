import { useState } from "react";
import { MatchCard, useMatches, type MatchesTab } from "../features/matches";
import { ExpiredSessionsNotice } from "../features/sessions";
import { Button, LoadMoreTrigger } from "../shared/ui";

const tabs: MatchesTab[] = ["new", "applied", "hidden"];

/** Vacancies evaluated for my current profile, best first: new ones, or the ones I marked. */
export function MatchesPage() {
   const [tab, setTab] = useState<MatchesTab>("new");
   const [showSkipped, setShowSkipped] = useState(false);
   const matches = useMatches(tab, showSkipped);
   const items = matches.data?.pages.flatMap((page) => page.items);

   return (
      <main className="mx-auto max-w-4xl p-6">
         <header className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Matches</h1>
            {tab === "new" && (
               <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                     type="checkbox"
                     checked={showSkipped}
                     onChange={(e) => setShowSkipped(e.target.checked)}
                  />
                  Show skipped
               </label>
            )}
         </header>

         <ExpiredSessionsNotice />

         <nav className="mb-4 flex gap-2">
            {tabs.map((t) => (
               <Button
                  key={t}
                  variant={t === tab ? "primary" : "secondary"}
                  onClick={() => setTab(t)}
                  className="capitalize"
               >
                  {t}
               </Button>
            ))}
         </nav>

         {matches.isPending && <p className="text-gray-500">Loading…</p>}
         {matches.isError && !matches.isFetchNextPageError && (
            <p className="text-red-600">{matches.error.message}</p>
         )}
         {items?.length === 0 && <p className="text-gray-500">Nothing here.</p>}
         <ul className="space-y-4">
            {items?.map((match) => (
               <MatchCard key={match.vacancyId} match={match} />
            ))}
         </ul>
         {matches.isFetchingNextPage && <p className="mt-4 text-gray-500">Loading more…</p>}
         {/* not retried by scrolling: a failing request would repeat at once */}
         {matches.isFetchNextPageError && (
            <div className="mt-4 flex items-center gap-3">
               <p className="text-red-600">{matches.error.message}</p>
               <Button onClick={() => matches.fetchNextPage()}>Try again</Button>
            </div>
         )}
         <LoadMoreTrigger
            onVisible={() => matches.fetchNextPage()}
            disabled={
               !matches.hasNextPage || matches.isFetchingNextPage || matches.isFetchNextPageError
            }
         />
      </main>
   );
}
