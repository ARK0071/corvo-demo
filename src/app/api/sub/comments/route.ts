import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api-guard";
import { prisma } from "@/lib/db/client";

// Comments are shared between prime and sub users
export const POST = withAuth(async (request: NextRequest, { user }) => {
  const body = await request.json();
  const { documentId, expenseId, visitId, body: commentBody } = body;

  if (!commentBody) {
    return NextResponse.json({ error: "Comment body required" }, { status: 400 });
  }

  if (!documentId && !expenseId && !visitId) {
    return NextResponse.json(
      { error: "One of documentId, expenseId, or visitId is required" },
      { status: 400 }
    );
  }

  // If subrecipient user, verify they own the resource
  if (user.role === "subrecipient" && user.subrecipientId) {
    if (documentId) {
      const doc = await prisma.subrecipientDocument.findFirst({
        where: { id: documentId, subrecipientId: user.subrecipientId },
      });
      if (!doc) return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    if (expenseId) {
      const exp = await prisma.subrecipientExpense.findFirst({
        where: { id: expenseId, subrecipientId: user.subrecipientId },
      });
      if (!exp) return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    if (visitId) {
      const visit = await prisma.monitoringVisit.findFirst({
        where: { id: visitId, subrecipientId: user.subrecipientId },
      });
      if (!visit) return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
  }

  const comment = await prisma.subrecipientComment.create({
    data: {
      documentId: documentId || null,
      expenseId: expenseId || null,
      visitId: visitId || null,
      userId: user.id,
      body: commentBody,
    },
    include: {
      user: { select: { id: true, name: true, role: true } },
    },
  });

  return NextResponse.json(comment, { status: 201 });
});
