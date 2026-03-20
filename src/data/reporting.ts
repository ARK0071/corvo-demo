/**
 * Reporting State Management
 *
 * Deadline and compliance reporting engine. Auto-generates reporting schedules
 * from Award records, tracks report status, and manages closeout workflows.
 *
 * Report types: SF-425, Progress Reports, SEFA, Single Audit, Closeout.
 */

import { getAllAwards, getAwardById, getExpensesForAward, getDrawdownsForAward, getMatchStatus, type Award } from "./awards";

// ─── Types ───

export type ReportType = "sf425" | "progress" | "sefa" | "single_audit" | "closeout" | "custom";
export type ReportStatus = "upcoming" | "in_progress" | "draft_ready" | "submitted" | "overdue";
export type ReportFrequency = "quarterly" | "semi_annual" | "annual";

export interface ScheduledReport {
  id: string;
  awardId: string;
  awardTitle: string;
  program: string;
  type: ReportType;
  title: string;
  dueDate: string;
  periodStart: string;
  periodEnd: string;
  status: ReportStatus;
  submittedDate?: string;
  notes: string;
  generatedContent?: ReportContent;
}

export interface ReportContent {
  financialSummary: FinancialSummary;
  narrativeDraft?: string;
  matchSummary: MatchSummary;
  completionPercentage: number;
}

export interface FinancialSummary {
  totalAwarded: number;
  totalExpendedThisPeriod: number;
  totalExpendedCumulative: number;
  totalDrawnDown: number;
  remainingBalance: number;
  byCategory: { name: string; budgeted: number; spent: number; remaining: number }[];
}

export interface MatchSummary {
  required: number;
  committed: number;
  percentage: number;
  status: "on_track" | "at_risk" | "shortfall";
}

export interface SEFAEntry {
  cfdaNumber: string;
  programName: string;
  awardingAgency: string;
  fain: string;
  passThrough: string | null;
  totalExpenditures: number;
  awardId: string;
}

export interface CloseoutChecklist {
  awardId: string;
  items: CloseoutItem[];
}

export interface CloseoutItem {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  completedDate?: string;
  required: boolean;
}

// ─── Alert Types ───

export interface ReportingAlert {
  id: string;
  reportId: string;
  awardTitle: string;
  type: ReportType;
  dueDate: string;
  daysUntilDue: number;
  severity: "critical" | "warning" | "info";
  message: string;
}

// ─── In-Memory State ───

const scheduledReports: ScheduledReport[] = [];
const closeoutChecklists: CloseoutChecklist[] = [];
let initialized = false;

// ─── Report Schedule Engine ───

function generateQuarterlyDates(start: string, end: string): { periodStart: string; periodEnd: string; dueDate: string }[] {
  const dates: { periodStart: string; periodEnd: string; dueDate: string }[] = [];
  const quarterEnds = [
    { month: 2, day: 31, label: "Q1" },  // Jan-Mar, due Mar 30
    { month: 5, day: 30, label: "Q2" },  // Apr-Jun, due Jun 30
    { month: 8, day: 30, label: "Q3" },  // Jul-Sep, due Sep 30
    { month: 11, day: 31, label: "Q4" }, // Oct-Dec, due Dec 30
  ];

  const startDate = new Date(start);
  const endDate = new Date(end);

  // Generate quarters from start year to end year
  for (let year = startDate.getFullYear(); year <= endDate.getFullYear(); year++) {
    for (const q of quarterEnds) {
      const periodEnd = new Date(year, q.month, q.day);
      const periodStart = new Date(year, q.month - 2, 1);
      const dueDate = new Date(year, q.month + 1, 30); // 30 days after quarter end

      if (periodEnd < startDate || periodStart > endDate) continue;

      dates.push({
        periodStart: periodStart.toISOString().split("T")[0],
        periodEnd: periodEnd.toISOString().split("T")[0],
        dueDate: dueDate.toISOString().split("T")[0],
      });
    }
  }

  return dates;
}

