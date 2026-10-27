import type { DocumentListItem } from "@jobpilot/contracts";
import { useRef, useState } from "react";
import { Button, buttonStyles, ReevaluatesMark } from "../../../shared/ui";
import { documentFileUrl, useDeleteDocument, useUploadCv } from "../api/queries";

/** The CV: view, download, replace or delete it, or upload the first one. */
export function CvCard({ cv }: { cv?: DocumentListItem }) {
   const fileInput = useRef<HTMLInputElement>(null);
   const [confirmingDelete, setConfirmingDelete] = useState(false);
   const upload = useUploadCv();
   const remove = useDeleteDocument();

   const pickFile = () => fileInput.current?.click();
   const deleteCv = (id: string) =>
      remove.mutate(id, {
         onSuccess: () => {
            setConfirmingDelete(false);
            upload.reset();
         },
      });
   const busy = upload.isPending || remove.isPending;
   const error = upload.error ?? remove.error;

   return (
      <section className="rounded border border-gray-200 p-4">
         {/* on a phone the buttons go under the file's name: beside it they'd squeeze it to nothing */}
         <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="min-w-0">
               <h2 className="flex items-center gap-1.5 font-medium">
                  CV
                  {/* matching reads it: replacing or deleting it re-evaluates, like a profile change */}
                  <ReevaluatesMark />
               </h2>
               {cv ? (
                  <>
                     <p className="truncate text-sm text-gray-600">{cv.fileName}</p>
                     <p className="text-sm text-gray-500">
                        Uploaded {new Date(cv.createdAt).toLocaleDateString()}
                     </p>
                  </>
               ) : (
                  <p className="text-sm text-gray-600">
                     No CV yet. Form answers and letters are written from it.
                  </p>
               )}
            </div>

            {/* small buttons: the four of them fit a phone's row, a bigger Delete would wrap alone */}
            <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
               {cv && !confirmingDelete && (
                  <>
                     <a
                        href={documentFileUrl(cv.id)}
                        target="_blank"
                        rel="noreferrer"
                        className={buttonStyles({ size: "sm" })}
                     >
                        View
                     </a>
                     {/* the API serves the file inline; download makes the browser save it under its name */}
                     <a
                        href={documentFileUrl(cv.id)}
                        download
                        className={buttonStyles({ size: "sm" })}
                     >
                        Download
                     </a>
                     <Button
                        size="sm"
                        onClick={pickFile}
                        disabled={busy}
                        loading={upload.isPending}
                     >
                        {upload.isPending ? "Uploading…" : "Replace"}
                     </Button>
                     <Button
                        size="sm"
                        variant="dangerGhost"
                        onClick={() => setConfirmingDelete(true)}
                        disabled={busy}
                     >
                        Delete
                     </Button>
                  </>
               )}
               {cv && confirmingDelete && (
                  <>
                     <span className="text-sm text-gray-700">Delete the CV?</span>
                     <Button
                        size="sm"
                        variant="danger"
                        onClick={() => deleteCv(cv.id)}
                        disabled={busy}
                        loading={remove.isPending}
                     >
                        Delete
                     </Button>
                     <Button size="sm" onClick={() => setConfirmingDelete(false)} disabled={busy}>
                        Cancel
                     </Button>
                  </>
               )}
               {!cv && (
                  <Button
                     size="sm"
                     variant="primary"
                     onClick={pickFile}
                     disabled={busy}
                     loading={upload.isPending}
                  >
                     {upload.isPending ? "Uploading…" : "Upload PDF"}
                  </Button>
               )}
            </div>
         </div>

         <input
            ref={fileInput}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
               const file = e.target.files?.[0];
               if (file) upload.mutate(file);
               e.target.value = ""; // picking the same file again still fires onChange
            }}
         />

         {upload.data?.hasText === false && (
            <p className="mt-3 text-sm text-amber-700">
               This PDF has no text, it looks like a scan. Form answers and letters can't use it:
               upload a PDF exported from a document instead.
            </p>
         )}
         {error && <p className="mt-3 text-sm text-red-600">{error.message}</p>}
      </section>
   );
}
