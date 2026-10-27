import type { MatchListItem, MatchPosting } from "@jobpilot/contracts";
import { PostingApplyActions } from "./PostingApplyActions";
import { PostingStatus } from "./PostingStatus";

/**
 * Every job site the vacancy is listed on, each with its own way to apply and how it went: a vacancy
 * on several is applied to on each, every one gets me seen more.
 */
export function PostingLinks({ match }: { match: MatchListItem }) {
   const { postings } = match;
   if (postings.length === 0) {
      return <p className="text-sm text-gray-500">No longer listed on any job site.</p>;
   }
   return (
      <div className="text-sm">
         <p className="text-gray-500">
            {postings.length > 1
               ? "On several job sites: applying on each gets you seen more."
               : "On:"}
         </p>
         <ul className="mt-2 space-y-2">
            {postings.map((posting) => (
               // on a phone the actions go under the site's link, as on the card
               <li
                  key={posting.url}
                  className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
               >
                  <span className="flex min-w-0 items-center gap-2">
                     <PostingLink posting={posting} />
                     <PostingStatus posting={posting} details />
                  </span>
                  <PostingApplyActions posting={posting} />
               </li>
            ))}
         </ul>
      </div>
   );
}

function PostingLink({ posting }: { posting: MatchPosting }) {
   return (
      <a
         href={posting.url}
         target="_blank"
         rel="noreferrer"
         className="text-blue-700 hover:underline"
      >
         {posting.sourceName}
      </a>
   );
}
