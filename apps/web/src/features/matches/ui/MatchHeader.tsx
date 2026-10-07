import type { MatchListItem } from "@jobpilot/contracts";
import type { ReactNode } from "react";
import {
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

/** The verdict with the score, the title, company · salary · work modes, and what I can do with it. */
export function MatchHeader({ match, title, children }: Props) {
   const verdict = matchVerdict(match);
   const details = matchDetailsLine(match);

   return (
      <div className="flex items-start gap-4">
         <span
            className={`shrink-0 rounded px-2 py-1 text-sm font-medium ${verdictStyles[verdict]}`}
         >
            {match.score ?? "–"} {verdict}
         </span>
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
         <MatchActions match={match} />
      </div>
   );
}
