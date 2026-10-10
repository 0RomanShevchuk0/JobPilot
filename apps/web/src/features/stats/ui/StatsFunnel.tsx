import type { StatsFunnel as Funnel } from "@jobpilot/contracts";

interface Step {
   label: string;
   value: number;
   detail?: string;
}

/** Each step of the funnel: how many vacancies got there, as a number and a share of the found ones. */
export function StatsFunnel({ funnel }: { funnel: Funnel }) {
   const steps: Step[] = [
      { label: "Found", value: funnel.found },
      { label: "Passed prefilter", value: funnel.prefilterPassed },
      { label: "Scored by AI", value: funnel.scored },
      {
         label: "Suitable",
         value: funnel.apply + funnel.stretch,
         detail: `${funnel.apply} apply · ${funnel.stretch} stretch`,
      },
      { label: "Can apply", value: funnel.canApply },
      { label: "Marked applied", value: funnel.applied },
      { label: "Hidden", value: funnel.hidden },
   ];

   return (
      <ul className="divide-y divide-gray-200 rounded border border-gray-200">
         {steps.map((step) => {
            const share = funnel.found > 0 ? Math.round((step.value / funnel.found) * 100) : 0;
            return (
               <li key={step.label} className="flex items-center gap-4 px-4 py-2">
                  <span className="w-40 text-sm text-gray-600">{step.label}</span>
                  <span className="w-12 text-right text-lg font-semibold tabular-nums">
                     {step.value}
                  </span>
                  <span className="w-10 text-right text-xs text-gray-400 tabular-nums">
                     {share}%
                  </span>
                  <span className="flex-1">
                     <span
                        className="block h-2 rounded bg-gray-300"
                        style={{ width: `${share}%` }}
                     />
                  </span>
                  {step.detail && <span className="text-xs text-gray-500">{step.detail}</span>}
               </li>
            );
         })}
      </ul>
   );
}
