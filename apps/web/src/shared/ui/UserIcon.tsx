/** lucide's user in the text's color: the profile, on the tab bar. */
export function UserIcon({ className = "size-5" }: { className?: string }) {
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
         <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
         <circle cx="12" cy="7" r="4" />
      </svg>
   );
}
