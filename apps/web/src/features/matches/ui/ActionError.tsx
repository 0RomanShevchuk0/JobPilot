/**
 * Why an action under a button didn't go through, until closed. On a phone a block under the buttons
 * (they're the full width already); wide a callout under them, over what's below: in the buttons'
 * column the text would widen it and squeeze the title beside. Its parent is relative.
 */
export function ActionError({ message, onClose }: { message: string; onClose: () => void }) {
   return (
      <div
         role="alert"
         className="flex items-start gap-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-left text-sm text-red-700 sm:absolute sm:top-full sm:right-0 sm:z-30 sm:mt-1 sm:w-72 sm:shadow-lg"
      >
         <p className="flex-1">{message}</p>
         <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 leading-5 text-red-400 hover:text-red-700"
         >
            ×
         </button>
      </div>
   );
}
