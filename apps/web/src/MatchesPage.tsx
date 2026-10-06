import type { MatchListItem, MatchStatus, Salary, SalaryFit } from "@jobpilot/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { apiGet, apiPatch, apiPost } from "./api";
import { applicationStatusLabels } from "./applicationStatus";

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

const verdictStyles: Record<string, string> = {
   apply: "bg-green-100 text-green-800",
   stretch: "bg-amber-100 text-amber-800",
   skip: "bg-gray-200 text-gray-700",
   rejected: "bg-gray-200 text-gray-700",
   pending: "bg-blue-100 text-blue-800",
};

function MatchCard({ match }: { match: MatchListItem }) {
   const queryClient = useQueryClient();
   const mark = useMutation({
      mutationFn: (status: MatchStatus) => apiPatch(`/matches/${match.vacancyId}`, { status }),
      // the vacancy moves to another tab: every list may have changed
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["matches"] }),
   });
   const navigate = useNavigate();
   const apply = useMutation({
      mutationFn: () => apiPost<{ id: string }>("/applications", { vacancyId: match.vacancyId }),
      onSuccess: async ({ id }) => {
         await Promise.all([
            queryClient.invalidateQueries({ queryKey: ["matches"] }),
            queryClient.invalidateQueries({ queryKey: ["applications"] }),
         ]);
         await navigate(`/applications/${id}`);
      },
   });
   const rejected = match.rejectedBy.length > 0 || match.cannotApplyReason !== null;
   const status = match.verdict ?? (rejected ? "rejected" : "pending");
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
               {match.salaryFit && (
                  <p className={`text-sm ${salaryFitStyles[match.salaryFit]}`}>
                     {salaryFitLabels[match.salaryFit]}
                  </p>
               )}
            </div>
            <div className="ml-auto flex shrink-0 gap-2">
               {match.application ? (
                  <Link
                     to={`/applications/${match.application.id}`}
                     className="rounded border border-gray-300 px-2 py-1 text-sm text-gray-700 hover:bg-gray-50"
                  >
                     Application: {applicationStatusLabels[match.application.status]}
                  </Link>
               ) : (
                  // the job site won't take an application: the reason is shown below
                  !match.cannotApplyReason && (
                     <button
                        onClick={() => apply.mutate()}
                        disabled={apply.isPending}
                        className="rounded bg-gray-900 px-2 py-1 text-sm text-white hover:bg-gray-700 disabled:opacity-50"
                     >
                        Apply
                     </button>
                  )
               )}
               {match.status === null ? (
                  <>
                     <MarkButton onClick={() => mark.mutate("applied")} disabled={mark.isPending}>
                        Applied
                     </MarkButton>
                     <MarkButton onClick={() => mark.mutate("hidden")} disabled={mark.isPending}>
                        Hide
                     </MarkButton>
                  </>
               ) : (
                  <MarkButton onClick={() => mark.mutate(null)} disabled={mark.isPending}>
                     Back to new
                  </MarkButton>
               )}
            </div>
         </div>
         {mark.isError && <p className="mt-2 text-sm text-red-600">{mark.error.message}</p>}
         {apply.isError && <p className="mt-2 text-sm text-red-600">{apply.error.message}</p>}

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

// what the job site says of the salary, a hidden one too, against the expectations in my profile there
const salaryFitLabels: Record<SalaryFit, string> = {
   fits: "Salary matches your expectations, says the job site",
   below_expectations: "Salary range is below your expectations, says the job site",
};
const salaryFitStyles: Record<SalaryFit, string> = {
   fits: "text-green-700",
   below_expectations: "text-amber-700",
};

function MarkButton(props: { onClick: () => void; disabled: boolean; children: string }) {
   return (
      <button
         onClick={props.onClick}
         disabled={props.disabled}
         className="rounded border border-gray-300 px-2 py-1 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
         {props.children}
      </button>
   );
}

function formatSalary(s: Salary): string {
   const range = [s.min, s.max].filter((n) => n !== undefined).join("–");
   return `${range} ${s.currency}/${s.period}`;
}
