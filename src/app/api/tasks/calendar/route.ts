import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api-guard";
import { resolvePortProfileId } from "@/lib/db/tenant-config.server";
import * as Tasks from "@/lib/db/repositories/tasks";
import { prisma } from "@/lib/db/client";
import { ScheduledReport } from "@/generated/prisma";

// GET /api/tasks/calendar?startDate=&endDate=
// Master calendar: aggregates ALL dates across the application
export const GET = withAuth(async (request) => {
  const portProfileId = await resolvePortProfileId(request.headers);
  if (!portProfileId) {
    return NextResponse.json({ error: "Port profile not found" }, { status: 404 });
  }

  const params = request.nextUrl.searchParams;
  const startDate = params.get("startDate");
  const endDate = params.get("endDate");

  if (!startDate || !endDate) {
    return NextResponse.json({ error: "startDate and endDate required" }, { status: 400 });
  }

  const rangeStart = new Date(startDate);
  const rangeEnd = new Date(endDate);

  // Run all queries in parallel
  const [
    tasks,
    reports,
    grantDeadlines,
    awards,
    subrecipientReports,
    correctiveActions,
    projects,
    overdue,
  ] = await Promise.all([
    // 1. Tasks with due dates OR start dates in range
    Tasks.getTasksByDueDate(portProfileId, startDate, endDate),

    // 2. Scheduled federal reports
    prisma.scheduledReport.findMany({
      where: {
        award: { portProfileId },
        dueDate: { gte: rangeStart, lte: rangeEnd },
      },
      include: {
        award: { select: { id: true, title: true, program: true } },
      },
      orderBy: { dueDate: "asc" },
    }),

    // 3. Pipeline grant close dates
    prisma.pipelineGrant.findMany({
      where: {
        portProfileId,
        grant: {
          closeDate: { gte: rangeStart, lte: rangeEnd },
        },
      },
      include: {
        grant: {
          select: { title: true, agency: true, closeDate: true, id: true },
        },
      },
    }),

    // 4. Award performance periods (start or end in range)
    prisma.award.findMany({
      where: {
        portProfileId,
        OR: [
          { performancePeriodStart: { gte: rangeStart, lte: rangeEnd } },
          { performancePeriodEnd: { gte: rangeStart, lte: rangeEnd } },
        ],
      },
      select: {
        id: true,
        title: true,
        program: true,
        performancePeriodStart: true,
        performancePeriodEnd: true,
      },
    }),

    // 5. Subrecipient report due dates
    prisma.subrecipientReport.findMany({
      where: {
        subrecipient: { award: { portProfileId } },
        dueDate: { gte: rangeStart, lte: rangeEnd },
      },
      include: {
        subrecipient: {
          select: {
            name: true,
            award: { select: { title: true } },
          },
        },
      },
      orderBy: { dueDate: "asc" },
    }),

    // 6. Corrective action plan target dates
    prisma.correctiveActionPlan.findMany({
      where: {
        finding: { audit: { award: { portProfileId } } },
        targetDate: { gte: rangeStart, lte: rangeEnd },
        status: { not: "completed" },
      },
      include: {
        finding: {
          select: {
            title: true,
            audit: { select: { award: { select: { title: true } } } },
          },
        },
      },
      orderBy: { targetDate: "asc" },
    }),

    // 7. Projects with start/end in range
    prisma.project.findMany({
      where: {
        portProfileId,
        OR: [
          { startDate: { gte: rangeStart, lte: rangeEnd } },
          { endDate: { gte: rangeStart, lte: rangeEnd } },
        ],
      },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
      },
    }),

    // Overdue tasks
    Tasks.getOverdueTasks(portProfileId),
  ]);

  // Format federal reports
  type ReportWithAward = ScheduledReport & { award: { id: string; title: string; program: string } };
  const federalReports = reports.map((r: ReportWithAward) => ({
    id: r.id,
    type: "federal_report" as const,
    title: r.title,
    reportType: r.type,
    dueDate: r.dueDate.toISOString().split("T")[0],
    status: r.status,
    awardId: r.awardId,
    awardTitle: r.award.title,
    awardProgram: r.award.program,
    periodStart: r.periodStart.toISOString().split("T")[0],
    periodEnd: r.periodEnd.toISOString().split("T")[0],
  }));

  // Format grant deadlines
  type GrantDeadlineRow = (typeof grantDeadlines)[number];
  const grantDeadlineItems = grantDeadlines
    .filter((pg: GrantDeadlineRow) => pg.grant?.closeDate)
    .map((pg: GrantDeadlineRow) => ({
      id: `grant-${pg.id}`,
      type: "grant_deadline" as const,
      title: `Application Deadline: ${pg.grant.title}`,
      date: pg.grant.closeDate!.toISOString().split("T")[0],
      agency: pg.grant.agency,
      grantId: pg.grant.id,
      stage: pg.stage,
    }));

  // Format award period milestones
  const awardMilestones: Array<{
    id: string;
    type: "award_milestone";
    title: string;
    date: string;
    awardId: string;
    program: string;
    milestoneType: "period_start" | "period_end";
  }> = [];
  for (const a of awards) {
    const pStart = a.performancePeriodStart.toISOString().split("T")[0];
    const pEnd = a.performancePeriodEnd.toISOString().split("T")[0];
    if (pStart >= startDate && pStart <= endDate) {
      awardMilestones.push({
        id: `award-start-${a.id}`,
        type: "award_milestone",
        title: `Performance Period Start: ${a.title}`,
        date: pStart,
        awardId: a.id,
        program: a.program,
        milestoneType: "period_start",
      });
    }
    if (pEnd >= startDate && pEnd <= endDate) {
      awardMilestones.push({
        id: `award-end-${a.id}`,
        type: "award_milestone",
        title: `Performance Period End: ${a.title}`,
        date: pEnd,
        awardId: a.id,
        program: a.program,
        milestoneType: "period_end",
      });
    }
  }

  // Format subrecipient report deadlines
  type SubrecipientRow = (typeof subrecipientReports)[number];
  const subrecipientItems = subrecipientReports.map((sr: SubrecipientRow) => ({
    id: `subrec-${sr.id}`,
    type: "subrecipient_report" as const,
    title: `${sr.title} (${sr.subrecipient.name})`,
    date: sr.dueDate.toISOString().split("T")[0],
    status: sr.status,
    subrecipientName: sr.subrecipient.name,
    awardTitle: sr.subrecipient.award.title,
  }));

  // Format corrective action deadlines
  type CorrectiveActionRow = (typeof correctiveActions)[number];
  const correctiveActionItems = correctiveActions.map((ca: CorrectiveActionRow) => ({
    id: `cap-${ca.id}`,
    type: "corrective_action" as const,
    title: `CAP: ${ca.action}`,
    date: ca.targetDate.toISOString().split("T")[0],
    status: ca.status,
    responsible: ca.responsible,
    findingTitle: ca.finding.title,
    awardTitle: ca.finding.audit?.award?.title || "",
  }));

  // Format project milestones
  const projectMilestones: Array<{
    id: string;
    type: "project_milestone";
    title: string;
    date: string;
    projectName: string;
    milestoneType: "start" | "end";
  }> = [];
  for (const p of projects) {
    if (p.startDate) {
      const d = p.startDate.toISOString().split("T")[0];
      if (d >= startDate && d <= endDate) {
        projectMilestones.push({
          id: `proj-start-${p.id}`,
          type: "project_milestone",
          title: `Project Start: ${p.name}`,
          date: d,
          projectName: p.name,
          milestoneType: "start",
        });
      }
    }
    if (p.endDate) {
      const d = p.endDate.toISOString().split("T")[0];
      if (d >= startDate && d <= endDate) {
        projectMilestones.push({
          id: `proj-end-${p.id}`,
          type: "project_milestone",
          title: `Project End: ${p.name}`,
          date: d,
          projectName: p.name,
          milestoneType: "end",
        });
      }
    }
  }

  return NextResponse.json({
    tasks,
    federalReports,
    grantDeadlines: grantDeadlineItems,
    awardMilestones,
    subrecipientReports: subrecipientItems,
    correctiveActions: correctiveActionItems,
    projectMilestones,
    overdue,
  });
});
