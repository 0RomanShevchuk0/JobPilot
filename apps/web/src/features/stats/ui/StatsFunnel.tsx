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
         // as the matches' badges say it ("Good fit", "Worth a try")
         detail: `${funnel.apply} good fit · ${funnel.stretch} worth a try`,
      },
      { label: "Can apply", value: funnel.canApply },
      { label: "Applied", value: funnel.applied },
      { label: "Hidden", value: funnel.hidden },
   ];

   return (
      <ul className="divide-y divide-gray-200 rounded border border-gray-200">
         {steps.map((step) => {
            const share = funnel.found > 0 ? Math.round((step.value / funnel.found) * 100) : 0;
            return (
               // on a phone the bar and the detail get rows of their own under the numbers: beside them
               // fixed-width columns leave the bar no room
               <li
                  key={step.label}
                  className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 gap-y-1 px-4 py-2 sm:flex"
               >
                  <span className="text-sm text-gray-600 sm:w-40">{step.label}</span>
                  <span className="w-12 text-right text-lg font-semibold tabular-nums">
                     {step.value}
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
                  {step.detail && (
                     <span className="col-span-3 text-xs text-gray-500">{step.detail}</span>
                  )}
               </li>
            );
         })}
      </ul>
   );
}
