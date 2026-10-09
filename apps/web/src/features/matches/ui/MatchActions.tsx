import type { MatchListItem } from "@jobpilot/contracts";
import { Link, useNavigate, useParams } from "react-router";
import { Button, buttonStyles } from "../../../shared/ui";
import { applicationStatusLabels, useStartApplication } from "../../applications";
import { useMarkMatch } from "../api/queries";

/** What I can do with a vacancy: apply through JobPilot (or open my application), mark it or unmark it. */
export function MatchActions({ match }: { match: MatchListItem }) {
   const mark = useMarkMatch(match.vacancyId);
   const apply = useStartApplication();
   const navigate = useNavigate();
   // on the vacancy's own page each job site has its Apply, next to its link
   const onItsPage = useParams<{ vacancyId: string }>().vacancyId === match.vacancyId;
   const [onlyPosting] = match.postings.length === 1 ? match.postings : [];
   const startApplication = (postingId: string) =>
      apply.mutate(postingId, { onSuccess: ({ id }) => navigate(`/applications/${id}`) });

   function applyAction() {
      if (match.application) {
         return (
            <Link
               to={`/applications/${match.application.id}`}
               className={buttonStyles({ variant: "outline", size: "sm" })}
            >
               Application: {applicationStatusLabels[match.application.status]}
            </Link>
         );
      }
      // no job site takes an application: the reason is shown with the vacancy
      if (match.cannotApplyReason) return null;
      if (onlyPosting) {
         return (
            <Button
               variant="primary"
               size="sm"
               onClick={() => startApplication(onlyPosting.id)}
               disabled={apply.isPending}
            >
               Apply
            </Button>
         );
      }
      // listed on several job sites: which one to apply through is picked on its page
      if (match.postings.length > 1 && !onItsPage) {
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
         <div className="flex gap-2">
            {applyAction()}
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
