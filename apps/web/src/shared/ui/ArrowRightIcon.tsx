/**
 * An arrow to the right in the text's color (lucide's arrow-right): on a link that looks like a button,
 * it says the click goes to another page; a button without it acts in place.
 */
export function ArrowRightIcon({ className = "size-3.5" }: { className?: string }) {
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
         <path d="M5 12h14" />
         <path d="m12 5 7 7-7 7" />
      </svg>
   );
}
