import { useSearchParams } from "react-router";
import { MatchCard, useMatches, type MatchesTab } from "../features/matches";
import { ExpiredSessionsNotice } from "../features/sessions";
import { Button, LoadMoreTrigger, PageLoader } from "../shared/ui";

const tabs: MatchesTab[] = ["new", "hidden"];

/**
 * Vacancies evaluated for my current profile: the new ones to decide on, best first, and the ones I
 * hid, the latest first. What I applied to is on Applications, as its history. The tab and
 * "show skipped" are in the address (?tab=hidden&skipped=1): back from a vacancy, the list is as I
 * left it, and a reload keeps it too.
 */
export function MatchesPage() {
   const [params, setParams] = useSearchParams();
   const tab = tabs.find((t) => t === params.get("tab")) ?? "new";
   const showSkipped = params.get("skipped") === "1";
   // in place of the address, not a new entry: back leaves the page, it doesn't walk through tabs
   const setView = (view: { tab: MatchesTab; showSkipped: boolean }) => {
      const next = new URLSearchParams();
      if (view.tab !== "new") next.set("tab", view.tab);
      if (view.showSkipped) next.set("skipped", "1");
      setParams(next, { replace: true });
   };
   const setTab = (t: MatchesTab) => setView({ tab: t, showSkipped });
   const setShowSkipped = (show: boolean) => setView({ tab, showSkipped: show });
   const matches = useMatches(tab, showSkipped);
   const items = matches.data?.pages.flatMap((page) => page.items);

   return (
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
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

         {matches.isPending && <PageLoader />}
         {matches.isError && !matches.isFetchNextPageError && (
            <p className="text-red-600">{matches.error.message}</p>
         )}
         {items?.length === 0 && <p className="text-gray-500">Nothing here.</p>}
         <ul className="space-y-4">
            {items?.map((match) => (
               <MatchCard key={match.vacancyId} match={match} />
            ))}
         </ul>
         {matches.isFetchingNextPage && <PageLoader label="Loading more…" />}
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
