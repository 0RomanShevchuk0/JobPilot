import {
   jobAttemptStages,
   jobAttemptStatuses,
   type JobAttemptStage,
   type JobAttemptStatus,
} from "@jobpilot/contracts";
import { inputClasses, textareaClasses } from "../../../shared/ui";
import { stageLabels, statusLabels } from "../lib/labels";

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

/** A field's name, with a star when it can't stay empty. */
function FieldLabel({ name, required = false }: { name: string; required?: boolean }) {
   return (
      <span className="mb-1 block text-sm text-gray-500">
         {name}
         {required && <span className="text-red-600"> *</span>}
      </span>
   );
}

/**
 * The fields of a tracker row, for adding one and for changing it. The role can be left empty only
 * where a vacancy's title stands in for it; the link is for a row added by hand.
 */
export function JobAttemptFields({
   values,
   titleRequired,
   withLink,
}: {
   values: JobAttemptFieldValues;
   titleRequired: boolean;
   withLink: boolean;
}) {
   return (
      <>
         <label className="block">
            <FieldLabel name="Company" />
            <input
               name="company"
               maxLength={200}
               autoFocus
               defaultValue={values.company}
               className={inputClasses}
            />
         </label>
         <label className="block">
            <FieldLabel name="Role" required={titleRequired} />
            <input
               name="title"
               required={titleRequired}
               maxLength={200}
               placeholder={titleRequired ? undefined : "Empty: the vacancy's title"}
               defaultValue={values.title}
               className={inputClasses}
            />
         </label>
         {withLink && (
            <label className="block">
               <FieldLabel name="Link" />
               <input
                  name="url"
                  type="url"
                  maxLength={2000}
                  placeholder="https://"
                  defaultValue={values.url}
                  className={inputClasses}
               />
            </label>
         )}
         <label className="block">
            <FieldLabel name="Applied" required />
            <input
               name="appliedAt"
               type="date"
               required
               defaultValue={values.appliedAt}
               max={localDate()}
               className={inputClasses}
            />
         </label>
         <div className="grid grid-cols-2 gap-3">
            <label className="block">
               <FieldLabel name="Stage" required />
               <select name="stage" defaultValue={values.stage} className={inputClasses}>
                  {jobAttemptStages.map((stage) => (
                     <option key={stage} value={stage}>
                        {stageLabels[stage]}
                     </option>
                  ))}
               </select>
            </label>
            <label className="block">
               <FieldLabel name="Status" required />
               <select name="status" defaultValue={values.status} className={inputClasses}>
                  {jobAttemptStatuses.map((status) => (
                     <option key={status} value={status}>
                        {statusLabels[status]}
                     </option>
                  ))}
               </select>
            </label>
         </div>
         <label className="block">
            <FieldLabel name="Notes" />
            <textarea
               name="notes"
               maxLength={10_000}
               defaultValue={values.notes}
               className={textareaClasses}
            />
         </label>
      </>
   );
}
