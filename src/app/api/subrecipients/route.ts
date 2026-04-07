/**
 * API Route: /api/subrecipients
 *
 * CRUD for subrecipients and their report collection tracking.
 * Compliance: 2 CFR 200.331-332 (Subrecipient monitoring)
 */

import { NextRequest, NextResponse } from "next/server";
import { setTenantConfigFromHeaders, getTenantConfig } from "@/lib/db/tenant-config";
import { prisma } from "@/lib/db/client";

function getPortId() {
  return getTenantConfig().portId;
}

// ─── Classification logic (2 CFR 200.331) ───

const CLASSIFICATION_QUESTIONS = [
  { id: "q1", text: "Does the entity determine who is eligible to receive federal assistance?", weight: 1 },
  { id: "q2", text: "Does the entity have its performance measured against program objectives?", weight: 1 },
  { id: "q3", text: "Does the entity have responsibility for programmatic decision-making?", weight: 1 },
  { id: "q4", text: "Does the entity have responsibility for adherence to applicable federal program requirements?", weight: 1 },
  { id: "q5", text: "Does the entity use federal funds to carry out a program vs. providing goods/services?", weight: 1 },
];

function computeRiskLevel(factors: Record<string, boolean>): { level: string; intensity: string } {
  let score = 0;
  if (factors.newEntity) score += 2;
  if (factors.priorFindings) score += 3;
  if (factors.highSpend) score += 1;
  if (factors.noSingleAudit) score += 2;
  if (factors.lateReporting) score += 1;

  if (score >= 5) return { level: "high", intensity: "monthly" };
  if (score >= 3) return { level: "elevated", intensity: "quarterly_plus" };
  if (score >= 1) return { level: "standard", intensity: "quarterly" };
  return { level: "low", intensity: "annual" };
}

// ─── GET ───

export async function GET(request: NextRequest) {
  try {
    setTenantConfigFromHeaders(request.headers);
    const portId = getPortId();
    const params = request.nextUrl.searchParams;
    const awardId = params.get("awardId");
    const id = params.get("id");

    if (id) {
      const sub = await prisma.demoSubrecipient.findFirst({
        where: { id, portId },
        include: { reports: { orderBy: { dueDate: "asc" } }, award: { select: { title: true, program: true } } },
      });
      if (!sub) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(sub);
    }

    const where: Record<string, unknown> = { portId };
    if (awardId) where.awardId = awardId;

    const subs = await prisma.demoSubrecipient.findMany({
      where,
      include: {
        reports: { orderBy: { dueDate: "asc" } },
        award: { select: { title: true, program: true, fain: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      subrecipients: subs,
      total: subs.length,
      questions: CLASSIFICATION_QUESTIONS,
    });
  } catch (error) {
    console.error("Subrecipients GET error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch" }, { status: 500 });
  }
}

// ─── POST: Create subrecipient with classification ───

export async function POST(request: NextRequest) {
  try {
    setTenantConfigFromHeaders(request.headers);
    const portId = getPortId();
    const body = await request.json();

    const { awardId, entityName, uei, subawardAmount, classificationAnswers, riskFactors } = body;

    if (!awardId || !entityName || subawardAmount === undefined) {
      return NextResponse.json({ error: "awardId, entityName, and subawardAmount are required" }, { status: 400 });
    }

    // Classify based on answers
    const answers = classificationAnswers || [];
    const yesCount = answers.filter((a: { answer: boolean }) => a.answer === true).length;
    const classification = yesCount >= 3 ? "subrecipient" : "contractor";

    // Compute risk
    const risk = computeRiskLevel(riskFactors || {});

    const sub = await prisma.demoSubrecipient.create({
      data: {
        portId,
        awardId,
        entityName,
        uei: uei || null,
        classification,
        classificationAnswers: answers,
        riskLevel: risk.level,
        riskFactors: riskFactors || {},
        monitoringIntensity: risk.intensity,
        subawardAmount,
        cumulativeSpend: 0,
        singleAuditRequired: subawardAmount >= 750000,
        status: "active",
      },
      include: {
        reports: true,
        award: { select: { title: true, program: true } },
      },
    });

    return NextResponse.json(sub, { status: 201 });
  } catch (error) {
    console.error("Subrecipients POST error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create" }, { status: 500 });
  }
}

// ─── PUT: Update subrecipient or add report ───

export async function PUT(request: NextRequest) {
  try {
    setTenantConfigFromHeaders(request.headers);
    const portId = getPortId();
    const body = await request.json();

    const { action } = body;

    // Add a report to track
    if (action === "addReport") {
      const { subrecipientId, reportType, title, dueDate } = body;
      if (!subrecipientId || !reportType || !title || !dueDate) {
        return NextResponse.json({ error: "subrecipientId, reportType, title, dueDate required" }, { status: 400 });
      }

      const report = await prisma.demoSubrecipientReport.create({
        data: {
          portId,
          subrecipientId,
          reportType,
          title,
          dueDate: new Date(dueDate),
          status: "pending",
        },
      });
      return NextResponse.json(report);
    }

    // Mark report received
    if (action === "markReceived") {
      const { reportId } = body;
      const report = await prisma.demoSubrecipientReport.update({
        where: { id: reportId },
        data: { status: "received", receivedDate: new Date() },
      });
      return NextResponse.json(report);
    }

    // Update cumulative spend
    if (action === "updateSpend") {
      const { subrecipientId, amount } = body;
      const sub = await prisma.demoSubrecipient.update({
        where: { id: subrecipientId },
        data: {
          cumulativeSpend: { increment: amount },
          singleAuditRequired: undefined, // will be set below
        },
      });
      // Check threshold
      const newSpend = Number(sub.cumulativeSpend);
      if (newSpend >= 750000 && !sub.singleAuditRequired) {
        await prisma.demoSubrecipient.update({
          where: { id: subrecipientId },
          data: { singleAuditRequired: true },
        });
      }
      return NextResponse.json(sub);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Subrecipients PUT error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update" }, { status: 500 });
  }
}
