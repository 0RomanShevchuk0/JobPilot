import type { StatsBucket } from "@jobpilot/contracts";

/**
 * Found vacancies per hour or day, the suitable part darker: enough to see the collection is running.
 * The exact numbers are in each bar's tooltip.
 */
export function StatsTimeline({ timeline, hourly }: { timeline: StatsBucket[]; hourly: boolean }) {
   const max = Math.max(1, ...timeline.map((b) => b.found));
   const label = (b: StatsBucket) =>
      hourly
         ? new Date(b.start).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
         : new Date(b.start).toLocaleDateString();
   const first = timeline[0];
   const last = timeline.at(-1);

   return (
      <div>
         <div className="flex h-24 items-end gap-px">
            {timeline.map((b) => (
               <div
                  key={b.start}
                  title={`${label(b)}: ${b.found} found, ${b.suitable} suitable`}
                  className="flex flex-1 flex-col justify-end bg-gray-300 hover:bg-gray-400"
                  // an empty bucket stays a thin line, so a gap reads as "nothing found", not "no data"
                  style={{ height: `${Math.max((b.found / max) * 100, 2)}%` }}
               >
                  <div
                     className="bg-gray-900"
                     style={{ height: `${b.found > 0 ? (b.suitable / b.found) * 100 : 0}%` }}
                  />
               </div>
            ))}
         </div>
         {first && last && (
            <div className="mt-1 flex justify-between text-xs text-gray-400">
               <span>{label(first)}</span>
               <span>{label(last)}</span>
            </div>
         )}
      </div>
   );
}
