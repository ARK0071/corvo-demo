import { prisma } from "../client";
import { ScheduledReport as PrismaScheduledReport, CloseoutChecklist as PrismaCloseoutChecklist, Prisma } from "@/generated/prisma";
import { parseDateRequired } from "../date-utils";
import { getTenantConfig } from "../tenant-config";
import type {
  ScheduledReport,
  ReportStatus,
  ReportType,
  CloseoutChecklist,
  CloseoutItem,
  ReportContent,
} from "@/data/reporting";

// ─── Port Resolution ───

const profileIdCache = new Map<string, string>();

async function getPortProfileId(): Promise<string> {
  const portId = getTenantConfig().portId;
  const cached = profileIdCache.get(portId);
  if (cached) return cached;

  const profile = await prisma.portProfile.findFirst({
    where: { slug: portId },
    select: { id: true },
  });
  if (!profile) throw new Error(`No PortProfile found for slug: ${portId}`);
  profileIdCache.set(portId, profile.id);
  return profile.id;
}

// ─── Scheduled Reports ───

// Convert Prisma model to application type
function toScheduledReport(report: PrismaScheduledReport & { award: { title: string; program: string } }): ScheduledReport {
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
    narrativeDraft: report.narrativeDraft ?? undefined,
    drafterUserId: report.drafterUserId ?? undefined,
    reviewerUserId: report.reviewerUserId ?? undefined,
    reviewedAt: report.reviewedAt?.toISOString() ?? undefined,
    reviewNotes: report.reviewNotes ?? undefined,
    certificationId: report.certificationId ?? undefined,
    contentLockedAt: report.contentLockedAt?.toISOString() ?? undefined,
  };
}

// Get all scheduled reports
export async function getAllReports(): Promise<ScheduledReport[]> {
  await autoSeedIfEmpty();
  const portProfileId = await getPortProfileId();
  const reports = await prisma.scheduledReport.findMany({
    where: { award: { portProfileId } },
    include: { award: { select: { title: true, program: true } } },
    orderBy: { dueDate: "asc" },
  });
  return reports.map(toScheduledReport);
}

// Get reports for a specific award
export async function getReportsForAward(awardId: string): Promise<ScheduledReport[]> {
  const portProfileId = await getPortProfileId();
  const reports = await prisma.scheduledReport.findMany({
    where: { awardId, award: { portProfileId } },
    include: { award: { select: { title: true, program: true } } },
    orderBy: { dueDate: "asc" },
  });
  return reports.map(toScheduledReport);
}

