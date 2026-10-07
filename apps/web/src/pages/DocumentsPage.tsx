import { CvCard, useDocuments } from "../features/documents";

/** My documents: for now just the CV, the one generated documents and form answers start from. */
export function DocumentsPage() {
   const documents = useDocuments();

   return (
      <main className="mx-auto max-w-4xl p-6">
         <h1 className="mb-6 text-2xl font-semibold">Documents</h1>
         {documents.isPending && <p className="text-gray-500">Loading…</p>}
         {documents.isError && <p className="text-red-600">{documents.error.message}</p>}
         {documents.data && <CvCard cv={documents.data.find((d) => d.isBase)} />}
      </main>
   );
}
