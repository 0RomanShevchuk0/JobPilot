import type { MatchListItem, Salary } from "@jobpilot/contracts";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { apiGet } from "./api";

/** Vacancies evaluated for my current profile, best first; skipped ones on request. */
export function MatchesPage() {
   const [showSkipped, setShowSkipped] = useState(false);
   const matches = useQuery({
      queryKey: ["matches", { showSkipped }],
      queryFn: () => apiGet<MatchListItem[]>(`/matches${showSkipped ? "?include=skipped" : ""}`),
   });

   return (
      <main className="mx-auto max-w-4xl p-6">
         <header className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Matches</h1>
            <label className="flex items-center gap-2 text-sm text-gray-600">
               <input
                  type="checkbox"
                  checked={showSkipped}
                  onChange={(e) => setShowSkipped(e.target.checked)}
               />
               Show skipped
            </label>
         </header>

         {matches.isPending && <p className="text-gray-500">Loading…</p>}
         {matches.isError && <p className="text-red-600">{matches.error.message}</p>}
         {matches.data?.length === 0 && <p className="text-gray-500">No matches yet.</p>}

         <ul className="space-y-4">
            {matches.data?.map((match) => (
               <MatchCard key={match.vacancyId} match={match} />
            ))}
         </ul>
      </main>
   );
}

const verdictStyles: Record<string, string> = {
   apply: "bg-green-100 text-green-800",
   stretch: "bg-amber-100 text-amber-800",
   skip: "bg-gray-200 text-gray-700",
   rejected: "bg-gray-200 text-gray-700",
   pending: "bg-blue-100 text-blue-800",
};

function MatchCard({ match }: { match: MatchListItem }) {
   const status = match.verdict ?? (match.rejectedBy.length > 0 ? "rejected" : "pending");
   const details = [
      match.company,
      match.salary && formatSalary(match.salary),
      match.workModes.join(", "),
   ]
      .filter(Boolean)
      .join(" · ");

   return (
      <li className="rounded-lg border border-gray-200 p-4">
         <div className="flex items-start gap-4">
            <span
               className={`shrink-0 rounded px-2 py-1 text-sm font-medium ${verdictStyles[status]}`}
            >
               {match.score ?? "–"} {status}
            </span>
            <div className="min-w-0">
               <a
                  href={match.urls[0]}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium hover:underline"
               >
                  {match.title}
               </a>
               {details && <p className="text-sm text-gray-500">{details}</p>}
            </div>
         </div>

         {match.summary && <p className="mt-3 text-sm">{match.summary}</p>}

         {match.missingSkills.length > 0 && (
            <p className="mt-2 text-sm">
               <span className="text-gray-500">Missing: </span>
               {match.missingSkills.join(", ")}
            </p>
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

function formatSalary(s: Salary): string {
   const range = [s.min, s.max].filter((n) => n !== undefined).join("–");
   return `${range} ${s.currency}/${s.period}`;
}
