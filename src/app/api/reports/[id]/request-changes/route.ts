import { NextRequest, NextResponse } from "next/server";
import { withRole } from "@/lib/auth/api-guard";
import { prisma } from "@/lib/db/client";
import { resolveSecureTenant } from "@/lib/db/tenant-config.server";
import { assertTransition } from "@/lib/reports/state-transitions";
import { audit } from "@/lib/audit/log";

export const POST = withRole(
  ["reviewer"],
  async (request, { user, params }) => {
    const reportId = params?.id;
    if (!reportId) {
      return NextResponse.json({ error: "Missing report ID" }, { status: 400 });
    }

    const { portId } = await resolveSecureTenant(request.headers);

    try {
      const body = await request.json().catch(() => ({}));
      const reviewNotes = body.notes || "";

      const report = await prisma.scheduledReport.findFirst({
        where: { id: reportId, award: { portProfile: { slug: portId } } },
      });
      if (!report) {
        return NextResponse.json({ error: "Report not found" }, { status: 404 });
      }

      assertTransition(report.status, "drafting");

      await prisma.scheduledReport.update({
        where: { id: reportId },
        data: {
          status: "drafting",
          reviewerUserId: user.id,
          reviewNotes,
        },
      });

      await audit(request, {
        action: "report.review.changes_requested",
        reportId,
        metadata: {
          reviewerId: user.id,
          reviewerName: user.name,
          notes: reviewNotes,
        },
      });

      return NextResponse.json({ ok: true });
    } catch (error) {
      console.error("[request-changes] Error:", error);
      if (error instanceof Error && error.message.includes("Illegal report transition")) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json({ error: "Failed" }, { status: 500 });
    }
  }
);
