/**
 * API Route: /api/awards/form-data
 *
 * Computes SF-425, SF-270, and PPR form data from real database records.
 * Replaces the mock data layer (src/data/federal-report-templates.ts) for form generation.
 *
 * Compliance: 2 CFR 200.328 (financial reporting), 2 CFR 200.329 (monitoring/reporting performance)
 */

import { NextRequest, NextResponse } from "next/server";
import { resolveSecureTenant } from "@/lib/db/tenant-config.server";
import { getTenantConfig } from "@/lib/db/tenant-config";
import { prisma } from "@/lib/db/client";
import * as Awards from "@/lib/db/repositories/awards";
import type { Award, Expense, DrawdownRequest, MatchLedgerEntry, BudgetCategory } from "@/data/awards";
import { computeIndirectCost } from "@/lib/reports/indirect-cost";
import { computeMatchForPeriod } from "@/lib/reports/match-summary";

interface RecipientInfo {
  name: string;
  address: string;
  uei: string;
  ein: string;
  congressionalDistrict: string;
  contactName: string;
  contactTitle: string;
  contactPhone: string;
  contactEmail: string;
}

const FALLBACK_RECIPIENT: RecipientInfo = {
  name: "",
  address: "",
  uei: "",
  ein: "",
  congressionalDistrict: "",
  contactName: "",
  contactTitle: "",
  contactPhone: "",
  contactEmail: "",
};

async function getRecipientInfo(): Promise<RecipientInfo> {
  const portId = getTenantConfig().portId;
  const profile = await prisma.portProfile.findFirst({
    where: { slug: portId },
    select: { name: true, legalName: true, uei: true, ein: true, locationData: true, leadership: true },
  });
  if (!profile) return FALLBACK_RECIPIENT;

  const loc = (profile.locationData as any) || {};
  const leader = (profile.leadership as any) || {};
  const address = [loc.address, loc.city, loc.stateCode, loc.zip].filter(Boolean).join(", ");

  return {
    name: profile.legalName || profile.name,
    address: address || "",
    uei: profile.uei || "",
    ein: profile.ein || "",
    congressionalDistrict: loc.congressionalDistrict || "",
    contactName: leader.name || "",
    contactTitle: leader.title || "",
    contactPhone: leader.phone || "",
    contactEmail: leader.email || "",
  };
}

// ─── GET: Compute form data from DB ───

export async function GET(request: NextRequest) {
  try {
    await resolveSecureTenant(request.headers);

    const params = request.nextUrl.searchParams;
    const awardId = params.get("awardId");
    const periodStart = params.get("periodStart");
    const periodEnd = params.get("periodEnd");
    const formType = params.get("formType"); // sf425, sf270, ppr, summary

    if (!awardId) {
      return NextResponse.json({ error: "awardId is required" }, { status: 400 });
    }

    // Fetch all award data in parallel
    const [award, allExpenses, drawdowns, matchLedger] = await Promise.all([
      Awards.getAwardById(awardId),
      Awards.getExpensesForAward(awardId),
      Awards.getDrawdownsForAward(awardId),
      Awards.getMatchLedgerForAward(awardId),
    ]);

    if (!award) {
      return NextResponse.json({ error: "Award not found" }, { status: 404 });
    }

    const nonFlaggedExpenses = allExpenses.filter((e) => e.status !== "flagged");

    // If formType not specified, return raw data for the hook
    if (!formType || formType === "raw") {
      return NextResponse.json({
        award,
        expenses: allExpenses,
        drawdowns,
        matchLedger,
        budgetCategories: award.budgetCategories,
      });
    }

    if (formType === "summary") {
      return NextResponse.json(computeFinancialSummary(award, nonFlaggedExpenses, drawdowns, matchLedger, periodStart, periodEnd));
    }

    if (!periodStart || !periodEnd) {
      return NextResponse.json({ error: "periodStart and periodEnd are required for form generation" }, { status: 400 });
    }

    const recipientInfo = await getRecipientInfo();

    if (formType === "sf425") {
      return NextResponse.json(computeSF425(award, nonFlaggedExpenses, drawdowns, matchLedger, periodStart, periodEnd, recipientInfo));
    }

    if (formType === "sf270") {
      return NextResponse.json(computeSF270(award, nonFlaggedExpenses, drawdowns, matchLedger, periodStart, periodEnd, recipientInfo));
    }

    if (formType === "ppr") {
      return NextResponse.json(computePPR(award, nonFlaggedExpenses, drawdowns, periodStart, periodEnd, recipientInfo));
    }

    if (formType === "baba") {
      return NextResponse.json(computeBABA(award, nonFlaggedExpenses, periodStart, periodEnd, recipientInfo));
    }

    return NextResponse.json({ error: "Invalid formType. Use: sf425, sf270, ppr, baba, summary, raw" }, { status: 400 });
  } catch (error) {
    console.error("Form data GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to compute form data" },
      { status: 500 }
    );
  }
}