function generateReportScheduleForAward(award: Award): ScheduledReport[] {
  const reports: ScheduledReport[] = [];
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  // SF-425 Federal Financial Reports (quarterly, due 30 days after quarter end)
  if (award.cfda.startsWith("20.")) {
    const quarterlyDates = generateQuarterlyDates(award.performancePeriod.start, award.performancePeriod.end);
    quarterlyDates.forEach((qd, i) => {
      const isPast = qd.dueDate < today;
      const isOverdue = isPast && qd.dueDate > new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      reports.push({
        id: `rpt-sf425-${award.id}-${i}`,
        awardId: award.id,
        awardTitle: award.title,
        program: award.program,
        type: "sf425",
        title: `SF-425 Federal Financial Report`,
        dueDate: qd.dueDate,
        periodStart: qd.periodStart,
        periodEnd: qd.periodEnd,
        status: isPast ? "submitted" : "upcoming",
        submittedDate: isPast ? qd.dueDate : undefined,
        notes: "",
      });
    });
  }

  // Progress Reports (quarterly for PIDP, semi-annual for TxDOT)
  const isQuarterly = award.program === "PIDP";
  const progressDates = generateQuarterlyDates(award.performancePeriod.start, award.performancePeriod.end);
  const filteredProgressDates = isQuarterly ? progressDates : progressDates.filter((_, i) => i % 2 === 1);

  filteredProgressDates.forEach((pd, i) => {
    const isPast = pd.dueDate < today;

    reports.push({
      id: `rpt-progress-${award.id}-${i}`,
      awardId: award.id,
      awardTitle: award.title,
      program: award.program,
      type: "progress",
      title: `${isQuarterly ? "Quarterly" : "Semi-Annual"} Progress Report`,
      dueDate: pd.dueDate,
      periodStart: pd.periodStart,
      periodEnd: pd.periodEnd,
      status: isPast ? "submitted" : "upcoming",
      submittedDate: isPast ? pd.dueDate : undefined,
      notes: "",
    });
  });

  // Closeout report (due 120 days after performance period end)
  const perfEnd = new Date(award.performancePeriod.end);
  const closeoutDue = new Date(perfEnd.getTime() + 120 * 24 * 60 * 60 * 1000);

  if (award.status === "closeout_pending" || award.status === "closed") {
    reports.push({
      id: `rpt-closeout-${award.id}`,
      awardId: award.id,
      awardTitle: award.title,
      program: award.program,
      type: "closeout",
      title: "Final Closeout Report",
      dueDate: closeoutDue.toISOString().split("T")[0],
      periodStart: award.performancePeriod.start,
      periodEnd: award.performancePeriod.end,
      status: award.status === "closed" ? "submitted" : "in_progress",
      notes: "Complete all closeout checklist items before submission.",
    });
  }

  return reports;
}

// ─── Public API ───

export function getAllReports(): ScheduledReport[] {
  if (!initialized) initializeReportingData();
  return scheduledReports;
}

export function getReportsForAward(awardId: string): ScheduledReport[] {
  if (!initialized) initializeReportingData();
  return scheduledReports.filter((r) => r.awardId === awardId);
}

export function getUpcomingReports(days: number = 90): ScheduledReport[] {
  if (!initialized) initializeReportingData();
  const now = Date.now();
  const cutoff = now + days * 24 * 60 * 60 * 1000;

  return scheduledReports
    .filter((r) => {
      if (r.status === "submitted") return false;
      const due = new Date(r.dueDate).getTime();
      return due >= now && due <= cutoff;
    })
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
}

export function getOverdueReports(): ScheduledReport[] {
  if (!initialized) initializeReportingData();
  const today = new Date().toISOString().split("T")[0];

  return scheduledReports.filter((r) => r.status !== "submitted" && r.dueDate < today);
}

export function getReportingAlerts(): ReportingAlert[] {
  if (!initialized) initializeReportingData();

  const alerts: ReportingAlert[] = [];
  const now = Date.now();
  const alertThresholds = [30, 14, 7, 3, 1];

  for (const report of scheduledReports) {
    if (report.status === "submitted") continue;

    const dueTime = new Date(report.dueDate).getTime();
    const daysUntil = Math.ceil((dueTime - now) / (1000 * 60 * 60 * 24));

    // Overdue
    if (daysUntil < 0) {
      alerts.push({
        id: `alert-overdue-${report.id}`,
        reportId: report.id,
        awardTitle: report.awardTitle,
        type: report.type,
        dueDate: report.dueDate,
        daysUntilDue: daysUntil,
        severity: "critical",
        message: `OVERDUE: ${report.title} for ${report.program} was due ${Math.abs(daysUntil)} day(s) ago.`,
      });
    }
    // Upcoming
    else if (daysUntil <= 30) {
      const severity = daysUntil <= 3 ? "critical" : daysUntil <= 7 ? "warning" : "info";
      alerts.push({
        id: `alert-upcoming-${report.id}`,
        reportId: report.id,
        awardTitle: report.awardTitle,
        type: report.type,
        dueDate: report.dueDate,
        daysUntilDue: daysUntil,
        severity,
        message: `${report.title} for ${report.program} due in ${daysUntil} day(s) (${report.dueDate}).`,
      });
    }
  }

  // Sort: overdue first (most overdue first), then upcoming (soonest first)
  alerts.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  return alerts;
}

