import type { StatsPeriod } from "@jobpilot/contracts";
import { useState } from "react";
import { StatsFunnel, StatsTimeline, useStats } from "../features/stats";
import { Button } from "../shared/ui";

const periods: { period: StatsPeriod; title: string }[] = [
   { period: "day", title: "24 hours" },
   { period: "week", title: "7 days" },
   { period: "month", title: "30 days" },
   { period: "all", title: "All time" },
];

/** How many vacancies were found over a period, how many suited me and what I did with them. */
export function StatsPage() {
   const [period, setPeriod] = useState<StatsPeriod>("week");
   const stats = useStats(period);

   return (
      <main className="mx-auto max-w-4xl p-6">
         <h1 className="mb-6 text-2xl font-semibold">Stats</h1>

         <nav className="mb-4 flex gap-2">
            {periods.map((p) => (
               <Button
                  key={p.period}
                  variant={p.period === period ? "primary" : "secondary"}
                  onClick={() => setPeriod(p.period)}
               >
                  {p.title}
               </Button>
            ))}
         </nav>

         {stats.isPending && <p className="text-gray-500">Loading…</p>}
         {stats.isError && <p className="text-red-600">{stats.error.message}</p>}
         {stats.data && (
            <div className="space-y-6">
               <StatsFunnel funnel={stats.data.funnel} />

               <section className="flex gap-4">
                  <div className="flex-1 rounded border border-gray-200 px-4 py-3">
                     <p className="text-sm text-gray-600">Applications sent</p>
                     <p className="text-2xl font-semibold tabular-nums">
                        {stats.data.applications.submitted}
                     </p>
                  </div>
                  <div className="flex-1 rounded border border-gray-200 px-4 py-3">
                     <p className="text-sm text-gray-600">Applications failed</p>
                     <p className="text-2xl font-semibold tabular-nums">
                        {stats.data.applications.failed}
                     </p>
                  </div>
               </section>

               <section>
                  <h2 className="mb-2 text-sm text-gray-600">
                     Found per {period === "day" ? "hour" : "day"}
                  </h2>
                  <StatsTimeline timeline={stats.data.timeline} hourly={period === "day"} />
               </section>
            </div>
         )}
      </main>
   );
}
