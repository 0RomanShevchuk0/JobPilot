import { jobAttemptStages, jobAttemptStatuses } from "@jobpilot/contracts";
import { useEffect, useState } from "react";
import { inputClasses } from "../../../shared/ui";
import type { JobAttemptListFilter } from "../api/queries";
import { stageLabels, statusLabels } from "../lib/labels";

// how long typing pauses before the list is searched: not a request a keystroke
const SEARCH_DELAY_MS = 300;

// a phone: the selects share the row under the search; wider: as wide as their text, beside it
const selectClasses = `${inputClasses} min-w-0 flex-1 basis-32 sm:w-auto sm:flex-none`;

interface Props {
   filter: JobAttemptListFilter;
   onChange: (filter: JobAttemptListFilter) => void;
}

/**
 * The search over the job's title and its company, the stage and the status. On a phone they wrap:
 * the search a row of its own, the selects under it.
 */
export function TrackerFilters({ filter, onChange }: Props) {
   const [text, setText] = useState(filter.q);
   // the address changed under it (the nav link clears the search): the box shows it, else its text
   // would be searched again. Not when it's my own text, trimmed: a space I just typed would go
   const [shownQ, setShownQ] = useState(filter.q);
   if (filter.q !== shownQ) {
      setShownQ(filter.q);
      if (filter.q !== text.trim()) setText(filter.q);
   }

   useEffect(() => {
      const q = text.trim();
      if (q === filter.q) return;
      const timer = setTimeout(() => onChange({ ...filter, q }), SEARCH_DELAY_MS);
      return () => clearTimeout(timer);
   }, [text, filter, onChange]);

   // "" is every one
   const setStage = (value: string) =>
      onChange({ ...filter, stage: jobAttemptStages.find((s) => s === value) ?? null });
   const setStatus = (value: string) =>
      onChange({ ...filter, status: jobAttemptStatuses.find((s) => s === value) ?? null });

   return (
      // the inputs are w-full: in the row their width comes from flex-basis instead
      <div className="mb-4 flex flex-wrap gap-2">
         <input
            type="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={100}
            placeholder="Search title or company"
            aria-label="Search title or company"
            className={`${inputClasses} basis-full sm:flex-1 sm:basis-48`}
         />
         <select
            value={filter.stage ?? ""}
            onChange={(e) => setStage(e.target.value)}
            aria-label="Stage"
            className={selectClasses}
         >
            <option value="">All stages</option>
            {jobAttemptStages.map((stage) => (
               <option key={stage} value={stage}>
                  {stageLabels[stage]}
               </option>
            ))}
         </select>
         <select
            value={filter.status ?? ""}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Status"
            className={selectClasses}
         >
            <option value="">All statuses</option>
            {jobAttemptStatuses.map((status) => (
               <option key={status} value={status}>
                  {statusLabels[status]}
               </option>
            ))}
         </select>
      </div>
   );
}
