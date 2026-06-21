/**
 * Federal Report Template Engine
 *
 * Auto-populates SF-425, SF-270, and SF-PPR form data from award/expense/drawdown records.
 * All field mappings reference OMB-prescribed form structures.
 *
 * Compliance: 2 CFR 200.328 (financial reporting), 2 CFR 200.329 (monitoring/reporting performance)
 */

import {
  getAwardById,
  getExpensesForAward,
  getDrawdownsForAward,
  getMatchStatus,
  type Award,
} from "./awards";
import { generateFinancialSummary, generateMatchSummary } from "./reporting";

// ─── Recipient Info (Port Freeport) ───
// Static entity data for form headers. In production this would come from a profile/settings table.

const RECIPIENT_INFO = {
  name: "Port Freeport",
  address: "1100 Cherry Street, Freeport, TX 77541",
  uei: "NM6LJHKFGCK5",
  ein: "74-6079025",
  congressionalDistrict: "TX-14",
  contactName: "Phyllis Saathoff",
  contactTitle: "Executive Director/CEO",
  contactPhone: "(979) 233-2667",
  contactEmail: "psaathoff@portfreeport.com",
};

// ─── SF-425 Types ───

export interface SF425LineItem {
  lineNumber: string;
  label: string;
  value: number | string;
  source: string;
  editable: boolean;
}

export interface SF425FormData {
  // Header (Lines 1-9)
  federalAgency: string;
  federalGrantNumber: string;
  recipientName: string;
  recipientAddress: string;
  uei: string;
  ein: string;
  reportingPeriodEnd: string;
  reportType: "quarterly" | "semi_annual" | "annual" | "final";
  basisOfAccounting: "cash" | "accrual";

  // All computed line items
  lineItems: SF425LineItem[];

  // Remarks (Line 12)
  remarks: string;

  // Certification
  certifyingOfficial: string;
  certifyingTitle: string;
  certifyingPhone: string;
  certifyingDate: string;

  // Validation
  validation: SF425Validation;
}

export interface SF425Validation {
  valid: boolean;
  errors: { lineNumber: string; message: string }[];
  warnings: { lineNumber: string; message: string }[];
}

// ─── SF-270 Types ───

export interface SF270FormData {
  // Header
  federalSponsoringAgency: string;
  grantNumber: string;
  recipientName: string;
  recipientAddress: string;

  // Request details
  requestType: "advance" | "reimbursement";
  computationPeriod: { start: string; end: string };
  requestNumber: number;

  // Financial lines (matching SF-270 form structure)
  lineItems: SF270LineItem[];

  // Totals
  totalProgramOutlays: number;
  nonFederalOutlays: number;
  federalShareOfOutlays: number;
  federalPaymentsReceived: number;
  federalShareNowRequested: number;

  // Certification
  certifyingOfficial: string;
  certifyingTitle: string;
  certifyingDate: string;

  validation: SF270Validation;
}

export interface SF270LineItem {
  lineId: string;
  label: string;
  value: number;
  source: string;
}

export interface SF270Validation {
  valid: boolean;
  errors: { lineId: string; message: string }[];
}

// ─── BABA Types ───

export interface BABALineItem {
  id: string;
  materialDescription: string;
  manufacturer: string;
  countryOfOrigin: string;
  domesticContent: boolean;
  costAmount: number;
  waiverRequested: boolean;
  waiverType?: "de_minimis" | "non_availability" | "public_interest" | "none";
  waiverStatus?: "pending" | "approved" | "denied" | "not_applicable";
  notes: string;
}

export interface BABAFormData {
  // Header
  awardId: string;
  awardTitle: string;
  program: string;
  federalAgency: string;
  grantNumber: string;
  recipientName: string;

  // Reporting period
  reportingPeriod: { start: string; end: string };

  // Compliance status
  overallCompliance: "compliant" | "non_compliant" | "waiver_pending" | "not_applicable";

  // Material / product line items
  lineItems: BABALineItem[];

  // Summary metrics
  totalProcurementCost: number;
  domesticProcurementCost: number;
  foreignProcurementCost: number;
  domesticContentPercentage: number;

