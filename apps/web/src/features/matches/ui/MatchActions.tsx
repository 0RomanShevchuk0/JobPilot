import type { MatchListItem, MatchPosting } from "@jobpilot/contracts";
import { Link, useParams } from "react-router";
import { Button, buttonStyles } from "../../../shared/ui";
import { useMarkMatch } from "../api/queries";
import { MarkSentByHandButton } from "./MarkSentByHandButton";
import { PostingApplyActions } from "./PostingApplyActions";

/**
 * Whether I can still apply through the posting: nothing sent through it, and its site didn't refuse,
 * on its page or to an application.
 */
const isToApplyThrough = (posting: MatchPosting) =>
   posting.application?.status !== "submitted" && posting.cannotApplyReason === null;

/**
 * What I can do with a vacancy: apply on its job site (one left to apply through) or pick which on its
 * page (several), hide it or show it again. Where applying stands on each site is on the card's site
 * badges ("Djinni · sent", "DOU").
 */
export function MatchActions({ match }: { match: MatchListItem }) {
   const mark = useMarkMatch(match.vacancyId);
   // on the vacancy's own page each job site has its own actions, next to its link
   const onItsPage = useParams<{ vacancyId: string }>().vacancyId === match.vacancyId;
   const toApply = match.postings.filter(isToApplyThrough);
   const appliedOn = match.postings.filter((p) => p.application?.status === "submitted");
   const [onlyToApply] = toApply.length === 1 ? toApply : [];
   // nowhere left to apply, its one site refused: often because I applied there myself already
   const refused = match.postings.filter((p) => p.cannotApplyReason !== null);
   const [onlyRefused] =
      toApply.length === 0 && appliedOn.length === 0 && refused.length === 1 ? refused : [];

   function applyAction() {
      if (onItsPage) return null;
      if (onlyToApply) {
         return <PostingApplyActions posting={onlyToApply} />;
      }
      // the reason is on the card already: only the way to say I applied
      if (onlyRefused) return <MarkSentByHandButton postingId={onlyRefused.id} />;
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
      <div className="relative z-10 ml-auto flex shrink-0 flex-col items-end gap-2">
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
         {mark.isError && (
            <p className="max-w-xs text-right text-sm text-red-600">{mark.error.message}</p>
         )}
      </div>
   );
}
