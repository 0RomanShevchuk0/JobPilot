import type { MatchPosting } from "@jobpilot/contracts";
import { Link, useNavigate } from "react-router";
import { Button, buttonStyles } from "../../../shared/ui";
import {
   applicationStatusLabels,
   useMarkSentByHand,
   useStartApplication,
   useUnmarkSentByHand,
} from "../../applications";
import { ExternalApplyLink } from "./ExternalApplyLink";

interface Props {
   posting: MatchPosting;
   /** the job site's check said I can't apply on it: no Apply through JobPilot */
   refusedOnSite: boolean;
}

/**
 * What I can do through one posting: Apply (JobPilot fills the job site's form in), or apply on the
 * employer's site it sends to, and mark it Applied when I did it myself, whatever became of JobPilot's
 * application there. Once sent, when and how; one I marked by hand can be taken back.
 */
export function PostingApplyActions({ posting, refusedOnSite }: Props) {
   const apply = useStartApplication();
   const markSent = useMarkSentByHand();
   const unmarkSent = useUnmarkSentByHand();
   const navigate = useNavigate();
   const { application } = posting;
   const error = apply.error ?? markSent.error ?? unmarkSent.error;

   const markSentButton = (
      <Button
         variant="outline"
         size="sm"
         onClick={() => markSent.mutate(posting.id)}
         loading={markSent.isPending}
         title="I applied through this job site myself"
      >
         Applied
      </Button>
   );

   function actions() {
      if (application?.status === "submitted") {
         const sentOn = application.submittedAt
            ? new Date(application.submittedAt).toLocaleDateString()
            : "";
         return (
            <>
               <span className="text-sm text-green-700">
                  Applied {sentOn} · {application.origin === "manual" ? "by hand" : "JobPilot"}
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
         return (
            <>
               <Link
                  to={`/applications/${application.id}`}
                  className={buttonStyles({ variant: "outline", size: "sm" })}
               >
                  Application: {applicationStatusLabels[application.status]}
               </Link>
               {/* in work, I may send it myself instead; refused, often because I already applied
                   there myself ("Already applied to this job") */}
               {markSentButton}
            </>
         );
      }
      return (
         <>
            {posting.externalApplyUrl ? (
               <ExternalApplyLink url={posting.externalApplyUrl} />
            ) : (
               !refusedOnSite && (
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
               )
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
