import { salaryLevelParamSchema, type StatsPeriod } from "@jobpilot/contracts";
import { useSearchParams } from "react-router";
import { AttemptStats, StatsFunnel, StatsTimeline, useStats } from "../features/stats";
import { Button, PageLoader } from "../shared/ui";

const periods: { period: StatsPeriod; title: string }[] = [
   { period: "day", title: "24 hours" },
   { period: "week", title: "7 days" },
   { period: "month", title: "30 days" },
   { period: "all", title: "All time" },
];

const tabs = [
   { tab: "vacancies", title: "Vacancies" },
   { tab: "tracker", title: "Tracker" },
] as const;
type StatsTab = (typeof tabs)[number]["tab"];

/**
 * Two tabs: the vacancies found over a period, how many suited me and what I did with them; and the
 * Tracker's attempts, all time, all of them or at one requested salary. The tab, the period and the
 * salary are in the address (?tab=tracker, ?period=week, ?salary=3000-USD-month), kept on a reload and
 * back; each tab keeps the other's while away.
 */
export function StatsPage() {
   const [params, setParams] = useSearchParams();
   const tab = tabs.find((t) => t.tab === params.get("tab"))?.tab ?? "vacancies";
   const period = periods.find((p) => p.period === params.get("period"))?.period ?? "day";
   // one that isn't a salary level (edited by hand) is all of them, as an unknown period is the default
   const salaryInAddress = params.get("salary");
   const salary =
      salaryInAddress !== null && salaryLevelParamSchema.safeParse(salaryInAddress).success
         ? salaryInAddress
         : null;
   // in place of the address, as the tabs in Matches
   const setParam = (name: string, value: string | null) => {
      const query = new URLSearchParams(params);
      if (value === null) query.delete(name);
      else query.set(name, value);
      setParams(query, { replace: true });
   };
   const setTab = (t: StatsTab) => setParam("tab", t === "vacancies" ? null : t);
   const setPeriod = (p: StatsPeriod) => setParam("period", p === "day" ? null : p);
   const setSalary = (s: string | null) => setParam("salary", s);

   return (
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
         <h1 className="mb-6 text-2xl font-semibold">Stats</h1>

         <nav className="mb-6 flex gap-2">
            {tabs.map((t) => (
               <Button
                  key={t.tab}
                  variant={t.tab === tab ? "primary" : "secondary"}
                  onClick={() => setTab(t.tab)}
               >
                  {t.title}
               </Button>
            ))}
         </nav>

         {tab === "vacancies" ? (
            <VacancyStats period={period} onPeriodChange={setPeriod} />
         ) : (
            <AttemptStats salary={salary} onSalaryChange={setSalary} />
         )}
      </main>
   );
}

/** The vacancies found over the period, how many suited me and what I did with them. */
function VacancyStats({
   period,
   onPeriodChange,
}: {
   period: StatsPeriod;
   onPeriodChange: (period: StatsPeriod) => void;
}) {
   const stats = useStats(period);

   return (
      <>
         {/* smaller than the tabs: it picks within this one */}
         <nav className="mb-4 flex flex-wrap gap-2">
            {periods.map((p) => (
               <Button
                  key={p.period}
                  size="sm"
                  variant={p.period === period ? "primary" : "outline"}
                  onClick={() => onPeriodChange(p.period)}
               >
                  {p.title}
               </Button>
            ))}
         </nav>

         {stats.isPending && <PageLoader />}
         {stats.isError && <p className="text-red-600">{stats.error.message}</p>}
         {stats.data && (
            <div className="space-y-6">
               <StatsFunnel funnel={stats.data.funnel} />

               <section className="grid grid-cols-3 gap-2 sm:gap-4">
                  {[
                     { label: "Applications sent", value: stats.data.applications.submitted },
                     { label: "Applications failed", value: stats.data.applications.failed },
                     { label: "Couldn't apply", value: stats.data.applications.cannotApply },
                  ].map((card) => (
                     <div
                        key={card.label}
                        className="min-w-0 rounded border border-gray-200 px-3 py-3 sm:px-4"
                     >
                        <p className="text-sm text-gray-600">{card.label}</p>
                        <p className="text-2xl font-semibold tabular-nums">{card.value}</p>
                     </div>
                  ))}
               </section>

               <StatsTimeline timeline={stats.data.timeline} hourly={period === "day"} />
            </div>
         )}
      </>
   );
}
