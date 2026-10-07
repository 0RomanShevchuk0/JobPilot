import type { MatchPosting } from "@jobpilot/contracts";

/** Every job site the vacancy is listed on, as links: "On: Djinni · DOU". */
export function PostingLinks({ postings }: { postings: MatchPosting[] }) {
   return (
      <p className="text-sm">
         <span className="text-gray-500">On: </span>
         {postings.length === 0
            ? "no longer listed anywhere"
            : postings.map((posting, i) => (
                 <span key={posting.url}>
                    {i > 0 && " · "}
                    <a
                       href={posting.url}
                       target="_blank"
                       rel="noreferrer"
                       className="text-blue-700 hover:underline"
                    >
                       {posting.sourceName}
                    </a>
                 </span>
              ))}
      </p>
   );
}
