import { prisma } from "../client";
import { DemoScheduledReport, DemoCloseoutChecklist, Prisma } from "@/generated/prisma";
import { getTenantConfig } from "../tenant-config";
import { parseDateRequired } from "../date-utils";
import type {
  ScheduledReport,
  ReportStatus,
  ReportType,
  CloseoutChecklist,
  CloseoutItem,
  ReportContent,
} from "@/data/reporting";

// Get current port ID from tenant config
function getPortId(): string {
  return getTenantConfig().portId;
}

// ─── Scheduled Reports ───

// Convert Prisma model to application type
function toScheduledReport(report: DemoScheduledReport & { award: { title: string; program: string } }): ScheduledReport {
  return {
    id: report.id,
    awardId: report.awardId,
    awardTitle: report.award.title,
    program: report.award.program,
    type: report.type as ReportType,
    title: report.title,
    dueDate: report.dueDate.toISOString().split("T")[0],
    periodStart: report.periodStart.toISOString().split("T")[0],
    periodEnd: report.periodEnd.toISOString().split("T")[0],
    status: report.status as ReportStatus,
    submittedDate: report.submittedDate?.toISOString().split("T")[0],
    notes: report.notes,
    generatedContent: (report.generatedContent as unknown) as ReportContent | undefined,
  };
}

// Get all scheduled reports for current port
export async function getAllReports(): Promise<ScheduledReport[]> {
  const portId = getPortId();
  const reports = await prisma.demoScheduledReport.findMany({
    where: { portId },
    include: { award: { select: { title: true, program: true } } },
    orderBy: { dueDate: "asc" },
  });
  return reports.map(toScheduledReport);
}

// Get reports for a specific award
export async function getReportsForAward(awardId: string): Promise<ScheduledReport[]> {
  const portId = getPortId();
  const reports = await prisma.demoScheduledReport.findMany({
    where: { portId, awardId },
    include: { award: { select: { title: true, program: true } } },
    orderBy: { dueDate: "asc" },
  });
  return reports.map(toScheduledReport);
}

// Get upcoming reports within N days
export async function getUpcomingReports(days: number = 90): Promise<ScheduledReport[]> {
  const portId = getPortId();
  const now = new Date();
  const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const reports = await prisma.demoScheduledReport.findMany({
    where: {
      portId,
      status: { not: "submitted" },
      dueDate: { gte: now, lte: cutoff },
    },
    include: { award: { select: { title: true, program: true } } },
    orderBy: { dueDate: "asc" },
  });
  return reports.map(toScheduledReport);
}

// Get overdue reports
export async function getOverdueReports(): Promise<ScheduledReport[]> {
  const portId = getPortId();
  const today = new Date();

  const reports = await prisma.demoScheduledReport.findMany({
    where: {
      portId,
      status: { not: "submitted" },
      dueDate: { lt: today },
    },
    include: { award: { select: { title: true, program: true } } },
    orderBy: { dueDate: "asc" },
  });
  return reports.map(toScheduledReport);
}

// Get report by ID
export async function getReportById(id: string): Promise<ScheduledReport | null> {
  const portId = getPortId();
  const report = await prisma.demoScheduledReport.findFirst({
    where: { id, portId },
    include: { award: { select: { title: true, program: true } } },
  });
  return report ? toScheduledReport(report) : null;
}

// Create a scheduled report
export interface CreateReportInput {
  awardId: string;
  type: ReportType;
  title: string;
  dueDate: string;
  periodStart: string;
  periodEnd: string;
  status?: ReportStatus;
  notes?: string;
}

export async function createReport(input: CreateReportInput): Promise<ScheduledReport> {
  const portId = getPortId();

  const report = await prisma.demoScheduledReport.create({
    data: {
      portId,
      awardId: input.awardId,
      type: input.type,
      title: input.title,
      dueDate: parseDateRequired(input.dueDate, "dueDate"),
      periodStart: parseDateRequired(input.periodStart, "periodStart"),
      periodEnd: parseDateRequired(input.periodEnd, "periodEnd"),
      status: input.status || "upcoming",
      notes: input.notes || "",
    },
    include: { award: { select: { title: true, program: true } } },
  });

  return toScheduledReport(report);
}

// Update report status
export async function updateReportStatus(
  reportId: string,
  status: ReportStatus,
  notes?: string
): Promise<ScheduledReport | null> {
  const portId = getPortId();

  const existing = await prisma.demoScheduledReport.findFirst({
    where: { id: reportId, portId },
  });
  if (!existing) return null;

  const report = await prisma.demoScheduledReport.update({
    where: { id: reportId },
    data: {
      status,
      submittedDate: status === "submitted" ? new Date() : existing.submittedDate,
      notes: notes !== undefined ? notes : existing.notes,
    },
    include: { award: { select: { title: true, program: true } } },
  });

  return toScheduledReport(report);
}

// Update report content
export async function updateReportContent(
  reportId: string,
  content: ReportContent,
  narrativeDraft?: string
): Promise<ScheduledReport | null> {
  const portId = getPortId();

  const existing = await prisma.demoScheduledReport.findFirst({
    where: { id: reportId, portId },
  });
  if (!existing) return null;

  const report = await prisma.demoScheduledReport.update({
    where: { id: reportId },
    data: {
      generatedContent: content as unknown as Prisma.JsonObject,
      narrativeDraft: narrativeDraft ?? existing.narrativeDraft,
    },
    include: { award: { select: { title: true, program: true } } },
  });

  return toScheduledReport(report);
}

