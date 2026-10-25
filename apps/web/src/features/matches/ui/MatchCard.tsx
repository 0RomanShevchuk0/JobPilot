import type { MatchListItem, MatchPosting } from "@jobpilot/contracts";
import { Link } from "react-router";
import { Badge } from "../../../shared/ui";
import { postingState } from "../lib/posting-state";
import { MatchEvaluation } from "./MatchEvaluation";
import { MatchHeader } from "./MatchHeader";
import { PostingStatus } from "./PostingStatus";

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

/** The job sites the vacancy is listed on, each with where applying stands on it; links are on its page. */
function SourceBadges({ match }: { match: MatchListItem }) {
   if (match.postings.length === 0) return null;
   // a site that lists the job twice (a repost) shows once: the posting something started on, if any
   const bySite = new Map<string, MatchPosting>();
   for (const posting of match.postings) {
      const shown = bySite.get(posting.sourceName);
      if (!shown || (!postingState(shown) && postingState(posting))) {
         bySite.set(posting.sourceName, posting);
      }
   }
   return (
      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
         {[...bySite].map(([name, posting]) => (
            <span key={name} className="flex items-center gap-1.5">
               <Badge tone="bg-indigo-50 text-indigo-700">{name}</Badge>
               <PostingStatus posting={posting} />
            </span>
         ))}
      </p>
   );
}
