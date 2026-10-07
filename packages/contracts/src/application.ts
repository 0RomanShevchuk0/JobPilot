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

/** Kinds answered with one of the field's options, as the form writes it. */
export const choiceFieldKinds: readonly FormFieldKind[] = ["radio", "select"];

export const formFieldValueSources = ["profile", "document", "ai"] as const;
export type FormFieldValueSource = (typeof formFieldValueSources)[number];

/** One field of an application form as the job site shows it, before anything is answered. */
export interface ApplyFormField {
   /** the input's name, to fill it later */
   name: string;
   label: string;
   kind: FormFieldKind;
   required: boolean;
   /** for select, radio and checkbox groups */
   options?: string[];
}

/** An application form read from the job site. */
export interface ApplyForm {
   /** the recruiter's questions, in the form's order: answered by the AI */
   questions: ApplyFormField[];
   /** the message to the recruiter, when the form has one: written from the profile */
   message?: ApplyFormField;
   /** every other field (CV choice, salary, message templates): the site's defaults are kept */
   other: ApplyFormField[];
   /** the form's HTML as rendered, to see what the reading missed */
   html: string;
}

/** One answer to put into the form, by the input's name. */
export interface FillValue {
   /** the input's name in the form */
   name: string;
   kind: FormFieldKind;
   /** for a choice field, the label of the option to pick */
   value: string;
}

/** How filling the form in ended: the user sent it, or nothing was sent. */
export type FillOutcome =
   | { status: "submitted" }
   /** the user closed the window or let it sit too long: nothing was sent */
   | { status: "cancelled" };

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

/** An application in GET /applications, newest activity first. The API's wire format: ISO dates. */
export interface ApplicationListItem {
   id: string;
   vacancyId: string | null;
   /** the vacancy's title; null when the vacancy is gone */
   title: string | null;
   /** the job page the application goes through */
   postingUrl: string;
   status: ApplicationStatus;
   /** why preparing or submitting failed */
   failureReason: string | null;
   createdAt: string;
   updatedAt: string;
}

/** An application in GET /applications/:id: with its answers. */
export interface ApplicationView extends ApplicationListItem {
   /** the form's questions and the message, with the proposed answers */
   fields: FormField[];
   /** the form is open in a browser window right now, for the user to send or close */
   filling: boolean;
}