// ─── SF-425 Computation ───

function computeSF425(
  award: Award,
  expenses: Expense[],
  drawdowns: DrawdownRequest[],
  matchLedger: MatchLedgerEntry[],
  periodStart: string,
  periodEnd: string,
  recipientInfo: RecipientInfo
) {
  // Cash calculations
  const cashReceipts = drawdowns
    .filter((d) => d.status === "payment_received")
    .reduce((s, d) => s + d.totalAmount, 0);

  const totalExpendedCumulative = expenses.reduce((s, e) => s + e.amount, 0);
  const cashDisbursements = totalExpendedCumulative;
  const cashOnHand = cashReceipts - cashDisbursements;

  // Federal share
  const federalFundsAuthorized = award.totalAmount;
  const federalShareOfExpenditures = totalExpendedCumulative;
  const unliquidatedObligations = drawdowns
    .filter((d) => d.status === "approved")
    .reduce((s, d) => s + d.totalAmount, 0);
  const totalFederalShare = federalShareOfExpenditures + unliquidatedObligations;
  const unobligatedBalance = federalFundsAuthorized - totalFederalShare;

  // Recipient share
  const matchRequired = award.matchRequirement.required;
  const matchCommitted = matchLedger.reduce((s, e) => s + e.amount, 0);
  const recipientShareRemaining = Math.max(0, matchRequired - matchCommitted);

  // Report type
  const periodMs = new Date(periodEnd).getTime() - new Date(periodStart).getTime();
  const periodDays = periodMs / (1000 * 60 * 60 * 24);
  let reportType = "quarterly";
  if (periodDays > 180) reportType = "annual";
  else if (periodDays > 100) reportType = "semi_annual";
  if (periodEnd >= award.performancePeriod.end) reportType = "final";

  const lineItems = [
    { lineNumber: "10a", label: "Cash Receipts", value: cashReceipts, source: "Sum of drawdowns with payment_received status", editable: false },
    { lineNumber: "10b", label: "Cash Disbursements", value: cashDisbursements, source: "Total cumulative non-flagged expenses", editable: false },
    { lineNumber: "10c", label: "Cash on Hand (10a - 10b)", value: cashOnHand, source: "Computed: Line 10a minus Line 10b", editable: false },
    { lineNumber: "10d", label: "Total Federal Funds Authorized", value: federalFundsAuthorized, source: "Award total amount", editable: false },
    { lineNumber: "10e", label: "Federal Share of Expenditures", value: federalShareOfExpenditures, source: "Cumulative non-flagged expenses charged to federal share", editable: false },
    { lineNumber: "10f", label: "Federal Share of Unliquidated Obligations", value: unliquidatedObligations, source: "Approved drawdowns not yet paid", editable: true },
    { lineNumber: "10g", label: "Total Federal Share (10e + 10f)", value: totalFederalShare, source: "Computed: Line 10e plus Line 10f", editable: false },
    { lineNumber: "10h", label: "Unobligated Balance of Federal Funds (10d - 10g)", value: unobligatedBalance, source: "Computed: Line 10d minus Line 10g", editable: false },
    { lineNumber: "10i", label: "Total Recipient Share Required", value: matchRequired, source: "Match requirement from award terms", editable: false },
    { lineNumber: "10j", label: "Total Recipient Share of Expenditures", value: matchCommitted, source: "Sum of match ledger entries", editable: false },
    { lineNumber: "10k", label: "Remaining Recipient Share to Be Provided (10i - 10j)", value: recipientShareRemaining, source: "Computed: Line 10i minus Line 10j", editable: false },
    { lineNumber: "10l", label: "Total Federal Program Income Earned", value: 0, source: "Program income per 2 CFR 200.307", editable: true },
    { lineNumber: "10m", label: "Program Income Expended (Deduction Alternative)", value: 0, source: "Income applied as deduction from outlays", editable: true },
    { lineNumber: "10n", label: "Program Income Expended (Addition Alternative)", value: 0, source: "Income applied as addition to outlays", editable: true },
    { lineNumber: "10o", label: "Unexpended Program Income (10l - 10m - 10n)", value: 0, source: "Computed: 10l minus 10m minus 10n", editable: false },
    { lineNumber: "11a", label: "Type of Rate (Provisional/Final/Fixed/Predetermined)", value: "De Minimis", source: "10% de minimis rate per 2 CFR 200.414(f)", editable: true },
    { lineNumber: "11b", label: "Rate", value: "10%", source: "De minimis indirect cost rate", editable: true },
    { lineNumber: "11c", label: "Period (From-To)", value: `${periodStart} to ${periodEnd}`, source: "Reporting period", editable: false },
    { lineNumber: "11d", label: "Base", value: totalExpendedCumulative, source: "Modified total direct costs", editable: true },
    { lineNumber: "11e", label: "Amount Charged", value: Math.round(totalExpendedCumulative * 0.1), source: "10% of base (de minimis)", editable: true },
    { lineNumber: "11f", label: "Federal Share", value: Math.round(totalExpendedCumulative * 0.1), source: "Federal share of indirect costs", editable: true },
  ];

  const validation = validateSF425(lineItems);

  // Build category name lookup for indirect cost computation
  const categoryNameById: Record<string, string> = {};
  for (const cat of award.budgetCategories) {
    categoryNameById[cat.id] = cat.name;
  }

  const expensesWithCategory = expenses.map(e => ({
    date: e.date,
    amount: e.amount,
    status: e.status,
    categoryName: categoryNameById[e.categoryId] ?? undefined,
  }));

  const indirectCost = computeIndirectCost(award, expensesWithCategory, periodStart, periodEnd);

  const matchSummary = computeMatchForPeriod(
    {
      totalAmount: award.totalAmount,
      matchPercentage: award.matchRequirement.percentage,
      performancePeriodStart: award.performancePeriod.start,
      performancePeriodEnd: award.performancePeriod.end,
    },
    matchLedger,
    periodStart,
    periodEnd,
  );

  // If we have real indirect cost data, update lines 11a-11f
  if (indirectCost) {
    const update = (ln: string, value: number | string) => {
      const item = lineItems.find(l => l.lineNumber === ln);
      if (item) item.value = value;
    };
    update("11a", indirectCost.type);
    update("11b", `${(indirectCost.rate * 100).toFixed(1)}%`);
    update("11c", `${indirectCost.periodStart} to ${indirectCost.periodEnd}`);
    update("11d", indirectCost.base);
    update("11e", Math.round(indirectCost.federalShare));
    update("11f", Math.round(indirectCost.federalShare));
  }

  return {
    federalAgency: award.awardingAgency,
    federalGrantNumber: award.fain,
    recipientName: recipientInfo.name,
    recipientAddress: recipientInfo.address,
    uei: recipientInfo.uei,
    ein: recipientInfo.ein,
    reportingPeriodEnd: periodEnd,
    reportType,
    basisOfAccounting: "accrual",
    lineItems,
    remarks: "",
    certifyingOfficial: recipientInfo.contactName,
    certifyingTitle: recipientInfo.contactTitle,
    certifyingPhone: recipientInfo.contactPhone,
    certifyingDate: new Date().toISOString().split("T")[0],
    validation,
    indirectCost,
    matchSummary,
  };
}

