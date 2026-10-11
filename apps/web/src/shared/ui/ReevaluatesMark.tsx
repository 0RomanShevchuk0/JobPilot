/**
 * Marks what matching reads, as an asterisk marks a required field: changing it re-evaluates every
 * open vacancy. A circular arrow, as "refresh" (lucide's refresh-cw).
 */
export function ReevaluatesMark() {
   return (
      <svg
         viewBox="0 0 24 24"
         fill="none"
         stroke="currentColor"
         strokeWidth={2.25}
         strokeLinecap="round"
         strokeLinejoin="round"
         className="size-3.5 shrink-0 text-amber-600"
         role="img"
         aria-label="Re-evaluates vacancies"
      >
         <title>Changing it re-evaluates every open vacancy</title>
         <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
         <path d="M21 3v5h-5" />
         <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
         <path d="M8 16H3v5" />
      </svg>
   );
}
