import {
   applicationListTabs,
   applicationOrigins,
   type ApplicationListTab,
} from "@jobpilot/contracts";
import { sourceCatalog } from "@jobpilot/sources/catalog";
import { useSearchParams } from "react-router";
import {
   ApplicationFilters,
   ApplicationRow,
   useApplications,
   type ApplicationListFilter,
} from "../features/applications";
import { Button, LoadMoreTrigger, PageLoader } from "../shared/ui";

const tabLabels: Record<ApplicationListTab, string> = {
   "in-progress": "In progress",
   sent: "Sent",
};

const emptyTabTexts: Record<ApplicationListTab, string> = {
   "in-progress": "Nothing in progress: press Apply on a vacancy in Matches.",
   sent: "Nothing yet: what you send through JobPilot, or Mark applied on a job site in Matches, shows here.",
};

/**
 * My applications, one per job site I apply through: the ones JobPilot is on or waiting for me with,
 * the latest activity first, and every one sent, by JobPilot or marked by hand, the latest first.
 * The tab, the search and the filters are in the address (?tab=sent&q=acme&source=dou&origin=manual):
 * back from an application, the list is as I left it.
 */
export function ApplicationsPage() {
   const [params, setParams] = useSearchParams();
   const tab = applicationListTabs.find((t) => t === params.get("tab")) ?? "in-progress";
   const filter: ApplicationListFilter = {
      tab,
      q: params.get("q") ?? "",
      source: sourceCatalog.find((s) => s.id === params.get("source"))?.id ?? null,
      // in progress, every one is JobPilot's
      origin:
         tab === "sent"
            ? (applicationOrigins.find((o) => o === params.get("origin")) ?? null)
            : null,
   };
   // in place of the address, not a new entry: back leaves the page, it doesn't walk through tabs
   const setFilter = (next: ApplicationListFilter) => {
      const query = new URLSearchParams();
      if (next.tab !== "in-progress") query.set("tab", next.tab);
      if (next.q) query.set("q", next.q);
      if (next.source) query.set("source", next.source);
      if (next.origin) query.set("origin", next.origin);
      setParams(query, { replace: true });
   };
   // the search and the site stay, how it was sent is Sent's own
   const setTab = (t: ApplicationListTab) => setFilter({ ...filter, tab: t, origin: null });
   const applications = useApplications(filter);
   const items = applications.data?.pages.flatMap((page) => page.items);
   const filtered = !!(filter.q || filter.source || filter.origin);

   return (
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
         <h1 className="mb-6 text-2xl font-semibold">Applications</h1>

         <nav className="mb-4 flex gap-2">
            {applicationListTabs.map((t) => (
               <Button
                  key={t}
                  variant={t === tab ? "primary" : "secondary"}
                  onClick={() => setTab(t)}
               >
                  {tabLabels[t]}
               </Button>
            ))}
         </nav>

         <ApplicationFilters filter={filter} onChange={setFilter} />

         {applications.isPending && <PageLoader />}
         {applications.isError && !applications.isFetchNextPageError && (
            <p className="text-red-600">{applications.error.message}</p>
         )}
         {items?.length === 0 && (
            <p className="text-sm text-gray-500">
               {filtered ? "Nothing matches." : emptyTabTexts[tab]}
            </p>
         )}
         {!!items?.length && (
            <ul className="divide-y divide-gray-200 rounded border border-gray-200">
               {items.map((app) => (
                  <ApplicationRow key={app.id} app={app} removable={tab === "in-progress"} />
               ))}
            </ul>
         )}
         {applications.isFetchingNextPage && <PageLoader label="Loading more…" />}
         {/* not retried by scrolling: a failing request would repeat at once */}
         {applications.isFetchNextPageError && (
            <div className="mt-4 flex items-center gap-3">
               <p className="text-red-600">{applications.error.message}</p>
               <Button onClick={() => applications.fetchNextPage()}>Try again</Button>
            </div>
         )}
         <LoadMoreTrigger
            onVisible={() => applications.fetchNextPage()}
            disabled={
               !applications.hasNextPage ||
               applications.isFetchingNextPage ||
               applications.isFetchNextPageError
            }
         />
      </main>
   );
}
