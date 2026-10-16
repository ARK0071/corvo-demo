/**
 * Porter AI — Read Tool Implementations (Tier 0)
 *
 * All read tools are autonomous — no confirmation required.
 * Every function accesses user/tenant context via getPorterContext().
 */

// Prisma client is typed as `any` (dynamic require in client.ts).
// All query results propagate as `any`, so callback params need explicit annotation.
/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck — prisma is `any`; runtime types are enforced by Prisma schema

import { prisma } from "@/lib/db/client";
import { getPorterContext } from "@/lib/porter-context";
import { searchGrants as searchGrantsGov } from "@/lib/grants-gov";
import { searchFederalRegister } from "@/lib/federal-register";

// ---------------------------------------------------------------------------
// Pipeline & Grant Discovery
// ---------------------------------------------------------------------------

export async function getPipelineOverview(params: {
  stage?: string;
}) {
  const ctx = getPorterContext();
  if (!prisma || !ctx.portProfileId) {
    return { error: "Database not available or no port profile configured." };
  }

  const where: Record<string, unknown> = {
    portProfileId: ctx.portProfileId,
  };
  if (params.stage) {
    where.stage = params.stage;
  }

  const grants = await prisma.pipelineGrant.findMany({
    where,
    include: {
      grant: {
        select: {
          title: true,
          agency: true,
          awardCeiling: true,
          awardFloor: true,
          closeDate: true,
          status: true,
          description: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Compute stage counts
  const stageCounts: Record<string, number> = {};
  for (const g of grants) {
    stageCounts[g.stage] = (stageCounts[g.stage] || 0) + 1;
  }

  return {
    totalCount: grants.length,
    stageCounts,
    grants: grants.map((pg) => ({
      pipelineGrantId: pg.id,
      grantId: pg.grantId,
      title: pg.grant.title,
      agency: pg.grant.agency,
      stage: pg.stage,
      overallScore: pg.overallScore,
      recommendation: pg.recommendation,
      awardCeiling: pg.grant.awardCeiling?.toString(),
      closeDate: pg.grant.closeDate?.toISOString().split("T")[0],
      notes: pg.notes || undefined,
    })),
  };
}

export async function getPipelineGrant(params: { pipelineGrantId: string }) {
  const ctx = getPorterContext();
  if (!prisma || !ctx.portProfileId) {
    return { error: "Database not available." };
  }

  const pg = await prisma.pipelineGrant.findFirst({
    where: {
      id: params.pipelineGrantId,
      portProfileId: ctx.portProfileId,
    },
    include: {
      grant: true,
      tasks: {
        select: {
          id: true,
          title: true,
          status: true,
          dueDate: true,
          assigneeId: true,
          phase: true,
        },
      },
    },
  });

  if (!pg) return { error: "Pipeline grant not found." };

  return {
    pipelineGrantId: pg.id,
    grantId: pg.grantId,
    stage: pg.stage,
    title: pg.grant.title,
    agency: pg.grant.agency,
    description: pg.grant.description,
    awardCeiling: pg.grant.awardCeiling?.toString(),
    awardFloor: pg.grant.awardFloor?.toString(),
    totalFunding: pg.grant.totalFunding?.toString(),
    closeDate: pg.grant.closeDate?.toISOString().split("T")[0],
    status: pg.grant.status,
    overallScore: pg.overallScore,
    eligibilityScore: pg.eligibilityScore,
    alignmentScore: pg.alignmentScore,
    impactScore: pg.impactScore,
    competitivenessScore: pg.competitivenessScore,
    recommendation: pg.recommendation,
    eligibilityStatus: pg.eligibilityStatus,
    strengths: pg.strengths,
    concerns: pg.concerns,
    keyRequirements: pg.keyRequirements,
    notes: pg.notes || undefined,
    tasks: pg.tasks,
  };
}

export async function searchGrants(params: {
  keyword?: string;
  agency?: string;
  status?: string;
  minAward?: number;
  maxAward?: number;
  limit?: number;
}) {
  const ctx = getPorterContext();
  if (!prisma) return { error: "Database not available." };

  const where: Record<string, unknown> = {};
  if (params.keyword) {
    where.OR = [
      { title: { contains: params.keyword, mode: "insensitive" } },
      { description: { contains: params.keyword, mode: "insensitive" } },
    ];
  }
  if (params.agency) {
    where.agency = { contains: params.agency, mode: "insensitive" };
  }
  if (params.status) {
    where.status = params.status;
  }

  const grants = await prisma.discoveredGrant.findMany({
    where,
    take: params.limit ?? 20,
    orderBy: { closeDate: "asc" },
    select: {
      id: true,
      title: true,
      agency: true,
      awardCeiling: true,
      awardFloor: true,
      closeDate: true,
      status: true,
      totalFunding: true,
      costSharing: true,
    },
  });

  // Post-filter by award range (Decimal comparison)
  let filtered = grants;
  if (params.minAward) {
    filtered = filtered.filter(
      (g) => Number(g.awardCeiling) >= params.minAward!
    );
  }
  if (params.maxAward) {
    filtered = filtered.filter(
      (g) => Number(g.awardFloor) <= params.maxAward!
    );
  }

  return {
    count: filtered.length,
    grants: filtered.map((g) => ({
      grantId: g.id,
      title: g.title,
      agency: g.agency,
      awardCeiling: g.awardCeiling?.toString(),
      awardFloor: g.awardFloor?.toString(),
      totalFunding: g.totalFunding?.toString(),
      closeDate: g.closeDate?.toISOString().split("T")[0],
      status: g.status,
      costSharing: g.costSharing,
    })),
  };
}

export async function getGrantDetails(params: { grantId: string }) {
  if (!prisma) return { error: "Database not available." };

  const grant = await prisma.discoveredGrant.findUnique({
    where: { id: params.grantId },
    include: {
      grantRequirements: true,
    },
  });

  if (!grant) return { error: `Grant ${params.grantId} not found.` };

  return {
    grantId: grant.id,
    opportunityNumber: grant.opportunityNumber,
    title: grant.title,
    agency: grant.agency,
    description: grant.description,
    awardCeiling: grant.awardCeiling?.toString(),
    awardFloor: grant.awardFloor?.toString(),
    totalFunding: grant.totalFunding?.toString(),
    closeDate: grant.closeDate?.toISOString().split("T")[0],
    postDate: grant.postDate?.toISOString().split("T")[0],
    status: grant.status,
    costSharing: grant.costSharing,
    eligibility: grant.eligibility,
    fundingCategories: grant.fundingCategories,
    fundingInstruments: grant.fundingInstruments,
    alnNumbers: grant.alnNumbers,
    contactName: grant.contactName,
    contactEmail: grant.contactEmail,
    requirements: grant.grantRequirements
      ? {
          programName: grant.grantRequirements.programName,
          costShareRequired: grant.grantRequirements.costShareRequired,
          maxAward: grant.grantRequirements.maxAward?.toString(),
          applicationDeadline: grant.grantRequirements.applicationDeadline,
          selectionPriorities: grant.grantRequirements.selectionPriorities,
        }
      : null,
  };
}

// ---------------------------------------------------------------------------
// Awards & Finance
// ---------------------------------------------------------------------------

export async function listAwards(params: { keyword?: string; status?: string }) {
  const ctx = getPorterContext();
  if (!prisma || !ctx.portProfileId) {
    return { error: "Database not available." };
  }

  const where: Record<string, unknown> = {
    portProfileId: ctx.portProfileId,
  };
  if (params.status) where.status = params.status;
  if (params.keyword) {
    where.OR = [
      { title: { contains: params.keyword, mode: "insensitive" } },
      { program: { contains: params.keyword, mode: "insensitive" } },
      { fain: { contains: params.keyword, mode: "insensitive" } },
    ];
  }

  const awards = await prisma.award.findMany({
    where,
    select: {
      id: true,
      fain: true,
      program: true,
      title: true,
      awardingAgency: true,
      totalAmount: true,
      status: true,
      performancePeriodStart: true,
      performancePeriodEnd: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 25,
  });

  return {
    count: awards.length,
    awards: awards.map((a: any) => ({
      awardId: a.id,
      fain: a.fain,
      program: a.program,
      title: a.title,
      agency: a.awardingAgency,
      totalAmount: a.totalAmount?.toString(),
      status: a.status,
      periodStart: a.performancePeriodStart?.toISOString().split("T")[0],
      periodEnd: a.performancePeriodEnd?.toISOString().split("T")[0],
    })),
  };
}

export async function getAwardDetails(params: { awardId: string }) {
  const ctx = getPorterContext();
  if (!prisma || !ctx.portProfileId) {
    return { error: "Database not available." };
  }

  const award = await prisma.award.findFirst({
    where: {
      id: params.awardId,
      portProfileId: ctx.portProfileId,
    },
    include: {
      budgetCategories: true,
      matchLedger: { orderBy: { date: "desc" }, take: 10 },
      subrecipients: {
        select: {
          id: true,
          entityName: true,
          riskLevel: true,
          subawardAmount: true,
          status: true,
        },
      },
    },
  });

  if (!award) return { error: "Award not found." };

  return {
    awardId: award.id,
    fain: award.fain,
    program: award.program,
    awardingAgency: award.awardingAgency,
    totalAmount: award.totalAmount?.toString(),
    status: award.status,
    performancePeriodStart: award.performancePeriodStart?.toISOString().split("T")[0],
    performancePeriodEnd: award.performancePeriodEnd?.toISOString().split("T")[0],
    matchPercentage: award.matchPercentage,
    matchRequired: award.matchRequired?.toString(),
    matchCommitted: award.matchCommitted?.toString(),
    budgetCategories: award.budgetCategories.map((bc) => ({
      id: bc.id,
      category: bc.category,
      ceiling: bc.ceiling?.toString(),
      spent: bc.spent?.toString(),
      utilization: bc.ceiling
        ? `${Math.round((Number(bc.spent) / Number(bc.ceiling)) * 100)}%`
        : "N/A",
    })),
    recentMatchEntries: award.matchLedger.map((m) => ({
      date: m.date?.toISOString().split("T")[0],
      amount: m.amount?.toString(),
      type: m.type,
      description: m.description,
    })),
    subrecipients: award.subrecipients,
  };
}

export async function getFinancialSummary(params: { awardId: string }) {
  const ctx = getPorterContext();
  if (!prisma || !ctx.portProfileId) {
    return { error: "Database not available." };
  }

  const award = await prisma.award.findFirst({
    where: { id: params.awardId, portProfileId: ctx.portProfileId },
    include: {
      budgetCategories: true,
      matchLedger: true,
      expenses: { where: { status: { not: "flagged" } } },
      drawdownRequests: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });

  if (!award) return { error: "Award not found." };

  const totalBudget = award.budgetCategories.reduce(
    (sum, bc) => sum + Number(bc.ceiling || 0),
    0
  );
  const totalSpent = award.budgetCategories.reduce(
    (sum, bc) => sum + Number(bc.spent || 0),
    0
  );
  const totalDrawn = award.drawdownRequests
    .filter((d) => d.status === "approved" || d.status === "paid")
    .reduce((sum, d) => sum + Number(d.amount || 0), 0);
  const matchContributed = award.matchLedger.reduce(
    (sum, m) => sum + Number(m.amount || 0),
    0
  );

  const daysInPeriod =
    award.performancePeriodStart && award.performancePeriodEnd
      ? Math.ceil(
          (award.performancePeriodEnd.getTime() -
            award.performancePeriodStart.getTime()) /
            86_400_000
        )
      : null;
  const daysElapsed =
    award.performancePeriodStart
      ? Math.ceil(
          (Date.now() - award.performancePeriodStart.getTime()) / 86_400_000
        )
      : null;
  const burnRate =
    daysElapsed && daysElapsed > 0
      ? totalSpent / daysElapsed
      : null;
  const projectedTotal =
    burnRate && daysInPeriod ? burnRate * daysInPeriod : null;

  return {
    awardId: award.id,
    program: award.program,
    totalBudget: totalBudget.toFixed(2),
    totalSpent: totalSpent.toFixed(2),
    utilization: `${totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0}%`,
    totalDrawn: totalDrawn.toFixed(2),
    unbilledExpenses: (totalSpent - totalDrawn).toFixed(2),
    matchRequired: award.matchRequired?.toString() ?? "0",
    matchContributed: matchContributed.toFixed(2),
    matchGap: (Number(award.matchRequired || 0) - matchContributed).toFixed(2),
    burnRate: burnRate ? `$${burnRate.toFixed(0)}/day` : "N/A",
    projectedTotal: projectedTotal ? projectedTotal.toFixed(2) : "N/A",
    daysRemaining:
      award.performancePeriodEnd
        ? Math.max(
            0,
            Math.ceil(
              (award.performancePeriodEnd.getTime() - Date.now()) / 86_400_000
            )
          )
        : null,
    recentDrawdowns: award.drawdownRequests.map((d) => ({
      amount: d.amount?.toString(),
      status: d.status,
      createdAt: d.createdAt?.toISOString().split("T")[0],
    })),
    budgetByCategory: award.budgetCategories.map((bc) => ({
      category: bc.category,
      ceiling: bc.ceiling?.toString(),
      spent: bc.spent?.toString(),
      remaining: (Number(bc.ceiling || 0) - Number(bc.spent || 0)).toFixed(2),
    })),
  };
}

export async function getMatchSummary() {
  const ctx = getPorterContext();
  if (!prisma || !ctx.portProfileId) {
    return { error: "Database not available." };
  }

  const awards = await prisma.award.findMany({
    where: { portProfileId: ctx.portProfileId },
    select: {
      id: true,
      program: true,
      fain: true,
      totalAmount: true,
      matchPercentage: true,
      matchRequired: true,
      matchCommitted: true,
      performancePeriodEnd: true,
      status: true,
      matchLedger: { select: { amount: true } },
    },
  });

  const summary = awards.map((a: any) => {
    const contributed = a.matchLedger.reduce(
      (sum: number, m: any) => sum + Number(m.amount || 0),
      0
    );
    const required = Number(a.matchRequired || 0);
    const gap = required - contributed;
    const daysRemaining = a.performancePeriodEnd
      ? Math.max(0, Math.ceil((a.performancePeriodEnd.getTime() - Date.now()) / 86_400_000))
      : null;
    return {
      awardId: a.id,
      program: a.program,
      fain: a.fain,
      totalAmount: a.totalAmount?.toString(),
      matchPercentage: a.matchPercentage,
      matchRequired: required.toFixed(2),
      matchContributed: contributed.toFixed(2),
      matchGap: gap.toFixed(2),
      matchProgress: required > 0 ? `${Math.round((contributed / required) * 100)}%` : "N/A",
      status: a.status,
      daysRemaining,
    };
  });

  const totalRequired = summary.reduce((s: number, a: any) => s + Number(a.matchRequired), 0);
  const totalContributed = summary.reduce((s: number, a: any) => s + Number(a.matchContributed), 0);

  return {
    awards: summary,
    aggregate: {
      totalAwards: summary.length,
      totalMatchRequired: totalRequired.toFixed(2),
      totalMatchContributed: totalContributed.toFixed(2),
      totalMatchGap: (totalRequired - totalContributed).toFixed(2),
      overallProgress: totalRequired > 0
        ? `${Math.round((totalContributed / totalRequired) * 100)}%`
        : "N/A",
    },
  };
}

// ---------------------------------------------------------------------------
// Tasks & Compliance
// ---------------------------------------------------------------------------

export async function getTasks(params: {
  keyword?: string;
  awardId?: string;
  pipelineGrantId?: string;
  assigneeId?: string;
  status?: string;
  area?: string;
  overdue?: boolean;
  limit?: number;
}) {
  const ctx = getPorterContext();
  if (!prisma || !ctx.portProfileId) {
    return { error: "Database not available." };
  }

  const where: Record<string, unknown> = {
    portProfileId: ctx.portProfileId,
  };
  if (params.keyword) {
    where.OR = [
      { title: { contains: params.keyword, mode: "insensitive" } },
      { description: { contains: params.keyword, mode: "insensitive" } },
    ];
  }
  if (params.awardId) where.awardId = params.awardId;
  if (params.pipelineGrantId) where.pipelineGrantId = params.pipelineGrantId;
  if (params.assigneeId) where.assigneeId = params.assigneeId;
  if (params.status) where.status = params.status;
  if (params.area) where.area = params.area;
  if (params.overdue) {
    where.dueDate = { lt: new Date() };
    where.status = { notIn: ["done", "submitted"] };
  }

  const tasks = await prisma.task.findMany({
    where,
    take: params.limit ?? 50,
    orderBy: [{ dueDate: "asc" }, { priority: "asc" }],
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      subtasks: {
        select: { id: true, title: true, status: true, dueDate: true },
      },
    },
  });

  return {
    count: tasks.length,
    tasks: tasks.map((t) => ({
      taskId: t.id,
      title: t.title,
      description: t.description || undefined,
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate?.toISOString().split("T")[0],
      area: t.area,
      phase: t.phase,
      assignee: t.assignee
        ? { id: t.assignee.id, name: t.assignee.name }
        : null,
      subtaskCount: t.subtasks.length,
      subtasksDone: t.subtasks.filter((s) => s.status === "done").length,
      awardId: t.awardId,
      pipelineGrantId: t.pipelineGrantId,
    })),
  };
}

export async function getOverdueItems() {
  const ctx = getPorterContext();
  if (!prisma || !ctx.portProfileId) {
    return { error: "Database not available." };
  }

  const now = new Date();

  const [overdueTasks, overdueReports] = await Promise.all([
    prisma.task.findMany({
      where: {
        portProfileId: ctx.portProfileId,
        dueDate: { lt: now },
        status: { notIn: ["done", "submitted"] },
      },
      orderBy: { dueDate: "asc" },
      take: 30,
      include: {
        assignee: { select: { name: true } },
      },
    }),
    prisma.scheduledReport.findMany({
      where: {
        award: { portProfileId: ctx.portProfileId },
        dueDate: { lt: now },
        status: { in: ["draft", "not_started"] },
      },
      orderBy: { dueDate: "asc" },
      take: 20,
      include: {
        award: { select: { program: true, fain: true } },
      },
    }),
  ]);

  return {
    overdueTasks: overdueTasks.map((t) => ({
      taskId: t.id,
      title: t.title,
      dueDate: t.dueDate?.toISOString().split("T")[0],
      daysOverdue: Math.ceil(
        (now.getTime() - (t.dueDate?.getTime() ?? now.getTime())) / 86_400_000
      ),
      assignee: t.assignee?.name ?? "Unassigned",
      status: t.status,
      priority: t.priority,
      area: t.area,
    })),
    overdueReports: overdueReports.map((r) => ({
      reportId: r.id,
      reportType: r.reportType,
      dueDate: r.dueDate?.toISOString().split("T")[0],
      daysOverdue: Math.ceil(
        (now.getTime() - (r.dueDate?.getTime() ?? now.getTime())) / 86_400_000
      ),
      award: r.award?.program ?? r.award?.fain,
      status: r.status,
    })),
    summary: {
      totalOverdueTasks: overdueTasks.length,
      totalOverdueReports: overdueReports.length,
    },
  };
}

export async function getComplianceStatus(params: { awardId: string }) {
  const ctx = getPorterContext();
  if (!prisma || !ctx.portProfileId) {
    return { error: "Database not available." };
  }

  const [checklists, findings] = await Promise.all([
    prisma.complianceChecklist.findMany({
      where: { awardId: params.awardId },
      include: {
        items: true,
      },
    }),
    prisma.auditFinding.findMany({
      where: { awardId: params.awardId, status: { not: "closed" } },
      include: {
        correctiveActions: true,
      },
    }),
  ]);

  return {
    checklists: checklists.map((cl) => ({
      checklistId: cl.id,
      checklistType: cl.checklistType,
      totalItems: cl.items.length,
      completedItems: cl.items.filter((i) => i.status === "completed").length,
      completionRate: cl.items.length > 0
        ? `${Math.round(
            (cl.items.filter((i) => i.status === "completed").length /
              cl.items.length) *
              100
          )}%`
        : "N/A",
      incompleteItems: cl.items
        .filter((i) => i.status !== "completed")
        .map((i) => ({
          itemId: i.id,
          requirement: i.requirement,
          status: i.status,
          cfrReference: i.cfrReference,
        })),
    })),
    openFindings: findings.map((f) => ({
      findingId: f.id,
      complianceArea: f.complianceArea,
      description: f.description,
      severity: f.severity,
      status: f.status,
      correctiveActions: f.correctiveActions.map((ca) => ({
        action: ca.action,
        targetDate: ca.targetDate?.toISOString().split("T")[0],
        status: ca.status,
      })),
    })),
    summary: {
      totalChecklists: checklists.length,
      openFindings: findings.length,
      materialWeaknesses: findings.filter(
        (f) => f.severity === "material_weakness"
      ).length,
    },
  };
}

// ---------------------------------------------------------------------------
// Reporting & Deadlines
// ---------------------------------------------------------------------------

export async function getReportStatus(params: { awardId?: string }) {
  const ctx = getPorterContext();
  if (!prisma || !ctx.portProfileId) {
    return { error: "Database not available." };
  }

  const where: Record<string, unknown> = {
    award: { portProfileId: ctx.portProfileId },
  };
  if (params.awardId) where.awardId = params.awardId;

  const reports = await prisma.scheduledReport.findMany({
    where,
    orderBy: { dueDate: "asc" },
    take: 30,
    include: {
      award: { select: { program: true, fain: true } },
    },
  });

  const now = new Date();
  const upcoming = reports.filter(
    (r) =>
      r.dueDate &&
      r.dueDate > now &&
      r.dueDate <= new Date(now.getTime() + 90 * 86_400_000)
  );
  const overdue = reports.filter(
    (r) =>
      r.dueDate &&
      r.dueDate < now &&
      !["submitted", "approved", "certified"].includes(r.status)
  );

  return {
    upcoming: upcoming.map((r) => ({
      reportId: r.id,
      reportType: r.reportType,
      dueDate: r.dueDate?.toISOString().split("T")[0],
      daysUntilDue: Math.ceil(
        ((r.dueDate?.getTime() ?? 0) - now.getTime()) / 86_400_000
      ),
      status: r.status,
      award: r.award?.program ?? r.award?.fain,
    })),
    overdue: overdue.map((r) => ({
      reportId: r.id,
      reportType: r.reportType,
      dueDate: r.dueDate?.toISOString().split("T")[0],
      daysOverdue: Math.ceil(
        (now.getTime() - (r.dueDate?.getTime() ?? 0)) / 86_400_000
      ),
      status: r.status,
      award: r.award?.program ?? r.award?.fain,
    })),
    summary: {
      totalUpcoming: upcoming.length,
      totalOverdue: overdue.length,
    },
  };
}

export async function getDeadlineCalendar(params: { daysAhead?: number }) {
  const ctx = getPorterContext();
  if (!prisma || !ctx.portProfileId) {
    return { error: "Database not available." };
  }

  const now = new Date();
  const horizon = new Date(
    now.getTime() + (params.daysAhead ?? 60) * 86_400_000
  );

  const [taskDeadlines, reportDeadlines, grantDeadlines] = await Promise.all([
    prisma.task.findMany({
      where: {
        portProfileId: ctx.portProfileId,
        dueDate: { gte: now, lte: horizon },
        status: { notIn: ["done", "submitted"] },
      },
      orderBy: { dueDate: "asc" },
      take: 50,
      select: {
        id: true,
        title: true,
        dueDate: true,
        status: true,
        priority: true,
        area: true,
      },
    }),
    prisma.scheduledReport.findMany({
      where: {
        award: { portProfileId: ctx.portProfileId },
        dueDate: { gte: now, lte: horizon },
        status: { notIn: ["submitted", "approved", "certified"] },
      },
      orderBy: { dueDate: "asc" },
      take: 20,
      include: {
        award: { select: { program: true } },
      },
    }),
    prisma.pipelineGrant.findMany({
      where: {
        portProfileId: ctx.portProfileId,
        stage: { in: ["eligible", "drafting"] },
        grant: { closeDate: { gte: now, lte: horizon } },
      },
      orderBy: { grant: { closeDate: "asc" } },
      take: 20,
      include: {
        grant: { select: { title: true, closeDate: true } },
      },
    }),
  ]);

  const deadlines = [
    ...taskDeadlines.map((t) => ({
      type: "task" as const,
      id: t.id,
      title: t.title,
      date: t.dueDate?.toISOString().split("T")[0],
      daysUntil: Math.ceil(
        ((t.dueDate?.getTime() ?? 0) - now.getTime()) / 86_400_000
      ),
      priority: t.priority,
      detail: t.area ?? undefined,
    })),
    ...reportDeadlines.map((r) => ({
      type: "report" as const,
      id: r.id,
      title: `${r.reportType} — ${r.award?.program ?? "Award"}`,
      date: r.dueDate?.toISOString().split("T")[0],
      daysUntil: Math.ceil(
        ((r.dueDate?.getTime() ?? 0) - now.getTime()) / 86_400_000
      ),
      priority: "high" as const,
      detail: r.status,
    })),
    ...grantDeadlines.map((pg) => ({
      type: "grant_deadline" as const,
      id: pg.id,
      title: pg.grant.title,
      date: pg.grant.closeDate?.toISOString().split("T")[0],
      daysUntil: Math.ceil(
        ((pg.grant.closeDate?.getTime() ?? 0) - now.getTime()) / 86_400_000
      ),
      priority: "high" as const,
      detail: `Pipeline stage: ${pg.stage}`,
    })),
  ].sort((a, b) => (a.daysUntil ?? 999) - (b.daysUntil ?? 999));

  return {
    deadlines,
    summary: {
      totalTasks: taskDeadlines.length,
      totalReports: reportDeadlines.length,
      totalGrantDeadlines: grantDeadlines.length,
    },
  };
}

// ---------------------------------------------------------------------------
// Subrecipients & Team
// ---------------------------------------------------------------------------

export async function getSubrecipientOverview(params: { awardId: string }) {
  const ctx = getPorterContext();
  if (!prisma || !ctx.portProfileId) {
    return { error: "Database not available." };
  }

  const subs = await prisma.subrecipient.findMany({
    where: { awardId: params.awardId },
    include: {
      documents: {
        where: { status: "pending" },
        select: { id: true, title: true, category: true },
      },
      expenses: {
        where: { status: "pending" },
        select: { id: true, amount: true },
      },
      monitoringVisits: {
        orderBy: { scheduledDate: "desc" },
        take: 1,
        select: {
          id: true,
          type: true,
          scheduledDate: true,
          status: true,
          findingsSeverity: true,
        },
      },
    },
  });

  return {
    count: subs.length,
    subrecipients: subs.map((s) => ({
      id: s.id,
      entityName: s.entityName,
      uei: s.uei,
      classification: s.classification,
      riskLevel: s.riskLevel,
      monitoringIntensity: s.monitoringIntensity,
      subawardAmount: s.subawardAmount?.toString(),
      cumulativeSpend: s.cumulativeSpend?.toString(),
      status: s.status,
      pendingDocuments: s.documents.length,
      pendingExpenses: s.expenses.length,
      lastVisit: s.monitoringVisits[0]
        ? {
            type: s.monitoringVisits[0].type,
            date: s.monitoringVisits[0].scheduledDate
              ?.toISOString()
              .split("T")[0],
            status: s.monitoringVisits[0].status,
            severity: s.monitoringVisits[0].findingsSeverity,
          }
        : null,
    })),
  };
}

export async function getTeamAssignments(params: { awardId?: string }) {
  const ctx = getPorterContext();
  if (!prisma || !ctx.portProfileId) {
    return { error: "Database not available." };
  }

  const where: Record<string, unknown> = {
    portProfileId: ctx.portProfileId,
  };
  if (params.awardId) where.awardId = params.awardId;

  const assignments = await prisma.grantAssignment.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true, title: true } },
      award: { select: { program: true, fain: true } },
    },
  });

  return {
    count: assignments.length,
    assignments: assignments.map((a) => ({
      assignmentId: a.id,
      user: {
        id: a.user.id,
        name: a.user.name,
        email: a.user.email,
        title: a.user.title,
      },
      role: a.role,
      area: a.area,
      award: a.award?.program ?? a.award?.fain ?? params.awardId,
    })),
  };
}

export async function getNotifications() {
  const ctx = getPorterContext();
  if (!prisma) return { error: "Database not available." };

  const notifications = await prisma.notification.findMany({
    where: { userId: ctx.userId, read: false },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return {
    unreadCount: notifications.length,
    notifications: notifications.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      createdAt: n.createdAt?.toISOString(),
    })),
  };
}

