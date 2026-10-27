/** A curved arrow back in the text's color (lucide's undo-2): putting something back where it was. */
export function UndoIcon({ className = "size-3.5" }: { className?: string }) {
   return (
      <svg
         viewBox="0 0 24 24"
         fill="none"
         stroke="currentColor"
         strokeWidth={2.25}
         strokeLinecap="round"
         strokeLinejoin="round"
         className={`shrink-0 ${className}`}
         aria-hidden
      >
         <path d="M9 14 4 9l5-5" />
         <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11" />
      </svg>
   );
}
