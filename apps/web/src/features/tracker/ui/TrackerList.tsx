import { useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Button, LoadMoreTrigger, PageLoader } from "../../../shared/ui";
import { useJobAttempts } from "../api/queries";
import { JobAttemptPanel } from "./JobAttemptPanel";
import { JobAttemptRow, rowGridClasses } from "./JobAttemptRow";
import { NewJobAttemptPanel } from "./NewJobAttemptPanel";

const columns = ["Company", "Role", "Stage", "Status", "Applied"];

/**
 * Every attempt to get a job, the latest applied first, a page at a time as I scroll. What the panel
 * shows is in the address: a row (?attempt=…: back from its answers, it's open again; only a row of
 * the pages loaded opens) or the form to add one (?add).
 */
export function TrackerList() {
   const attempts = useJobAttempts();
   const items = attempts.data?.pages.flatMap((page) => page.items);
   const [params] = useSearchParams();
   const navigate = useNavigate();
   const openAttempt = items?.find((attempt) => attempt.id === params.get("attempt"));
   const closePanel = useCallback(() => navigate({ search: "" }), [navigate]);

   return (
      <>
         {attempts.isPending && <PageLoader />}
         {attempts.isError && !attempts.isFetchNextPageError && (
            <p className="text-red-600">{attempts.error.message}</p>
         )}
         {items?.length === 0 && (
            <p className="text-sm text-gray-500">
               Nothing yet: what you send through JobPilot, or Mark applied on a job site in
               Matches, shows here. Jobs from elsewhere go in with Add.
            </p>
         )}
         {!!items?.length && (
            <div className="rounded border border-gray-200">
               <div
                  className={`hidden gap-x-3 border-b border-gray-200 bg-gray-50 px-4 py-1.5 text-xs font-medium text-gray-500 sm:grid ${rowGridClasses}`}
               >
                  {columns.map((column) => (
                     <span key={column} className={column === "Applied" ? "text-right" : ""}>
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
         {openAttempt && <JobAttemptPanel attempt={openAttempt} onClose={closePanel} />}
         {params.has("add") && <NewJobAttemptPanel onClose={closePanel} />}
      </>
   );
}
