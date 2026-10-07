import type { DocumentListItem } from "@jobpilot/contracts";
import { useRef, useState } from "react";
import { useDeleteDocument, useUploadCv } from "../api/queries";

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
         <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
               <h2 className="font-medium">CV</h2>
               {cv ? (
                  <p className="truncate text-sm text-gray-600">
                     {cv.fileName} · uploaded {new Date(cv.createdAt).toLocaleDateString()}
                  </p>
               ) : (
                  <p className="text-sm text-gray-600">
                     No CV yet. Form answers and letters are written from it.
                  </p>
               )}
            </div>

            <div className="flex shrink-0 items-center gap-2">
               {cv && !confirmingDelete && (
                  <>
                     <a
                        href={`/api/documents/${cv.id}/file`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded bg-gray-100 px-3 py-1 text-sm text-gray-700 hover:bg-gray-200"
                     >
                        View
                     </a>
                     {/* the API serves the file inline; download makes the browser save it under its name */}
                     <a
                        href={`/api/documents/${cv.id}/file`}
                        download
                        className="rounded bg-gray-100 px-3 py-1 text-sm text-gray-700 hover:bg-gray-200"
                     >
                        Download
                     </a>
                     <button
                        onClick={pickFile}
                        disabled={busy}
                        className="rounded bg-gray-100 px-3 py-1 text-sm text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                     >
                        Replace
                     </button>
                     <button
                        onClick={() => setConfirmingDelete(true)}
                        disabled={busy}
                        className="rounded px-3 py-1 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                     >
                        Delete
                     </button>
                  </>
               )}
               {cv && confirmingDelete && (
                  <>
                     <span className="text-sm text-gray-700">Delete the CV?</span>
                     <button
                        onClick={() => deleteCv(cv.id)}
                        disabled={busy}
                        className="rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700 disabled:opacity-50"
                     >
                        Delete
                     </button>
                     <button
                        onClick={() => setConfirmingDelete(false)}
                        disabled={busy}
                        className="rounded bg-gray-100 px-3 py-1 text-sm text-gray-700 hover:bg-gray-200"
                     >
                        Cancel
                     </button>
                  </>
               )}
               {!cv && (
                  <button
                     onClick={pickFile}
                     disabled={busy}
                     className="rounded bg-gray-900 px-3 py-1 text-sm text-white hover:bg-gray-700 disabled:opacity-50"
                  >
                     Upload PDF
                  </button>
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

         {upload.isPending && <p className="mt-3 text-sm text-gray-500">Uploading…</p>}
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
