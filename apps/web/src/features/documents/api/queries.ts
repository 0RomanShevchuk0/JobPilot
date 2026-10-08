import type { DocumentListItem } from "@jobpilot/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiGet, apiPut } from "../../../shared/api/client";
import { queryKeys } from "../../../shared/api/queryKeys";

/** Where a document's file opens: the API serves it inline, so the browser shows a PDF itself. */
export function documentFileUrl(id: string): string {
   return `/api/documents/${id}/file`;
}

/** My documents. */
export function useDocuments() {
   return useQuery({
      queryKey: queryKeys.documents.all,
      queryFn: () => apiGet<DocumentListItem[]>("/documents"),
   });
}

/** Uploads the CV, replacing the one there is. Resolves to whether text could be read from the PDF. */
export function useUploadCv() {
   const queryClient = useQueryClient();
   return useMutation({
      mutationFn: (file: File) => {
         const form = new FormData();
         form.append("file", file);
         return apiPut<{ id: string; hasText: boolean }>("/documents/cv", form);
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.documents.all }),
   });
}

export function useDeleteDocument() {
   const queryClient = useQueryClient();
   return useMutation({
      mutationFn: (id: string) => apiDelete(`/documents/${id}`),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.documents.all }),
   });
}
