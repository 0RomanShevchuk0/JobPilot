import type { JobAttemptListItem } from "@jobpilot/contracts";
import { useEffect, useRef, type ChangeEvent } from "react";
import { Link } from "react-router";
import { Button, inputClasses, textareaClasses, TrashIcon } from "../../../shared/ui";
import { useDeleteJobAttempt, useUpdateJobAttempt } from "../api/queries";
import { TrackerPanel } from "./TrackerPanel";

/**
 * A tracker row's details: the job, its company, or a field for it when it's not known, the answers
 * of each application, the notes, and the way to remove a row made by mistake.
 */
export function JobAttemptPanel({
   attempt,
   onClose,
}: {
   attempt: JobAttemptListItem;
   onClose: () => void;
}) {
   const title = attempt.title ?? "Untitled job";
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
               {attempt.company ? (
                  <p className="text-sm text-gray-600">{attempt.company}</p>
               ) : (
                  <CompanyField key={attempt.id} attemptId={attempt.id} />
               )}
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
         <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-gray-500">Applied</dt>
            <dd className="text-gray-900">{new Date(attempt.appliedAt).toLocaleDateString()}</dd>
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

         {/* a new field for each row: it starts from what that row has */}
         <NotesField key={attempt.id} attemptId={attempt.id} notes={attempt.notes} />

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
            {remove.isError && <p className="mt-1 text-sm text-red-600">{remove.error.message}</p>}
         </div>
      </TrackerPanel>
   );
}

/**
 * A field's handlers: what I wrote is saved when I leave the field, or when it goes away with my text
 * in it (Esc, the back button, another row). save stays the first render's: it needs nothing newer.
 */
function useSaveOnLeave(value: string, save: (text: string) => void) {
   const draft = useRef(value);
   const saved = useRef(value);
   const saveDraft = useRef(() => {
      if (draft.current === saved.current) return;
      saved.current = draft.current;
      save(draft.current);
   });

   useEffect(() => () => saveDraft.current(), []);

   return {
      onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
         draft.current = event.target.value;
      },
      onBlur: () => saveDraft.current(),
   };
}

function NotesField({ attemptId, notes }: { attemptId: string; notes: string }) {
   const { mutate, error } = useUpdateJobAttempt(attemptId);
   const handlers = useSaveOnLeave(notes, (text) => mutate({ notes: text }));

   return (
      <div>
         <label className="block">
            <span className="mb-1 block text-sm text-gray-500">Notes</span>
            <textarea className={textareaClasses} defaultValue={notes} {...handlers} />
         </label>
         {error && <p className="mt-1 text-sm text-red-600">{error.message}</p>}
      </div>
   );
}

/** The company of a row that has none; once saved, the row shows it and the field goes. */
function CompanyField({ attemptId }: { attemptId: string }) {
   const { mutate, error } = useUpdateJobAttempt(attemptId);
   const handlers = useSaveOnLeave("", (text) => {
      const companyName = text.trim();
      if (companyName) mutate({ companyName });
   });

   return (
      <div className="mb-1">
         <input
            aria-label="Company"
            placeholder="Company unknown: type it"
            maxLength={200}
            className={inputClasses}
            {...handlers}
         />
         {error && <p className="mt-1 text-sm text-red-600">{error.message}</p>}
      </div>
   );
}
