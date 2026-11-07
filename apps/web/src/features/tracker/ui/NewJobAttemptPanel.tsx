import type { FormEvent } from "react";
import { Button, inputClasses } from "../../../shared/ui";
import { useCreateJobAttempt } from "../api/queries";
import { TrackerPanel } from "./TrackerPanel";

/** Today in my time zone, as a date input takes it; the en-CA locale writes dates as 2026-11-07. */
function today(): string {
   return new Date().toLocaleDateString("en-CA");
}

/** Adds a job JobPilot doesn't know about. Only the role is needed; the date is today unless changed. */
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
               <span className="mb-1 block text-sm text-gray-500">Role</span>
               <input name="title" required maxLength={200} autoFocus className={inputClasses} />
            </label>
            <label className="block">
               <span className="mb-1 block text-sm text-gray-500">Company</span>
               <input name="company" maxLength={200} className={inputClasses} />
            </label>
            <label className="block">
               <span className="mb-1 block text-sm text-gray-500">Link</span>
               <input
                  name="url"
                  type="url"
                  maxLength={2000}
                  placeholder="https://"
                  className={inputClasses}
               />
            </label>
            <label className="block">
               <span className="mb-1 block text-sm text-gray-500">Applied</span>
               <input
                  name="appliedAt"
                  type="date"
                  required
                  defaultValue={today()}
                  max={today()}
                  className={inputClasses}
               />
            </label>
            <Button type="submit" variant="primary" loading={create.isPending}>
               Add
            </Button>
            {create.isError && <p className="text-sm text-red-600">{create.error.message}</p>}
         </form>
      </TrackerPanel>
   );
}