export function updateReportStatus(reportId: string, status: ReportStatus, notes?: string): ScheduledReport | null {
  if (!initialized) initializeReportingData();

  const report = scheduledReports.find((r) => r.id === reportId);
  if (!report) return null;

  report.status = status;
  if (status === "submitted") report.submittedDate = new Date().toISOString().split("T")[0];
  if (notes) report.notes = notes;

  return report;
}

// ─── Report Content Generation ───

export function generateFinancialSummary(awardId: string, periodStart: string, periodEnd: string): FinancialSummary {
  if (!initialized) initializeReportingData();

  const award = getAwardById(awardId);
  if (!award) {
    return { totalAwarded: 0, totalExpendedThisPeriod: 0, totalExpendedCumulative: 0, totalDrawnDown: 0, remainingBalance: 0, byCategory: [] };
  }

  const allExpenses = getExpensesForAward(awardId).filter((e) => e.status !== "flagged");
  const periodExpenses = allExpenses.filter((e) => e.date >= periodStart && e.date <= periodEnd);
  const allDrawdowns = getDrawdownsForAward(awardId).filter((d) => d.status === "approved" || d.status === "payment_received");

  const totalExpendedCumulative = allExpenses.reduce((s, e) => s + e.amount, 0);
  const totalExpendedThisPeriod = periodExpenses.reduce((s, e) => s + e.amount, 0);
  const totalDrawnDown = allDrawdowns.reduce((s, d) => s + d.totalAmount, 0);

  const byCategory = award.budgetCategories.map((cat) => ({
    name: cat.name,
    budgeted: cat.ceiling,
    spent: cat.spent,
    remaining: cat.ceiling - cat.spent,
  }));

  return {
    totalAwarded: award.totalAmount,
    totalExpendedThisPeriod,
    totalExpendedCumulative,
    totalDrawnDown,
    remainingBalance: award.totalAmount - totalDrawnDown,
    byCategory,
  };
}

export function generateMatchSummary(awardId: string): MatchSummary {
  const ms = getMatchStatus(awardId);
  return {
    required: ms.required,
    committed: ms.committed,
    percentage: ms.percentage,
    status: ms.status,
  };
}

export function generateReportContent(reportId: string): ReportContent | null {
  if (!initialized) initializeReportingData();

  const report = scheduledReports.find((r) => r.id === reportId);
  if (!report) return null;

  const financialSummary = generateFinancialSummary(report.awardId, report.periodStart, report.periodEnd);
  const matchSummary = generateMatchSummary(report.awardId);

  const award = getAwardById(report.awardId);
  const totalBudget = award ? award.totalAmount : 0;
  const completionPercentage = totalBudget > 0 ? (financialSummary.totalExpendedCumulative / totalBudget) * 100 : 0;

  const content: ReportContent = {
    financialSummary,
    matchSummary,
    completionPercentage: Math.min(100, Math.round(completionPercentage)),
  };

  report.generatedContent = content;
  return content;
}

// ─── SEFA Generation ───

export function generateSEFA(fiscalYearEnd: string): { entries: SEFAEntry[]; totalExpenditures: number; meetsAuditThreshold: boolean } {
  if (!initialized) initializeReportingData();

  const fyEnd = new Date(fiscalYearEnd);
  const fyStart = new Date(fyEnd.getFullYear() - 1, fyEnd.getMonth(), fyEnd.getDate() + 1);
  const fyStartStr = fyStart.toISOString().split("T")[0];
  const fyEndStr = fiscalYearEnd;

  const awards = getAllAwards();
  const entries: SEFAEntry[] = [];

  for (const award of awards) {
    const awardExpenses = getExpensesForAward(award.id)
      .filter((e) => e.status !== "flagged" && e.date >= fyStartStr && e.date <= fyEndStr);

    const totalExpenditures = awardExpenses.reduce((s, e) => s + e.amount, 0);

    if (totalExpenditures > 0) {
      entries.push({
        cfdaNumber: award.cfda,
        programName: `${award.program} - ${award.title}`,
        awardingAgency: award.awardingAgency,
        fain: award.fain,
        passThrough: award.awardingAgency.includes("Texas") ? "Texas Department of Transportation" : null,
        totalExpenditures,
        awardId: award.id,
      });
    }
  }

  const totalExpenditures = entries.reduce((s, e) => s + e.totalExpenditures, 0);

  return {
    entries,
    totalExpenditures,
    meetsAuditThreshold: totalExpenditures >= 750_000,
  };
}