// ---------------------------------------------------------------------------
// Grant Scoring (explain existing pipeline scores)
// ---------------------------------------------------------------------------

export async function explainGrantScore(params: { grantId: string }) {
  const ctx = getPorterContext();
  if (!prisma || !ctx.portProfileId) {
    return { error: "Database not available." };
  }

  const pg = await prisma.pipelineGrant.findFirst({
    where: {
      grantId: params.grantId,
      portProfileId: ctx.portProfileId,
    },
    include: {
      grant: {
        select: { title: true, agency: true, closeDate: true, awardCeiling: true },
      },
    },
  });

  if (!pg) {
    return {
      error: `Grant ${params.grantId} is not in your pipeline. Add it first to see scoring.`,
    };
  }

  const daysRemaining = pg.grant.closeDate
    ? Math.ceil(
        (pg.grant.closeDate.getTime() - Date.now()) / 86_400_000
      )
    : null;

  return {
    grantId: pg.grantId,
    title: pg.grant.title,
    agency: pg.grant.agency,
    overallScore: pg.overallScore,
    eligibilityScore: pg.eligibilityScore,
    eligibilityStatus: pg.eligibilityStatus,
    alignmentScore: pg.alignmentScore,
    impactScore: pg.impactScore,
    competitivenessScore: pg.competitivenessScore,
    recommendation: pg.recommendation,
    strengths: pg.strengths,
    concerns: pg.concerns,
    keyRequirements: pg.keyRequirements,
    awardCeiling: pg.grant.awardCeiling?.toString(),
    closeDate: pg.grant.closeDate?.toISOString().split("T")[0],
    daysRemaining,
  };
}

