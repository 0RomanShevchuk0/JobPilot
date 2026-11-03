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
      await fillField(form, value);
      await new Promise((resolve) => setTimeout(resolve, STEP_PAUSE_MS));
   }
}

/**
 * Puts one value into the form the way its kind takes it: typed in, an option checked or selected,
 * a file attached. Each change is announced with the events a person's typing or clicking fires, so the
 * site's own scripts (counters, validation) see it.
 */
async function fillField(
   form: HTMLFormElement,
   { name, kind, value }: PageFillValue,
): Promise<void> {
   const inputs = [...form.querySelectorAll<HTMLInputElement>(`[name="${CSS.escape(name)}"]`)];
   const first = inputs[0];
   if (!first) throw new Error(`No field "${name}" in the form`);
   switch (kind) {
      case "text":
      case "textarea":
      case "number":
         await scrollToField(first);
         setValue(first, String(value));
         return;
      case "select": {
         const select = first as unknown as HTMLSelectElement;
         const option = [...select.options].find((o) => o.text.trim() === value);
         if (!option) throw new Error(`No option "${String(value)}" in the form for "${name}"`);
         await scrollToField(select);
         select.value = option.value;
         select.dispatchEvent(new Event("change", { bubbles: true }));
         return;
      }
      case "radio": {
         // the options of a group share the name: the one to check is the one labelled with the value
         const option = inputs.find((input) => cleanText(input.labels?.[0]?.textContent) === value);
         if (!option) throw new Error(`No option "${String(value)}" in the form for "${name}"`);
         await scrollToField(option);
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

// room kept between a field being filled and the screen's edges: a site's fixed header covers the top
const FIELD_EDGE_ROOM_PX = 80;
// the longest a smooth scroll is waited for, in case its scrollend never comes
const SCROLL_WAIT_MAX_MS = 1000;

/**
 * Scrolls smoothly to the field about to be filled and waits for the scroll to end, for the user to see
 * it filled; a field already in view stays where it is, so a form that fits the screen doesn't move.
 */
async function scrollToField(field: Element): Promise<void> {
   const { top, bottom } = field.getBoundingClientRect();
   if (top >= FIELD_EDGE_ROOM_PX && bottom <= window.innerHeight - FIELD_EDGE_ROOM_PX) return;
   const scrolled = new Promise((resolve) => {
      window.addEventListener("scrollend", resolve, { once: true });
      setTimeout(resolve, SCROLL_WAIT_MAX_MS);
   });
   field.scrollIntoView({ block: "center", behavior: "smooth" });
   await scrolled;
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

// the form's send button: a submit one, or a <button> without a type, which submits too (DOU's "Відправити")
const SEND_BUTTON_SELECTOR = 'button[type="submit"], button:not([type]), input[type="submit"]';

// room under the send button down to the screen's bottom edge, as a share of the screen's height
const SEND_BUTTON_BOTTOM_ROOM = 0.15;

/**
 * Scrolls the page so the form's send button sits near the bottom of the screen, the fields above it in
 * view: the user checks them there, then sends. Without a send button found, the form's end goes there.
 */
export function scrollSendButtonIntoView(form: HTMLFormElement): void {
   const target = form.querySelector(SEND_BUTTON_SELECTOR) ?? form;
   const { bottom } = target.getBoundingClientRect();
   const targetBottom = window.innerHeight * (1 - SEND_BUTTON_BOTTOM_ROOM);
   window.scrollBy({ top: bottom - targetBottom, behavior: "smooth" });
}
