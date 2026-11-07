import type { JobAttemptListItem } from "@jobpilot/contracts";
import { useState } from "react";
import { Link } from "react-router";
import { Button, TrashIcon } from "../../../shared/ui";
import { useDeleteJobAttempt } from "../api/queries";
import { EditJobAttemptForm } from "./EditJobAttemptForm";
import { TrackerPanel } from "./TrackerPanel";

/**
 * A tracker row's details: the job, its company, the answers of each application and the notes; Edit
 * changes any of them, and a row made by mistake can be removed. Shown for one row: another one opens
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
               <h2 className="font-semibold text-gray-900">
                  {attempt.vacancyId ? (
                     <Link to={`/matches/${attempt.vacancyId}`} className="hover:underline">
                        {title}
                     </Link>
                  ) : (
                     title
                  )}
               </h2>
            </>
         }
      >
         {editing ? (
            <EditJobAttemptForm attempt={attempt} onDone={() => setEditing(false)} />
         ) : (
            <>
               <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                  <dt className="text-gray-500">Applied</dt>
                  <dd className="text-gray-900">
                     {new Date(attempt.appliedAt).toLocaleDateString()}
                  </dd>
                  {attempt.url && (
                     <>
                        <dt className="text-gray-500">Link</dt>
                        <dd className="min-w-0 truncate">
                           <a
                              href={attempt.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-gray-900 underline hover:text-gray-600"
                           >
                              {new URL(attempt.url).hostname}
                           </a>
                        </dd>
                     </>
                  )}
                  {attempt.applications.length > 0 && (
                     <>
                        <dt className="text-gray-500">Answers</dt>
                        <dd className="flex flex-wrap gap-x-3">
                           {attempt.applications.map((application) => (
                              <Link
                                 key={application.id}
                                 to={`/applications/${application.id}`}
                                 className="text-gray-900 underline hover:text-gray-600"
                              >
                                 {application.sourceName}
                              </Link>
                           ))}
                        </dd>
                     </>
                  )}
               </dl>

               {attempt.notes && (
                  <div>
                     <h3 className="mb-1 text-sm text-gray-500">Notes</h3>
                     <p className="text-sm break-words whitespace-pre-wrap text-gray-900">
                        {attempt.notes}
                     </p>
                  </div>
               )}

               <div>
                  <Button size="sm" onClick={() => setEditing(true)}>
                     Edit
                  </Button>
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