export async function compareGrants(params: {
  grantIdA: string;
  grantIdB: string;
}) {
  const [a, b] = await Promise.all([
    getGrantDetails({ grantId: params.grantIdA }),
    getGrantDetails({ grantId: params.grantIdB }),
  ]);

  if ("error" in a || "error" in b) {
    return { error: `Could not find one or both grants.`, detailA: a, detailB: b };
  }

  // Also fetch pipeline scores if available
  const [scoreA, scoreB] = await Promise.all([
    explainGrantScore({ grantId: params.grantIdA }),
    explainGrantScore({ grantId: params.grantIdB }),
  ]);

  return {
    grantA: {
      ...a,
      score: "error" in scoreA ? null : scoreA,
    },
    grantB: {
      ...b,
      score: "error" in scoreB ? null : scoreB,
    },
  };
}

export async function financialScenarioAnalysis(params: {
  grantId: string;
  projectBudget?: number;
}) {
  const grant = await getGrantDetails({ grantId: params.grantId });
  if ("error" in grant) return grant;

  const awardAmount = Number(grant.awardCeiling || 0);
  const matchRate = grant.costSharing ? 0.2 : 0;
  const localMatch = awardAmount * matchRate;
  const netCost = localMatch;

  // Bond alternative (20-year, 5% blended rate)
  const bondPrincipal = params.projectBudget ?? awardAmount;
  const monthlyRate = 0.05 / 12;
  const months = 240;
  const monthlyPayment =
    (bondPrincipal * monthlyRate * Math.pow(1 + monthlyRate, months)) /
    (Math.pow(1 + monthlyRate, months) - 1);
  const totalBondCost = monthlyPayment * months;

  return {
    grantScenario: {
      federalShare: awardAmount.toFixed(2),
      localMatch: localMatch.toFixed(2),
      matchRate: `${matchRate * 100}%`,
      netCostToPort: netCost.toFixed(2),
    },
    bondAlternative: {
      principal: bondPrincipal.toFixed(2),
      interestRate: "5.00%",
      termYears: 20,
      monthlyPayment: monthlyPayment.toFixed(2),
      totalCost: totalBondCost.toFixed(2),
      totalInterest: (totalBondCost - bondPrincipal).toFixed(2),
    },
    comparison: {
      grantSavings: (totalBondCost - netCost).toFixed(2),
      savingsPercentage: `${Math.round(
        ((totalBondCost - netCost) / totalBondCost) * 100
      )}%`,
    },
  };
}

