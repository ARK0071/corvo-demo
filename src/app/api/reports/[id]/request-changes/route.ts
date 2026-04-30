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
      { error: "Only a reviewer can request changes" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const reviewNotes = body.notes || "";

    const report = await prisma.demoScheduledReport.findFirst({
      where: { id: reportId, portId },
    });
    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    assertTransition(report.status, "drafting");

    await prisma.demoScheduledReport.update({
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
