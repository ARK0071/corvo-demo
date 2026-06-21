/**
 * Seed script for CTE (Center for Transportation and the Environment).
 * Uses PRODUCTION tables only.
 *
 * Run: npx tsx src/scripts/seed-cte.ts
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

const SLUG = "cte";
const PORT_ID = "cte";

// ─── Deterministic UUIDs ───
let PROFILE_ID = "d4e5f600-0001-4000-8000-000000000001";

const PROJECT_IDS = {
  seBusDeployment:   "d4e5f600-0002-4000-8000-000000000001",
  h2FuelCellPilot:   "d4e5f600-0002-4000-8000-000000000002",
  cleanFreight:      "d4e5f600-0002-4000-8000-000000000003",
  fleetTransition:   "d4e5f600-0002-4000-8000-000000000004",
  workforceDev:      "d4e5f600-0002-4000-8000-000000000005",
  h2HubInfra:        "d4e5f600-0002-4000-8000-000000000006",
};

const AWARD_IDS = {
  lowNo:         "d4e5f600-0003-4000-8000-000000000001",
  busFacilities: "d4e5f600-0003-4000-8000-000000000002",
  cleanFuels:    "d4e5f600-0003-4000-8000-000000000003",
  raise:         "d4e5f600-0003-4000-8000-000000000004",
};

const BUDGET_CAT_IDS = {
  lowno_buses:       "d4e5f600-0004-4000-8000-000000000001",
  lowno_charging:    "d4e5f600-0004-4000-8000-000000000002",
  lowno_workforce:   "d4e5f600-0004-4000-8000-000000000003",
  lowno_admin:       "d4e5f600-0004-4000-8000-000000000004",
  busfac_h2buses:    "d4e5f600-0004-4000-8000-000000000005",
  busfac_fueling:    "d4e5f600-0004-4000-8000-000000000006",
  busfac_testing:    "d4e5f600-0004-4000-8000-000000000007",
  busfac_admin:      "d4e5f600-0004-4000-8000-000000000008",
  clean_corridor:    "d4e5f600-0004-4000-8000-000000000009",
  clean_equipment:   "d4e5f600-0004-4000-8000-00000000000a",
  clean_data:        "d4e5f600-0004-4000-8000-00000000000b",
  clean_admin:       "d4e5f600-0004-4000-8000-00000000000c",
  raise_infra:       "d4e5f600-0004-4000-8000-00000000000d",
  raise_engineering: "d4e5f600-0004-4000-8000-00000000000e",
  raise_community:   "d4e5f600-0004-4000-8000-00000000000f",
  raise_admin:       "d4e5f600-0004-4000-8000-000000000010",
};

const GRANT_IDS = {
  lowNo2026:       "FTA-LOWNO-FY2026-CTE",
  busFac2026:      "FTA-5339B-FY2026-CTE",
  cleanFuels2026:  "DOE-CLEANFUELS-FY2026",
  raise2026:       "USDOT-RAISE-FY2026-CTE",
  crp2026:         "FHWA-CRP-FY2026-CTE",
};

// ═══════════════════════════════════════════════════════════════════════════════
// 0. PROFILE — upsert into port_profiles (production)
// ═══════════════════════════════════════════════════════════════════════════════

async function seedPortProfile() {
  console.log("Seeding CTE port profile...");

  const profileData = {
    name: "Center for Transportation and the Environment",
    entityType: "Nonprofit research and deployment organization",
    classification: "501(c)(3) Clean Transportation Nonprofit",
    location: {
      city: "Atlanta", state: "Georgia", stateCode: "GA",
      county: "Fulton County", region: "Southeast",
    },
    characteristics: {
      cargoTypes: ["Zero-Emission Bus Deployment", "Hydrogen Fuel Cell Integration", "Battery-Electric Vehicle Programs", "Clean Freight Corridor Development"],
      employeeCount: 85, operatingBudget: 28_000_000,
    },
    priorities: [
      "Zero-emission transit bus deployment and technical assistance",
      "Hydrogen fuel cell vehicle commercialization",
      "Clean freight and goods movement",
      "Fleet electrification planning for transit agencies",
      "Workforce development for zero-emission vehicle technology",
      "Disadvantaged community transportation equity",
      "Advanced vehicle technology demonstration and evaluation",
      "Charging and fueling infrastructure planning",
    ],
    capabilities: [
      "Zero-emission bus deployment program management",
      "Hydrogen fuel cell vehicle integration and testing",
      "Fleet electrification transition planning",
      "Clean transportation technology evaluation",
      "Federal grant program management and compliance",
      "Transit agency technical assistance",
      "Clean corridor planning and implementation",
      "Workforce training curriculum development",
    ],
    needs: [
      "Hydrogen fueling infrastructure expansion",
      "Battery-electric bus charging network buildout",
      "Clean freight demonstration corridors",
      "Advanced vehicle testing facilities",
      "Fleet transition planning tools and analytics",
      "Workforce development program expansion",
      "Community engagement and equity analysis",
      "Technology performance data collection systems",
    ],
    certifications: [
      "FTA-recognized technical assistance provider",
      "DOE Clean Cities Coalition partner",
      "EPA SmartWay Transport Partner",
      "ISO 9001 Quality Management",
    ],
    environmentalGoals: [
      "Deploy 1,000+ zero-emission buses through partner agencies by 2030",
      "Establish 5 hydrogen fueling corridors in the Southeast by 2028",
      "Reduce partner fleet GHG emissions by 500,000 metric tons CO2e by 2030",
      "Support 50 transit agencies in fleet electrification planning",
      "Achieve 100% renewable energy at CTE facilities by 2027",
    ],
    communityImpact: [
      "Technical assistance to 80+ transit agencies across 20 states",
      "Zero-emission deployments serving 3M+ daily transit riders",
      "Workforce training programs graduating 500+ clean energy technicians annually",
      "Environmental justice focus — 70% of deployments serve disadvantaged communities",
      "Southeast hydrogen hub development creating 2,000+ regional jobs",
    ],
  };

  // Extended profile JSON fields (set via raw SQL after upsert)
  const extendedFields = {
    legal_name: "Center for Transportation and the Environment, Inc.",
    uei: "CTE7EXAMPLE456",
    ein: "58-2200000",
    location_data: {
      address: "730 Peachtree Street NE, Suite 450",
      city: "Atlanta", state: "GA", zip: "30308",
      congressionalDistrict: "GA-05",
      latitude: 33.7720, longitude: -84.3830,
    },
    leadership: {
      executiveDirector: "Dan Raudebaugh",
      vicePresident: "Jason Hanlin",
      directorOfOperations: "Erik Bigelow",
    },
    financials: {
      annualRevenue: 28_000_000,
      operatingBudget: 28_000_000,
      capitalBudget: 12_000_000,
      bondRating: "N/A — 501(c)(3) nonprofit",
      matchFundingCapacity: 8_000_000,
      totalAssets: 45_000_000,
    },
    infrastructure: {
      terminalFacilities: [
        "Atlanta headquarters — Program management, fleet planning, and technical assistance",
        "Southeast Hydrogen Testing Lab — Fuel cell performance evaluation and durability testing",
        "Mobile deployment support units — On-site commissioning and maintenance training",
      ],
      activeDeployments: 42,
      partnerAgencies: 80,
      statesServed: 20,
      vehiclesDeployed: 650,
      h2StationsManaged: 8,
    },
    operations: {
      activePrograms: 42,
      partnerAgencies: 80,
      employeeCount: 85,
      vehiclesDeployed: 650,
      annualTechAssistanceHours: 18_000,
      h2FuelingStations: 8,
      chargingInstallations: 120,
      workforceGraduates: 2_400,
    },
    economic_impact: {
      regionalEconomicImpact: 450_000_000,
      directJobs: 85,
      totalJobsCreated: 3_200,
      partnerFleetSavings: 180_000_000,
      ghgReductionTons: 285_000,
    },
    past_grant_awards: [
      { program: "FTA Low-No Emission Vehicle Program", awardYear: 2022, awardAmount: 12_500_000, projectName: "Southeast Zero-Emission Bus Deployment — 20 BEB across 4 agencies", agency: "FTA", status: "Completed" },
      { program: "FTA Buses and Bus Facilities (5339(b))", awardYear: 2023, awardAmount: 9_800_000, projectName: "Hydrogen Fuel Cell Bus Pilot — 5 FCEB at MARTA", agency: "FTA", status: "In progress" },
      { program: "DOE Clean Fuels Program", awardYear: 2021, awardAmount: 6_500_000, projectName: "Southeast Hydrogen Corridor — Phase 1 Fueling Infrastructure", agency: "DOE", status: "Completed" },
      { program: "RAISE Discretionary Grants", awardYear: 2023, awardAmount: 15_000_000, projectName: "Atlanta Clean Transit Corridor — BRT Electrification", agency: "USDOT", status: "In progress" },
    ],
    disadvantaged_community_data: {
      description: "CTE prioritizes deployments in disadvantaged communities across the Southeast. Partner agencies in Atlanta, Birmingham, Memphis, Charlotte, and Jacksonville serve census tracts qualifying as disadvantaged under CEJST and EJScreen.",
      povertyRate: 24.1,
      pm25Percentile: 68,
      justiceFortyTracker: true,
      censusTract: "13121-0036, 13121-0047, 13121-0055, 01073-0024",
    },
    climate_resilience_data: {
      floodZone: "Mixed — partner sites range from Zone X to AE",
      hurricaneExposure: "Moderate — Southeast coastal deployments exposed to Category 2+ hurricanes",
      emissionsBaseline: "Partner fleet aggregate: 285,000 metric tons CO2e (2023 baseline)",
      emissionsReductionTarget: "50% partner fleet reduction by 2030; 90% by 2035",
      existingMitigations: [
        "Distributed deployment model reduces single-point-of-failure risk",
        "Hydrogen storage systems designed to NFPA 2 standards",
        "Battery systems with thermal management rated for Southeast heat",
        "Emergency generator backup at all hydrogen fueling stations",
      ],
      plannedMitigations: [
        "Grid-independent solar + storage at 5 hydrogen production sites",
        "Flood-resilient charging infrastructure elevation at coastal sites",
        "Hurricane-rated equipment enclosures for all new coastal deployments",
        "Real-time fleet monitoring and remote diagnostics for rapid recovery",
      ],
    },
  };

  // Step 1: Upsert core profile via Prisma ORM
  await prisma.portProfile.upsert({
    where: { slug: SLUG },
    update: {
      ...profileData,
      location: profileData.location as object,
      characteristics: profileData.characteristics as object,
    },
    create: {
      id: PROFILE_ID,
      slug: SLUG,
      ...profileData,
      location: profileData.location as object,
      characteristics: profileData.characteristics as object,
    },
  });

  // Step 2: Set extended fields via raw SQL on public schema
  // (extended columns exist in public.port_profiles but not in corvo.port_profiles)
  try {
    await prisma.$executeRawUnsafe(
      `UPDATE public.port_profiles SET
        legal_name = $1, uei = $2, ein = $3,
        location_data = $4::jsonb, leadership = $5::jsonb, financials = $6::jsonb,
        infrastructure = $7::jsonb, operations = $8::jsonb, economic_impact = $9::jsonb,
        past_grant_awards = $10::jsonb, disadvantaged_community_data = $11::jsonb,
        climate_resilience_data = $12::jsonb
      WHERE slug = $13`,
      extendedFields.legal_name,
      extendedFields.uei,
      extendedFields.ein,
      JSON.stringify(extendedFields.location_data),
      JSON.stringify(extendedFields.leadership),
      JSON.stringify(extendedFields.financials),
      JSON.stringify(extendedFields.infrastructure),
      JSON.stringify(extendedFields.operations),
      JSON.stringify(extendedFields.economic_impact),
      JSON.stringify(extendedFields.past_grant_awards),
      JSON.stringify(extendedFields.disadvantaged_community_data),
      JSON.stringify(extendedFields.climate_resilience_data),
      SLUG,
    );
    console.log("  ✓ Port profile seeded (with extended fields)");
  } catch (e) {
    console.log("  ✓ Port profile seeded (extended fields skipped — columns not available)");
  }

  // Re-resolve the profile ID from the DB (may differ from deterministic ID if profile already existed)
  const profile = await prisma.portProfile.findUnique({ where: { slug: SLUG }, select: { id: true } });
  if (profile) {
    PROFILE_ID = profile.id;
    console.log(`  Resolved portProfileId: ${PROFILE_ID}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. USERS
// ═══════════════════════════════════════════════════════════════════════════════

async function seedUsers() {
  console.log("Seeding users...");

  const users = [
    { portId: PORT_ID, email: "drafter@cte.demo", name: "Alex Drafter", title: "Grants Accountant", role: "drafter" },
    { portId: PORT_ID, email: "reviewer@cte.demo", name: "Pat Reviewer", title: "Grants Director", role: "reviewer" },
    { portId: PORT_ID, email: "cfo@cte.demo", name: "Jamie Certifier", title: "Chief Financial Officer", role: "certifying_official" },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: user,
    });
    console.log(`  Seeded ${user.email}`);
  }
  console.log(`  ✓ ${users.length} users seeded`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. PROJECTS
// ═══════════════════════════════════════════════════════════════════════════════

async function seedProjects() {
  console.log("Seeding projects...");

  // Cleanup existing CTE projects
  await prisma.project.deleteMany({ where: { portProfileId: PROFILE_ID } });

  const projects = [
    {
      id: PROJECT_IDS.seBusDeployment, portProfileId: PROFILE_ID,
      name: "Southeast Zero-Emission Bus Deployment — Phase 2",
      description: "Deployment of 60 battery-electric buses across 8 transit agencies in Georgia, Alabama, Tennessee, and North Carolina. Includes depot charging infrastructure, operator training, and performance monitoring for 3-year evaluation period.",
      projectType: "equipment", status: "construction", priority: "critical", budget: 78_000_000,
      location: "Multi-state: GA, AL, TN, NC",
      startDate: new Date("2025-01-01"), endDate: new Date("2028-06-30"),
      focusAreas: ["Zero-emission buses", "Battery-electric", "Depot charging", "Multi-agency deployment", "Performance evaluation"],
      notes: "Phase 1 (20 BEB) completed. Phase 2 expands to 8 agencies. New Flyer Xcelsior CHARGE NG and Proterra ZX5 under procurement.",
      fundingSource: "FTA Low-No Emission + FTA 5339(b) + partner agency match",
      costShareSource: "Partner transit agency capital reserves + state DOT contributions",
      nepaStatus: "categorical_exclusion", nepaDocument: "Categorical Exclusion (CE) — vehicle replacement on existing routes",
      designCompletion: 75, designPhase: "final",
      permits: [
        { name: "TECO electrical interconnection (MARTA)", status: "obtained", date: "2025-03-15" },
        { name: "Georgia Power service upgrade (Athens Transit)", status: "pending" },
      ],
      rightOfWay: "not_needed",
      procurementApproach: "Cooperative procurement through consortium RFP — best value selection",
      constructionStartTarget: new Date("2025-01-01"), shovelReady: true,
      priorFederalAwards: [{ program: "FTA Low-No FY2022", amount: 12_500_000, year: 2022, status: "completed" }],
      auditFindings: "none", onTimeCompletion: 92, jobsCreated: 120, jobsRetained: 85,
      emissionsReduction: "60 BEBs replacing diesel: estimated 8,400 tons CO2e/year reduction across partner fleets",
      safetyImpact: "Eliminates diesel particulate exposure for 850,000+ daily riders at partner agencies",
      economicImpact: "$320M estimated economic impact across Southeast partner communities over 12-year bus lifecycle",
      communitiesBenefited: "Atlanta, Birmingham, Memphis, Charlotte, Chattanooga, Athens, Macon, Savannah — 2.1M residents in service areas",
    },
    {
      id: PROJECT_IDS.h2FuelCellPilot, portProfileId: PROFILE_ID,
      name: "Hydrogen Fuel Cell Electric Bus Demonstration",
      description: "Demonstration deployment of 10 hydrogen fuel cell electric buses (FCEB) at MARTA and Birmingham Transit with on-site hydrogen production via electrolysis, fueling infrastructure, and comprehensive performance evaluation.",
      projectType: "equipment", status: "procurement", priority: "critical", budget: 42_000_000,
      location: "Atlanta, GA / Birmingham, AL",
      startDate: new Date("2025-06-01"), endDate: new Date("2029-05-31"),
      focusAreas: ["Hydrogen fuel cell", "FCEB", "Electrolysis", "Fueling infrastructure", "Technology evaluation"],
      notes: "Electrolyzer procurement RFP issued. MARTA depot hydrogen fueling station site selected. Birmingham Transit Authority MOU signed.",
      fundingSource: "FTA 5339(b) + DOE Clean Fuels + state match",
      costShareSource: "MARTA capital program + Alabama DOT + DOE hydrogen hub regional allocation",
      nepaStatus: "ea_in_progress", nepaDocument: "Environmental Assessment (EA) — hydrogen production and storage",
      designCompletion: 45, designPhase: "preliminary",
      permits: [
        { name: "NFPA 2 Hydrogen Storage Permit — Fulton County", status: "pending" },
        { name: "Air Quality Permit — Georgia EPD", status: "obtained", date: "2025-04-10" },
      ],
      rightOfWay: "acquired",
      procurementApproach: "Competitive RFP — FCEB turnkey with fueling infrastructure",
      constructionStartTarget: new Date("2026-01-01"), shovelReady: false,
      priorFederalAwards: [{ program: "FTA 5339(b) FY2023", amount: 9_800_000, year: 2023, status: "active" }],
      auditFindings: "none", jobsCreated: 45, jobsRetained: 30,
      emissionsReduction: "10 FCEB replacing diesel: 1,400 tons CO2e/year; zero tailpipe emissions with green hydrogen",
      safetyImpact: "Hydrogen safety systems exceed NFPA 2 requirements; zero-emission operation in transit corridors",
      economicImpact: "$180M projected economic impact from hydrogen supply chain development in Southeast",
      communitiesBenefited: "Atlanta and Birmingham EJ communities — 400,000+ residents within 1 mile of FCEB routes",
    },
    {
      id: PROJECT_IDS.cleanFreight, portProfileId: PROFILE_ID,
      name: "Southeast Clean Freight Corridor — I-85",
      description: "Development of a zero-emission freight corridor along I-85 from Atlanta to Charlotte with hydrogen fueling stations, electric truck charging, and real-time emissions monitoring. Partnership with freight carriers, truck stops, and state DOTs.",
      projectType: "infrastructure", status: "design", priority: "high", budget: 35_000_000,
      location: "I-85 Corridor: Atlanta, GA to Charlotte, NC",
      startDate: new Date("2025-09-01"), endDate: new Date("2029-08-31"),
      focusAreas: ["Clean freight", "Hydrogen fueling", "Electric truck charging", "Corridor development", "Emissions monitoring"],
      notes: "Feasibility study complete. Site selection for 4 hydrogen stations and 6 DC fast-charging plazas underway. GDOT and NCDOT MOUs executed.",
      fundingSource: "RAISE + FHWA Charging & Fueling Infrastructure + state contributions",
      costShareSource: "Georgia DOT + North Carolina DOT + private carrier commitments",
      nepaStatus: "ea_in_progress", nepaDocument: "Environmental Assessment (EA)",
      designCompletion: 30, designPhase: "schematic",
      permits: [
        { name: "GDOT Highway Access Permits (4 sites)", status: "pending" },
        { name: "NCDOT Encroachment Agreements (2 sites)", status: "pending" },
      ],
      rightOfWay: "partial",
      procurementApproach: "Design-build with best-value selection for hydrogen infrastructure; CM-at-risk for charging plazas",
      constructionStartTarget: new Date("2026-06-01"), shovelReady: false,
      priorFederalAwards: [{ program: "DOE Clean Fuels FY2021", amount: 6_500_000, year: 2021, status: "completed" }],
      auditFindings: "none", jobsCreated: 200, jobsRetained: 50,
      emissionsReduction: "Corridor projected to displace 12,000 diesel truck trips/year, reducing 18,000 tons CO2e annually",
      economicImpact: "$560M estimated economic impact from clean freight corridor over 20 years",
      communitiesBenefited: "Communities along I-85 in GA, SC, and NC — reduces diesel particulate exposure for 1.2M residents within 2 miles",
    },
    {
      id: PROJECT_IDS.fleetTransition, portProfileId: PROFILE_ID,
      name: "Transit Fleet Electrification Technical Assistance Program",
      description: "Comprehensive fleet electrification planning and technical assistance for 15 small and medium transit agencies in the Southeast, including route modeling, grid impact analysis, depot charging design, and procurement support.",
      projectType: "technology", status: "construction", priority: "high", budget: 8_500_000,
      location: "Multi-state: GA, AL, TN, SC, NC",
      startDate: new Date("2024-07-01"), endDate: new Date("2027-06-30"),
      focusAreas: ["Fleet transition planning", "Technical assistance", "Route modeling", "Grid impact", "Procurement support"],
      notes: "10 of 15 agencies have completed Phase 1 assessments. 5 agencies in Phase 2 (depot design and procurement support).",
      nepaStatus: "categorical_exclusion",
      designCompletion: 100, designPhase: "complete",
      permits: [], priorFederalAwards: [], auditFindings: "none",
      jobsCreated: 25, jobsRetained: 40,
      economicImpact: "Partner agencies projected to save $85M in fuel and maintenance costs over 12-year bus lifecycle",
      communitiesBenefited: "15 transit agencies serving 800,000+ daily riders across the Southeast",
    },
    {
      id: PROJECT_IDS.workforceDev, portProfileId: PROFILE_ID,
      name: "Clean Transportation Workforce Development Center",
      description: "Establishment of a workforce development center in Atlanta providing training for zero-emission vehicle maintenance, hydrogen systems, high-voltage battery technology, and charging infrastructure installation. Partnership with Georgia Tech and Atlanta Technical College.",
      projectType: "infrastructure", status: "planning", priority: "high", budget: 12_000_000,
      location: "Atlanta, GA",
      startDate: new Date("2026-01-01"), endDate: new Date("2029-12-31"),
      focusAreas: ["Workforce development", "ZEV maintenance training", "Hydrogen systems", "High-voltage battery", "Charging infrastructure"],
      notes: "Georgia Tech MOU signed. Atlanta Technical College curriculum alignment underway. Site selection in progress.",
      permits: [], priorFederalAwards: [], auditFindings: "none",
      jobsCreated: 500, jobsRetained: 30,
      communitiesBenefited: "Workforce pipeline for 500+ clean energy technicians annually — targeting underrepresented communities in metro Atlanta",
    },
    {
      id: PROJECT_IDS.h2HubInfra, portProfileId: PROFILE_ID,
      name: "Southeast Hydrogen Hub — Transit Fueling Network",
      description: "Development of 5 hydrogen fueling stations across the Southeast to support fuel cell electric bus operations at partner transit agencies. Includes green hydrogen production via electrolysis, storage systems, and dispensing infrastructure.",
      projectType: "infrastructure", status: "planning", priority: "medium", budget: 55_000_000,
      location: "Atlanta, Birmingham, Memphis, Charlotte, Savannah",
      startDate: new Date("2026-06-01"), endDate: new Date("2030-05-31"),
      focusAreas: ["Hydrogen hub", "Fueling infrastructure", "Green hydrogen", "Electrolysis", "Transit fueling"],
      notes: "DOE Southeast H2Hub regional allocation under negotiation. Site assessments at 3 of 5 locations complete.",
      permits: [], priorFederalAwards: [], auditFindings: "none",
      jobsCreated: 300, jobsRetained: 100,
      emissionsReduction: "Green hydrogen production eliminates 4,200 tons CO2e/year vs. grey hydrogen baseline",
      economicImpact: "$890M projected economic impact from hydrogen supply chain across Southeast",
      communitiesBenefited: "5 metropolitan areas — 6.2M combined population with access to clean transit fueling",
    },
  ];

  for (const project of projects) {
    await prisma.project.create({ data: project });
    console.log(`  Created: ${project.name}`);
  }
  console.log(`  ✓ ${projects.length} projects seeded`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. DISCOVERED GRANTS
// ═══════════════════════════════════════════════════════════════════════════════

async function seedDiscoveredGrants() {
  console.log("Seeding discovered grants...");

  // Clean up existing pipeline grants first (FK constraint)
  for (const grantId of Object.values(GRANT_IDS)) {
    await prisma.pipelineGrant.deleteMany({ where: { grantId } });
    await prisma.discoveredGrant.deleteMany({ where: { id: grantId } });
  }

  const grants = [
    {
      id: GRANT_IDS.lowNo2026,
      title: "FY 2026 Low or No Emission Vehicle Program (Low-No)",
      agency: "U.S. Department of Transportation — Federal Transit Administration",
      agencyCode: "DOT", opportunityNumber: "FTA-2026-005-TPM",
      description: "Provides funding to state and local governmental authorities for the purchase or lease of zero-emission and low-emission transit buses, including acquisition, construction, and leasing of required supporting facilities such as charging infrastructure.",
      awardFloor: 2_000_000, awardCeiling: 65_000_000, totalFunding: 1_100_000_000,
      closeDate: new Date("2026-08-01"), postDate: new Date("2026-04-15"), status: "posted",
      applicationUrl: "https://www.transit.dot.gov/lowno", costSharing: true,
      eligibility: ["Transit agencies", "State DOTs", "Nonprofit organizations acting on behalf of transit agencies", "Indian tribes"],
      fundingCategories: ["Zero-Emission Buses", "Battery-Electric Buses", "Hydrogen Fuel Cell Buses", "Charging Infrastructure"],
      fundingInstruments: ["Grant"], alnNumbers: ["20.526"],
      contactName: "FTA Office of Program Management", contactEmail: "lowno@dot.gov",
    },
    {
      id: GRANT_IDS.busFac2026,
      title: "FY 2026 Grants for Buses and Bus Facilities Competitive Program (5339(b))",
      agency: "U.S. Department of Transportation — Federal Transit Administration",
      agencyCode: "DOT", opportunityNumber: "FTA-2026-006-TFM",
      description: "Makes federal resources available to states and direct recipients to replace, rehabilitate, and purchase buses and related equipment, and to construct bus-related facilities including hydrogen fueling infrastructure.",
      awardFloor: 2_000_000, awardCeiling: 50_000_000, totalFunding: 550_000_000,
      closeDate: new Date("2026-08-01"), postDate: new Date("2026-04-15"), status: "posted",
      applicationUrl: "https://www.transit.dot.gov/bus-program", costSharing: true,
      eligibility: ["Transit agencies", "State DOTs", "Nonprofit organizations", "Indian tribes"],
      fundingCategories: ["Bus Replacement", "Bus Facilities", "Fueling Infrastructure", "Hydrogen Stations"],
      fundingInstruments: ["Grant"], alnNumbers: ["20.526"],
      contactName: "FTA Office of Transit Facilities Management", contactEmail: "busprogram@dot.gov",
    },
    {
      id: GRANT_IDS.cleanFuels2026,
      title: "FY 2026 DOE Clean Hydrogen & Clean Fuels Infrastructure Program",
      agency: "U.S. Department of Energy — Office of Energy Efficiency and Renewable Energy",
      agencyCode: "DOE", opportunityNumber: "DOE-FOA-0003201",
      description: "Supports development, demonstration, and deployment of clean hydrogen production, storage, and distribution infrastructure for transportation applications, including transit bus fueling and freight corridor development.",
      awardFloor: 1_000_000, awardCeiling: 40_000_000, totalFunding: 750_000_000,
      closeDate: new Date("2026-09-30"), postDate: new Date("2026-05-01"), status: "posted",
      applicationUrl: "https://www.energy.gov/eere/fuelcells", costSharing: true,
      eligibility: ["Nonprofit organizations", "State and local governments", "National laboratories", "Universities", "Industry partners"],
      fundingCategories: ["Clean Hydrogen", "Fueling Infrastructure", "Electrolysis", "Hydrogen Storage", "Corridor Development"],
      fundingInstruments: ["Cooperative Agreement"], alnNumbers: ["81.086"],
      contactName: "DOE Hydrogen and Fuel Cell Technologies Office", contactEmail: "cleanfuels@ee.doe.gov",
    },
    {
      id: GRANT_IDS.raise2026,
      title: "FY 2026 RAISE Discretionary Grants",
      agency: "U.S. Department of Transportation — Office of the Secretary",
      agencyCode: "DOT", opportunityNumber: "USDOT-RAISE-FY2026",
      description: "Rebuilding American Infrastructure with Sustainability and Equity grants fund surface transportation capital investments of regional or national significance.",
      awardFloor: 5_000_000, awardCeiling: 45_000_000, totalFunding: 1_500_000_000,
      closeDate: new Date("2026-07-15"), postDate: new Date("2026-04-01"), status: "posted",
      applicationUrl: "https://www.transportation.gov/RAISEgrants", costSharing: true,
      eligibility: ["State and local governments", "Transit agencies", "Nonprofit organizations", "Metropolitan planning organizations"],
      fundingCategories: ["Surface Transportation", "Clean Freight", "Zero-Emission Infrastructure", "Safety"],
      fundingInstruments: ["Grant"], alnNumbers: ["20.933"],
      contactName: "RAISE Program Office", contactEmail: "RAISEgrants@dot.gov",
    },
    {
      id: GRANT_IDS.crp2026,
      title: "FY 2026 Carbon Reduction Program (CRP)",
      agency: "U.S. Department of Transportation — Federal Highway Administration",
      agencyCode: "DOT", opportunityNumber: "FHWA-CRP-FY2026",
      description: "Provides funds for projects designed to reduce transportation emissions, including zero-emission vehicle infrastructure, transit improvements, and clean freight corridors.",
      awardFloor: 500_000, awardCeiling: 20_000_000, totalFunding: 1_260_000_000,
      closeDate: new Date("2026-10-31"), postDate: new Date("2026-06-01"), status: "posted",
      applicationUrl: "https://www.fhwa.dot.gov/bipartisan-infrastructure-law/crp.cfm", costSharing: true,
      eligibility: ["State DOTs", "Metropolitan planning organizations", "Local governments", "Nonprofit organizations"],
      fundingCategories: ["Carbon Reduction", "EV Infrastructure", "Hydrogen Fueling", "Clean Freight"],
      fundingInstruments: ["Grant"], alnNumbers: ["20.205"],
      contactName: "FHWA Office of Natural Environment", contactEmail: "carbonreduction@dot.gov",
    },
  ];

  for (const grant of grants) {
    await prisma.discoveredGrant.create({ data: grant });
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
      grantId: GRANT_IDS.lowNo2026, portProfileId: PROFILE_ID,
      stage: "applied",
      notes: "Application submitted for 30 BEB deployment across 5 partner agencies. $24M request with 15% local match committed from partner transit agencies.",
      overallScore: 93, eligibilityScore: 98, alignmentScore: 96, impactScore: 90, competitivenessScore: 88,
      recommendation: "strong_apply", eligibilityStatus: "eligible",
      strengths: [
        "Phase 1 completed with 20 BEB — demonstrated multi-agency deployment success",
        "70% of partner routes serve environmental justice communities (CEJST qualified)",
        "8,400 tons CO2e/year reduction across partner fleets with EPA methodology",
        "Workforce training pipeline established with Georgia Tech and Atlanta Technical College",
      ],
      concerns: [
        "Multi-agency coordination adds complexity to procurement timeline",
        "Grid capacity assessments not finalized at 2 partner sites",
        "30-bus procurement across 5 agencies requires robust logistics coordination",
      ],
      keyRequirements: ["Fleet Transition Plans (per agency)", "Charging infrastructure deployment schedule", "Workforce development plan", "Environmental justice analysis", "15% non-federal match"],
      scoredAt: new Date("2026-05-20"), addedAt: new Date("2026-04-25"),
    },
    {
      grantId: GRANT_IDS.busFac2026, portProfileId: PROFILE_ID,
      stage: "drafting",
      notes: "Developing application for 10 hydrogen fuel cell electric buses and fueling infrastructure at MARTA and Birmingham Transit. $22M request.",
      overallScore: 86, eligibilityScore: 95, alignmentScore: 90, impactScore: 85, competitivenessScore: 74,
      recommendation: "strong_apply", eligibilityStatus: "eligible",
      strengths: [
        "FY2023 5339(b) FCEB pilot at MARTA — demonstrated hydrogen transit capability",
        "Comprehensive hydrogen safety record with 8 active fueling stations",
        "DOE hydrogen hub partnership provides supply chain certainty",
        "Strong transit agency partner commitments (MARTA + Birmingham)",
      ],
      concerns: [
        "$22M is large ask for hydrogen demonstration",
        "FCEB cost per unit remains higher than BEB — cost-effectiveness challenge",
        "Hydrogen production infrastructure timeline uncertainty",
      ],
      keyRequirements: ["Hydrogen safety plan (NFPA 2)", "Facility condition assessment", "Partner agency MOUs", "20% non-federal match"],
      scoredAt: new Date("2026-06-01"), addedAt: new Date("2026-05-15"),
    },
    {
      grantId: GRANT_IDS.cleanFuels2026, portProfileId: PROFILE_ID,
      stage: "applied",
      notes: "Application submitted for Southeast Clean Hydrogen Corridor — 3 new hydrogen fueling stations along I-85 with green hydrogen production via electrolysis.",
      overallScore: 89, eligibilityScore: 96, alignmentScore: 93, impactScore: 87, competitivenessScore: 80,
      recommendation: "strong_apply", eligibilityStatus: "eligible",
      strengths: [
        "DOE Southeast H2Hub regional partner — aligned with national hydrogen strategy",
        "Phase 1 corridor (6 stations) completed and operational",
        "Green hydrogen production reduces lifecycle emissions by 95% vs grey hydrogen",
        "Strong freight carrier partnerships (UPS, FedEx, Schneider) for corridor utilization",
      ],
      concerns: [
        "Electrolyzer supply chain delays possible",
        "Green electricity procurement agreements still under negotiation at 1 site",
        "Highway site access permits require GDOT and NCDOT coordination",
      ],
      keyRequirements: ["Hydrogen production plan", "Safety analysis", "Corridor utilization projections", "20% cost share"],
      scoredAt: new Date("2026-05-25"), addedAt: new Date("2026-05-10"),
    },
    {
      grantId: GRANT_IDS.raise2026, portProfileId: PROFILE_ID,
      stage: "eligible",
      notes: "Evaluating for Clean Freight Corridor expansion — $28M for hydrogen and electric truck charging along I-85. Strong BCA but RAISE is extremely competitive.",
      overallScore: 78, eligibilityScore: 90, alignmentScore: 82, impactScore: 76, competitivenessScore: 64,
      recommendation: "consider", eligibilityStatus: "eligible",
      strengths: [
        "Regional significance — I-85 is critical Southeast freight corridor",
        "Multi-state partnership (GA, SC, NC) demonstrates regional coordination",
        "12,000 diesel truck trips/year displacement with strong BCA",
        "Environmental justice communities along corridor benefit from reduced diesel PM",
      ],
      concerns: [
        "RAISE is extremely competitive (~1,000 applications for ~100 awards)",
        "Corridor infrastructure still in 30% design — readiness concerns",
        "Environmental Assessment not yet complete — risk of conditional award",
      ],
      keyRequirements: ["Benefit-Cost Analysis (BCA)", "Project readiness documentation", "20% non-federal match", "Letters of support from state DOTs"],
      scoredAt: new Date("2026-04-30"), addedAt: new Date("2026-04-15"),
    },
    {
      grantId: GRANT_IDS.crp2026, portProfileId: PROFILE_ID,
      stage: "eligible",
      notes: "Considering for fleet transition TA expansion and clean corridor carbon monitoring infrastructure.",
      overallScore: 72, eligibilityScore: 86, alignmentScore: 76, impactScore: 70, competitivenessScore: 56,
      recommendation: "apply", eligibilityStatus: "eligible",
      strengths: [
        "Directly reduces transportation carbon emissions across partner fleets",
        "Aligns with both Georgia and North Carolina Carbon Reduction Strategies",
        "Complements Low-No and 5339(b) applications",
        "Quantified carbon monitoring methodology demonstrated in Phase 1 corridor",
      ],
      concerns: [
        "CRP funding is formula-based through state DOTs — requires GDOT support",
        "Smaller funding pool limits award size",
        "Must demonstrate quantified carbon reduction methodology per FHWA guidance",
      ],
      keyRequirements: ["Carbon reduction quantification", "State CRP strategy alignment", "State DOT endorsement", "20% non-federal match"],
      scoredAt: new Date("2026-06-10"), addedAt: new Date("2026-06-05"),
    },
  ];

  for (const pg of pipeline) {
    await prisma.pipelineGrant.create({ data: pg });
    console.log(`  Created: ${pg.grantId} → ${pg.stage} (score: ${pg.overallScore})`);
  }
  console.log(`  ✓ ${pipeline.length} pipeline grants seeded`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. AWARDS (cleanup + seed)
// ═══════════════════════════════════════════════════════════════════════════════

async function cleanup() {
  console.log("Cleaning up prior CTE award data...");
  for (const awardId of Object.values(AWARD_IDS)) {
    for (const table of [
      "corrective_action_plans", "audit_findings",
      "compliance_checklist_items", "compliance_checklists",
      "subrecipient_reports", "subrecipients",
      "closeout_checklists", "scheduled_reports",
      "budget_modifications", "drawdown_requests",
      "expenses", "match_ledger", "budget_categories",
    ]) {
      try {
        await prisma.$executeRawUnsafe(`DELETE FROM ${table} WHERE award_id = $1`, awardId);
      } catch { /* table may not exist or not have award_id */ }
    }
    try {
      await prisma.$executeRawUnsafe(`DELETE FROM tasks WHERE award_id = $1`, awardId);
    } catch { /* ignore */ }
    try {
      await prisma.$executeRawUnsafe(`DELETE FROM awards WHERE id = $1`, awardId);
    } catch { /* may not exist */ }
  }
  console.log("  ✓ Cleanup done");
}

