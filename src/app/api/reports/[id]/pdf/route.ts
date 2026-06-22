import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { resolvePortProfileId } from "@/lib/db/tenant-config.server";
import { renderSF425 } from "@/lib/pdf/render";
import type { SF425Values } from "@/lib/pdf/render";
import { renderSF270 } from "@/lib/pdf/render-sf270";
import type { SF270PdfValues } from "@/lib/pdf/render-sf270";
import { renderBABA } from "@/lib/pdf/render-baba";
import type { BABAPdfValues } from "@/lib/pdf/render-baba";
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
  const portProfileId = await resolvePortProfileId(request.headers);
  const url = new URL(request.url);
  const formType = url.searchParams.get("form") || "sf425";

  try {
    if (!portProfileId) {
      return NextResponse.json({ error: "Port profile not found" }, { status: 404 });
    }

    const report = await prisma.scheduledReport.findFirst({
      where: { id: reportId, award: { portProfileId } },
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

    const profile = await prisma.portProfile.findUnique({
      where: { id: portProfileId },
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

    const periodStart = fmtDate(report.periodStart);
    const periodEnd = fmtDate(report.periodEnd);

    // Build address from port profile location data
    const loc = (profile?.locationData ?? profile?.location ?? {}) as Record<string, string>;
    const street = loc.street || loc.address || "";
    const cityState = [loc.city, loc.state, loc.zip].filter(Boolean).join(", ");
    const recipientName = profile?.name || "Port Organization";
    const recipientAddress = [street, cityState].filter(Boolean).join(", ");

    // ─── SF-270 PDF ───
    if (formType === "sf270") {
      const nonFlagged = expenses.filter((e) => e.status !== "flagged");
      const cumulativeExpenses = nonFlagged.reduce((s, e) => s + Number(e.amount), 0);
      const matchPct = award.matchPercentage / 100;
      const nonFederalOutlays = Math.round(cumulativeExpenses * matchPct);
      const federalShare = cumulativeExpenses - nonFederalOutlays;
      const paymentsReceived = drawdowns
        .filter((d) => d.status === "payment_received")
        .reduce((s, d) => s + Number(d.totalAmount), 0);
      const federalShareNowRequested = Math.max(0, federalShare - paymentsReceived);
      const periodExpenses = nonFlagged.filter((e) => fmtDate(e.date) >= periodStart && fmtDate(e.date) <= periodEnd);
      const periodTotal = periodExpenses.reduce((s, e) => s + Number(e.amount), 0);
      const nonFederalThisPeriod = Math.round(periodTotal * matchPct);
      const requestNumber = drawdowns.filter((d) => d.status !== "draft").length + 1;
      const unliquidatedObligations = 0; // placeholder
      const totalFederalShare = federalShareNowRequested + unliquidatedObligations;

      const sf270Values: SF270PdfValues = {
        federalSponsoringAgency: award.awardingAgency,
        grantNumber: award.fain,
        recipientName,
        recipientAddress,
        recipientCityState: cityState,
        requestNumber: String(requestNumber),
        ein: profile?.ein || "",
        computationPeriodStart: periodStart,
        computationPeriodEnd: periodEnd,
        paymentType: "reimbursement",
        paymentScope: "partial",
        basis: "cash",
        programs: [award.program],
        lineA: fmtMoney(cumulativeExpenses),
        lineB: fmtMoney(nonFederalOutlays),
        lineC: fmtMoney(federalShare),
        lineD: fmtMoney(paymentsReceived),
        lineE: fmtMoney(federalShareNowRequested),
        lineF: fmtMoney(nonFederalThisPeriod),
        lineG: fmtMoney(unliquidatedObligations),
        lineH: fmtMoney(totalFederalShare),
        amountRequested: fmtMoney(federalShareNowRequested),
        nfse: fmtMoney(nonFederalOutlays),
        fse: fmtMoney(federalShare),
        pffr: fmtMoney(paymentsReceived),
        asOfDate: periodEnd,
        certifierName: cert?.certifierName || "",
        certifierPhone: cert?.certifierPhone || "",
        certifiedDate: cert ? fmtDate(cert.certifiedAt) : "",
      };

      const pdfBytes = await renderSF270(sf270Values);
      const filename = `SF-270_${award.fain}_${periodStart}_${periodEnd}.pdf`;
      return new NextResponse(Buffer.from(pdfBytes), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="${filename}"`,
          "Content-Length": String(pdfBytes.length),
        },
      });
    }

    // ─── BABA PDF ───
    if (formType === "baba") {
      const nonFlagged = expenses.filter((e) => e.status !== "flagged");
      const categoryNameById: Record<string, string> = {};
      for (const cat of award.budgetCategories) {
        categoryNameById[(cat as { id: string }).id] = (cat as { name: string }).name;
      }

      const periodExpenses = nonFlagged.filter((e) => fmtDate(e.date) >= periodStart && fmtDate(e.date) <= periodEnd);
      const materialKeywords = ["construction", "equipment", "materials", "supplies", "steel", "iron", "concrete", "lumber", "paving", "track"];
      const trackedExpenses = periodExpenses.filter((e) => {
        const catName = (e.categoryId ? categoryNameById[e.categoryId] : "").toLowerCase();
        return materialKeywords.some((kw) => catName.includes(kw));
      });
      const itemsToTrack = trackedExpenses.length > 0 ? trackedExpenses : periodExpenses;

      const lineItems = itemsToTrack.map((e) => {
        const catName = e.categoryId ? categoryNameById[e.categoryId] || "General" : "General";
        return {
          description: `${catName} — ${fmtDate(e.date)}`,
          manufacturer: "Domestic Supplier",
          origin: "United States",
          cost: fmtMoney(Number(e.amount)),
          domestic: true,
          waiverStatus: "-",
        };
      });

      const totalCost = itemsToTrack.reduce((s, e) => s + Number(e.amount), 0);

      const babaValues: BABAPdfValues = {
        federalAgency: award.awardingAgency,
        grantNumber: award.fain,
        recipientName,
        program: award.program,
        awardTitle: award.title,
        periodStart,
        periodEnd,
        overallCompliance: "compliant",
        ironSteelCompliance: true,
        constructionMaterialsCompliance: true,
        manufacturedProductsCompliance: true,
        totalProcurementCost: fmtMoney(totalCost),
        domesticProcurementCost: fmtMoney(totalCost),
        foreignProcurementCost: fmtMoney(0),
        domesticContentPercentage: 100,
        waiversTotal: 0,
        waiversPending: 0,
        waiversApproved: 0,
        waiversDenied: 0,
        lineItems,
        certifierName: cert?.certifierName || "",
        certifierTitle: cert?.certifierTitle || "",
        certifiedDate: cert ? fmtDate(cert.certifiedAt) : "",
      };

      const pdfBytes = await renderBABA(babaValues);
      const filename = `BABA_${award.fain}_${periodStart}_${periodEnd}.pdf`;
      return new NextResponse(Buffer.from(pdfBytes), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="${filename}"`,
          "Content-Length": String(pdfBytes.length),
        },
      });
    }

    // ─── SF-425 PDF (default) ───

    const totalExpenses = expenses
      .filter((e) => e.status !== "flagged")
      .reduce((s, e) => s + Number(e.amount), 0);

    const totalDrawn = drawdowns
      .filter((d) => d.status === "approved" || d.status === "submitted")
      .reduce((s, d) => s + Number(d.totalAmount), 0);

    const totalAuthorized = Number(award.totalAmount);
    const cashOnHand = totalDrawn - totalExpenses;
    const federalShare425 = totalExpenses;
    const unobligated = totalAuthorized - federalShare425;

    const matchPct425 = award.matchPercentage;
    const matchRequired =
      matchPct425 > 0 ? totalAuthorized * (matchPct425 / (100 - matchPct425)) : 0;
    const matchCommitted = matchLedger.reduce(
      (s, e) => s + Number(e.amount),
      0,
    );
    const matchRemaining = Math.max(0, matchRequired - matchCommitted);

    // Build category name lookup for MTDC-aware indirect cost computation
    const categoryNameById425: Record<string, string> = {};
    for (const cat of award.budgetCategories) {
      categoryNameById425[(cat as { id: string }).id] = (cat as { name: string }).name;
    }
    const expensesForIC = expenses.map((e: { date: Date; amount: unknown; status: string; categoryId?: string }) => ({
      date: fmtDate(e.date),
      amount: Number(e.amount),
      status: e.status,
      categoryName: e.categoryId ? categoryNameById425[e.categoryId] : undefined,
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

    const values: SF425Values = {
      federalAgency: award.awardingAgency,
      fain: award.fain,
      recipientOrg: recipientName,
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
      line10e: fmtMoney(federalShare425),
      line10f: fmtMoney(0),
      line10g: fmtMoney(federalShare425),
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
