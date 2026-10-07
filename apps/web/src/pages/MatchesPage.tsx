import { useState } from "react";
import { MatchCard, useMatches, type MatchesTab } from "../features/matches";
import { Button } from "../shared/ui";

const tabs: MatchesTab[] = ["new", "applied", "hidden"];

/** Vacancies evaluated for my current profile, best first: new ones, or the ones I marked. */
export function MatchesPage() {
   const [tab, setTab] = useState<MatchesTab>("new");
   const [showSkipped, setShowSkipped] = useState(false);
   const matches = useMatches(tab, showSkipped);

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
         {matches.isError && <p className="text-red-600">{matches.error.message}</p>}
         {matches.data?.length === 0 && <p className="text-gray-500">Nothing here.</p>}
         <ul className="space-y-4">
            {matches.data?.map((match) => (
               <MatchCard key={match.vacancyId} match={match} />
            ))}
         </ul>
      </main>
   );
}
