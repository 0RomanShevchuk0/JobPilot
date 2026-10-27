import type { MatchPosting } from "@jobpilot/contracts";
import { Link, useNavigate } from "react-router";
import { ArrowRightIcon, Button, buttonStyles } from "../../../shared/ui";
import { useStartApplication, useUnmarkSentByHand } from "../../applications";
import { ExternalApplyLink } from "./ExternalApplyLink";
import { MarkSentByHandButton } from "./MarkSentByHandButton";

/**
 * What I can do through one posting, buttons only: Apply (JobPilot fills the job site's form in), or
 * apply on the employer's site it sends to, and Mark applied when I did it myself, whatever became of
 * JobPilot's application there; one I marked by hand can be taken back. Where it stands is the site's
 * badge (PostingStatus, the card's site badges), not here.
 */
export function PostingApplyActions({ posting }: { posting: MatchPosting }) {
   const apply = useStartApplication();
   const unmarkSent = useUnmarkSentByHand();
   const navigate = useNavigate();
   const { application } = posting;
   const error = apply.error ?? unmarkSent.error;
   const markSentButton = <MarkSentByHandButton postingId={posting.id} />;

   function actions() {
      if (application?.status === "submitted") {
         if (application.origin !== "manual") return null;
         return (
            <Button
               variant="outline"
               size="sm"
               onClick={() => unmarkSent.mutate(application.id)}
               loading={unmarkSent.isPending}
            >
               Undo
            </Button>
         );
      }
      if (application) {
         // ready: checking the answers and sending is what's next, the main thing here
         const ready = application.status === "ready_for_review";
         const linkStyles = buttonStyles({ variant: ready ? "primary" : "outline", size: "sm" });
         return (
            <>
               <Link
                  to={`/applications/${application.id}`}
                  className={`${linkStyles} inline-flex items-center gap-1.5`}
               >
                  {ready ? "Review & send" : "Open"}
                  <ArrowRightIcon />
               </Link>
               {/* in work, I may send it myself instead; refused, often because I already applied
                   there myself ("Already applied to this job") */}
               {markSentButton}
            </>
         );
      }
      // its page said I can't apply here: no Apply; I may still have applied myself
      if (posting.cannotApplyReason) return markSentButton;
      return (
         <>
            {posting.externalApplyUrl ? (
               <ExternalApplyLink url={posting.externalApplyUrl} />
            ) : (
               <Button
                  variant="primary"
                  size="sm"
                  onClick={() =>
                     apply.mutate(posting.id, {
                        onSuccess: ({ id }) => navigate(`/applications/${id}`),
                     })
                  }
                  loading={apply.isPending}
               >
                  Apply
               </Button>
            )}
            {markSentButton}
         </>
      );
   }

   return (
      // on a phone at the left, under what they're for, wrapping when they don't fit in a row
      <div className="flex flex-col items-start gap-1 sm:items-end">
         <div className="flex flex-wrap items-center gap-2 sm:justify-end">{actions()}</div>
         {error && <p className="max-w-xs text-sm text-red-600 sm:text-right">{error.message}</p>}
      </div>
   );
}
