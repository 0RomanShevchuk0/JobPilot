import type { ApplicationStatus, MatchPosting } from "@jobpilot/contracts";
import { applicationStatusLabels } from "../../applications";
import { formatJobSiteDay } from "./display";

// the dot by the status: what it means at a glance, apart from the site badges' own color
const DOT_COLORS: Record<ApplicationStatus | "refused", string> = {
   draft: "bg-gray-400",
   preparing: "bg-blue-500",
   ready_for_review: "bg-amber-500",
   submitted: "bg-green-500",
   failed: "bg-red-500",
   cannot_apply: "bg-gray-400",
   refused: "bg-gray-400",
};

/**
 * Where applying through the posting stands: my application's status ("ready", "sent"), "can't
 * apply" when its page refused, or that the employer bumped it after mine got no answer; null while
 * nothing started there, nothing to show then.
 */
export function postingState(posting: MatchPosting): { label: string; dotColor: string } | null {
   const { application } = posting;
   if (posting.bumpedSinceAppliedAt) {
      return {
         label: `no answer · bumped ${formatJobSiteDay(posting.bumpedSinceAppliedAt)}`,
         dotColor: DOT_COLORS.ready_for_review,
      };
   }
   if (application) {
      return {
         label: applicationStatusLabels[application.status],
         dotColor: DOT_COLORS[application.status],
      };
   }
   if (posting.cannotApplyReason) return { label: "can't apply", dotColor: DOT_COLORS.refused };
   return null;
}
