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
 * with it and when it was posted. On a phone (below sm) the actions go under the title, a row of their
 * own the card's width (beside it they'd squeeze the title to a word a line), the date under the
 * details.
 */
export function MatchHeader({ match, title, children }: Props) {
   const verdict = matchVerdict(match);
   const details = matchDetailsLine(match);

   return (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
         <div className="flex min-w-0 items-start gap-3 sm:gap-4">
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
               <PublishedDate match={match} className="sm:hidden" />
            </div>
         </div>
         <div className="flex flex-col items-start gap-2 sm:ml-auto sm:shrink-0 sm:items-end">
            <MatchActions match={match} />
            <PublishedDate match={match} className="hidden sm:block" />
         </div>
      </div>
   );
}

/** When the vacancy was posted; className says on which screens, it shows in one place on each. */
function PublishedDate({ match, className }: { match: MatchListItem; className: string }) {
   return (
      // relative z-10: above the card's stretched link, so the tooltip shows in the list too
      <p
         className={`relative z-10 text-sm text-gray-500 ${className}`}
         title="Posted or last bumped on the job site"
      >
         {formatPublishedDate(match)}
      </p>
   );
}