// Get upcoming reports within N days
export async function getUpcomingReports(days: number = 90): Promise<ScheduledReport[]> {
  const portProfileId = await getPortProfileId();
  const now = new Date();
  const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const reports = await prisma.scheduledReport.findMany({
    where: {
      award: { portProfileId },
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
  const portProfileId = await getPortProfileId();
  const today = new Date();

  const reports = await prisma.scheduledReport.findMany({
    where: {
      award: { portProfileId },
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
  const portProfileId = await getPortProfileId();
  const report = await prisma.scheduledReport.findFirst({
    where: { id, award: { portProfileId } },
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
  const report = await prisma.scheduledReport.create({
    data: {
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
  const portProfileId = await getPortProfileId();
  const existing = await prisma.scheduledReport.findFirst({
    where: { id: reportId, award: { portProfileId } },
  });
  if (!existing) return null;

  const report = await prisma.scheduledReport.update({
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
  const portProfileId = await getPortProfileId();
  const existing = await prisma.scheduledReport.findFirst({
    where: { id: reportId, award: { portProfileId } },
  });
  if (!existing) return null;

  const report = await prisma.scheduledReport.update({
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
  let created = 0;
  let updated = 0;

  for (const input of reports) {
    const periodStartDate = parseDateRequired(input.periodStart, "periodStart");
    const existing = await prisma.scheduledReport.findFirst({
      where: {
        awardId: input.awardId,
        type: input.type,
        periodStart: periodStartDate,
      },
    });

    if (existing) {
      await prisma.scheduledReport.update({
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
      await prisma.scheduledReport.create({
        data: {
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
  const portProfileId = await getPortProfileId();
  const today = new Date();
  const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

  const portFilter = { award: { portProfileId } };

  const [total, upcoming, overdue, submitted, dueNext30] = await Promise.all([
    prisma.scheduledReport.count({ where: portFilter }),
    prisma.scheduledReport.count({
      where: { ...portFilter, status: { not: "submitted" }, dueDate: { gte: today } },
    }),
    prisma.scheduledReport.count({
      where: { ...portFilter, status: { not: "submitted" }, dueDate: { lt: today } },
    }),
    prisma.scheduledReport.count({ where: { ...portFilter, status: "submitted" } }),
    prisma.scheduledReport.count({
      where: {
        ...portFilter,
        status: { not: "submitted" },
        dueDate: { gte: today, lte: thirtyDaysFromNow },
      },
    }),
  ]);

  const nextDue = await prisma.scheduledReport.findFirst({
    where: { ...portFilter, status: { not: "submitted" }, dueDate: { gte: today } },
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
function toCloseoutChecklist(checklist: PrismaCloseoutChecklist): CloseoutChecklist {
  return {
    awardId: checklist.awardId,
    items: ((checklist.items as unknown) as CloseoutItem[]) || DEFAULT_CLOSEOUT_ITEMS,
  };
}

// Get closeout checklist for an award (creates if doesn't exist)
export async function getCloseoutChecklist(awardId: string): Promise<CloseoutChecklist> {
  const portProfileId = await getPortProfileId();
  const award = await prisma.award.findFirst({
    where: { id: awardId, portProfileId },
    select: { id: true },
  });
  if (!award) throw new Error(`Award ${awardId} not found for current port`);

  let checklist = await prisma.closeoutChecklist.findUnique({
    where: { awardId },
  });

  if (!checklist) {
    checklist = await prisma.closeoutChecklist.create({
      data: {
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
  const checklist = await getCloseoutChecklist(awardId);
  const items = [...checklist.items];
  const itemIndex = items.findIndex((i) => i.id === itemId);

  if (itemIndex === -1) return null;

  items[itemIndex] = {
    ...items[itemIndex],
    completed,
    completedDate: completed ? new Date().toISOString().split("T")[0] : undefined,
  };

  await prisma.closeoutChecklist.update({
    where: { awardId },
    data: { items: items as unknown as Prisma.JsonArray },
  });

  return items[itemIndex];
}

// Get all closeout checklists
export async function getAllCloseoutChecklists(): Promise<CloseoutChecklist[]> {
  const portProfileId = await getPortProfileId();
  const checklists = await prisma.closeoutChecklist.findMany({
    where: { award: { portProfileId } },
  });
  return checklists.map(toCloseoutChecklist);
}

// ─── Report Generation for New Awards ───

function generateQuarterlyDates(
  start: Date,
  end: Date
): { periodStart: Date; periodEnd: Date; dueDate: Date }[] {
  const dates: { periodStart: Date; periodEnd: Date; dueDate: Date }[] = [];
  const quarterEnds = [
    { month: 2, day: 31 }, // Q1: Jan-Mar
    { month: 5, day: 30 }, // Q2: Apr-Jun
    { month: 8, day: 30 }, // Q3: Jul-Sep
    { month: 11, day: 31 }, // Q4: Oct-Dec
  ];

  for (let year = start.getFullYear(); year <= end.getFullYear(); year++) {
    for (const q of quarterEnds) {
      const periodEnd = new Date(year, q.month, q.day);
      const periodStart = new Date(year, q.month - 2, 1);
      const dueDate = new Date(year, q.month + 1, 30); // ~30 days after quarter end

      if (periodEnd < start || periodStart > end) continue;

      dates.push({ periodStart, periodEnd, dueDate });
    }
  }

  return dates;
}

/**
 * Generate compliance reports (SF-425 + Progress) for a newly created award.
 * Called automatically when an award is created via the API.
 */
export async function generateReportsForAward(awardId: string): Promise<number> {
  const award = await prisma.award.findUnique({
    where: { id: awardId },
    select: {
      id: true,
      title: true,
      program: true,
      cfda: true,
      status: true,
      performancePeriodStart: true,
      performancePeriodEnd: true,
    },
  });
  if (!award) return 0;

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const quarterlyDates = generateQuarterlyDates(
    award.performancePeriodStart,
    award.performancePeriodEnd
  );

  const reportsToCreate: Prisma.ScheduledReportCreateManyInput[] = [];

  // SF-425 Federal Financial Reports (quarterly)
  for (const qd of quarterlyDates) {
    const isPast = qd.dueDate.toISOString().split("T")[0] < todayStr;
    reportsToCreate.push({
      awardId: award.id,
      type: "sf425",
      title: "SF-425 Federal Financial Report",
      dueDate: qd.dueDate,
      periodStart: qd.periodStart,
      periodEnd: qd.periodEnd,
      status: isPast ? "submitted" : "upcoming",
      submittedDate: isPast ? qd.dueDate : null,
      notes: "",
    });
  }

  // Progress Reports (quarterly for PIDP, semi-annual otherwise)
  const isQuarterly = award.program === "PIDP";
  const progressDates = isQuarterly
    ? quarterlyDates
    : quarterlyDates.filter((_, i) => i % 2 === 1);

  for (const pd of progressDates) {
    const isPast = pd.dueDate.toISOString().split("T")[0] < todayStr;
    reportsToCreate.push({
      awardId: award.id,
      type: "progress",
      title: `${isQuarterly ? "Quarterly" : "Semi-Annual"} Progress Report`,
      dueDate: pd.dueDate,
      periodStart: pd.periodStart,
      periodEnd: pd.periodEnd,
      status: isPast ? "submitted" : "upcoming",
      submittedDate: isPast ? pd.dueDate : null,
      notes: "",
    });
  }

  // Closeout report if applicable
  if (award.status === "closeout_pending" || award.status === "closed") {
    const closeoutDue = new Date(
      award.performancePeriodEnd.getTime() + 120 * 24 * 60 * 60 * 1000
    );
    reportsToCreate.push({
      awardId: award.id,
      type: "closeout",
      title: "Final Closeout Report",
      dueDate: closeoutDue,
      periodStart: award.performancePeriodStart,
      periodEnd: award.performancePeriodEnd,
      status: award.status === "closed" ? "submitted" : "in_progress",
      notes: "Complete all closeout checklist items before submission.",
    });
  }

  if (reportsToCreate.length === 0) return 0;

  const result = await prisma.scheduledReport.createMany({
    data: reportsToCreate,
    skipDuplicates: true,
  });

  return result.count;
}

// ─── Auto-Seed ───

export async function autoSeedIfEmpty(): Promise<void> {
  const portProfileId = await getPortProfileId();

  const existingCount = await prisma.scheduledReport.count({
    where: { award: { portProfileId } },
  });
  if (existingCount > 0) return;

  const awards = await prisma.award.findMany({
    where: { portProfileId },
    select: { id: true, performancePeriodStart: true, performancePeriodEnd: true, title: true },
  });
  if (awards.length === 0) return;

  for (const award of awards) {
    const start = award.performancePeriodStart;
    const end = award.performancePeriodEnd;

    await prisma.scheduledReport.createMany({
      data: [
        {
          awardId: award.id,
          type: "sf425",
          title: `SF-425 - ${award.title}`,
          dueDate: new Date(end.getTime() + 90 * 24 * 60 * 60 * 1000),
          periodStart: start,
          periodEnd: end,
          status: "upcoming",
          notes: "",
        },
        {
          awardId: award.id,
          type: "progress",
          title: `Progress Report - ${award.title}`,
          dueDate: new Date(end.getTime() + 90 * 24 * 60 * 60 * 1000),
          periodStart: start,
          periodEnd: end,
          status: "upcoming",
          notes: "",
        },
      ],
      skipDuplicates: true,
    });
  }
}