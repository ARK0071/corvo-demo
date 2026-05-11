import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { resolveSecureTenant } from "@/lib/db/tenant-config.server";
import { renderSF425 } from "@/lib/pdf/render";
import type { SF425Values } from "@/lib/pdf/render";
import { computeIndirectCost } from "@/lib/reports/indirect-cost";

function fmtMoney(n: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: reportId } = await params;
  const { portId } = await resolveSecureTenant(request.headers);

  try {
    const report = await prisma.scheduledReport.findFirst({
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

    const profile = await prisma.portProfile.findFirst({
      where: { portId },
    });

    let cert = null;
    if (report.certificationId) {
      cert = await prisma.reportCertification.findUnique({
        where: { id: report.certificationId },
      });
    }

    const expenses: { status: string; amount: unknown; date: Date; categoryId?: string }[] = award.expenses;
    const drawdowns: { status: string; totalAmount: unknown }[] = award.drawdownRequests;
    const matchLedger: { amount: unknown }[] = award.matchLedger;

    const totalExpenses = expenses
      .filter((e) => e.status !== "flagged")
      .reduce((s, e) => s + Number(e.amount), 0);

    const totalDrawn = drawdowns
      .filter((d) => d.status === "approved" || d.status === "submitted")
      .reduce((s, d) => s + Number(d.totalAmount), 0);

    const totalAuthorized = Number(award.totalAmount);
    const cashOnHand = totalDrawn - totalExpenses;
    const federalShare = totalExpenses;
    const unobligated = totalAuthorized - federalShare;

    const matchPct = award.matchPercentage;
    const matchRequired =
      matchPct > 0 ? totalAuthorized * (matchPct / (100 - matchPct)) : 0;
    const matchCommitted = matchLedger.reduce(
      (s, e) => s + Number(e.amount),
      0,
    );
    const matchRemaining = Math.max(0, matchRequired - matchCommitted);

    const periodStart = fmtDate(report.periodStart);
    const periodEnd = fmtDate(report.periodEnd);

    // Build category name lookup for MTDC-aware indirect cost computation
    const categoryNameById: Record<string, string> = {};
    for (const cat of award.budgetCategories) {
      categoryNameById[(cat as { id: string }).id] = (cat as { name: string }).name;
    }
    const expensesForIC = expenses.map((e: { date: Date; amount: unknown; status: string; categoryId?: string }) => ({
      date: fmtDate(e.date),
      amount: Number(e.amount),
      status: e.status,
      categoryName: e.categoryId ? categoryNameById[e.categoryId] : undefined,
    }));

    const indirectCost = computeIndirectCost(
      {
        indirectCostRate: award.indirectCostRate ? Number(award.indirectCostRate) : null,
        indirectCostBase: award.indirectCostBase,
        indirectCostType: award.indirectCostType,
        indirectCostPeriodStart: award.indirectCostPeriodStart,
        indirectCostPeriodEnd: award.indirectCostPeriodEnd,
      },
      expensesForIC,
      periodStart,
      periodEnd,
    );

    // Fall back to 10% de minimis if no NICRA-based indirect cost
    const icType = indirectCost?.type || "De Minimis";
    const icRate = indirectCost ? indirectCost.rate * 100 : 10;
    const icBase = indirectCost?.base ?? totalExpenses;
    const icAmount = indirectCost?.federalShare ?? Math.round(totalExpenses * 0.1);
    const icPeriodFrom = indirectCost?.periodStart || periodStart;
    const icPeriodTo = indirectCost?.periodEnd || periodEnd;

    // Build address from port profile location data
    const loc = (profile?.locationData ?? profile?.location ?? {}) as Record<string, string>;
    const street = loc.street || loc.address || "";
    const cityState = [loc.city, loc.state, loc.zip].filter(Boolean).join(", ");

    const values: SF425Values = {
      federalAgency: award.awardingAgency,
      fain: award.fain,
      recipientOrg: profile?.name || "Port Organization",
      recipientStreet1: street,
      recipientCityState: cityState,
      recipientUei: profile?.uei || "",
      recipientEin: profile?.ein || "",

      reportType: "Quarterly",
      basis: "Cash",

      projectPeriodFrom: fmtDate(award.performancePeriodStart),
      projectPeriodTo: fmtDate(award.performancePeriodEnd),
      reportPeriodStart: periodStart,
      reportPeriodEnd: periodEnd,

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
      line10l: fmtMoney(0),
      line10m: fmtMoney(0),
      line10n: fmtMoney(0),
      line10o: fmtMoney(0),

      line11a_type: icType,
      line11a_rate: `${icRate}%`,
      line11a_periodFrom: icPeriodFrom,
      line11a_periodTo: icPeriodTo,
      line11a_period: "",
      line11a_base: fmtMoney(icBase),
      line11a_amount: fmtMoney(icAmount),
      line11a_fedShare: fmtMoney(icAmount),
      line11_total: fmtMoney(icAmount),
      line11_totalBase: fmtMoney(icBase),
      line11_totalFedShare: fmtMoney(icAmount),

      line12: "",

      certifierName: cert?.certifierName || "",
      certifierTitle: cert?.certifierTitle || "",
      certifierPhone: cert?.certifierPhone || "",
      certifierEmail: cert?.certifierEmail || "",
      certifiedDate: cert ? fmtDate(cert.certifiedAt) : "",
    };

    const pdfBytes = await renderSF425(values);

    const filename = `SF-425_${award.fain}_${periodStart}_${periodEnd}.pdf`;

    return new NextResponse(Buffer.from(pdfBytes), {
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
