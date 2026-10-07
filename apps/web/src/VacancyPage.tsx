import type { MatchDetails } from "@jobpilot/contracts";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import { apiGet } from "./api";
import { MatchActions } from "./MatchActions";
import {
   matchDetailsLine,
   matchVerdict,
   salaryFitLabels,
   salaryFitStyles,
   verdictStyles,
} from "./matchDisplay";

/** One vacancy as evaluated for my profile: every job site it is on, the evaluation, the description. */
export function VacancyPage() {
   const { vacancyId } = useParams<{ vacancyId: string }>();
   const match = useQuery({
      // under "matches": marking a vacancy in the list refreshes its page too
      queryKey: ["matches", "details", vacancyId],
      queryFn: () => apiGet<MatchDetails>(`/matches/${vacancyId}`),
   });

   return (
      <main className="mx-auto max-w-4xl p-6">
         <Link to="/matches" className="text-sm text-gray-500 hover:text-gray-900">
            ← Matches
         </Link>
         {match.isPending && <p className="mt-4 text-gray-500">Loading…</p>}
         {match.isError && <p className="mt-4 text-red-600">{match.error.message}</p>}
         {match.data && <Vacancy match={match.data} />}
      </main>
   );
}

function Vacancy({ match }: { match: MatchDetails }) {
   const verdict = matchVerdict(match);
   const details = matchDetailsLine(match);
   const places = match.locations.map((l) => l.raw).join(", ");
   const reasons = [...match.rejectedBy.map((r) => r.detail), ...match.concerns];

   return (
      <article className="mt-4">
         <header className="flex items-start gap-4">
            <span
               className={`shrink-0 rounded px-2 py-1 text-sm font-medium ${verdictStyles[verdict]}`}
            >
               {match.score ?? "–"} {verdict}
            </span>
            <div className="min-w-0">
               <h1 className="text-2xl font-semibold">{match.title}</h1>
               {details && <p className="text-sm text-gray-500">{details}</p>}
               {places && <p className="text-sm text-gray-500">{places}</p>}
            </div>
            <MatchActions match={match} />
         </header>

         <section className="mt-4 text-sm">
            <span className="text-gray-500">On: </span>
            {match.postings.length === 0
               ? "no longer listed anywhere"
               : match.postings.map((posting, i) => (
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
         </section>

         {match.salaryFit && (
            <p className={`mt-2 text-sm ${salaryFitStyles[match.salaryFit]}`}>
               {salaryFitLabels[match.salaryFit]}
            </p>
         )}
         {match.cannotApplyReason && (
            <p className="mt-2 text-sm text-red-700">{match.cannotApplyReason}</p>
         )}

         <section className="mt-6 space-y-2 text-sm">
            {match.summary && <p>{match.summary}</p>}
            {match.matchedSkills.length > 0 && (
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
            {reasons.length > 0 && (
               <ul className="list-disc pl-5 text-gray-600">
                  {reasons.map((reason) => (
                     <li key={reason}>{reason}</li>
                  ))}
               </ul>
            )}
         </section>

         {/* markdown reads fine as plain text; a renderer can come when it's worth a dependency */}
         <section className="mt-6 border-t border-gray-200 pt-6 text-sm whitespace-pre-wrap">
            {match.description}
         </section>
      </article>
   );
}