// ---------------------------------------------------------------------------
// Team Members
// ---------------------------------------------------------------------------

export async function listTeamMembers(params: { keyword?: string }) {
  const ctx = getPorterContext();
  if (!prisma || !ctx.portProfileId) {
    return { error: "Database not available." };
  }

  // Get portId from the port profile to find users
  const profile = await prisma.portProfile.findUnique({
    where: { id: ctx.portProfileId },
    select: { portId: true },
  });
  if (!profile) return { error: "Port profile not found." };

  const where: Record<string, unknown> = {
    portId: profile.portId,
    active: true,
    subrecipientId: null, // exclude subrecipient users
  };
  if (params.keyword) {
    where.OR = [
      { name: { contains: params.keyword, mode: "insensitive" } },
      { email: { contains: params.keyword, mode: "insensitive" } },
      { title: { contains: params.keyword, mode: "insensitive" } },
    ];
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      title: true,
      role: true,
    },
    orderBy: { name: "asc" },
    take: 50,
  });

  return {
    count: users.length,
    members: users.map((u: any) => ({
      userId: u.id,
      name: u.name,
      email: u.email,
      title: u.title,
      role: u.role,
    })),
  };
}

// ---------------------------------------------------------------------------
// Live Grant Discovery (Grants.gov + Federal Register)
// ---------------------------------------------------------------------------

