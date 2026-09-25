import { z } from 'zod';

export const applicationStatuses = ['draft', 'preparing', 'ready_for_review', 'submitted', 'failed'] as const;
export type ApplicationStatus = (typeof applicationStatuses)[number];

export const documentTypes = ['cv', 'cover_letter'] as const;
export type DocumentType = (typeof documentTypes)[number];

export const formFieldKinds = ['text', 'textarea', 'number', 'select', 'radio', 'checkbox', 'file'] as const;
export type FormFieldKind = (typeof formFieldKinds)[number];

export const formFieldValueSources = ['profile', 'document', 'ai'] as const;
export type FormFieldValueSource = (typeof formFieldValueSources)[number];

/** One field of an application form, as found by the browser agent. Array order = order in the form. */
export const formFieldSchema = z.object({
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
