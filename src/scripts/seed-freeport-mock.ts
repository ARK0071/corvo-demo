/**
 * Seed script for Port Freeport Mock — full profile using PRODUCTION tables.
 * Uses the same table structure (port_profiles, awards, projects, etc.) as all
 * production profiles. No demo-specific tables or behavior.
 *
 * Run: npx tsx src/scripts/seed-freeport-mock.ts
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

const SLUG = "freeport-mock";

// ─── Deterministic UUIDs ───
const PROFILE_ID = "c27f5ae3-0001-4000-8000-000000000001";

const PROJECT_IDS = {
  fhcip: "c27f5ae3-0002-4000-8000-000000000001",
  velascoPhase2: "c27f5ae3-0002-4000-8000-000000000002",
  zeroEmission: "c27f5ae3-0002-4000-8000-000000000003",
  portSecurity: "c27f5ae3-0002-4000-8000-000000000004",
  stormwaterResilience: "c27f5ae3-0002-4000-8000-000000000005",
  velascoAccess: "c27f5ae3-0002-4000-8000-000000000006",
  stsCranes: "c27f5ae3-0002-4000-8000-000000000007",
  concrete15: "c27f5ae3-0002-4000-8000-000000000008",
  terminalStreet: "c27f5ae3-0002-4000-8000-000000000009",
  cathodic: "c27f5ae3-0002-4000-8000-00000000000a",
  railIndustrial: "c27f5ae3-0002-4000-8000-00000000000b",
  pavementRepairs: "c27f5ae3-0002-4000-8000-00000000000c",
};

const AWARD_IDS = {
  pidp: "c27f5ae3-0003-4000-8000-000000000001",
  crisi: "c27f5ae3-0003-4000-8000-000000000002",
  epa: "c27f5ae3-0003-4000-8000-000000000003",
  txdotEast5th: "c27f5ae3-0003-4000-8000-000000000004",
  txdotRider37: "c27f5ae3-0003-4000-8000-000000000005",
  txdotAccess: "c27f5ae3-0003-4000-8000-000000000006",
};

const BUDGET_CAT_IDS = {
  pidp_warehouse: "c27f5ae3-0004-4000-8000-000000000001",
  pidp_site: "c27f5ae3-0004-4000-8000-000000000002",
  pidp_gate: "c27f5ae3-0004-4000-8000-000000000003",
  pidp_admin: "c27f5ae3-0004-4000-8000-000000000004",
  crisi_track: "c27f5ae3-0004-4000-8000-000000000005",
  crisi_signal: "c27f5ae3-0004-4000-8000-000000000006",
  crisi_engineering: "c27f5ae3-0004-4000-8000-000000000007",
  crisi_admin: "c27f5ae3-0004-4000-8000-000000000008",
  epa_emissions: "c27f5ae3-0004-4000-8000-000000000009",
  epa_planning: "c27f5ae3-0004-4000-8000-00000000000a",
  epa_framework: "c27f5ae3-0004-4000-8000-00000000000b",
  epa_admin: "c27f5ae3-0004-4000-8000-00000000000c",
  scp_road: "c27f5ae3-0004-4000-8000-00000000000d",
  scp_drainage: "c27f5ae3-0004-4000-8000-00000000000e",
  scp_engineering: "c27f5ae3-0004-4000-8000-00000000000f",
  scp_admin: "c27f5ae3-0004-4000-8000-000000000010",
  r37_paving: "c27f5ae3-0004-4000-8000-000000000011",
  r37_reefer: "c27f5ae3-0004-4000-8000-000000000012",
  r37_stormwater: "c27f5ae3-0004-4000-8000-000000000013",
  r37_engineering: "c27f5ae3-0004-4000-8000-000000000014",
  access_construction: "c27f5ae3-0004-4000-8000-000000000015",
  access_signals: "c27f5ae3-0004-4000-8000-000000000016",
  access_engineering: "c27f5ae3-0004-4000-8000-000000000017",
  access_admin: "c27f5ae3-0004-4000-8000-000000000018",
};

// ═══════════════════════════════════════════════════════════════════════════════
// CLEANUP — remove any prior freeport-mock data
// ═══════════════════════════════════════════════════════════════════════════════

async function cleanup() {
  console.log("Cleaning up prior freeport-mock data...");

  // Production tables: cascade from port_profiles
  for (const table of [
    "corrective_action_plans", "audit_findings",
    "compliance_checklist_items", "compliance_checklists",
    "subrecipient_reports", "subrecipients",
    "closeout_checklists", "scheduled_reports",
    "budget_modifications", "drawdown_requests",
    "expenses", "match_ledger", "budget_categories",
    "grant_drafts", "awards", "projects", "pipeline_grants",
  ]) {
    try {
      await prisma.$executeRawUnsafe(
        `DELETE FROM ${table} WHERE port_profile_id = $1`,
        PROFILE_ID
      );
    } catch {
      // Table may not have port_profile_id or may not exist yet
    }
  }

  // Delete the profile itself
  try {
    await prisma.$executeRawUnsafe(`DELETE FROM port_profiles WHERE id = $1`, PROFILE_ID);
  } catch {
    // May not exist
  }

  // Also clean any stale demo table data from prior seed run
  for (const table of [
    "demo_corrective_action_plans", "demo_audit_findings",
    "demo_compliance_checklist_items", "demo_compliance_checklists",
    "demo_subrecipient_reports", "demo_subrecipients",
    "demo_closeout_checklists", "demo_scheduled_reports",
    "demo_budget_modifications", "demo_drawdown_requests",
    "demo_expenses", "demo_match_ledger", "demo_budget_categories",
    "demo_grant_drafts", "demo_awards", "demo_projects",
    "demo_pipeline_grants",
  ]) {
    try {
      await prisma.$executeRawUnsafe(`DELETE FROM ${table} WHERE port_id = $1`, "freeport-mock");
    } catch {
      // Ignore
    }
  }
  // Clean stale demo grants
  for (const suffix of ["-FM"]) {
    try {
      await prisma.$executeRawUnsafe(
        `DELETE FROM demo_discovered_grants WHERE id LIKE $1`,
        `%${suffix}`
      );
    } catch {
      // Ignore
    }
  }
  // Clean stale demo profile
  try {
    await prisma.$executeRawUnsafe(`DELETE FROM demo_port_profiles WHERE port_id = $1`, "freeport-mock");
  } catch {
    // Ignore
  }

  // Clean users
  try {
    await prisma.$executeRawUnsafe(`DELETE FROM users WHERE port_id = $1`, "freeport-mock");
  } catch {
    // Ignore
  }

  console.log("  ✓ Cleanup complete");
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. PORT PROFILE (production: port_profiles)
// ═══════════════════════════════════════════════════════════════════════════════

async function seedPortProfile() {
  console.log("Seeding Port Freeport Mock profile (production table)...");

  await prisma.portProfile.upsert({
    where: { id: PROFILE_ID },
    create: {
      id: PROFILE_ID,
      slug: SLUG,
      name: "Port Freeport",
      entityType: "Special district government",
      classification: "Public Port Authority",
      location: { city: "Freeport", state: "Texas", stateCode: "TX", county: "Brazoria County", region: "Gulf Coast" },
      characteristics: { cargoTypes: ["Container", "Bulk", "Breakbulk", "Liquid Bulk", "Project Cargo"], annualTonnage: 30_000_000, employeeCount: 50, operatingBudget: 50_000_000 },
      priorities: ["Port infrastructure modernization", "Zero-emission equipment", "Intermodal connectivity", "Climate resilience", "Environmental sustainability", "Security enhancements", "Economic development", "Workforce development"],
      capabilities: ["Deep-water port operations", "Container terminal operations", "Bulk cargo handling", "Liquid bulk facilities", "Intermodal rail connections", "Warehousing and logistics", "Heavy-lift cargo"],
      needs: ["Port electrification infrastructure", "Berth deepening and expansion", "Gate automation technology", "Shore power systems", "Stormwater management", "Hurricane resilience improvements", "Security and surveillance upgrades", "Rail infrastructure improvements", "Zero-emission cargo handling equipment"],
      certifications: ["Green Marine Environmental Certification (Level 3)", "ISO 14001 Environmental Management System", "OSHA Voluntary Protection Program - Star Site", "C-TPAT Partner", "MTSA-compliant Facility Security Plan"],
      environmentalGoals: ["Transition to 100% zero-emission cargo handling equipment by 2035", "Install shore power at all berths by 2028", "Reduce port-related PM2.5 and NOx emissions by 60% (2019 baseline)", "Implement green stormwater infrastructure across all facilities", "Achieve carbon neutrality in Scope 1 and 2 emissions by 2040"],
      communityImpact: ["Workforce Development Center - annual training for 200+ local workers", "Port Freeport Scholarship Program - $500K annual scholarships to Brazoria County students", "Community Advisory Panel - quarterly meetings with Freeport, Quintana, and Jones Creek residents", "Local First Procurement Policy - 35% of operating spend directed to Brazoria County businesses", "Environmental Justice Initiative - community air quality monitoring at 6 fence-line stations"],
      legalName: "Brazoria County Navigation District No. 1 d/b/a Port Freeport",
      uei: "EXAMPLE1234567",
      ein: "74-6000000",
      locationData: { address: "1100 Cherry St", city: "Freeport", state: "TX", zip: "77541", congressionalDistrict: "TX-14", latitude: 28.9541, longitude: -95.3597 },
      leadership: { executiveDirector: "Phyllis Saathoff", cfo: "John Hoss", boardChair: "Shane Pirtle" },
      financials: { annualRevenue: 30_000_000, operatingBudget: 50_000_000, capitalBudget: 120_000_000, bondRating: "A+ (S&P)", matchFundingCapacity: 80_000_000, totalAssets: 450_000_000 },
      infrastructure: { terminalFacilities: ["Velasco Terminal - Container and general cargo, 2 berths, 500,000 TEU capacity", "Parcel Terminal - Bulk and breakbulk cargo, 4 berths", "Liquid Cargo Dock - Chemical and petroleum product transfers", "Phillips 66/Freeport LNG - Adjacent private terminals with shared channel"], channelDepth: 46, channelWidth: 400, berths: 8, railConnections: ["BNSF Railway - direct rail access to Velasco Terminal", "Union Pacific - interchange via BNSF connection", "SH 36 corridor - dedicated port access road"], acreage: 250 },
      operations: { annualTonnage: 30_000_000, annualTEUs: 95_000, vesselCalls: 1_200, employeeCount: 50, directJobs: 2_400, cargoTypes: ["Containerized cargo", "Dry bulk (aggregates, cement, salt)", "Liquid bulk (chemicals, petroleum)", "Breakbulk and project cargo", "LNG (adjacent Freeport LNG facility)"] },
      economicImpact: { regionalEconomicImpact: 5_800_000_000, directJobs: 2_400, totalJobs: 25_000, tradeValue: 28_000_000_000, annualTaxRevenue: 95_000_000 },
      pastGrantAwards: [
        { program: "PIDP", awardYear: 2021, awardAmount: 22_000_000, projectName: "Velasco Terminal Phase 1 - Crane and Berth Improvements", agency: "MARAD", status: "Completed" },
        { program: "Port Security Grant Program (PSGP)", awardYear: 2020, awardAmount: 1_200_000, projectName: "Surveillance and Access Control Modernization", agency: "FEMA", status: "Completed" },
        { program: "PSGP", awardYear: 2022, awardAmount: 850_000, projectName: "Cybersecurity Infrastructure Enhancement", agency: "FEMA", status: "Completed" },
        { program: "RAISE", awardYear: 2023, awardAmount: 15_000_000, projectName: "Intermodal Rail Connectivity - Velasco Terminal Rail Spur", agency: "USDOT", status: "In progress" },
      ],
      disadvantagedCommunityData: { description: "Adjacent census tracts (48039-7101, 7102, 7103) in Freeport, TX qualify as disadvantaged under CEJST and EJScreen.", povertyRate: 18.7, pm25Percentile: 82, justiceFortyTracker: true, censusTract: "48039-7101, 48039-7102, 48039-7103" },
      climateResilienceData: { floodZone: "AE (100-year coastal flood zone)", hurricaneExposure: "High - Category 3+ hurricane return period approximately 15 years.", emissionsBaseline: "42,000 metric tons CO2e (2019 baseline - Scope 1 and 2)", emissionsReductionTarget: "50% reduction by 2030; carbon neutrality by 2040", existingMitigations: ["Hurricane preparedness and evacuation plan", "Seawall and bulkhead elevation at Velasco Terminal", "Backup generator system", "Elevated electrical infrastructure"], plannedMitigations: ["Green infrastructure - 15-acre bioswale and retention system", "Elevation of remaining electrical systems above 500-year flood level", "Living shoreline pilot along Brazos River entrance", "Resilient pavement and drainage upgrades"] },
    },
    update: {
      name: "Port Freeport",
      entityType: "Special district government",
      classification: "Public Port Authority",
    },
  });

  console.log("  ✓ Port profile seeded");
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. PROJECTS (production: projects)
// ═══════════════════════════════════════════════════════════════════════════════

async function seedProjects() {
  console.log("Seeding projects...");

  const projects = [
    {
      id: PROJECT_IDS.fhcip, portProfileId: PROFILE_ID,
      name: "Freeport Harbor Channel Improvement Project (FHCIP)",
      description: "Deepening the Freeport Harbor Channel from 46 ft to 56 ft MLLW in partnership with USACE. Enables accommodation of larger Post-Panamax vessels and increases port competitiveness. The $295M federal cost-shared project was authorized by Congress in 2014. USACE awarded the final dredging contract to Great Lakes Dredge & Dock Company in May 2023.",
      projectType: "infrastructure", status: "construction", priority: "critical", budget: 295_000_000,
      location: "Freeport Harbor Channel", startDate: new Date("2023-06-01"), endDate: new Date("2027-12-31"),
      focusAreas: ["Channel deepening", "Navigation improvement", "Port infrastructure", "Economic competitiveness", "Freight movement"],
      notes: "USACE partnership. Federal cost-share secured. NEPA Record of Decision obtained. FY2023 Federal Omnibus provided $90.7M bringing combined federal funding to $207.8M.",
      fundingSource: "USACE federal appropriation + Port Freeport local match",
      costShareSource: "Port Freeport $130M voter-approved bond package (May 2018)",
      nepaStatus: "record_of_decision", nepaDocument: "Environmental Impact Statement (EIS)", nepaCompletionDate: new Date("2022-09-15"),
      designCompletion: 100, designPhase: "complete",
      permits: [{ name: "USACE Section 10/404 Permit", status: "obtained", date: "2022-11-01" }, { name: "TCEQ Water Quality Certification", status: "obtained", date: "2022-10-15" }, { name: "USCG Bridge Permit", status: "obtained", date: "2023-01-20" }],
      rightOfWay: "acquired", procurementApproach: "Design-bid-build, USACE-managed construction contract",
      constructionStartTarget: new Date("2023-06-01"), shovelReady: true,
      priorFederalAwards: [{ program: "USACE Civil Works", amount: 207_800_000, year: 2023, status: "active" }],
      auditFindings: "none", onTimeCompletion: 95, jobsCreated: 850, jobsRetained: 2400, tonnageImpact: 15_000_000,
      emissionsReduction: "Enables larger vessels with lower per-TEU fuel consumption, estimated 18% reduction in vessel emissions per ton of cargo",
      safetyImpact: "Eliminates need for tide-restricted transit of large vessels, reducing collision risk",
      economicImpact: "$3.2B estimated regional economic impact over 20 years",
      communitiesBenefited: "Brazoria County (pop. 388,000), including Freeport, Clute, Lake Jackson, and Angleton",
    },
    {
      id: PROJECT_IDS.velascoPhase2, portProfileId: PROFILE_ID,
      name: "Velasco Terminal Phase 2 Expansion",
      description: "Expansion of the Velasco Container Terminal including additional berths, container yard, and intermodal rail connections to increase container throughput capacity.",
      projectType: "expansion", status: "design", priority: "high", budget: 180_000_000,
      location: "Velasco Terminal", startDate: new Date("2025-01-01"), endDate: new Date("2028-06-30"),
      focusAreas: ["Container terminal", "Intermodal connectivity", "Rail infrastructure", "Port expansion", "Supply chain"],
      fundingSource: "Federal grant + Port Freeport revenue bonds",
      costShareSource: "Port Freeport Series 2024 Revenue Bonds ($36M authorized)",
      nepaStatus: "ea_in_progress", nepaDocument: "Environmental Assessment (EA)", nepaCompletionDate: new Date("2025-09-30"),
      designCompletion: 60, designPhase: "preliminary",
      permits: [{ name: "USACE Section 10/404 Permit", status: "pending" }, { name: "TCEQ Stormwater Permit", status: "pending" }, { name: "Brazoria County Site Development Permit", status: "obtained", date: "2024-08-15" }],
      rightOfWay: "acquired", procurementApproach: "Design-build with GMP, competitive RFP planned Q1 2026",
      constructionStartTarget: new Date("2026-03-01"), shovelReady: false,
      priorFederalAwards: [{ program: "PIDP FY2023", amount: 15_960_000, year: 2023, status: "active" }, { program: "TxDOT Rider 37", amount: 8_200_000, year: 2022, status: "active" }],
      auditFindings: "none", onTimeCompletion: 95, jobsCreated: 1200, jobsRetained: 3500, tonnageImpact: 8_000_000,
      economicImpact: "$1.8B estimated regional economic impact over 20 years",
      communitiesBenefited: "Brazoria County, greater Houston metro area freight corridor",
    },
    {
      id: PROJECT_IDS.zeroEmission, portProfileId: PROFILE_ID,
      name: "Zero-Emission Equipment Deployment",
      description: "Procurement and deployment of zero-emission cargo handling equipment including electric RTG cranes, yard tractors, and shore power systems.",
      projectType: "equipment", status: "procurement", priority: "high", budget: 45_000_000,
      location: "Port-wide", startDate: new Date("2025-03-01"), endDate: new Date("2026-12-31"),
      focusAreas: ["Energy resilience", "Electrification", "Shore power", "Air quality", "Operational efficiency", "Equipment modernization"],
      nepaStatus: "categorical_exclusion", nepaDocument: "Categorical Exclusion (CE)",
      designCompletion: 90, designPhase: "final",
      permits: [{ name: "Electrical infrastructure permit", status: "obtained", date: "2025-01-10" }, { name: "Air quality permit modification", status: "pending" }],
      rightOfWay: "not_needed", shovelReady: true, priorFederalAwards: [], auditFindings: "none",
      jobsCreated: 25, jobsRetained: 180,
      emissionsReduction: "Estimated 4,200 tons CO2e/year reduction; eliminates 98% of NOx from replaced diesel equipment",
      communitiesBenefited: "Freeport, Clute, and surrounding environmental justice communities within 1-mile radius",
    },
    {
      id: PROJECT_IDS.portSecurity, portProfileId: PROFILE_ID,
      name: "Port Security Enhancement Program",
      description: "Upgrades to TWIC-compliant access control, CCTV surveillance network, perimeter intrusion detection, and cybersecurity infrastructure.",
      projectType: "security", status: "planning", priority: "medium", budget: 12_000_000,
      location: "Port-wide", focusAreas: ["Port security", "Cybersecurity", "Access control", "Surveillance", "MTSA compliance"],
      permits: [], priorFederalAwards: [], auditFindings: "none",
    },
    {
      id: PROJECT_IDS.stormwaterResilience, portProfileId: PROFILE_ID,
      name: "Stormwater and Climate Resilience Infrastructure",
      description: "Green infrastructure improvements including bioswales, retention ponds, elevated electrical systems, and hurricane-hardened facilities.",
      projectType: "resilience", status: "planning", priority: "medium", budget: 28_000_000,
      location: "Port-wide", focusAreas: ["Climate resilience", "Stormwater management", "Hurricane resilience", "Green infrastructure", "Flood mitigation"],
      permits: [], priorFederalAwards: [], auditFindings: "none",
    },
    {
      id: PROJECT_IDS.velascoAccess, portProfileId: PROFILE_ID,
      name: "Velasco Terminal Access & North Gate Entrance",
      description: "Construction of new terminal access road and north gate entrance facility.",
      projectType: "infrastructure", status: "construction", priority: "high", budget: 11_900_000,
      location: "Velasco Terminal", startDate: new Date("2024-06-01"),
      focusAreas: ["Terminal access", "Traffic management", "Gate infrastructure", "Port operations"],
      permits: [], priorFederalAwards: [], auditFindings: "none",
    },
    {
      id: PROJECT_IDS.stsCranes, portProfileId: PROFILE_ID,
      name: "Super Post-Panamax STS Gantry Cranes (2 units)",
      description: "Procurement of two super post-Panamax ship-to-shore gantry cranes for the Velasco Container Terminal.",
      projectType: "equipment", status: "procurement", priority: "critical", budget: 50_000_000,
      location: "Velasco Terminal",
      focusAreas: ["Container handling", "Crane infrastructure", "Port modernization"],
      notes: "Ordered, delivery expected FY2025. Funded via Series 2024 revenue bonds.",
      permits: [], priorFederalAwards: [], auditFindings: "none",
    },
    {
      id: PROJECT_IDS.concrete15, portProfileId: PROFILE_ID,
      name: "15-Acre Concrete Storage Area (Storage Area 5)",
      description: "Construction of a 15-acre concrete storage area for container and cargo staging. Funded through the Maritime Infrastructure Program (TxDOT Rider 37).",
      projectType: "infrastructure", status: "complete", priority: "medium", budget: 12_800_000,
      location: "Velasco Terminal Area", startDate: new Date("2025-01-01"), endDate: new Date("2026-02-28"),
      focusAreas: ["Container storage", "Yard expansion", "Cargo staging", "Port capacity"],
      permits: [], priorFederalAwards: [], auditFindings: "none",
    },
    {
      id: PROJECT_IDS.terminalStreet, portProfileId: PROFILE_ID,
      name: "East 5th Street Reconstruction & Truck Queuing",
      description: "Complete reconstruction of East 5th Street with dedicated truck queuing lanes, improved drainage, pavement reinforcement. Funded through TxDOT Seaport Connectivity Program.",
      projectType: "infrastructure", status: "complete", priority: "medium", budget: 12_800_000,
      location: "East 5th Street", startDate: new Date("2023-06-01"), endDate: new Date("2026-02-28"),
      focusAreas: ["Road reconstruction", "Heavy vehicle access", "Port infrastructure", "Freight movement", "Truck queuing"],
      permits: [], priorFederalAwards: [], auditFindings: "none",
    },
    {
      id: PROJECT_IDS.cathodic, portProfileId: PROFILE_ID,
      name: "Cathodic Protection Systems",
      description: "Installation and upgrade of cathodic protection systems across port dock infrastructure to prevent corrosion and extend asset lifespan.",
      projectType: "maintenance", status: "construction", priority: "medium", budget: 4_660_000,
      location: "Port-wide",
      focusAreas: ["Corrosion prevention", "Dock maintenance", "Asset preservation", "Marine infrastructure"],
      permits: [], priorFederalAwards: [], auditFindings: "none",
    },
    {
      id: PROJECT_IDS.railIndustrial, portProfileId: PROFILE_ID,
      name: "Rail-Served Industrial Park Development (Parcel 14)",
      description: "Development of a rail-served industrial park on the 200+ acre Parcel 14 with 40,000 ft of rail tracks. Phase 2 adds 24,000 LF of ladder tracks.",
      projectType: "expansion", status: "construction", priority: "high", budget: 75_000_000,
      location: "Port Freeport Parcel 14 Industrial Area",
      focusAreas: ["Rail infrastructure", "Intermodal connectivity", "Warehousing", "Distribution", "Industrial development", "Supply chain"],
      permits: [], priorFederalAwards: [{ program: "CRISI", amount: 6_300_000, year: 2024, status: "active" }], auditFindings: "none",
    },
    {
      id: PROJECT_IDS.pavementRepairs, portProfileId: PROFILE_ID,
      name: "Portwide Pavement Repairs",
      description: "Comprehensive pavement repair and rehabilitation program across all port facilities.",
      projectType: "maintenance", status: "construction", priority: "medium", budget: 4_778_772,
      location: "Port-wide",
      focusAreas: ["Pavement repair", "Road maintenance", "Port operations", "Safety"],
      permits: [], priorFederalAwards: [], auditFindings: "none",
    },
  ];

  for (const project of projects) {
    await prisma.project.create({ data: project });
    console.log(`  Created: ${project.name}`);
  }
  console.log(`  ✓ ${projects.length} projects seeded`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. AWARDS (production: awards)
// ═══════════════════════════════════════════════════════════════════════════════

async function seedAwards() {
  console.log("Seeding awards...");

  const awards = [
    {
      id: AWARD_IDS.pidp, portProfileId: PROFILE_ID,
      fain: "693JF72240015", cfda: "20.823",
      awardingAgency: "U.S. Department of Transportation / Maritime Administration",
      program: "PIDP", title: "Velasco Terminal Sustainability Expansion",
      description: "Construction of a new 36,900 sq ft cross-dock warehouse, related site improvements on a 10-acre site, and a new terminal access truck gate at Velasco Container Terminal.",
      totalAmount: 15_960_000,
      performancePeriodStart: new Date("2023-04-01"), performancePeriodEnd: new Date("2027-03-31"),
      matchPercentage: 20, matchTypes: ["cash", "in_kind"], matchCommitted: 3_200_000, matchRequired: 3_990_000,
      status: "active", projectIds: [PROJECT_IDS.velascoPhase2],
      indirectCostRate: 0.4250, indirectCostBase: "mtdc", indirectCostType: "provisional",
      indirectCostPeriodStart: new Date("2023-01-01"), indirectCostPeriodEnd: new Date("2025-12-31"),
    },
    {
      id: AWARD_IDS.crisi, portProfileId: PROFILE_ID,
      fain: "FR-CRISI-0284-2024", cfda: "20.325",
      awardingAgency: "U.S. Department of Transportation / Federal Railroad Administration",
      program: "CRISI", title: "Parcel 14 Rail Development Phase 2",
      description: "Addition of approximately 24,000 feet of ladder tracks adjacent to existing 21,000 linear feet of rail on the 200+ acre Parcel 14 multimodal industrial park.",
      totalAmount: 6_300_000,
      performancePeriodStart: new Date("2024-01-15"), performancePeriodEnd: new Date("2027-01-14"),
      matchPercentage: 20, matchTypes: ["cash"], matchCommitted: 1_260_000, matchRequired: 1_575_000,
      status: "active", projectIds: [PROJECT_IDS.railIndustrial],
    },
    {
      id: AWARD_IDS.epa, portProfileId: PROFILE_ID,
      fain: "EPA-OAR-OTAQ-24-06-FPT", cfda: "66.956",
      awardingAgency: "U.S. Environmental Protection Agency",
      program: "EPA Clean Ports", title: "Port Freeport Clean Ports Planning & Emissions Inventory",
      description: "Comprehensive emissions inventory, port resiliency and zero-emission implementation plan. Awarded November 2024.",
      totalAmount: 1_487_000,
      performancePeriodStart: new Date("2024-10-01"), performancePeriodEnd: new Date("2027-09-30"),
      matchPercentage: 0, matchTypes: [], matchCommitted: 0, matchRequired: 0,
      status: "active", projectIds: [PROJECT_IDS.zeroEmission],
    },
    {
      id: AWARD_IDS.txdotEast5th, portProfileId: PROFILE_ID,
      fain: "SCP-2024-FPT-0018", cfda: "20.205",
      awardingAgency: "Texas Department of Transportation",
      program: "TxDOT SCP", title: "East 5th Street Reconstruction & Truck Queuing",
      description: "Complete reconstruction of East 5th Street with dedicated truck queuing lanes, improved drainage, pavement reinforcement.",
      totalAmount: 4_800_000,
      performancePeriodStart: new Date("2023-06-01"), performancePeriodEnd: new Date("2026-05-31"),
      matchPercentage: 20, matchTypes: ["cash", "in_kind"], matchCommitted: 960_000, matchRequired: 1_200_000,
      status: "active", projectIds: [PROJECT_IDS.terminalStreet],
    },
    {
      id: AWARD_IDS.txdotRider37, portProfileId: PROFILE_ID,
      fain: "R37-2024-FPT-0006", cfda: "20.205",
      awardingAgency: "Texas Department of Transportation",
      program: "TxDOT Rider 37", title: "Storage Area 5 Container Expansion",
      description: "Development of a 15-acre container storage expansion including heavy-duty pavement, reefer plug infrastructure, lighting, and stormwater management.",
      totalAmount: 8_200_000,
      performancePeriodStart: new Date("2024-04-01"), performancePeriodEnd: new Date("2027-09-30"),
      matchPercentage: 10, matchTypes: ["cash"], matchCommitted: 820_000, matchRequired: 911_111,
      status: "active", projectIds: [PROJECT_IDS.concrete15],
    },
    {
      id: AWARD_IDS.txdotAccess, portProfileId: PROFILE_ID,
      fain: "SCP-2022-FPT-0009", cfda: "20.205",
      awardingAgency: "Texas Department of Transportation",
      program: "TxDOT SCP", title: "Velasco Terminal Access Road Widening",
      description: "Widening and reconstruction of the primary terminal access road from SH 36 to the Velasco Terminal gate.",
      totalAmount: 3_600_000,
      performancePeriodStart: new Date("2022-07-01"), performancePeriodEnd: new Date("2025-06-30"),
      matchPercentage: 20, matchTypes: ["cash"], matchCommitted: 900_000, matchRequired: 900_000,
      status: "closeout_pending", projectIds: [PROJECT_IDS.velascoAccess],
    },
  ];

  for (const award of awards) {
    await prisma.award.create({ data: award });
    console.log(`  Created: ${award.program} — ${award.title.slice(0, 50)}... ($${(Number(award.totalAmount) / 1_000_000).toFixed(1)}M)`);
  }
  console.log(`  ✓ ${awards.length} awards seeded`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. BUDGET CATEGORIES (production: budget_categories)
// ═══════════════════════════════════════════════════════════════════════════════

async function seedBudgetCategories() {
  console.log("Seeding budget categories...");

  const cats = [
    { id: BUDGET_CAT_IDS.pidp_warehouse, awardId: AWARD_IDS.pidp, name: "Warehouse Construction", ceiling: 9_200_000, spent: 6_440_000 },
    { id: BUDGET_CAT_IDS.pidp_site, awardId: AWARD_IDS.pidp, name: "Site Improvements", ceiling: 3_800_000, spent: 2_660_000 },
    { id: BUDGET_CAT_IDS.pidp_gate, awardId: AWARD_IDS.pidp, name: "Truck Gate Infrastructure", ceiling: 1_960_000, spent: 1_372_000 },
    { id: BUDGET_CAT_IDS.pidp_admin, awardId: AWARD_IDS.pidp, name: "Project Administration", ceiling: 1_000_000, spent: 620_000 },
    { id: BUDGET_CAT_IDS.crisi_track, awardId: AWARD_IDS.crisi, name: "Track Construction", ceiling: 4_200_000, spent: 1_680_000 },
    { id: BUDGET_CAT_IDS.crisi_signal, awardId: AWARD_IDS.crisi, name: "Signaling & Crossings", ceiling: 1_100_000, spent: 440_000 },
    { id: BUDGET_CAT_IDS.crisi_engineering, awardId: AWARD_IDS.crisi, name: "Engineering & Design", ceiling: 650_000, spent: 585_000 },
    { id: BUDGET_CAT_IDS.crisi_admin, awardId: AWARD_IDS.crisi, name: "Project Management", ceiling: 350_000, spent: 175_000 },
    { id: BUDGET_CAT_IDS.epa_emissions, awardId: AWARD_IDS.epa, name: "Emissions Inventory", ceiling: 620_000, spent: 248_000 },
    { id: BUDGET_CAT_IDS.epa_planning, awardId: AWARD_IDS.epa, name: "Resiliency Planning", ceiling: 520_000, spent: 104_000 },
    { id: BUDGET_CAT_IDS.epa_framework, awardId: AWARD_IDS.epa, name: "Performance Framework", ceiling: 197_000, spent: 39_000 },
    { id: BUDGET_CAT_IDS.epa_admin, awardId: AWARD_IDS.epa, name: "Administration & Outreach", ceiling: 150_000, spent: 75_000 },
    { id: BUDGET_CAT_IDS.scp_road, awardId: AWARD_IDS.txdotEast5th, name: "Road Construction", ceiling: 3_200_000, spent: 2_880_000 },
    { id: BUDGET_CAT_IDS.scp_drainage, awardId: AWARD_IDS.txdotEast5th, name: "Drainage & Utilities", ceiling: 900_000, spent: 810_000 },
    { id: BUDGET_CAT_IDS.scp_engineering, awardId: AWARD_IDS.txdotEast5th, name: "Engineering", ceiling: 450_000, spent: 432_000 },
    { id: BUDGET_CAT_IDS.scp_admin, awardId: AWARD_IDS.txdotEast5th, name: "Project Management", ceiling: 250_000, spent: 188_000 },
    { id: BUDGET_CAT_IDS.r37_paving, awardId: AWARD_IDS.txdotRider37, name: "Heavy-Duty Paving", ceiling: 4_800_000, spent: 1_440_000 },
    { id: BUDGET_CAT_IDS.r37_reefer, awardId: AWARD_IDS.txdotRider37, name: "Reefer Infrastructure", ceiling: 1_600_000, spent: 320_000 },
    { id: BUDGET_CAT_IDS.r37_stormwater, awardId: AWARD_IDS.txdotRider37, name: "Stormwater Management", ceiling: 1_200_000, spent: 480_000 },
    { id: BUDGET_CAT_IDS.r37_engineering, awardId: AWARD_IDS.txdotRider37, name: "Engineering & Permitting", ceiling: 600_000, spent: 540_000 },
    { id: BUDGET_CAT_IDS.access_construction, awardId: AWARD_IDS.txdotAccess, name: "Road Widening & Paving", ceiling: 2_200_000, spent: 2_200_000 },
    { id: BUDGET_CAT_IDS.access_signals, awardId: AWARD_IDS.txdotAccess, name: "Signalization & Safety", ceiling: 750_000, spent: 738_000 },
    { id: BUDGET_CAT_IDS.access_engineering, awardId: AWARD_IDS.txdotAccess, name: "Engineering & Design", ceiling: 400_000, spent: 392_000 },
    { id: BUDGET_CAT_IDS.access_admin, awardId: AWARD_IDS.txdotAccess, name: "Project Administration", ceiling: 250_000, spent: 241_000 },
  ];

  for (const cat of cats) { await prisma.budgetCategory.create({ data: cat }); }
  console.log(`  ✓ ${cats.length} budget categories seeded`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. EXPENSES (production: expenses)
// ═══════════════════════════════════════════════════════════════════════════════

async function seedExpenses() {
  console.log("Seeding expenses...");

  const expenses = [
    { awardId: AWARD_IDS.pidp, categoryId: BUDGET_CAT_IDS.pidp_warehouse, date: new Date("2024-06-15"), description: "Cross-dock warehouse foundation and steel erection", vendor: "McCarthy Building Companies", amount: 2_150_000, status: "drawn" },
    { awardId: AWARD_IDS.pidp, categoryId: BUDGET_CAT_IDS.pidp_warehouse, date: new Date("2024-09-20"), description: "Warehouse envelope and roofing installation", vendor: "McCarthy Building Companies", amount: 1_840_000, status: "drawn" },
    { awardId: AWARD_IDS.pidp, categoryId: BUDGET_CAT_IDS.pidp_warehouse, date: new Date("2025-03-10"), description: "Warehouse MEP rough-in and interior framing", vendor: "McCarthy Building Companies", amount: 1_650_000, status: "approved" },
    { awardId: AWARD_IDS.pidp, categoryId: BUDGET_CAT_IDS.pidp_site, date: new Date("2024-07-10"), description: "Site grading and utility infrastructure", vendor: "Webber LLC", amount: 1_420_000, status: "drawn" },
    { awardId: AWARD_IDS.pidp, categoryId: BUDGET_CAT_IDS.pidp_site, date: new Date("2025-01-15"), description: "Parking and container staging area paving", vendor: "Webber LLC", amount: 1_240_000, status: "approved" },
    { awardId: AWARD_IDS.pidp, categoryId: BUDGET_CAT_IDS.pidp_gate, date: new Date("2024-11-01"), description: "Truck gate OCR system and barrier installation", vendor: "IDENTEC Solutions", amount: 872_000, status: "approved" },
    { awardId: AWARD_IDS.pidp, categoryId: BUDGET_CAT_IDS.pidp_gate, date: new Date("2025-04-15"), description: "Gate management software and TWIC integration", vendor: "IDENTEC Solutions", amount: 500_000, status: "logged" },
    { awardId: AWARD_IDS.pidp, categoryId: BUDGET_CAT_IDS.pidp_admin, date: new Date("2024-10-01"), description: "Quarterly project management and MARAD reporting", vendor: "HDR Engineering", amount: 155_000, status: "drawn" },
    { awardId: AWARD_IDS.pidp, categoryId: BUDGET_CAT_IDS.pidp_admin, date: new Date("2025-01-01"), description: "Q1 2025 project management and reporting", vendor: "HDR Engineering", amount: 155_000, status: "approved" },
    { awardId: AWARD_IDS.pidp, categoryId: BUDGET_CAT_IDS.pidp_admin, date: new Date("2025-04-01"), description: "Q2 2025 project management and reporting", vendor: "HDR Engineering", amount: 155_000, status: "logged" },
    { awardId: AWARD_IDS.crisi, categoryId: BUDGET_CAT_IDS.crisi_engineering, date: new Date("2024-03-15"), description: "Track alignment design and UP coordination", vendor: "HNTB Corporation", amount: 385_000, status: "drawn" },
    { awardId: AWARD_IDS.crisi, categoryId: BUDGET_CAT_IDS.crisi_engineering, date: new Date("2024-09-01"), description: "Construction engineering and inspection", vendor: "HNTB Corporation", amount: 200_000, status: "approved" },
    { awardId: AWARD_IDS.crisi, categoryId: BUDGET_CAT_IDS.crisi_track, date: new Date("2024-08-01"), description: "Ladder track grading and ballast - Phase 1", vendor: "Herzog Contracting", amount: 890_000, status: "drawn" },
    { awardId: AWARD_IDS.crisi, categoryId: BUDGET_CAT_IDS.crisi_track, date: new Date("2025-01-10"), description: "Rail installation and welding - 12,000 LF", vendor: "Herzog Contracting", amount: 790_000, status: "approved" },
    { awardId: AWARD_IDS.crisi, categoryId: BUDGET_CAT_IDS.crisi_signal, date: new Date("2024-11-15"), description: "Grade crossing signal system design and installation", vendor: "Wabtec Corporation", amount: 440_000, status: "approved" },
    { awardId: AWARD_IDS.crisi, categoryId: BUDGET_CAT_IDS.crisi_admin, date: new Date("2024-06-01"), description: "FRA reporting and project coordination", vendor: "Port Freeport Staff", amount: 175_000, status: "drawn" },
    { awardId: AWARD_IDS.epa, categoryId: BUDGET_CAT_IDS.epa_emissions, date: new Date("2025-01-10"), description: "Baseline emissions inventory - mobile sources", vendor: "ERG (Eastern Research Group)", amount: 148_000, status: "approved" },
    { awardId: AWARD_IDS.epa, categoryId: BUDGET_CAT_IDS.epa_emissions, date: new Date("2025-02-15"), description: "Stationary source emissions assessment", vendor: "ERG (Eastern Research Group)", amount: 100_000, status: "logged" },
    { awardId: AWARD_IDS.epa, categoryId: BUDGET_CAT_IDS.epa_planning, date: new Date("2025-02-01"), description: "Stakeholder engagement and workshop facilitation", vendor: "ICF International", amount: 104_000, status: "logged" },
    { awardId: AWARD_IDS.epa, categoryId: BUDGET_CAT_IDS.epa_framework, date: new Date("2025-03-01"), description: "KPI framework development and benchmarking", vendor: "ICF International", amount: 39_000, status: "logged" },
    { awardId: AWARD_IDS.epa, categoryId: BUDGET_CAT_IDS.epa_admin, date: new Date("2024-12-15"), description: "Program administration and EPA reporting", vendor: "Port Freeport Staff", amount: 75_000, status: "approved" },
    { awardId: AWARD_IDS.txdotEast5th, categoryId: BUDGET_CAT_IDS.scp_road, date: new Date("2024-04-15"), description: "Road base and pavement - Phase 2", vendor: "Texas Sterling Construction", amount: 1_450_000, status: "drawn" },
    { awardId: AWARD_IDS.txdotEast5th, categoryId: BUDGET_CAT_IDS.scp_road, date: new Date("2024-08-01"), description: "Truck queuing lane construction", vendor: "Texas Sterling Construction", amount: 1_430_000, status: "drawn" },
    { awardId: AWARD_IDS.txdotEast5th, categoryId: BUDGET_CAT_IDS.scp_drainage, date: new Date("2024-05-01"), description: "Storm drain and retention system installation", vendor: "Binkley & Barfield", amount: 810_000, status: "drawn" },
    { awardId: AWARD_IDS.txdotEast5th, categoryId: BUDGET_CAT_IDS.scp_engineering, date: new Date("2024-01-15"), description: "Construction engineering and inspection", vendor: "Lockwood Andrews & Newnam", amount: 432_000, status: "drawn" },
    { awardId: AWARD_IDS.txdotEast5th, categoryId: BUDGET_CAT_IDS.scp_admin, date: new Date("2024-09-01"), description: "Project management and TxDOT reporting", vendor: "Port Freeport Staff", amount: 188_000, status: "drawn" },
    { awardId: AWARD_IDS.txdotRider37, categoryId: BUDGET_CAT_IDS.r37_engineering, date: new Date("2024-06-01"), description: "Site engineering and permitting", vendor: "Freese and Nichols", amount: 540_000, status: "drawn" },
    { awardId: AWARD_IDS.txdotRider37, categoryId: BUDGET_CAT_IDS.r37_paving, date: new Date("2024-11-01"), description: "Subgrade preparation and stabilization", vendor: "Webber LLC", amount: 720_000, status: "approved" },
    { awardId: AWARD_IDS.txdotRider37, categoryId: BUDGET_CAT_IDS.r37_paving, date: new Date("2025-02-01"), description: "Heavy-duty concrete paving - Phase 1", vendor: "Webber LLC", amount: 720_000, status: "logged" },
    { awardId: AWARD_IDS.txdotRider37, categoryId: BUDGET_CAT_IDS.r37_stormwater, date: new Date("2024-09-15"), description: "Detention pond and outfall construction", vendor: "Binkley & Barfield", amount: 480_000, status: "approved" },
    { awardId: AWARD_IDS.txdotRider37, categoryId: BUDGET_CAT_IDS.r37_reefer, date: new Date("2025-01-20"), description: "Reefer rack electrical conduit and pad installation", vendor: "MMR Group", amount: 320_000, status: "logged" },
    { awardId: AWARD_IDS.txdotAccess, categoryId: BUDGET_CAT_IDS.access_construction, date: new Date("2024-03-01"), description: "Road widening and base course", vendor: "Texas Sterling Construction", amount: 1_620_000, status: "drawn" },
    { awardId: AWARD_IDS.txdotAccess, categoryId: BUDGET_CAT_IDS.access_construction, date: new Date("2024-06-01"), description: "Final pavement overlay and striping", vendor: "Texas Sterling Construction", amount: 580_000, status: "drawn" },
    { awardId: AWARD_IDS.txdotAccess, categoryId: BUDGET_CAT_IDS.access_signals, date: new Date("2024-08-15"), description: "Traffic signal installation at SH 36 intersection", vendor: "Paradigm Traffic Systems", amount: 438_000, status: "drawn" },
    { awardId: AWARD_IDS.txdotAccess, categoryId: BUDGET_CAT_IDS.access_signals, date: new Date("2024-10-01"), description: "Pedestrian crosswalk and safety signage", vendor: "Paradigm Traffic Systems", amount: 300_000, status: "drawn" },
    { awardId: AWARD_IDS.txdotAccess, categoryId: BUDGET_CAT_IDS.access_engineering, date: new Date("2024-11-01"), description: "As-built documentation and final inspection", vendor: "Lockwood Andrews & Newnam", amount: 392_000, status: "approved" },
    { awardId: AWARD_IDS.txdotAccess, categoryId: BUDGET_CAT_IDS.access_admin, date: new Date("2025-02-01"), description: "Final project closeout documentation", vendor: "Port Freeport Staff", amount: 241_000, status: "logged" },
  ];

  for (const exp of expenses) { await prisma.expense.create({ data: exp }); }
  console.log(`  ✓ ${expenses.length} expenses seeded`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. MATCH LEDGER (production: match_ledger)
// ═══════════════════════════════════════════════════════════════════════════════

async function seedMatchLedger() {
  console.log("Seeding match ledger...");

  const entries = [
    { awardId: AWARD_IDS.pidp, date: new Date("2023-06-15"), description: "Port Freeport cash contribution - Phase 1", amount: 1_200_000, type: "cash" },
    { awardId: AWARD_IDS.pidp, date: new Date("2024-01-10"), description: "In-kind: Land value contribution (10-acre site)", amount: 850_000, type: "in_kind" },
    { awardId: AWARD_IDS.pidp, date: new Date("2024-08-01"), description: "Port Freeport cash contribution - Phase 2", amount: 1_150_000, type: "cash" },
    { awardId: AWARD_IDS.crisi, date: new Date("2024-03-01"), description: "Port Freeport cash match - rail project", amount: 800_000, type: "cash" },
    { awardId: AWARD_IDS.crisi, date: new Date("2025-01-15"), description: "Port Freeport cash match - Phase 2", amount: 460_000, type: "cash" },
    { awardId: AWARD_IDS.txdotEast5th, date: new Date("2023-08-01"), description: "Port Freeport cash match", amount: 400_000, type: "cash" },
    { awardId: AWARD_IDS.txdotEast5th, date: new Date("2024-02-15"), description: "In-kind: Port staff project oversight", amount: 160_000, type: "in_kind" },
    { awardId: AWARD_IDS.txdotEast5th, date: new Date("2024-09-01"), description: "Port Freeport cash match - Phase 2", amount: 400_000, type: "cash" },
    { awardId: AWARD_IDS.txdotRider37, date: new Date("2024-05-15"), description: "Port Freeport 10% cash match", amount: 820_000, type: "cash" },
    { awardId: AWARD_IDS.txdotAccess, date: new Date("2022-08-01"), description: "Port Freeport cash match - access road", amount: 500_000, type: "cash" },
    { awardId: AWARD_IDS.txdotAccess, date: new Date("2023-06-01"), description: "Port Freeport cash match - Phase 2", amount: 400_000, type: "cash" },
  ];

  for (const entry of entries) { await prisma.matchLedgerEntry.create({ data: entry }); }
  console.log(`  ✓ ${entries.length} match ledger entries seeded`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. DRAWDOWN REQUESTS (production: drawdown_requests)
// ═══════════════════════════════════════════════════════════════════════════════

async function seedDrawdowns() {
  console.log("Seeding drawdown requests...");

  const drawdowns = [
    { awardId: AWARD_IDS.pidp, expenseIds: ["PIDP warehouse Q3-Q4 2024"], totalAmount: 3_990_000, status: "payment_received", submittedDate: new Date("2024-10-15"), approvedDate: new Date("2024-11-05"), paymentDate: new Date("2024-11-25"), notes: "Q3-Q4 FY2024 drawdown - warehouse construction" },
    { awardId: AWARD_IDS.pidp, expenseIds: ["PIDP site + gate Q1 2025"], totalAmount: 2_532_000, status: "submitted", submittedDate: new Date("2025-04-10"), notes: "Q1 FY2025 drawdown - site work, gate, and admin" },
    { awardId: AWARD_IDS.crisi, expenseIds: ["CRISI engineering"], totalAmount: 385_000, status: "payment_received", submittedDate: new Date("2024-05-01"), approvedDate: new Date("2024-05-20"), paymentDate: new Date("2024-06-10"), notes: "Initial engineering drawdown - rail design" },
    { awardId: AWARD_IDS.crisi, expenseIds: ["CRISI track + signal"], totalAmount: 1_330_000, status: "submitted", submittedDate: new Date("2025-03-15"), notes: "Track construction and signal installation" },
    { awardId: AWARD_IDS.txdotEast5th, expenseIds: ["SCP 5th St all"], totalAmount: 4_310_000, status: "payment_received", submittedDate: new Date("2024-09-15"), approvedDate: new Date("2024-10-05"), paymentDate: new Date("2024-10-25"), notes: "FY2024 annual drawdown - road construction and drainage" },
    { awardId: AWARD_IDS.txdotRider37, expenseIds: ["R37 engineering"], totalAmount: 540_000, status: "payment_received", submittedDate: new Date("2024-07-15"), approvedDate: new Date("2024-08-01"), paymentDate: new Date("2024-08-20"), notes: "Engineering and permitting drawdown" },
    { awardId: AWARD_IDS.txdotRider37, expenseIds: ["R37 paving + stormwater"], totalAmount: 1_200_000, status: "draft", notes: "Pending review — paving and stormwater expenses Q4 2024" },
    { awardId: AWARD_IDS.txdotAccess, expenseIds: ["Access road final"], totalAmount: 1_018_000, status: "submitted", submittedDate: new Date("2025-01-15"), notes: "Final drawdown - terminal access road closeout" },
  ];

  for (const dd of drawdowns) { await prisma.drawdownRequest.create({ data: dd }); }
  console.log(`  ✓ ${drawdowns.length} drawdown requests seeded`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8. BUDGET MODIFICATIONS (production: budget_modifications)
// ═══════════════════════════════════════════════════════════════════════════════

async function seedBudgetModifications() {
  console.log("Seeding budget modifications...");

  await prisma.budgetModification.create({
    data: {
      awardId: AWARD_IDS.pidp,
      fromCategoryId: BUDGET_CAT_IDS.pidp_admin, toCategoryId: BUDGET_CAT_IDS.pidp_warehouse,
      amount: 75_000,
      justification: "Administration costs running under budget; additional warehouse MEP work identified during construction requiring reallocation.",
      status: "approved", requestedDate: new Date("2024-08-01"), approvedDate: new Date("2024-08-20"),
    },
  });

  console.log("  ✓ 1 budget modification seeded");
}

// ═══════════════════════════════════════════════════════════════════════════════
// 9. SCHEDULED REPORTS (production: scheduled_reports)
// ═══════════════════════════════════════════════════════════════════════════════

async function seedScheduledReports() {
  console.log("Seeding scheduled reports...");

  // Due dates for non-submitted reports must stay in the future so the UI does not mark them overdue
  // (overdue = status !== submitted && dueDate < today).
  const reports = [
    { awardId: AWARD_IDS.pidp, type: "sf425", title: "SF-425 Federal Financial Report — Q4 2024", dueDate: new Date("2025-01-30"), periodStart: new Date("2024-10-01"), periodEnd: new Date("2024-12-31"), status: "submitted", submittedDate: new Date("2025-01-28") },
    { awardId: AWARD_IDS.pidp, type: "progress", title: "Quarterly Progress Report — Q4 2024", dueDate: new Date("2025-01-30"), periodStart: new Date("2024-10-01"), periodEnd: new Date("2024-12-31"), status: "submitted", submittedDate: new Date("2025-01-29") },
    { awardId: AWARD_IDS.pidp, type: "sf425", title: "SF-425 Federal Financial Report — Q1 2025", dueDate: new Date("2025-04-30"), periodStart: new Date("2025-01-01"), periodEnd: new Date("2025-03-31"), status: "submitted", submittedDate: new Date("2025-04-25") },
    { awardId: AWARD_IDS.pidp, type: "progress", title: "Quarterly Progress Report — Q1 2025", dueDate: new Date("2025-04-30"), periodStart: new Date("2025-01-01"), periodEnd: new Date("2025-03-31"), status: "submitted", submittedDate: new Date("2025-04-28") },
    { awardId: AWARD_IDS.pidp, type: "sf425", title: "SF-425 Federal Financial Report — Q2 2026", dueDate: new Date("2026-10-31"), periodStart: new Date("2026-04-01"), periodEnd: new Date("2026-06-30"), status: "upcoming" },
    { awardId: AWARD_IDS.pidp, type: "progress", title: "Quarterly Progress Report — Q2 2026", dueDate: new Date("2026-10-31"), periodStart: new Date("2026-04-01"), periodEnd: new Date("2026-06-30"), status: "upcoming" },
    { awardId: AWARD_IDS.crisi, type: "sf425", title: "SF-425 Federal Financial Report — Q4 2024", dueDate: new Date("2025-01-30"), periodStart: new Date("2024-10-01"), periodEnd: new Date("2024-12-31"), status: "submitted", submittedDate: new Date("2025-01-27") },
    { awardId: AWARD_IDS.crisi, type: "sf425", title: "SF-425 Federal Financial Report — Q2 2026", dueDate: new Date("2026-11-30"), periodStart: new Date("2026-04-01"), periodEnd: new Date("2026-06-30"), status: "in_progress", notes: "Draft in review" },
    { awardId: AWARD_IDS.crisi, type: "progress", title: "Semi-Annual Progress Report — H2 2026", dueDate: new Date("2027-02-26"), periodStart: new Date("2026-07-01"), periodEnd: new Date("2026-12-31"), status: "upcoming" },
    { awardId: AWARD_IDS.epa, type: "sf425", title: "SF-425 Federal Financial Report — Q3 2026", dueDate: new Date("2027-01-31"), periodStart: new Date("2026-07-01"), periodEnd: new Date("2026-09-30"), status: "drafting", notes: "First quarterly report under this award" },
    { awardId: AWARD_IDS.epa, type: "progress", title: "Semi-Annual Progress Report — H1 FY26", dueDate: new Date("2026-11-30"), periodStart: new Date("2025-10-01"), periodEnd: new Date("2026-03-31"), status: "drafting" },
    { awardId: AWARD_IDS.txdotEast5th, type: "sf425", title: "SF-425 Federal Financial Report — H2 2024", dueDate: new Date("2025-01-30"), periodStart: new Date("2024-07-01"), periodEnd: new Date("2024-12-31"), status: "submitted", submittedDate: new Date("2025-01-25") },
    { awardId: AWARD_IDS.txdotEast5th, type: "sf425", title: "SF-425 Federal Financial Report — H2 2026", dueDate: new Date("2027-02-01"), periodStart: new Date("2026-07-01"), periodEnd: new Date("2026-12-31"), status: "upcoming" },
    { awardId: AWARD_IDS.txdotAccess, type: "closeout", title: "Final Closeout Report", dueDate: new Date("2027-04-30"), periodStart: new Date("2022-07-01"), periodEnd: new Date("2026-06-30"), status: "in_progress", notes: "Complete all closeout checklist items before submission." },
    { awardId: AWARD_IDS.pidp, type: "sefa", title: "Schedule of Expenditures of Federal Awards (SEFA) — FY2024", dueDate: new Date("2025-03-31"), periodStart: new Date("2023-10-01"), periodEnd: new Date("2024-09-30"), status: "submitted", submittedDate: new Date("2025-03-28") },
    { awardId: AWARD_IDS.pidp, type: "single_audit", title: "Single Audit Report — FY2025", dueDate: new Date("2027-09-30"), periodStart: new Date("2024-10-01"), periodEnd: new Date("2025-09-30"), status: "in_progress", notes: "External auditor engaged — fieldwork in progress" },

    // ── SF-270 Reimbursement Requests ──
    { awardId: AWARD_IDS.pidp, type: "sf270", title: "SF-270 Request for Advance or Reimbursement — Q4 2024", dueDate: new Date("2025-01-30"), periodStart: new Date("2024-10-01"), periodEnd: new Date("2024-12-31"), status: "submitted", submittedDate: new Date("2025-01-28") },
    { awardId: AWARD_IDS.pidp, type: "sf270", title: "SF-270 Request for Advance or Reimbursement — Q1 2025", dueDate: new Date("2025-04-30"), periodStart: new Date("2025-01-01"), periodEnd: new Date("2025-03-31"), status: "submitted", submittedDate: new Date("2025-04-25") },
    { awardId: AWARD_IDS.pidp, type: "sf270", title: "SF-270 Request for Advance or Reimbursement — Q2 2026", dueDate: new Date("2026-10-31"), periodStart: new Date("2026-04-01"), periodEnd: new Date("2026-06-30"), status: "upcoming" },
    { awardId: AWARD_IDS.crisi, type: "sf270", title: "SF-270 Request for Advance or Reimbursement — Q4 2024", dueDate: new Date("2025-01-30"), periodStart: new Date("2024-10-01"), periodEnd: new Date("2024-12-31"), status: "submitted", submittedDate: new Date("2025-01-27") },
    { awardId: AWARD_IDS.crisi, type: "sf270", title: "SF-270 Request for Advance or Reimbursement — Q2 2026", dueDate: new Date("2026-11-30"), periodStart: new Date("2026-04-01"), periodEnd: new Date("2026-06-30"), status: "drafting", notes: "Pending expense reconciliation" },
    { awardId: AWARD_IDS.epa, type: "sf270", title: "SF-270 Request for Advance or Reimbursement — Q3 2026", dueDate: new Date("2027-01-31"), periodStart: new Date("2026-07-01"), periodEnd: new Date("2026-09-30"), status: "upcoming" },
    { awardId: AWARD_IDS.txdotEast5th, type: "sf270", title: "SF-270 Request for Advance or Reimbursement — H2 2024", dueDate: new Date("2025-01-30"), periodStart: new Date("2024-07-01"), periodEnd: new Date("2024-12-31"), status: "submitted", submittedDate: new Date("2025-01-25") },
    { awardId: AWARD_IDS.txdotRider37, type: "sf270", title: "SF-270 Request for Advance or Reimbursement — Q2 2026", dueDate: new Date("2026-10-31"), periodStart: new Date("2026-04-01"), periodEnd: new Date("2026-06-30"), status: "upcoming" },

    // ── BABA Compliance Reports (infrastructure programs: PIDP, CRISI) ──
    { awardId: AWARD_IDS.pidp, type: "baba", title: "BABA Compliance Report — Q4 2024", dueDate: new Date("2025-01-30"), periodStart: new Date("2024-10-01"), periodEnd: new Date("2024-12-31"), status: "submitted", submittedDate: new Date("2025-01-28") },
    { awardId: AWARD_IDS.pidp, type: "baba", title: "BABA Compliance Report — Q1 2025", dueDate: new Date("2025-04-30"), periodStart: new Date("2025-01-01"), periodEnd: new Date("2025-03-31"), status: "submitted", submittedDate: new Date("2025-04-26") },
    { awardId: AWARD_IDS.pidp, type: "baba", title: "BABA Compliance Report — Q2 2026", dueDate: new Date("2026-10-31"), periodStart: new Date("2026-04-01"), periodEnd: new Date("2026-06-30"), status: "drafting", notes: "Reviewing domestic content certifications for warehouse steel procurement" },
    { awardId: AWARD_IDS.pidp, type: "baba", title: "BABA Compliance Report — Q3 2026", dueDate: new Date("2027-01-31"), periodStart: new Date("2026-07-01"), periodEnd: new Date("2026-09-30"), status: "upcoming" },
    { awardId: AWARD_IDS.crisi, type: "baba", title: "BABA Compliance Report — Q4 2024", dueDate: new Date("2025-01-30"), periodStart: new Date("2024-10-01"), periodEnd: new Date("2024-12-31"), status: "submitted", submittedDate: new Date("2025-01-27") },
    { awardId: AWARD_IDS.crisi, type: "baba", title: "BABA Compliance Report — Q2 2026", dueDate: new Date("2026-11-30"), periodStart: new Date("2026-04-01"), periodEnd: new Date("2026-06-30"), status: "upcoming" },
  ];

  for (const report of reports) { await prisma.scheduledReport.create({ data: report }); }
  console.log(`  ✓ ${reports.length} scheduled reports seeded`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 10. USERS (shared: users)
// ═══════════════════════════════════════════════════════════════════════════════

async function seedUsers() {
  console.log("Seeding users...");
  const users = [
    { email: "drafter@freeport-mock.demo", name: "Jason Cordoba", title: "Grants Accountant", role: "drafter" },
    { email: "reviewer@freeport-mock.demo", name: "Chris Hogan", title: "Grants Director", role: "reviewer" },
    { email: "cfo@freeport-mock.demo", name: "Phyllis Saathoff", title: "Executive Director / CEO", role: "certifying_official" },
  ];
  for (const user of users) {
    await prisma.$executeRawUnsafe(`
      INSERT INTO users (id, port_id, email, name, title, role, created_at, updated_at)
      VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, NOW(), NOW())
      ON CONFLICT (email) DO NOTHING
    `, "freeport-mock", user.email, user.name, user.title, user.role);
    console.log(`  Seeded: ${user.email}`);
  }
  console.log(`  ✓ ${users.length} users seeded`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log("\n══════════════════════════════════════════════════════════════");
  console.log("  Seeding Port Freeport Mock — Production Tables");
  console.log("══════════════════════════════════════════════════════════════\n");

  try {
    await cleanup();               console.log("");
    await seedPortProfile();       console.log("");
    await seedProjects();          console.log("");
    await seedAwards();            console.log("");
    await seedBudgetCategories();  console.log("");
    await seedExpenses();          console.log("");
    await seedMatchLedger();       console.log("");
    await seedDrawdowns();         console.log("");
    await seedBudgetModifications(); console.log("");
    await seedScheduledReports();  console.log("");
    await seedUsers();

    console.log("\n══════════════════════════════════════════════════════════════");
    console.log("  ✓ Port Freeport Mock seed complete (production tables)!");
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
