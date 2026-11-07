import {
   jobAttemptStages,
   jobAttemptStatuses,
   type JobAttemptStage,
   type JobAttemptStatus,
} from "@jobpilot/contracts";
import type { FormEvent } from "react";
import { Button, inputClasses, textareaClasses } from "../../../shared/ui";
import { useCreateJobAttempt } from "../api/queries";
import { stageLabels, statusLabels } from "../lib/labels";
import { TrackerPanel } from "./TrackerPanel";

/** Today in my time zone, as a date input takes it; the en-CA locale writes dates as 2026-11-07. */
function today(): string {
   return new Date().toLocaleDateString("en-CA");
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
 * Adds a job JobPilot doesn't know about. The date is today unless changed; the stage and status start
 * as just applied, one already under way goes in as it stands.
 */
export function NewJobAttemptPanel({ onClose }: { onClose: () => void }) {
   const create = useCreateJobAttempt(onClose);

   const submit = (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const text = (name: string) => String(form.get(name)).trim() || undefined;
      const appliedAt = text("appliedAt");
      create.mutate({
         title: text("title")!,
         company: text("company"),
         url: text("url"),
         appliedAt: appliedAt === today() ? undefined : appliedAt,
         stage: form.get("stage") as JobAttemptStage,
         status: form.get("status") as JobAttemptStatus,
         notes: text("notes"),
      });
   };

   return (
      <TrackerPanel
         label="Add a job"
         onClose={onClose}
         heading={<h2 className="font-semibold text-gray-900">Add a job</h2>}
      >
         <form onSubmit={submit} className="flex flex-col gap-4">
            <label className="block">
               <FieldLabel name="Company" />
               <input name="company" maxLength={200} autoFocus className={inputClasses} />
            </label>
            <label className="block">
               <FieldLabel name="Role" required />
               <input name="title" required maxLength={200} className={inputClasses} />
            </label>
            <label className="block">
               <FieldLabel name="Link" />
               <input
                  name="url"
                  type="url"
                  maxLength={2000}
                  placeholder="https://"
                  className={inputClasses}
               />
            </label>
            <label className="block">
               <FieldLabel name="Applied" required />
               <input
                  name="appliedAt"
                  type="date"
                  required
                  defaultValue={today()}
                  max={today()}
                  className={inputClasses}
               />
            </label>
            <div className="grid grid-cols-2 gap-3">
               <label className="block">
                  <FieldLabel name="Stage" required />
                  <select name="stage" className={inputClasses}>
                     {jobAttemptStages.map((stage) => (
                        <option key={stage} value={stage}>
                           {stageLabels[stage]}
                        </option>
                     ))}
                  </select>
               </label>
               <label className="block">
                  <FieldLabel name="Status" required />
                  <select name="status" className={inputClasses}>
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
               <textarea name="notes" maxLength={10_000} className={textareaClasses} />
            </label>
            <Button type="submit" variant="primary" loading={create.isPending}>
               Add
            </Button>
            {create.isError && <p className="text-sm text-red-600">{create.error.message}</p>}
         </form>
      </TrackerPanel>
   );
}
