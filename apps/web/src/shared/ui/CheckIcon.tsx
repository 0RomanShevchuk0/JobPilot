/** A check mark in the text's color (lucide's check): marking something done, in place. */
export function CheckIcon({ className = "size-3.5" }: { className?: string }) {
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
         <path d="M20 6 9 17l-5-5" />
      </svg>
   );
}
