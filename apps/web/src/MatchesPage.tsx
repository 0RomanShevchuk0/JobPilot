import type { MatchListItem } from "@jobpilot/contracts";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router";
import { apiGet } from "./api";
import { MatchActions } from "./MatchActions";
import {
   matchDetailsLine,
   matchVerdict,
   salaryFitLabels,
   salaryFitStyles,
   verdictStyles,
} from "./matchDisplay";

type Tab = "new" | "applied" | "hidden";
const tabs: Tab[] = ["new", "applied", "hidden"];

/** Vacancies evaluated for my current profile, best first: new ones, or the ones I marked. */
export function MatchesPage() {
   const [tab, setTab] = useState<Tab>("new");
   const [showSkipped, setShowSkipped] = useState(false);
   const matches = useQuery({
      queryKey: ["matches", { tab, showSkipped }],
      queryFn: () => {
         const query = new URLSearchParams({ status: tab });
         if (tab === "new" && showSkipped) query.set("include", "skipped");
         return apiGet<MatchListItem[]>(`/matches?${query}`);
      },
   });

   return (
      <main className="mx-auto max-w-4xl p-6">
         <header className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Matches</h1>
            {tab === "new" && (
               <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                     type="checkbox"
                     checked={showSkipped}
                     onChange={(e) => setShowSkipped(e.target.checked)}
                  />
                  Show skipped
               </label>
            )}
         </header>

         <nav className="mb-4 flex gap-2">
            {tabs.map((t) => (
               <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`rounded px-3 py-1 text-sm capitalize ${
                     t === tab
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
               >
                  {t}
               </button>
            ))}
         </nav>

         {matches.isPending && <p className="text-gray-500">Loading…</p>}
         {matches.isError && <p className="text-red-600">{matches.error.message}</p>}
         {matches.data?.length === 0 && <p className="text-gray-500">Nothing here.</p>}

         <ul className="space-y-4">
            {matches.data?.map((match) => (
               <MatchCard key={match.vacancyId} match={match} />
            ))}
         </ul>
      </main>
   );
}

function MatchCard({ match }: { match: MatchListItem }) {
   const status = matchVerdict(match);
   const details = matchDetailsLine(match);

   return (
      <li className="rounded-lg border border-gray-200 p-4">
         <div className="flex items-start gap-4">
            <span
               className={`shrink-0 rounded px-2 py-1 text-sm font-medium ${verdictStyles[status]}`}
            >
               {match.score ?? "–"} {status}
            </span>
            <div className="min-w-0">
               <Link to={`/matches/${match.vacancyId}`} className="font-medium hover:underline">
                  {match.title}
               </Link>
               {details && <p className="text-sm text-gray-500">{details}</p>}
               {match.salaryFit && (
                  <p className={`text-sm ${salaryFitStyles[match.salaryFit]}`}>
                     {salaryFitLabels[match.salaryFit]}
                  </p>
               )}
            </div>
            <MatchActions match={match} />
         </div>

         {match.summary && <p className="mt-3 text-sm">{match.summary}</p>}

         {match.missingSkills.length > 0 && (
            <p className="mt-2 text-sm">
               <span className="text-gray-500">Missing: </span>
               {match.missingSkills.join(", ")}
            </p>
         )}

         {match.cannotApplyReason && (
            <p className="mt-3 text-sm text-red-700">{match.cannotApplyReason}</p>
         )}

         {(match.concerns.length > 0 || match.rejectedBy.length > 0) && (
            <ul className="mt-2 list-disc pl-5 text-sm text-gray-600">
               {match.rejectedBy.map((reason) => (
                  <li key={reason.detail}>{reason.detail}</li>
               ))}
               {match.concerns.map((concern) => (
                  <li key={concern}>{concern}</li>
               ))}
            </ul>
         )}
      </li>
   );
}
