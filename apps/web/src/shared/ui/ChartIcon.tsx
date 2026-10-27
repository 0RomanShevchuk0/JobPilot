/** lucide's chart-column in the text's color: the stats, on the tab bar. */
export function ChartIcon({ className = "size-5" }: { className?: string }) {
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
         <path d="M3 3v16a2 2 0 0 0 2 2h16" />
         <path d="M18 17V9" />
         <path d="M13 17V5" />
         <path d="M8 17v-3" />
      </svg>
   );
}
