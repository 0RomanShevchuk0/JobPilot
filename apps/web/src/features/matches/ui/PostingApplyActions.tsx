import type { MatchPosting } from "@jobpilot/contracts";
import { Link, useNavigate } from "react-router";
import { ArrowRightIcon, Badge, Button, buttonStyles } from "../../../shared/ui";
import {
   applicationStatusLabels,
   applicationStatusStyles,
   useStartApplication,
   useUnmarkSentByHand,
} from "../../applications";
import { ExternalApplyLink } from "./ExternalApplyLink";
import { MarkSentByHandButton } from "./MarkSentByHandButton";

/**
 * What I can do through one posting: Apply (JobPilot fills the job site's form in), or apply on the
 * employer's site it sends to, and Mark applied when I did it myself, whatever became of JobPilot's
 * application there. Once sent, when and how; one I marked by hand can be taken back.
 */
export function PostingApplyActions({ posting }: { posting: MatchPosting }) {
   const apply = useStartApplication();
   const unmarkSent = useUnmarkSentByHand();
   const navigate = useNavigate();
   const { application } = posting;
   const error = apply.error ?? unmarkSent.error;
   const markSentButton = <MarkSentByHandButton postingId={posting.id} />;
   // why its site refused, on its page or to an application: shown whatever else stands next to it
   const refusal = posting.cannotApplyReason && (
      <span className="max-w-60 truncate text-sm text-gray-500" title={posting.cannotApplyReason}>
         Can't apply: {posting.cannotApplyReason}
      </span>
   );
   // anything started on this site shows its status; nothing started, only what I can do. A refusal
   // stands in for it: the reason says more than "can't apply"
   const statusBadge = application && (
      <Badge tone={applicationStatusStyles[application.status]}>
         {applicationStatusLabels[application.status]}
      </Badge>
   );

   function actions() {
      if (application?.status === "submitted") {
         const sentOn = application.submittedAt
            ? new Date(application.submittedAt).toLocaleDateString()
            : "";
         return (
            <>
               {statusBadge}
               <span className="text-sm text-gray-500">
                  {sentOn} · {application.origin === "manual" ? "by hand" : "JobPilot"}
               </span>
               {application.origin === "manual" && (
                  <Button
                     variant="outline"
                     size="sm"
                     onClick={() => unmarkSent.mutate(application.id)}
                     loading={unmarkSent.isPending}
                  >
                     Undo
                  </Button>
               )}
            </>
         );
      }
      if (application) {
         // ready: checking the answers and sending is what's next, the main thing here
         const ready = application.status === "ready_for_review";
         const linkStyles = buttonStyles({ variant: ready ? "primary" : "outline", size: "sm" });
         return (
            <>
               {refusal ?? statusBadge}
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
      // its page said I can't apply here: no Apply, why instead; I may still have applied myself
      if (refusal) {
         return (
            <>
               {refusal}
               {markSentButton}
            </>
         );
      }
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
      <div className="flex flex-col items-end gap-1">
         <div className="flex items-center gap-2">{actions()}</div>
         {error && <p className="text-right text-sm text-red-600">{error.message}</p>}
      </div>
   );
}
