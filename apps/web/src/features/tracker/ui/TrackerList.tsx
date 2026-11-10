import { useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Button, LoadMoreTrigger, PageLoader } from "../../../shared/ui";
import { useJobAttempt, useJobAttempts, type JobAttemptListFilter } from "../api/queries";
import { trackerAddress } from "../lib/address";
import { JobAttemptPanel } from "./JobAttemptPanel";
import { JobAttemptRow, rowGridClasses } from "./JobAttemptRow";
import { NewJobAttemptPanel } from "./NewJobAttemptPanel";
import { TrackerFilters } from "./TrackerFilters";

const columns = ["Company", "Role", "Stage", "Status", "Asked", "Notes", "Applied"];
// numbers line up on the right, to compare
const rightAlignedColumns = ["Asked", "Applied"];

/**
 * Every attempt to get a job, the latest applied first, a page at a time as I scroll, searched and
 * filtered by stage and status. The filter and what the panel shows are in the address: a row
 * (?attempt=…: back from its answers, it's open again; any row of mine opens, loaded or not, and stays
 * open when a change filters it out) or the form to add one (?add).
 */
export function TrackerList() {
   const [params, setParams] = useSearchParams();
   const filter = trackerAddress.readFilter(params);
   const filtered = !!(filter.q || filter.stage || filter.status);
   const attempts = useJobAttempts(filter);
   const items = attempts.data?.pages.flatMap((page) => page.items);
   const navigate = useNavigate();
   const openId = params.get("attempt");
   // asked for on its own too: the list's copy shows at once, this one when the list has none
   const openDetails = useJobAttempt(openId);
   const openAttempt = items?.find((attempt) => attempt.id === openId) ?? openDetails.data;
   // the filter stays, and so does where the list is scrolled
   const closePanel = useCallback(
      () =>
         navigate({ search: trackerAddress.withPanel(params, null) }, { preventScrollReset: true }),
      [navigate, params],
   );
   // in place of the address, not a new entry: back leaves the page, it doesn't walk through searches
   const setFilter = (next: JobAttemptListFilter) =>
      setParams((current) => trackerAddress.withFilter(current, next), { replace: true });

   return (
      <>
         <TrackerFilters filter={filter} onChange={setFilter} />
         {attempts.isPending && <PageLoader />}
         {attempts.isError && !attempts.isFetchNextPageError && (
            <p className="text-red-600">{attempts.error.message}</p>
         )}
         {/* a link to a row that's gone: said, not a panel that never opens */}
         {!openAttempt && openDetails.isError && (
            <p className="mb-4 text-red-600">{openDetails.error.message}</p>
         )}
         {items?.length === 0 && (
            <p className="text-sm text-gray-500">
               {filtered
                  ? "Nothing matches."
                  : "Nothing yet: what you send through JobPilot, or Mark applied on a job site in Matches, shows here. Jobs from elsewhere go in with Add."}
            </p>
         )}
         {!!items?.length && (
            <div className="rounded border border-gray-200">
               <div
                  className={`hidden gap-x-3 border-b border-gray-200 bg-gray-50 px-4 py-1.5 text-xs font-medium text-gray-500 sm:grid ${rowGridClasses}`}
               >
                  {columns.map((column) => (
                     <span
                        key={column}
                        className={rightAlignedColumns.includes(column) ? "text-right" : ""}
                     >
                        {column}
                     </span>
                  ))}
               </div>
               <ul className="divide-y divide-gray-200">
                  {items.map((attempt) => (
                     <JobAttemptRow key={attempt.id} attempt={attempt} />
                  ))}
               </ul>
            </div>
         )}
         {attempts.isFetchingNextPage && <PageLoader label="Loading more…" />}
         {/* not retried by scrolling: a failing request would repeat at once */}
         {attempts.isFetchNextPageError && (
            <div className="mt-4 flex items-center gap-3">
               <p className="text-red-600">{attempts.error.message}</p>
               <Button onClick={() => attempts.fetchNextPage()}>Try again</Button>
            </div>
         )}
         <LoadMoreTrigger
            onVisible={() => attempts.fetchNextPage()}
            disabled={
               !attempts.hasNextPage || attempts.isFetchingNextPage || attempts.isFetchNextPageError
            }
         />
         {/* a new panel for each row: one being edited doesn't carry over to the next */}
         {openAttempt && (
            <JobAttemptPanel key={openAttempt.id} attempt={openAttempt} onClose={closePanel} />
         )}
         {params.has("add") && <NewJobAttemptPanel onClose={closePanel} />}
      </>
   );
}
