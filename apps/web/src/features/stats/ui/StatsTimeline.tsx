import type { StatsBucket } from "@jobpilot/contracts";
import type { ReactNode } from "react";
import {
   Bar,
   BarChart,
   CartesianGrid,
   Tooltip,
   XAxis,
   YAxis,
   type TooltipContentProps,
} from "recharts";

const SUITABLE_COLOR = "#2a78d6";
const OTHER_FOUND_COLOR = "#d1d5dc";
const SENT_COLOR = "#eb6834";
const GRID_COLOR = "#e5e7eb";
const AXIS_TICK = { fill: "#99a1af", fontSize: 12 };

interface Point extends StatsBucket {
   /** found but not suitable: the part of the bar above the suitable one */
   otherFound: number;
}

/**
 * Per hour or day: the vacancies found, the suitable part in color, and the applications sent below on
 * the same hours or days. Hovering one chart shows the bucket in both, with every number in the tooltip.
 */
export function StatsTimeline({ timeline, hourly }: { timeline: StatsBucket[]; hourly: boolean }) {
   const points: Point[] = timeline.map((b) => ({ ...b, otherFound: b.found - b.suitable }));
   const label = (start: string) =>
      hourly
         ? new Date(start).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
         : new Date(start).toLocaleDateString(undefined, { day: "numeric", month: "short" });
   const unit = hourly ? "hour" : "day";

   return (
      <div className="space-y-6">
         <section>
            <div className="mb-2 flex items-center gap-4 text-sm text-gray-600">
               <h2>Found per {unit}</h2>
               <LegendItem color={SUITABLE_COLOR} label="Suitable" />
               <LegendItem color={OTHER_FOUND_COLOR} label="Other" />
            </div>
            <TimelineChart points={points} label={label}>
               <Bar dataKey="suitable" stackId="found" fill={SUITABLE_COLOR} />
               <Bar
                  dataKey="otherFound"
                  stackId="found"
                  fill={OTHER_FOUND_COLOR}
                  radius={[4, 4, 0, 0]}
               />
            </TimelineChart>
         </section>

         <section>
            <h2 className="mb-2 text-sm text-gray-600">Applications sent per {unit}</h2>
            <TimelineChart points={points} label={label} height={120}>
               <Bar dataKey="submitted" fill={SENT_COLOR} radius={[4, 4, 0, 0]} />
            </TimelineChart>
         </section>
      </div>
   );
}

/** The axes, grid and tooltip both charts share; syncId hovers the same bucket in each. */
function TimelineChart({
   points,
   label,
   height = 180,
   children,
}: {
   points: Point[];
   label: (start: string) => string;
   height?: number;
   children: ReactNode;
}) {
   return (
      <BarChart
         data={points}
         syncId="stats-timeline"
         responsive
         style={{ width: "100%", height }}
         margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
         barCategoryGap={2}
         maxBarSize={24}
      >
         <CartesianGrid vertical={false} stroke={GRID_COLOR} />
         <XAxis
            dataKey="start"
            tickFormatter={label}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={{ stroke: GRID_COLOR }}
            minTickGap={24}
         />
         <YAxis
            allowDecimals={false}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={32}
         />
         <Tooltip
            cursor={{ fill: "#f3f4f6" }}
            isAnimationActive={false}
            content={(props) => <BucketTooltip {...props} formatStart={label} />}
         />
         {children}
      </BarChart>
   );
}

function BucketTooltip({
   active,
   payload,
   formatStart,
}: TooltipContentProps & { formatStart: (start: string) => string }) {
   const point = payload?.[0]?.payload as Point | undefined;
   if (!active || !point) return null;
   return (
      <div className="rounded border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm">
         <p className="mb-1 font-medium">{formatStart(point.start)}</p>
         <TooltipRow color={SUITABLE_COLOR} label="Suitable" value={point.suitable} />
         <TooltipRow color={OTHER_FOUND_COLOR} label="Other found" value={point.otherFound} />
         <TooltipRow color={SENT_COLOR} label="Applications sent" value={point.submitted} />
      </div>
   );
}

function TooltipRow({ color, label, value }: { color: string; label: string; value: number }) {
   return (
      <p className="flex items-center gap-2">
         <span className="size-2 rounded-sm" style={{ background: color }} />
         <span className="flex-1 text-gray-600">{label}</span>
         <span className="tabular-nums">{value}</span>
      </p>
   );
}

function LegendItem({ color, label }: { color: string; label: string }) {
   return (
      <span className="flex items-center gap-1.5 text-xs">
         <span className="size-2 rounded-sm" style={{ background: color }} />
         {label}
      </span>
   );
}
