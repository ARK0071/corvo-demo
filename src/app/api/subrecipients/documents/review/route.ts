import { NextRequest, NextResponse } from "next/server";
import { withRole } from "@/lib/auth/api-guard";
import { prisma } from "@/lib/db/client";
import { resolveSecureTenant } from "@/lib/db/tenant-config.server";

// Prime-side document review
export const GET = withRole(
  ["admin", "moderator", "reviewer", "certifying_official", "drafter"],
  async (request: NextRequest) => {
    await resolveSecureTenant(request.headers);
    const params = request.nextUrl.searchParams;
    const status = params.get("status") || "uploaded";
    const subrecipientId = params.get("subrecipientId");

    const where: Record<string, unknown> = { status };
    if (subrecipientId) where.subrecipientId = subrecipientId;

    const documents = await prisma.subrecipientDocument.findMany({
      where,
      include: {
        subrecipient: { select: { entityName: true } },
        award: { select: { title: true, fain: true } },
        uploadedBy: { select: { name: true } },
        report: { select: { title: true, reportType: true, dueDate: true } },
        comments: {
          include: { user: { select: { id: true, name: true, role: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ documents });
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

    const doc = await prisma.subrecipientDocument.findUnique({ where: { id } });
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    if (action === "accept") {
      const updated = await prisma.subrecipientDocument.update({
        where: { id },
        data: {
          status: "accepted",
          reviewNotes: reviewNotes || null,
          reviewedById: user.id,
          reviewedAt: new Date(),
        },
      });

      // If linked to a SubrecipientReport, mark it received
      if (doc.reportId) {
        await prisma.subrecipientReport.update({
          where: { id: doc.reportId },
          data: { status: "received", receivedDate: new Date() },
        }).catch(() => {});
      }

      return NextResponse.json(updated);
    }

    if (action === "reject") {
      if (!reviewNotes) {
        return NextResponse.json({ error: "reviewNotes required for rejection" }, { status: 400 });
      }

      const updated = await prisma.subrecipientDocument.update({
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

    return NextResponse.json({ error: "Invalid action. Use 'accept' or 'reject'" }, { status: 400 });
  }
);
