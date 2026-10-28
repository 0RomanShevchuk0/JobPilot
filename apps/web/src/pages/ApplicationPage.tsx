import type { ApplicationView } from "@jobpilot/contracts";
import { useState } from "react";
import { Link, useParams } from "react-router";
import {
   ApplicationStatusNotice,
   FieldAnswer,
   savedValue,
   useApplication,
   useExtensionInstalled,
   useFillApplication,
   useSaveAnswers,
   useStartApplication,
} from "../features/applications";
import { documentFileUrl, useDocuments } from "../features/documents";
import { BackLink, Button, PageLoader } from "../shared/ui";

/**
 * One application: while the worker reads the form and answers it, then the answers to review, opened
 * in a browser on this machine for the user to check and send.
 */
export function ApplicationPage() {
   const { id } = useParams<{ id: string }>();
   const application = useApplication(id!);

   return (
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
         <BackLink fallback="/applications" fallbackLabel="Applications" />
         {application.isPending && <PageLoader />}
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
   // false: no extension here to open it in (a phone, another browser); undefined while asking
   const extensionInstalled = useExtensionInstalled().data;
   const sendsHere = app.status === "ready_for_review" && extensionInstalled !== false;
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
   const preparingStopped = app.status === "preparing" && !app.preparationRunning;
   const error = save.error ?? prepareAgain.error ?? fill.error;
   // the answers can change while they are up for review and not open in a browser window
   const editable = app.status === "ready_for_review" && !app.filling && !busy;

   return (
      <>
         <header className="mt-2 mb-6">
            <h1 className="text-2xl font-semibold">{app.title ?? "Application"}</h1>
            <p className="flex flex-wrap gap-x-4 text-sm">
               {/* the vacancy's evaluation and its other job sites; gone vacancies have none */}
               {app.vacancyId && (
                  <Link to={`/matches/${app.vacancyId}`} className="text-blue-700 hover:underline">
                     Vacancy in JobPilot →
                  </Link>
               )}
               <a
                  href={app.postingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-700 hover:underline"
               >
                  Open on {app.sourceName} ↗
               </a>
            </p>
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
                  loading={save.isPending}
               >
                  Save changes
               </Button>
            )}
            {/* what I changed goes into the form too: it is saved first. While the form is open it
                brings its tab forward, or opens it again when the tab is lost (the browser or the
                extension restarted) */}
            {sendsHere && (
               <Button
                  variant="primary"
                  onClick={() => fill.mutate(changes, { onSuccess: clearDrafts })}
                  disabled={busy}
                  loading={fill.isPending}
               >
                  {app.filling ? "Show in browser" : "Open in browser"}
               </Button>
            )}
            {(app.status === "ready_for_review" || app.status === "failed" || preparingStopped) && (
               <Button
                  onClick={() => prepareAgain.mutate(app.postingId, { onSuccess: clearDrafts })}
                  disabled={busy || app.filling}
                  loading={prepareAgain.isPending}
               >
                  {app.status === "ready_for_review" ? "Answer again" : "Try again"}
               </Button>
            )}
         </div>
         {app.status === "ready_for_review" && !sendsHere && (
            <p className="mt-3 text-sm text-gray-600">
               To send it, open this page in Chrome with the JobPilot extension, on a computer. Or
               apply on {app.sourceName} yourself and mark it applied on the vacancy's page.
            </p>
         )}
         {error && <p className="mt-3 text-sm text-red-600">{error.message}</p>}
      </>
   );
}
