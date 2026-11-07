import {
   jobAttemptStages,
   jobAttemptStatuses,
   type JobAttemptListItem,
   type JobAttemptStage,
   type JobAttemptStatus,
} from "@jobpilot/contracts";
import type { ReactNode } from "react";
import { Badge, inputClasses, textareaClasses } from "../../../shared/ui";
import { stageLabels, stageStyles, statusLabels, statusStyles } from "../lib/labels";

/** What the fields of a tracker row hold; an empty text is "". */
export interface JobAttemptFieldValues {
   company: string;
   title: string;
   url: string;
   /** "2026-11-07" */
   appliedAt: string;
   stage: JobAttemptStage;
   status: JobAttemptStatus;
   notes: string;
}

/** A day in my time zone, as a date input takes it; the en-CA locale writes dates as 2026-11-07. */
export function localDate(date: Date = new Date()): string {
   return date.toLocaleDateString("en-CA");
}

/** What the fields of this form hold, trimmed. A field the form doesn't have reads as "". */
export function readJobAttemptFields(form: HTMLFormElement): JobAttemptFieldValues {
   const data = new FormData(form);
   const text = (name: string) => String(data.get(name) ?? "").trim();
   return {
      company: text("company"),
      title: text("title"),
      url: text("url"),
      appliedAt: text("appliedAt"),
      stage: data.get("stage") as JobAttemptStage,
      status: data.get("status") as JobAttemptStatus,
      notes: text("notes"),
   };
}

/**
 * What a row's fields start from: what it shows. The date is the day in my time zone, the way the
 * tracker shows it.
 */
export function jobAttemptFieldValues(attempt: JobAttemptListItem): JobAttemptFieldValues {
   return {
      company: attempt.company ?? "",
      title: attempt.title ?? "",
      url: attempt.url ?? "",
      appliedAt: localDate(new Date(attempt.appliedAt)),
      stage: attempt.stage,
      status: attempt.status,
      notes: attempt.notes,
   };
}

// names in a narrow column on the left, values or inputs beside them; a name sits on the line of
// the first text beside it, of a long value as of an input
export const fieldGridClasses =
   "grid grid-cols-[4.5rem_minmax(0,1fr)] items-baseline gap-x-3 gap-y-2.5 text-sm";

/**
 * A row of the grid: its name (a star when it can't stay empty, while editing) and its input or
 * value. A label with no box of its own: its two parts are the grid's cells, and a click on the name
 * still goes to the input.
 */
function FieldRow({
   name,
   required = false,
   editing,
   children,
}: {
   name: string;
   required?: boolean;
   editing: boolean;
   children: ReactNode;
}) {
   const Wrapper = editing ? "label" : "div";
   return (
      <Wrapper className="contents">
         <span className="text-gray-500">
            {name}
            {editing && required && <span className="text-red-600"> *</span>}
         </span>
         {children}
      </Wrapper>
   );
}

/** A value as the row shows it; an empty one as a dash. */
function Value({ children, multiline = false }: { children: ReactNode; multiline?: boolean }) {
   const empty = children === "" || children === null || children === undefined;
   return (
      <p className={`break-words text-gray-900 ${multiline ? "whitespace-pre-wrap" : ""}`}>
         {empty ? <span className="text-gray-400">—</span> : children}
      </p>
   );
}

/**
 * The fields of a tracker row in one grid, to look at, to add one and to change it: Edit puts an input
 * where each value was. The role can be left empty only where a vacancy's title stands in for it; the
 * link is for a row added by hand.
 */
export function JobAttemptFields({
   values,
   editing = true,
   titleRequired,
   withLink,
}: {
   values: JobAttemptFieldValues;
   /** false: the values only, to look at */
   editing?: boolean;
   titleRequired: boolean;
   withLink: boolean;
}) {
   return (
      <div className={fieldGridClasses}>
         <FieldRow name="Company" editing={editing}>
            {editing ? (
               <input
                  name="company"
                  maxLength={200}
                  autoFocus
                  defaultValue={values.company}
                  className={inputClasses}
               />
            ) : (
               <Value>{values.company}</Value>
            )}
         </FieldRow>
         <FieldRow name="Role" required={titleRequired} editing={editing}>
            {editing ? (
               <input
                  name="title"
                  required={titleRequired}
                  maxLength={200}
                  placeholder={titleRequired ? undefined : "Empty: the vacancy's title"}
                  defaultValue={values.title}
                  className={inputClasses}
               />
            ) : (
               <Value>{values.title}</Value>
            )}
         </FieldRow>
         {withLink && (
            <FieldRow name="Link" editing={editing}>
               {editing ? (
                  <input
                     name="url"
                     type="url"
                     maxLength={2000}
                     placeholder="https://"
                     defaultValue={values.url}
                     className={inputClasses}
                  />
               ) : (
                  <Value>
                     {values.url && (
                        <a
                           href={values.url}
                           target="_blank"
                           rel="noreferrer"
                           className="underline hover:text-gray-600"
                        >
                           {new URL(values.url).hostname}
                        </a>
                     )}
                  </Value>
               )}
            </FieldRow>
         )}
         <FieldRow name="Applied" required editing={editing}>
            {editing ? (
               <input
                  name="appliedAt"
                  type="date"
                  required
                  defaultValue={values.appliedAt}
                  max={localDate()}
                  className={inputClasses}
               />
            ) : (
               <Value>
                  {/* noon: the day stays the same in any time zone */}
                  {new Date(`${values.appliedAt}T12:00:00`).toLocaleDateString(undefined, {
                     day: "numeric",
                     month: "short",
                     year: "numeric",
                  })}
               </Value>
            )}
         </FieldRow>
         <FieldRow name="Stage" required editing={editing}>
            {editing ? (
               <select name="stage" defaultValue={values.stage} className={inputClasses}>
                  {jobAttemptStages.map((stage) => (
                     <option key={stage} value={stage}>
                        {stageLabels[stage]}
                     </option>
                  ))}
               </select>
            ) : (
               <div>
                  <Badge tone={stageStyles[values.stage]}>{stageLabels[values.stage]}</Badge>
               </div>
            )}
         </FieldRow>
         <FieldRow name="Status" required editing={editing}>
            {editing ? (
               <select name="status" defaultValue={values.status} className={inputClasses}>
                  {jobAttemptStatuses.map((status) => (
                     <option key={status} value={status}>
                        {statusLabels[status]}
                     </option>
                  ))}
               </select>
            ) : (
               <div>
                  <Badge tone={statusStyles[values.status]}>{statusLabels[values.status]}</Badge>
               </div>
            )}
         </FieldRow>
         <FieldRow name="Notes" editing={editing}>
            {editing ? (
               <textarea
                  name="notes"
                  maxLength={10_000}
                  defaultValue={values.notes}
                  className={textareaClasses}
               />
            ) : (
               <Value multiline>{values.notes}</Value>
            )}
         </FieldRow>
      </div>
   );
}
