import { useEffect, useRef, useState, type ReactNode } from "react";

interface Props {
   /** what the button says to a screen reader: it shows an icon or a picture, no text */
   label: string;
   /** what the button shows */
   trigger: ReactNode;
   triggerClassName: string;
   /** the items, menuItemStyles on each; anything in it closes the menu once clicked */
   children: ReactNode;
}

/** A menu item's classes, a link or a button: a row the menu's width. */
export const menuItemStyles =
   "flex w-full items-center gap-2 px-4 py-2 text-left whitespace-nowrap text-gray-700 hover:bg-gray-50";

/**
 * A button that opens a menu under it, its right edge under the button's. A click outside or Esc
 * closes it, so does a click on an item.
 */
export function Menu({ label, trigger, triggerClassName, children }: Props) {
   const [open, setOpen] = useState(false);
   const menuRef = useRef<HTMLDivElement>(null);

   useEffect(() => {
      if (!open) return;
      const closeOnOutsideClick = (event: PointerEvent) => {
         if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
      };
      const closeOnEscape = (event: KeyboardEvent) => {
         if (event.key === "Escape") setOpen(false);
      };
      document.addEventListener("pointerdown", closeOnOutsideClick);
      document.addEventListener("keydown", closeOnEscape);
      return () => {
         document.removeEventListener("pointerdown", closeOnOutsideClick);
         document.removeEventListener("keydown", closeOnEscape);
      };
   }, [open]);

   return (
      <div ref={menuRef} className="relative">
         <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-label={label}
            aria-expanded={open}
            className={triggerClassName}
         >
            {trigger}
         </button>
         {open && (
            <div
               onClick={() => setOpen(false)}
               className="absolute right-0 z-20 mt-1 w-max max-w-72 min-w-40 rounded border border-gray-200 bg-white py-1 text-sm shadow-lg"
            >
               {children}
            </div>
         )}
      </div>
   );
}
