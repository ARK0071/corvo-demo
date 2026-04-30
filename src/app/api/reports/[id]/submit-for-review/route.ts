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

  if (!user) {
    return NextResponse.json({ error: "User required" }, { status: 401 });
  }

  try {
    const report = await prisma.demoScheduledReport.findFirst({
      where: { id: reportId, portId },
    });
    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Allow transition from "upcoming" too (auto-starts drafting)
    const fromStatus = report.status === "upcoming" ? "drafting" : report.status;
    try {
      assertTransition(fromStatus, "pending_review");
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Invalid transition" },
        { status: 400 }
      );
    }

    await prisma.demoScheduledReport.update({
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
}
