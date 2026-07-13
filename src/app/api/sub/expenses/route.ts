import { NextRequest, NextResponse } from "next/server";
import { withSubrecipientAuth } from "@/lib/auth/api-guard";
import { prisma } from "@/lib/db/client";
import { z } from "zod";

const expenseSchema = z.object({
  awardId: z.string().uuid(),
  category: z.enum([
    "personnel",
    "fringe",
    "travel",
    "equipment",
    "supplies",
    "contractual",
    "construction",
    "other",
    "indirect",
  ]),
  description: z.string().min(1),
  amount: z.number().positive(),
  expenseDate: z.string().optional(),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
});

export const GET = withSubrecipientAuth(async (request: NextRequest, { user }) => {
  const subrecipientId = user.subrecipientId!;
  const params = request.nextUrl.searchParams;
  const status = params.get("status");

  const where: Record<string, unknown> = { subrecipientId };
  if (status) where.status = status;

  const expenses = await prisma.subrecipientExpense.findMany({
    where,
    include: {
      comments: {
        include: { user: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: "asc" },
      },
      reviewedBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Get subrecipient for reporting mode
  const sub = await prisma.subrecipient.findUnique({
    where: { id: subrecipientId },
    select: { expenseReportingMode: true, subawardAmount: true, cumulativeSpend: true },
  });

  // Summary by category
  const approvedExpenses = expenses.filter(
    (e: { status: string }) => e.status === "approved"
  );
  const categoryTotals = approvedExpenses.reduce(
    (acc: Record<string, number>, e: { category: string; amount: unknown }) => {
      acc[e.category] = (acc[e.category] || 0) + Number(e.amount);
      return acc;
    },
    {} as Record<string, number>
  );

  return NextResponse.json({
    expenses,
    reportingMode: sub?.expenseReportingMode || "line_item",
    subawardAmount: sub?.subawardAmount,
    cumulativeSpend: sub?.cumulativeSpend,
    categoryTotals,
  });
});

export const POST = withSubrecipientAuth(async (request: NextRequest, { user }) => {
  const subrecipientId = user.subrecipientId!;
  const body = await request.json();
  const parsed = expenseSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // Verify award belongs to this subrecipient
  const sub = await prisma.subrecipient.findFirst({
    where: { id: subrecipientId, awardId: parsed.data.awardId },
  });
  if (!sub) {
    return NextResponse.json({ error: "Award not linked to your subrecipient" }, { status: 403 });
  }

  const expense = await prisma.subrecipientExpense.create({
    data: {
      subrecipientId,
      awardId: parsed.data.awardId,
      reportingMode: sub.expenseReportingMode,
      category: parsed.data.category,
      description: parsed.data.description,
      amount: parsed.data.amount,
      expenseDate: parsed.data.expenseDate ? new Date(parsed.data.expenseDate) : null,
      periodStart: parsed.data.periodStart ? new Date(parsed.data.periodStart) : null,
      periodEnd: parsed.data.periodEnd ? new Date(parsed.data.periodEnd) : null,
      status: "draft",
      createdById: user.id,
    },
  });

  return NextResponse.json(expense, { status: 201 });
});

// Batch submit draft expenses
export const PUT = withSubrecipientAuth(async (request: NextRequest, { user }) => {
  const subrecipientId = user.subrecipientId!;
  const body = await request.json();
  const { action, expenseIds, id, description, amount, category } = body;

  if (action === "submit") {
    if (!expenseIds?.length) {
      return NextResponse.json({ error: "expenseIds required" }, { status: 400 });
    }

    const result = await prisma.subrecipientExpense.updateMany({
      where: {
        id: { in: expenseIds },
        subrecipientId,
        status: "draft",
      },
      data: {
        status: "submitted",
        submittedAt: new Date(),
      },
    });

    return NextResponse.json({ submitted: result.count });
  }

  if (action === "update") {
    if (!id) {
      return NextResponse.json({ error: "Expense id required" }, { status: 400 });
    }

    const expense = await prisma.subrecipientExpense.findFirst({
      where: { id, subrecipientId, status: "draft" },
    });
    if (!expense) {
      return NextResponse.json({ error: "Draft expense not found" }, { status: 404 });
    }

    const updated = await prisma.subrecipientExpense.update({
      where: { id },
      data: {
        ...(description && { description }),
        ...(amount && { amount }),
        ...(category && { category }),
      },
    });

    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
});

export const DELETE = withSubrecipientAuth(async (request: NextRequest, { user }) => {
  const subrecipientId = user.subrecipientId!;
  const { id } = await request.json();

  if (!id) {
    return NextResponse.json({ error: "Expense id required" }, { status: 400 });
  }

  const expense = await prisma.subrecipientExpense.findFirst({
    where: { id, subrecipientId, status: "draft" },
  });
  if (!expense) {
    return NextResponse.json({ error: "Can only delete draft expenses" }, { status: 400 });
  }

  await prisma.subrecipientExpense.delete({ where: { id } });
  return NextResponse.json({ success: true });
});
