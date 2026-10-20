import type { FormFieldKind } from "@jobpilot/contracts";

/** How a form input is filled in, by its type attribute or its tag (textarea, select). */
export function fieldKind(type: string): FormFieldKind {
   switch (type) {
      case "textarea":
      case "select":
      case "file":
      case "number":
      case "radio":
      case "checkbox":
         return type;
      default:
         return "text"; // text, email, tel, url: typed in alike
   }
}
