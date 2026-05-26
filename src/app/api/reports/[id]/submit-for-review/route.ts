import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api-guard";
import { prisma } from "@/lib/db/client";
import { resolveSecureTenant } from "@/lib/db/tenant-config.server";
import { assertTransition } from "@/lib/reports/state-transitions";
import { audit } from "@/lib/audit/log";

export const POST = withAuth(async (request, { user, params }) => {
  const reportId = params?.id;
  if (!reportId) {
    return NextResponse.json({ error: "Missing report ID" }, { status: 400 });
  }

  const { portId } = await resolveSecureTenant(request.headers);

  try {
    const report = await prisma.scheduledReport.findFirst({
      where: { id: reportId, award: { portProfile: { slug: portId } } },
    });
    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const fromStatus = report.status === "upcoming" ? "drafting" : report.status;
    try {
      assertTransition(fromStatus, "pending_review");
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Invalid transition" },
        { status: 400 }
      );
    }

    await prisma.scheduledReport.update({
      where: { id: reportId },
      data: {
        status: "pending_review",
        drafterUserId: user.id,
      },
    });

    await audit(request, {
      action: "report.submitted_for_review",
      reportId,
      metadata: { drafterId: user.id, drafterName: user.name },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[submit-for-review] Error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
});
