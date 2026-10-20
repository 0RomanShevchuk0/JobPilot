import type { FormFieldKind } from "@jobpilot/contracts";

/** One answer to put into the form on the page: a file field takes the file itself. */
export interface PageFillValue {
   /** the input's name in the form */
   name: string;
   kind: FormFieldKind;
   /** for a choice field, the label of the option to pick */
   value: string | File;
}

// a pause between fields, so the user can follow what is being filled in
const STEP_PAUSE_MS = 200;

/** Puts the values into the form one by one, with a pause between them for the user to follow. */
export async function fillFields(form: HTMLFormElement, values: PageFillValue[]): Promise<void> {
   for (const value of values) {
      fillField(form, value);
      await new Promise((resolve) => setTimeout(resolve, STEP_PAUSE_MS));
   }
}

/**
 * Puts one value into the form the way its kind takes it: typed in, an option checked or selected,
 * a file attached. Each change is announced with the events a person's typing or clicking fires, so the
 * site's own scripts (counters, validation) see it.
 */
function fillField(form: HTMLFormElement, { name, kind, value }: PageFillValue): void {
   const inputs = [...form.querySelectorAll<HTMLInputElement>(`[name="${CSS.escape(name)}"]`)];
   const first = inputs[0];
   if (!first) throw new Error(`No field "${name}" in the form`);
   switch (kind) {
      case "text":
      case "textarea":
      case "number":
         first.scrollIntoView({ block: "center" });
         setValue(first, String(value));
         return;
      case "select": {
         const select = first as unknown as HTMLSelectElement;
         const option = [...select.options].find((o) => o.text.trim() === value);
         if (!option) throw new Error(`No option "${String(value)}" in the form for "${name}"`);
         select.scrollIntoView({ block: "center" });
         select.value = option.value;
         select.dispatchEvent(new Event("change", { bubbles: true }));
         return;
      }
      case "radio": {
         // the options of a group share the name: the one to check is the one labelled with the value
         const option = inputs.find((input) => cleanText(input.labels?.[0]?.textContent) === value);
         if (!option) throw new Error(`No option "${String(value)}" in the form for "${name}"`);
         option.scrollIntoView({ block: "center" });
         option.click();
         return;
      }
      case "file": {
         if (!(value instanceof File)) throw new Error(`No file to attach for "${name}"`);
         const files = new DataTransfer();
         files.items.add(value);
         first.files = files.files;
         first.dispatchEvent(new Event("change", { bubbles: true }));
         return;
      }
      default:
         throw new Error(`Filling a ${kind} field is not supported yet ("${name}")`);
   }
}

/**
 * Sets an input's value as typing would: through the element's own value setter, which sites that
 * track their inputs (React and the like) listen on, then the input and change events.
 */
function setValue(input: HTMLInputElement | HTMLTextAreaElement, value: string): void {
   const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), "value")?.set;
   if (setter) setter.call(input, value);
   else input.value = value;
   input.dispatchEvent(new Event("input", { bubbles: true }));
   input.dispatchEvent(new Event("change", { bubbles: true }));
}

// runs of whitespace → one space: "\n   Так  " → "Так"
const cleanText = (text: string | null | undefined) => (text ?? "").replace(/\s+/g, " ").trim();
