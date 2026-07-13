import { NextRequest, NextResponse } from "next/server";
import { withRole } from "@/lib/auth/api-guard";
import { prisma } from "@/lib/db/client";
import { resolveSecureTenant } from "@/lib/db/tenant-config.server";

// Prime-side expense review
export const GET = withRole(
  ["admin", "moderator", "reviewer", "certifying_official", "drafter"],
  async (request: NextRequest) => {
    await resolveSecureTenant(request.headers);
    const params = request.nextUrl.searchParams;
    const status = params.get("status") || "submitted";
    const subrecipientId = params.get("subrecipientId");

    const where: Record<string, unknown> = { status };
    if (subrecipientId) where.subrecipientId = subrecipientId;

    const expenses = await prisma.subrecipientExpense.findMany({
      where,
      include: {
        subrecipient: { select: { entityName: true, subawardAmount: true, cumulativeSpend: true } },
        award: { select: { title: true, fain: true } },
        createdBy: { select: { name: true } },
        reviewedBy: { select: { name: true } },
        comments: {
          include: { user: { select: { id: true, name: true, role: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { submittedAt: "desc" },
    });

    return NextResponse.json({ expenses });
  }
);

export const PUT = withRole(
  ["admin", "moderator", "reviewer", "certifying_official"],
  async (request: NextRequest, { user }) => {
    await resolveSecureTenant(request.headers);
    const body = await request.json();
    const { id, action, reviewNotes } = body;

    if (!id || !action) {
      return NextResponse.json({ error: "id and action required" }, { status: 400 });
    }

    const expense = await prisma.subrecipientExpense.findUnique({
      where: { id },
      include: { subrecipient: true },
    });
    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    if (action === "approve") {
      const updated = await prisma.subrecipientExpense.update({
        where: { id },
        data: {
          status: "approved",
          reviewNotes: reviewNotes || null,
          reviewedById: user.id,
          reviewedAt: new Date(),
        },
      });

      // Increment cumulative spend on the subrecipient
      const sub = await prisma.subrecipient.update({
        where: { id: expense.subrecipientId },
        data: {
          cumulativeSpend: { increment: Number(expense.amount) },
        },
      });

      // Check Single Audit threshold
      if (Number(sub.cumulativeSpend) >= 750000 && !sub.singleAuditRequired) {
        await prisma.subrecipient.update({
          where: { id: expense.subrecipientId },
          data: { singleAuditRequired: true },
        });
      }

      return NextResponse.json(updated);
    }

    if (action === "reject") {
      if (!reviewNotes) {
        return NextResponse.json({ error: "reviewNotes required for rejection" }, { status: 400 });
      }

      const updated = await prisma.subrecipientExpense.update({
        where: { id },
        data: {
          status: "rejected",
          reviewNotes,
          reviewedById: user.id,
          reviewedAt: new Date(),
        },
      });

      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: "Invalid action. Use 'approve' or 'reject'" }, { status: 400 });
  }
);
