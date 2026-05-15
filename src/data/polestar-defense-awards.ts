/**
 * Polestar Defense — Active Contract & Grant Awards
 *
 * Five awards spanning Navy SBIR, ONR BAA, AFWERX OTA, Army SBIR, and DARPA.
 * Budget categories follow defense contract norms (direct labor, fringe,
 * subcontracts, materials, travel, ODC, indirect/overhead).
 *
 * Match requirements:
 *   - SBIR/BAA: 0% (100% government funded)
 *   - OTA (SHADOWHAWK): 25% industry cost-share required
 *   - DARPA TTO (AURORA): 10% cost-share required
 */

import type { Award, BudgetCategory, MatchLedgerEntry, Expense, DrawdownRequest, BudgetModification } from "./awards";

// ─── Awards ──────────────────────────────────────────────────────────────────

export const polestarDefenseAwards: Award[] = [
  // ── Award 1: Navy SBIR Phase II — TRITON AUV ($1.875M) ──
  {
    id: "award-navy-triton",
    fain: "N68335-22-C-0187",
    cfda: "12.300",
    awardingAgency: "U.S. Department of the Navy / Naval Sea Systems Command (NAVSEA)",
    program: "Navy SBIR Phase II",
    title: "TRITON AUV Mine Countermeasures System",
    description:
      "Development and delivery of two TRITON autonomous underwater vehicle prototypes for Navy mine countermeasures operations. Includes at-sea testing at NSWC Panama City and Phase III transition plan for LCS Mission Module program of record.",
    totalAmount: 1_875_000,
    budgetCategories: [
      { id: "triton-labor", name: "Direct Labor", ceiling: 920_000, spent: 736_000 },
      { id: "triton-fringe", name: "Fringe Benefits (38%)", ceiling: 349_600, spent: 279_680 },
      { id: "triton-materials", name: "Materials & Components", ceiling: 285_000, spent: 199_500 },
      { id: "triton-subcontracts", name: "Subcontracts", ceiling: 145_000, spent: 101_500 },
      { id: "triton-travel", name: "Travel (NSWC Panama City)", ceiling: 62_000, spent: 37_200 },
      { id: "triton-odc", name: "Other Direct Costs", ceiling: 38_400, spent: 19_200 },
      { id: "triton-indirect", name: "Overhead & G&A (82%)", ceiling: 75_000, spent: 55_000 },
    ],
    performancePeriod: { start: "2022-09-01", end: "2025-08-31" },
    matchRequirement: { percentage: 0, types: [], committed: 0, required: 0 },
    matchLedger: [],
    status: "active",
    projectIds: ["psd-triton-auv"],
    indirectCostRate: 82.0,
    indirectCostBase: "Direct Labor",
    indirectCostType: "predetermined",
    indirectCostPeriodStart: "2022-01-01",
    indirectCostPeriodEnd: "2025-12-31",
    nicraDocumentUrl: null,
    createdAt: "2022-08-15T00:00:00.000Z",
  },

  // ── Award 2: ONR BAA — NAVIGATOR Maritime Domain Awareness ($7.4M) ──
  {
    id: "award-onr-navigator",
    fain: "N00014-23-C-2041",
    cfda: "12.300",
    awardingAgency: "U.S. Department of the Navy / Office of Naval Research (ONR)",
    program: "ONR BAA",
    title: "NAVIGATOR AI-Enabled Maritime Domain Awareness Platform",
    description:
      "Applied research and prototype development of an AI/ML sensor fusion platform integrating AIS, radar, EO/IR, acoustic, and SIGINT feeds for near-real-time maritime behavioral anomaly detection and vessel classification. Research partner: University of Washington Applied Physics Laboratory.",
    totalAmount: 7_400_000,
    budgetCategories: [
      { id: "nav-labor", name: "Direct Labor", ceiling: 2_960_000, spent: 888_000 },
      { id: "nav-fringe", name: "Fringe Benefits (38%)", ceiling: 1_124_800, spent: 337_440 },
      { id: "nav-subcontracts", name: "APL-UW Subcontract", ceiling: 1_480_000, spent: 370_000 },
      { id: "nav-compute", name: "HPC & Cloud Compute", ceiling: 592_000, spent: 118_400 },
      { id: "nav-materials", name: "Materials & Test Equipment", ceiling: 444_000, spent: 88_800 },
      { id: "nav-travel", name: "Travel & Conferences", ceiling: 148_000, spent: 29_600 },
      { id: "nav-odc", name: "Other Direct Costs", ceiling: 222_000, spent: 44_400 },
      { id: "nav-indirect", name: "Overhead & G&A", ceiling: 429_200, spent: 118_880 },
    ],
    performancePeriod: { start: "2023-03-01", end: "2026-02-28" },
    matchRequirement: { percentage: 0, types: [], committed: 0, required: 0 },
    matchLedger: [],
    status: "active",
    projectIds: ["psd-navigator-mda"],
    indirectCostRate: 82.0,
    indirectCostBase: "Direct Labor",
    indirectCostType: "predetermined",
    indirectCostPeriodStart: "2023-01-01",
    indirectCostPeriodEnd: "2025-12-31",
    nicraDocumentUrl: null,
    createdAt: "2023-02-10T00:00:00.000Z",
  },

  // ── Award 3: AFWERX OTA — SHADOWHAWK Electronic Attack ($11.2M, 25% cost-share) ──
  {
    id: "award-afwerx-shadowhawk",
    fain: "FA8750-24-9-0023",
    cfda: "N/A — OTA Agreement",
    awardingAgency: "U.S. Air Force / AFWERX (AFLCMC/EW)",
    program: "AFWERX OTA",
    title: "SHADOWHAWK Miniaturized Airborne Electronic Attack Pod",
    description:
      "Other Transaction Authority (OTA) prototype agreement to develop a miniaturized, software-defined electronic attack pod for F-16, F/A-18, and MQ-9 platforms. 75% government share ($8.4M); 25% Polestar cost-share ($2.8M). Raytheon Intelligence & Space subcontract for transmitter subsystem.",
    totalAmount: 8_400_000, // government portion only (75%)
    budgetCategories: [
      { id: "shadow-prime-labor", name: "Prime Contractor Labor", ceiling: 3_360_000, spent: 336_000 },
      { id: "shadow-fringe", name: "Fringe Benefits", ceiling: 1_276_800, spent: 127_680 },
      { id: "shadow-raytheon", name: "Raytheon Transmitter Subcontract", ceiling: 2_100_000, spent: 420_000 },
      { id: "shadow-materials", name: "Materials & EW Components", ceiling: 840_000, spent: 168_000 },
      { id: "shadow-test", name: "System Integration & Test", ceiling: 504_000, spent: 0 },
      { id: "shadow-travel", name: "Travel & Range Access", ceiling: 168_000, spent: 25_200 },
      { id: "shadow-pm", name: "Program Management", ceiling: 151_200, spent: 25_200 },
    ],
    performancePeriod: { start: "2024-01-15", end: "2027-01-14" },
    matchRequirement: { percentage: 25, types: ["cash", "in_kind"], committed: 980_000, required: 2_800_000 },
    matchLedger: [
      { id: "ml-shw-1", date: "2024-02-01", description: "Polestar IR&D investment — SDR waveform platform (prior period)", amount: 480_000, type: "in_kind" },
      { id: "ml-shw-2", date: "2024-06-01", description: "Corporate cash contribution — PDR engineering sprint", amount: 500_000, type: "cash" },
    ],
    status: "active",
    projectIds: ["psd-shadowhawk-ew"],
    indirectCostRate: 82.0,
    indirectCostBase: "Direct Labor",
    indirectCostType: "predetermined",
    indirectCostPeriodStart: "2024-01-01",
    indirectCostPeriodEnd: "2026-12-31",
    nicraDocumentUrl: null,
    createdAt: "2024-01-10T00:00:00.000Z",
  },

  // ── Award 4: Army SBIR Phase II — CIPHER-TAC ($1.75M, closeout) ──
  {
    id: "award-army-cipher",
    fain: "W911QX-22-C-0043",
    cfda: "12.300",
    awardingAgency: "U.S. Army / DEVCOM C5ISR Center",
    program: "Army SBIR Phase II",
    title: "CIPHER-TAC Tactical Encryption System for DDIL Environments",
    description:
      "Development and delivery of CIPHER-TAC, a Type 1-certifiable hardware security module for encrypted tactical communications in denied/degraded/intermittent/limited environments. All deliverables accepted by Army PM WIN-T. Awaiting final invoice approval and contract closeout.",
    totalAmount: 1_750_000,
    budgetCategories: [
      { id: "cipher-labor", name: "Direct Labor", ceiling: 857_500, spent: 857_500 },
      { id: "cipher-fringe", name: "Fringe Benefits (38%)", ceiling: 325_850, spent: 325_850 },
      { id: "cipher-materials", name: "Materials & HSM Components", ceiling: 262_500, spent: 255_000 },
      { id: "cipher-subcontracts", name: "Subcontracts (NSA eval support)", ceiling: 105_000, spent: 98_000 },
      { id: "cipher-travel", name: "Travel (Fort Gordon / APG)", ceiling: 52_500, spent: 51_200 },
      { id: "cipher-odc", name: "Other Direct Costs", ceiling: 52_500, spent: 50_800 },
      { id: "cipher-indirect", name: "Overhead & G&A", ceiling: 94_150, spent: 94_150 },
    ],
    performancePeriod: { start: "2022-05-01", end: "2025-04-30" },
    matchRequirement: { percentage: 0, types: [], committed: 0, required: 0 },
    matchLedger: [],
    status: "closeout_pending",
    projectIds: ["psd-cipher-tac"],
    indirectCostRate: 82.0,
    indirectCostBase: "Direct Labor",
    indirectCostType: "predetermined",
    indirectCostPeriodStart: "2022-01-01",
    indirectCostPeriodEnd: "2025-12-31",
    nicraDocumentUrl: null,
    createdAt: "2022-04-15T00:00:00.000Z",
  },

  // ── Award 5: DARPA TTO — AURORA Autonomous Surface Vessel ($4.8M, 10% cost-share) ──
  {
    id: "award-darpa-aurora",
    fain: "HR001123C0156",
    cfda: "12.910",
    awardingAgency: "U.S. Department of Defense / Defense Advanced Research Projects Agency (DARPA)",
    program: "DARPA TTO",
    title: "AURORA Extra-Large Autonomous Surface Vessel for Persistent Maritime Surveillance",
    description:
      "Research contract for design and prototype development of AURORA, a 90-day endurance autonomous surface vessel with multi-modal sensing, onboard AI for rules-of-engagement-compliant operations, and autonomous teaming capability. 90% government funded ($4.32M); 10% Polestar cost-share ($480K in IR&D).",
    totalAmount: 4_320_000, // government portion (90%)
    budgetCategories: [
      { id: "aurora-labor", name: "Direct Labor", ceiling: 1_728_000, spent: 259_200 },
      { id: "aurora-fringe", name: "Fringe Benefits (38%)", ceiling: 656_640, spent: 98_496 },
      { id: "aurora-pms-sub", name: "Pacific Maritime Sciences Subcontract", ceiling: 864_000, spent: 172_800 },
      { id: "aurora-materials", name: "Hull Materials & Sensors", ceiling: 518_400, spent: 51_840 },
      { id: "aurora-compute", name: "Autonomy HW & Edge Compute", ceiling: 259_200, spent: 25_920 },
      { id: "aurora-travel", name: "Travel & Sea Trials Prep", ceiling: 172_800, spent: 17,280 },
      { id: "aurora-indirect", name: "Overhead & G&A", ceiling: 120_960, spent: 18_144 },
    ],
    performancePeriod: { start: "2023-08-01", end: "2026-07-31" },
    matchRequirement: { percentage: 10, types: ["in_kind"], committed: 480_000, required: 480_000 },
    matchLedger: [
      { id: "ml-aurora-1", date: "2023-09-01", description: "Polestar IR&D contribution — autonomous teaming SW (prior research)", amount: 480_000, type: "in_kind" },
    ],
    status: "active",
    projectIds: ["psd-aurora-usv"],
    indirectCostRate: 82.0,
    indirectCostBase: "Direct Labor",
    indirectCostType: "predetermined",
    indirectCostPeriodStart: "2023-01-01",
    indirectCostPeriodEnd: "2025-12-31",
    nicraDocumentUrl: null,
    createdAt: "2023-07-20T00:00:00.000Z",
  },
];