// ─── Closeout Workflow ───

export function getCloseoutChecklist(awardId: string): CloseoutChecklist {
  if (!initialized) initializeReportingData();

  let checklist = closeoutChecklists.find((c) => c.awardId === awardId);
  if (checklist) return checklist;

  // Generate default checklist
  checklist = {
    awardId,
    items: [
      { id: "co-1", label: "Final drawdown submitted", description: "Submit final reimbursement request within 120 days of performance period end.", completed: false, required: true },
      { id: "co-2", label: "Final progress report", description: "Complete and submit final performance/progress report.", completed: false, required: true },
      { id: "co-3", label: "Final SF-425", description: "Submit final Federal Financial Report (SF-425).", completed: false, required: true },
      { id: "co-4", label: "Match documentation certified", description: "Compile and certify all local match documentation.", completed: false, required: true },
      { id: "co-5", label: "Equipment inventory reconciled", description: "Reconcile all equipment purchased with federal funds ($5K+ items). Document disposition.", completed: false, required: true },
      { id: "co-6", label: "Excess funds identified", description: "Calculate any unspent federal funds to be de-obligated.", completed: false, required: true },
      { id: "co-7", label: "Records retention confirmed", description: "Confirm all records will be retained for 3 years per 2 CFR 200.334.", completed: false, required: true },
      { id: "co-8", label: "Closeout package archived", description: "Archive complete closeout documentation package.", completed: false, required: false },
    ],
  };

  closeoutChecklists.push(checklist);
  return checklist;
}

export function updateCloseoutItem(awardId: string, itemId: string, completed: boolean): CloseoutItem | null {
  const checklist = getCloseoutChecklist(awardId);
  const item = checklist.items.find((i) => i.id === itemId);
  if (!item) return null;

  item.completed = completed;
  item.completedDate = completed ? new Date().toISOString().split("T")[0] : undefined;
  return item;
}

// ─── Reporting Stats ───

export function getReportingStats() {
  if (!initialized) initializeReportingData();

  const today = new Date().toISOString().split("T")[0];
  const upcoming = scheduledReports.filter((r) => r.status !== "submitted" && r.dueDate >= today);
  const overdue = scheduledReports.filter((r) => r.status !== "submitted" && r.dueDate < today);
  const submitted = scheduledReports.filter((r) => r.status === "submitted");

  const next30 = upcoming.filter((r) => {
    const d = new Date(r.dueDate).getTime() - Date.now();
    return d <= 30 * 24 * 60 * 60 * 1000;
  });

  return {
    totalReports: scheduledReports.length,
    upcoming: upcoming.length,
    overdue: overdue.length,
    submitted: submitted.length,
    dueNext30Days: next30.length,
    nextDueReport: upcoming.length > 0 ? upcoming.sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0] : null,
  };
}

// ─── Initialization ───

function initializeReportingData() {
  if (initialized) return;
  initialized = true;

  const awards = getAllAwards();
  for (const award of awards) {
    const reports = generateReportScheduleForAward(award);
    scheduledReports.push(...reports);
  }

  // Mark some near-future reports as "in_progress" for demo realism
  const now = Date.now();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;

  for (const report of scheduledReports) {
    if (report.status !== "submitted") {
      const dueTime = new Date(report.dueDate).getTime();
      if (dueTime >= now && dueTime <= now + thirtyDays) {
        // Reports due in the next 30 days should be "upcoming" (dashboard lights up)
        report.status = "upcoming";
      }
    }
  }

  // Seed closeout checklist for the solar award with some items completed
  const solarChecklist = getCloseoutChecklist("award-txdot-scp-access");
  solarChecklist.items[0].completed = false; // Final drawdown still pending
  solarChecklist.items[3].completed = true;  // Match docs certified
  solarChecklist.items[3].completedDate = "2025-03-01";
  solarChecklist.items[6].completed = true;  // Records retention confirmed
  solarChecklist.items[6].completedDate = "2025-03-05";
}
