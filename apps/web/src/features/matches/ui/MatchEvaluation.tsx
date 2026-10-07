import type { MatchListItem } from "@jobpilot/contracts";

interface Props {
   match: MatchListItem;
   /** the skills I have that the vacancy asks for: on the vacancy's page, too long for the card */
   withMatchedSkills?: boolean;
}

/** Why the vacancy scored as it did: the AI's summary, skills, the job site's refusal, concerns. */
export function MatchEvaluation({ match, withMatchedSkills = false }: Props) {
   const reasons = [...match.rejectedBy.map((r) => r.detail), ...match.concerns];

   return (
      <div className="space-y-2 text-sm">
         {match.summary && <p>{match.summary}</p>}
         {withMatchedSkills && match.matchedSkills.length > 0 && (
            <p>
               <span className="text-gray-500">Matched: </span>
               {match.matchedSkills.join(", ")}
            </p>
         )}
         {match.missingSkills.length > 0 && (
            <p>
               <span className="text-gray-500">Missing: </span>
               {match.missingSkills.join(", ")}
            </p>
         )}
         {match.cannotApplyReason && <p className="text-red-700">{match.cannotApplyReason}</p>}
         {reasons.length > 0 && (
            <ul className="list-disc pl-5 text-gray-600">
               {reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
               ))}
            </ul>
         )}
      </div>
   );
}
