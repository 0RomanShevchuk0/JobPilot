import type { MatchListItem, MatchPosting } from "@jobpilot/contracts";
import { Link, useParams } from "react-router";
import { Button, buttonStyles } from "../../../shared/ui";
import { useMarkMatch } from "../api/queries";
import { PostingApplyActions } from "./PostingApplyActions";

/** Whether I can still apply through the posting: nothing sent through it, and the site didn't refuse. */
const isToApplyThrough = (posting: MatchPosting) =>
   posting.application?.status !== "submitted" && posting.application?.status !== "cannot_apply";

/**
 * What I can do with a vacancy: apply on its job site (one left to apply through) or pick which on its
 * page (several), hide it or show it again. Applied on some of its sites, it says where is left: each
 * one gets me seen more.
 */
export function MatchActions({ match }: { match: MatchListItem }) {
   const mark = useMarkMatch(match.vacancyId);
   // on the vacancy's own page each job site has its own actions, next to its link
   const onItsPage = useParams<{ vacancyId: string }>().vacancyId === match.vacancyId;
   const toApply = match.postings.filter(isToApplyThrough);
   const appliedOn = match.postings.filter((p) => p.application?.status === "submitted");
   const [onlyToApply] = toApply.length === 1 ? toApply : [];

   function applyAction() {
      if (onItsPage) return null;
      if (onlyToApply) {
         return (
            <PostingApplyActions
               posting={onlyToApply}
               refusedOnSite={match.cannotApplyReason !== null}
            />
         );
      }
      if (toApply.length > 1) {
         return (
            <Link
               to={`/matches/${match.vacancyId}`}
               className={buttonStyles({ variant: "primary", size: "sm" })}
            >
               Apply…
            </Link>
         );
      }
      return null;
   }

   return (
      // relative z-10: above the card's stretched link, so the buttons stay clickable on their own
      <div className="relative z-10 ml-auto flex max-w-xs shrink-0 flex-col items-end gap-2">
         <div className="flex items-start gap-2">
            {applyAction()}
            {match.status === null ? (
               <Button
                  variant="outline"
                  size="sm"
                  onClick={() => mark.mutate("hidden")}
                  loading={mark.isPending}
               >
                  Hide
               </Button>
            ) : (
               <Button
                  variant="outline"
                  size="sm"
                  onClick={() => mark.mutate(null)}
                  loading={mark.isPending}
               >
                  Back to new
               </Button>
            )}
         </div>
         {!onItsPage && appliedOn.length > 0 && toApply.length > 0 && (
            <p className="text-right text-xs text-gray-500">
               Applied on {appliedOn.map((p) => p.sourceName).join(", ")} ·{" "}
               {toApply.map((p) => p.sourceName).join(", ")} left
            </p>
         )}
         {mark.isError && <p className="text-right text-sm text-red-600">{mark.error.message}</p>}
      </div>
   );
}