// Batch upsert reports (for initialization)
export async function upsertReports(
  reports: CreateReportInput[]
): Promise<{ created: number; updated: number }> {
  const portId = getPortId();
  let created = 0;
  let updated = 0;

  for (const input of reports) {
    const periodStartDate = parseDateRequired(input.periodStart, "periodStart");
    const existing = await prisma.demoScheduledReport.findFirst({
      where: {
        portId,
        awardId: input.awardId,
        type: input.type,
        periodStart: periodStartDate,
      },
    });

    if (existing) {
      await prisma.demoScheduledReport.update({
        where: { id: existing.id },
        data: {
          title: input.title,
          dueDate: parseDateRequired(input.dueDate, "dueDate"),
          periodEnd: parseDateRequired(input.periodEnd, "periodEnd"),
          status: input.status || existing.status,
          notes: input.notes ?? existing.notes,
        },
      });
      updated++;
    } else {
      await prisma.demoScheduledReport.create({
        data: {
          portId,
          awardId: input.awardId,
          type: input.type,
          title: input.title,
          dueDate: parseDateRequired(input.dueDate, "dueDate"),
          periodStart: periodStartDate,
          periodEnd: parseDateRequired(input.periodEnd, "periodEnd"),
          status: input.status || "upcoming",
          notes: input.notes || "",
        },
      });
      created++;
    }
  }

  return { created, updated };
}

// Get reporting stats
export async function getReportingStats() {
  const portId = getPortId();
  const today = new Date();
  const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [total, upcoming, overdue, submitted, dueNext30] = await Promise.all([
    prisma.demoScheduledReport.count({ where: { portId } }),
    prisma.demoScheduledReport.count({
      where: { portId, status: { not: "submitted" }, dueDate: { gte: today } },
    }),
    prisma.demoScheduledReport.count({
      where: { portId, status: { not: "submitted" }, dueDate: { lt: today } },
    }),
    prisma.demoScheduledReport.count({ where: { portId, status: "submitted" } }),
    prisma.demoScheduledReport.count({
      where: {
        portId,
        status: { not: "submitted" },
        dueDate: { gte: today, lte: thirtyDaysFromNow },
      },
    }),
  ]);

  const nextDue = await prisma.demoScheduledReport.findFirst({
    where: { portId, status: { not: "submitted" }, dueDate: { gte: today } },
    include: { award: { select: { title: true, program: true } } },
    orderBy: { dueDate: "asc" },
  });

  return {
    totalReports: total,
    upcoming,
    overdue,
    submitted,
    dueNext30Days: dueNext30,
    nextDueReport: nextDue ? toScheduledReport(nextDue) : null,
  };
}

// ─── Closeout Checklists ───

const DEFAULT_CLOSEOUT_ITEMS: CloseoutItem[] = [
  { id: "co-1", label: "Final drawdown submitted", description: "Submit final reimbursement request within 120 days of performance period end.", completed: false, required: true },
  { id: "co-2", label: "Final progress report", description: "Complete and submit final performance/progress report.", completed: false, required: true },
  { id: "co-3", label: "Final SF-425", description: "Submit final Federal Financial Report (SF-425).", completed: false, required: true },
  { id: "co-4", label: "Match documentation certified", description: "Compile and certify all local match documentation.", completed: false, required: true },
  { id: "co-5", label: "Equipment inventory reconciled", description: "Reconcile all equipment purchased with federal funds ($5K+ items). Document disposition.", completed: false, required: true },
  { id: "co-6", label: "Excess funds identified", description: "Calculate any unspent federal funds to be de-obligated.", completed: false, required: true },
  { id: "co-7", label: "Records retention confirmed", description: "Confirm all records will be retained for 3 years per 2 CFR 200.334.", completed: false, required: true },
  { id: "co-8", label: "Closeout package archived", description: "Archive complete closeout documentation package.", completed: false, required: false },
];

// Convert Prisma model to application type
function toCloseoutChecklist(checklist: DemoCloseoutChecklist): CloseoutChecklist {
  return {
    awardId: checklist.awardId,
    items: ((checklist.items as unknown) as CloseoutItem[]) || DEFAULT_CLOSEOUT_ITEMS,
  };
}

// Get closeout checklist for an award (creates if doesn't exist)
export async function getCloseoutChecklist(awardId: string): Promise<CloseoutChecklist> {
  const portId = getPortId();

  let checklist = await prisma.demoCloseoutChecklist.findFirst({
    where: { portId, awardId },
  });

  if (!checklist) {
    checklist = await prisma.demoCloseoutChecklist.create({
      data: {
        portId,
        awardId,
        items: DEFAULT_CLOSEOUT_ITEMS as unknown as Prisma.JsonArray,
      },
    });
  }

  return toCloseoutChecklist(checklist);
}

// Update a closeout item
export async function updateCloseoutItem(
  awardId: string,
  itemId: string,
  completed: boolean
): Promise<CloseoutItem | null> {
  const portId = getPortId();

  const checklist = await getCloseoutChecklist(awardId);
  const items = [...checklist.items];
  const itemIndex = items.findIndex((i) => i.id === itemId);

  if (itemIndex === -1) return null;

  items[itemIndex] = {
    ...items[itemIndex],
    completed,
    completedDate: completed ? new Date().toISOString().split("T")[0] : undefined,
  };

  await prisma.demoCloseoutChecklist.updateMany({
    where: { portId, awardId },
    data: { items: items as unknown as Prisma.JsonArray },
  });

  return items[itemIndex];
}

// Get all closeout checklists for current port
export async function getAllCloseoutChecklists(): Promise<CloseoutChecklist[]> {
  const portId = getPortId();
  const checklists = await prisma.demoCloseoutChecklist.findMany({
    where: { portId },
  });
  return checklists.map(toCloseoutChecklist);
}