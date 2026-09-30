export type PrefilterCheck =
   | "seniority"
   | "work_mode"
   | "office_city"
   | "candidate_country"
   | "salary"
   | "language"
   | "stop_word"
   | "company";

export interface RejectReason {
   check: PrefilterCheck;
   detail: string;
}

export interface PrefilterResult {
   passed: boolean;
   /** Every failed check, not just the first: useful to see why a vacancy was dropped. */
   rejectedBy: RejectReason[];
}

/** What is stored in vacancy_matches.analysis. The AI part is added with AI scoring. */
export interface MatchAnalysis {
   prefilter: PrefilterResult;
}
