import type { JobAttemptChanges, JobAttemptListItem } from "@jobpilot/contracts";
import type { FormEvent } from "react";
import { Button } from "../../../shared/ui";
import { useUpdateJobAttempt } from "../api/queries";
import {
   JobAttemptFields,
   jobAttemptFieldValues,
   readJobAttemptFields,
   type JobAttemptFieldValues,
} from "./JobAttemptFields";

/**
 * What I changed in the fields, only that: the rest isn't sent, so Undo doesn't see it as changed. An
 * emptied company is not known any more, an emptied role is the vacancy's again.
 */
function changesIn(attempt: JobAttemptListItem, fields: JobAttemptFieldValues): JobAttemptChanges {
   const shown = jobAttemptFieldValues(attempt);
   const changes: JobAttemptChanges = {};
   if (fields.company !== shown.company) changes.companyName = fields.company || null;
   if (fields.title !== shown.title) changes.title = fields.title || null;
   // only a row added by hand has the field
   if (attempt.vacancyId === null && fields.url !== shown.url) changes.url = fields.url || null;
   if (fields.appliedAt !== shown.appliedAt) changes.appliedAt = fields.appliedAt;
   if (fields.stage !== shown.stage) changes.stage = fields.stage;
   if (fields.status !== shown.status) changes.status = fields.status;
   if (fields.notes !== shown.notes) changes.notes = fields.notes;
   return changes;
}

/** Changes everything of a row at once; done once the list shows it, or when nothing changed. */
export function EditJobAttemptForm({
   attempt,
   onDone,
}: {
   attempt: JobAttemptListItem;
   onDone: () => void;
}) {
   const update = useUpdateJobAttempt(attempt.id);
   const addedByHand = attempt.vacancyId === null;

   const submit = (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const fields = readJobAttemptFields(event.currentTarget);
      const changes = changesIn(attempt, fields);
      if (Object.keys(changes).length === 0) onDone();
      else update.mutate(changes, { onSuccess: onDone });
   };

   return (
      <form onSubmit={submit} className="flex flex-col gap-4">
         <JobAttemptFields
            values={jobAttemptFieldValues(attempt)}
            titleRequired={addedByHand}
            withLink={addedByHand}
         />
         <div className="flex gap-2">
            <Button type="submit" variant="primary" loading={update.isPending}>
               Save
            </Button>
            <Button onClick={onDone} disabled={update.isPending}>
               Cancel
            </Button>
         </div>
         {update.isError && <p className="text-sm text-red-600">{update.error.message}</p>}
      </form>
   );
}
