import { NextRequest, NextResponse } from "next/server";
import { withRole } from "@/lib/auth/api-guard";
import { prisma } from "@/lib/db/client";
import { resolveSecureTenant } from "@/lib/db/tenant-config.server";
import { assertTransition } from "@/lib/reports/state-transitions";
import { canonicalJSONStringify } from "@/lib/reports/canonical-json";
import { audit } from "@/lib/audit/log";
import { createHash } from "crypto";

export const POST = withRole(
  ["certifying_official"],
  async (request, { user, params }) => {
    const reportId = params?.id;
    if (!reportId) {
      return NextResponse.json({ error: "Missing report ID" }, { status: 400 });
    }

    const { portId } = await resolveSecureTenant(request.headers);

    try {
      const body = await request.json().catch(() => ({}));
      const attestationText = body.attestationText || "";
      const certifierPhone = body.phone || "";

      const report = await prisma.scheduledReport.findFirst({
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

      await prisma.scheduledReport.update({
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
);
