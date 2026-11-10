import type { JobAttemptListItem } from "@jobpilot/contracts";
import { useState } from "react";
import { Link } from "react-router";
import { Button, PageLoader, TrashIcon } from "../../../shared/ui";
import { useDeleteJobAttempt, useRequestedSalaryUnits } from "../api/queries";
import { EditJobAttemptForm } from "./EditJobAttemptForm";
import { fieldGridClasses, JobAttemptFields, jobAttemptFieldValues } from "./JobAttemptFields";
import { TrackerPanel } from "./TrackerPanel";

/**
 * A tracker row's details: its fields, laid out as the form that changes them (Edit), its
 * applications, one a job site, each a link to what it sent, and the way to remove a row made by mistake. Shown for one row: another one opens
 * a new panel.
 */
export function JobAttemptPanel({
   attempt,
   onClose,
}: {
   attempt: JobAttemptListItem;
   onClose: () => void;
}) {
   const title = attempt.title ?? "Untitled job";
   const [editing, setEditing] = useState(false);
   const requestedSalaryUnits = useRequestedSalaryUnits();
   const addedByHand = attempt.vacancyId === null;
   const remove = useDeleteJobAttempt(onClose);
   // what I wrote goes with it: asked first
   const confirmAndRemove = () => {
      if (window.confirm("Remove this row? Its stage, status and notes are lost.")) {
         remove.mutate(attempt.id);
      }
   };

   return (
      <TrackerPanel
         label={title}
         onClose={onClose}
         heading={
            <>
               <p className={`text-sm ${attempt.company ? "text-gray-600" : "text-gray-400"}`}>
                  {attempt.company ?? "Company unknown"}
               </p>
               <h2 className="font-semibold text-gray-900">{title}</h2>
               {/* a link of its own, not the title: a title that's a link went unnoticed */}
               {attempt.vacancyId && (
                  <Link
                     to={`/matches/${attempt.vacancyId}`}
                     className="mt-1 inline-block text-sm text-blue-600 hover:underline"
                  >
                     Open vacancy →
                  </Link>
               )}
            </>
         }
      >
         {editing ? (
            requestedSalaryUnits ? (
               <EditJobAttemptForm
                  attempt={attempt}
                  requestedSalaryUnits={requestedSalaryUnits}
                  onDone={() => setEditing(false)}
               />
            ) : (
               <PageLoader />
            )
         ) : (
            <>
               <div className="flex flex-col gap-4">
                  <JobAttemptFields
                     values={jobAttemptFieldValues(attempt)}
                     editing={false}
                     titleRequired={addedByHand}
                     withLink={addedByHand}
                  />
                  {attempt.applications.length > 0 && (
                     <div className={fieldGridClasses}>
                        <span className="text-gray-500">Applications</span>
                        <div className="flex flex-wrap gap-x-3">
                           {attempt.applications.map((application) => (
                              <Link
                                 key={application.id}
                                 to={`/applications/${application.id}`}
                                 className="text-gray-900 underline hover:text-gray-600"
                              >
                                 {application.sourceName}
                              </Link>
                           ))}
                        </div>
                     </div>
                  )}
                  {/* where the form has Save and Cancel */}
                  <div>
                     <Button onClick={() => setEditing(true)}>Edit</Button>
                  </div>
               </div>

               <div className="mt-auto">
                  <Button
                     variant="dangerGhost"
                     size="sm"
                     className="inline-flex items-center gap-1.5"
                     loading={remove.isPending}
                     onClick={confirmAndRemove}
                  >
                     {!remove.isPending && <TrashIcon />}
                     Remove from tracker
                  </Button>
                  {remove.isError && (
                     <p className="mt-1 text-sm text-red-600">{remove.error.message}</p>
                  )}
               </div>
            </>
         )}
      </TrackerPanel>
   );
}
