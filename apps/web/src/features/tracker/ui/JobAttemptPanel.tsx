import type { JobAttemptListItem } from "@jobpilot/contracts";
import { useEffect, useRef } from "react";
import { Link } from "react-router";
import { textareaClasses } from "../../../shared/ui";
import { useUpdateJobAttempt } from "../api/queries";

/**
 * A tracker row's details, at the screen's right edge (the whole screen on a phone): the job, the
 * answers of each application, the notes. Esc closes it.
 */
export function JobAttemptPanel({
   attempt,
   onClose,
}: {
   attempt: JobAttemptListItem;
   onClose: () => void;
}) {
   useEffect(() => {
      const closeOnEscape = (event: KeyboardEvent) => {
         if (event.key === "Escape") onClose();
      };
      document.addEventListener("keydown", closeOnEscape);
      return () => document.removeEventListener("keydown", closeOnEscape);
   }, [onClose]);

   const title = attempt.title ?? "Untitled job";

   return (
      <aside
         role="dialog"
         aria-label={title}
         className="fixed inset-0 z-30 flex flex-col gap-5 overflow-y-auto bg-white p-5 shadow-xl sm:left-auto sm:w-96 sm:border-l sm:border-gray-200"
      >
         <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
               <p className="text-sm text-gray-600">{attempt.company ?? "Company hidden"}</p>
               <h2 className="font-semibold text-gray-900">
                  {attempt.vacancyId ? (
                     <Link to={`/matches/${attempt.vacancyId}`} className="hover:underline">
                        {title}
                     </Link>
                  ) : (
                     title
                  )}
               </h2>
            </div>
            <button
               type="button"
               aria-label="Close"
               onClick={onClose}
               className="rounded px-2 py-0.5 text-lg leading-none text-gray-500 hover:bg-gray-100"
            >
               ×
            </button>
         </div>

         <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-gray-500">Applied</dt>
            <dd className="text-gray-900">{new Date(attempt.appliedAt).toLocaleDateString()}</dd>
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
      </aside>
   );
}

/**
 * The notes, saved when I leave the field, or when it goes away with my text in it: Esc, the back
 * button, another row.
 */
function NotesField({ attemptId, notes }: { attemptId: string; notes: string }) {
   const { mutate, error } = useUpdateJobAttempt(attemptId);
   const draft = useRef(notes);
   const saved = useRef(notes);
   const save = useRef(() => {
      if (draft.current === saved.current) return;
      saved.current = draft.current;
      mutate({ notes: draft.current });
   });

   useEffect(() => () => save.current(), []);

   return (
      <div>
         <label className="block">
            <span className="mb-1 block text-sm text-gray-500">Notes</span>
            <textarea
               className={textareaClasses}
               defaultValue={notes}
               onChange={(e) => {
                  draft.current = e.target.value;
               }}
               onBlur={() => save.current()}
            />
         </label>
         {error && <p className="mt-1 text-sm text-red-600">{error.message}</p>}
      </div>
   );
}
