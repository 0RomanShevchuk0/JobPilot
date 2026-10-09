import type { MatchListItem, MatchPosting } from "@jobpilot/contracts";
import { Link, useNavigate } from "react-router";
import { Button, buttonStyles } from "../../../shared/ui";
import { applicationStatusLabels, useStartApplication } from "../../applications";

/**
 * Every job site the vacancy is listed on, as links: "On: Djinni · DOU". With several, each gets its
 * own Apply (or my application through it): which site to apply through is mine to pick.
 */
export function PostingLinks({ match }: { match: MatchListItem }) {
   const { postings } = match;
   if (postings.length > 1 && !match.cannotApplyReason)
      return <PostingsToApply postings={postings} />;
   return (
      <p className="text-sm">
         <span className="text-gray-500">On: </span>
         {postings.length === 0
            ? "no longer listed anywhere"
            : postings.map((posting, i) => (
                 <span key={posting.url}>
                    {i > 0 && " · "}
                    <PostingLink posting={posting} />
                 </span>
              ))}
      </p>
   );
}

function PostingsToApply({ postings }: { postings: MatchPosting[] }) {
   const apply = useStartApplication();
   const navigate = useNavigate();
   const startApplication = (postingId: string) =>
      apply.mutate(postingId, { onSuccess: ({ id }) => navigate(`/applications/${id}`) });

   return (
      <div className="text-sm">
         <p className="text-gray-500">On several job sites, apply through any of them:</p>
         <ul className="mt-2 space-y-2">
            {postings.map((posting) => (
               <li key={posting.url} className="flex items-center gap-3">
                  <span className="w-20">
                     <PostingLink posting={posting} />
                  </span>
                  {posting.application ? (
                     <Link
                        to={`/applications/${posting.application.id}`}
                        className={buttonStyles({ variant: "outline", size: "sm" })}
                     >
                        Application: {applicationStatusLabels[posting.application.status]}
                     </Link>
                  ) : (
                     <Button
                        variant="primary"
                        size="sm"
                        onClick={() => startApplication(posting.id)}
                        disabled={apply.isPending}
                     >
                        Apply
                     </Button>
                  )}
               </li>
            ))}
         </ul>
         {apply.isError && <p className="mt-2 text-red-600">{apply.error.message}</p>}
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
