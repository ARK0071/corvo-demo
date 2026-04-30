export type ReportStatus =
  | "upcoming"
  | "drafting"
  | "pending_review"
  | "ready_to_certify"
  | "certified"
  | "filed";

export const REPORT_TRANSITIONS: Record<string, readonly string[]> = {
  upcoming:           ["drafting"],
  drafting:           ["pending_review"],
  pending_review:     ["drafting", "ready_to_certify"],
  ready_to_certify:   ["drafting", "certified"],
  certified:          ["filed"],
  filed:              [],
};

export function assertTransition(from: string, to: string): void {
  const allowed = REPORT_TRANSITIONS[from];
  if (!allowed || !allowed.includes(to)) {
    throw new Error(`Illegal report transition: ${from} → ${to}`);
  }
}

export const STATUS_LABELS: Record<string, string> = {
  upcoming: "Upcoming",
  drafting: "Drafting",
  pending_review: "Pending Review",
  ready_to_certify: "Ready to Certify",
  certified: "Certified",
  filed: "Filed",
};

export const STATUS_COLORS: Record<string, string> = {
  upcoming: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
  drafting: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  pending_review: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  ready_to_certify: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  certified: "bg-green-500/10 text-green-600 dark:text-green-400",
  filed: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
};
