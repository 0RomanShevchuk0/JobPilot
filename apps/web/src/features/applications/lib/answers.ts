import type { FormField } from "@jobpilot/contracts";

/** The answer as last saved: mine if I changed it, else the proposed one. */
export function savedValue(field: FormField): string {
   return field.finalValue ?? field.proposedValue ?? "";
}
