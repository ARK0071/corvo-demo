import { NextRequest, NextResponse } from "next/server";
import { withSubrecipientAuth } from "@/lib/auth/api-guard";
import { prisma } from "@/lib/db/client";

export const GET = withSubrecipientAuth(async (_request: NextRequest, { user }) => {
  const subrecipientId = user.subrecipientId!;

  const [subrecipient, pendingDocs, recentExpenses, upcomingVisits] = await Promise.all([
    prisma.subrecipient.findUnique({
      where: { id: subrecipientId },
      include: {
        award: {
          select: {
            id: true,
            title: true,
            program: true,
            fain: true,
            totalAmount: true,
            performancePeriodStart: true,
            performancePeriodEnd: true,
          },
        },
        reports: {
          where: {
            OR: [
              { status: "pending" },
              { dueDate: { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } },
            ],
          },
          orderBy: { dueDate: "asc" },
          take: 10,
        },
      },
    }),

    prisma.subrecipientDocument.findMany({
      where: { subrecipientId, status: { in: ["rejected", "uploaded"] } },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { id: true, title: true, status: true, reviewNotes: true, updatedAt: true },
    }),

    prisma.subrecipientExpense.findMany({
      where: { subrecipientId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, description: true, amount: true, status: true, category: true, createdAt: true },
    }),

    prisma.monitoringVisit.findMany({
      where: {
        subrecipientId,
        status: { in: ["proposed", "confirmed"] },
        scheduledDate: { gte: new Date() },
      },
      orderBy: { scheduledDate: "asc" },
      take: 5,
      select: { id: true, type: true, scheduledDate: true, status: true, location: true, agenda: true },
    }),
  ]);

  if (!subrecipient) {
    return NextResponse.json({ error: "Subrecipient not found" }, { status: 404 });
  }

  // Compute stats
  const now = new Date();
  const overdueReports = subrecipient.reports.filter(
    (r: { status: string; dueDate: Date }) => r.status === "pending" && new Date(r.dueDate) < now
  ).length;

  const upcomingDeadlines = subrecipient.reports.filter(
    (r: { status: string; dueDate: Date }) => r.status === "pending" && new Date(r.dueDate) >= now
  );

  return NextResponse.json({
    subrecipient: {
      id: subrecipient.id,
      entityName: subrecipient.entityName,
      uei: subrecipient.uei,
      classification: subrecipient.classification,
      riskLevel: subrecipient.riskLevel,
      monitoringIntensity: subrecipient.monitoringIntensity,
      subawardAmount: subrecipient.subawardAmount,
      cumulativeSpend: subrecipient.cumulativeSpend,
      singleAuditRequired: subrecipient.singleAuditRequired,
      expenseReportingMode: subrecipient.expenseReportingMode,
      status: subrecipient.status,
    },
    award: subrecipient.award,
    stats: {
      overdueReports,
      upcomingDeadlines: upcomingDeadlines.length,
      pendingActionItems: pendingDocs.filter((d: { status: string }) => d.status === "rejected").length,
      remainingBalance: Number(subrecipient.subawardAmount) - Number(subrecipient.cumulativeSpend),
      singleAuditThresholdPct: Number(subrecipient.cumulativeSpend) / 750000,
    },
    upcomingDeadlines,
    pendingDocs,
    recentExpenses,
    upcomingVisits,
  });
});
