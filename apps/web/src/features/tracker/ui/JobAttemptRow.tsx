import {
   jobAttemptStages,
   jobAttemptStatuses,
   type JobAttemptListItem,
   type JobAttemptStage,
   type JobAttemptStatus,
} from "@jobpilot/contracts";
import { Link, useSearchParams } from "react-router";
import { Badge, CheckIcon, Menu, menuItemStyles } from "../../../shared/ui";
import { useUpdateJobAttempt } from "../api/queries";
import { trackerAddress } from "../lib/address";
import { stageLabels, stageStyles, statusLabels, statusStyles } from "../lib/labels";
import { shortDate } from "../lib/short-date";

/** The tracker's columns from sm up; on a phone a row stacks. Shared with the table's header. */
export const rowGridClasses = "sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_8.5rem_7.5rem_4.5rem]";

// a Badge's look, a button: the arrow says it opens, the color alone wouldn't. On a phone it's a
// finger's target: taller, with its own room around it; in the table a badge's size
const pickerClasses =
   "flex items-center gap-1 rounded px-2.5 py-1.5 text-sm font-medium whitespace-nowrap hover:brightness-95 sm:px-2 sm:py-0.5 sm:text-xs";

// the attempts that ended without a job fade, their text only: a faded badge would be hard to read
const fadedStatuses: JobAttemptStatus[] = ["rejected", "declined"];

/**
 * One attempt, a line of the tracker: who, what, how far it got, how it stands, when I applied. The
 * stage and status change right here; the rest of the row opens the panel.
 */
export function JobAttemptRow({ attempt }: { attempt: JobAttemptListItem }) {
   const update = useUpdateJobAttempt(attempt.id);
   const [params] = useSearchParams();
   // what I picked shows until the list has it: the old value would blink back in between
   const picked = update.isPending ? update.variables : undefined;
   const stage = picked?.stage ?? attempt.stage;
   // a new stage takes a no_answer or ghosted back to active on the server: shown at once, as the stage
   const silent = attempt.status === "no_answer" || attempt.status === "ghosted";
   const status = picked?.status ?? (picked?.stage && silent ? "active" : attempt.status);
   const title = attempt.title ?? "Untitled job";
   const company = attempt.company ?? "Company unknown";
   const faded = fadedStatuses.includes(status);

   const pickStage = (next: JobAttemptStage) => {
      if (next !== attempt.stage) update.mutate({ stage: next });
   };
   const pickStatus = (next: JobAttemptStatus) => {
      if (next !== attempt.status) update.mutate({ status: next });
   };

   return (
      <li className="relative hover:bg-gray-50">
         {/* the whole row, under the pickers: a menu's button can't sit in a link */}
         <Link
            to={{ search: trackerAddress.withPanel(params, { attempt: attempt.id }) }}
            // the panel opens over the list: the list stays where I scrolled it
            preventScrollReset
            aria-label={`${company}: ${title}`}
            className="absolute inset-0"
         />
         <div
            className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 px-4 py-3 sm:py-2 ${rowGridClasses}`}
         >
            <span
               className={`truncate text-sm font-medium ${faded ? "text-gray-500" : "text-gray-900"}`}
            >
               {company}
            </span>
            <span
               className={`col-span-2 row-start-2 truncate text-sm sm:col-span-1 sm:row-start-auto ${faded ? "text-gray-500" : "text-gray-600"}`}
            >
               {title}
            </span>
            {/* on a phone the pair is a line of its own under the text, read after it: from the left,
                its menus open rightwards */}
            <div className="col-span-2 row-start-3 mt-2 flex gap-2 sm:contents">
               <Menu
                  align="start"
                  label={`Stage: ${stageLabels[stage]}`}
                  triggerClassName={`${pickerClasses} ${stageStyles[stage]}`}
                  trigger={
                     <>
                        {stageLabels[stage]}
                        <span className="opacity-60">▾</span>
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
                        <Badge tone={stageStyles[option]}>{stageLabels[option]}</Badge>
                     </button>
                  ))}
               </Menu>
               <Menu
                  align="start"
                  label={`Status: ${statusLabels[status]}`}
                  triggerClassName={`${pickerClasses} ${statusStyles[status]}`}
                  trigger={
                     <>
                        {statusLabels[status]}
                        <span className="opacity-60">▾</span>
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
                        <Badge tone={statusStyles[option]}>{statusLabels[option]}</Badge>
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
