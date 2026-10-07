import type { MatchListItem } from "@jobpilot/contracts";
import { Link, useNavigate } from "react-router";
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
                  className="rounded border border-gray-300 px-2 py-1 text-sm text-gray-700 hover:bg-gray-50"
               >
                  Application: {applicationStatusLabels[match.application.status]}
               </Link>
            ) : (
               // the job site won't take an application: the reason is shown with the vacancy
               !match.cannotApplyReason && (
                  <button
                     onClick={startApplication}
                     disabled={apply.isPending}
                     className="rounded bg-gray-900 px-2 py-1 text-sm text-white hover:bg-gray-700 disabled:opacity-50"
                  >
                     Apply
                  </button>
               )
            )}
            {match.status === null ? (
               <>
                  <MarkButton onClick={() => mark.mutate("applied")} disabled={mark.isPending}>
                     Applied
                  </MarkButton>
                  <MarkButton onClick={() => mark.mutate("hidden")} disabled={mark.isPending}>
                     Hide
                  </MarkButton>
               </>
            ) : (
               <MarkButton onClick={() => mark.mutate(null)} disabled={mark.isPending}>
                  Back to new
               </MarkButton>
            )}
         </div>
         {mark.isError && <p className="text-right text-sm text-red-600">{mark.error.message}</p>}
         {apply.isError && <p className="text-right text-sm text-red-600">{apply.error.message}</p>}
      </div>
   );
}

function MarkButton(props: { onClick: () => void; disabled: boolean; children: string }) {
   return (
      <button
         onClick={props.onClick}
         disabled={props.disabled}
         className="rounded border border-gray-300 px-2 py-1 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
         {props.children}
      </button>
   );
}
