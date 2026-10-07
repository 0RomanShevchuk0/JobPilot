import type { MatchListItem } from "@jobpilot/contracts";
import { Link } from "react-router";
import { MatchEvaluation } from "./MatchEvaluation";
import { MatchHeader } from "./MatchHeader";

/** A vacancy in the list of matches; the title leads to its page. */
export function MatchCard({ match }: { match: MatchListItem }) {
   const title = (
      <Link to={`/matches/${match.vacancyId}`} className="font-medium hover:underline">
         {match.title}
      </Link>
   );
   return (
      <li className="rounded-lg border border-gray-200 p-4">
         <MatchHeader match={match} title={title} />
         <div className="mt-3">
            <MatchEvaluation match={match} />
         </div>
      </li>
   );
}
