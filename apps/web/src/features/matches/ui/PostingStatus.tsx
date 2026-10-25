import type { MatchPosting } from "@jobpilot/contracts";
import { postingState } from "../lib/posting-state";

/**
 * Where applying through a job site stands, next to its badge or link: a dot and a word, plain text so
 * it doesn't pass for another site. With details on the vacancy's page: when it was sent and how, or
 * why the site refused. Nothing while nothing started there.
 */
export function PostingStatus({ posting, details }: { posting: MatchPosting; details?: boolean }) {
   const state = postingState(posting);
   if (!state) return null;
   const { application } = posting;
   const sentOn =
      application?.submittedAt && new Date(application.submittedAt).toLocaleDateString();
   const detail = !details
      ? null
      : application?.status === "submitted"
        ? `${sentOn} · ${application.origin === "manual" ? "by hand" : "JobPilot"}`
        : posting.cannotApplyReason;
   return (
      <span className="flex min-w-0 items-center gap-1.5 text-xs text-gray-600">
         <span aria-hidden className={`size-1.5 shrink-0 rounded-full ${state.dotColor}`} />
         <span className="shrink-0">{state.label}</span>
         {detail && (
            <span className="truncate text-gray-500" title={detail}>
               · {detail}
            </span>
         )}
      </span>
   );
}
