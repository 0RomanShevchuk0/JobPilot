import type { MatchListItem } from "@jobpilot/contracts";
import { Link } from "react-router";
import { MatchEvaluation } from "./MatchEvaluation";
import { MatchHeader } from "./MatchHeader";

/**
 * A vacancy in the list of matches. The whole card leads to its page: the title link's ::after
 * stretches over the card, so it still opens in a new tab like any link; the actions sit above it.
 */
export function MatchCard({ match }: { match: MatchListItem }) {
   const title = (
      <Link
         to={`/matches/${match.vacancyId}`}
         className="font-medium after:absolute after:inset-0 after:rounded-lg"
      >
         {match.title}
      </Link>
   );
   return (
      <li className="relative rounded-lg border border-gray-200 p-4 hover:bg-gray-50">
         <MatchHeader match={match} title={title}>
            <SourceBadges match={match} />
         </MatchHeader>
         <div className="mt-3">
            <MatchEvaluation match={match} />
         </div>
      </li>
   );
}

/** The job sites the vacancy is listed on; links to them are on its page. */
function SourceBadges({ match }: { match: MatchListItem }) {
   if (match.postings.length === 0) return null;
   return (
      <p className="mt-1 flex gap-1">
         {match.postings.map((posting) => (
            <span
               key={posting.url}
               className="rounded bg-indigo-50 px-1.5 py-0.5 text-xs font-medium text-indigo-700"
            >
               {posting.sourceName}
            </span>
         ))}
      </p>
   );
}
