import type { ApplicationStatus } from "@jobpilot/contracts";

/**
 * An application something can still be done with: JobPilot preparing it, me checking it or trying
 * again. What Applications shows in progress.
 */
export const inWorkApplicationStatuses: readonly ApplicationStatus[] = [
   "draft",
   "preparing",
   "ready_for_review",
   "failed",
];

/** How an application's status reads in the app. */
export const applicationStatusLabels: Record<ApplicationStatus, string> = {
   draft: "draft",
   preparing: "preparing",
   ready_for_review: "ready",
   submitted: "sent",
   failed: "failed",
   cannot_apply: "can't apply",
};

export const applicationStatusStyles: Record<ApplicationStatus, string> = {
   draft: "bg-gray-100 text-gray-700",
   preparing: "bg-blue-100 text-blue-800",
   ready_for_review: "bg-amber-100 text-amber-800",
   submitted: "bg-green-100 text-green-800",
   failed: "bg-red-100 text-red-700",
   cannot_apply: "bg-gray-100 text-gray-600",
};
