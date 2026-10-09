import type { MatchListItem } from "@jobpilot/contracts";
import type { ReactNode } from "react";
import { Badge } from "../../../shared/ui";
import {
   formatPublishedDate,
   matchDetailsLine,
   matchVerdict,
   salaryFitLabels,
   salaryFitStyles,
   verdictStyles,
} from "../lib/display";
import { MatchActions } from "./MatchActions";

interface Props {
   match: MatchListItem;
   /** the title as the place shows it: a link in the list, a heading on the vacancy's page */
   title: ReactNode;
   /** more lines under the details, e.g. the places on the vacancy's page */
   children?: ReactNode;
}

/**
 * The verdict with the score, the title, company · salary · work modes, and on the right what I can do
 * with it and when it was posted.
 */
export function MatchHeader({ match, title, children }: Props) {
   const verdict = matchVerdict(match);
   const details = matchDetailsLine(match);

   return (
      <div className="flex items-start gap-4">
         <Badge tone={verdictStyles[verdict]} size="md">
            {match.score ?? "–"} {verdict}
         </Badge>
         <div className="min-w-0">
            {title}
            {details && <p className="text-sm text-gray-500">{details}</p>}
            {children}
            {match.salaryFit && (
               <p className={`text-sm ${salaryFitStyles[match.salaryFit]}`}>
                  {salaryFitLabels[match.salaryFit]}
               </p>
            )}
         </div>
         <div className="ml-auto flex shrink-0 flex-col items-end gap-2">
            <MatchActions match={match} />
            {/* relative z-10: above the card's stretched link, so the tooltip shows in the list too */}
            <p
               className="relative z-10 text-sm text-gray-500"
               title="Posted or last bumped on the job site"
            >
               {formatPublishedDate(match)}
            </p>
         </div>
      </div>
   );
}