  // Waivers
  waiversSummary: {
    total: number;
    pending: number;
    approved: number;
    denied: number;
  };

  // Iron/Steel/Construction Materials tracking (BABA Section 70914)
  ironSteelCompliance: boolean;
  constructionMaterialsCompliance: boolean;
  manufacturedProductsCompliance: boolean;

  // Certification
  certifyingOfficial: string;
  certifyingTitle: string;
  certifyingDate: string;

  // Validation
  validation: BABAValidation;
}

export interface BABAValidation {
  valid: boolean;
  errors: { field: string; message: string }[];
  warnings: { field: string; message: string }[];
}

// ─── SF-PPR Types ───

export interface PPRFormData {
  awardId: string;
  awardTitle: string;
  program: string;
  reportingPeriod: { start: string; end: string };
  recipientName: string;

  // Standard PPR sections
  sections: PPRSection[];

  // Milestones derived from budget categories / project work
  milestones: PPRMilestone[];

  // Key metrics
  objectives: PPRObjective[];
}

export interface PPRSection {
  id: string;
  title: string;
  prompt: string;
  aiDraft: string;
  userContent: string;
}

export interface PPRMilestone {
  id: string;
  description: string;
  targetDate: string;
  status: "not_started" | "in_progress" | "completed" | "delayed";
  completionDate: string;
  notes: string;
}

export interface PPRObjective {
  id: string;
  description: string;
  metrics: { name: string; target: string; actual: string }[];
}

// ─── SF-425 Generation ───

