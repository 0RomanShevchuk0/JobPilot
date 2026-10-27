import type { MatchListItem, MatchPosting } from "@jobpilot/contracts";
import { Link, useParams } from "react-router";
import {
   buttonStyles,
   CheckIcon,
   EllipsisIcon,
   EyeOffIcon,
   Menu,
   menuItemStyles,
   Spinner,
   UndoIcon,
} from "../../../shared/ui";
import { useMarkSentByHand } from "../../applications";
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
 * Where applying to the vacancy stands across its job sites: the one posting left to apply through, or
 * the one site that refused when there's nothing else, and how many are left.
 */
function applyChoices(match: MatchListItem) {
   const toApply = match.postings.filter(isToApplyThrough);
   const appliedOn = match.postings.filter((p) => p.application?.status === "submitted");
   const [onlyToApply] = toApply.length === 1 ? toApply : [];
   // nowhere left to apply, its one site refused: often because I applied there myself already
   const refused = match.postings.filter((p) => p.cannotApplyReason !== null);
   const [onlyRefused] =
      toApply.length === 0 && appliedOn.length === 0 && refused.length === 1 ? refused : [];
   return { toApplyCount: toApply.length, onlyToApply, onlyRefused };
}

/** Whether this is the vacancy's own page: each job site has its own actions there, by its link. */
function useOnItsPage(match: MatchListItem): boolean {
   return useParams<{ vacancyId: string }>().vacancyId === match.vacancyId;
}

/**
 * The main thing to do with a vacancy, in the list: apply on its job site (one left to apply through),
 * pick which on its page (several), or Mark applied when that's all there is to do. Where applying
 * stands on each site is on the card's site badges ("Djinni · sent", "DOU").
 */
export function MatchApplyAction({ match }: { match: MatchListItem }) {
   const onItsPage = useOnItsPage(match);
   const { toApplyCount, onlyToApply, onlyRefused } = applyChoices(match);

   function action() {
      if (onItsPage) return null;
      if (onlyToApply) {
         return <PostingApplyActions posting={onlyToApply} withMarkApplied={false} />;
      }
      // the reason is on the card already: only the way to say I applied
      if (onlyRefused) return <MarkSentByHandButton postingId={onlyRefused.id} />;
      if (toApplyCount > 1) {
         return (
            <Link
               to={`/matches/${match.vacancyId}`}
               className={`${buttonStyles({ variant: "primary", size: "sm" })} text-center`}
            >
               Apply…
            </Link>
         );
      }
      return null;
   }

   const shown = action();
   if (!shown) return null;
   // relative z-20: above the card's stretched link, so the buttons stay clickable on their own, and
   // above the date (z-10). On a phone the card's width (flex: its one child stretches)
   return <div className="relative z-20 flex flex-col sm:block">{shown}</div>;
}

/**
 * The rarer things to do with a vacancy, in a ⋯ menu: Mark applied (I applied without JobPilot), hide
 * it or show it again.
 */
export function MatchMoreMenu({ match }: { match: MatchListItem }) {
   const mark = useMarkMatch(match.vacancyId);
   const markSent = useMarkSentByHand();
   const onItsPage = useOnItsPage(match);
   const { onlyToApply } = applyChoices(match);
   const error = mark.error ?? markSent.error;

   return (
      // relative z-20: above the card's stretched link, and above the date (z-10) its menu covers
      <div className="relative z-20 flex flex-col items-end gap-1">
         <Menu
            label="More actions"
            trigger={
               // a line's height, as the buttons beside it with their text
               <span className="flex h-5 items-center">
                  {mark.isPending || markSent.isPending ? (
                     <Spinner className="size-3.5" />
                  ) : (
                     <EllipsisIcon />
                  )}
               </span>
            }
            triggerClassName={buttonStyles({ variant: "outline", size: "sm" })}
         >
            {onlyToApply && !onItsPage && (
               <button
                  type="button"
                  onClick={() => markSent.mutate(onlyToApply.id)}
                  title="I applied through this job site myself"
                  className={menuItemStyles}
               >
                  <CheckIcon />
                  Mark applied
               </button>
            )}
            {match.status === null ? (
               <button
                  type="button"
                  onClick={() => mark.mutate("hidden")}
                  className={menuItemStyles}
               >
                  <EyeOffIcon />
                  Hide
               </button>
            ) : (
               <button type="button" onClick={() => mark.mutate(null)} className={menuItemStyles}>
                  <UndoIcon />
                  Back to new
               </button>
            )}
         </Menu>
         {/* narrow: the button's column stays narrow beside the title */}
         {error && <p className="max-w-40 text-right text-sm text-red-600">{error.message}</p>}
      </div>
   );
}
