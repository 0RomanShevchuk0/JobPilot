/** Three dots in the text's color (lucide's ellipsis): a menu of the less common actions. */
export function EllipsisIcon({ className = "size-4" }: { className?: string }) {
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
         <circle cx="12" cy="12" r="1" />
         <circle cx="19" cy="12" r="1" />
         <circle cx="5" cy="12" r="1" />
      </svg>
   );
}
