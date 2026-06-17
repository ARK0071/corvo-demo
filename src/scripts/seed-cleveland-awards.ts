/**
 * Seed script for Port of Cleveland — 2 sample awards with full reporting data.
 * Uses PRODUCTION tables only.
 *
 * Run: npx tsx src/scripts/seed-cleveland-awards.ts
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

const SLUG = "port-of-cleveland";

// ─── Deterministic UUIDs ───
const AWARD_IDS = {
  pidp:  "c1e0e1a0-0003-4000-8000-000000000001",
  raise: "c1e0e1a0-0003-4000-8000-000000000002",
};

const BUDGET_CAT_IDS = {
  pidp_bulkhead:     "c1e0e1a0-0004-4000-8000-000000000001",
  pidp_dredging:     "c1e0e1a0-0004-4000-8000-000000000002",
  pidp_utilities:    "c1e0e1a0-0004-4000-8000-000000000003",
  pidp_admin:        "c1e0e1a0-0004-4000-8000-000000000004",
  raise_road:        "c1e0e1a0-0004-4000-8000-000000000005",
  raise_rail:        "c1e0e1a0-0004-4000-8000-000000000006",
  raise_stormwater:  "c1e0e1a0-0004-4000-8000-000000000007",
  raise_engineering: "c1e0e1a0-0004-4000-8000-000000000008",
  raise_admin:       "c1e0e1a0-0004-4000-8000-000000000009",
};

// ═══════════════════════════════════════════════════════════════════════════════
// Resolve the Cleveland portProfileId from the DB
// ═══════════════════════════════════════════════════════════════════════════════

let PROFILE_ID: string;

async function resolveProfileId() {
  const profile = await prisma.portProfile.findUnique({
    where: { slug: SLUG },
    select: { id: true },
  });
  if (!profile) {
    throw new Error(`Port profile with slug "${SLUG}" not found in the database. Seed the profile first.`);
  }
  PROFILE_ID = profile.id;
  console.log(`  Resolved portProfileId: ${PROFILE_ID}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLEANUP — remove any prior Cleveland award data
// ═══════════════════════════════════════════════════════════════════════════════

async function cleanup() {
  console.log("Cleaning up prior Cleveland award data...");

  for (const awardId of Object.values(AWARD_IDS)) {
    for (const table of [
      "corrective_action_plans",
      "audit_findings",
      "compliance_checklist_items",
      "compliance_checklists",
      "subrecipient_reports",
      "subrecipients",
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
          awardId
        );
      } catch {
        // Table may not exist or not have award_id
      }
    }
    try {
      await prisma.$executeRawUnsafe(`DELETE FROM awards WHERE id = $1`, awardId);
    } catch {
      // May not exist
    }
  }

  console.log("  ✓ Cleanup done");
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. AWARDS
// ═══════════════════════════════════════════════════════════════════════════════

async function seedAwards() {
  console.log("Seeding awards...");

  const awards = [
    {
      id: AWARD_IDS.pidp,
      portProfileId: PROFILE_ID,
      fain: "693JF72350028",
      cfda: "20.823",
      awardingAgency: "U.S. Department of Transportation / Maritime Administration",
      program: "PIDP",
      title: "Dock 24 Bulkhead Rehabilitation & Berth Deepening",
      description:
        "Rehabilitation of 1,200 linear feet of bulkhead at Dock 24, dredging the adjacent berth to -28 ft MLW, and modernization of shore-power electrical systems to support Great Lakes vessel operations and accommodate larger Lakers.",
      totalAmount: 12_500_000,
      performancePeriodStart: new Date("2024-10-01"),
      performancePeriodEnd: new Date("2028-09-30"),
      matchPercentage: 20,
      matchTypes: ["cash", "in_kind"],
      matchCommitted: 1_800_000,
      matchRequired: 3_125_000,
      status: "active",
      projectIds: [],
      indirectCostRate: 0.38,
      indirectCostBase: "mtdc",
      indirectCostType: "provisional",
      indirectCostPeriodStart: new Date("2024-01-01"),
      indirectCostPeriodEnd: new Date("2026-12-31"),
    },
    {
      id: AWARD_IDS.raise,
      portProfileId: PROFILE_ID,
      fain: "RAISE-2025-CLE-0042",
      cfda: "20.933",
      awardingAgency: "U.S. Department of Transportation",
      program: "RAISE",
      title: "Cleveland Lakefront Multimodal Connector",
      description:
        "Construction of a 2.4-mile multimodal freight corridor connecting the port's Irishtown Bend terminal to the Norfolk Southern intermodal yard, including road reconstruction, new at-grade rail crossing, and green stormwater infrastructure.",
      totalAmount: 18_750_000,
      performancePeriodStart: new Date("2025-01-15"),
      performancePeriodEnd: new Date("2029-01-14"),
      matchPercentage: 20,
      matchTypes: ["cash"],
      matchCommitted: 2_500_000,
      matchRequired: 4_687_500,
      status: "active",
      projectIds: [],
    },
  ];

  for (const award of awards) {
    await prisma.award.create({ data: award });
    console.log(
      `  Created: ${award.program} — ${award.title.slice(0, 55)}... ($${(Number(award.totalAmount) / 1_000_000).toFixed(1)}M)`
    );
  }
  console.log(`  ✓ ${awards.length} awards seeded`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. BUDGET CATEGORIES
// ═══════════════════════════════════════════════════════════════════════════════

async function seedBudgetCategories() {
  console.log("Seeding budget categories...");

  const cats = [
    // PIDP — Dock 24
    { id: BUDGET_CAT_IDS.pidp_bulkhead, awardId: AWARD_IDS.pidp, name: "Bulkhead Rehabilitation", ceiling: 6_800_000, spent: 3_060_000 },
    { id: BUDGET_CAT_IDS.pidp_dredging, awardId: AWARD_IDS.pidp, name: "Berth Dredging", ceiling: 3_200_000, spent: 960_000 },
    { id: BUDGET_CAT_IDS.pidp_utilities, awardId: AWARD_IDS.pidp, name: "Shore-Power Electrical", ceiling: 1_800_000, spent: 540_000 },
    { id: BUDGET_CAT_IDS.pidp_admin, awardId: AWARD_IDS.pidp, name: "Project Administration", ceiling: 700_000, spent: 280_000 },
    // RAISE — Multimodal Connector
    { id: BUDGET_CAT_IDS.raise_road, awardId: AWARD_IDS.raise, name: "Road Reconstruction", ceiling: 8_400_000, spent: 2_520_000 },
    { id: BUDGET_CAT_IDS.raise_rail, awardId: AWARD_IDS.raise, name: "Rail Crossing & Track", ceiling: 5_200_000, spent: 1_040_000 },
    { id: BUDGET_CAT_IDS.raise_stormwater, awardId: AWARD_IDS.raise, name: "Green Stormwater Infrastructure", ceiling: 2_800_000, spent: 560_000 },
    { id: BUDGET_CAT_IDS.raise_engineering, awardId: AWARD_IDS.raise, name: "Engineering & Design", ceiling: 1_500_000, spent: 1_200_000 },
    { id: BUDGET_CAT_IDS.raise_admin, awardId: AWARD_IDS.raise, name: "Project Management", ceiling: 850_000, spent: 340_000 },
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
    // PIDP — Dock 24
    { awardId: AWARD_IDS.pidp, categoryId: BUDGET_CAT_IDS.pidp_bulkhead, date: new Date("2025-03-15"), description: "Steel sheet pile procurement — 1,200 LF", vendor: "Great Lakes Dock & Materials", amount: 1_450_000, status: "drawn" },
    { awardId: AWARD_IDS.pidp, categoryId: BUDGET_CAT_IDS.pidp_bulkhead, date: new Date("2025-06-20"), description: "Bulkhead driving and tie-back installation — Phase 1", vendor: "Great Lakes Dock & Materials", amount: 980_000, status: "drawn" },
    { awardId: AWARD_IDS.pidp, categoryId: BUDGET_CAT_IDS.pidp_bulkhead, date: new Date("2025-11-01"), description: "Concrete cap beam and fender system", vendor: "Osborn Engineering", amount: 630_000, status: "approved" },
    { awardId: AWARD_IDS.pidp, categoryId: BUDGET_CAT_IDS.pidp_dredging, date: new Date("2025-08-15"), description: "Navigational dredging — 85,000 cubic yards", vendor: "Kokosing Marine", amount: 720_000, status: "drawn" },
    { awardId: AWARD_IDS.pidp, categoryId: BUDGET_CAT_IDS.pidp_dredging, date: new Date("2026-03-10"), description: "Berth over-depth dredging and disposal", vendor: "Kokosing Marine", amount: 240_000, status: "logged" },
    { awardId: AWARD_IDS.pidp, categoryId: BUDGET_CAT_IDS.pidp_utilities, date: new Date("2025-09-01"), description: "Shore-power transformer and switchgear", vendor: "FirstEnergy Solutions", amount: 340_000, status: "approved" },
    { awardId: AWARD_IDS.pidp, categoryId: BUDGET_CAT_IDS.pidp_utilities, date: new Date("2026-01-15"), description: "Cable routing and vessel connection points", vendor: "FirstEnergy Solutions", amount: 200_000, status: "logged" },
    { awardId: AWARD_IDS.pidp, categoryId: BUDGET_CAT_IDS.pidp_admin, date: new Date("2025-04-01"), description: "Q1–Q2 2025 project management and MARAD reporting", vendor: "Port of Cleveland Staff", amount: 140_000, status: "drawn" },
    { awardId: AWARD_IDS.pidp, categoryId: BUDGET_CAT_IDS.pidp_admin, date: new Date("2025-10-01"), description: "Q3–Q4 2025 project management and reporting", vendor: "Port of Cleveland Staff", amount: 140_000, status: "approved" },
    // RAISE — Multimodal Connector
    { awardId: AWARD_IDS.raise, categoryId: BUDGET_CAT_IDS.raise_engineering, date: new Date("2025-04-01"), description: "30% design — road alignment and rail interface", vendor: "AECOM", amount: 650_000, status: "drawn" },
    { awardId: AWARD_IDS.raise, categoryId: BUDGET_CAT_IDS.raise_engineering, date: new Date("2025-09-15"), description: "60% design — utility relocation and stormwater plans", vendor: "AECOM", amount: 550_000, status: "drawn" },
    { awardId: AWARD_IDS.raise, categoryId: BUDGET_CAT_IDS.raise_road, date: new Date("2025-11-01"), description: "Roadway demolition and subgrade preparation", vendor: "The Ruhlin Company", amount: 1_260_000, status: "approved" },
    { awardId: AWARD_IDS.raise, categoryId: BUDGET_CAT_IDS.raise_road, date: new Date("2026-03-15"), description: "Base course and heavy-duty pavement — Phase 1", vendor: "The Ruhlin Company", amount: 1_260_000, status: "logged" },
    { awardId: AWARD_IDS.raise, categoryId: BUDGET_CAT_IDS.raise_rail, date: new Date("2026-01-10"), description: "At-grade crossing pre-construction and NS coordination", vendor: "RailWorks Corporation", amount: 540_000, status: "approved" },
    { awardId: AWARD_IDS.raise, categoryId: BUDGET_CAT_IDS.raise_rail, date: new Date("2026-04-01"), description: "Track construction — 3,200 LF industrial spur", vendor: "RailWorks Corporation", amount: 500_000, status: "logged" },
    { awardId: AWARD_IDS.raise, categoryId: BUDGET_CAT_IDS.raise_stormwater, date: new Date("2025-12-01"), description: "Bioswale installation and retention basin", vendor: "GPD Group", amount: 560_000, status: "approved" },
    { awardId: AWARD_IDS.raise, categoryId: BUDGET_CAT_IDS.raise_admin, date: new Date("2025-06-01"), description: "Q1–Q2 2025 project management and USDOT reporting", vendor: "Port of Cleveland Staff", amount: 170_000, status: "drawn" },
    { awardId: AWARD_IDS.raise, categoryId: BUDGET_CAT_IDS.raise_admin, date: new Date("2025-12-01"), description: "Q3–Q4 2025 project management", vendor: "Port of Cleveland Staff", amount: 170_000, status: "approved" },
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
    { awardId: AWARD_IDS.pidp, date: new Date("2024-12-15"), description: "Port of Cleveland cash contribution — Phase 1", amount: 800_000, type: "cash" },
    { awardId: AWARD_IDS.pidp, date: new Date("2025-06-01"), description: "In-kind: Engineering staff time and project oversight", amount: 250_000, type: "in_kind" },
    { awardId: AWARD_IDS.pidp, date: new Date("2025-11-15"), description: "Port of Cleveland cash contribution — Phase 2", amount: 750_000, type: "cash" },
    { awardId: AWARD_IDS.raise, date: new Date("2025-03-01"), description: "City of Cleveland cash match — road improvements", amount: 1_200_000, type: "cash" },
    { awardId: AWARD_IDS.raise, date: new Date("2025-09-15"), description: "Cuyahoga County cash match — freight corridor", amount: 800_000, type: "cash" },
    { awardId: AWARD_IDS.raise, date: new Date("2026-02-01"), description: "Port of Cleveland cash contribution", amount: 500_000, type: "cash" },
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
    { awardId: AWARD_IDS.pidp, expenseIds: ["PIDP bulkhead + dredging H1 2025"], totalAmount: 3_150_000, status: "payment_received", submittedDate: new Date("2025-07-15"), approvedDate: new Date("2025-08-05"), paymentDate: new Date("2025-08-22"), notes: "H1 FY2025 drawdown — bulkhead steel and dredging" },
    { awardId: AWARD_IDS.pidp, expenseIds: ["PIDP bulkhead + utilities H2 2025"], totalAmount: 1_110_000, status: "submitted", submittedDate: new Date("2026-01-20"), notes: "H2 FY2025 drawdown — concrete cap, shore-power, and admin" },
    { awardId: AWARD_IDS.raise, expenseIds: ["RAISE engineering FY2025"], totalAmount: 1_200_000, status: "payment_received", submittedDate: new Date("2025-10-15"), approvedDate: new Date("2025-11-01"), paymentDate: new Date("2025-11-18"), notes: "FY2025 engineering design drawdown" },
    { awardId: AWARD_IDS.raise, expenseIds: ["RAISE road + stormwater Q4 2025"], totalAmount: 1_990_000, status: "submitted", submittedDate: new Date("2026-02-10"), notes: "Q4 2025 construction and stormwater drawdown" },
    { awardId: AWARD_IDS.raise, expenseIds: ["RAISE rail Q1 2026"], totalAmount: 540_000, status: "draft", notes: "Pending review — rail crossing pre-construction" },
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
    // PIDP — Dock 24
    { awardId: AWARD_IDS.pidp, type: "sf425", title: "SF-425 Federal Financial Report — Q1 2025", dueDate: new Date("2025-04-30"), periodStart: new Date("2025-01-01"), periodEnd: new Date("2025-03-31"), status: "submitted", submittedDate: new Date("2025-04-27") },
    { awardId: AWARD_IDS.pidp, type: "progress", title: "Quarterly Progress Report — Q1 2025", dueDate: new Date("2025-04-30"), periodStart: new Date("2025-01-01"), periodEnd: new Date("2025-03-31"), status: "submitted", submittedDate: new Date("2025-04-28") },
    { awardId: AWARD_IDS.pidp, type: "sf425", title: "SF-425 Federal Financial Report — Q2 2025", dueDate: new Date("2025-07-31"), periodStart: new Date("2025-04-01"), periodEnd: new Date("2025-06-30"), status: "submitted", submittedDate: new Date("2025-07-28") },
    { awardId: AWARD_IDS.pidp, type: "progress", title: "Quarterly Progress Report — Q2 2025", dueDate: new Date("2025-07-31"), periodStart: new Date("2025-04-01"), periodEnd: new Date("2025-06-30"), status: "submitted", submittedDate: new Date("2025-07-30") },
    { awardId: AWARD_IDS.pidp, type: "sf425", title: "SF-425 Federal Financial Report — Q2 2026", dueDate: new Date("2026-07-31"), periodStart: new Date("2026-04-01"), periodEnd: new Date("2026-06-30"), status: "in_progress", notes: "Draft financials under review" },
    { awardId: AWARD_IDS.pidp, type: "progress", title: "Quarterly Progress Report — Q2 2026", dueDate: new Date("2026-07-31"), periodStart: new Date("2026-04-01"), periodEnd: new Date("2026-06-30"), status: "drafting", notes: "Construction progress narrative in progress" },
    { awardId: AWARD_IDS.pidp, type: "sf425", title: "SF-425 Federal Financial Report — Q3 2026", dueDate: new Date("2026-10-31"), periodStart: new Date("2026-07-01"), periodEnd: new Date("2026-09-30"), status: "upcoming" },
    { awardId: AWARD_IDS.pidp, type: "sefa", title: "SEFA — FY2025", dueDate: new Date("2026-03-31"), periodStart: new Date("2024-10-01"), periodEnd: new Date("2025-09-30"), status: "submitted", submittedDate: new Date("2026-03-28") },
    // RAISE — Multimodal Connector
    { awardId: AWARD_IDS.raise, type: "sf425", title: "SF-425 Federal Financial Report — H1 2025", dueDate: new Date("2025-07-31"), periodStart: new Date("2025-01-15"), periodEnd: new Date("2025-06-30"), status: "submitted", submittedDate: new Date("2025-07-29") },
    { awardId: AWARD_IDS.raise, type: "progress", title: "Semi-Annual Progress Report — H1 2025", dueDate: new Date("2025-07-31"), periodStart: new Date("2025-01-15"), periodEnd: new Date("2025-06-30"), status: "submitted", submittedDate: new Date("2025-07-30") },
    { awardId: AWARD_IDS.raise, type: "sf425", title: "SF-425 Federal Financial Report — H1 2026", dueDate: new Date("2026-07-31"), periodStart: new Date("2026-01-01"), periodEnd: new Date("2026-06-30"), status: "in_progress", notes: "Compiling construction expenditures" },
    { awardId: AWARD_IDS.raise, type: "progress", title: "Semi-Annual Progress Report — H1 2026", dueDate: new Date("2026-07-31"), periodStart: new Date("2026-01-01"), periodEnd: new Date("2026-06-30"), status: "drafting" },
    { awardId: AWARD_IDS.raise, type: "sf425", title: "SF-425 Federal Financial Report — H2 2026", dueDate: new Date("2027-01-31"), periodStart: new Date("2026-07-01"), periodEnd: new Date("2026-12-31"), status: "upcoming" },
    { awardId: AWARD_IDS.raise, type: "single_audit", title: "Single Audit Report — FY2025", dueDate: new Date("2027-03-31"), periodStart: new Date("2024-10-01"), periodEnd: new Date("2025-09-30"), status: "in_progress", notes: "External auditor fieldwork scheduled" },
  ];

  for (const report of reports) {
    await prisma.scheduledReport.create({ data: report });
  }
  console.log(`  ✓ ${reports.length} scheduled reports seeded`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. BUDGET MODIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

async function seedBudgetModifications() {
  console.log("Seeding budget modifications...");

  await prisma.budgetModification.create({
    data: {
      awardId: AWARD_IDS.pidp,
      fromCategoryId: BUDGET_CAT_IDS.pidp_admin,
      toCategoryId: BUDGET_CAT_IDS.pidp_bulkhead,
      amount: 50_000,
      justification:
        "Administrative costs running under budget. Additional bulkhead tie-back anchors required due to soil conditions encountered during pile driving.",
      status: "approved",
      requestedDate: new Date("2025-08-15"),
      approvedDate: new Date("2025-09-02"),
    },
  });

  console.log("  ✓ 1 budget modification seeded");
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log("\n══════════════════════════════════════════════════════════════");
  console.log("  Seeding Port of Cleveland Awards — Production Tables");
  console.log("══════════════════════════════════════════════════════════════\n");

  try {
    await resolveProfileId();
    await cleanup();                console.log("");
    await seedAwards();             console.log("");
    await seedBudgetCategories();   console.log("");
    await seedExpenses();           console.log("");
    await seedMatchLedger();        console.log("");
    await seedDrawdowns();          console.log("");
    await seedBudgetModifications(); console.log("");
    await seedScheduledReports();

    console.log("\n══════════════════════════════════════════════════════════════");
    console.log("  ✓ Port of Cleveland awards seed complete!");
    console.log("══════════════════════════════════════════════════════════════\n");
  } catch (error) {
    console.error("Seed error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    pool.end();
  }
}

main();
