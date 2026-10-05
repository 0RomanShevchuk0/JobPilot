import { z } from "zod";

export const applicationStatuses = [
   "draft",
   "preparing",
   "ready_for_review",
   "submitted",
   "failed",
] as const;
export type ApplicationStatus = (typeof applicationStatuses)[number];

export const documentTypes = ["cv", "cover_letter"] as const;
export type DocumentType = (typeof documentTypes)[number];

export const formFieldKinds = [
   "text",
   "textarea",
   "number",
   "select",
   "radio",
   "checkbox",
   "file",
] as const;
export type FormFieldKind = (typeof formFieldKinds)[number];

export const formFieldValueSources = ["profile", "document", "ai"] as const;
export type FormFieldValueSource = (typeof formFieldValueSources)[number];

/** One field of an application form, as found by the browser agent. Array order = order in the form. */
export const formFieldSchema = z.object({
   /** the input's name in the form, to fill it in */
   name: z.string().min(1),
   label: z.string().min(1),
   kind: z.enum(formFieldKinds),
   options: z.array(z.string()).optional(),
   required: z.boolean(),
   valueSource: z.enum(formFieldValueSources),
   proposedValue: z.string().optional(),
   finalValue: z.string().optional(),
   editedByUser: z.boolean(),
});
export type FormField = z.infer<typeof formFieldSchema>;

/** One document in GET /documents. The API's wire format, so dates are ISO strings. */
export interface DocumentListItem {
   id: string;
   type: DocumentType;
   /** the user's own CV, the one generated documents start from */
   isBase: boolean;
   /** null for generated documents that have no file yet */
   fileName: string | null;
   createdAt: string;
}

/** An application in GET /applications/:id. The API's wire format, so dates are ISO strings. */
export interface ApplicationView {
   id: string;
   vacancyId: string | null;
   /** the vacancy's title; null when the vacancy is gone */
   title: string | null;
   /** the job page the application goes through */
   postingUrl: string;
   status: ApplicationStatus;
   /** why preparing or submitting failed */
   failureReason: string | null;
   /** the form's questions and the message, with the proposed answers */
   fields: FormField[];
   createdAt: string;
   updatedAt: string;
}

/** An application in GET /applications, newest activity first: the view without the answers. */
export type ApplicationListItem = Omit<ApplicationView, "fields">;
