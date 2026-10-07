import type { ApplicationView } from "@jobpilot/contracts";

/** Where the application stands, above its answers: preparing, failed, sent, open in a browser. */
export function ApplicationStatusNotice({ app }: { app: ApplicationView }) {
   return (
      <>
         {app.status === "preparing" && (
            <div className="flex items-center gap-3 rounded border border-blue-200 bg-blue-50 p-4 text-blue-900">
               <span className="size-4 shrink-0 animate-spin rounded-full border-2 border-blue-300 border-t-blue-700" />
               <div>
                  <p className="font-medium">Preparing the application</p>
                  <p className="text-sm">
                     Opening the form on the job site and writing the answers. This takes up to a
                     few minutes: the answers show up here, you can leave the page meanwhile.
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
         {app.status === "ready_for_review" && app.filling && (
            <p className="text-gray-600">
               The form is open in a browser window on this machine: check it there and send it, or
               close the window.
            </p>
         )}
         {/* a problem with the last filling: the answers are still here to try again */}
         {app.status === "ready_for_review" && app.failureReason && !app.filling && (
            <p className="text-red-600">{app.failureReason}</p>
         )}
      </>
   );
}
