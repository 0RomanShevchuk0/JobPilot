import type { JobAttemptSilence, JobAttemptStage, JobAttemptStatus } from "@jobpilot/contracts";

export const stageLabels: Record<JobAttemptStage, string> = {
   applied: "Applied",
   replied: "Replied",
   hr: "HR",
   tech_interview: "Tech interview",
   test_task: "Test task",
   final: "Final",
   offer: "Offer",
};

export const statusLabels: Record<JobAttemptStatus, string> = {
   active: "Active",
   hold: "On hold",
   rejected: "Rejected",
   declined: "I declined",
   accepted: "Accepted",
};

export const silenceLabels: Record<JobAttemptSilence, string> = {
   no_answer: "No answer",
   ghosted: "Ghosted",
};

// the dot before the label: what is going on with the attempt at a glance
export const statusDotStyles: Record<JobAttemptStatus, string> = {
   active: "bg-blue-500",
   hold: "bg-amber-400",
   rejected: "bg-red-500",
   declined: "bg-gray-400",
   accepted: "bg-green-500",
};

export const silenceDotStyles: Record<JobAttemptSilence, string> = {
   no_answer: "bg-gray-300",
   ghosted: "bg-orange-500",
};
