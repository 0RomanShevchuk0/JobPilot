import type { MatchListItem } from "@jobpilot/contracts";
import { Link, useNavigate } from "react-router";
import { Button, buttonStyles } from "../../../shared/ui";
import { applicationStatusLabels, useStartApplication } from "../../applications";
import { useMarkMatch } from "../api/queries";

/** What I can do with a vacancy: apply through JobPilot (or open my application), mark it or unmark it. */
export function MatchActions({ match }: { match: MatchListItem }) {
   const mark = useMarkMatch(match.vacancyId);
   const apply = useStartApplication();
   const navigate = useNavigate();
   const startApplication = () =>
      apply.mutate(match.vacancyId, { onSuccess: ({ id }) => navigate(`/applications/${id}`) });

   return (
      // relative z-10: above the card's stretched link, so the buttons stay clickable on their own
      <div className="relative z-10 ml-auto flex max-w-xs shrink-0 flex-col items-end gap-2">
         <div className="flex gap-2">
            {match.application ? (
               <Link
                  to={`/applications/${match.application.id}`}
                  className={buttonStyles({ variant: "outline", size: "sm" })}
               >
                  Application: {applicationStatusLabels[match.application.status]}
               </Link>
            ) : (
               // the job site won't take an application: the reason is shown with the vacancy
               !match.cannotApplyReason && (
                  <Button
                     variant="primary"
                     size="sm"
                     onClick={startApplication}
                     disabled={apply.isPending}
                  >
                     Apply
                  </Button>
               )
            )}
            {match.status === null ? (
               <>
                  <Button
                     variant="outline"
                     size="sm"
                     onClick={() => mark.mutate("applied")}
                     disabled={mark.isPending}
                  >
                     Applied
                  </Button>
                  <Button
                     variant="outline"
                     size="sm"
                     onClick={() => mark.mutate("hidden")}
                     disabled={mark.isPending}
                  >
                     Hide
                  </Button>
               </>
            ) : (
               <Button
                  variant="outline"
                  size="sm"
                  onClick={() => mark.mutate(null)}
                  disabled={mark.isPending}
               >
                  Back to new
               </Button>
            )}
         </div>
         {mark.isError && <p className="text-right text-sm text-red-600">{mark.error.message}</p>}
         {apply.isError && <p className="text-right text-sm text-red-600">{apply.error.message}</p>}
      </div>
   );
}
