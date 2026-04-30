import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { setTenantConfigFromHeaders, getTenantConfig } from "@/lib/db/tenant-config";
import { getCurrentUser } from "@/lib/db/tenant-config.server";
import { assertTransition } from "@/lib/reports/state-transitions";
import { canonicalJSONStringify } from "@/lib/reports/canonical-json";
import { audit } from "@/lib/audit/log";
import { createHash } from "crypto";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: reportId } = await params;
  setTenantConfigFromHeaders(request.headers);
  const { portId } = getTenantConfig();
  const user = await getCurrentUser(request.headers);

  if (!user || user.role !== "certifying_official") {
    return NextResponse.json(
      { error: "Only a certifying official can certify reports" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const attestationText = body.attestationText || "";
    const certifierPhone = body.phone || user.phone || "";

    const report = await prisma.demoScheduledReport.findFirst({
      where: { id: reportId, portId },
    });
    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    try {
      assertTransition(report.status, "certified");
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Invalid transition" },
        { status: 400 }
      );
    }

    if (report.drafterUserId === user.id || report.reviewerUserId === user.id) {
      return NextResponse.json(
        { error: "Same user cannot perform multiple roles on this report" },
        { status: 403 }
      );
    }

    const content = report.generatedContent || {};
    const canonical = canonicalJSONStringify(content);
    const contentHash = createHash("sha256").update(canonical).digest("hex");

    const cert = await prisma.reportCertification.create({
      data: {
        portId,
        reportId,
        certifierUserId: user.id,
        certifierName: user.name,
        certifierTitle: user.title,
        certifierEmail: user.email,
        certifierPhone,
        contentHash,
        attestationText,
        ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0] ?? null,
      },
    });

    await prisma.demoScheduledReport.update({
      where: { id: reportId },
      data: {
        status: "certified",
        certificationId: cert.id,
        contentLockedAt: new Date(),
      },
    });

    await audit(request, {
      action: "report.certified",
      reportId,
      metadata: { contentHash, certificationId: cert.id },
    });

    return NextResponse.json({
      certification: {
        id: cert.id,
        certifierName: cert.certifierName,
        certifierTitle: cert.certifierTitle,
        contentHash,
        certifiedAt: cert.certifiedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("[certify] Error:", error);
    return NextResponse.json({ error: "Failed to certify report" }, { status: 500 });
  }
}
