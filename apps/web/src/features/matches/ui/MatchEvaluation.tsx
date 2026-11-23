import type { MatchListItem } from "@jobpilot/contracts";

/** Why the vacancy scored as it did: the AI's conclusion, the reasons to apply and the ones against. */
export function MatchEvaluation({ match }: { match: MatchListItem }) {
   const against = [
      ...(match.cannotApplyReason ? [match.cannotApplyReason] : []),
      ...match.rejectedBy.map((r) => r.detail),
      ...match.concerns,
   ];

   return (
      <div className="space-y-2 text-sm">
         {match.summary && <p>{match.summary}</p>}
         {(match.strengths.length > 0 || against.length > 0) && (
            <ul className="space-y-0.5">
               {match.strengths.map((strength) => (
                  <Point key={strength} sign="+" label="For" tone="text-green-700">
                     {strength}
                  </Point>
               ))}
               {against.map((reason) => (
                  <Point key={reason} sign="−" label="Against" tone="text-red-700">
                     {reason}
                  </Point>
               ))}
            </ul>
         )}
      </div>
   );
}

interface PointProps {
   sign: string;
   /** what the sign means, for a screen reader */
   label: string;
   tone: string;
   children: string;
}

/** One reason with its sign in a column of its own, so a long one wraps beside it. */
function Point({ sign, label, tone, children }: PointProps) {
   return (
      <li className={`flex gap-2 ${tone}`}>
         <span className="w-3 shrink-0 text-center font-semibold" aria-hidden>
            {sign}
         </span>
         <span>
            <span className="sr-only">{label}: </span>
            {children}
         </span>
      </li>
   );
}
