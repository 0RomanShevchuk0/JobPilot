/** lucide's briefcase in the text's color: the matches: the vacancies found, on the tab bar. */
export function BriefcaseIcon({ className = "size-5" }: { className?: string }) {
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
         <path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
         <rect width="20" height="14" x="2" y="6" rx="2" />
      </svg>
   );
}