export function generateSF425(awardId: string, periodStart: string, periodEnd: string): SF425FormData | null {
  const award = getAwardById(awardId);
  if (!award) return null;

  const financial = generateFinancialSummary(awardId, periodStart, periodEnd);
  const match = generateMatchSummary(awardId);
  const expenses = getExpensesForAward(awardId).filter((e) => e.status !== "flagged");
  const drawdowns = getDrawdownsForAward(awardId);

  // Cash calculations
  const cashReceipts = drawdowns
    .filter((d) => d.status === "payment_received")
    .reduce((s, d) => s + d.totalAmount, 0);

  const cashDisbursements = financial.totalExpendedCumulative;
  const cashOnHand = cashReceipts - cashDisbursements;

  // Federal share calculations
  const federalFundsAuthorized = award.totalAmount;
  const federalShareOfExpenditures = financial.totalExpendedCumulative;
  const unliquidatedObligations = drawdowns
    .filter((d) => d.status === "approved")
    .reduce((s, d) => s + d.totalAmount, 0);
  const totalFederalShare = federalShareOfExpenditures + unliquidatedObligations;
  const unobligatedBalance = federalFundsAuthorized - totalFederalShare;

  // Recipient share
  const recipientShareRequired = match.required;
  const recipientShareMatched = match.committed;
  const recipientShareRemaining = Math.max(0, recipientShareRequired - recipientShareMatched);

  // Determine report type based on period length
  const periodMs = new Date(periodEnd).getTime() - new Date(periodStart).getTime();
  const periodDays = periodMs / (1000 * 60 * 60 * 24);
  let reportType: SF425FormData["reportType"] = "quarterly";
  if (periodDays > 180) reportType = "annual";
  else if (periodDays > 100) reportType = "semi_annual";

  // Check if final report
  const isFinal = periodEnd >= award.performancePeriod.end;
  if (isFinal) reportType = "final";

  const lineItems: SF425LineItem[] = [
    { lineNumber: "10a", label: "Cash Receipts", value: cashReceipts, source: "Sum of drawdowns with payment_received status", editable: false },
    { lineNumber: "10b", label: "Cash Disbursements", value: cashDisbursements, source: "Total cumulative non-flagged expenses", editable: false },
    { lineNumber: "10c", label: "Cash on Hand (10a - 10b)", value: cashOnHand, source: "Computed: Line 10a minus Line 10b", editable: false },
    { lineNumber: "10d", label: "Total Federal Funds Authorized", value: federalFundsAuthorized, source: "Award total amount", editable: false },
    { lineNumber: "10e", label: "Federal Share of Expenditures", value: federalShareOfExpenditures, source: "Cumulative non-flagged expenses charged to federal share", editable: false },
    { lineNumber: "10f", label: "Federal Share of Unliquidated Obligations", value: unliquidatedObligations, source: "Approved drawdowns not yet paid", editable: true },
    { lineNumber: "10g", label: "Total Federal Share (10e + 10f)", value: totalFederalShare, source: "Computed: Line 10e plus Line 10f", editable: false },
    { lineNumber: "10h", label: "Unobligated Balance of Federal Funds (10d - 10g)", value: unobligatedBalance, source: "Computed: Line 10d minus Line 10g", editable: false },
    { lineNumber: "10i", label: "Total Recipient Share Required", value: recipientShareRequired, source: "Match requirement from award terms", editable: false },
    { lineNumber: "10j", label: "Total Recipient Share of Expenditures", value: recipientShareMatched, source: "Sum of match ledger entries", editable: false },
    { lineNumber: "10k", label: "Remaining Recipient Share to Be Provided (10i - 10j)", value: recipientShareRemaining, source: "Computed: Line 10i minus Line 10j", editable: false },
    { lineNumber: "10l", label: "Total Federal Program Income Earned", value: 0, source: "No program income generated", editable: true },
    { lineNumber: "11a", label: "Type of Rate (Provisional/Final/Fixed/Predetermined)", value: "De Minimis", source: "10% de minimis rate per 2 CFR 200.414(f)", editable: true },
    { lineNumber: "11b", label: "Rate", value: "10%", source: "De minimis indirect cost rate", editable: true },
    { lineNumber: "11c", label: "Period (From-To)", value: `${periodStart} to ${periodEnd}`, source: "Reporting period", editable: false },
    { lineNumber: "11d", label: "Base", value: financial.totalExpendedCumulative, source: "Modified total direct costs", editable: true },
    { lineNumber: "11e", label: "Amount Charged", value: Math.round(financial.totalExpendedCumulative * 0.1), source: "10% of base (de minimis)", editable: true },
    { lineNumber: "11f", label: "Federal Share", value: Math.round(financial.totalExpendedCumulative * 0.1), source: "Federal share of indirect costs", editable: true },
  ];

  const validation = validateSF425(lineItems);

  return {
    federalAgency: award.awardingAgency,
    federalGrantNumber: award.fain,
    recipientName: RECIPIENT_INFO.name,
    recipientAddress: RECIPIENT_INFO.address,
    uei: RECIPIENT_INFO.uei,
    ein: RECIPIENT_INFO.ein,
    reportingPeriodEnd: periodEnd,
    reportType,
    basisOfAccounting: "accrual",
    lineItems,
    remarks: "",
    certifyingOfficial: RECIPIENT_INFO.contactName,
    certifyingTitle: RECIPIENT_INFO.contactTitle,
    certifyingPhone: RECIPIENT_INFO.contactPhone,
    certifyingDate: new Date().toISOString().split("T")[0],
    validation,
  };
}

