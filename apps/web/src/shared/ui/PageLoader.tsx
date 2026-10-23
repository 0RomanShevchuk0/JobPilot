import { Spinner } from "./Spinner";

/**
 * What a page shows while its data loads, in place of the content. Shows up only once the loading
 * takes a moment (animate-appear-late): an answer that comes at once doesn't flash it.
 */
export function PageLoader({ label = "Loading…" }: { label?: string }) {
   return (
      <div
         role="status"
         className="flex animate-appear-late items-center justify-center gap-2 py-12 text-sm text-gray-500"
      >
         <Spinner className="size-5" />
         {label}
      </div>
   );
}
