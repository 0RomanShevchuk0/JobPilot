import type { ApplicationView, FormField } from "@jobpilot/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { apiGet, apiPost } from "./api";

// how often to check on the worker: answering takes seconds, sending is up to the user
const PREPARING_POLL_MS = 2000;
const FILLING_POLL_MS = 5000;

/**
 * One application: while the worker reads the form and answers it, then the answers to review, opened
 * in a browser on this machine for the user to check and send.
 */
export function ApplicationPage() {
   const { id } = useParams<{ id: string }>();
   const queryClient = useQueryClient();
   // the browser window is open: watch for the user sending the form there
   const [filling, setFilling] = useState(false);

   const application = useQuery({
      queryKey: ["application", id],
      queryFn: () => apiGet<ApplicationView>(`/applications/${id}`),
      refetchInterval: (query) => {
         const status = query.state.data?.status;
         if (status === "preparing") return PREPARING_POLL_MS;
         if (status === "ready_for_review" && filling) return FILLING_POLL_MS;
         return false;
      },
   });

   const refresh = () =>
      Promise.all([
         queryClient.invalidateQueries({ queryKey: ["application", id] }),
         // the card in Matches and the list show the application's status
         queryClient.invalidateQueries({ queryKey: ["matches"] }),
         queryClient.invalidateQueries({ queryKey: ["applications"] }),
      ]);
   const prepareAgain = useMutation({
      mutationFn: (vacancyId: string) => apiPost("/applications", { vacancyId }),
      onSuccess: () => {
         setFilling(false);
         return refresh();
      },
   });
   const fill = useMutation({
      mutationFn: () => apiPost(`/applications/${id}/fill`),
      onSuccess: () => {
         setFilling(true);
         return refresh();
      },
   });

   const app = application.data;
   const busy = prepareAgain.isPending || fill.isPending;
   const error = prepareAgain.error ?? fill.error;

   return (
      <main className="mx-auto max-w-4xl p-6">
         <Link to="/applications" className="text-sm text-gray-500 hover:text-gray-900">
            ← Applications
         </Link>
         {application.isPending && <p className="mt-4 text-gray-500">Loading…</p>}
         {application.isError && <p className="mt-4 text-red-600">{application.error.message}</p>}

         {app && (
            <>
               <header className="mt-2 mb-6">
                  <h1 className="text-2xl font-semibold">{app.title ?? "Application"}</h1>
                  <a
                     href={app.postingUrl}
                     target="_blank"
                     rel="noreferrer"
                     className="text-sm text-gray-500 hover:underline"
                  >
                     {app.postingUrl}
                  </a>
               </header>

               {app.status === "preparing" && (
                  <div className="flex items-center gap-3 rounded border border-blue-200 bg-blue-50 p-4 text-blue-900">
                     <span className="size-4 shrink-0 animate-spin rounded-full border-2 border-blue-300 border-t-blue-700" />
                     <div>
                        <p className="font-medium">Preparing the application</p>
                        <p className="text-sm">
                           Opening the form on the job site and writing the answers. This takes up
                           to a few minutes: the answers show up here, you can leave the page
                           meanwhile.
                        </p>
                     </div>
                  </div>
               )}
               {app.status === "failed" && (
                  <p className="text-red-600">Couldn't prepare it: {app.failureReason}</p>
               )}
               {app.status === "submitted" && (
                  <p className="text-green-700">
                     Sent on {new Date(app.updatedAt).toLocaleDateString()}.
                  </p>
               )}
               {app.status === "ready_for_review" && filling && (
                  <p className="text-gray-600">
                     The form is open in a browser window on this machine: check it there and send
                     it, or close the window.
                  </p>
               )}
               {/* a problem with the last filling: the answers are still here to try again */}
               {app.status === "ready_for_review" && app.failureReason && !filling && (
                  <p className="text-red-600">{app.failureReason}</p>
               )}

               {app.status !== "preparing" && app.fields.length > 0 && (
                  <ol className="mt-6 space-y-4">
                     {app.fields.map((field) => (
                        <FieldAnswer key={field.name} field={field} />
                     ))}
                  </ol>
               )}

               <div className="mt-6 flex gap-2">
                  {app.status === "ready_for_review" && (
                     <button
                        onClick={() => fill.mutate()}
                        disabled={busy}
                        className="rounded bg-gray-900 px-3 py-1 text-sm text-white hover:bg-gray-700 disabled:opacity-50"
                     >
                        Open in browser
                     </button>
                  )}
                  {(app.status === "ready_for_review" || app.status === "failed") &&
                     app.vacancyId && (
                        <button
                           onClick={() => prepareAgain.mutate(app.vacancyId!)}
                           disabled={busy}
                           className="rounded bg-gray-100 px-3 py-1 text-sm text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                        >
                           {app.status === "failed" ? "Try again" : "Answer again"}
                        </button>
                     )}
               </div>
               {error && <p className="mt-3 text-sm text-red-600">{error.message}</p>}
            </>
         )}
      </main>
   );
}

const sourceLabels: Record<FormField["valueSource"], string> = {
   ai: "AI",
   profile: "profile",
   document: "document",
};

function FieldAnswer({ field }: { field: FormField }) {
   const value = field.finalValue ?? field.proposedValue;
   return (
      <li className="rounded border border-gray-200 p-4">
         <div className="flex items-start justify-between gap-4">
            <p className="font-medium">
               {field.label}
               {field.required && <span className="text-red-600"> *</span>}
            </p>
            <span className="shrink-0 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
               {sourceLabels[field.valueSource]}
            </span>
         </div>
         {value ? (
            <p className="mt-2 text-sm whitespace-pre-wrap text-gray-700">{value}</p>
         ) : (
            <p className="mt-2 text-sm text-gray-400">No answer</p>
         )}
      </li>
   );
}
