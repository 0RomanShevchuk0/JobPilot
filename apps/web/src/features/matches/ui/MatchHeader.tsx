import type { MatchListItem } from "@jobpilot/contracts";
import type { ReactNode } from "react";
import { Badge } from "../../../shared/ui";
import {
   formatPublishedDate,
   matchDetailsLine,
   matchVerdict,
   salaryFitLabels,
   salaryFitStyles,
   verdictLabels,
   verdictStyles,
} from "../lib/display";
import { MatchApplyAction, MatchMoreMenu } from "./MatchActions";

interface Props {
   match: MatchListItem;
   /** the title as the place shows it: a link in the list, a heading on the vacancy's page */
   title: ReactNode;
   /** more lines under the details, e.g. the places on the vacancy's page */
   children?: ReactNode;
}

/**
 * The verdict with the score, the title, company · salary · work modes, what I can do with it and when
 * it was posted. Wide: the badge left of the title, the main action and the ⋯ menu on the right, the
 * date under them. On a phone (below sm) the title gets the card's width: the badge, the date and the
 * ⋯ menu are a row above it, the main action a row under it.
 */
export function MatchHeader({ match, title, children }: Props) {
   const verdict = matchVerdict(match);
   const details = matchDetailsLine(match);

   return (
      // wide: the badge and the text span both rows, the date's row takes what's left of their height
      // (1fr), so the date sits right under the actions however long the text is
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-2 sm:grid-cols-[auto_1fr_auto_auto] sm:grid-rows-[auto_1fr] sm:items-start sm:gap-x-2">
         {/* relative z-10: above the card's stretched link, so the tooltip shows in the list too */}
         <div
            className="relative z-10 col-start-1 row-start-1 sm:row-span-2 sm:mr-2"
            title="How well the vacancy fits your profile and CV, as the AI scored it"
         >
            {/* wide: one width for all (the longest, "Worth a try · 50/100"), so the titles of the
                cards in the list start in a line */}
            <Badge
               tone={verdictStyles[verdict]}
               size="md"
               className="sm:inline-block sm:min-w-40 sm:text-center"
            >
               {verdictLabels[verdict]}
               {/* out of 100, not %: read as a score, not as a chance of being hired */}
               {match.score !== null && ` · ${match.score}/100`}
            </Badge>
         </div>
         {/* relative z-10: above the card's stretched link, so the tooltip shows in the list too */}
         <p
            className="relative z-10 col-start-2 row-start-1 text-sm text-gray-500 sm:col-span-2 sm:col-start-3 sm:row-start-2 sm:justify-self-end"
            title="Posted or last bumped on the job site"
         >
            {formatPublishedDate(match)}
         </p>
         <div className="col-span-3 row-start-2 min-w-0 sm:col-span-1 sm:col-start-2 sm:row-span-2 sm:row-start-1 sm:mr-2">
            {title}
            {details && <p className="text-sm text-gray-500">{details}</p>}
            {children}
            {match.salaryFit && (
               <p className={`text-sm ${salaryFitStyles[match.salaryFit]}`}>
                  {salaryFitLabels[match.salaryFit]}
               </p>
            )}
         </div>
         {/* empty:hidden: no main action (the vacancy's page), no empty row on a phone */}
         <div className="col-span-3 row-start-3 mt-1 empty:hidden sm:col-span-1 sm:col-start-3 sm:row-start-1 sm:mt-0">
            <MatchApplyAction match={match} />
         </div>
         {/* after the main action: its open menu paints over it */}
         <div className="col-start-3 row-start-1 sm:col-start-4">
            <MatchMoreMenu match={match} />
         </div>
      </div>
   );
}