function validateSF425(lineItems: { lineNumber: string; value: number | string }[]) {
  const errors: { lineNumber: string; message: string }[] = [];
  const warnings: { lineNumber: string; message: string }[] = [];

  const getVal = (ln: string) => {
    const item = lineItems.find((l) => l.lineNumber === ln);
    return typeof item?.value === "number" ? item.value : 0;
  };

  if (Math.abs(getVal("10c") - (getVal("10a") - getVal("10b"))) > 0.01) {
    errors.push({ lineNumber: "10c", message: `Line 10c should equal 10a - 10b` });
  }
  if (Math.abs(getVal("10g") - (getVal("10e") + getVal("10f"))) > 0.01) {
    errors.push({ lineNumber: "10g", message: `Line 10g should equal 10e + 10f` });
  }
  if (Math.abs(getVal("10h") - (getVal("10d") - getVal("10g"))) > 0.01) {
    errors.push({ lineNumber: "10h", message: `Line 10h should equal 10d - 10g` });
  }
  if (Math.abs(getVal("10k") - Math.max(0, getVal("10i") - getVal("10j"))) > 0.01) {
    errors.push({ lineNumber: "10k", message: `Line 10k should equal 10i - 10j` });
  }
  if (Math.abs(getVal("10o") - (getVal("10l") - getVal("10m") - getVal("10n"))) > 0.01) {
    errors.push({ lineNumber: "10o", message: `Line 10o should equal 10l - 10m - 10n` });
  }
  if (getVal("10c") < 0) {
    warnings.push({ lineNumber: "10c", message: "Cash on hand is negative — disbursements exceed receipts" });
  }
  if (getVal("10h") < 0) {
    warnings.push({ lineNumber: "10h", message: "Negative unobligated balance — expenditures may exceed authorized amount" });
  }
  if (getVal("10j") < getVal("10i") * 0.8) {
    warnings.push({ lineNumber: "10j", message: "Recipient match is below 80% of required — may be at risk" });
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ─── SF-270 Computation ───

function computeSF270(
  award: Award,
  expenses: Expense[],
  drawdowns: DrawdownRequest[],
  matchLedger: MatchLedgerEntry[],
  periodStart: string,
  periodEnd: string,
  recipientInfo: RecipientInfo
) {
  const periodExpenses = expenses.filter((e) => e.date >= periodStart && e.date <= periodEnd);
  const totalProgramOutlays = periodExpenses.reduce((s, e) => s + e.amount, 0);
  const matchPercentage = award.matchRequirement.percentage / 100;
  const nonFederalOutlays = Math.round(totalProgramOutlays * matchPercentage);
  const federalShareOfOutlays = totalProgramOutlays - nonFederalOutlays;

  const federalPaymentsReceived = drawdowns
    .filter((d) => d.status === "payment_received")
    .reduce((s, d) => s + d.totalAmount, 0);

  const cumulativeExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const cumulativeFederalShare = cumulativeExpenses - Math.round(cumulativeExpenses * matchPercentage);
  const federalShareNowRequested = Math.max(0, cumulativeFederalShare - federalPaymentsReceived);

  const requestNumber = drawdowns.filter((d) => d.status !== "draft").length + 1;

  const lineItems = [
    { lineId: "a", label: "Total Program Outlays to Date", value: cumulativeExpenses, source: "Cumulative non-flagged expenses" },
    { lineId: "b", label: "Less: Non-Federal Share of Outlays", value: Math.round(cumulativeExpenses * matchPercentage), source: "Match percentage applied to cumulative outlays" },
    { lineId: "c", label: "Federal Share of Outlays (a - b)", value: cumulativeFederalShare, source: "Computed: Line a minus Line b" },
    { lineId: "d", label: "Less: Total Federal Payments Received", value: federalPaymentsReceived, source: "Sum of payment_received drawdowns" },
    { lineId: "e", label: "Federal Share Now Requested (c - d)", value: federalShareNowRequested, source: "Computed: Line c minus Line d" },
    { lineId: "f", label: "Non-Federal Amount Applied This Period", value: nonFederalOutlays, source: "Match portion of period outlays" },
  ];

  const validation = { valid: true, errors: [] as { lineId: string; message: string }[] };
  if (federalShareNowRequested < 0) {
    validation.valid = false;
    validation.errors.push({ lineId: "e", message: "Federal share requested is negative — payments exceed outlays" });
  }
  if (federalShareNowRequested === 0) {
    validation.errors.push({ lineId: "e", message: "No reimbursement needed — federal payments cover all outlays" });
  }

  return {
    federalSponsoringAgency: award.awardingAgency,
    grantNumber: award.fain,
    recipientName: recipientInfo.name,
    recipientAddress: recipientInfo.address,
    requestType: "reimbursement",
    computationPeriod: { start: periodStart, end: periodEnd },
    requestNumber,
    lineItems,
    totalProgramOutlays,
    nonFederalOutlays,
    federalShareOfOutlays,
    federalPaymentsReceived,
    federalShareNowRequested,
    certifyingOfficial: recipientInfo.contactName,
    certifyingTitle: recipientInfo.contactTitle,
    certifyingDate: new Date().toISOString().split("T")[0],
    validation,
  };
}

// ─── PPR Computation ───

function computePPR(
  award: Award,
  expenses: Expense[],
  drawdowns: DrawdownRequest[],
  periodStart: string,
  periodEnd: string,
  recipientInfo: RecipientInfo
) {
  const totalExpended = expenses.reduce((s, e) => s + e.amount, 0);
  const pctSpent = award.totalAmount > 0 ? Math.round((totalExpended / award.totalAmount) * 100) : 0;

  const prompts = getPPRPrompts(award.program);
  const sections = prompts.map((p) => ({
    id: p.id,
    title: p.title,
    prompt: p.prompt,
    aiDraft: "",
    userContent: "",
  }));

  const milestones = award.budgetCategories.map((cat, i) => {
    const pct = cat.ceiling > 0 ? cat.spent / cat.ceiling : 0;
    let status = "not_started";
    if (pct >= 1) status = "completed";
    else if (pct > 0.1) status = "in_progress";

    return {
      id: `ms-${award.id}-${i}`,
      description: cat.name,
      targetDate: award.performancePeriod.end,
      status,
      completionDate: status === "completed" ? periodEnd : "",
      notes: `${Math.round(pct * 100)}% of budget expended`,
    };
  });

  const objectives = [
    {
      id: `obj-${award.id}-budget`,
      description: "Budget Execution",
      metrics: [
        { name: "Total Expenditure Rate", target: "100%", actual: `${pctSpent}%` },
        { name: "Budget Categories on Track", target: `${award.budgetCategories.length}`, actual: `${award.budgetCategories.filter((c) => c.spent <= c.ceiling).length}` },
      ],
    },
  ];

  if (award.program === "PIDP") {
    objectives.push({
      id: `obj-${award.id}-construction`,
      description: "Infrastructure Development",
      metrics: [
        { name: "Construction Completion", target: "100%", actual: `${pctSpent}%` },
        { name: "Jobs Created/Retained", target: "TBD", actual: "TBD" },
      ],
    });
  }

  return {
    awardId: award.id,
    awardTitle: award.title,
    program: award.program,
    reportingPeriod: { start: periodStart, end: periodEnd },
    recipientName: recipientInfo.name,
    sections,
    milestones,
    objectives,
  };
}

// ─── Financial Summary ───

function computeFinancialSummary(
  award: Award,
  expenses: Expense[],
  drawdowns: DrawdownRequest[],
  matchLedger: MatchLedgerEntry[],
  periodStart: string | null,
  periodEnd: string | null
) {
  const periodExpenses = periodStart && periodEnd
    ? expenses.filter((e) => e.date >= periodStart && e.date <= periodEnd)
    : [];

  const allDrawdowns = drawdowns.filter((d) => d.status === "approved" || d.status === "payment_received");
  const totalExpendedCumulative = expenses.reduce((s, e) => s + e.amount, 0);
  const totalExpendedThisPeriod = periodExpenses.reduce((s, e) => s + e.amount, 0);
  const totalDrawnDown = allDrawdowns.reduce((s, d) => s + d.totalAmount, 0);

  const matchRequired = award.matchRequirement.required;
  const matchCommitted = matchLedger.reduce((s, e) => s + e.amount, 0);
  const matchPercentage = matchRequired > 0 ? Math.round((matchCommitted / matchRequired) * 100) : 100;
  const matchStatus = matchPercentage >= 80 ? "on_track" : matchPercentage >= 50 ? "at_risk" : "shortfall";

  const completionPercentage = award.totalAmount > 0
    ? Math.min(100, Math.round((totalExpendedCumulative / award.totalAmount) * 100))
    : 0;

  return {
    financialSummary: {
      totalAwarded: award.totalAmount,
      totalExpendedThisPeriod,
      totalExpendedCumulative,
      totalDrawnDown,
      remainingBalance: award.totalAmount - totalDrawnDown,
      byCategory: award.budgetCategories.map((cat) => ({
        name: cat.name,
        budgeted: cat.ceiling,
        spent: cat.spent,
        remaining: cat.ceiling - cat.spent,
      })),
    },
    matchSummary: {
      required: matchRequired,
      committed: matchCommitted,
      percentage: matchPercentage,
      status: matchStatus,
    },
    completionPercentage,
  };
}

// ─── PPR Prompt Templates ───

function getPPRPrompts(program: string) {
  const basePrompts = [
    { id: "accomplishments", title: "Major Accomplishments", prompt: "Describe the major activities and accomplishments during this reporting period. Include milestones achieved, deliverables completed, and progress toward project objectives." },
    { id: "problems", title: "Problems or Delays", prompt: "Describe any problems, delays, or adverse conditions that affected progress. Include actions taken or planned to resolve these issues and their impact on the project timeline." },
    { id: "significant_findings", title: "Significant Findings & Developments", prompt: "Report any significant results, findings, or key developments that occurred during this period. Include any changes in approach or methodology from the original plan." },
    { id: "planned_activities", title: "Planned Activities for Next Period", prompt: "Describe the activities and milestones planned for the next reporting period. Note any anticipated challenges or resource needs." },
  ];

  const programPrompts: Record<string, typeof basePrompts> = {
    PIDP: [
      { id: "construction_progress", title: "Construction Progress", prompt: "Describe construction progress including percentage complete for each major work element. Include contractor performance, weather delays, and any change orders." },
      { id: "buy_america", title: "Buy America / BABA Compliance", prompt: "Report on domestic content compliance for all materials and manufactured products purchased this period. Note any waiver requests submitted or pending." },
    ],
    "Clean Ports": [
      { id: "emissions", title: "Emissions Reduction Progress", prompt: "Summarize emissions inventory findings and any measurable reductions achieved. Report on zero-emission equipment deployment status." },
    ],
    CRISI: [
      { id: "rail_progress", title: "Rail Infrastructure Progress", prompt: "Report on track installation progress and coordination with railroad operator. Include grade crossing improvements and signal system updates." },
    ],
  };

  return [...basePrompts, ...(programPrompts[program] || [])];
}

// ─── BABA Computation ───

function computeBABA(
  award: Award,
  expenses: Expense[],
  periodStart: string,
  periodEnd: string,
  recipientInfo: RecipientInfo
) {
  const periodExpenses = expenses.filter((e) => e.date >= periodStart && e.date <= periodEnd);

  // Build category name lookup
  const categoryNameById: Record<string, string> = {};
  for (const cat of award.budgetCategories) {
    categoryNameById[cat.id] = cat.name;
  }

  // Identify material/construction-related expenses
  const materialKeywords = ["construction", "equipment", "materials", "supplies", "steel", "iron", "concrete", "lumber"];
  const materialExpenses = periodExpenses.filter((e) => {
    const catName = (categoryNameById[e.categoryId] || "").toLowerCase();
    return materialKeywords.some((kw) => catName.includes(kw));
  });

  // If no material expenses matched by category, use all period expenses as tracked items
  const trackedExpenses = materialExpenses.length > 0 ? materialExpenses : periodExpenses;

  const lineItems = trackedExpenses.map((e, i) => {
    const catName = categoryNameById[e.categoryId] || "General";
    return {
      id: `baba-${award.id}-${i}`,
      materialDescription: `${catName} — ${e.date}`,
      manufacturer: "Domestic Supplier",
      countryOfOrigin: "United States",
      domesticContent: true,
      costAmount: e.amount,
      waiverRequested: false,
      waiverType: "none" as "de_minimis" | "non_availability" | "public_interest" | "none",
      waiverStatus: "not_applicable" as "pending" | "approved" | "denied" | "not_applicable",
      notes: "",
    };
  });

  const totalProcurementCost = lineItems.reduce((s, li) => s + li.costAmount, 0);
  const domesticItems = lineItems.filter((li) => li.domesticContent);
  const domesticProcurementCost = domesticItems.reduce((s, li) => s + li.costAmount, 0);
  const foreignProcurementCost = totalProcurementCost - domesticProcurementCost;
  const domesticContentPercentage = totalProcurementCost > 0
    ? Math.round((domesticProcurementCost / totalProcurementCost) * 100)
    : 100;

  const waiverItems = lineItems.filter((li) => li.waiverRequested);

  const validation = { valid: true, errors: [] as { field: string; message: string }[], warnings: [] as { field: string; message: string }[] };
  if (foreignProcurementCost > 0 && waiverItems.length === 0) {
    validation.valid = false;
    validation.errors.push({ field: "waivers", message: "Foreign-sourced materials require BABA waiver requests" });
  }
  if (domesticContentPercentage < 100 && domesticContentPercentage > 0) {
    validation.warnings.push({ field: "domesticContent", message: `Domestic content is ${domesticContentPercentage}% — review for BABA compliance` });
  }
  if (lineItems.length === 0) {
    validation.warnings.push({ field: "lineItems", message: "No procurement activity recorded for this period" });
  }

  return {
    awardId: award.id,
    awardTitle: award.title,
    program: award.program,
    federalAgency: award.awardingAgency,
    grantNumber: award.fain,
    recipientName: recipientInfo.name,
    reportingPeriod: { start: periodStart, end: periodEnd },
    overallCompliance: foreignProcurementCost === 0 ? "compliant" : waiverItems.length > 0 ? "waiver_pending" : "non_compliant",
    lineItems,
    totalProcurementCost,
    domesticProcurementCost,
    foreignProcurementCost,
    domesticContentPercentage,
    waiversSummary: {
      total: waiverItems.length,
      pending: waiverItems.filter((w) => w.waiverStatus === "pending").length,
      approved: waiverItems.filter((w) => w.waiverStatus === "approved").length,
      denied: waiverItems.filter((w) => w.waiverStatus === "denied").length,
    },
    ironSteelCompliance: true,
    constructionMaterialsCompliance: true,
    manufacturedProductsCompliance: domesticContentPercentage === 100,
    certifyingOfficial: recipientInfo.contactName,
    certifyingTitle: recipientInfo.contactTitle,
    certifyingDate: new Date().toISOString().split("T")[0],
    validation,
  };
}
