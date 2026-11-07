import type { JobAttemptStage, JobAttemptStatus } from "@jobpilot/contracts";

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
   no_answer: "No answer",
   ghosted: "Ghosted",
   hold: "On hold",
   rejected: "Rejected",
   declined: "I declined",
   accepted: "Accepted",
};

// the stage's color deepens as the attempt goes on: gray has seen nothing yet, green an offer
export const stageStyles: Record<JobAttemptStage, string> = {
   applied: "bg-gray-100 text-gray-700",
   replied: "bg-sky-100 text-sky-800",
   hr: "bg-blue-100 text-blue-800",
   tech_interview: "bg-indigo-100 text-indigo-800",
   test_task: "bg-violet-100 text-violet-800",
   final: "bg-fuchsia-100 text-fuchsia-800",
   offer: "bg-green-100 text-green-800",
};

// the status's color says how it stands; nothing to act on stays calm
export const statusStyles: Record<JobAttemptStatus, string> = {
   active: "bg-sky-100 text-sky-800",
   no_answer: "bg-gray-100 text-gray-700",
   ghosted: "bg-orange-100 text-orange-800",
   hold: "bg-amber-100 text-amber-800",
   rejected: "bg-red-100 text-red-800",
   declined: "bg-gray-100 text-gray-700",
   accepted: "bg-green-100 text-green-800",
};
