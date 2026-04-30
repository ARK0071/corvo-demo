import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { setTenantConfigFromHeaders, getTenantConfig } from "@/lib/db/tenant-config";
import { renderSF425 } from "@/lib/pdf/render";
import type { SF425Values } from "@/lib/pdf/render";

function fmtMoney(n: number): string {
  return (
    "$" +
    n.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: reportId } = await params;
  setTenantConfigFromHeaders(request.headers);
  const { portId } = getTenantConfig();

  try {
    const report = await prisma.demoScheduledReport.findFirst({
      where: { id: reportId, portId },
      include: {
        award: {
          include: {
            expenses: true,
            drawdownRequests: true,
            matchLedger: true,
            budgetCategories: true,
          },
        },
      },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const award = report.award;

    const profile = await prisma.demoPortProfile.findFirst({
      where: { portId },
    });

    let cert = null;
    if (report.certificationId) {
      cert = await prisma.reportCertification.findUnique({
        where: { id: report.certificationId },
      });
    }

    // Compute financial values
    const totalExpenses = award.expenses
      .filter((e) => e.status !== "flagged")
      .reduce((s, e) => s + Number(e.amount), 0);

    const periodExpenses = award.expenses
      .filter((e) => {
        const d = e.date.toISOString().slice(0, 10);
        return (
          d >= report.periodStart.toISOString().slice(0, 10) &&
          d <= report.periodEnd.toISOString().slice(0, 10) &&
          e.status !== "flagged"
        );
      })
      .reduce((s, e) => s + Number(e.amount), 0);

    const totalDrawn = award.drawdownRequests
      .filter((d) => d.status === "approved" || d.status === "submitted")
      .reduce((s, d) => s + Number(d.totalAmount), 0);

    const totalAuthorized = Number(award.totalAmount);
    const cashOnHand = totalDrawn - totalExpenses;
    const federalShare = totalExpenses;
    const unobligated = totalAuthorized - federalShare;

    const matchPct = award.matchPercentage;
    const matchRequired =
      matchPct > 0 ? totalAuthorized * (matchPct / (100 - matchPct)) : 0;
    const matchCommitted = award.matchLedger.reduce(
      (s, e) => s + Number(e.amount),
      0,
    );
    const matchRemaining = Math.max(0, matchRequired - matchCommitted);

    const icRate = award.indirectCostRate
      ? Number(award.indirectCostRate)
      : 0;
    const icType = award.indirectCostType || "";
    let icBaseAmount = 0;
    if (icRate > 0) {
      icBaseAmount = totalExpenses;
    }
    const icAmount = icBaseAmount * (icRate / 100);

    const periodStart = report.periodStart.toISOString().slice(0, 10);
    const periodEnd = report.periodEnd.toISOString().slice(0, 10);

    const values: SF425Values = {
      federalAgency: award.awardingAgency,
      recipientOrg: profile?.name || "Port Organization",
      recipientUei: profile?.uei || "",
      fain: award.fain,
      recipientEin: profile?.ein || "",
      reportPeriodStart: periodStart,
      reportPeriodEnd: periodEnd,
      reportType: "Quarterly",
      basis: "Cash",

      line10a: fmtMoney(totalDrawn),
      line10b: fmtMoney(totalExpenses),
      line10c: fmtMoney(cashOnHand),
      line10d: fmtMoney(totalAuthorized),
      line10e: fmtMoney(federalShare),
      line10f: fmtMoney(0),
      line10g: fmtMoney(federalShare),
      line10h: fmtMoney(unobligated),
      line10i: fmtMoney(matchRequired),
      line10j: fmtMoney(matchCommitted),
      line10k: fmtMoney(matchRemaining),

      line11a_rate: icRate > 0 ? `${icRate}%` : "",
      line11a_base: icRate > 0 ? fmtMoney(icBaseAmount) : "",
      line11a_amount: icRate > 0 ? fmtMoney(icAmount) : "",
      line11a_type: icType,
      line11a_period:
        award.indirectCostPeriodStart && award.indirectCostPeriodEnd
          ? `${award.indirectCostPeriodStart.toISOString().slice(0, 10)} to ${award.indirectCostPeriodEnd.toISOString().slice(0, 10)}`
          : "",
      line11_total: icRate > 0 ? fmtMoney(icAmount) : "$0.00",

      line12: "",

      certifierName: cert?.certifierName || "",
      certifierTitle: cert?.certifierTitle || "",
      certifierPhone: cert?.certifierPhone || "",
      certifierEmail: cert?.certifierEmail || "",
      certifiedDate: cert?.certifiedAt.toISOString().slice(0, 10) || "",

      certificationFooter: cert
        ? `Certified by ${cert.certifierName}, ${cert.certifierTitle}, on ${cert.certifiedAt.toISOString().slice(0, 10)} · Hash ${cert.contentHash.slice(0, 8)}`
        : undefined,
    };

    const pdfBytes = await renderSF425(values);

    const filename = `SF-425_${award.fain}_${periodStart}_${periodEnd}.pdf`;

    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Content-Length": String(pdfBytes.length),
      },
    });
  } catch (error) {
    console.error("[pdf] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 },
    );
  }
}
