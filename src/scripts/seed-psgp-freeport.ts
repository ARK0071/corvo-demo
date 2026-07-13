/**
 * Seed script for FY 2026 Port Security Grant Program (PSGP) — Port Freeport.
 * Adds award, budget categories, expenses, match ledger, drawdowns,
 * scheduled reports, subrecipients, subrecipient reports, and compliance data.
 *
 * Run: npx tsx src/scripts/seed-psgp-freeport.ts
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { PrismaClient } from "../generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({
  host: process.env.RDS_HOST,
  port: parseInt(process.env.RDS_PORT || "5432"),
  database: process.env.RDS_DATABASE,
  user: process.env.RDS_USER,
  password: process.env.RDS_PASSWORD,
  ssl: { rejectUnauthorized: false },
});

const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

// ─── Existing IDs from seed-freeport-mock ───
const PROFILE_ID = "c27f5ae3-0001-4000-8000-000000000001";
const PROJECT_PORT_SECURITY = "c27f5ae3-0002-4000-8000-000000000004";

// ─── Deterministic UUIDs for PSGP data ───
const PSGP_AWARD_ID = "c27f5ae3-0003-4000-8000-000000000007";

const BUDGET_CAT_IDS = {
  physical_security: "c27f5ae3-0004-4000-8000-000000000019",
  cybersecurity: "c27f5ae3-0004-4000-8000-00000000001a",
  mda: "c27f5ae3-0004-4000-8000-00000000001b",
  training: "c27f5ae3-0004-4000-8000-00000000001c",
  admin: "c27f5ae3-0004-4000-8000-00000000001d",
};

const SUB_IDS = {
  sheriffOffice: "c27f5ae3-0005-4000-8000-000000000001",
  secureportTech: "c27f5ae3-0005-4000-8000-000000000002",
};

// ═══════════════════════════════════════════════════════════════════════════════
// CLEANUP — remove prior PSGP data
// ═══════════════════════════════════════════════════════════════════════════════

async function cleanup() {
  console.log("Cleaning up prior PSGP data...");

  // Delete subrecipient-related data first (subrecipient_reports → subrecipients)
  for (const subId of Object.values(SUB_IDS)) {
    try {
      await prisma.$executeRawUnsafe(
        `DELETE FROM subrecipient_reports WHERE subrecipient_id = $1`,
        subId
      );
    } catch {}
  }

  // Delete subrecipients for this award
  try {
    await prisma.$executeRawUnsafe(
      `DELETE FROM subrecipients WHERE award_id = $1`,
      PSGP_AWARD_ID
    );
  } catch {}

  // Delete compliance data for this award
  for (const table of [
    "corrective_action_plans",
    "audit_findings",
    "compliance_checklist_items",
    "compliance_checklists",
  ]) {
    try {
      if (table === "corrective_action_plans") {
        await prisma.$executeRawUnsafe(
          `DELETE FROM corrective_action_plans WHERE finding_id IN (SELECT id FROM audit_findings WHERE award_id = $1)`,
          PSGP_AWARD_ID
        );
      } else if (table === "compliance_checklist_items") {
        await prisma.$executeRawUnsafe(
          `DELETE FROM compliance_checklist_items WHERE checklist_id IN (SELECT id FROM compliance_checklists WHERE award_id = $1)`,
          PSGP_AWARD_ID
        );
      } else {
        await prisma.$executeRawUnsafe(
          `DELETE FROM ${table} WHERE award_id = $1`,
          PSGP_AWARD_ID
        );
      }
    } catch {}
  }

  // Delete other award-linked data
  for (const table of [
    "closeout_checklists",
    "scheduled_reports",
    "budget_modifications",
    "drawdown_requests",
    "expenses",
    "match_ledger",
    "budget_categories",
  ]) {
    try {
      await prisma.$executeRawUnsafe(
        `DELETE FROM ${table} WHERE award_id = $1`,
        PSGP_AWARD_ID
      );
    } catch {}
  }

  // Delete the award itself
  try {
    await prisma.$executeRawUnsafe(
      `DELETE FROM awards WHERE id = $1`,
      PSGP_AWARD_ID
    );
  } catch {}

  console.log("  ✓ Cleanup complete");
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. AWARD
// ═══════════════════════════════════════════════════════════════════════════════

async function seedAward() {
  console.log("Seeding PSGP award...");

  await prisma.award.create({
    data: {
      id: PSGP_AWARD_ID,
      portProfileId: PROFILE_ID,
      fain: "EMW-2026-PU-00147",
      cfda: "97.056",
      awardingAgency:
        "U.S. Department of Homeland Security / Federal Emergency Management Agency",
      program: "PSGP",
      title: "FY 2026 Port Security Enhancement — Physical & Cyber Hardening",
      description:
        "Comprehensive port security enhancement program including TWIC-compliant access control upgrades across all gates, expansion of the CCTV surveillance network with AI-powered analytics, deployment of underwater threat detection sensors in the Freeport Harbor Channel, cybersecurity infrastructure hardening (OT/IT network segmentation, SOC monitoring), and MTSA-compliant security exercises and training. The project addresses gaps identified in the 2025 FSP triennial review and aligns with the Area Maritime Security Plan for the Houston–Galveston COTP zone.",
      totalAmount: 2_100_000,
      performancePeriodStart: new Date("2026-07-01"),
      performancePeriodEnd: new Date("2029-06-30"),
      matchPercentage: 25,
      matchTypes: ["cash"],
      matchCommitted: 350_000,
      matchRequired: 700_000,
      status: "active",
      projectIds: [PROJECT_PORT_SECURITY],
    },
  });

  console.log("  ✓ PSGP award seeded ($2.1M)");
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. BUDGET CATEGORIES
// ═══════════════════════════════════════════════════════════════════════════════

async function seedBudgetCategories() {
  console.log("Seeding budget categories...");

  const cats = [
    {
      id: BUDGET_CAT_IDS.physical_security,
      awardId: PSGP_AWARD_ID,
      name: "Physical Security Enhancements",
      ceiling: 850_000,
      spent: 127_500,
    },
    {
      id: BUDGET_CAT_IDS.cybersecurity,
      awardId: PSGP_AWARD_ID,
      name: "Cybersecurity Infrastructure",
      ceiling: 520_000,
      spent: 78_000,
    },
    {
      id: BUDGET_CAT_IDS.mda,
      awardId: PSGP_AWARD_ID,
      name: "Maritime Domain Awareness",
      ceiling: 380_000,
      spent: 0,
    },
    {
      id: BUDGET_CAT_IDS.training,
      awardId: PSGP_AWARD_ID,
      name: "Training & Exercises",
      ceiling: 180_000,
      spent: 24_000,
    },
    {
      id: BUDGET_CAT_IDS.admin,
      awardId: PSGP_AWARD_ID,
      name: "Project Management & Administration",
      ceiling: 170_000,
      spent: 42_500,
    },
  ];

  for (const cat of cats) {
    await prisma.budgetCategory.create({ data: cat });
  }
  console.log(`  ✓ ${cats.length} budget categories seeded`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. EXPENSES
// ═══════════════════════════════════════════════════════════════════════════════

async function seedExpenses() {
  console.log("Seeding expenses...");

  const expenses = [
    // Physical Security
    {
      awardId: PSGP_AWARD_ID,
      categoryId: BUDGET_CAT_IDS.physical_security,
      date: new Date("2026-07-08"),
      description:
        "TWIC reader hardware procurement — 12 units for Velasco Terminal and Parcel gates",
      vendor: "IDEMIA Identity & Security USA",
      amount: 84_000,
      status: "approved",
    },
    {
      awardId: PSGP_AWARD_ID,
      categoryId: BUDGET_CAT_IDS.physical_security,
      date: new Date("2026-07-10"),
      description:
        "Anti-vehicle barrier system design and engineering — North Gate perimeter",
      vendor: "Delta Scientific Corporation",
      amount: 43_500,
      status: "logged",
    },

    // Cybersecurity
    {
      awardId: PSGP_AWARD_ID,
      categoryId: BUDGET_CAT_IDS.cybersecurity,
      date: new Date("2026-07-03"),
      description:
        "OT/IT network segmentation assessment and architecture design",
      vendor: "Dragos Inc.",
      amount: 52_000,
      status: "approved",
    },
    {
      awardId: PSGP_AWARD_ID,
      categoryId: BUDGET_CAT_IDS.cybersecurity,
      date: new Date("2026-07-12"),
      description:
        "Endpoint detection and response (EDR) software licenses — 3-year term",
      vendor: "CrowdStrike Inc.",
      amount: 26_000,
      status: "logged",
    },

    // Training & Exercises
    {
      awardId: PSGP_AWARD_ID,
      categoryId: BUDGET_CAT_IDS.training,
      date: new Date("2026-07-05"),
      description:
        "MTSA tabletop exercise facilitation — combined cybersecurity / physical security scenario",
      vendor: "Witt O'Brien's LLC",
      amount: 24_000,
      status: "approved",
    },

    // Administration
    {
      awardId: PSGP_AWARD_ID,
      categoryId: BUDGET_CAT_IDS.admin,
      date: new Date("2026-07-01"),
      description:
        "Grant kickoff coordination, FEMA reporting setup, and project management plan",
      vendor: "Port Freeport Staff",
      amount: 18_500,
      status: "approved",
    },
    {
      awardId: PSGP_AWARD_ID,
      categoryId: BUDGET_CAT_IDS.admin,
      date: new Date("2026-07-10"),
      description:
        "Environmental & Historic Preservation (EHP) review documentation preparation",
      vendor: "Atkins North America",
      amount: 24_000,
      status: "logged",
    },
  ];

  for (const exp of expenses) {
    await prisma.expense.create({ data: exp });
  }
  console.log(`  ✓ ${expenses.length} expenses seeded`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. MATCH LEDGER
// ═══════════════════════════════════════════════════════════════════════════════

async function seedMatchLedger() {
  console.log("Seeding match ledger...");

  const entries = [
    {
      awardId: PSGP_AWARD_ID,
      date: new Date("2026-07-01"),
      description:
        "Port Freeport cash match — initial contribution upon award execution",
      amount: 200_000,
      type: "cash",
    },
    {
      awardId: PSGP_AWARD_ID,
      date: new Date("2026-07-10"),
      description:
        "Port Freeport cash match — TWIC reader installation labor (port maintenance crew)",
      amount: 150_000,
      type: "cash",
    },
  ];

  for (const entry of entries) {
    await prisma.matchLedgerEntry.create({ data: entry });
  }
  console.log(`  ✓ ${entries.length} match ledger entries seeded`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. DRAWDOWN REQUESTS
// ═══════════════════════════════════════════════════════════════════════════════

async function seedDrawdowns() {
  console.log("Seeding drawdown requests...");

  const drawdowns = [
    {
      awardId: PSGP_AWARD_ID,
      expenseIds: ["PSGP kickoff + initial procurement"],
      totalAmount: 178_500,
      status: "draft",
      notes:
        "First drawdown — grant kickoff, OT/IT assessment, TWIC hardware, and tabletop exercise. Pending EHP clearance for physical security items.",
    },
  ];

  for (const dd of drawdowns) {
    await prisma.drawdownRequest.create({ data: dd });
  }
  console.log(`  ✓ ${drawdowns.length} drawdown requests seeded`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. SCHEDULED REPORTS
// ═══════════════════════════════════════════════════════════════════════════════

async function seedScheduledReports() {
  console.log("Seeding scheduled reports...");

  const reports = [
    // BSIR (Biannual Strategy Implementation Reports — required for PSGP)
    {
      awardId: PSGP_AWARD_ID,
      type: "progress",
      title: "Biannual Strategy Implementation Report (BSIR) — H2 2026",
      dueDate: new Date("2027-01-31"),
      periodStart: new Date("2026-07-01"),
      periodEnd: new Date("2026-12-31"),
      status: "upcoming",
    },
    {
      awardId: PSGP_AWARD_ID,
      type: "progress",
      title: "Biannual Strategy Implementation Report (BSIR) — H1 2027",
      dueDate: new Date("2027-07-31"),
      periodStart: new Date("2027-01-01"),
      periodEnd: new Date("2027-06-30"),
      status: "upcoming",
    },

    // SF-425 Federal Financial Reports (semi-annual for PSGP)
    {
      awardId: PSGP_AWARD_ID,
      type: "sf425",
      title: "SF-425 Federal Financial Report — H2 2026",
      dueDate: new Date("2027-01-30"),
      periodStart: new Date("2026-07-01"),
      periodEnd: new Date("2026-12-31"),
      status: "upcoming",
    },
    {
      awardId: PSGP_AWARD_ID,
      type: "sf425",
      title: "SF-425 Federal Financial Report — H1 2027",
      dueDate: new Date("2027-07-30"),
      periodStart: new Date("2027-01-01"),
      periodEnd: new Date("2027-06-30"),
      status: "upcoming",
    },
    {
      awardId: PSGP_AWARD_ID,
      type: "sf425",
      title: "SF-425 Federal Financial Report — H2 2027",
      dueDate: new Date("2028-01-30"),
      periodStart: new Date("2027-07-01"),
      periodEnd: new Date("2027-12-31"),
      status: "upcoming",
    },
    {
      awardId: PSGP_AWARD_ID,
      type: "sf425",
      title: "SF-425 Federal Financial Report — H1 2028",
      dueDate: new Date("2028-07-30"),
      periodStart: new Date("2028-01-01"),
      periodEnd: new Date("2028-06-30"),
      status: "upcoming",
    },

    // SF-270 Reimbursement Requests
    {
      awardId: PSGP_AWARD_ID,
      type: "sf270",
      title: "SF-270 Request for Advance or Reimbursement — H2 2026",
      dueDate: new Date("2027-01-30"),
      periodStart: new Date("2026-07-01"),
      periodEnd: new Date("2026-12-31"),
      status: "upcoming",
    },
    {
      awardId: PSGP_AWARD_ID,
      type: "sf270",
      title: "SF-270 Request for Advance or Reimbursement — H1 2027",
      dueDate: new Date("2027-07-30"),
      periodStart: new Date("2027-01-01"),
      periodEnd: new Date("2027-06-30"),
      status: "upcoming",
    },

    // Environmental & Historic Preservation (EHP) compliance report
    {
      awardId: PSGP_AWARD_ID,
      type: "ehp",
      title:
        "EHP Screening & Compliance Report — Initial Submission",
      dueDate: new Date("2026-09-30"),
      periodStart: new Date("2026-07-01"),
      periodEnd: new Date("2026-09-30"),
      status: "in_progress",
      notes:
        "EHP review forms submitted to FEMA GPD. Physical security construction items require EHP clearance before obligation.",
    },

    // Single Audit / SEFA
    {
      awardId: PSGP_AWARD_ID,
      type: "sefa",
      title:
        "Schedule of Expenditures of Federal Awards (SEFA) — FY2027",
      dueDate: new Date("2028-03-31"),
      periodStart: new Date("2026-10-01"),
      periodEnd: new Date("2027-09-30"),
      status: "upcoming",
    },
  ];

  for (const report of reports) {
    await prisma.scheduledReport.create({ data: report });
  }
  console.log(`  ✓ ${reports.length} scheduled reports seeded`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. SUBRECIPIENTS
// ═══════════════════════════════════════════════════════════════════════════════

async function seedSubrecipients() {
  console.log("Seeding subrecipients...");

  const subs = [
    {
      id: SUB_IDS.sheriffOffice,
      awardId: PSGP_AWARD_ID,
      entityName: "Brazoria County Sheriff's Office — Marine Division",
      uei: "VC8MPQR3D4N7",
      classification: "subrecipient",
      classificationAnswers: [
        { questionId: "q1", answer: true },
        { questionId: "q2", answer: true },
        { questionId: "q3", answer: true },
        { questionId: "q4", answer: false },
        { questionId: "q5", answer: true },
      ],
      riskLevel: "standard",
      riskFactors: {
        newEntity: false,
        priorFindings: false,
        highSpend: false,
        noSingleAudit: false,
        lateReporting: false,
      },
      monitoringIntensity: "standard",
      subawardAmount: 180_000,
      cumulativeSpend: 0,
      singleAuditRequired: false,
      expenseReportingMode: "lump_sum",
      status: "active",
    },
    {
      id: SUB_IDS.secureportTech,
      awardId: PSGP_AWARD_ID,
      entityName: "SecurePort Technologies Inc.",
      uei: "HN5JKLT9W2X3",
      classification: "contractor",
      classificationAnswers: [
        { questionId: "q1", answer: false },
        { questionId: "q2", answer: false },
        { questionId: "q3", answer: false },
        { questionId: "q4", answer: false },
        { questionId: "q5", answer: false },
      ],
      riskLevel: "standard",
      riskFactors: {
        newEntity: true,
        priorFindings: false,
        highSpend: false,
        noSingleAudit: false,
        lateReporting: false,
      },
      monitoringIntensity: "standard",
      subawardAmount: 380_000,
      cumulativeSpend: 0,
      singleAuditRequired: false,
      expenseReportingMode: "line_item",
      status: "active",
    },
  ];

  for (const sub of subs) {
    await prisma.subrecipient.create({ data: sub });
  }
  console.log(`  ✓ ${subs.length} subrecipients seeded`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8. SUBRECIPIENT REPORTS
// ═══════════════════════════════════════════════════════════════════════════════

async function seedSubrecipientReports() {
  console.log("Seeding subrecipient reports...");

  const reports = [
    {
      subrecipientId: SUB_IDS.sheriffOffice,
      reportType: "progress",
      title: "Quarterly Progress Report — Q3 2026",
      dueDate: new Date("2026-10-15"),
      status: "pending",
      notes: "First quarterly report — maritime patrol equipment procurement and training status.",
    },
    {
      subrecipientId: SUB_IDS.sheriffOffice,
      reportType: "financial",
      title: "Quarterly Financial Report — Q3 2026",
      dueDate: new Date("2026-10-15"),
      status: "pending",
    },
    {
      subrecipientId: SUB_IDS.secureportTech,
      reportType: "progress",
      title: "Monthly Deliverable Report — July 2026",
      dueDate: new Date("2026-08-15"),
      status: "pending",
      notes: "Initial assessment deliverable: OT network topology and vulnerability scan results.",
    },
    {
      subrecipientId: SUB_IDS.secureportTech,
      reportType: "progress",
      title: "Monthly Deliverable Report — August 2026",
      dueDate: new Date("2026-09-15"),
      status: "pending",
    },
    {
      subrecipientId: SUB_IDS.secureportTech,
      reportType: "financial",
      title: "Quarterly Financial Report — Q3 2026",
      dueDate: new Date("2026-10-15"),
      status: "pending",
    },
  ];

  for (const report of reports) {
    await prisma.subrecipientReport.create({ data: report });
  }
  console.log(`  ✓ ${reports.length} subrecipient reports seeded`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 9. COMPLIANCE CHECKLISTS
// ═══════════════════════════════════════════════════════════════════════════════

async function seedComplianceChecklists() {
  console.log("Seeding compliance checklists...");

  // PSGP-specific: EHP compliance checklist
  const ehpChecklist = await prisma.complianceChecklist.create({
    data: {
      awardId: PSGP_AWARD_ID,
      template: "ehp",
      title: "Environmental & Historic Preservation (EHP) Compliance",
      status: "in_progress",
      completedItems: 2,
      totalItems: 6,
    },
  });

  const ehpItems = [
    {
      checklistId: ehpChecklist.id,
      section: "Screening",
      requirement: "Submit FEMA EHP Screening Form (FEMA Form 024-0-1) for all construction/installation activities",
      cfrReference: "44 CFR 10",
      isCompleted: true,
      completedAt: new Date("2026-07-08"),
      completedBy: "Chris Hogan",
      notes: "Submitted for TWIC reader installation, barrier system, and CCTV expansion.",
      sortOrder: 1,
    },
    {
      checklistId: ehpChecklist.id,
      section: "Screening",
      requirement: "Identify all project sites on FEMA Flood Insurance Rate Maps (FIRMs)",
      cfrReference: "44 CFR 9",
      isCompleted: true,
      completedAt: new Date("2026-07-05"),
      completedBy: "Chris Hogan",
      notes: "All sites within Zone AE. Elevations documented.",
      sortOrder: 2,
    },
    {
      checklistId: ehpChecklist.id,
      section: "NHPA Section 106",
      requirement: "Determine if project areas contain structures over 50 years old or within historic districts",
      isCompleted: false,
      notes: "Pending Texas Historical Commission coordination.",
      sortOrder: 3,
    },
    {
      checklistId: ehpChecklist.id,
      section: "NEPA",
      requirement: "Confirm Categorical Exclusion (CATEX) applicability or prepare Environmental Assessment",
      cfrReference: "40 CFR 1500-1508",
      isCompleted: false,
      notes: "FEMA GPD reviewing CATEX determination for physical security items.",
      sortOrder: 4,
    },
    {
      checklistId: ehpChecklist.id,
      section: "Coastal Zone",
      requirement: "Obtain Texas Coastal Management Program consistency determination",
      isCompleted: false,
      sortOrder: 5,
    },
    {
      checklistId: ehpChecklist.id,
      section: "Endangered Species",
      requirement: "Complete ESA Section 7 consultation or confirm no-effect determination",
      cfrReference: "50 CFR 402",
      isCompleted: false,
      notes: "USFWS IPaC report generated — no critical habitat identified within project footprint.",
      sortOrder: 6,
    },
  ];

  for (const item of ehpItems) {
    await prisma.complianceChecklistItem.create({ data: item });
  }

  // MTSA Compliance checklist
  const mtsaChecklist = await prisma.complianceChecklist.create({
    data: {
      awardId: PSGP_AWARD_ID,
      template: "mtsa",
      title: "Maritime Transportation Security Act (MTSA) Compliance",
      status: "in_progress",
      completedItems: 3,
      totalItems: 8,
    },
  });

  const mtsaItems = [
    {
      checklistId: mtsaChecklist.id,
      section: "Facility Security Plan",
      requirement: "Update FSP to reflect PSGP-funded security enhancements",
      cfrReference: "33 CFR 105.405",
      isCompleted: true,
      completedAt: new Date("2026-07-02"),
      completedBy: "Chris Hogan",
      notes: "FSP Amendment submitted to USCG Sector Houston-Galveston.",
      sortOrder: 1,
    },
    {
      checklistId: mtsaChecklist.id,
      section: "Facility Security Plan",
      requirement: "Ensure all PSGP investments align with FSP-identified vulnerabilities",
      cfrReference: "33 CFR 105.305",
      isCompleted: true,
      completedAt: new Date("2026-07-01"),
      completedBy: "Chris Hogan",
      notes: "Cross-referenced with 2025 FSP triennial assessment findings.",
      sortOrder: 2,
    },
    {
      checklistId: mtsaChecklist.id,
      section: "TWIC",
      requirement: "Verify TWIC reader installations meet TSA TWIC Reader Hardware and Card Application Specification",
      cfrReference: "33 CFR 105.253",
      isCompleted: true,
      completedAt: new Date("2026-07-08"),
      completedBy: "Jason Cordoba",
      notes: "IDEMIA readers are TSA-certified. Installation plan reviewed.",
      sortOrder: 3,
    },
    {
      checklistId: mtsaChecklist.id,
      section: "TWIC",
      requirement: "Plan TWIC reader acceptance testing and MARSEC level escalation procedures",
      isCompleted: false,
      sortOrder: 4,
    },
    {
      checklistId: mtsaChecklist.id,
      section: "Cybersecurity",
      requirement: "Align cybersecurity investments with NIST Cybersecurity Framework (CSF) 2.0",
      isCompleted: false,
      notes: "Dragos assessment will map OT network to NIST CSF functions.",
      sortOrder: 5,
    },
    {
      checklistId: mtsaChecklist.id,
      section: "Cybersecurity",
      requirement: "Document cyber incident response procedures in FSP Annex",
      cfrReference: "33 CFR 105.405",
      isCompleted: false,
      sortOrder: 6,
    },
    {
      checklistId: mtsaChecklist.id,
      section: "Exercises",
      requirement: "Conduct annual MTSA security drill incorporating PSGP-funded capabilities",
      cfrReference: "33 CFR 105.220",
      isCompleted: false,
      notes: "Tabletop exercise scheduled for July 2026; full-scale drill planned Q4 2026.",
      sortOrder: 7,
    },
    {
      checklistId: mtsaChecklist.id,
      section: "Area Maritime Security",
      requirement: "Report PSGP investments to Area Maritime Security Committee (AMSC)",
      isCompleted: false,
      notes: "Next AMSC meeting scheduled September 2026.",
      sortOrder: 8,
    },
  ];

  for (const item of mtsaItems) {
    await prisma.complianceChecklistItem.create({ data: item });
  }

  console.log("  ✓ 2 compliance checklists seeded (EHP: 6 items, MTSA: 8 items)");
}

// ═══════════════════════════════════════════════════════════════════════════════
// 10. AUDIT FINDINGS (from prior PSGP — carryover)
// ═══════════════════════════════════════════════════════════════════════════════

async function seedAuditFindings() {
  console.log("Seeding audit findings...");

  const finding = await prisma.auditFinding.create({
    data: {
      awardId: PSGP_AWARD_ID,
      auditYear: 2025,
      findingNumber: "2025-PSGP-001",
      title: "Untimely obligation of prior-year PSGP funds",
      description:
        "During the FY2025 single audit, the auditor noted that $127,000 in FY2024 PSGP funds (EMW-2024-PU-00089) were not obligated within the required 12-month obligation period. The delay was attributed to procurement timeline extensions for cybersecurity equipment. Finding resolved via no-cost extension approved by FEMA Region 6.",
      complianceArea: "procurement",
      severity: "low",
      status: "resolved",
    },
  });

  await prisma.correctiveActionPlan.create({
    data: {
      findingId: finding.id,
      action:
        "Implement quarterly procurement milestone tracking with 90-day advance warning for obligation deadlines. Grants Accountant to maintain obligation tracker in Corvo.",
      responsible: "Jason Cordoba, Grants Accountant",
      targetDate: new Date("2026-09-30"),
      status: "completed",
      completedAt: new Date("2026-07-01"),
      evidence: [
        "Obligation tracker configured in Corvo grant management system",
        "Quarterly review calendar entries created for all active PSGP awards",
      ],
    },
  });

  console.log("  ✓ 1 audit finding with corrective action seeded");
}

// ═══════════════════════════════════════════════════════════════════════════════
// 11. CLOSEOUT CHECKLIST (placeholder for future closeout)
// ═══════════════════════════════════════════════════════════════════════════════

async function seedCloseoutChecklist() {
  console.log("Seeding closeout checklist...");

  await prisma.closeoutChecklist.create({
    data: {
      awardId: PSGP_AWARD_ID,
      items: [
        { label: "All funds obligated and expended", completed: false },
        { label: "Final SF-425 submitted", completed: false },
        { label: "Final BSIR submitted", completed: false },
        { label: "Equipment inventory and disposition plan filed", completed: false },
        { label: "Subrecipient closeout letters issued", completed: false },
        { label: "FEMA EHP conditions met and documented", completed: false },
        { label: "Final single audit covering PSGP expenditures completed", completed: false },
        { label: "Records retention plan documented (3 years post-closeout)", completed: false },
        { label: "FEMA closeout letter received", completed: false },
      ],
    },
  });

  console.log("  ✓ Closeout checklist seeded (9 items)");
}

// ═══════════════════════════════════════════════════════════════════════════════
// 12. UPDATE PORT PROFILE — add PSGP to past grant awards
// ═══════════════════════════════════════════════════════════════════════════════

async function updatePortProfile() {
  console.log("Updating port profile with PSGP award reference...");

  const profile = await prisma.portProfile.findUnique({
    where: { id: PROFILE_ID },
    select: { pastGrantAwards: true },
  });

  if (profile) {
    const pastAwards = (profile.pastGrantAwards as Array<Record<string, unknown>>) || [];
    const hasPsgp2026 = pastAwards.some(
      (a) => a.program === "PSGP" && a.awardYear === 2026
    );
    if (!hasPsgp2026) {
      pastAwards.push({
        program: "PSGP",
        awardYear: 2026,
        awardAmount: 2_100_000,
        projectName:
          "FY 2026 Port Security Enhancement — Physical & Cyber Hardening",
        agency: "FEMA",
        status: "Active",
      });

      await prisma.portProfile.update({
        where: { id: PROFILE_ID },
        data: { pastGrantAwards: pastAwards },
      });
      console.log("  ✓ Past grant awards updated");
    } else {
      console.log("  ✓ PSGP 2026 already in past awards — skipped");
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log(
    "\n══════════════════════════════════════════════════════════════"
  );
  console.log(
    "  Seeding FY 2026 PSGP — Port Freeport (freeport-mock profile)"
  );
  console.log(
    "══════════════════════════════════════════════════════════════\n"
  );

  try {
    await cleanup();
    console.log("");
    await seedAward();
    console.log("");
    await seedBudgetCategories();
    console.log("");
    await seedExpenses();
    console.log("");
    await seedMatchLedger();
    console.log("");
    await seedDrawdowns();
    console.log("");
    await seedScheduledReports();
    console.log("");
    await seedSubrecipients();
    console.log("");
    await seedSubrecipientReports();
    console.log("");
    await seedComplianceChecklists();
    console.log("");
    await seedAuditFindings();
    console.log("");
    await seedCloseoutChecklist();
    console.log("");
    await updatePortProfile();

    console.log(
      "\n══════════════════════════════════════════════════════════════"
    );
    console.log("  ✓ FY 2026 PSGP seed complete!");
    console.log("");
    console.log("  Award:          $2,100,000 (EMW-2026-PU-00147)");
    console.log("  Budget cats:    5");
    console.log("  Expenses:       7 ($272,000)");
    console.log("  Match entries:  2 ($350,000 of $700,000 required)");
    console.log("  Drawdowns:      1 (draft)");
    console.log("  Reports:        11 scheduled");
    console.log("  Subrecipients:  2 (Sheriff + SecurePort Technologies)");
    console.log("  Sub reports:    5 pending");
    console.log("  Checklists:     2 (EHP + MTSA)");
    console.log("  Audit findings: 1 (resolved, prior-year)");
    console.log("  Closeout items: 9 (all pending)");
    console.log(
      "══════════════════════════════════════════════════════════════\n"
    );
  } catch (error) {
    console.error("Seed error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    pool.end();
  }
}

main();