async function seedAwards() {
  console.log("Seeding awards...");

  const awards = [
    {
      id: AWARD_IDS.lowNo,
      portProfileId: PROFILE_ID,
      fain: "GA-2024-062-00",
      cfda: "20.526",
      awardingAgency: "U.S. Department of Transportation / Federal Transit Administration",
      program: "FTA Low-No Emission",
      title: "Southeast Zero-Emission Bus Deployment — 20 BEB Phase 1",
      description: "Procurement and deployment of 20 battery-electric buses across 4 partner transit agencies (MARTA, Birmingham Transit, Memphis Area Transit, Charlotte Area Transit). Includes depot charging infrastructure and operator training.",
      totalAmount: 16_200_000,
      performancePeriodStart: new Date("2023-10-01"),
      performancePeriodEnd: new Date("2027-03-31"),
      matchPercentage: 15,
      matchTypes: ["cash"],
      matchCommitted: 2_100_000,
      matchRequired: 2_835_000,
      status: "active",
      projectIds: [PROJECT_IDS.seBusDeployment],
      indirectCostRate: 0.1200,
      indirectCostBase: "mtdc",
      indirectCostType: "negotiated",
      indirectCostPeriodStart: new Date("2023-10-01"),
      indirectCostPeriodEnd: new Date("2027-03-31"),
    },
    {
      id: AWARD_IDS.busFacilities,
      portProfileId: PROFILE_ID,
      fain: "GA-2023-089-00",
      cfda: "20.526",
      awardingAgency: "U.S. Department of Transportation / Federal Transit Administration",
      program: "FTA 5339(b)",
      title: "Hydrogen Fuel Cell Bus Pilot — 5 FCEB at MARTA",
      description: "Deployment of 5 hydrogen fuel cell electric buses at MARTA with on-site hydrogen fueling station. Includes fuel cell durability testing, performance evaluation, and maintenance workforce training.",
      totalAmount: 12_800_000,
      performancePeriodStart: new Date("2024-04-01"),
      performancePeriodEnd: new Date("2028-03-31"),
      matchPercentage: 20,
      matchTypes: ["cash", "in_kind"],
      matchCommitted: 1_920_000,
      matchRequired: 3_200_000,
      status: "active",
      projectIds: [PROJECT_IDS.h2FuelCellPilot],
    },
    {
      id: AWARD_IDS.cleanFuels,
      portProfileId: PROFILE_ID,
      fain: "DOE-EERE-0003105",
      cfda: "81.086",
      awardingAgency: "U.S. Department of Energy / Office of Energy Efficiency and Renewable Energy",
      program: "DOE Clean Fuels",
      title: "Southeast Hydrogen Corridor — Phase 1 Fueling Infrastructure",
      description: "Construction and commissioning of 6 hydrogen fueling stations along major Southeast freight corridors. Includes green hydrogen production via PEM electrolysis, hydrogen storage, and high-flow dispensing for heavy-duty vehicles.",
      totalAmount: 9_200_000,
      performancePeriodStart: new Date("2022-10-01"),
      performancePeriodEnd: new Date("2026-09-30"),
      matchPercentage: 20,
      matchTypes: ["cash", "in_kind"],
      matchCommitted: 1_840_000,
      matchRequired: 2_300_000,
      status: "active",
      projectIds: [PROJECT_IDS.cleanFreight, PROJECT_IDS.h2HubInfra],
    },
    {
      id: AWARD_IDS.raise,
      portProfileId: PROFILE_ID,
      fain: "RAISE-2023-CTE-0078",
      cfda: "20.933",
      awardingAgency: "U.S. Department of Transportation",
      program: "RAISE",
      title: "Atlanta Clean Transit Corridor — BRT Electrification",
      description: "Electrification of 12-mile transit corridor in Atlanta with battery-electric bus service, 8 enhanced BRT stations with level boarding, charging infrastructure, and transit signal priority at 24 intersections.",
      totalAmount: 18_500_000,
      performancePeriodStart: new Date("2024-01-15"),
      performancePeriodEnd: new Date("2028-01-14"),
      matchPercentage: 20,
      matchTypes: ["cash"],
      matchCommitted: 2_800_000,
      matchRequired: 4_625_000,
      status: "active",
      projectIds: [PROJECT_IDS.seBusDeployment],
    },
  ];

  for (const award of awards) {
    await prisma.award.create({ data: award });
    console.log(`  Created: ${award.program} — ${award.title.slice(0, 55)}... ($${(Number(award.totalAmount) / 1_000_000).toFixed(1)}M)`);
  }
  console.log(`  ✓ ${awards.length} awards seeded`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. BUDGET CATEGORIES
// ═══════════════════════════════════════════════════════════════════════════════

async function seedBudgetCategories() {
  console.log("Seeding budget categories...");

  const cats = [
    // FTA Low-No — $16.2M
    { id: BUDGET_CAT_IDS.lowno_buses, awardId: AWARD_IDS.lowNo, name: "Battery-Electric Bus Procurement (20 units)", ceiling: 11_800_000, spent: 8_260_000 },
    { id: BUDGET_CAT_IDS.lowno_charging, awardId: AWARD_IDS.lowNo, name: "Depot Charging Infrastructure (4 sites)", ceiling: 2_600_000, spent: 1_560_000 },
    { id: BUDGET_CAT_IDS.lowno_workforce, awardId: AWARD_IDS.lowNo, name: "Operator & Maintenance Training", ceiling: 1_000_000, spent: 600_000 },
    { id: BUDGET_CAT_IDS.lowno_admin, awardId: AWARD_IDS.lowNo, name: "Program Administration", ceiling: 800_000, spent: 480_000 },
    // FTA 5339(b) H2 — $12.8M
    { id: BUDGET_CAT_IDS.busfac_h2buses, awardId: AWARD_IDS.busFacilities, name: "Fuel Cell Electric Bus Procurement (5 units)", ceiling: 7_500_000, spent: 3_000_000 },
    { id: BUDGET_CAT_IDS.busfac_fueling, awardId: AWARD_IDS.busFacilities, name: "Hydrogen Fueling Station", ceiling: 3_500_000, spent: 1_050_000 },
    { id: BUDGET_CAT_IDS.busfac_testing, awardId: AWARD_IDS.busFacilities, name: "Performance Testing & Evaluation", ceiling: 1_200_000, spent: 480_000 },
    { id: BUDGET_CAT_IDS.busfac_admin, awardId: AWARD_IDS.busFacilities, name: "Program Administration", ceiling: 600_000, spent: 300_000 },
    // DOE Clean Fuels — $9.2M
    { id: BUDGET_CAT_IDS.clean_corridor, awardId: AWARD_IDS.cleanFuels, name: "Hydrogen Fueling Stations (6 sites)", ceiling: 5_800_000, spent: 4_060_000 },
    { id: BUDGET_CAT_IDS.clean_equipment, awardId: AWARD_IDS.cleanFuels, name: "Electrolyzer & Storage Equipment", ceiling: 2_200_000, spent: 1_540_000 },
    { id: BUDGET_CAT_IDS.clean_data, awardId: AWARD_IDS.cleanFuels, name: "Data Collection & Monitoring Systems", ceiling: 700_000, spent: 420_000 },
    { id: BUDGET_CAT_IDS.clean_admin, awardId: AWARD_IDS.cleanFuels, name: "Program Administration", ceiling: 500_000, spent: 350_000 },
    // RAISE — $18.5M
    { id: BUDGET_CAT_IDS.raise_infra, awardId: AWARD_IDS.raise, name: "Corridor Infrastructure & Stations", ceiling: 10_500_000, spent: 4_200_000 },
    { id: BUDGET_CAT_IDS.raise_engineering, awardId: AWARD_IDS.raise, name: "Engineering & Design", ceiling: 3_200_000, spent: 2_560_000 },
    { id: BUDGET_CAT_IDS.raise_community, awardId: AWARD_IDS.raise, name: "Community Engagement & Equity", ceiling: 2_800_000, spent: 840_000 },
    { id: BUDGET_CAT_IDS.raise_admin, awardId: AWARD_IDS.raise, name: "Program Administration", ceiling: 2_000_000, spent: 1_000_000 },
  ];

  for (const cat of cats) {
    await prisma.budgetCategory.create({ data: cat });
  }
  console.log(`  ✓ ${cats.length} budget categories seeded`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. EXPENSES
// ═══════════════════════════════════════════════════════════════════════════════

async function seedExpenses() {
  console.log("Seeding expenses...");

  const expenses = [
    // FTA Low-No — BEB Deployment
    { awardId: AWARD_IDS.lowNo, categoryId: BUDGET_CAT_IDS.lowno_buses, date: new Date("2024-06-15"), description: "BEB procurement deposit — 10 New Flyer Xcelsior CHARGE NG for MARTA and Birmingham", vendor: "New Flyer Industries", amount: 3_800_000, status: "drawn" },
    { awardId: AWARD_IDS.lowNo, categoryId: BUDGET_CAT_IDS.lowno_buses, date: new Date("2024-12-01"), description: "BEB delivery milestone — 10 units delivered to MARTA (6) and Birmingham (4)", vendor: "New Flyer Industries", amount: 2_660_000, status: "drawn" },
    { awardId: AWARD_IDS.lowNo, categoryId: BUDGET_CAT_IDS.lowno_buses, date: new Date("2025-04-15"), description: "BEB procurement — 10 Proterra ZX5 for Memphis and Charlotte", vendor: "Proterra Inc", amount: 1_800_000, status: "approved" },
    { awardId: AWARD_IDS.lowNo, categoryId: BUDGET_CAT_IDS.lowno_charging, date: new Date("2024-09-01"), description: "Depot charging installation — MARTA and Birmingham (ABB 150kW dispensers)", vendor: "ABB E-Mobility", amount: 980_000, status: "drawn" },
    { awardId: AWARD_IDS.lowNo, categoryId: BUDGET_CAT_IDS.lowno_charging, date: new Date("2025-03-10"), description: "Depot charging installation — Memphis and Charlotte sites", vendor: "ChargePoint", amount: 580_000, status: "approved" },
    { awardId: AWARD_IDS.lowNo, categoryId: BUDGET_CAT_IDS.lowno_workforce, date: new Date("2024-10-15"), description: "BEB operator and maintenance training — MARTA and Birmingham cohorts", vendor: "CTE Training Division", amount: 380_000, status: "drawn" },
    { awardId: AWARD_IDS.lowNo, categoryId: BUDGET_CAT_IDS.lowno_workforce, date: new Date("2025-05-01"), description: "HV battery systems training — Memphis and Charlotte cohorts", vendor: "Atlanta Technical College", amount: 220_000, status: "logged" },
    { awardId: AWARD_IDS.lowNo, categoryId: BUDGET_CAT_IDS.lowno_admin, date: new Date("2024-10-01"), description: "FY2024 program management and FTA reporting", vendor: "CTE Staff", amount: 280_000, status: "drawn" },
    { awardId: AWARD_IDS.lowNo, categoryId: BUDGET_CAT_IDS.lowno_admin, date: new Date("2025-04-01"), description: "H1 FY2025 program administration and partner coordination", vendor: "CTE Staff", amount: 200_000, status: "approved" },
    // FTA 5339(b) — H2 Fuel Cell
    { awardId: AWARD_IDS.busFacilities, categoryId: BUDGET_CAT_IDS.busfac_h2buses, date: new Date("2025-01-15"), description: "FCEB procurement deposit — 5 New Flyer Xcelsior CHARGE H2 for MARTA", vendor: "New Flyer Industries", amount: 1_800_000, status: "drawn" },
    { awardId: AWARD_IDS.busFacilities, categoryId: BUDGET_CAT_IDS.busfac_h2buses, date: new Date("2025-08-01"), description: "FCEB delivery milestone — 3 units delivered to MARTA", vendor: "New Flyer Industries", amount: 1_200_000, status: "approved" },
    { awardId: AWARD_IDS.busFacilities, categoryId: BUDGET_CAT_IDS.busfac_fueling, date: new Date("2025-03-15"), description: "Hydrogen fueling station — electrolyzer and compression equipment", vendor: "Nel Hydrogen", amount: 680_000, status: "drawn" },
    { awardId: AWARD_IDS.busFacilities, categoryId: BUDGET_CAT_IDS.busfac_fueling, date: new Date("2025-09-01"), description: "H2 station civil works and dispensing infrastructure", vendor: "AECOM", amount: 370_000, status: "logged" },
    { awardId: AWARD_IDS.busFacilities, categoryId: BUDGET_CAT_IDS.busfac_testing, date: new Date("2025-06-01"), description: "FCEB performance baseline testing and data collection", vendor: "CTE Testing Lab", amount: 480_000, status: "approved" },
    { awardId: AWARD_IDS.busFacilities, categoryId: BUDGET_CAT_IDS.busfac_admin, date: new Date("2025-04-01"), description: "H1 FY2025 program management and FTA reporting", vendor: "CTE Staff", amount: 300_000, status: "drawn" },
    // DOE Clean Fuels — Hydrogen Corridor
    { awardId: AWARD_IDS.cleanFuels, categoryId: BUDGET_CAT_IDS.clean_corridor, date: new Date("2023-06-15"), description: "H2 station #1 construction — Atlanta (I-85/I-285 junction)", vendor: "Air Liquide", amount: 1_450_000, status: "drawn" },
    { awardId: AWARD_IDS.cleanFuels, categoryId: BUDGET_CAT_IDS.clean_corridor, date: new Date("2024-01-10"), description: "H2 station #2 & #3 construction — Greenville, SC and Gastonia, NC", vendor: "Air Liquide", amount: 1_680_000, status: "drawn" },
    { awardId: AWARD_IDS.cleanFuels, categoryId: BUDGET_CAT_IDS.clean_corridor, date: new Date("2025-03-01"), description: "H2 stations #4-#6 — Anderson SC, Commerce GA, Spartanburg SC", vendor: "Nel Hydrogen", amount: 930_000, status: "approved" },
    { awardId: AWARD_IDS.cleanFuels, categoryId: BUDGET_CAT_IDS.clean_equipment, date: new Date("2023-09-01"), description: "PEM electrolyzer procurement and installation — stations #1-#3", vendor: "Plug Power", amount: 1_100_000, status: "drawn" },
    { awardId: AWARD_IDS.cleanFuels, categoryId: BUDGET_CAT_IDS.clean_equipment, date: new Date("2025-01-15"), description: "Electrolyzer and storage for stations #4-#6", vendor: "Plug Power", amount: 440_000, status: "approved" },
    { awardId: AWARD_IDS.cleanFuels, categoryId: BUDGET_CAT_IDS.clean_data, date: new Date("2024-06-01"), description: "Real-time monitoring and data telemetry deployment", vendor: "Digi International", amount: 420_000, status: "drawn" },
    { awardId: AWARD_IDS.cleanFuels, categoryId: BUDGET_CAT_IDS.clean_admin, date: new Date("2024-10-01"), description: "FY2023-2024 DOE reporting and program coordination", vendor: "CTE Staff", amount: 350_000, status: "drawn" },
    // RAISE — Clean Transit Corridor
    { awardId: AWARD_IDS.raise, categoryId: BUDGET_CAT_IDS.raise_engineering, date: new Date("2024-06-01"), description: "30% corridor design — alignment, station layout, TSP integration", vendor: "Kimley-Horn", amount: 1_350_000, status: "drawn" },
    { awardId: AWARD_IDS.raise, categoryId: BUDGET_CAT_IDS.raise_engineering, date: new Date("2025-01-15"), description: "60% design — utility relocation and charging infrastructure plans", vendor: "Kimley-Horn", amount: 1_210_000, status: "drawn" },
    { awardId: AWARD_IDS.raise, categoryId: BUDGET_CAT_IDS.raise_infra, date: new Date("2025-03-15"), description: "BRT station construction — Phase 1 (4 stations)", vendor: "Holder Construction", amount: 2_400_000, status: "approved" },
    { awardId: AWARD_IDS.raise, categoryId: BUDGET_CAT_IDS.raise_infra, date: new Date("2025-09-01"), description: "Corridor roadway improvements and charging infrastructure", vendor: "Holder Construction", amount: 1_800_000, status: "logged" },
    { awardId: AWARD_IDS.raise, categoryId: BUDGET_CAT_IDS.raise_community, date: new Date("2024-09-01"), description: "Community engagement workshops and equity analysis — Phase 1", vendor: "HNTB Corporation", amount: 560_000, status: "drawn" },
    { awardId: AWARD_IDS.raise, categoryId: BUDGET_CAT_IDS.raise_community, date: new Date("2025-06-01"), description: "Equity impact assessment and community benefits agreement", vendor: "HNTB Corporation", amount: 280_000, status: "approved" },
    { awardId: AWARD_IDS.raise, categoryId: BUDGET_CAT_IDS.raise_admin, date: new Date("2024-07-01"), description: "FY2024 USDOT reporting and program management", vendor: "CTE Staff", amount: 550_000, status: "drawn" },
    { awardId: AWARD_IDS.raise, categoryId: BUDGET_CAT_IDS.raise_admin, date: new Date("2025-04-01"), description: "H1 FY2025 program management and partner coordination", vendor: "CTE Staff", amount: 450_000, status: "approved" },
  ];

  for (const exp of expenses) {
    await prisma.expense.create({ data: exp });
  }
  console.log(`  ✓ ${expenses.length} expenses seeded`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8. MATCH LEDGER
// ═══════════════════════════════════════════════════════════════════════════════

async function seedMatchLedger() {
  console.log("Seeding match ledger...");

  const entries = [
    { awardId: AWARD_IDS.lowNo, date: new Date("2024-03-15"), description: "MARTA cash match — BEB procurement Phase 1", amount: 900_000, type: "cash" },
    { awardId: AWARD_IDS.lowNo, date: new Date("2024-10-01"), description: "Birmingham Transit cash match — BEB and charging", amount: 600_000, type: "cash" },
    { awardId: AWARD_IDS.lowNo, date: new Date("2025-03-01"), description: "Memphis and Charlotte combined cash match", amount: 600_000, type: "cash" },
    { awardId: AWARD_IDS.busFacilities, date: new Date("2024-06-01"), description: "MARTA cash match — FCEB procurement", amount: 1_200_000, type: "cash" },
    { awardId: AWARD_IDS.busFacilities, date: new Date("2025-01-15"), description: "CTE in-kind: Hydrogen systems engineering and testing", amount: 720_000, type: "in_kind" },
    { awardId: AWARD_IDS.cleanFuels, date: new Date("2023-03-01"), description: "CTE cash match — corridor Phase 1 infrastructure", amount: 920_000, type: "cash" },
    { awardId: AWARD_IDS.cleanFuels, date: new Date("2024-06-15"), description: "State DOT contributions (GA + SC + NC)", amount: 650_000, type: "cash" },
    { awardId: AWARD_IDS.cleanFuels, date: new Date("2025-02-01"), description: "CTE in-kind: Engineering staff time and oversight", amount: 270_000, type: "in_kind" },
    { awardId: AWARD_IDS.raise, date: new Date("2024-04-01"), description: "MARTA cash match — corridor infrastructure", amount: 1_400_000, type: "cash" },
    { awardId: AWARD_IDS.raise, date: new Date("2025-01-15"), description: "City of Atlanta cash match — BRT stations and roadway", amount: 1_000_000, type: "cash" },
    { awardId: AWARD_IDS.raise, date: new Date("2025-06-01"), description: "CTE cash contribution — program management", amount: 400_000, type: "cash" },
  ];

  for (const entry of entries) {
    await prisma.matchLedgerEntry.create({ data: entry });
  }
  console.log(`  ✓ ${entries.length} match ledger entries seeded`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 9. DRAWDOWN REQUESTS
// ═══════════════════════════════════════════════════════════════════════════════

async function seedDrawdowns() {
  console.log("Seeding drawdown requests...");

  const drawdowns = [
    { awardId: AWARD_IDS.lowNo, expenseIds: ["Low-No BEB + charging FY2024"], totalAmount: 7_820_000, status: "payment_received", submittedDate: new Date("2025-01-15"), approvedDate: new Date("2025-02-05"), paymentDate: new Date("2025-02-22"), notes: "FY2024 drawdown — BEB procurement, charging, training, admin" },
    { awardId: AWARD_IDS.lowNo, expenseIds: ["Low-No Phase 2 H1 2025"], totalAmount: 2_800_000, status: "submitted", submittedDate: new Date("2025-06-10"), notes: "H1 FY2025 — Proterra buses + Memphis/Charlotte charging + admin" },
    { awardId: AWARD_IDS.busFacilities, expenseIds: ["H2 bus + fueling H1 2025"], totalAmount: 2_780_000, status: "payment_received", submittedDate: new Date("2025-05-15"), approvedDate: new Date("2025-06-01"), paymentDate: new Date("2025-06-18"), notes: "FCEB deposit + electrolyzer equipment + admin" },
    { awardId: AWARD_IDS.busFacilities, expenseIds: ["H2 delivery + testing"], totalAmount: 2_050_000, status: "draft", notes: "Pending — FCEB delivery milestone + performance testing + civil works" },
    { awardId: AWARD_IDS.cleanFuels, expenseIds: ["H2 corridor FY2023-2024"], totalAmount: 4_650_000, status: "payment_received", submittedDate: new Date("2024-11-15"), approvedDate: new Date("2024-12-05"), paymentDate: new Date("2024-12-20"), notes: "Stations #1-#3 + electrolyzer + monitoring + admin" },
    { awardId: AWARD_IDS.cleanFuels, expenseIds: ["H2 corridor Phase 2"], totalAmount: 1_720_000, status: "submitted", submittedDate: new Date("2025-04-10"), notes: "Stations #4-#6 + Phase 2 electrolyzer equipment" },
    { awardId: AWARD_IDS.raise, expenseIds: ["RAISE corridor FY2024"], totalAmount: 2_460_000, status: "payment_received", submittedDate: new Date("2025-02-10"), approvedDate: new Date("2025-03-01"), paymentDate: new Date("2025-03-18"), notes: "30% design + community engagement Phase 1 + admin" },
    { awardId: AWARD_IDS.raise, expenseIds: ["RAISE H1 2025"], totalAmount: 5_740_000, status: "submitted", submittedDate: new Date("2025-07-15"), notes: "60% design + station construction + community engagement + admin" },
  ];

  for (const dd of drawdowns) {
    await prisma.drawdownRequest.create({ data: dd });
  }
  console.log(`  ✓ ${drawdowns.length} drawdown requests seeded`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 10. SCHEDULED REPORTS
// ═══════════════════════════════════════════════════════════════════════════════

async function seedScheduledReports() {
  console.log("Seeding scheduled reports...");

  const reports = [
    // FTA Low-No — quarterly FFR
    { awardId: AWARD_IDS.lowNo, type: "sf425", title: "SF-425 Federal Financial Report — Q4 2024", dueDate: new Date("2025-01-30"), periodStart: new Date("2024-10-01"), periodEnd: new Date("2024-12-31"), status: "submitted", submittedDate: new Date("2025-01-28") },
    { awardId: AWARD_IDS.lowNo, type: "progress", title: "Quarterly Progress Report — Q4 2024", dueDate: new Date("2025-01-30"), periodStart: new Date("2024-10-01"), periodEnd: new Date("2024-12-31"), status: "submitted", submittedDate: new Date("2025-01-29") },
    { awardId: AWARD_IDS.lowNo, type: "sf425", title: "SF-425 Federal Financial Report — Q1 2025", dueDate: new Date("2025-04-30"), periodStart: new Date("2025-01-01"), periodEnd: new Date("2025-03-31"), status: "submitted", submittedDate: new Date("2025-04-25") },
    { awardId: AWARD_IDS.lowNo, type: "sf425", title: "SF-425 Federal Financial Report — Q2 2026", dueDate: new Date("2026-07-31"), periodStart: new Date("2026-04-01"), periodEnd: new Date("2026-06-30"), status: "in_progress", notes: "Compiling Phase 2 BEB delivery expenses" },
    { awardId: AWARD_IDS.lowNo, type: "progress", title: "Quarterly Progress Report — Q2 2026", dueDate: new Date("2026-07-31"), periodStart: new Date("2026-04-01"), periodEnd: new Date("2026-06-30"), status: "drafting", notes: "Performance data from all 4 partner agencies being compiled" },
    { awardId: AWARD_IDS.lowNo, type: "sf425", title: "SF-425 Federal Financial Report — Q3 2026", dueDate: new Date("2026-10-31"), periodStart: new Date("2026-07-01"), periodEnd: new Date("2026-09-30"), status: "upcoming" },
    // FTA 5339(b) — H2 Pilot
    { awardId: AWARD_IDS.busFacilities, type: "sf425", title: "SF-425 Federal Financial Report — Q1 2025", dueDate: new Date("2025-04-30"), periodStart: new Date("2025-01-01"), periodEnd: new Date("2025-03-31"), status: "submitted", submittedDate: new Date("2025-04-27") },
    { awardId: AWARD_IDS.busFacilities, type: "sf425", title: "SF-425 Federal Financial Report — Q2 2026", dueDate: new Date("2026-07-31"), periodStart: new Date("2026-04-01"), periodEnd: new Date("2026-06-30"), status: "in_progress", notes: "FCEB performance evaluation data being compiled" },
    { awardId: AWARD_IDS.busFacilities, type: "progress", title: "Semi-Annual Progress Report — H1 2026", dueDate: new Date("2026-07-31"), periodStart: new Date("2026-01-01"), periodEnd: new Date("2026-06-30"), status: "drafting", notes: "Hydrogen fueling station commissioning report in progress" },
    // DOE Clean Fuels — annual
    { awardId: AWARD_IDS.cleanFuels, type: "sf425", title: "SF-425 Federal Financial Report — FY2024", dueDate: new Date("2025-01-31"), periodStart: new Date("2024-01-01"), periodEnd: new Date("2024-12-31"), status: "submitted", submittedDate: new Date("2025-01-28") },
    { awardId: AWARD_IDS.cleanFuels, type: "progress", title: "Annual Technical Progress Report — FY2024", dueDate: new Date("2025-03-31"), periodStart: new Date("2024-01-01"), periodEnd: new Date("2024-12-31"), status: "submitted", submittedDate: new Date("2025-03-28") },
    { awardId: AWARD_IDS.cleanFuels, type: "sf425", title: "SF-425 Federal Financial Report — H1 2026", dueDate: new Date("2026-07-31"), periodStart: new Date("2026-01-01"), periodEnd: new Date("2026-06-30"), status: "in_progress", notes: "Stations #4-#6 commissioning expenses under review" },
    // RAISE — quarterly
    { awardId: AWARD_IDS.raise, type: "sf425", title: "SF-425 Federal Financial Report — Q4 2024", dueDate: new Date("2025-01-31"), periodStart: new Date("2024-10-01"), periodEnd: new Date("2024-12-31"), status: "submitted", submittedDate: new Date("2025-01-30") },
    { awardId: AWARD_IDS.raise, type: "progress", title: "Semi-Annual Progress Report — H2 2024", dueDate: new Date("2025-01-31"), periodStart: new Date("2024-07-01"), periodEnd: new Date("2024-12-31"), status: "submitted", submittedDate: new Date("2025-01-30") },
    { awardId: AWARD_IDS.raise, type: "sf425", title: "SF-425 Federal Financial Report — Q2 2026", dueDate: new Date("2026-07-31"), periodStart: new Date("2026-04-01"), periodEnd: new Date("2026-06-30"), status: "drafting", notes: "Station construction expenditures being compiled" },
    { awardId: AWARD_IDS.raise, type: "progress", title: "Semi-Annual Progress Report — H1 2026", dueDate: new Date("2026-07-31"), periodStart: new Date("2026-01-01"), periodEnd: new Date("2026-06-30"), status: "drafting" },
    { awardId: AWARD_IDS.raise, type: "sf425", title: "SF-425 Federal Financial Report — Q3 2026", dueDate: new Date("2026-10-31"), periodStart: new Date("2026-07-01"), periodEnd: new Date("2026-09-30"), status: "upcoming" },
    // Cross-award
    { awardId: AWARD_IDS.lowNo, type: "sefa", title: "Schedule of Expenditures of Federal Awards (SEFA) — FY2024", dueDate: new Date("2025-03-31"), periodStart: new Date("2024-01-01"), periodEnd: new Date("2024-12-31"), status: "submitted", submittedDate: new Date("2025-03-28") },
    { awardId: AWARD_IDS.lowNo, type: "single_audit", title: "Single Audit Report — FY2024", dueDate: new Date("2025-06-30"), periodStart: new Date("2024-01-01"), periodEnd: new Date("2024-12-31"), status: "submitted", submittedDate: new Date("2025-06-25") },
    { awardId: AWARD_IDS.busFacilities, type: "single_audit", title: "Single Audit Report — FY2025", dueDate: new Date("2026-06-30"), periodStart: new Date("2025-01-01"), periodEnd: new Date("2025-12-31"), status: "in_progress", notes: "External auditor (BDO USA) fieldwork scheduled for August 2026" },
  ];

  for (const report of reports) {
    await prisma.scheduledReport.create({ data: report });
  }
  console.log(`  ✓ ${reports.length} scheduled reports seeded`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 11. BUDGET MODIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

async function seedBudgetModifications() {
  console.log("Seeding budget modifications...");

  await prisma.budgetModification.create({
    data: {
      awardId: AWARD_IDS.cleanFuels,
      fromCategoryId: BUDGET_CAT_IDS.clean_admin,
      toCategoryId: BUDGET_CAT_IDS.clean_corridor,
      amount: 35_000,
      justification: "Administrative costs running under budget. Additional site preparation required at Commerce, GA station due to soil remediation needs.",
      status: "approved",
      requestedDate: new Date("2025-02-15"),
      approvedDate: new Date("2025-03-05"),
    },
  });

  await prisma.budgetModification.create({
    data: {
      awardId: AWARD_IDS.raise,
      fromCategoryId: BUDGET_CAT_IDS.raise_community,
      toCategoryId: BUDGET_CAT_IDS.raise_infra,
      amount: 120_000,
      justification: "Community engagement Phase 1 completed under budget. Additional funds needed for station ADA compliance upgrades identified during 60% design review.",
      status: "pending",
      requestedDate: new Date("2025-06-20"),
    },
  });

  console.log("  ✓ 2 budget modifications seeded");
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log("\n══════════════════════════════════════════════════════════════");
  console.log("  Seeding CTE (Center for Transportation and the Environment)");
  console.log("  Production Tables");
  console.log("══════════════════════════════════════════════════════════════\n");

  try {
    await seedPortProfile();             console.log("");
    await seedUsers();                   console.log("");
    await seedProjects();                console.log("");
    await seedDiscoveredGrants();        console.log("");
    await seedPipelineGrants();          console.log("");
    await cleanup();                     console.log("");
    await seedAwards();                  console.log("");
    await seedBudgetCategories();        console.log("");
    await seedExpenses();                console.log("");
    await seedMatchLedger();             console.log("");
    await seedDrawdowns();               console.log("");
    await seedBudgetModifications();     console.log("");
    await seedScheduledReports();

    console.log("\n══════════════════════════════════════════════════════════════");
    console.log("  ✓ CTE seed complete!");
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
