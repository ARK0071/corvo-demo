/**
 * Seed script for Port Freeport DEMO — full profile with all prepopulated mock data.
 * Uses the existing static data from src/data/ as the source of truth, adapted for DB.
 *
 * Run: npx tsx src/scripts/seed-freeport-demo.ts
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

const PORT_ID = "freeport-demo";

// ─── Deterministic UUIDs ───
const PROFILE_ID = "b16e4de2-0001-4000-8000-000000000001";

const PROJECT_IDS = {
  fhcip: "b16e4de2-0002-4000-8000-000000000001",
  velascoPhase2: "b16e4de2-0002-4000-8000-000000000002",
  zeroEmission: "b16e4de2-0002-4000-8000-000000000003",
  portSecurity: "b16e4de2-0002-4000-8000-000000000004",
  stormwaterResilience: "b16e4de2-0002-4000-8000-000000000005",
  velascoAccess: "b16e4de2-0002-4000-8000-000000000006",
  stsCranes: "b16e4de2-0002-4000-8000-000000000007",
  concrete15: "b16e4de2-0002-4000-8000-000000000008",
  terminalStreet: "b16e4de2-0002-4000-8000-000000000009",
  cathodic: "b16e4de2-0002-4000-8000-00000000000a",
  railIndustrial: "b16e4de2-0002-4000-8000-00000000000b",
  pavementRepairs: "b16e4de2-0002-4000-8000-00000000000c",
};

const GRANT_IDS = {
  pidp: "PIDP-FY2026-MARAD",
  cleanPorts: "EPA-CLEAN-PORTS-2026",
  crisi: "FRA-CRISI-FY2026",
  psgp: "DHS-FEMA-PSGP-2026-FPT",
  raise: "USDOT-RAISE-FY2026",
  iijaPorts: "IIJA-PORT-INFRA-2026",
};

const AWARD_IDS = {
  pidp: "b16e4de2-0003-4000-8000-000000000001",
  crisi: "b16e4de2-0003-4000-8000-000000000002",
  epa: "b16e4de2-0003-4000-8000-000000000003",
  txdotEast5th: "b16e4de2-0003-4000-8000-000000000004",
  txdotRider37: "b16e4de2-0003-4000-8000-000000000005",
  txdotAccess: "b16e4de2-0003-4000-8000-000000000006",
};

const BUDGET_CAT_IDS = {
  pidp_warehouse: "b16e4de2-0004-4000-8000-000000000001",
  pidp_site: "b16e4de2-0004-4000-8000-000000000002",
  pidp_gate: "b16e4de2-0004-4000-8000-000000000003",
  pidp_admin: "b16e4de2-0004-4000-8000-000000000004",
  crisi_track: "b16e4de2-0004-4000-8000-000000000005",
  crisi_signal: "b16e4de2-0004-4000-8000-000000000006",
  crisi_engineering: "b16e4de2-0004-4000-8000-000000000007",
  crisi_admin: "b16e4de2-0004-4000-8000-000000000008",
  epa_emissions: "b16e4de2-0004-4000-8000-000000000009",
  epa_planning: "b16e4de2-0004-4000-8000-00000000000a",
  epa_framework: "b16e4de2-0004-4000-8000-00000000000b",
  epa_admin: "b16e4de2-0004-4000-8000-00000000000c",
  scp_road: "b16e4de2-0004-4000-8000-00000000000d",
  scp_drainage: "b16e4de2-0004-4000-8000-00000000000e",
  scp_engineering: "b16e4de2-0004-4000-8000-00000000000f",
  scp_admin: "b16e4de2-0004-4000-8000-000000000010",
  r37_paving: "b16e4de2-0004-4000-8000-000000000011",
  r37_reefer: "b16e4de2-0004-4000-8000-000000000012",
  r37_stormwater: "b16e4de2-0004-4000-8000-000000000013",
  r37_engineering: "b16e4de2-0004-4000-8000-000000000014",
  access_construction: "b16e4de2-0004-4000-8000-000000000015",
  access_signals: "b16e4de2-0004-4000-8000-000000000016",
  access_engineering: "b16e4de2-0004-4000-8000-000000000017",
  access_admin: "b16e4de2-0004-4000-8000-000000000018",
};

// ═══════════════════════════════════════════════════════════════════════════════
// 1. PORT PROFILE
// ═══════════════════════════════════════════════════════════════════════════════

async function seedPortProfile() {
  console.log("Seeding Port Freeport DEMO profile...");

  await prisma.$executeRawUnsafe(`
    INSERT INTO demo_port_profiles (id, port_id, slug, name, entity_type, classification, location,
      characteristics, priorities, capabilities, needs, certifications, environmental_goals, community_impact,
      legal_name, uei, ein, location_data, leadership, financials, infrastructure, operations,
      economic_impact, past_grant_awards, disadvantaged_community_data, climate_resilience_data,
      created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9::jsonb, $10::jsonb, $11::jsonb, $12::jsonb,
      $13::jsonb, $14::jsonb, $15, $16, $17, $18::jsonb, $19::jsonb, $20::jsonb, $21::jsonb, $22::jsonb,
      $23::jsonb, $24::jsonb, $25::jsonb, $26::jsonb, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name, entity_type = EXCLUDED.entity_type, classification = EXCLUDED.classification,
      location = EXCLUDED.location, characteristics = EXCLUDED.characteristics, priorities = EXCLUDED.priorities,
      capabilities = EXCLUDED.capabilities, needs = EXCLUDED.needs, certifications = EXCLUDED.certifications,
      environmental_goals = EXCLUDED.environmental_goals, community_impact = EXCLUDED.community_impact,
      legal_name = EXCLUDED.legal_name, uei = EXCLUDED.uei, ein = EXCLUDED.ein,
      location_data = EXCLUDED.location_data, leadership = EXCLUDED.leadership, financials = EXCLUDED.financials,
      infrastructure = EXCLUDED.infrastructure, operations = EXCLUDED.operations,
      economic_impact = EXCLUDED.economic_impact, past_grant_awards = EXCLUDED.past_grant_awards,
      disadvantaged_community_data = EXCLUDED.disadvantaged_community_data,
      climate_resilience_data = EXCLUDED.climate_resilience_data, updated_at = NOW()
  `,
    PROFILE_ID, PORT_ID, "freeport-demo", "Port Freeport",
    "Special district government", "Public Port Authority",
    JSON.stringify({ city: "Freeport", state: "Texas", stateCode: "TX", county: "Brazoria County", region: "Gulf Coast" }),
    JSON.stringify({ cargoTypes: ["Container", "Bulk", "Breakbulk", "Liquid Bulk", "Project Cargo"], annualTonnage: 30_000_000, employeeCount: 50, operatingBudget: 50_000_000 }),
    JSON.stringify(["Port infrastructure modernization", "Zero-emission equipment", "Intermodal connectivity", "Climate resilience", "Environmental sustainability", "Security enhancements", "Economic development", "Workforce development"]),
    JSON.stringify(["Deep-water port operations", "Container terminal operations", "Bulk cargo handling", "Liquid bulk facilities", "Intermodal rail connections", "Warehousing and logistics", "Heavy-lift cargo"]),
    JSON.stringify(["Port electrification infrastructure", "Berth deepening and expansion", "Gate automation technology", "Shore power systems", "Stormwater management", "Hurricane resilience improvements", "Security and surveillance upgrades", "Rail infrastructure improvements", "Zero-emission cargo handling equipment"]),
    JSON.stringify(["Green Marine Environmental Certification (Level 3)", "ISO 14001 Environmental Management System", "OSHA Voluntary Protection Program - Star Site", "C-TPAT Partner", "MTSA-compliant Facility Security Plan"]),
    JSON.stringify(["Transition to 100% zero-emission cargo handling equipment by 2035", "Install shore power at all berths by 2028", "Reduce port-related PM2.5 and NOx emissions by 60% (2019 baseline)", "Implement green stormwater infrastructure across all facilities", "Achieve carbon neutrality in Scope 1 and 2 emissions by 2040"]),
    JSON.stringify(["Workforce Development Center - annual training for 200+ local workers in maritime logistics, heavy equipment, and safety certifications", "Port Freeport Scholarship Program - $500K annual scholarships to Brazoria County students", "Community Advisory Panel - quarterly meetings with Freeport, Quintana, and Jones Creek residents", "Local First Procurement Policy - 35% of operating spend directed to Brazoria County businesses", "Environmental Justice Initiative - community air quality monitoring at 6 fence-line stations"]),
    "Brazoria County Navigation District No. 1 d/b/a Port Freeport",
    "EXAMPLE1234567", "74-6000000",
    JSON.stringify({ address: "1100 Cherry St", city: "Freeport", state: "TX", zip: "77541", congressionalDistrict: "TX-14", latitude: 28.9541, longitude: -95.3597 }),
    JSON.stringify({ executiveDirector: "Phyllis Saathoff", cfo: "John Hoss", boardChair: "Shane Pirtle" }),
    JSON.stringify({ annualRevenue: 30_000_000, operatingBudget: 50_000_000, capitalBudget: 120_000_000, bondRating: "A+ (S&P)", matchFundingCapacity: 80_000_000, totalAssets: 450_000_000 }),
    JSON.stringify({ terminalFacilities: ["Velasco Terminal - Container and general cargo, 2 berths, 500,000 TEU capacity", "Parcel Terminal - Bulk and breakbulk cargo, 4 berths", "Liquid Cargo Dock - Chemical and petroleum product transfers", "Phillips 66/Freeport LNG - Adjacent private terminals with shared channel"], channelDepth: 46, channelWidth: 400, berths: 8, railConnections: ["BNSF Railway - direct rail access to Velasco Terminal", "Union Pacific - interchange via BNSF connection", "SH 36 corridor - dedicated port access road"], acreage: 250 }),
    JSON.stringify({ annualTonnage: 30_000_000, annualTEUs: 95_000, vesselCalls: 1_200, employeeCount: 50, directJobs: 2_400, cargoTypes: ["Containerized cargo", "Dry bulk (aggregates, cement, salt)", "Liquid bulk (chemicals, petroleum)", "Breakbulk and project cargo", "LNG (adjacent Freeport LNG facility)"] }),
    JSON.stringify({ regionalEconomicImpact: 5_800_000_000, directJobs: 2_400, totalJobs: 25_000, tradeValue: 28_000_000_000, annualTaxRevenue: 95_000_000 }),
    JSON.stringify([
      { program: "PIDP", awardYear: 2021, awardAmount: 22_000_000, projectName: "Velasco Terminal Phase 1 - Crane and Berth Improvements", agency: "MARAD", status: "Completed" },
      { program: "Port Security Grant Program (PSGP)", awardYear: 2020, awardAmount: 1_200_000, projectName: "Surveillance and Access Control Modernization", agency: "FEMA", status: "Completed" },
      { program: "PSGP", awardYear: 2022, awardAmount: 850_000, projectName: "Cybersecurity Infrastructure Enhancement", agency: "FEMA", status: "Completed" },
      { program: "RAISE", awardYear: 2023, awardAmount: 15_000_000, projectName: "Intermodal Rail Connectivity - Velasco Terminal Rail Spur", agency: "USDOT", status: "In progress" },
    ]),
    JSON.stringify({ description: "Adjacent census tracts (48039-7101, 7102, 7103) in Freeport, TX qualify as disadvantaged under CEJST and EJScreen. The area has elevated environmental burden indicators and below-median income levels.", povertyRate: 18.7, pm25Percentile: 82, justiceFortyTracker: true, censusTract: "48039-7101, 48039-7102, 48039-7103" }),
    JSON.stringify({ floodZone: "AE (100-year coastal flood zone)", hurricaneExposure: "High - Category 3+ hurricane return period approximately 15 years. Facility directly impacted by Hurricane Harvey (2017).", emissionsBaseline: "42,000 metric tons CO2e (2019 baseline - Scope 1 and 2)", emissionsReductionTarget: "50% reduction by 2030; carbon neutrality by 2040", existingMitigations: ["Hurricane preparedness and evacuation plan (updated annually)", "Seawall and bulkhead elevation at Velasco Terminal", "Backup generator system for critical operations", "Elevated electrical infrastructure at new berths"], plannedMitigations: ["Green infrastructure - 15-acre bioswale and retention system", "Elevation of remaining electrical systems above 500-year flood level", "Living shoreline pilot along Brazos River entrance", "Resilient pavement and drainage upgrades across container yard"] }),
  );

  console.log("  ✓ Port profile seeded");
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. PROJECTS
// ═══════════════════════════════════════════════════════════════════════════════

async function seedProjects() {
  console.log("Seeding projects...");
  await prisma.demoProject.deleteMany({ where: { portId: PORT_ID } });

  const projects = [
    {
      id: PROJECT_IDS.fhcip, portId: PORT_ID, portProfileId: PROFILE_ID,
      name: "Freeport Harbor Channel Improvement Project (FHCIP)",
      description: "Deepening the Freeport Harbor Channel from 46 ft to 56 ft MLLW in partnership with USACE. Enables accommodation of larger Post-Panamax vessels and increases port competitiveness.",
      projectType: "infrastructure", status: "construction", priority: "critical", budget: 295_000_000,
      location: "Freeport Harbor Channel", startDate: new Date("2023-06-01"), endDate: new Date("2027-12-31"),
      focusAreas: ["Channel deepening", "Navigation improvement", "Port infrastructure", "Economic competitiveness", "Freight movement"],
      notes: "USACE partnership. Federal cost-share secured. NEPA Record of Decision obtained.",
      fundingSource: "USACE federal appropriation + Port Freeport local match",
      costShareSource: "Port Freeport Series 2024 Revenue Bonds + operating reserves",
      nepaStatus: "record_of_decision", nepaDocument: "Environmental Impact Statement (EIS)", nepaCompletionDate: new Date("2022-09-15"),
      designCompletion: 100, designPhase: "complete",
      permits: [{ name: "USACE Section 10/404 Permit", status: "obtained", date: "2022-11-01" }, { name: "TCEQ Water Quality Certification", status: "obtained", date: "2022-10-15" }, { name: "USCG Bridge Permit", status: "obtained", date: "2023-01-20" }],
      rightOfWay: "acquired", procurementApproach: "Design-bid-build, USACE-managed construction contract",
      constructionStartTarget: new Date("2023-06-01"), shovelReady: true,
      priorFederalAwards: [{ program: "USACE Civil Works", amount: 117_000_000, year: 2022, status: "active" }],
      auditFindings: "none", onTimeCompletion: 95, jobsCreated: 850, jobsRetained: 2400, tonnageImpact: 15_000_000,
      emissionsReduction: "Enables larger vessels with lower per-TEU fuel consumption, estimated 18% reduction in vessel emissions per ton of cargo",
      safetyImpact: "Eliminates need for tide-restricted transit of large vessels, reducing collision risk",
      economicImpact: "$3.2B estimated regional economic impact over 20 years",
      communitiesBenefited: "Brazoria County (pop. 388,000), including Freeport, Clute, Lake Jackson, and Angleton",
    },
    {
      id: PROJECT_IDS.velascoPhase2, portId: PORT_ID, portProfileId: PROFILE_ID,
      name: "Velasco Terminal Phase 2 Expansion",
      description: "Expansion of the Velasco Container Terminal including additional berths, container yard, and intermodal rail connections to increase container throughput capacity.",
      projectType: "expansion", status: "design", priority: "high", budget: 180_000_000,
      location: "Velasco Terminal", startDate: new Date("2025-01-01"), endDate: new Date("2028-06-30"),
      focusAreas: ["Container terminal", "Intermodal connectivity", "Rail infrastructure", "Port expansion", "Supply chain"],
      notes: "Preliminary engineering 60% complete.",
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
      id: PROJECT_IDS.zeroEmission, portId: PORT_ID, portProfileId: PROFILE_ID,
      name: "Zero-Emission Equipment Deployment",
      description: "Procurement and deployment of zero-emission cargo handling equipment including electric RTG cranes, yard tractors, and shore power systems to improve operational efficiency and energy resilience.",
      projectType: "equipment", status: "procurement", priority: "high", budget: 45_000_000,
      location: "Port-wide", startDate: new Date("2025-03-01"), endDate: new Date("2026-12-31"),
      focusAreas: ["Energy resilience", "Electrification", "Shore power", "Air quality", "Operational efficiency", "Equipment modernization"],
      notes: "RFP for electric RTGs released. EPA Clean Ports application under development.",
      nepaStatus: "categorical_exclusion", nepaDocument: "Categorical Exclusion (CE) — equipment replacement on existing facilities",
      designCompletion: 90, designPhase: "final",
      permits: [{ name: "Electrical infrastructure permit", status: "obtained", date: "2025-01-10" }, { name: "Air quality permit modification", status: "pending" }],
      rightOfWay: "not_needed", procurementApproach: "Competitive RFP for equipment + installation, sole source for OEM shore power",
      constructionStartTarget: new Date("2025-06-01"), shovelReady: true,
      priorFederalAwards: [], auditFindings: "none",
      jobsCreated: 25, jobsRetained: 180,
      emissionsReduction: "Estimated 4,200 tons CO2e/year reduction; eliminates 98% of NOx from replaced diesel equipment",
      safetyImpact: "Reduces diesel particulate exposure for 180+ terminal workers",
      communitiesBenefited: "Freeport, Clute, and surrounding environmental justice communities within 1-mile radius of port operations",
    },
    {
      id: PROJECT_IDS.portSecurity, portId: PORT_ID, portProfileId: PROFILE_ID,
      name: "Port Security Enhancement Program",
      description: "Upgrades to TWIC-compliant access control, CCTV surveillance network, perimeter intrusion detection, and cybersecurity infrastructure.",
      projectType: "security", status: "planning", priority: "medium", budget: 12_000_000,
      location: "Port-wide", focusAreas: ["Port security", "Cybersecurity", "Access control", "Surveillance", "MTSA compliance"],
      permits: [], priorFederalAwards: [], auditFindings: "none",
    },
    {
      id: PROJECT_IDS.stormwaterResilience, portId: PORT_ID, portProfileId: PROFILE_ID,
      name: "Stormwater and Climate Resilience Infrastructure",
      description: "Green infrastructure improvements including bioswales, retention ponds, elevated electrical systems, and hurricane-hardened facilities.",
      projectType: "resilience", status: "planning", priority: "medium", budget: 28_000_000,
      location: "Port-wide", focusAreas: ["Climate resilience", "Stormwater management", "Hurricane resilience", "Green infrastructure", "Flood mitigation"],
      permits: [], priorFederalAwards: [], auditFindings: "none",
    },
    {
      id: PROJECT_IDS.velascoAccess, portId: PORT_ID, portProfileId: PROFILE_ID,
      name: "Velasco Terminal Access & North Gate Entrance",
      description: "Construction of new terminal access road and north gate entrance facility to improve traffic flow and reduce congestion at the Velasco Terminal.",
      projectType: "infrastructure", status: "construction", priority: "high", budget: 11_900_000,
      location: "Velasco Terminal", startDate: new Date("2024-06-01"),
      focusAreas: ["Terminal access", "Traffic management", "Gate infrastructure", "Port operations"],
      permits: [], priorFederalAwards: [], auditFindings: "none",
    },
    {
      id: PROJECT_IDS.stsCranes, portId: PORT_ID, portProfileId: PROFILE_ID,
      name: "Super Post-Panamax STS Gantry Cranes (2 units)",
      description: "Procurement of two super post-Panamax ship-to-shore gantry cranes for the Velasco Container Terminal to handle larger vessels and increase throughput.",
      projectType: "equipment", status: "procurement", priority: "critical", budget: 50_000_000,
      location: "Velasco Terminal",
      focusAreas: ["Container handling", "Crane infrastructure", "Port modernization", "Vessel accommodation", "Cargo throughput"],
      notes: "Ordered, delivery expected FY2025. Funded via Series 2024 revenue bonds.",
      permits: [], priorFederalAwards: [], auditFindings: "none",
    },
    {
      id: PROJECT_IDS.concrete15, portId: PORT_ID, portProfileId: PROFILE_ID,
      name: "15-Acre Concrete Storage Area",
      description: "Construction of a 15-acre concrete storage area for container and cargo staging, part of the $25.6M combined concrete/street improvement program.",
      projectType: "infrastructure", status: "planning", priority: "medium", budget: 12_800_000,
      location: "Velasco Terminal Area", startDate: new Date("2025-01-01"),
      focusAreas: ["Container storage", "Yard expansion", "Cargo staging", "Port capacity"],
      notes: "Partially grant-funded.",
      permits: [], priorFederalAwards: [], auditFindings: "none",
    },
    {
      id: PROJECT_IDS.terminalStreet, portId: PORT_ID, portProfileId: PROFILE_ID,
      name: "Terminal Access Street Reconstruction",
      description: "Reconstruction of terminal access streets to support increased heavy truck traffic from expanded container and RoRo operations.",
      projectType: "infrastructure", status: "planning", priority: "medium", budget: 12_800_000,
      location: "Port-wide", startDate: new Date("2025-01-01"),
      focusAreas: ["Road reconstruction", "Heavy vehicle access", "Port infrastructure", "Freight movement"],
      notes: "Part of $25.6M combined program. Partially grant-funded.",
      permits: [], priorFederalAwards: [], auditFindings: "none",
    },
    {
      id: PROJECT_IDS.cathodic, portId: PORT_ID, portProfileId: PROFILE_ID,
      name: "Cathodic Protection Systems",
      description: "Installation and upgrade of cathodic protection systems across port dock infrastructure to prevent corrosion and extend asset lifespan.",
      projectType: "maintenance", status: "construction", priority: "medium", budget: 4_660_000,
      location: "Port-wide",
      focusAreas: ["Corrosion prevention", "Dock maintenance", "Asset preservation", "Marine infrastructure"],
      notes: "$241K expended to date. Funded via Series 2024 revenue bonds.",
      permits: [], priorFederalAwards: [], auditFindings: "none",
    },
    {
      id: PROJECT_IDS.railIndustrial, portId: PORT_ID, portProfileId: PROFILE_ID,
      name: "Rail-Served Industrial Park Development",
      description: "Development of a rail-served industrial park with 40,000 ft of rail tracks, vehicle storage, warehousing, and distribution centers to support intermodal commerce.",
      projectType: "expansion", status: "planning", priority: "high", budget: 75_000_000,
      location: "Port Freeport Industrial Area",
      focusAreas: ["Rail infrastructure", "Intermodal connectivity", "Warehousing", "Distribution", "Industrial development", "Supply chain"],
      notes: "Strategic Initiative #3. Supports efficient commerce movement to Texas/U.S. markets.",
      permits: [], priorFederalAwards: [], auditFindings: "none",
    },
    {
      id: PROJECT_IDS.pavementRepairs, portId: PORT_ID, portProfileId: PROFILE_ID,
      name: "Portwide Pavement Repairs",
      description: "Comprehensive pavement repair and rehabilitation program across all port facilities to maintain safe and efficient operations.",
      projectType: "maintenance", status: "construction", priority: "medium", budget: 4_778_772,
      location: "Port-wide",
      focusAreas: ["Pavement repair", "Road maintenance", "Port operations", "Safety"],
      notes: "$4.76M of $4.78M authorized already expended.",
      permits: [], priorFederalAwards: [], auditFindings: "none",
    },
  ];

  for (const project of projects) {
    await prisma.demoProject.create({ data: project });
    console.log(`  Created: ${project.name}`);
  }
  console.log(`  ✓ ${projects.length} projects seeded`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. DISCOVERED GRANTS
// ═══════════════════════════════════════════════════════════════════════════════

async function seedDiscoveredGrants() {
  console.log("Seeding discovered grants...");
  await prisma.demoPipelineGrant.deleteMany({ where: { portId: PORT_ID } });
  for (const grantId of Object.values(GRANT_IDS)) {
    await prisma.demoDiscoveredGrant.deleteMany({ where: { id: grantId } });
  }

  const grants = [
    {
      id: GRANT_IDS.pidp, portId: PORT_ID,
      title: "FY 2026 Port Infrastructure Development Program (PIDP)",
      agency: "U.S. Department of Transportation — Maritime Administration (MARAD)",
      agencyCode: "DOT", opportunityNumber: "MARAD-PIDP-FY2026",
      description: "Competitive discretionary grant program to fund improvements at coastal seaports, inland river ports, and Great Lakes ports. Supports projects that improve safety, efficiency, and reliability of goods movement through ports.",
      awardFloor: 1_000_000, awardCeiling: 100_000_000, totalFunding: 662_000_000,
      closeDate: new Date("2026-09-15"), postDate: new Date("2026-05-01"), status: "posted",
      applicationUrl: "https://www.maritime.dot.gov/PIDPgrants", costSharing: true,
      eligibility: ["Port authorities", "State and local governments", "Tribal governments", "Special purpose districts"],
      fundingCategories: ["Port Infrastructure", "Intermodal Connectivity", "Climate Resilience", "Zero-Emission Equipment"],
      fundingInstruments: ["Grant"], alnNumbers: ["20.823"],
      contactName: "PIDP Program Office", contactEmail: "pidp@dot.gov",
    },
    {
      id: GRANT_IDS.cleanPorts, portId: PORT_ID,
      title: "EPA Clean Ports Program — Zero-Emission Technology Deployment",
      agency: "U.S. Environmental Protection Agency — Office of Transportation and Air Quality",
      agencyCode: "EPA", opportunityNumber: "EPA-OAR-OTAQ-26-03",
      description: "Provides funding for zero-emission port equipment and infrastructure, reducing diesel emissions and improving air quality in port-adjacent communities under the Inflation Reduction Act.",
      awardFloor: 5_000_000, awardCeiling: 500_000_000, totalFunding: 3_000_000_000,
      closeDate: new Date("2026-08-15"), postDate: new Date("2026-03-01"), status: "posted",
      applicationUrl: "https://www.epa.gov/ports-initiative/cleanports", costSharing: false,
      eligibility: ["Port authorities", "State and local agencies", "Tribal governments", "Air quality agencies"],
      fundingCategories: ["Zero-Emission Equipment", "Shore Power", "Electrification", "Air Quality"],
      fundingInstruments: ["Grant"], alnNumbers: ["66.956"],
      contactName: "EPA Clean Ports Program", contactEmail: "cleanports@epa.gov",
    },
    {
      id: GRANT_IDS.crisi, portId: PORT_ID,
      title: "FY 2026 Consolidated Rail Infrastructure and Safety Improvements (CRISI)",
      agency: "U.S. Department of Transportation — Federal Railroad Administration",
      agencyCode: "DOT", opportunityNumber: "FRA-CRISI-FY2026-001",
      description: "Funds projects that improve the safety, efficiency, and reliability of intercity passenger and freight rail. Eligible projects include grade crossing improvements, rail line relocation, and short-line rail rehabilitation.",
      awardFloor: 1_000_000, awardCeiling: 50_000_000, totalFunding: 350_000_000,
      closeDate: new Date("2026-10-01"), postDate: new Date("2026-06-01"), status: "posted",
      applicationUrl: "https://railroads.dot.gov/CRISI", costSharing: true,
      eligibility: ["State and local governments", "Port authorities", "Railroad carriers", "Amtrak"],
      fundingCategories: ["Rail Infrastructure", "Grade Crossings", "Intermodal Connectivity"],
      fundingInstruments: ["Grant"], alnNumbers: ["20.325"],
      contactName: "FRA Office of Railroad Development", contactEmail: "crisi@dot.gov",
    },
    {
      id: GRANT_IDS.psgp, portId: PORT_ID,
      title: "FY 2026 Port Security Grant Program (PSGP)",
      agency: "Department of Homeland Security — FEMA",
      agencyCode: "DHS", opportunityNumber: "DHS-FEMA-PSGP-FY2026",
      description: "Provides funding to protect critical port infrastructure from terrorism, enhance maritime domain awareness, improve port-wide maritime security risk management, and maintain or reestablish maritime security mitigation protocols.",
      awardFloor: 100_000, awardCeiling: 5_000_000, totalFunding: 90_000_000,
      closeDate: new Date("2026-10-31"), postDate: new Date("2026-08-01"), status: "posted",
      applicationUrl: "https://www.fema.gov/grants/preparedness/port-security", costSharing: true,
      eligibility: ["Port authorities", "State and local governments", "Private sector port operators"],
      fundingCategories: ["Port Security", "Maritime Domain Awareness", "Cybersecurity"],
      fundingInstruments: ["Grant"], alnNumbers: ["97.056"],
      contactName: "FEMA Grant Programs Directorate", contactEmail: "askcsid@fema.dhs.gov",
    },
    {
      id: GRANT_IDS.raise, portId: PORT_ID,
      title: "FY 2026 RAISE Discretionary Grants",
      agency: "U.S. Department of Transportation — Office of the Secretary",
      agencyCode: "DOT", opportunityNumber: "USDOT-RAISE-FY2026",
      description: "Rebuilding American Infrastructure with Sustainability and Equity grants fund surface transportation capital investments of regional or national significance. Projects eligible include highways, bridges, transit, rail, ports, and multimodal freight.",
      awardFloor: 5_000_000, awardCeiling: 45_000_000, totalFunding: 1_500_000_000,
      closeDate: new Date("2026-07-15"), postDate: new Date("2026-04-01"), status: "posted",
      applicationUrl: "https://www.transportation.gov/RAISEgrants", costSharing: true,
      eligibility: ["State and local governments", "Transit agencies", "Port authorities", "Metropolitan planning organizations"],
      fundingCategories: ["Surface Transportation", "Multimodal Freight", "Port Access", "Intermodal"],
      fundingInstruments: ["Grant"], alnNumbers: ["20.933"],
      contactName: "RAISE Program Office", contactEmail: "RAISEgrants@dot.gov",
    },
    {
      id: GRANT_IDS.iijaPorts, portId: PORT_ID,
      title: "IIJA Port Infrastructure and Waterway Improvements",
      agency: "U.S. Army Corps of Engineers",
      agencyCode: "DOD", opportunityNumber: "USACE-PORT-IIJA-2026",
      description: "Bipartisan Infrastructure Law funding for port and waterway infrastructure projects including channel deepening, lock improvements, and coastal resilience. Supports projects in the USACE Civil Works program.",
      awardFloor: 10_000_000, awardCeiling: 200_000_000, totalFunding: 2_250_000_000,
      closeDate: new Date("2026-12-31"), postDate: new Date("2026-01-15"), status: "posted",
      applicationUrl: "https://www.usace.army.mil/", costSharing: true,
      eligibility: ["Port authorities", "State and local governments", "Non-federal sponsors of USACE projects"],
      fundingCategories: ["Navigation", "Channel Deepening", "Coastal Resilience", "Flood Risk Management"],
      fundingInstruments: ["Cooperative Agreement"], alnNumbers: ["12.112"],
      contactName: "USACE Civil Works", contactEmail: "civilworks@usace.army.mil",
    },
  ];

  for (const grant of grants) {
    await prisma.demoDiscoveredGrant.create({ data: grant });
    console.log(`  Created: ${grant.title.slice(0, 60)}...`);
  }
  console.log(`  ✓ ${grants.length} discovered grants seeded`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. PIPELINE GRANTS
// ═══════════════════════════════════════════════════════════════════════════════

async function seedPipelineGrants() {
  console.log("Seeding pipeline grants...");

  const pipeline = [
    {
      portId: PORT_ID, grantId: GRANT_IDS.pidp, portProfileId: PROFILE_ID,
      stage: "applied", notes: "Application submitted for Velasco Terminal Phase 2 Expansion — $35M request with 20% local match committed.",
      overallScore: 92, eligibilityScore: 98, alignmentScore: 95, impactScore: 90, competitivenessScore: 85,
      recommendation: "strong_apply", eligibilityStatus: "eligible",
      strengths: ["Strong past PIDP performance (FY2023 award on track)", "Shovel-ready with 60% engineering complete", "Critical freight corridor — Gulf Coast gateway to Houston metro", "Significant economic impact: 1,200 jobs, $1.8B regional impact"],
      concerns: ["20% match requires $36M in local bond funding", "EA not yet complete (expected Sept 2025)", "Highly competitive — 200+ applications expected"],
      keyRequirements: ["Benefit-Cost Analysis (BCA)", "Environmental review documentation", "Letters of support from stakeholders", "20% non-federal match commitment"],
      scoredAt: new Date("2026-05-10"), addedAt: new Date("2026-05-01"),
    },
    {
      portId: PORT_ID, grantId: GRANT_IDS.cleanPorts, portProfileId: PROFILE_ID,
      stage: "applied", notes: "Application for $28M in zero-emission equipment — 8 electric RTGs, 20 yard tractors, 4 berth shore power systems.",
      overallScore: 88, eligibilityScore: 95, alignmentScore: 92, impactScore: 87, competitivenessScore: 78,
      recommendation: "strong_apply", eligibilityStatus: "eligible",
      strengths: ["Environmental justice community within 1-mile radius (CEJST qualified)", "Existing EPA Clean Ports planning grant provides strong foundation", "4,200 tons CO2e/year reduction quantified", "No match required — 100% federal"],
      concerns: ["Equipment lead times may extend beyond performance period", "Electrical infrastructure upgrades needed to support charging"],
      keyRequirements: ["Community Benefit Plan", "Emissions reduction quantification", "Equipment deployment schedule", "Workforce development plan"],
      scoredAt: new Date("2026-04-15"), addedAt: new Date("2026-03-20"),
    },
    {
      portId: PORT_ID, grantId: GRANT_IDS.crisi, portProfileId: PROFILE_ID,
      stage: "eligible", notes: "Evaluating for Parcel 14 Rail Development Phase 3 — 12,000 additional LF of track + UP interchange improvements.",
      overallScore: 82, eligibilityScore: 95, alignmentScore: 85, impactScore: 80, competitivenessScore: 68,
      recommendation: "apply", eligibilityStatus: "eligible",
      strengths: ["Existing CRISI award demonstrates FRA relationship", "BNSF and UP letters of support", "Direct connection to national freight rail network"],
      concerns: ["Phase 2 still in progress — may raise questions about readiness", "20% match requirement on top of existing rail commitments"],
      keyRequirements: ["Rail network analysis", "Safety improvement documentation", "Environmental review", "20% non-federal match"],
      scoredAt: new Date("2026-06-05"), addedAt: new Date("2026-06-01"),
    },
    {
      portId: PORT_ID, grantId: GRANT_IDS.psgp, portProfileId: PROFILE_ID,
      stage: "eligible", notes: "Annual PSGP application for cybersecurity and surveillance upgrades — aligns with Port Security Enhancement Program.",
      overallScore: 76, eligibilityScore: 90, alignmentScore: 80, impactScore: 72, competitivenessScore: 62,
      recommendation: "apply", eligibilityStatus: "eligible",
      strengths: ["Prior PSGP awards (FY2020 and FY2022) both completed on time", "MTSA-compliant facility", "Area Maritime Security Committee support"],
      concerns: ["Tier 2 port — lower base allocation than Tier 1 ports", "25% cost share requirement"],
      keyRequirements: ["Investment Justification (IJ)", "Alignment with Area Maritime Security Plan", "25% cost share", "TWIC compliance documentation"],
      scoredAt: new Date("2026-05-15"), addedAt: new Date("2026-05-10"),
    },
    {
      portId: PORT_ID, grantId: GRANT_IDS.raise, portProfileId: PROFILE_ID,
      stage: "eligible", notes: "Considering for Rail-Served Industrial Park — multimodal freight project with regional significance.",
      overallScore: 79, eligibilityScore: 90, alignmentScore: 82, impactScore: 78, competitivenessScore: 66,
      recommendation: "consider", eligibilityStatus: "eligible",
      strengths: ["Multimodal project with rail + highway + port integration", "Strong BCA — 20-year regional economic impact of $3B+", "Supports supply chain resilience"],
      concerns: ["RAISE is extremely competitive (~1,000 applications for ~100 awards)", "Project still in planning phase — lower readiness score", "$75M total cost may require phased approach"],
      keyRequirements: ["Benefit-Cost Analysis (BCA)", "Project readiness assessment", "20% non-federal match", "Climate and resilience assessment"],
      scoredAt: new Date("2026-04-20"), addedAt: new Date("2026-04-15"),
    },
    {
      portId: PORT_ID, grantId: GRANT_IDS.iijaPorts, portProfileId: PROFILE_ID,
      stage: "applied", notes: "USACE partnership — FHCIP Phase 2 acceleration funding. Non-federal sponsor cost-share agreement in place.",
      overallScore: 94, eligibilityScore: 100, alignmentScore: 96, impactScore: 92, competitivenessScore: 88,
      recommendation: "strong_apply", eligibilityStatus: "eligible",
      strengths: ["Active USACE project with existing cost-share agreement", "Record of Decision obtained — fully permitted", "Directly enables Post-Panamax vessel access", "IIJA specifically earmarks port/waterway infrastructure"],
      concerns: ["Federal appropriations timing may delay obligation", "Local match contribution schedule must align with USACE milestones"],
      keyRequirements: ["Non-federal sponsor agreement", "NEPA Record of Decision", "Project Partnership Agreement (PPA)", "Local match commitment letter"],
      scoredAt: new Date("2026-02-10"), addedAt: new Date("2026-01-20"),
    },
  ];

  for (const pg of pipeline) {
    await prisma.demoPipelineGrant.create({ data: pg });
    console.log(`  Created: ${pg.grantId} → ${pg.stage} (score: ${pg.overallScore})`);
  }
  console.log(`  ✓ ${pipeline.length} pipeline grants seeded`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. AWARDS (from static data in src/data/awards.ts)
// ═══════════════════════════════════════════════════════════════════════════════

async function seedAwards() {
  console.log("Seeding awards...");

  // Clear dependent tables
  for (const table of [
    "demo_corrective_action_plans", "demo_audit_findings",
    "demo_compliance_checklist_items", "demo_compliance_checklists",
    "demo_subrecipient_reports", "demo_subrecipients",
    "demo_closeout_checklists", "demo_scheduled_reports",
    "demo_budget_modifications", "demo_drawdown_requests",
    "demo_expenses", "demo_match_ledger", "demo_budget_categories", "demo_awards",
  ]) {
    await prisma.$executeRawUnsafe(`DELETE FROM ${table} WHERE port_id = $1`, PORT_ID);
  }

  const awards = [
    {
      id: AWARD_IDS.pidp, portId: PORT_ID, portProfileId: PROFILE_ID,
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
      id: AWARD_IDS.crisi, portId: PORT_ID, portProfileId: PROFILE_ID,
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
      id: AWARD_IDS.epa, portId: PORT_ID, portProfileId: PROFILE_ID,
      fain: "EPA-OAR-OTAQ-24-06-FPT", cfda: "66.956",
      awardingAgency: "U.S. Environmental Protection Agency",
      program: "EPA Clean Ports", title: "Port Freeport Clean Ports Planning & Emissions Inventory",
      description: "Comprehensive emissions inventory, port resiliency and zero-emission implementation plan, and performance measurement framework under the Inflation Reduction Act Clean Ports Program.",
      totalAmount: 1_487_000,
      performancePeriodStart: new Date("2024-10-01"), performancePeriodEnd: new Date("2027-09-30"),
      matchPercentage: 0, matchTypes: [], matchCommitted: 0, matchRequired: 0,
      status: "active", projectIds: [PROJECT_IDS.zeroEmission],
    },
    {
      id: AWARD_IDS.txdotEast5th, portId: PORT_ID, portProfileId: PROFILE_ID,
      fain: "SCP-2024-FPT-0018", cfda: "20.205",
      awardingAgency: "Texas Department of Transportation",
      program: "TxDOT SCP", title: "East 5th Street Reconstruction & Truck Queuing",
      description: "Complete reconstruction of East 5th Street with dedicated truck queuing lanes, improved drainage, pavement reinforcement for heavy cargo traffic, and enhanced pedestrian safety infrastructure.",
      totalAmount: 4_800_000,
      performancePeriodStart: new Date("2023-06-01"), performancePeriodEnd: new Date("2026-05-31"),
      matchPercentage: 20, matchTypes: ["cash", "in_kind"], matchCommitted: 960_000, matchRequired: 1_200_000,
      status: "active", projectIds: [PROJECT_IDS.terminalStreet],
    },
    {
      id: AWARD_IDS.txdotRider37, portId: PORT_ID, portProfileId: PROFILE_ID,
      fain: "R37-2024-FPT-0006", cfda: "20.205",
      awardingAgency: "Texas Department of Transportation",
      program: "TxDOT Rider 37", title: "Storage Area 5 Container Expansion",
      description: "Development of a 15-acre container storage expansion at the Velasco Container Terminal, including heavy-duty pavement, reefer plug infrastructure, lighting, and stormwater management.",
      totalAmount: 8_200_000,
      performancePeriodStart: new Date("2024-04-01"), performancePeriodEnd: new Date("2027-09-30"),
      matchPercentage: 10, matchTypes: ["cash"], matchCommitted: 820_000, matchRequired: 911_111,
      status: "active", projectIds: [PROJECT_IDS.concrete15],
    },
    {
      id: AWARD_IDS.txdotAccess, portId: PORT_ID, portProfileId: PROFILE_ID,
      fain: "SCP-2022-FPT-0009", cfda: "20.205",
      awardingAgency: "Texas Department of Transportation",
      program: "TxDOT SCP", title: "Velasco Terminal Access Road Widening",
      description: "Widening and reconstruction of the primary terminal access road from SH 36 to the Velasco Terminal gate, including turn lanes, signalization, and heavy-vehicle pavement design.",
      totalAmount: 3_600_000,
      performancePeriodStart: new Date("2022-07-01"), performancePeriodEnd: new Date("2025-06-30"),
      matchPercentage: 20, matchTypes: ["cash"], matchCommitted: 900_000, matchRequired: 900_000,
      status: "closeout_pending", projectIds: [PROJECT_IDS.velascoAccess],
    },
  ];

  for (const award of awards) {
    await prisma.demoAward.create({ data: award });
    console.log(`  Created: ${award.program} — ${award.title.slice(0, 50)}... ($${(Number(award.totalAmount) / 1_000_000).toFixed(1)}M)`);
  }
  console.log(`  ✓ ${awards.length} awards seeded`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. BUDGET CATEGORIES
// ═══════════════════════════════════════════════════════════════════════════════

async function seedBudgetCategories() {
  console.log("Seeding budget categories...");

  const cats = [
    // PIDP ($15.96M)
    { id: BUDGET_CAT_IDS.pidp_warehouse, portId: PORT_ID, awardId: AWARD_IDS.pidp, name: "Warehouse Construction", ceiling: 9_200_000, spent: 6_440_000 },
    { id: BUDGET_CAT_IDS.pidp_site, portId: PORT_ID, awardId: AWARD_IDS.pidp, name: "Site Improvements", ceiling: 3_800_000, spent: 2_660_000 },
    { id: BUDGET_CAT_IDS.pidp_gate, portId: PORT_ID, awardId: AWARD_IDS.pidp, name: "Truck Gate Infrastructure", ceiling: 1_960_000, spent: 1_372_000 },
    { id: BUDGET_CAT_IDS.pidp_admin, portId: PORT_ID, awardId: AWARD_IDS.pidp, name: "Project Administration", ceiling: 1_000_000, spent: 620_000 },
    // CRISI ($6.3M)
    { id: BUDGET_CAT_IDS.crisi_track, portId: PORT_ID, awardId: AWARD_IDS.crisi, name: "Track Construction", ceiling: 4_200_000, spent: 1_680_000 },
    { id: BUDGET_CAT_IDS.crisi_signal, portId: PORT_ID, awardId: AWARD_IDS.crisi, name: "Signaling & Crossings", ceiling: 1_100_000, spent: 440_000 },
    { id: BUDGET_CAT_IDS.crisi_engineering, portId: PORT_ID, awardId: AWARD_IDS.crisi, name: "Engineering & Design", ceiling: 650_000, spent: 585_000 },
    { id: BUDGET_CAT_IDS.crisi_admin, portId: PORT_ID, awardId: AWARD_IDS.crisi, name: "Project Management", ceiling: 350_000, spent: 175_000 },
    // EPA ($1.487M)
    { id: BUDGET_CAT_IDS.epa_emissions, portId: PORT_ID, awardId: AWARD_IDS.epa, name: "Emissions Inventory", ceiling: 620_000, spent: 248_000 },
    { id: BUDGET_CAT_IDS.epa_planning, portId: PORT_ID, awardId: AWARD_IDS.epa, name: "Resiliency Planning", ceiling: 520_000, spent: 104_000 },
    { id: BUDGET_CAT_IDS.epa_framework, portId: PORT_ID, awardId: AWARD_IDS.epa, name: "Performance Framework", ceiling: 197_000, spent: 39_000 },
    { id: BUDGET_CAT_IDS.epa_admin, portId: PORT_ID, awardId: AWARD_IDS.epa, name: "Administration & Outreach", ceiling: 150_000, spent: 75_000 },
    // TxDOT SCP 5th St ($4.8M)
    { id: BUDGET_CAT_IDS.scp_road, portId: PORT_ID, awardId: AWARD_IDS.txdotEast5th, name: "Road Construction", ceiling: 3_200_000, spent: 2_880_000 },
    { id: BUDGET_CAT_IDS.scp_drainage, portId: PORT_ID, awardId: AWARD_IDS.txdotEast5th, name: "Drainage & Utilities", ceiling: 900_000, spent: 810_000 },
    { id: BUDGET_CAT_IDS.scp_engineering, portId: PORT_ID, awardId: AWARD_IDS.txdotEast5th, name: "Engineering", ceiling: 450_000, spent: 432_000 },
    { id: BUDGET_CAT_IDS.scp_admin, portId: PORT_ID, awardId: AWARD_IDS.txdotEast5th, name: "Project Management", ceiling: 250_000, spent: 188_000 },
    // Rider 37 ($8.2M)
    { id: BUDGET_CAT_IDS.r37_paving, portId: PORT_ID, awardId: AWARD_IDS.txdotRider37, name: "Heavy-Duty Paving", ceiling: 4_800_000, spent: 1_440_000 },
    { id: BUDGET_CAT_IDS.r37_reefer, portId: PORT_ID, awardId: AWARD_IDS.txdotRider37, name: "Reefer Infrastructure", ceiling: 1_600_000, spent: 320_000 },
    { id: BUDGET_CAT_IDS.r37_stormwater, portId: PORT_ID, awardId: AWARD_IDS.txdotRider37, name: "Stormwater Management", ceiling: 1_200_000, spent: 480_000 },
    { id: BUDGET_CAT_IDS.r37_engineering, portId: PORT_ID, awardId: AWARD_IDS.txdotRider37, name: "Engineering & Permitting", ceiling: 600_000, spent: 540_000 },
    // Terminal Access ($3.6M) — closeout
    { id: BUDGET_CAT_IDS.access_construction, portId: PORT_ID, awardId: AWARD_IDS.txdotAccess, name: "Road Widening & Paving", ceiling: 2_200_000, spent: 2_200_000 },
    { id: BUDGET_CAT_IDS.access_signals, portId: PORT_ID, awardId: AWARD_IDS.txdotAccess, name: "Signalization & Safety", ceiling: 750_000, spent: 738_000 },
    { id: BUDGET_CAT_IDS.access_engineering, portId: PORT_ID, awardId: AWARD_IDS.txdotAccess, name: "Engineering & Design", ceiling: 400_000, spent: 392_000 },
    { id: BUDGET_CAT_IDS.access_admin, portId: PORT_ID, awardId: AWARD_IDS.txdotAccess, name: "Project Administration", ceiling: 250_000, spent: 241_000 },
  ];

  for (const cat of cats) { await prisma.demoBudgetCategory.create({ data: cat }); }
  console.log(`  ✓ ${cats.length} budget categories seeded`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. EXPENSES (from static seed data)
// ═══════════════════════════════════════════════════════════════════════════════

async function seedExpenses() {
  console.log("Seeding expenses...");

  const expenses = [
    // PIDP Velasco Terminal
    { portId: PORT_ID, awardId: AWARD_IDS.pidp, categoryId: BUDGET_CAT_IDS.pidp_warehouse, date: new Date("2024-06-15"), description: "Cross-dock warehouse foundation and steel erection", vendor: "McCarthy Building Companies", amount: 2_150_000, status: "drawn" },
    { portId: PORT_ID, awardId: AWARD_IDS.pidp, categoryId: BUDGET_CAT_IDS.pidp_warehouse, date: new Date("2024-09-20"), description: "Warehouse envelope and roofing installation", vendor: "McCarthy Building Companies", amount: 1_840_000, status: "drawn" },
    { portId: PORT_ID, awardId: AWARD_IDS.pidp, categoryId: BUDGET_CAT_IDS.pidp_warehouse, date: new Date("2025-03-10"), description: "Warehouse MEP rough-in and interior framing", vendor: "McCarthy Building Companies", amount: 1_650_000, status: "approved" },
    { portId: PORT_ID, awardId: AWARD_IDS.pidp, categoryId: BUDGET_CAT_IDS.pidp_site, date: new Date("2024-07-10"), description: "Site grading and utility infrastructure", vendor: "Webber LLC", amount: 1_420_000, status: "drawn" },
    { portId: PORT_ID, awardId: AWARD_IDS.pidp, categoryId: BUDGET_CAT_IDS.pidp_site, date: new Date("2025-01-15"), description: "Parking and container staging area paving", vendor: "Webber LLC", amount: 1_240_000, status: "approved" },
    { portId: PORT_ID, awardId: AWARD_IDS.pidp, categoryId: BUDGET_CAT_IDS.pidp_gate, date: new Date("2024-11-01"), description: "Truck gate OCR system and barrier installation", vendor: "IDENTEC Solutions", amount: 872_000, status: "approved" },
    { portId: PORT_ID, awardId: AWARD_IDS.pidp, categoryId: BUDGET_CAT_IDS.pidp_gate, date: new Date("2025-04-15"), description: "Gate management software and TWIC integration", vendor: "IDENTEC Solutions", amount: 500_000, status: "logged" },
    { portId: PORT_ID, awardId: AWARD_IDS.pidp, categoryId: BUDGET_CAT_IDS.pidp_admin, date: new Date("2024-10-01"), description: "Quarterly project management and MARAD reporting", vendor: "HDR Engineering", amount: 155_000, status: "drawn" },
    { portId: PORT_ID, awardId: AWARD_IDS.pidp, categoryId: BUDGET_CAT_IDS.pidp_admin, date: new Date("2025-01-01"), description: "Q1 2025 project management and reporting", vendor: "HDR Engineering", amount: 155_000, status: "approved" },
    { portId: PORT_ID, awardId: AWARD_IDS.pidp, categoryId: BUDGET_CAT_IDS.pidp_admin, date: new Date("2025-04-01"), description: "Q2 2025 project management and reporting", vendor: "HDR Engineering", amount: 155_000, status: "logged" },
    // CRISI Rail
    { portId: PORT_ID, awardId: AWARD_IDS.crisi, categoryId: BUDGET_CAT_IDS.crisi_engineering, date: new Date("2024-03-15"), description: "Track alignment design and UP coordination", vendor: "HNTB Corporation", amount: 385_000, status: "drawn" },
    { portId: PORT_ID, awardId: AWARD_IDS.crisi, categoryId: BUDGET_CAT_IDS.crisi_engineering, date: new Date("2024-09-01"), description: "Construction engineering and inspection", vendor: "HNTB Corporation", amount: 200_000, status: "approved" },
    { portId: PORT_ID, awardId: AWARD_IDS.crisi, categoryId: BUDGET_CAT_IDS.crisi_track, date: new Date("2024-08-01"), description: "Ladder track grading and ballast - Phase 1", vendor: "Herzog Contracting", amount: 890_000, status: "drawn" },
    { portId: PORT_ID, awardId: AWARD_IDS.crisi, categoryId: BUDGET_CAT_IDS.crisi_track, date: new Date("2025-01-10"), description: "Rail installation and welding - 12,000 LF", vendor: "Herzog Contracting", amount: 790_000, status: "approved" },
    { portId: PORT_ID, awardId: AWARD_IDS.crisi, categoryId: BUDGET_CAT_IDS.crisi_signal, date: new Date("2024-11-15"), description: "Grade crossing signal system design and installation", vendor: "Wabtec Corporation", amount: 440_000, status: "approved" },
    { portId: PORT_ID, awardId: AWARD_IDS.crisi, categoryId: BUDGET_CAT_IDS.crisi_admin, date: new Date("2024-06-01"), description: "FRA reporting and project coordination", vendor: "Port Freeport Staff", amount: 175_000, status: "drawn" },
    // EPA Clean Ports
    { portId: PORT_ID, awardId: AWARD_IDS.epa, categoryId: BUDGET_CAT_IDS.epa_emissions, date: new Date("2025-01-10"), description: "Baseline emissions inventory - mobile sources", vendor: "ERG (Eastern Research Group)", amount: 148_000, status: "approved" },
    { portId: PORT_ID, awardId: AWARD_IDS.epa, categoryId: BUDGET_CAT_IDS.epa_emissions, date: new Date("2025-02-15"), description: "Stationary source emissions assessment", vendor: "ERG (Eastern Research Group)", amount: 100_000, status: "logged" },
    { portId: PORT_ID, awardId: AWARD_IDS.epa, categoryId: BUDGET_CAT_IDS.epa_planning, date: new Date("2025-02-01"), description: "Stakeholder engagement and workshop facilitation", vendor: "ICF International", amount: 104_000, status: "logged" },
    { portId: PORT_ID, awardId: AWARD_IDS.epa, categoryId: BUDGET_CAT_IDS.epa_framework, date: new Date("2025-03-01"), description: "KPI framework development and benchmarking", vendor: "ICF International", amount: 39_000, status: "logged" },
    { portId: PORT_ID, awardId: AWARD_IDS.epa, categoryId: BUDGET_CAT_IDS.epa_admin, date: new Date("2024-12-15"), description: "Program administration and EPA reporting", vendor: "Port Freeport Staff", amount: 75_000, status: "approved" },
    // TxDOT SCP 5th Street
    { portId: PORT_ID, awardId: AWARD_IDS.txdotEast5th, categoryId: BUDGET_CAT_IDS.scp_road, date: new Date("2024-04-15"), description: "Road base and pavement - Phase 2", vendor: "Texas Sterling Construction", amount: 1_450_000, status: "drawn" },
    { portId: PORT_ID, awardId: AWARD_IDS.txdotEast5th, categoryId: BUDGET_CAT_IDS.scp_road, date: new Date("2024-08-01"), description: "Truck queuing lane construction", vendor: "Texas Sterling Construction", amount: 1_430_000, status: "drawn" },
    { portId: PORT_ID, awardId: AWARD_IDS.txdotEast5th, categoryId: BUDGET_CAT_IDS.scp_drainage, date: new Date("2024-05-01"), description: "Storm drain and retention system installation", vendor: "Binkley & Barfield", amount: 810_000, status: "drawn" },
    { portId: PORT_ID, awardId: AWARD_IDS.txdotEast5th, categoryId: BUDGET_CAT_IDS.scp_engineering, date: new Date("2024-01-15"), description: "Construction engineering and inspection", vendor: "Lockwood Andrews & Newnam", amount: 432_000, status: "drawn" },
    { portId: PORT_ID, awardId: AWARD_IDS.txdotEast5th, categoryId: BUDGET_CAT_IDS.scp_admin, date: new Date("2024-09-01"), description: "Project management and TxDOT reporting", vendor: "Port Freeport Staff", amount: 188_000, status: "drawn" },
    // Rider 37 Storage Area 5
    { portId: PORT_ID, awardId: AWARD_IDS.txdotRider37, categoryId: BUDGET_CAT_IDS.r37_engineering, date: new Date("2024-06-01"), description: "Site engineering and permitting", vendor: "Freese and Nichols", amount: 540_000, status: "drawn" },
    { portId: PORT_ID, awardId: AWARD_IDS.txdotRider37, categoryId: BUDGET_CAT_IDS.r37_paving, date: new Date("2024-11-01"), description: "Subgrade preparation and stabilization", vendor: "Webber LLC", amount: 720_000, status: "approved" },
    { portId: PORT_ID, awardId: AWARD_IDS.txdotRider37, categoryId: BUDGET_CAT_IDS.r37_paving, date: new Date("2025-02-01"), description: "Heavy-duty concrete paving - Phase 1", vendor: "Webber LLC", amount: 720_000, status: "logged" },
    { portId: PORT_ID, awardId: AWARD_IDS.txdotRider37, categoryId: BUDGET_CAT_IDS.r37_stormwater, date: new Date("2024-09-15"), description: "Detention pond and outfall construction", vendor: "Binkley & Barfield", amount: 480_000, status: "approved" },
    { portId: PORT_ID, awardId: AWARD_IDS.txdotRider37, categoryId: BUDGET_CAT_IDS.r37_reefer, date: new Date("2025-01-20"), description: "Reefer rack electrical conduit and pad installation", vendor: "MMR Group", amount: 320_000, status: "logged" },
    // Terminal Access Road (closeout)
    { portId: PORT_ID, awardId: AWARD_IDS.txdotAccess, categoryId: BUDGET_CAT_IDS.access_construction, date: new Date("2024-03-01"), description: "Road widening and base course", vendor: "Texas Sterling Construction", amount: 1_620_000, status: "drawn" },
    { portId: PORT_ID, awardId: AWARD_IDS.txdotAccess, categoryId: BUDGET_CAT_IDS.access_construction, date: new Date("2024-06-01"), description: "Final pavement overlay and striping", vendor: "Texas Sterling Construction", amount: 580_000, status: "drawn" },
    { portId: PORT_ID, awardId: AWARD_IDS.txdotAccess, categoryId: BUDGET_CAT_IDS.access_signals, date: new Date("2024-08-15"), description: "Traffic signal installation at SH 36 intersection", vendor: "Paradigm Traffic Systems", amount: 438_000, status: "drawn" },
    { portId: PORT_ID, awardId: AWARD_IDS.txdotAccess, categoryId: BUDGET_CAT_IDS.access_signals, date: new Date("2024-10-01"), description: "Pedestrian crosswalk and safety signage", vendor: "Paradigm Traffic Systems", amount: 300_000, status: "drawn" },
    { portId: PORT_ID, awardId: AWARD_IDS.txdotAccess, categoryId: BUDGET_CAT_IDS.access_engineering, date: new Date("2024-11-01"), description: "As-built documentation and final inspection", vendor: "Lockwood Andrews & Newnam", amount: 392_000, status: "approved" },
    { portId: PORT_ID, awardId: AWARD_IDS.txdotAccess, categoryId: BUDGET_CAT_IDS.access_admin, date: new Date("2025-02-01"), description: "Final project closeout documentation", vendor: "Port Freeport Staff", amount: 241_000, status: "logged" },
  ];

  for (const exp of expenses) { await prisma.demoExpense.create({ data: exp }); }
  console.log(`  ✓ ${expenses.length} expenses seeded`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8. MATCH LEDGER
// ═══════════════════════════════════════════════════════════════════════════════

async function seedMatchLedger() {
  console.log("Seeding match ledger...");

  const entries = [
    { portId: PORT_ID, awardId: AWARD_IDS.pidp, date: new Date("2023-06-15"), description: "Port Freeport cash contribution - Phase 1", amount: 1_200_000, type: "cash" },
    { portId: PORT_ID, awardId: AWARD_IDS.pidp, date: new Date("2024-01-10"), description: "In-kind: Land value contribution (10-acre site)", amount: 850_000, type: "in_kind" },
    { portId: PORT_ID, awardId: AWARD_IDS.pidp, date: new Date("2024-08-01"), description: "Port Freeport cash contribution - Phase 2", amount: 1_150_000, type: "cash" },
    { portId: PORT_ID, awardId: AWARD_IDS.crisi, date: new Date("2024-03-01"), description: "Port Freeport cash match - rail project", amount: 800_000, type: "cash" },
    { portId: PORT_ID, awardId: AWARD_IDS.crisi, date: new Date("2025-01-15"), description: "Port Freeport cash match - Phase 2", amount: 460_000, type: "cash" },
    { portId: PORT_ID, awardId: AWARD_IDS.txdotEast5th, date: new Date("2023-08-01"), description: "Port Freeport cash match", amount: 400_000, type: "cash" },
    { portId: PORT_ID, awardId: AWARD_IDS.txdotEast5th, date: new Date("2024-02-15"), description: "In-kind: Port staff project oversight", amount: 160_000, type: "in_kind" },
    { portId: PORT_ID, awardId: AWARD_IDS.txdotEast5th, date: new Date("2024-09-01"), description: "Port Freeport cash match - Phase 2", amount: 400_000, type: "cash" },
    { portId: PORT_ID, awardId: AWARD_IDS.txdotRider37, date: new Date("2024-05-15"), description: "Port Freeport 10% cash match", amount: 820_000, type: "cash" },
    { portId: PORT_ID, awardId: AWARD_IDS.txdotAccess, date: new Date("2022-08-01"), description: "Port Freeport cash match - access road", amount: 500_000, type: "cash" },
    { portId: PORT_ID, awardId: AWARD_IDS.txdotAccess, date: new Date("2023-06-01"), description: "Port Freeport cash match - Phase 2", amount: 400_000, type: "cash" },
  ];

  for (const entry of entries) { await prisma.demoMatchLedgerEntry.create({ data: entry }); }
  console.log(`  ✓ ${entries.length} match ledger entries seeded`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 9. DRAWDOWN REQUESTS
// ═══════════════════════════════════════════════════════════════════════════════

async function seedDrawdowns() {
  console.log("Seeding drawdown requests...");

  const drawdowns = [
    { portId: PORT_ID, awardId: AWARD_IDS.pidp, expenseIds: ["PIDP warehouse Q3-Q4 2024"], totalAmount: 3_990_000, status: "payment_received", submittedDate: new Date("2024-10-15"), approvedDate: new Date("2024-11-05"), paymentDate: new Date("2024-11-25"), notes: "Q3-Q4 FY2024 drawdown - warehouse construction" },
    { portId: PORT_ID, awardId: AWARD_IDS.pidp, expenseIds: ["PIDP site + gate Q1 2025"], totalAmount: 2_532_000, status: "submitted", submittedDate: new Date("2025-04-10"), notes: "Q1 FY2025 drawdown - site work, gate, and admin" },
    { portId: PORT_ID, awardId: AWARD_IDS.crisi, expenseIds: ["CRISI engineering"], totalAmount: 385_000, status: "payment_received", submittedDate: new Date("2024-05-01"), approvedDate: new Date("2024-05-20"), paymentDate: new Date("2024-06-10"), notes: "Initial engineering drawdown - rail design" },
    { portId: PORT_ID, awardId: AWARD_IDS.crisi, expenseIds: ["CRISI track + signal"], totalAmount: 1_330_000, status: "submitted", submittedDate: new Date("2025-03-15"), notes: "Track construction and signal installation" },
    { portId: PORT_ID, awardId: AWARD_IDS.txdotEast5th, expenseIds: ["SCP 5th St all"], totalAmount: 4_310_000, status: "payment_received", submittedDate: new Date("2024-09-15"), approvedDate: new Date("2024-10-05"), paymentDate: new Date("2024-10-25"), notes: "FY2024 annual drawdown - road construction and drainage" },
    { portId: PORT_ID, awardId: AWARD_IDS.txdotRider37, expenseIds: ["R37 engineering"], totalAmount: 540_000, status: "payment_received", submittedDate: new Date("2024-07-15"), approvedDate: new Date("2024-08-01"), paymentDate: new Date("2024-08-20"), notes: "Engineering and permitting drawdown" },
    { portId: PORT_ID, awardId: AWARD_IDS.txdotRider37, expenseIds: ["R37 paving + stormwater"], totalAmount: 1_200_000, status: "draft", notes: "Pending review — paving and stormwater expenses Q4 2024" },
    { portId: PORT_ID, awardId: AWARD_IDS.txdotAccess, expenseIds: ["Access road final"], totalAmount: 1_018_000, status: "submitted", submittedDate: new Date("2025-01-15"), notes: "Final drawdown - terminal access road closeout" },
  ];

  for (const dd of drawdowns) { await prisma.demoDrawdownRequest.create({ data: dd }); }
  console.log(`  ✓ ${drawdowns.length} drawdown requests seeded`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 10. BUDGET MODIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════════

async function seedBudgetModifications() {
  console.log("Seeding budget modifications...");

  await prisma.demoBudgetModification.create({
    data: {
      portId: PORT_ID, awardId: AWARD_IDS.pidp,
      fromCategoryId: BUDGET_CAT_IDS.pidp_admin, toCategoryId: BUDGET_CAT_IDS.pidp_warehouse,
      amount: 75_000,
      justification: "Administration costs running under budget; additional warehouse MEP work identified during construction requiring reallocation.",
      status: "approved", requestedDate: new Date("2024-08-01"), approvedDate: new Date("2024-08-20"),
    },
  });

  console.log("  ✓ 1 budget modification seeded");
}

// ═══════════════════════════════════════════════════════════════════════════════
// 11. SCHEDULED REPORTS
// ═══════════════════════════════════════════════════════════════════════════════

async function seedScheduledReports() {
  console.log("Seeding scheduled reports...");

  const reports = [
    // PIDP — quarterly SF-425 + progress
    { portId: PORT_ID, awardId: AWARD_IDS.pidp, type: "sf425", title: "SF-425 Federal Financial Report — Q4 2024", dueDate: new Date("2025-01-30"), periodStart: new Date("2024-10-01"), periodEnd: new Date("2024-12-31"), status: "submitted", submittedDate: new Date("2025-01-28") },
    { portId: PORT_ID, awardId: AWARD_IDS.pidp, type: "progress", title: "Quarterly Progress Report — Q4 2024", dueDate: new Date("2025-01-30"), periodStart: new Date("2024-10-01"), periodEnd: new Date("2024-12-31"), status: "submitted", submittedDate: new Date("2025-01-29") },
    { portId: PORT_ID, awardId: AWARD_IDS.pidp, type: "sf425", title: "SF-425 Federal Financial Report — Q1 2025", dueDate: new Date("2025-04-30"), periodStart: new Date("2025-01-01"), periodEnd: new Date("2025-03-31"), status: "submitted", submittedDate: new Date("2025-04-25") },
    { portId: PORT_ID, awardId: AWARD_IDS.pidp, type: "progress", title: "Quarterly Progress Report — Q1 2025", dueDate: new Date("2025-04-30"), periodStart: new Date("2025-01-01"), periodEnd: new Date("2025-03-31"), status: "submitted", submittedDate: new Date("2025-04-28") },
    { portId: PORT_ID, awardId: AWARD_IDS.pidp, type: "sf425", title: "SF-425 Federal Financial Report — Q2 2025", dueDate: new Date("2025-07-30"), periodStart: new Date("2025-04-01"), periodEnd: new Date("2025-06-30"), status: "upcoming" },
    { portId: PORT_ID, awardId: AWARD_IDS.pidp, type: "progress", title: "Quarterly Progress Report — Q2 2025", dueDate: new Date("2025-07-30"), periodStart: new Date("2025-04-01"), periodEnd: new Date("2025-06-30"), status: "upcoming" },
    // CRISI — quarterly SF-425 + semi-annual progress
    { portId: PORT_ID, awardId: AWARD_IDS.crisi, type: "sf425", title: "SF-425 Federal Financial Report — Q4 2024", dueDate: new Date("2025-01-30"), periodStart: new Date("2024-10-01"), periodEnd: new Date("2024-12-31"), status: "submitted", submittedDate: new Date("2025-01-27") },
    { portId: PORT_ID, awardId: AWARD_IDS.crisi, type: "sf425", title: "SF-425 Federal Financial Report — Q1 2025", dueDate: new Date("2025-04-30"), periodStart: new Date("2025-01-01"), periodEnd: new Date("2025-03-31"), status: "in_progress", notes: "Draft in review" },
    { portId: PORT_ID, awardId: AWARD_IDS.crisi, type: "progress", title: "Semi-Annual Progress Report — H1 2025", dueDate: new Date("2025-07-30"), periodStart: new Date("2025-01-01"), periodEnd: new Date("2025-06-30"), status: "upcoming" },
    // EPA Clean Ports — quarterly SF-425 + semi-annual progress
    { portId: PORT_ID, awardId: AWARD_IDS.epa, type: "sf425", title: "SF-425 Federal Financial Report — Q1 2025", dueDate: new Date("2025-04-30"), periodStart: new Date("2025-01-01"), periodEnd: new Date("2025-03-31"), status: "drafting", notes: "First quarterly report under this award" },
    { portId: PORT_ID, awardId: AWARD_IDS.epa, type: "progress", title: "Semi-Annual Progress Report — H1 FY25", dueDate: new Date("2025-04-30"), periodStart: new Date("2024-10-01"), periodEnd: new Date("2025-03-31"), status: "drafting" },
    // TxDOT East 5th — semi-annual
    { portId: PORT_ID, awardId: AWARD_IDS.txdotEast5th, type: "sf425", title: "SF-425 Federal Financial Report — H2 2024", dueDate: new Date("2025-01-30"), periodStart: new Date("2024-07-01"), periodEnd: new Date("2024-12-31"), status: "submitted", submittedDate: new Date("2025-01-25") },
    { portId: PORT_ID, awardId: AWARD_IDS.txdotEast5th, type: "sf425", title: "SF-425 Federal Financial Report — H1 2025", dueDate: new Date("2025-07-30"), periodStart: new Date("2025-01-01"), periodEnd: new Date("2025-06-30"), status: "upcoming" },
    // Terminal Access — closeout
    { portId: PORT_ID, awardId: AWARD_IDS.txdotAccess, type: "closeout", title: "Final Closeout Report", dueDate: new Date("2025-10-28"), periodStart: new Date("2022-07-01"), periodEnd: new Date("2025-06-30"), status: "in_progress", notes: "Complete all closeout checklist items before submission." },
    // Annual
    { portId: PORT_ID, awardId: AWARD_IDS.pidp, type: "sefa", title: "Schedule of Expenditures of Federal Awards (SEFA) — FY2024", dueDate: new Date("2025-03-31"), periodStart: new Date("2023-10-01"), periodEnd: new Date("2024-09-30"), status: "submitted", submittedDate: new Date("2025-03-28") },
    { portId: PORT_ID, awardId: AWARD_IDS.pidp, type: "single_audit", title: "Single Audit Report — FY2024", dueDate: new Date("2025-06-30"), periodStart: new Date("2023-10-01"), periodEnd: new Date("2024-09-30"), status: "in_progress", notes: "External auditor engaged — fieldwork in progress" },

    // ── SF-270 Reimbursement Requests ──
    { portId: PORT_ID, awardId: AWARD_IDS.pidp, type: "sf270", title: "SF-270 Request for Advance or Reimbursement — Q4 2024", dueDate: new Date("2025-01-30"), periodStart: new Date("2024-10-01"), periodEnd: new Date("2024-12-31"), status: "submitted", submittedDate: new Date("2025-01-28") },
    { portId: PORT_ID, awardId: AWARD_IDS.pidp, type: "sf270", title: "SF-270 Request for Advance or Reimbursement — Q1 2025", dueDate: new Date("2025-04-30"), periodStart: new Date("2025-01-01"), periodEnd: new Date("2025-03-31"), status: "submitted", submittedDate: new Date("2025-04-25") },
    { portId: PORT_ID, awardId: AWARD_IDS.pidp, type: "sf270", title: "SF-270 Request for Advance or Reimbursement — Q2 2025", dueDate: new Date("2025-07-30"), periodStart: new Date("2025-04-01"), periodEnd: new Date("2025-06-30"), status: "upcoming" },
    { portId: PORT_ID, awardId: AWARD_IDS.crisi, type: "sf270", title: "SF-270 Request for Advance or Reimbursement — Q4 2024", dueDate: new Date("2025-01-30"), periodStart: new Date("2024-10-01"), periodEnd: new Date("2024-12-31"), status: "submitted", submittedDate: new Date("2025-01-27") },
    { portId: PORT_ID, awardId: AWARD_IDS.crisi, type: "sf270", title: "SF-270 Request for Advance or Reimbursement — Q1 2025", dueDate: new Date("2025-04-30"), periodStart: new Date("2025-01-01"), periodEnd: new Date("2025-03-31"), status: "drafting", notes: "Pending expense reconciliation" },
    { portId: PORT_ID, awardId: AWARD_IDS.epa, type: "sf270", title: "SF-270 Request for Advance or Reimbursement — Q1 2025", dueDate: new Date("2025-04-30"), periodStart: new Date("2025-01-01"), periodEnd: new Date("2025-03-31"), status: "upcoming" },
    { portId: PORT_ID, awardId: AWARD_IDS.txdotEast5th, type: "sf270", title: "SF-270 Request for Advance or Reimbursement — H2 2024", dueDate: new Date("2025-01-30"), periodStart: new Date("2024-07-01"), periodEnd: new Date("2024-12-31"), status: "submitted", submittedDate: new Date("2025-01-25") },

    // ── BABA Compliance Reports (PIDP, CRISI) ──
    { portId: PORT_ID, awardId: AWARD_IDS.pidp, type: "baba", title: "BABA Compliance Report — Q4 2024", dueDate: new Date("2025-01-30"), periodStart: new Date("2024-10-01"), periodEnd: new Date("2024-12-31"), status: "submitted", submittedDate: new Date("2025-01-28") },
    { portId: PORT_ID, awardId: AWARD_IDS.pidp, type: "baba", title: "BABA Compliance Report — Q1 2025", dueDate: new Date("2025-04-30"), periodStart: new Date("2025-01-01"), periodEnd: new Date("2025-03-31"), status: "submitted", submittedDate: new Date("2025-04-26") },
    { portId: PORT_ID, awardId: AWARD_IDS.pidp, type: "baba", title: "BABA Compliance Report — Q2 2025", dueDate: new Date("2025-07-30"), periodStart: new Date("2025-04-01"), periodEnd: new Date("2025-06-30"), status: "drafting", notes: "Reviewing domestic content certifications for warehouse steel procurement" },
    { portId: PORT_ID, awardId: AWARD_IDS.crisi, type: "baba", title: "BABA Compliance Report — Q4 2024", dueDate: new Date("2025-01-30"), periodStart: new Date("2024-10-01"), periodEnd: new Date("2024-12-31"), status: "submitted", submittedDate: new Date("2025-01-27") },
    { portId: PORT_ID, awardId: AWARD_IDS.crisi, type: "baba", title: "BABA Compliance Report — Q1 2025", dueDate: new Date("2025-04-30"), periodStart: new Date("2025-01-01"), periodEnd: new Date("2025-03-31"), status: "upcoming" },
  ];

  for (const report of reports) { await prisma.demoScheduledReport.create({ data: report }); }
  console.log(`  ✓ ${reports.length} scheduled reports seeded`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 12. SUBRECIPIENTS (reuse from seed-compliance.ts data)
// ═══════════════════════════════════════════════════════════════════════════════

async function seedSubrecipients() {
  console.log("Seeding subrecipients...");

  const subs = [
    { portId: PORT_ID, awardId: AWARD_IDS.pidp, entityName: "Gulf Coast Marine Construction LLC", uei: "KJ4MNPQ8R2T5", classification: "contractor", classificationAnswers: [{ questionId: "q1", answer: false }, { questionId: "q2", answer: false }, { questionId: "q3", answer: false }, { questionId: "q4", answer: false }, { questionId: "q5", answer: false }], riskLevel: "standard", riskFactors: { newEntity: false, priorFindings: false, highSpend: true, noSingleAudit: false, lateReporting: false }, monitoringIntensity: "quarterly", subawardAmount: 8_500_000, cumulativeSpend: 3_200_000, singleAuditRequired: true, status: "active" },
    { portId: PORT_ID, awardId: AWARD_IDS.pidp, entityName: "Brazoria County Environmental Authority", uei: "TY6WBRC4D8N1", classification: "subrecipient", classificationAnswers: [{ questionId: "q1", answer: true }, { questionId: "q2", answer: true }, { questionId: "q3", answer: true }, { questionId: "q4", answer: true }, { questionId: "q5", answer: true }], riskLevel: "elevated", riskFactors: { newEntity: true, priorFindings: false, highSpend: false, noSingleAudit: true, lateReporting: false }, monitoringIntensity: "quarterly_plus", subawardAmount: 420_000, cumulativeSpend: 185_000, singleAuditRequired: false, status: "active" },
    { portId: PORT_ID, awardId: AWARD_IDS.crisi, entityName: "Texas Rail Infrastructure Partners", uei: "MN9PLK7GH3J2", classification: "subrecipient", classificationAnswers: [{ questionId: "q1", answer: false }, { questionId: "q2", answer: true }, { questionId: "q3", answer: true }, { questionId: "q4", answer: true }, { questionId: "q5", answer: true }], riskLevel: "standard", riskFactors: { newEntity: false, priorFindings: false, highSpend: false, noSingleAudit: false, lateReporting: false }, monitoringIntensity: "quarterly", subawardAmount: 1_800_000, cumulativeSpend: 720_000, singleAuditRequired: false, status: "active" },
    { portId: PORT_ID, awardId: AWARD_IDS.epa, entityName: "Freeport Emissions Monitoring Cooperative", uei: "QR5TUV8WX1Y3", classification: "subrecipient", classificationAnswers: [{ questionId: "q1", answer: true }, { questionId: "q2", answer: true }, { questionId: "q3", answer: true }, { questionId: "q4", answer: true }, { questionId: "q5", answer: false }], riskLevel: "high", riskFactors: { newEntity: true, priorFindings: true, highSpend: false, noSingleAudit: true, lateReporting: true }, monitoringIntensity: "monthly", subawardAmount: 380_000, cumulativeSpend: 95_000, singleAuditRequired: false, status: "active" },
    { portId: PORT_ID, awardId: AWARD_IDS.txdotRider37, entityName: "South Texas Paving & Concrete Inc", uei: "AB2CDE5FG8H0", classification: "contractor", classificationAnswers: [{ questionId: "q1", answer: false }, { questionId: "q2", answer: false }, { questionId: "q3", answer: false }, { questionId: "q4", answer: false }, { questionId: "q5", answer: false }], riskLevel: "low", riskFactors: { newEntity: false, priorFindings: false, highSpend: false, noSingleAudit: false, lateReporting: false }, monitoringIntensity: "annual", subawardAmount: 2_400_000, cumulativeSpend: 680_000, singleAuditRequired: false, status: "active" },
  ];

  for (const sub of subs) {
    const created = await prisma.demoSubrecipient.create({ data: sub });
    console.log(`  Created: ${sub.entityName} (${sub.classification})`);
    if (sub.classification === "subrecipient") {
      const reports = [
        { reportType: "financial", title: "Quarterly Financial Report", dueDate: new Date("2026-03-31"), status: "received", receivedDate: new Date("2026-03-28") },
        { reportType: "financial", title: "Quarterly Financial Report", dueDate: new Date("2026-06-30"), status: "pending", receivedDate: null },
        { reportType: "progress", title: "Semi-Annual Progress Report", dueDate: new Date("2026-06-30"), status: "pending", receivedDate: null },
      ];
      if (sub.riskLevel === "high") {
        reports.push({ reportType: "single_audit", title: "Single Audit Report (FY2025)", dueDate: new Date("2026-03-01"), status: "pending", receivedDate: null });
      }
      for (const report of reports) {
        await prisma.demoSubrecipientReport.create({ data: { portId: PORT_ID, subrecipientId: created.id, ...report } });
      }
    }
  }
  console.log(`  ✓ ${subs.length} subrecipients seeded`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 13. COMPLIANCE CHECKLISTS (reuse from seed-compliance.ts)
// ═══════════════════════════════════════════════════════════════════════════════

async function seedComplianceChecklists() {
  console.log("Seeding compliance checklists...");

  const templates: Record<string, { title: string; items: { section: string; requirement: string; cfrReference: string }[] }> = {
    buy_america: { title: "Buy America / BABA Compliance", items: [
      { section: "Domestic Content", requirement: "Verify all iron and steel products are produced in the United States", cfrReference: "41 USC 8301" },
      { section: "Domestic Content", requirement: "Obtain manufacturer certifications for domestic content", cfrReference: "41 USC 8302" },
      { section: "Domestic Content", requirement: "Document country of origin for all manufactured products", cfrReference: "2 CFR 184" },
      { section: "Vendor Certification", requirement: "Collect signed Buy America certification from each vendor", cfrReference: "41 USC 8303" },
      { section: "Vendor Certification", requirement: "Verify vendor certifications against known sources", cfrReference: "41 USC 8303" },
      { section: "Waiver Process", requirement: "Document non-availability if domestic product unavailable", cfrReference: "41 USC 8302(b)" },
      { section: "Waiver Process", requirement: "Submit waiver request with supporting documentation", cfrReference: "2 CFR 184.6" },
      { section: "Waiver Process", requirement: "Obtain written waiver approval before procurement", cfrReference: "2 CFR 184.6" },
      { section: "Record Keeping", requirement: "Maintain procurement records with Buy America documentation", cfrReference: "2 CFR 200.334" },
      { section: "Record Keeping", requirement: "Flag non-compliant expenses — block from drawdown", cfrReference: "2 CFR 184" },
    ]},
    davis_bacon: { title: "Davis-Bacon Prevailing Wage Compliance", items: [
      { section: "Wage Determination", requirement: "Obtain applicable wage determination from DOL", cfrReference: "40 USC 3142" },
      { section: "Wage Determination", requirement: "Include wage determination in all construction contracts", cfrReference: "40 USC 3142" },
      { section: "Wage Determination", requirement: "Post wage determination at construction site", cfrReference: "29 CFR 5.5" },
      { section: "Certified Payroll", requirement: "Collect weekly certified payroll from contractors", cfrReference: "29 CFR 5.5(a)" },
      { section: "Certified Payroll", requirement: "Verify employee classifications match wage determination", cfrReference: "29 CFR 5.5(a)" },
      { section: "Certified Payroll", requirement: "Confirm fringe benefits meet minimum requirements", cfrReference: "40 USC 3141" },
      { section: "Rate Verification", requirement: "Compare submitted rates against DOL wage determination", cfrReference: "29 CFR 5.5" },
      { section: "Rate Verification", requirement: "Document and resolve any rate discrepancies", cfrReference: "29 CFR 5.5" },
      { section: "Enforcement", requirement: "Withhold payment for non-compliant payroll periods", cfrReference: "40 USC 3144" },
    ]},
    nepa: { title: "NEPA Environmental Review Compliance", items: [
      { section: "Environmental Classification", requirement: "Determine level of review (CE, EA, or EIS)", cfrReference: "42 USC 4332" },
      { section: "Environmental Classification", requirement: "Document categorical exclusion if applicable", cfrReference: "40 CFR 1501.4" },
      { section: "Environmental Assessment", requirement: "Complete Environmental Assessment if required", cfrReference: "40 CFR 1501.5" },
      { section: "Environmental Assessment", requirement: "Publish Finding of No Significant Impact (FONSI)", cfrReference: "40 CFR 1501.6" },
      { section: "Permits & Approvals", requirement: "Obtain all required environmental permits", cfrReference: "42 USC 4332" },
      { section: "Permits & Approvals", requirement: "Track permit expiration dates and renewals", cfrReference: "42 USC 4332" },
      { section: "Mitigation", requirement: "Implement required mitigation measures", cfrReference: "40 CFR 1505.2" },
      { section: "Monitoring", requirement: "Document compliance with environmental conditions", cfrReference: "40 CFR 1505.3" },
    ]},
    title_vi_dbe: { title: "Title VI / DBE Compliance", items: [
      { section: "Title VI", requirement: "Maintain Title VI program and assurances", cfrReference: "49 CFR 21" },
      { section: "Title VI", requirement: "Post Title VI notice and complaint procedure", cfrReference: "49 CFR 21.9" },
      { section: "Title VI", requirement: "Collect and analyze demographic data on beneficiaries", cfrReference: "49 CFR 21.9" },
      { section: "DBE Program", requirement: "Establish overall DBE goal for federal fiscal year", cfrReference: "49 CFR 26.45" },
      { section: "DBE Program", requirement: "Track DBE participation on each contract", cfrReference: "49 CFR 26.37" },
      { section: "DBE Program", requirement: "Document good faith efforts when goal not met", cfrReference: "49 CFR 26.53" },
      { section: "Reporting", requirement: "Submit semi-annual DBE participation report", cfrReference: "49 CFR 26.11" },
      { section: "Reporting", requirement: "Report DBE achievements vs. goals", cfrReference: "49 CFR 26.47" },
    ]},
  };

  const assignments = [
    { awardId: AWARD_IDS.pidp, templateKey: "buy_america" },
    { awardId: AWARD_IDS.pidp, templateKey: "davis_bacon" },
    { awardId: AWARD_IDS.crisi, templateKey: "buy_america" },
    { awardId: AWARD_IDS.crisi, templateKey: "davis_bacon" },
    { awardId: AWARD_IDS.epa, templateKey: "nepa" },
    { awardId: AWARD_IDS.txdotEast5th, templateKey: "davis_bacon" },
    { awardId: AWARD_IDS.txdotEast5th, templateKey: "title_vi_dbe" },
    { awardId: AWARD_IDS.txdotRider37, templateKey: "davis_bacon" },
  ];

  for (const assignment of assignments) {
    const tmpl = templates[assignment.templateKey];
    const checklist = await prisma.demoComplianceChecklist.create({
      data: { portId: PORT_ID, awardId: assignment.awardId, template: assignment.templateKey, title: tmpl.title, status: "in_progress", completedItems: 0, totalItems: tmpl.items.length,
        items: { create: tmpl.items.map((item, i) => ({ portId: PORT_ID, section: item.section, requirement: item.requirement, cfrReference: item.cfrReference, sortOrder: i })) },
      },
    });
    const items = await prisma.demoComplianceChecklistItem.findMany({ where: { checklistId: checklist.id }, orderBy: { sortOrder: "asc" } });
    const completeCount = Math.floor(items.length * (0.4 + Math.random() * 0.2));
    for (let i = 0; i < completeCount; i++) {
      await prisma.demoComplianceChecklistItem.update({ where: { id: items[i].id }, data: { isCompleted: true, completedAt: new Date(Date.now() - Math.random() * 90 * 86400000), completedBy: "Phyllis Saathoff" } });
    }
    await prisma.demoComplianceChecklist.update({ where: { id: checklist.id }, data: { completedItems: completeCount } });
    console.log(`  Created: ${tmpl.title} (${completeCount}/${tmpl.items.length} done)`);
  }
  console.log(`  ✓ ${assignments.length} compliance checklists seeded`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 14. AUDIT FINDINGS (reuse from seed-compliance.ts)
// ═══════════════════════════════════════════════════════════════════════════════

async function seedAuditFindings() {
  console.log("Seeding audit findings...");

  const findings = [
    { portId: PORT_ID, awardId: AWARD_IDS.pidp, auditYear: 2024, findingNumber: "2024-001", title: "Inadequate Documentation of Procurement Procedures", description: "During the FY2024 audit, it was noted that procurement files for two PIDP-funded construction contracts lacked required sole-source justification documentation. While the procurements appeared reasonable, the absence of written justification creates a compliance risk under 2 CFR 200.320.", complianceArea: "procurement", severity: "significant_deficiency", status: "in_progress" },
    { portId: PORT_ID, awardId: AWARD_IDS.crisi, auditYear: 2024, findingNumber: "2024-002", title: "Late Submission of SF-425 Federal Financial Report", description: "The Q2 2024 SF-425 for the CRISI Rail Development award was submitted 12 days past the 30-day deadline. The delay was attributed to staff turnover in the finance department.", complianceArea: "reporting", severity: "finding", status: "resolved" },
    { portId: PORT_ID, awardId: null, auditYear: 2023, findingNumber: "2023-001", title: "Subrecipient Monitoring Not Documented", description: "The FY2023 audit identified that Port Freeport did not maintain written monitoring procedures for subrecipient entities receiving federal pass-through funds.", complianceArea: "subrecipient_monitoring", severity: "material_weakness", status: "in_progress" },
    { portId: PORT_ID, awardId: AWARD_IDS.epa, auditYear: 2025, findingNumber: "2025-001", title: "Unallowable Entertainment Costs Charged to Federal Award", description: "An expense of $1,250 for a community outreach event with catering and entertainment elements was charged to the EPA Clean Ports award. Per 2 CFR 200.438, entertainment costs are generally unallowable. The expense was subsequently reclassified to local match funds.", complianceArea: "allowable_costs", severity: "finding", status: "resolved" },
  ];

  for (const finding of findings) {
    const created = await prisma.demoAuditFinding.create({ data: finding });
    console.log(`  Created: ${finding.findingNumber} — ${finding.title.slice(0, 50)}...`);

    if (finding.status !== "resolved") {
      const caps = finding.findingNumber === "2024-001" ? [
        { action: "Develop written procurement procedures manual with 2 CFR 200.320 requirements", responsible: "Jason Cordoba", targetDate: "2026-06-30", status: "in_progress" },
        { action: "Retroactively document sole-source justifications for identified procurements", responsible: "Chris Hogan", targetDate: "2026-05-15", status: "completed" },
        { action: "Implement procurement checklist requirement for all federal procurements >$10K", responsible: "Phyllis Saathoff", targetDate: "2026-07-31", status: "pending" },
      ] : [
        { action: "Develop written subrecipient monitoring policy and procedures", responsible: "Jason Cordoba", targetDate: "2026-04-30", status: "in_progress" },
        { action: "Establish risk assessment framework for all subrecipients", responsible: "Chris Hogan", targetDate: "2026-05-31", status: "pending" },
        { action: "Implement quarterly desk reviews for elevated/high risk subrecipients", responsible: "Jason Cordoba", targetDate: "2026-06-30", status: "pending" },
        { action: "Conduct initial risk assessments on all current subrecipients", responsible: "Chris Hogan", targetDate: "2026-05-15", status: "pending" },
      ];

      for (const cap of caps) {
        await prisma.demoCorrectiveActionPlan.create({
          data: { portId: PORT_ID, findingId: created.id, action: cap.action, responsible: cap.responsible, targetDate: new Date(cap.targetDate), status: cap.status, completedAt: cap.status === "completed" ? new Date("2026-03-20") : null },
        });
      }
    }
  }
  console.log(`  ✓ ${findings.length} audit findings seeded`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 15. USERS
// ═══════════════════════════════════════════════════════════════════════════════

async function seedUsers() {
  console.log("Seeding users...");
  const users = [
    { email: "drafter@freeport-demo.demo", name: "Jason Cordoba", title: "Grants Accountant", role: "drafter" },
    { email: "reviewer@freeport-demo.demo", name: "Chris Hogan", title: "Grants Director", role: "reviewer" },
    { email: "cfo@freeport-demo.demo", name: "Phyllis Saathoff", title: "Executive Director / CEO", role: "certifying_official" },
  ];
  for (const user of users) {
    await prisma.$executeRawUnsafe(`
      INSERT INTO users (id, port_id, email, name, title, role, created_at, updated_at)
      VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, NOW(), NOW())
      ON CONFLICT (email) DO NOTHING
    `, PORT_ID, user.email, user.name, user.title, user.role);
    console.log(`  Seeded: ${user.email}`);
  }
  console.log(`  ✓ ${users.length} users seeded`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log("\n══════════════════════════════════════════════════════════════");
  console.log("  Seeding Port Freeport DEMO — Full Profile Data");
  console.log("══════════════════════════════════════════════════════════════\n");

  try {
    await seedPortProfile();       console.log("");
    await seedProjects();          console.log("");
    await seedDiscoveredGrants();  console.log("");
    await seedPipelineGrants();    console.log("");
    await seedAwards();            console.log("");
    await seedBudgetCategories();  console.log("");
    await seedExpenses();          console.log("");
    await seedMatchLedger();       console.log("");
    await seedDrawdowns();         console.log("");
    await seedBudgetModifications(); console.log("");
    await seedScheduledReports();  console.log("");
    await seedSubrecipients();     console.log("");
    await seedComplianceChecklists(); console.log("");
    await seedAuditFindings();     console.log("");
    await seedUsers();

    console.log("\n══════════════════════════════════════════════════════════════");
    console.log("  ✓ Port Freeport DEMO seed complete!");
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
