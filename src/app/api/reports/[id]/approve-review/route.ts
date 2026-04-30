import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { setTenantConfigFromHeaders, getTenantConfig } from "@/lib/db/tenant-config";
import { getCurrentUser } from "@/lib/db/tenant-config.server";
import { assertTransition } from "@/lib/reports/state-transitions";
import { audit } from "@/lib/audit/log";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: reportId } = await params;
  setTenantConfigFromHeaders(request.headers);
  const { portId } = getTenantConfig();
  const user = await getCurrentUser(request.headers);

  if (!user || user.role !== "reviewer") {
    return NextResponse.json(
      { error: "Only a reviewer can approve reports" },
      { status: 403 }
    );
  }

  try {
    const report = await prisma.demoScheduledReport.findFirst({
      where: { id: reportId, portId },
    });
    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    assertTransition(report.status, "ready_to_certify");

    if (report.drafterUserId === user.id) {
      return NextResponse.json(
        { error: "Same user cannot perform multiple roles on this report" },
        { status: 403 }
      );
    }

    await prisma.demoScheduledReport.update({
      where: { id: reportId },
      data: {
        status: "ready_to_certify",
        reviewerUserId: user.id,
        reviewedAt: new Date(),
      },
    });

    await audit(request, {
      action: "report.review.approved",
      reportId,
      metadata: { reviewerId: user.id, reviewerName: user.name },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[approve-review] Error:", error);
    if (error instanceof Error && error.message.includes("Illegal report transition")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
