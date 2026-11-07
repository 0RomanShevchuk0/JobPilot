import {
   jobAttemptStages,
   jobAttemptStatuses,
   type JobAttemptListItem,
   type JobAttemptStage,
   type JobAttemptStatus,
} from "@jobpilot/contracts";
import { Link } from "react-router";
import { CheckIcon, Menu, menuItemStyles } from "../../../shared/ui";
import { useUpdateJobAttempt } from "../api/queries";
import {
   silenceDotStyles,
   silenceLabels,
   stageLabels,
   statusDotStyles,
   statusLabels,
} from "../lib/labels";

/** The tracker's columns from sm up; on a phone a row stacks. Shared with the table's header. */
export const rowGridClasses = "sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_8.5rem_7.5rem_4.5rem]";

const pickerClasses =
   "flex items-center gap-1.5 rounded px-1.5 py-0.5 text-sm whitespace-nowrap text-gray-700 hover:bg-gray-200/70 sm:-ml-1.5";

// the attempts that ended without a job fade: the ones still going, and a job taken, stand out
const fadedStatuses: JobAttemptStatus[] = ["rejected", "declined"];

/** "7 Nov", with the year only when it isn't this one's. */
function shortDate(iso: string): string {
   const date = new Date(iso);
   const thisYear = date.getFullYear() === new Date().getFullYear();
   return date.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: thisYear ? undefined : "numeric",
   });
}

/**
 * One attempt, a line of the tracker: who, what, how far it got, how it stands, when I applied. The
 * stage and status change right here; the rest of the row opens the panel. A silent company shows in
 * place of the status, which stays active: picking Active says it answered, and counts anew.
 */
export function JobAttemptRow({ attempt }: { attempt: JobAttemptListItem }) {
   const update = useUpdateJobAttempt(attempt.id);
   // what I picked shows until the list has it: the old value would blink back in between
   const picked = update.isPending ? update.variables : undefined;
   const stage = picked?.stage ?? attempt.stage;
   const status = picked?.status ?? attempt.status;
   // once I say Active, the silence is over: no need to wait for the list
   const silence = picked?.status ? null : attempt.silence;
   const title = attempt.title ?? "Untitled job";
   const company = attempt.company ?? "Company unknown";

   const pickStage = (next: JobAttemptStage) => {
      if (next !== attempt.stage) update.mutate({ stage: next });
   };
   // the same status again changes nothing, except Active on a silent company
   const pickStatus = (next: JobAttemptStatus) => {
      if (next !== attempt.status || (next === "active" && attempt.silence)) {
         update.mutate({ status: next });
      }
   };

   return (
      <li
         className={`relative hover:bg-gray-50 ${fadedStatuses.includes(status) ? "opacity-60" : ""}`}
      >
         {/* the whole row, under the pickers: a menu's button can't sit in a link */}
         <Link
            to={{ search: `?attempt=${attempt.id}` }}
            aria-label={`${company}: ${title}`}
            className="absolute inset-0"
         />
         <div
            className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 px-4 py-2 ${rowGridClasses}`}
         >
            <span className="truncate text-sm font-medium text-gray-900">{company}</span>
            <span className="col-span-2 row-start-2 truncate text-sm text-gray-600 sm:col-span-1 sm:row-start-auto">
               {title}
            </span>
            {/* on a phone the pair is a line, at the right: a menu opens leftwards from its button */}
            <div className="col-span-2 row-start-3 flex justify-end gap-1 sm:contents">
               <Menu
                  label={`Stage: ${stageLabels[stage]}`}
                  triggerClassName={pickerClasses}
                  trigger={
                     <>
                        {stageLabels[stage]}
                        <span className="text-xs text-gray-400">▾</span>
                     </>
                  }
               >
                  {jobAttemptStages.map((option) => (
                     <button
                        key={option}
                        type="button"
                        className={menuItemStyles}
                        onClick={() => pickStage(option)}
                     >
                        <CheckMark shown={option === stage} />
                        {stageLabels[option]}
                     </button>
                  ))}
               </Menu>
               <Menu
                  label={`Status: ${silence ? silenceLabels[silence] : statusLabels[status]}`}
                  triggerClassName={pickerClasses}
                  trigger={
                     <>
                        <span
                           className={`size-2 rounded-full ${silence ? silenceDotStyles[silence] : statusDotStyles[status]}`}
                        />
                        {silence ? silenceLabels[silence] : statusLabels[status]}
                        <span className="text-xs text-gray-400">▾</span>
                     </>
                  }
               >
                  {jobAttemptStatuses.map((option) => (
                     <button
                        key={option}
                        type="button"
                        className={menuItemStyles}
                        onClick={() => pickStatus(option)}
                     >
                        <CheckMark shown={option === status} />
                        {statusLabels[option]}
                     </button>
                  ))}
               </Menu>
            </div>
            <span className="col-start-2 row-start-1 text-right text-sm text-gray-500 sm:col-start-auto sm:row-start-auto">
               {shortDate(attempt.appliedAt)}
            </span>
         </div>
         {update.isError && (
            <p className="relative px-4 pb-2 text-sm text-red-600">{update.error.message}</p>
         )}
      </li>
   );
}

/** The current choice's check; its room stays when hidden, so the labels line up. */
function CheckMark({ shown }: { shown: boolean }) {
   return <CheckIcon className={`size-3.5 ${shown ? "" : "invisible"}`} />;
}