// ─── Expenses ─────────────────────────────────────────────────────────────────

export const polestarDefenseExpenses: Omit<Expense, "id" | "createdAt">[] = [
  // TRITON AUV — hull, electronics, at-sea prep
  { awardId: "award-navy-triton", categoryId: "triton-labor", date: "2023-06-30", description: "Direct labor — AUV systems engineering (Q3 FY2023)", vendor: "Polestar Defense Staff", amount: 245_000, status: "drawn", attachments: ["labor-triton-q3fy23.pdf"] },
  { awardId: "award-navy-triton", categoryId: "triton-materials", date: "2023-09-15", description: "Pressure hull aluminum alloy stock and machining", vendor: "Pacific Precision Machining", amount: 89_500, status: "drawn", attachments: ["inv-ppm-0915.pdf"] },
  { awardId: "award-navy-triton", categoryId: "triton-labor", date: "2024-03-31", description: "Direct labor — GNC algorithm development and HW integration (Q2 FY2024)", vendor: "Polestar Defense Staff", amount: 210_000, status: "drawn", attachments: ["labor-triton-q2fy24.pdf"] },
  { awardId: "award-navy-triton", categoryId: "triton-subcontracts", date: "2024-02-01", description: "Sonar transducer design — NUWC Newport consulting", vendor: "Naval Undersea Warfare Center Newport (NUWC)", amount: 95_000, status: "drawn", attachments: ["inv-nuwc-0201.pdf"] },
  { awardId: "award-navy-triton", categoryId: "triton-materials", date: "2024-06-10", description: "Lithium-ion battery pack and thermal management assembly", vendor: "EaglePicher Technologies", amount: 64_000, status: "approved", attachments: ["inv-ep-0610.pdf"] },
  { awardId: "award-navy-triton", categoryId: "triton-labor", date: "2024-09-30", description: "Direct labor — prototype assembly and functional testing (Q4 FY2024)", vendor: "Polestar Defense Staff", amount: 181_000, status: "approved", attachments: ["labor-triton-q4fy24.pdf"] },
  { awardId: "award-navy-triton", categoryId: "triton-travel", date: "2025-01-15", description: "Travel — NSWC Panama City range coordination site visit", vendor: "Polestar Defense Staff", amount: 18_600, status: "logged", attachments: ["travel-pcola-jan25.pdf"] },

  // NAVIGATOR — research and HPC compute
  { awardId: "award-onr-navigator", categoryId: "nav-labor", date: "2023-06-30", description: "Direct labor — data architecture and pipeline development (Q2 FY2023)", vendor: "Polestar Defense Staff", amount: 296_000, status: "drawn", attachments: ["labor-nav-q2fy23.pdf"] },
  { awardId: "award-onr-navigator", categoryId: "nav-subcontracts", date: "2023-09-01", description: "APL-UW subcontract — transformer model baseline research", vendor: "University of Washington Applied Physics Laboratory", amount: 185_000, status: "drawn", attachments: ["inv-apluw-0901.pdf"] },
  { awardId: "award-onr-navigator", categoryId: "nav-compute", date: "2024-01-31", description: "AWS GovCloud HPC cluster — ML training compute (6 months)", vendor: "Amazon Web Services (GovCloud)", amount: 59_200, status: "drawn", attachments: ["aws-invoice-jan24.pdf"] },
  { awardId: "award-onr-navigator", categoryId: "nav-labor", date: "2024-03-31", description: "Direct labor — AI model training and evaluation (Q2 FY2024)", vendor: "Polestar Defense Staff", amount: 296_000, status: "approved", attachments: ["labor-nav-q2fy24.pdf"] },
  { awardId: "award-onr-navigator", categoryId: "nav-subcontracts", date: "2024-06-30", description: "APL-UW subcontract — AIS spoofing detection dataset development", vendor: "University of Washington Applied Physics Laboratory", amount: 185_000, status: "approved", attachments: ["inv-apluw-0630.pdf"] },
  { awardId: "award-onr-navigator", categoryId: "nav-materials", date: "2024-11-01", description: "Prototype sensor integration kit (radar + EO/IR) for lab testbed", vendor: "Hensoldt US", amount: 88_800, status: "logged", attachments: ["inv-hensoldt-1101.pdf"] },

  // SHADOWHAWK — early design phase
  { awardId: "award-afwerx-shadowhawk", categoryId: "shadow-prime-labor", date: "2024-03-31", description: "Direct labor — SRR preparation and EW system architecture (Q1 FY2024)", vendor: "Polestar Defense Staff", amount: 168_000, status: "drawn", attachments: ["labor-shadow-q1fy24.pdf"] },
  { awardId: "award-afwerx-shadowhawk", categoryId: "shadow-raytheon", date: "2024-07-01", description: "Raytheon — transmitter subsystem preliminary design and GFI review", vendor: "Raytheon Intelligence & Space", amount: 210_000, status: "drawn", attachments: ["inv-ray-0701.pdf"] },
  { awardId: "award-afwerx-shadowhawk", categoryId: "shadow-materials", date: "2024-08-15", description: "EW hardware components — SDR evaluation kits and RF front-end modules", vendor: "Analog Devices Inc.", amount: 84_000, status: "approved", attachments: ["inv-adi-0815.pdf"] },
  { awardId: "award-afwerx-shadowhawk", categoryId: "shadow-prime-labor", date: "2024-09-30", description: "Direct labor — PDR preparation, waveform design (Q3 FY2024)", vendor: "Polestar Defense Staff", amount: 168_000, status: "logged", attachments: ["labor-shadow-q3fy24.pdf"] },

  // CIPHER-TAC — nearly complete (closeout)
  { awardId: "award-army-cipher", categoryId: "cipher-labor", date: "2023-06-30", description: "Direct labor — HSM firmware and crypto algorithm integration", vendor: "Polestar Defense Staff", amount: 285_833, status: "drawn", attachments: ["labor-cipher-fy23.pdf"] },
  { awardId: "award-army-cipher", categoryId: "cipher-materials", date: "2023-09-01", description: "NSA-certified HSM evaluation units (3 units)", vendor: "Entrust nShield", amount: 127_500, status: "drawn", attachments: ["inv-entrust-0901.pdf"] },
  { awardId: "award-army-cipher", categoryId: "cipher-subcontracts", date: "2024-02-01", description: "NSA Commercial Solutions for Classified (CSfC) evaluation support", vendor: "Booz Allen Hamilton", amount: 98_000, status: "drawn", attachments: ["inv-bah-0201.pdf"] },
  { awardId: "award-army-cipher", categoryId: "cipher-labor", date: "2024-09-30", description: "Direct labor — final integration, PM WIN-T delivery, and closeout", vendor: "Polestar Defense Staff", amount: 285_834, status: "approved", attachments: ["labor-cipher-fy24final.pdf"] },
  { awardId: "award-army-cipher", categoryId: "cipher-odc", date: "2025-01-15", description: "Closeout documentation and final report preparation", vendor: "Polestar Defense Staff", amount: 50_800, status: "logged", attachments: ["closeout-cipher-jan25.pdf"] },

  // AURORA — early design
  { awardId: "award-darpa-aurora", categoryId: "aurora-labor", date: "2023-11-30", description: "Direct labor — hull form trade study and autonomous architecture design", vendor: "Polestar Defense Staff", amount: 129_600, status: "drawn", attachments: ["labor-aurora-q1fy24.pdf"] },
  { awardId: "award-darpa-aurora", categoryId: "aurora-pms-sub", date: "2024-01-15", description: "Pacific Maritime Sciences — hull hydrodynamics and structural design", vendor: "Pacific Maritime Sciences LLC", amount: 86_400, status: "drawn", attachments: ["inv-pms-0115.pdf"] },
  { awardId: "award-darpa-aurora", categoryId: "aurora-labor", date: "2024-06-30", description: "Direct labor — sensor suite selection and autonomy stack integration plan", vendor: "Polestar Defense Staff", amount: 129_600, status: "approved", attachments: ["labor-aurora-q3fy24.pdf"] },
  { awardId: "award-darpa-aurora", categoryId: "aurora-pms-sub", date: "2024-08-01", description: "Pacific Maritime Sciences — detailed structural analysis and production drawings", vendor: "Pacific Maritime Sciences LLC", amount: 86_400, status: "logged", attachments: ["inv-pms-0801.pdf"] },
];

