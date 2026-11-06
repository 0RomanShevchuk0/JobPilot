/** lucide's list-checks in the text's color: the tracker, on the tab bar. */
export function ListChecksIcon({ className = "size-5" }: { className?: string }) {
   return (
      <svg
         viewBox="0 0 24 24"
         fill="none"
         stroke="currentColor"
         strokeWidth={2}
         strokeLinecap="round"
         strokeLinejoin="round"
         className={`shrink-0 ${className}`}
         aria-hidden
      >
         <path d="m3 17 2 2 4-4" />
         <path d="m3 7 2 2 4-4" />
         <path d="M13 6h8" />
         <path d="M13 12h8" />
         <path d="M13 18h8" />
      </svg>
   );
}
