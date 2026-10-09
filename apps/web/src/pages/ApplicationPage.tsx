import type { ApplicationView } from "@jobpilot/contracts";
import { useState } from "react";
import { Link, useParams } from "react-router";
import {
   ApplicationStatusNotice,
   FieldAnswer,
   savedValue,
   useApplication,
   useFillApplication,
   useSaveAnswers,
   useStartApplication,
} from "../features/applications";
import { documentFileUrl, useDocuments } from "../features/documents";
import { Button } from "../shared/ui";

/**
 * One application: while the worker reads the form and answers it, then the answers to review, opened
 * in a browser on this machine for the user to check and send.
 */
export function ApplicationPage() {
   const { id } = useParams<{ id: string }>();
   const application = useApplication(id!);

   return (
      <main className="mx-auto max-w-4xl p-6">
         <Link to="/applications" className="text-sm text-gray-500 hover:text-gray-900">
            ← Applications
         </Link>
         {application.isPending && <p className="mt-4 text-gray-500">Loading…</p>}
         {application.isError && <p className="mt-4 text-red-600">{application.error.message}</p>}
         {application.data && <Application key={application.data.id} app={application.data} />}
      </main>
   );
}

function Application({ app }: { app: ApplicationView }) {
   // my unsaved answers, by field name; saved ones come back in the application's fields
   const [drafts, setDrafts] = useState<Record<string, string>>({});
   const save = useSaveAnswers(app.id);
   const fill = useFillApplication(app.id);
   const prepareAgain = useStartApplication();
   // the CV field attaches the base CV as it is when filling: the link opens that one
   const documents = useDocuments();
   const baseCv = documents.data?.find((d) => d.type === "cv" && d.isBase);
   const cvUrl = baseCv && documentFileUrl(baseCv.id);

   const changes = app.fields
      .filter((field) => field.name in drafts && drafts[field.name] !== savedValue(field))
      .map((field) => ({ name: field.name, value: drafts[field.name]! }));
   const clearDrafts = () => setDrafts({});

   const busy = save.isPending || prepareAgain.isPending || fill.isPending;
   const error = save.error ?? prepareAgain.error ?? fill.error;
   // the answers can change while they are up for review and not open in a browser window
   const editable = app.status === "ready_for_review" && !app.filling && !busy;

   return (
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

         <ApplicationStatusNotice app={app} />

         {app.status !== "preparing" && app.fields.length > 0 && (
            <ol className="mt-6 space-y-4">
               {app.fields.map((field) => (
                  <FieldAnswer
                     key={field.name}
                     field={field}
                     value={drafts[field.name] ?? savedValue(field)}
                     editable={editable}
                     onChange={(value) => setDrafts((d) => ({ ...d, [field.name]: value }))}
                     fileUrl={field.valueSource === "document" ? cvUrl : undefined}
                  />
               ))}
            </ol>
         )}

         <div className="mt-6 flex gap-2">
            {app.status === "ready_for_review" && changes.length > 0 && (
               <Button
                  onClick={() => save.mutate(changes, { onSuccess: clearDrafts })}
                  disabled={busy || app.filling}
               >
                  Save changes
               </Button>
            )}
            {/* what I changed goes into the form too: it is saved first */}
            {app.status === "ready_for_review" && (
               <Button
                  variant="primary"
                  onClick={() => fill.mutate(changes, { onSuccess: clearDrafts })}
                  disabled={busy || app.filling}
               >
                  Open in browser
               </Button>
            )}
            {(app.status === "ready_for_review" || app.status === "failed") && (
               <Button
                  onClick={() => prepareAgain.mutate(app.postingId, { onSuccess: clearDrafts })}
                  disabled={busy || app.filling}
               >
                  {app.status === "failed" ? "Try again" : "Answer again"}
               </Button>
            )}
         </div>
         {error && <p className="mt-3 text-sm text-red-600">{error.message}</p>}
      </>
   );
}