function validateSF425(lineItems: SF425LineItem[]): SF425Validation {
  const errors: SF425Validation["errors"] = [];
  const warnings: SF425Validation["warnings"] = [];

  const getVal = (ln: string) => {
    const item = lineItems.find((l) => l.lineNumber === ln);
    return typeof item?.value === "number" ? item.value : 0;
  };

  // 10c must equal 10a - 10b
  const expected10c = getVal("10a") - getVal("10b");
  if (Math.abs(getVal("10c") - expected10c) > 0.01) {
    errors.push({ lineNumber: "10c", message: `Line 10c ($${getVal("10c")}) should equal 10a - 10b ($${expected10c})` });
  }

  // 10g must equal 10e + 10f
  const expected10g = getVal("10e") + getVal("10f");
  if (Math.abs(getVal("10g") - expected10g) > 0.01) {
    errors.push({ lineNumber: "10g", message: `Line 10g ($${getVal("10g")}) should equal 10e + 10f ($${expected10g})` });
  }

  // 10h must equal 10d - 10g
  const expected10h = getVal("10d") - getVal("10g");
  if (Math.abs(getVal("10h") - expected10h) > 0.01) {
    errors.push({ lineNumber: "10h", message: `Line 10h ($${getVal("10h")}) should equal 10d - 10g ($${expected10h})` });
  }

  // 10k must equal 10i - 10j
  const expected10k = Math.max(0, getVal("10i") - getVal("10j"));
  if (Math.abs(getVal("10k") - expected10k) > 0.01) {
    errors.push({ lineNumber: "10k", message: `Line 10k ($${getVal("10k")}) should equal 10i - 10j ($${expected10k})` });
  }

  // Warnings
  if (getVal("10c") < 0) {
    warnings.push({ lineNumber: "10c", message: "Cash on hand is negative — disbursements exceed receipts" });
  }

  if (getVal("10h") < 0) {
    warnings.push({ lineNumber: "10h", message: "Negative unobligated balance — expenditures may exceed authorized amount" });
  }

  if (getVal("10j") < getVal("10i") * 0.8) {
    warnings.push({ lineNumber: "10j", message: "Recipient match is below 80% of required — may be at risk" });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ─── SF-270 Generation ───

export function generateSF270(awardId: string, periodStart: string, periodEnd: string): SF270FormData | null {
  const award = getAwardById(awardId);
  if (!award) return null;

  const expenses = getExpensesForAward(awardId).filter((e) => e.status !== "flagged");
  const drawdowns = getDrawdownsForAward(awardId);
  const match = generateMatchSummary(awardId);

  // Period expenses
  const periodExpenses = expenses.filter((e) => e.date >= periodStart && e.date <= periodEnd);
  const totalProgramOutlays = periodExpenses.reduce((s, e) => s + e.amount, 0);

  // Non-federal (match) outlays for this period
  const matchStatus = getMatchStatus(awardId);
  const matchPercentage = award.matchRequirement.percentage / 100;
  const nonFederalOutlays = Math.round(totalProgramOutlays * matchPercentage);

  // Federal share
  const federalShareOfOutlays = totalProgramOutlays - nonFederalOutlays;

  // Payments already received
  const federalPaymentsReceived = drawdowns
    .filter((d) => d.status === "payment_received")
    .reduce((s, d) => s + d.totalAmount, 0);

  // Net request
  const cumulativeExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const cumulativeFederalShare = cumulativeExpenses - Math.round(cumulativeExpenses * matchPercentage);
  const federalShareNowRequested = Math.max(0, cumulativeFederalShare - federalPaymentsReceived);

  // Request number (count of existing approved/paid drawdowns + 1)
  const requestNumber = drawdowns.filter((d) => d.status !== "draft").length + 1;

  const lineItems: SF270LineItem[] = [
    { lineId: "a", label: "Total Program Outlays to Date", value: cumulativeExpenses, source: "Cumulative non-flagged expenses" },
    { lineId: "b", label: "Less: Non-Federal Share of Outlays", value: Math.round(cumulativeExpenses * matchPercentage), source: "Match percentage applied to cumulative outlays" },
    { lineId: "c", label: "Federal Share of Outlays (a - b)", value: cumulativeFederalShare, source: "Computed: Line a minus Line b" },
    { lineId: "d", label: "Less: Total Federal Payments Received", value: federalPaymentsReceived, source: "Sum of payment_received drawdowns" },
    { lineId: "e", label: "Federal Share Now Requested (c - d)", value: federalShareNowRequested, source: "Computed: Line c minus Line d" },
    { lineId: "f", label: "Non-Federal Amount Applied This Period", value: nonFederalOutlays, source: "Match portion of period outlays" },
  ];

  const validation: SF270Validation = { valid: true, errors: [] };
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
    recipientName: RECIPIENT_INFO.name,
    recipientAddress: RECIPIENT_INFO.address,
    requestType: "reimbursement",
    computationPeriod: { start: periodStart, end: periodEnd },
    requestNumber,
    lineItems,
    totalProgramOutlays,
    nonFederalOutlays,
    federalShareOfOutlays,
    federalPaymentsReceived,
    federalShareNowRequested,
    certifyingOfficial: RECIPIENT_INFO.contactName,
    certifyingTitle: RECIPIENT_INFO.contactTitle,
    certifyingDate: new Date().toISOString().split("T")[0],
    validation,
  };
}

// ─── SF-PPR Generation ───

export function generatePPR(awardId: string, periodStart: string, periodEnd: string): PPRFormData | null {
  const award = getAwardById(awardId);
  if (!award) return null;

  const financial = generateFinancialSummary(awardId, periodStart, periodEnd);

  // Build sections with program-specific prompts
  const prompts = getPPRPrompts(award.program);

  const sections: PPRSection[] = prompts.map((p) => ({
    id: p.id,
    title: p.title,
    prompt: p.prompt,
    aiDraft: "",
    userContent: "",
  }));

  // Derive milestones from budget categories + spend progress
  const milestones: PPRMilestone[] = award.budgetCategories.map((cat, i) => {
    const pct = cat.ceiling > 0 ? cat.spent / cat.ceiling : 0;
    let status: PPRMilestone["status"] = "not_started";
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

  // Program objectives based on award type
  const objectives = getDefaultObjectives(award);

  return {
    awardId,
    awardTitle: award.title,
    program: award.program,
    reportingPeriod: { start: periodStart, end: periodEnd },
    recipientName: RECIPIENT_INFO.name,
    sections,
    milestones,
    objectives,
  };
}

// ─── PPR Prompt Templates ───

interface PPRPromptTemplate {
  id: string;
  title: string;
  prompt: string;
}

function getPPRPrompts(program: string): PPRPromptTemplate[] {
  const basePrompts: PPRPromptTemplate[] = [
    {
      id: "accomplishments",
      title: "Major Accomplishments",
      prompt: "Describe the major activities and accomplishments during this reporting period. Include milestones achieved, deliverables completed, and progress toward project objectives.",
    },
    {
      id: "problems",
      title: "Problems or Delays",
      prompt: "Describe any problems, delays, or adverse conditions that affected progress. Include actions taken or planned to resolve these issues and their impact on the project timeline.",
    },
    {
      id: "significant_findings",
      title: "Significant Findings & Developments",
      prompt: "Report any significant results, findings, or key developments that occurred during this period. Include any changes in approach or methodology from the original plan.",
    },
    {
      id: "planned_activities",
      title: "Planned Activities for Next Period",
      prompt: "Describe the activities and milestones planned for the next reporting period. Note any anticipated challenges or resource needs.",
    },
  ];

  // Add program-specific sections
  const programPrompts: Record<string, PPRPromptTemplate[]> = {
    PIDP: [
      {
        id: "construction_progress",
        title: "Construction Progress",
        prompt: "Describe construction progress including percentage complete for each major work element. Include contractor performance, weather delays, and any change orders.",
      },
      {
        id: "buy_america",
        title: "Buy America / BABA Compliance",
        prompt: "Report on domestic content compliance for all materials and manufactured products purchased this period. Note any waiver requests submitted or pending.",
      },
    ],
    "Clean Ports": [
      {
        id: "emissions",
        title: "Emissions Reduction Progress",
        prompt: "Summarize emissions inventory findings and any measurable reductions achieved. Report on zero-emission equipment deployment status.",
      },
    ],
    CRISI: [
      {
        id: "rail_progress",
        title: "Rail Infrastructure Progress",
        prompt: "Report on track installation progress and coordination with railroad operator. Include grade crossing improvements and signal system updates.",
      },
    ],
  };

  return [...basePrompts, ...(programPrompts[program] || [])];
}

function getDefaultObjectives(award: Award): PPRObjective[] {
  const financial = generateFinancialSummary(award.id, award.performancePeriod.start, award.performancePeriod.end);
  const pctSpent = award.totalAmount > 0 ? Math.round((financial.totalExpendedCumulative / award.totalAmount) * 100) : 0;

  const objectives: PPRObjective[] = [
    {
      id: `obj-${award.id}-budget`,
      description: "Budget Execution",
      metrics: [
        { name: "Total Expenditure Rate", target: "100%", actual: `${pctSpent}%` },
        { name: "Budget Categories on Track", target: `${award.budgetCategories.length}`, actual: `${award.budgetCategories.filter((c) => c.spent <= c.ceiling).length}` },
      ],
    },
  ];

  // Program-specific objectives
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

  return objectives;
}

// ─── BABA Generation ───

export function generateBABA(awardId: string, periodStart: string, periodEnd: string): BABAFormData | null {
  const award = getAwardById(awardId);
  if (!award) return null;

  const expenses = getExpensesForAward(awardId).filter((e) => e.status !== "flagged");
  const periodExpenses = expenses.filter((e) => e.date >= periodStart && e.date <= periodEnd);

  // Generate sample line items from period expenses that look like material purchases
  const materialCategories = ["Construction", "Equipment", "Materials", "Supplies"];
  const materialExpenses = periodExpenses.filter((e) =>
    materialCategories.some((cat) => (e as any).categoryName?.includes(cat) || (e as any).vendor?.includes(cat))
  );

  const lineItems: BABALineItem[] = materialExpenses.length > 0
    ? materialExpenses.map((e, i) => ({
        id: `baba-${awardId}-${i}`,
        materialDescription: (e as any).description || `Material Purchase #${i + 1}`,
        manufacturer: "Domestic Manufacturer",
        countryOfOrigin: "United States",
        domesticContent: true,
        costAmount: e.amount,
        waiverRequested: false,
        waiverType: "none" as const,
        waiverStatus: "not_applicable" as const,
        notes: "",
      }))
    : [];

  const totalProcurementCost = lineItems.reduce((s, li) => s + li.costAmount, 0);
  const domesticItems = lineItems.filter((li) => li.domesticContent);
  const domesticProcurementCost = domesticItems.reduce((s, li) => s + li.costAmount, 0);
  const foreignProcurementCost = totalProcurementCost - domesticProcurementCost;
  const domesticContentPercentage = totalProcurementCost > 0
    ? Math.round((domesticProcurementCost / totalProcurementCost) * 100)
    : 100;

  const waiverItems = lineItems.filter((li) => li.waiverRequested);

  const validation: BABAValidation = { valid: true, errors: [], warnings: [] };
  if (foreignProcurementCost > 0 && waiverItems.length === 0) {
    validation.valid = false;
    validation.errors.push({ field: "waivers", message: "Foreign-sourced materials require BABA waiver requests" });
  }
  if (domesticContentPercentage < 100 && domesticContentPercentage > 0) {
    validation.warnings.push({ field: "domesticContent", message: `Domestic content is ${domesticContentPercentage}% — review for BABA compliance` });
  }

  return {
    awardId,
    awardTitle: award.title,
    program: award.program,
    federalAgency: award.awardingAgency,
    grantNumber: award.fain,
    recipientName: "Port Freeport",
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
    certifyingOfficial: "Phyllis Saathoff",
    certifyingTitle: "Executive Director/CEO",
    certifyingDate: new Date().toISOString().split("T")[0],
    validation,
  };
}

// ─── In-Memory Draft Storage ───

const sf425Drafts = new Map<string, SF425FormData>();
const sf270Drafts = new Map<string, SF270FormData>();
const pprDrafts = new Map<string, PPRFormData>();
const babaDrafts = new Map<string, BABAFormData>();

export function saveSF425Draft(reportId: string, data: SF425FormData): void {
  sf425Drafts.set(reportId, data);
}

export function getSF425Draft(reportId: string): SF425FormData | undefined {
  return sf425Drafts.get(reportId);
}

export function saveSF270Draft(reportId: string, data: SF270FormData): void {
  sf270Drafts.set(reportId, data);
}

export function getSF270Draft(reportId: string): SF270FormData | undefined {
  return sf270Drafts.get(reportId);
}

export function savePPRDraft(reportId: string, data: PPRFormData): void {
  pprDrafts.set(reportId, data);
}

export function getPPRDraft(reportId: string): PPRFormData | undefined {
  return pprDrafts.get(reportId);
}

export function saveBABADraft(reportId: string, data: BABAFormData): void {
  babaDrafts.set(reportId, data);
}

export function getBABADraft(reportId: string): BABAFormData | undefined {
  return babaDrafts.get(reportId);
}
