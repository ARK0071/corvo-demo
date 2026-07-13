import { NextRequest, NextResponse } from "next/server";
import { withSubrecipientAuth } from "@/lib/auth/api-guard";
import { prisma } from "@/lib/db/client";

export const GET = withSubrecipientAuth(async (_request: NextRequest, { user }) => {
  const subrecipientId = user.subrecipientId!;

  const visits = await prisma.monitoringVisit.findMany({
    where: { subrecipientId },
    include: {
      scheduledBy: { select: { id: true, name: true } },
      comments: {
        include: { user: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { scheduledDate: "desc" },
  });

  return NextResponse.json({ visits });
});

// Sub confirms or requests reschedule
export const PUT = withSubrecipientAuth(async (request: NextRequest, { user }) => {
  const subrecipientId = user.subrecipientId!;
  const body = await request.json();
  const { id, action, comment } = body;

  if (!id) {
    return NextResponse.json({ error: "Visit id required" }, { status: 400 });
  }

  const visit = await prisma.monitoringVisit.findFirst({
    where: { id, subrecipientId },
  });
  if (!visit) {
    return NextResponse.json({ error: "Visit not found" }, { status: 404 });
  }

  if (action === "confirm") {
    const updated = await prisma.monitoringVisit.update({
      where: { id },
      data: {
        status: "confirmed",
        confirmedAt: new Date(),
        confirmedById: user.id,
      },
    });
    return NextResponse.json(updated);
  }

  if (action === "request_reschedule") {
    if (!comment) {
      return NextResponse.json({ error: "Comment required for reschedule request" }, { status: 400 });
    }

    // Add comment explaining reschedule request
    await prisma.subrecipientComment.create({
      data: {
        visitId: id,
        userId: user.id,
        body: `Reschedule requested: ${comment}`,
      },
    });

    const updated = await prisma.monitoringVisit.update({
      where: { id },
      data: { status: "rescheduled" },
    });

    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Invalid action. Use 'confirm' or 'request_reschedule'" }, { status: 400 });
});