// ─── Drawdowns ────────────────────────────────────────────────────────────────

export const polestarDefenseDrawdowns: Omit<DrawdownRequest, "id" | "createdAt">[] = [
  {
    awardId: "award-navy-triton",
    expenseIds: ["exp-seed-001", "exp-seed-002", "exp-seed-003", "exp-seed-004"],
    totalAmount: 724_500,
    status: "payment_received",
    submittedDate: "2024-01-10",
    approvedDate: "2024-01-28",
    paymentDate: "2024-02-15",
    notes: "Interim voucher #2 — hull fabrication, labor, and NUWC subcontract",
  },
  {
    awardId: "award-onr-navigator",
    expenseIds: ["exp-seed-008", "exp-seed-009", "exp-seed-010"],
    totalAmount: 540_200,
    status: "payment_received",
    submittedDate: "2024-02-05",
    approvedDate: "2024-02-20",
    paymentDate: "2024-03-08",
    notes: "Interim voucher #1 — labor, APL-UW subcontract, HPC compute",
  },
  {
    awardId: "award-afwerx-shadowhawk",
    expenseIds: ["exp-seed-015", "exp-seed-016"],
    totalAmount: 378_000,
    status: "approved",
    submittedDate: "2024-09-15",
    approvedDate: "2024-10-01",
    notes: "Invoice #1 — Q1-Q2 prime labor and Raytheon preliminary design",
  },
  {
    awardId: "award-army-cipher",
    expenseIds: ["exp-seed-019", "exp-seed-020", "exp-seed-021"],
    totalAmount: 809_333,
    status: "payment_received",
    submittedDate: "2024-06-01",
    approvedDate: "2024-06-15",
    paymentDate: "2024-06-30",
    notes: "Penultimate invoice — labor, HSM components, NSA eval subcontract",
  },
  {
    awardId: "award-army-cipher",
    expenseIds: ["exp-seed-022"],
    totalAmount: 285_834,
    status: "submitted",
    submittedDate: "2025-01-20",
    notes: "Final invoice — closeout labor and deliverable acceptance",
  },
  {
    awardId: "award-darpa-aurora",
    expenseIds: ["exp-seed-025", "exp-seed-026"],
    totalAmount: 216_000,
    status: "payment_received",
    submittedDate: "2024-03-01",
    approvedDate: "2024-03-15",
    paymentDate: "2024-04-01",
    notes: "Invoice #1 — concept design labor and Pacific Maritime Sciences hull study",
  },
  {
    awardId: "award-navy-triton",
    expenseIds: ["exp-seed-005", "exp-seed-006"],
    totalAmount: 199_600,
    status: "draft",
    notes: "Interim voucher #3 — battery pack, Q4 FY2024 labor (pending PM approval)",
  },
];

// ─── Budget Modifications ──────────────────────────────────────────────────────

export const polestarDefenseBudgetMods: Omit<BudgetModification, "id">[] = [
  {
    awardId: "award-navy-triton",
    fromCategoryId: "triton-odc",
    toCategoryId: "triton-materials",
    amount: 15_000,
    justification:
      "ODC running below budget; additional acoustic transducer housings required for second prototype unit after design change in rev C hull.",
    status: "approved",
    requestedDate: "2024-05-10",
    approvedDate: "2024-05-24",
  },
  {
    awardId: "award-onr-navigator",
    fromCategoryId: "nav-travel",
    toCategoryId: "nav-compute",
    amount: 25_000,
    justification:
      "ONR virtual technical review eliminated planned travel; additional HPC compute required for larger training dataset ingestion.",
    status: "approved",
    requestedDate: "2024-04-01",
    approvedDate: "2024-04-18",
  },
];
