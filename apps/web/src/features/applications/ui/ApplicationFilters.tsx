import { applicationOrigins, type ApplicationOrigin } from "@jobpilot/contracts";
import { sourceCatalog } from "@jobpilot/sources/catalog";
import { useEffect, useState } from "react";
import { inputClasses } from "../../../shared/ui";
import type { ApplicationListFilter } from "../api/queries";

// how long typing pauses before the list is searched: not a request a keystroke
const SEARCH_DELAY_MS = 300;

const originLabels: Record<ApplicationOrigin, string> = {
   jobpilot: "Sent by JobPilot",
   manual: "Marked by hand",
};

// a phone: the selects share the row under the search; wider: as wide as their text, beside it
const selectClasses = `${inputClasses} min-w-0 flex-1 basis-32 sm:w-auto sm:flex-none`;

interface Props {
   filter: ApplicationListFilter;
   onChange: (filter: ApplicationListFilter) => void;
}

/**
 * The search over the vacancy's title and its company, the job site, and in Sent how it was sent.
 * On a phone they wrap: the search a row of its own, the selects under it.
 */
export function ApplicationFilters({ filter, onChange }: Props) {
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

   // "" is either way
   const setOrigin = (value: string) =>
      onChange({ ...filter, origin: applicationOrigins.find((o) => o === value) ?? null });

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
            value={filter.source ?? ""}
            onChange={(e) => onChange({ ...filter, source: e.target.value || null })}
            aria-label="Job site"
            className={selectClasses}
         >
            <option value="">All sites</option>
            {sourceCatalog.map((source) => (
               <option key={source.id} value={source.id}>
                  {source.name}
               </option>
            ))}
         </select>
         {/* in progress, every one is JobPilot's: one marked by hand is sent at once */}
         {filter.tab === "sent" && (
            <select
               value={filter.origin ?? ""}
               onChange={(e) => setOrigin(e.target.value)}
               aria-label="How it was sent"
               className={selectClasses}
            >
               <option value="">Sent either way</option>
               {applicationOrigins.map((origin) => (
                  <option key={origin} value={origin}>
                     {originLabels[origin]}
                  </option>
               ))}
            </select>
         )}
      </div>
   );
}
