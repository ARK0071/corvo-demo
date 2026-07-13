import { NextRequest, NextResponse } from "next/server";
import { withSubrecipientAuth } from "@/lib/auth/api-guard";
import { prisma } from "@/lib/db/client";
import { z } from "zod";

const createDocSchema = z.object({
  awardId: z.string().uuid(),
  reportId: z.string().uuid().optional(),
  category: z.enum([
    "single_audit",
    "financial_report",
    "performance_report",
    "certification",
    "corrective_action",
    "other",
  ]),
  title: z.string().min(1),
  description: z.string().default(""),
});

export const GET = withSubrecipientAuth(async (request: NextRequest, { user }) => {
  const subrecipientId = user.subrecipientId!;
  const params = request.nextUrl.searchParams;
  const status = params.get("status");
  const category = params.get("category");

  const where: Record<string, unknown> = { subrecipientId };
  if (status) where.status = status;
  if (category) where.category = category;

  const documents = await prisma.subrecipientDocument.findMany({
    where,
    include: {
      report: { select: { id: true, title: true, reportType: true, dueDate: true } },
      uploadedBy: { select: { id: true, name: true } },
      reviewedBy: { select: { id: true, name: true } },
      comments: {
        include: { user: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Also fetch required reports so the sub can see what's needed
  const requiredReports = await prisma.subrecipientReport.findMany({
    where: { subrecipientId, status: "pending" },
    orderBy: { dueDate: "asc" },
  });

  return NextResponse.json({ documents, requiredReports });
});

export const POST = withSubrecipientAuth(async (request: NextRequest, { user }) => {
  const subrecipientId = user.subrecipientId!;
  const body = await request.json();
  const parsed = createDocSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // Verify the award belongs to this subrecipient
  const sub = await prisma.subrecipient.findFirst({
    where: { id: subrecipientId, awardId: parsed.data.awardId },
  });
  if (!sub) {
    return NextResponse.json({ error: "Award not linked to your subrecipient" }, { status: 403 });
  }

  const document = await prisma.subrecipientDocument.create({
    data: {
      subrecipientId,
      awardId: parsed.data.awardId,
      reportId: parsed.data.reportId || null,
      category: parsed.data.category,
      title: parsed.data.title,
      description: parsed.data.description,
      status: "uploaded",
      uploadedById: user.id,
    },
    include: {
      report: { select: { id: true, title: true } },
    },
  });

  return NextResponse.json(document, { status: 201 });
});

export const PUT = withSubrecipientAuth(async (request: NextRequest, { user }) => {
  const subrecipientId = user.subrecipientId!;
  const body = await request.json();
  const { id, title, description } = body;

  if (!id) {
    return NextResponse.json({ error: "Document id required" }, { status: 400 });
  }

  const doc = await prisma.subrecipientDocument.findFirst({
    where: { id, subrecipientId },
  });
  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // Only allow re-upload/edit if rejected or uploaded
  if (!["uploaded", "rejected"].includes(doc.status)) {
    return NextResponse.json(
      { error: "Cannot edit document in current status" },
      { status: 400 }
    );
  }

  const updated = await prisma.subrecipientDocument.update({
    where: { id },
    data: {
      title: title || doc.title,
      description: description ?? doc.description,
      status: "uploaded", // reset to uploaded on re-submission
      reviewNotes: null,
      reviewedById: null,
      reviewedAt: null,
    },
  });

  return NextResponse.json(updated);
});