export async function searchFederalGrants(params: {
  keyword: string;
  agency?: string;
  limit?: number;
}) {
  try {
    const [govResults, frResults] = await Promise.allSettled([
      searchGrantsGov({
        keyword: params.keyword,
        agency: params.agency,
        oppStatuses: ["posted", "forecasted"],
        rows: params.limit ?? 15,
      }),
      searchFederalRegister({
        query: params.keyword,
        document_type: "NOTICE",
        per_page: params.limit ?? 10,
      }),
    ]);

    const grants: Array<{
      id: string;
      title: string;
      agency: string;
      awardCeiling: string;
      closeDate: string | null;
      status: string;
      source: string;
    }> = [];
    const seenIds = new Set<string>();

    // Grants.gov results
    if (govResults.status === "fulfilled") {
      for (const g of govResults.value.grants) {
        if (!seenIds.has(g.id)) {
          seenIds.add(g.id);
          grants.push({
            id: g.id,
            title: g.title,
            agency: g.agency,
            awardCeiling: g.awardCeiling?.toString() ?? "0",
            closeDate: g.closeDate ?? null,
            status: g.status,
            source: "grants.gov",
          });
        }
      }
    }

    // Federal Register results
    if (frResults.status === "fulfilled") {
      for (const g of frResults.value) {
        if (!seenIds.has(g.id)) {
          seenIds.add(g.id);
          grants.push({
            id: g.id,
            title: g.title,
            agency: g.agency,
            awardCeiling: g.awardCeiling?.toString() ?? "0",
            closeDate: g.closeDate ?? null,
            status: g.status,
            source: "federal_register",
          });
        }
      }
    }

    return {
      count: grants.length,
      grants: grants.slice(0, params.limit ?? 20),
      sources: {
        grantsGov: govResults.status === "fulfilled" ? govResults.value.grants.length : 0,
        federalRegister: frResults.status === "fulfilled" ? frResults.value.length : 0,
      },
    };
  } catch (error) {
    return { error: `Search failed: ${error instanceof Error ? error.message : "Unknown error"}` };
  }
}

