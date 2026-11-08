import type { FormEvent } from "react";
import { Button, PageLoader } from "../../../shared/ui";
import { useCreateJobAttempt, useSalaryUnits } from "../api/queries";
import { JobAttemptFields, localDate, readJobAttemptFields, salaryOf } from "./JobAttemptFields";
import { TrackerPanel } from "./TrackerPanel";

/**
 * Adds a job JobPilot doesn't know about. The date is today unless changed; the stage and status start
 * as just applied, one already under way goes in as it stands.
 */
export function NewJobAttemptPanel({ onClose }: { onClose: () => void }) {
   const create = useCreateJobAttempt(onClose);
   const salaryUnits = useSalaryUnits();

   const submit = (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const fields = readJobAttemptFields(event.currentTarget);
      create.mutate({
         title: fields.title,
         company: fields.company || undefined,
         url: fields.url || undefined,
         appliedAt: fields.appliedAt === localDate() ? undefined : fields.appliedAt,
         stage: fields.stage,
         status: fields.status,
         notes: fields.notes || undefined,
         salary: salaryOf(fields) ?? undefined,
      });
   };

   return (
      <TrackerPanel
         label="Add a job"
         onClose={onClose}
         heading={<h2 className="font-semibold text-gray-900">Add a job</h2>}
      >
         {/* the profile names the salary's units: the fields take their first values only */}
         {!salaryUnits ? (
            <PageLoader />
         ) : (
            <form onSubmit={submit} className="flex flex-col gap-4">
               <JobAttemptFields
                  values={{
                     company: "",
                     title: "",
                     url: "",
                     appliedAt: localDate(),
                     stage: "applied",
                     status: "active",
                     notes: "",
                     salaryAmount: "",
                     salaryCurrency: salaryUnits.currency,
                     salaryPeriod: salaryUnits.period,
                  }}
                  titleRequired
                  withLink
               />
               <Button type="submit" variant="primary" loading={create.isPending}>
                  Add
               </Button>
               {create.isError && <p className="text-sm text-red-600">{create.error.message}</p>}
            </form>
         )}
      </TrackerPanel>
   );
}
