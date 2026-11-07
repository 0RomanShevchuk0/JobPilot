import { useEffect, type ReactNode } from "react";

/** The tracker's panel at the screen's right edge (the whole screen on a phone). Esc closes it. */
export function TrackerPanel({
   label,
   heading,
   onClose,
   children,
}: {
   /** what it is, for a screen reader */
   label: string;
   heading: ReactNode;
   onClose: () => void;
   children: ReactNode;
}) {
   useEffect(() => {
      const closeOnEscape = (event: KeyboardEvent) => {
         if (event.key === "Escape") onClose();
      };
      document.addEventListener("keydown", closeOnEscape);
      return () => document.removeEventListener("keydown", closeOnEscape);
   }, [onClose]);

   return (
      <aside
         role="dialog"
         aria-label={label}
         className="fixed inset-0 z-30 flex flex-col gap-5 overflow-y-auto bg-white p-5 shadow-xl sm:left-auto sm:w-96 sm:border-l sm:border-gray-200"
      >
         <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">{heading}</div>
            <button
               type="button"
               aria-label="Close"
               onClick={onClose}
               className="rounded px-2 py-0.5 text-lg leading-none text-gray-500 hover:bg-gray-100"
            >
               ×
            </button>
         </div>
         {children}
      </aside>
   );
}