export async function searchStateLocalGrants(params: {
  keyword?: string;
}) {
  const ctx = getPorterContext();
  if (!prisma || !ctx.portProfileId) {
    return { error: "Database not available." };
  }

  // Search the database for previously discovered state/local grants
  const where: Record<string, unknown> = {
    portProfileId: ctx.portProfileId,
  };
  if (params.keyword) {
    where.OR = [
      { title: { contains: params.keyword, mode: "insensitive" } },
      { description: { contains: params.keyword, mode: "insensitive" } },
      { agency: { contains: params.keyword, mode: "insensitive" } },
    ];
  }

  const grants = await prisma.stateLocalGrant.findMany({
    where,
    orderBy: { searchedAt: "desc" },
    take: 25,
    select: {
      id: true,
      title: true,
      agency: true,
      description: true,
      awardCeiling: true,
      awardFloor: true,
      closeDate: true,
      status: true,
      applicationUrl: true,
      source: true,
      searchedAt: true,
    },
  });

  if (grants.length === 0) {
    return {
      count: 0,
      grants: [],
      message: "No state/local grants found in the database. Use the Discover page to run a fresh web search for state and local opportunities.",
    };
  }

  return {
    count: grants.length,
    grants: grants.map((g: any) => ({
      grantId: g.id,
      title: g.title,
      agency: g.agency,
      description: g.description?.slice(0, 200) ?? "",
      awardCeiling: g.awardCeiling?.toString(),
      awardFloor: g.awardFloor?.toString(),
      closeDate: g.closeDate?.toISOString().split("T")[0] ?? null,
      status: g.status,
      applicationUrl: g.applicationUrl,
      source: g.source,
      lastSearched: g.searchedAt?.toISOString().split("T")[0],
    })),
  };
}
