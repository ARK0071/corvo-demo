/**
 * Server-side state transition guards.
 *
 * The UI also gates transitions, but the UI is not authoritative — any
 * client (curl, an attacker, a buggy job) can POST a PUT directly to the
 * API. Each PUT handler must validate the transition before writing.
 *
 * Adding a new resource? Define the allowed transitions here, then in the
 * route handler call:
 *     assertValidTransition(resource, current, next);
 * which throws TransitionError on illegal moves.
 */

export type DrawdownStatus = "draft" | "submitted" | "approved" | "payment_received";
export type ReportStatus = "upcoming" | "in_progress" | "submitted";
export type CapStatus = "pending" | "in_progress" | "completed" | "overdue";
export type ExpenseStatus = "logged" | "flagged" | "approved" | "drawn";

export const DRAWDOWN_TRANSITIONS: Record<DrawdownStatus, DrawdownStatus[]> = {
  draft: ["submitted"],
  submitted: ["approved", "draft"], // allow recall to draft for corrections
  approved: ["payment_received"],
  payment_received: [], // terminal — no further transitions
};

export const REPORT_TRANSITIONS: Record<ReportStatus, ReportStatus[]> = {
  upcoming: ["in_progress", "submitted"],
  in_progress: ["submitted", "upcoming"],
  submitted: [], // terminal
};

// CAPs are slightly more open: an admin can move a CAP between states
// based on real-world progress, including from "completed" back to
// "in_progress" if work was found to be insufficient.
export const CAP_TRANSITIONS: Record<CapStatus, CapStatus[]> = {
  pending: ["in_progress", "overdue"],
  in_progress: ["completed", "pending", "overdue"],
  completed: ["in_progress"], // reopen if needed
  overdue: ["in_progress", "completed"],
};

export const EXPENSE_TRANSITIONS: Record<ExpenseStatus, ExpenseStatus[]> = {
  logged: ["flagged", "approved"],
  flagged: ["approved", "logged"],
  approved: ["drawn"],
  drawn: [], // immutable per 2 CFR 200.305
};

export class TransitionError extends Error {
  constructor(
    public resource: string,
    public from: string,
    public to: string,
    public allowed: string[]
  ) {
    super(`Invalid ${resource} status transition: ${from} → ${to}`);
    this.name = "TransitionError";
  }
}

function assertValid<T extends string>(
  resource: string,
  table: Record<T, T[]>,
  current: T,
  next: T
): void {
  const allowed = table[current];
  if (!allowed) {
    throw new TransitionError(resource, current, next, []);
  }
  if (!allowed.includes(next)) {
    throw new TransitionError(resource, current, next, allowed);
  }
}

export function assertDrawdownTransition(current: DrawdownStatus, next: DrawdownStatus): void {
  assertValid("drawdown", DRAWDOWN_TRANSITIONS, current, next);
}

export function assertReportTransition(current: ReportStatus, next: ReportStatus): void {
  assertValid("report", REPORT_TRANSITIONS, current, next);
}

export function assertCapTransition(current: CapStatus, next: CapStatus): void {
  assertValid("CAP", CAP_TRANSITIONS, current, next);
}

export function assertExpenseTransition(current: ExpenseStatus, next: ExpenseStatus): void {
  assertValid("expense", EXPENSE_TRANSITIONS, current, next);
}

/**
 * Convert a TransitionError into a structured 400 response payload.
 * The detail message is server-side only — the client gets a generic
 * "invalid transition" message to avoid leaking the workflow graph.
 */
export function transitionErrorResponse(error: unknown): {
  status: number;
  body: { error: string };
} | null {
  if (error instanceof TransitionError) {
    console.warn(
      `[transition] rejected ${error.resource} ${error.from} → ${error.to} (allowed: ${error.allowed.join(", ") || "none"})`
    );
    return {
      status: 400,
      body: { error: "Invalid status transition for this resource" },
    };
  }
  return null;
}
