import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { setTenantConfigFromHeaders, getTenantConfig } from "@/lib/db/tenant-config";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: reportId } = await params;
  setTenantConfigFromHeaders(request.headers);
  const { portId } = getTenantConfig();

  try {
    const report = await prisma.demoScheduledReport.findFirst({
      where: { id: reportId, portId },
    });
    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }
    if (!report.contentLockedAt) {
      return NextResponse.json({ error: "Report is not locked" }, { status: 400 });
    }

    const snapshot = report.generatedContent as Record<string, unknown> || {};

    return NextResponse.json({
      snapshot,
      lockedAt: report.contentLockedAt.toISOString(),
      certificationId: report.certificationId,
    });
  } catch (error) {
    console.error("[diff] Error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
