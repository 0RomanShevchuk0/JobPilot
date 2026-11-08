import { salaryLevelParam, type JobAttemptStats } from "@jobpilot/contracts";
import { useState, type ReactNode } from "react";
import { Badge, Button, PageLoader } from "../../../shared/ui";
import { salaryText, stageLabels, stageStyles, statusLabels, statusStyles } from "../../tracker";
import { useAttemptStats } from "../api/queries";

interface Bar {
   key: string;
   label: ReactNode;
   value: number;
}

/**
 * Every attempt to get a job, all time, or the ones that asked for one salary: how far they got, how
 * they stand now, and the companies applied to more than once. The salary is salaryLevelParam's, null
 * for all of them.
 */
export function AttemptStats({
   salary,
   onSalaryChange,
}: {
   salary: string | null;
   onSalaryChange: (salary: string | null) => void;
}) {
   const [allCompanies, setAllCompanies] = useState(false);
   const stats = useAttemptStats(allCompanies, salary);

   if (stats.isPending) return <PageLoader />;
   if (stats.isError) return <p className="text-red-600">{stats.error.message}</p>;
   const { salaryLevels, total } = stats.data;
   if (salaryLevels.length === 0) {
      return (
         <p className="text-sm text-gray-500">
            Nothing yet: what you apply to shows here once it's in the Tracker.
         </p>
      );
   }
   const everyAttempt = salaryLevels.reduce((sum, level) => sum + level.attempts, 0);
   const levels = [
      { param: null, title: "All", attempts: everyAttempt },
      ...salaryLevels.map((level) => ({
         param: salaryLevelParam(level.salary),
         title: level.salary ? salaryText(level.salary) : "Not set",
         attempts: level.attempts,
      })),
   ];

   return (
      <div className="space-y-8">
         {/* one level is the same as all of them: nothing to pick, unless it's picked already */}
         {(salaryLevels.length > 1 || salary !== null) && (
            <nav className="flex flex-wrap gap-2">
               {levels.map((level) => (
                  <Button
                     key={level.param ?? "all"}
                     size="sm"
                     variant={level.param === salary ? "primary" : "outline"}
                     onClick={() => onSalaryChange(level.param)}
                  >
                     {level.title}
                     <span className="tabular-nums opacity-70">{level.attempts}</span>
                  </Button>
               ))}
            </nav>
         )}

         {total === 0 ? (
            <p className="text-sm text-gray-500">No attempts asked for this salary.</p>
         ) : (
            // what is shown meanwhile is of the level before, or the top companies only: dimmed
            <div className={stats.isPlaceholderData ? "opacity-50" : undefined}>
               <Counts
                  stats={stats.data}
                  // the button shows only with the top companies: while it waits for all of them, not
                  // while another level loads
                  loadingAllCompanies={stats.isPlaceholderData && allCompanies}
                  onShowAllCompanies={() => setAllCompanies(true)}
               />
            </div>
         )}
      </div>
   );
}

/** How far the attempts got, how they stand now, the companies applied to more than once. */
function Counts({
   stats: { total, reached, statuses, companies },
   loadingAllCompanies,
   onShowAllCompanies,
}: {
   stats: JobAttemptStats;
   loadingAllCompanies: boolean;
   onShowAllCompanies: () => void;
}) {
   const stageBadge = (stage: JobAttemptStats["reached"][number]["stage"]) => (
      <Badge tone={stageStyles[stage]}>{stageLabels[stage]}</Badge>
   );

   return (
      <div className="space-y-8">
         <Section
            title="How far they got"
            note={`Of ${total} attempts: a stage and everything after it`}
         >
            <Bars
               of={total}
               bars={reached.map((row) => ({
                  key: row.stage,
                  label: stageBadge(row.stage),
                  value: row.count,
               }))}
            />
         </Section>

         <Section title="Now">
            <ul className="flex flex-wrap gap-2">
               {statuses
                  .filter((row) => row.count > 0)
                  .map((row) => (
                     <li
                        key={row.status}
                        className="flex items-center gap-2 rounded border border-gray-200 px-3 py-2"
                     >
                        <Badge tone={statusStyles[row.status]}>{statusLabels[row.status]}</Badge>
                        <span className="text-lg font-semibold tabular-nums">{row.count}</span>
                     </li>
                  ))}
            </ul>
         </Section>

         <Section
            title="Companies"
            note={`${companies.total} companies, ${companies.repeated} applied to more than once`}
         >
            {companies.list.length === 0 ? (
               <p className="text-sm text-gray-500">No company applied to twice yet.</p>
            ) : (
               <ul className="divide-y divide-gray-200 rounded border border-gray-200">
                  {companies.list.map((company) => (
                     <li key={company.name} className="flex items-center gap-4 px-4 py-2">
                        <span className="min-w-0 flex-1 truncate text-sm text-gray-900">
                           {company.name}
                        </span>
                        <span className="text-sm text-gray-500 tabular-nums">
                           {company.attempts} attempts
                        </span>
                     </li>
                  ))}
               </ul>
            )}
            {companies.repeated > companies.list.length && (
               <Button
                  size="sm"
                  className="mt-3"
                  loading={loadingAllCompanies}
                  onClick={onShowAllCompanies}
               >
                  Show all {companies.repeated}
               </Button>
            )}
         </Section>
      </div>
   );
}

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
   return (
      <section>
         <h2 className="font-semibold text-gray-900">{title}</h2>
         {note && <p className="mb-3 text-sm text-gray-500">{note}</p>}
         {!note && <div className="mb-3" />}
         {children}
      </section>
   );
}

/** A row per bar: its label, the number, its share of `of`, and the bar, as the funnel draws them. */
function Bars({ bars, of }: { bars: Bar[]; of: number }) {
   return (
      <ul className="divide-y divide-gray-200 rounded border border-gray-200">
         {bars.map((bar) => {
            const share = of > 0 ? Math.round((bar.value / of) * 100) : 0;
            return (
               // on a phone the bar gets a row of its own under the numbers, as in the funnel
               <li
                  key={bar.key}
                  className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 gap-y-1 px-4 py-2 sm:flex"
               >
                  <span className="sm:w-40">{bar.label}</span>
                  <span className="w-12 text-right text-lg font-semibold tabular-nums">
                     {bar.value}
                  </span>
                  <span className="w-10 text-right text-xs text-gray-400 tabular-nums">
                     {share}%
                  </span>
                  <span className="col-span-3 sm:flex-1">
                     <span
                        className="block h-2 rounded bg-gray-300"
                        style={{ width: `${share}%` }}
                     />
                  </span>
               </li>
            );
         })}
      </ul>
   );
}
