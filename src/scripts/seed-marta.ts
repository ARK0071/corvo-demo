/**
 * Seed script for MARTA (Metropolitan Atlanta Rapid Transit Authority)
 * Full profile using PRODUCTION tables.
 *
 * Run: npx tsx src/scripts/seed-marta.ts
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

const SLUG = "marta";

// ─── Deterministic UUIDs ───
const PROFILE_ID = "d4a71b00-0001-4000-8000-000000000001";

const PROJECT_IDS = {
  fivePoints:    "d4a71b00-0002-4000-8000-000000000001",
  cliftonCorridor: "d4a71b00-0002-4000-8000-000000000002",
  busFleetZE:    "d4a71b00-0002-4000-8000-000000000003",
  railCarReplace: "d4a71b00-0002-4000-8000-000000000004",
  stationADA:    "d4a71b00-0002-4000-8000-000000000005",
  arteryBRT:     "d4a71b00-0002-4000-8000-000000000006",
  fareSystem:    "d4a71b00-0002-4000-8000-000000000007",
  avondaleMaint: "d4a71b00-0002-4000-8000-000000000008",
  campbelltonRd: "d4a71b00-0002-4000-8000-000000000009",
  transitSignal: "d4a71b00-0002-4000-8000-00000000000a",
};

const AWARD_IDS = {
  lowNo:         "d4a71b00-0003-4000-8000-000000000001",
  cig:           "d4a71b00-0003-4000-8000-000000000002",
  busFac:        "d4a71b00-0003-4000-8000-000000000003",
  raise:         "d4a71b00-0003-4000-8000-000000000004",
  tsp:           "d4a71b00-0003-4000-8000-000000000005",
  crp:           "d4a71b00-0003-4000-8000-000000000006",
};

const BUDGET_CAT_IDS = {
  lowNo_buses:        "d4a71b00-0004-4000-8000-000000000001",
  lowNo_charging:     "d4a71b00-0004-4000-8000-000000000002",
  lowNo_facility:     "d4a71b00-0004-4000-8000-000000000003",
  lowNo_admin:        "d4a71b00-0004-4000-8000-000000000004",
  cig_construction:   "d4a71b00-0004-4000-8000-000000000005",
  cig_vehicles:       "d4a71b00-0004-4000-8000-000000000006",
  cig_engineering:    "d4a71b00-0004-4000-8000-000000000007",
  cig_rightOfWay:     "d4a71b00-0004-4000-8000-000000000008",
  cig_admin:          "d4a71b00-0004-4000-8000-000000000009",
  busFac_construction: "d4a71b00-0004-4000-8000-00000000000a",
  busFac_equipment:    "d4a71b00-0004-4000-8000-00000000000b",
  busFac_engineering:  "d4a71b00-0004-4000-8000-00000000000c",
  busFac_admin:        "d4a71b00-0004-4000-8000-00000000000d",
  raise_brt:           "d4a71b00-0004-4000-8000-00000000000e",
  raise_stations:      "d4a71b00-0004-4000-8000-00000000000f",
  raise_signals:       "d4a71b00-0004-4000-8000-000000000010",
  raise_admin:         "d4a71b00-0004-4000-8000-000000000011",
  tsp_hardware:        "d4a71b00-0004-4000-8000-000000000012",
  tsp_software:        "d4a71b00-0004-4000-8000-000000000013",
  tsp_admin:           "d4a71b00-0004-4000-8000-000000000014",
  crp_shelters:        "d4a71b00-0004-4000-8000-000000000015",
  crp_ped:             "d4a71b00-0004-4000-8000-000000000016",
  crp_admin:           "d4a71b00-0004-4000-8000-000000000017",
};

const GRANT_IDS = {
  lowNo2027:     "FTA-2027-003-TPM-MARTA",
  allStations:   "FTA-2027-008-TFM-MARTA",
  busRapid2027:  "FTA-2027-CIG-MARTA",
  crisi2027:     "FRA-CRISI-2027-MARTA",
  mega2027:      "USDOT-MEGA-FY2027-MARTA",
};

// ═══════════════════════════════════════════════════════════════════════════════
// CLEANUP
// ═══════════════════════════════════════════════════════════════════════════════

async function cleanup() {
  console.log("Cleaning up prior MARTA data...");

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

  // Delete pipeline grants and discovered grants
  for (const grantId of Object.values(GRANT_IDS)) {
    try {
      await prisma.pipelineGrant.deleteMany({ where: { grantId } });
      await prisma.discoveredGrant.deleteMany({ where: { id: grantId } });
    } catch {
      // May not exist
    }
  }

  try {
    await prisma.$executeRawUnsafe(`DELETE FROM port_profiles WHERE id = $1`, PROFILE_ID);
  } catch {
    // May not exist
  }

  try {
    await prisma.$executeRawUnsafe(`DELETE FROM users WHERE port_id = $1`, "marta");
  } catch {
    // Ignore
  }

  console.log("  ✓ Cleanup complete");
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. PORT PROFILE
// ═══════════════════════════════════════════════════════════════════════════════

async function seedPortProfile() {
  console.log("Seeding MARTA profile (production table)...");

  await prisma.portProfile.upsert({
    where: { id: PROFILE_ID },
    create: {
      id: PROFILE_ID,
      slug: SLUG,
      name: "Metropolitan Atlanta Rapid Transit Authority (MARTA)",
      entityType: "Regional transit authority",
      classification: "Public Transit Agency",
      location: { city: "Atlanta", state: "Georgia", stateCode: "GA", county: "Fulton County", region: "Southeast" },
      characteristics: { cargoTypes: ["Heavy Rail", "Bus", "Paratransit", "Streetcar", "Bus Rapid Transit"], employeeCount: 4800, operatingBudget: 970_000_000 },
      priorities: [
        "Zero-emission bus fleet transition",
        "Heavy rail modernization and expansion",
        "Bus rapid transit network buildout",
        "ADA accessibility station upgrades",
        "Transit-oriented development",
        "State of good repair",
        "Fare system modernization",
        "Workforce development and retention",
      ],
      capabilities: [
        "Heavy rail rapid transit operations (48 miles, 38 stations)",
        "Fixed-route bus operations (110+ routes)",
        "Paratransit and mobility services",
        "Streetcar operations (Atlanta Streetcar)",
        "Real-time passenger information systems",
        "Transit police and security",
        "Multimodal transfer facilities",
      ],
      needs: [
        "Battery-electric bus procurement and charging infrastructure",
        "Rail car replacement (CQ310/CQ312 fleet)",
        "Station elevator and escalator rehabilitation",
        "BRT corridor construction (Clifton Corridor, Campbellton Road)",
        "Maintenance facility electrification",
        "Fare collection system replacement (Breeze Next-Gen)",
        "Transit signal priority deployment",
        "Platform edge safety improvements",
      ],
      certifications: [
        "FTA Triennial Review compliant",
        "National Transit Database (NTD) reporting compliant",
        "ADA Paratransit Certification",
        "ISO 14001 Environmental Management System",
        "APTA Safety Management Systems (SMS) certified",
      ],
      environmentalGoals: [
        "Transition 100% of bus fleet to zero-emission by 2035",
        "Reduce fleet GHG emissions 50% by 2030 (2019 baseline)",
        "Install solar canopies at 15 park-and-ride facilities by 2028",
        "Achieve carbon-neutral operations by 2040",
        "Convert all maintenance facilities to electric-ready by 2030",
      ],
      communityImpact: [
        "Transit access for 420,000 average weekday riders across metro Atlanta",
        "75% of routes serve environmental justice communities",
        "Workforce training partnerships with Atlanta Technical College and Georgia State University",
        "Half-Fare program serving 85,000 seniors and persons with disabilities",
        "MARTA Army workforce pipeline — 500+ annual placements from underserved communities",
      ],
      fundingDomains: [
        { id: "TD1", name: "Bus Fleet Electrification & Zero-Emission Transition" },
        { id: "TD2", name: "Heavy Rail Modernization & Expansion" },
        { id: "TD3", name: "Bus Rapid Transit (BRT) Corridors" },
        { id: "TD4", name: "Station Accessibility & ADA Upgrades" },
        { id: "TD5", name: "Transit-Oriented Development" },
        { id: "TD6", name: "Fare System & Technology Modernization" },
        { id: "TD7", name: "Maintenance Facility Infrastructure" },
        { id: "TD8", name: "Transit Workforce Development" },
        { id: "TD9", name: "Climate Resilience & Sustainability" },
      ],
      legalName: "Metropolitan Atlanta Rapid Transit Authority",
      uei: "MARTA987654321",
      ein: "58-1289560",
      locationData: { address: "2424 Piedmont Road NE", city: "Atlanta", state: "GA", zip: "30324", congressionalDistrict: "GA-05", latitude: 33.8176, longitude: -84.3647 },
      leadership: { executiveDirector: "Collie Greenwood", cfo: "Kevin Hurley", boardChair: "Roderick Frierson" },
      financials: { annualRevenue: 850_000_000, operatingBudget: 970_000_000, capitalBudget: 2_700_000_000, bondRating: "A (S&P) / A1 (Moody's)", matchFundingCapacity: 500_000_000, totalAssets: 8_200_000_000 },
      infrastructure: {
        terminalFacilities: [
          "Five Points Station — Multimodal hub, 2 rail lines converge, 12 bus bays",
          "Avondale Maintenance Facility — Heavy rail overhaul and inspection, 60 acres",
          "Perry Boulevard Bus Operations — 200-bus capacity, CNG and electric charging",
          "Laredo Drive Bus Operations — 150-bus capacity, diesel and electric transition",
          "Hamilton E. Holmes Rail Yard — West line storage and maintenance",
        ],
        channelDepth: 0, channelWidth: 0, berths: 0,
        railConnections: [
          "Red Line — North Springs to Airport, 25.2 miles, 19 stations",
          "Gold Line — Doraville to Airport, 23.1 miles, 18 stations",
          "Blue Line — Hamilton E. Holmes to Indian Creek, 18.4 miles, 15 stations",
          "Green Line — Bankhead to Edgewood/Candler Park, 8.7 miles, 8 stations",
          "Atlanta Streetcar — Centennial Olympic Park to King Historic District, 2.7 miles",
        ],
        acreage: 850,
      },
      operations: {
        annualTonnage: 0,
        annualTEUs: 0,
        vesselCalls: 0,
        employeeCount: 4800,
        directJobs: 4800,
        cargoTypes: [
          "Heavy rail rapid transit (152M annual unlinked passenger trips)",
          "Fixed-route bus (46M annual unlinked passenger trips)",
          "Paratransit / Mobility (2.1M annual trips)",
          "Atlanta Streetcar (0.4M annual trips)",
        ],
      },
      economicImpact: { regionalEconomicImpact: 4_600_000_000, directJobs: 4_800, totalJobs: 45_000, tradeValue: 0, annualTaxRevenue: 380_000_000 },
      pastGrantAwards: [
        { program: "Low-No", awardYear: 2023, awardAmount: 26_900_000, projectName: "Battery-Electric Bus Deployment Phase 1 — 25 BEBs and Charging Infrastructure", agency: "FTA", status: "In progress" },
        { program: "CIG New Starts", awardYear: 2020, awardAmount: 307_000_000, projectName: "Five Points Station Transformation (Design Phase)", agency: "FTA", status: "In progress" },
        { program: "Bus and Bus Facilities 5339(b)", awardYear: 2022, awardAmount: 18_500_000, projectName: "Perry Boulevard Bus Maintenance Facility Renovation", agency: "FTA", status: "Completed" },
        { program: "RAISE", awardYear: 2024, awardAmount: 22_000_000, projectName: "Campbellton Road BRT Corridor Phase 1", agency: "USDOT", status: "Active" },
        { program: "All Stations Accessibility Program", awardYear: 2023, awardAmount: 32_400_000, projectName: "ADA Station Improvements — 8 Priority Stations", agency: "FTA", status: "In progress" },
      ],
      disadvantagedCommunityData: {
        description: "22 of 38 MARTA rail stations are located in census tracts designated as disadvantaged under CEJST. The service area includes historically underserved communities in South Atlanta, West End, and East Point with elevated environmental burden and below-median income levels.",
        povertyRate: 21.3,
        pm25Percentile: 74,
        justiceFortyTracker: true,
        censusTract: "13121-0060, 13121-0080, 13121-0095, 13089-0301, 13063-0403",
      },
      climateResilienceData: {
        floodZone: "Partial AE/X — 6 stations in 100-year floodplain along Proctor Creek and South River corridors",
        hurricaneExposure: "Moderate — tropical storm remnants cause periodic flooding; ice storms affect overhead catenary and third-rail systems",
        emissionsBaseline: "186,000 metric tons CO2e (2019 baseline — Scope 1 and 2, primarily diesel bus fleet and purchased electricity)",
        emissionsReductionTarget: "50% reduction by 2030; carbon neutrality by 2040",
        existingMitigations: [
          "Stormwater management systems at all underground stations",
          "Backup traction power substations for rail operations",
          "Emergency operations center with redundant communications",
          "Flood barriers at West End and Bankhead stations",
        ],
        plannedMitigations: [
          "Solar canopy program at 15 park-and-ride facilities (22 MW total)",
          "Battery energy storage systems at 4 traction power substations",
          "Green infrastructure along BRT corridors — bioswales and permeable pavement",
          "Elevated electrical infrastructure at flood-vulnerable stations",
        ],
      },
    },
    update: {
      name: "Metropolitan Atlanta Rapid Transit Authority (MARTA)",
      entityType: "Regional transit authority",
      classification: "Public Transit Agency",
    },
  });

  console.log("  ✓ MARTA profile seeded");
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. PROJECTS
// ═══════════════════════════════════════════════════════════════════════════════

async function seedProjects() {
  console.log("Seeding projects...");

  const projects = [
    {
      id: PROJECT_IDS.fivePoints, portProfileId: PROFILE_ID,
      name: "Five Points Station Transformation",
      description: "Complete reconstruction of Five Points Station — MARTA's central multimodal hub where all four rail lines converge. Project includes new vertical circulation (elevators, escalators), expanded mezzanine, redesigned bus transfer facility, TOD-ready development parcels, and full ADA compliance. The $500M project is funded through FTA Capital Investment Grants (New Starts) and MARTA's More MARTA sales tax program.",
      projectType: "infrastructure", status: "construction", priority: "critical", budget: 500_000_000,
      location: "Five Points Station, Downtown Atlanta", startDate: new Date("2024-01-15"), endDate: new Date("2029-06-30"),
      focusAreas: ["Station reconstruction", "ADA accessibility", "Multimodal hub", "Transit-oriented development", "Vertical circulation"],
      notes: "FTA CIG New Starts Full Funding Grant Agreement executed Q2 2024. Phase 1 (north entrance) demolition complete.",
      fundingSource: "FTA CIG New Starts + MARTA More MARTA sales tax + City of Atlanta",
      costShareSource: "More MARTA (Fulton County 0.5% sales tax, $193M committed)",
      nepaStatus: "record_of_decision", nepaDocument: "Environmental Impact Statement (EIS)", nepaCompletionDate: new Date("2022-11-30"),
      designCompletion: 85, designPhase: "final",
      permits: [{ name: "City of Atlanta Special Administrative Permit", status: "obtained", date: "2023-09-15" }, { name: "GDOT Encroachment Permit", status: "obtained", date: "2023-11-01" }, { name: "Fulton County Stormwater Permit", status: "obtained", date: "2024-01-10" }],
      rightOfWay: "acquired", procurementApproach: "Construction Manager/General Contractor (CM/GC) — Holder-Brasfield & Gorrie JV",
      constructionStartTarget: new Date("2024-01-15"), shovelReady: true,
      priorFederalAwards: [{ program: "CIG New Starts", amount: 307_000_000, year: 2020, status: "active" }],
      auditFindings: "none", onTimeCompletion: 92, jobsCreated: 2200, jobsRetained: 4800,
      emissionsReduction: "Station energy consumption reduced 35% through LED lighting, smart HVAC, and solar integration",
      safetyImpact: "Eliminates 12 ADA deficiencies; new platform edge detection and emergency ventilation systems",
      economicImpact: "$2.8B estimated TOD development enabled around Five Points Station over 15 years",
      communitiesBenefited: "Metro Atlanta (pop. 6.1M), especially Downtown, West End, South Atlanta, and Decatur communities",
    },
    {
      id: PROJECT_IDS.cliftonCorridor, portProfileId: PROFILE_ID,
      name: "Clifton Corridor Light Rail Transit",
      description: "New 7.6-mile light rail transit line connecting Lindbergh Center Station to Emory University, CDC, and the VA Medical Center in Avondale Estates. Includes 8 new stations and a vehicle maintenance facility. The corridor serves 135,000 daily trips and is MARTA's top expansion priority.",
      projectType: "expansion", status: "design", priority: "critical", budget: 2_600_000_000,
      location: "Lindbergh Center to Avondale Estates", startDate: new Date("2025-06-01"), endDate: new Date("2032-12-31"),
      focusAreas: ["Light rail expansion", "Healthcare corridor access", "University transit", "Congestion relief", "TOD"],
      fundingSource: "FTA CIG New Starts (applied) + More MARTA + DeKalb County T-SPLOST",
      costShareSource: "More MARTA (Fulton County) $520M + DeKalb T-SPLOST $340M + Emory/CDC partnership $150M",
      nepaStatus: "ea_in_progress", nepaDocument: "Environmental Assessment (EA)", nepaCompletionDate: new Date("2026-06-30"),
      designCompletion: 30, designPhase: "preliminary",
      permits: [{ name: "GDOT ROW Coordination Agreement", status: "pending" }, { name: "DeKalb County Land Disturbance Permit", status: "pending" }],
      rightOfWay: "partial_acquisition", procurementApproach: "Design-build, competitive RFP planned Q4 2027",
      constructionStartTarget: new Date("2028-01-01"), shovelReady: false,
      priorFederalAwards: [], auditFindings: "none", jobsCreated: 5500, jobsRetained: 1200,
      emissionsReduction: "Projected 22,000 tons CO2e/year reduction through mode shift from single-occupancy vehicles",
      economicImpact: "$4.2B projected TOD economic development along corridor",
      communitiesBenefited: "Emory/CDC campus (30,000 employees), North Druid Hills, Decatur, Avondale Estates",
    },
    {
      id: PROJECT_IDS.busFleetZE, portProfileId: PROFILE_ID,
      name: "Zero-Emission Bus Fleet Transition Program",
      description: "Phased procurement and deployment of 300+ battery-electric buses (BEBs) to replace the aging diesel fleet, along with depot and on-route charging infrastructure at Perry Boulevard and Laredo Drive facilities.",
      projectType: "equipment", status: "procurement", priority: "critical", budget: 450_000_000,
      location: "System-wide", startDate: new Date("2023-09-01"), endDate: new Date("2035-12-31"),
      focusAreas: ["Zero-emission buses", "Charging infrastructure", "Fleet electrification", "Air quality", "Environmental justice"],
      nepaStatus: "categorical_exclusion", nepaDocument: "Categorical Exclusion (CE)",
      designCompletion: 75, designPhase: "preliminary",
      permits: [{ name: "Georgia Power interconnection agreement", status: "obtained", date: "2024-06-15" }, { name: "Fulton County building permit (Perry Blvd charging depot)", status: "obtained", date: "2024-09-01" }],
      rightOfWay: "not_needed", shovelReady: true,
      priorFederalAwards: [{ program: "Low-No FY2023", amount: 26_900_000, year: 2023, status: "active" }],
      auditFindings: "none", jobsCreated: 150, jobsRetained: 800,
      emissionsReduction: "Full fleet transition eliminates 78,000 tons CO2e/year and 98% of bus-related NOx and PM2.5",
      communitiesBenefited: "Environmental justice communities along 75% of bus routes — South Atlanta, West End, East Point, College Park",
    },
    {
      id: PROJECT_IDS.railCarReplace, portProfileId: PROFILE_ID,
      name: "Rail Car Replacement Program (CQ400 Series)",
      description: "Procurement of 254 new heavy rail cars (CQ400 series) to replace the aging CQ310/CQ312 fleet, which has exceeded its 30-year useful life. New cars include open gangways, improved ADA features, real-time passenger info, and regenerative braking.",
      projectType: "equipment", status: "procurement", priority: "high", budget: 620_000_000,
      location: "System-wide rail operations", startDate: new Date("2024-06-01"), endDate: new Date("2030-12-31"),
      focusAreas: ["Rail car replacement", "State of good repair", "ADA compliance", "Passenger experience", "Energy efficiency"],
      notes: "Contract awarded to Stadler US, first prototype delivery expected Q3 2026. Buy America compliant — assembly in Salt Lake City, UT.",
      permits: [], priorFederalAwards: [], auditFindings: "none", jobsCreated: 80, jobsRetained: 450,
      emissionsReduction: "Regenerative braking reduces traction power consumption by 25%, saving 12,000 MWh/year",
      communitiesBenefited: "All 38 rail stations across Fulton, DeKalb, and Clayton counties",
    },
    {
      id: PROJECT_IDS.stationADA, portProfileId: PROFILE_ID,
      name: "ADA Station Accessibility Program (All Stations)",
      description: "Comprehensive ADA improvements at 18 priority stations including elevator replacements, escalator rehabilitation, tactile wayfinding, platform edge detection, and accessible fare gates.",
      projectType: "rehabilitation", status: "construction", priority: "high", budget: 148_000_000,
      location: "18 priority stations system-wide", startDate: new Date("2023-10-01"), endDate: new Date("2028-09-30"),
      focusAreas: ["ADA accessibility", "Elevator/escalator", "Wayfinding", "Station rehabilitation", "Equity"],
      priorFederalAwards: [{ program: "All Stations Accessibility Program", amount: 32_400_000, year: 2023, status: "active" }],
      permits: [], auditFindings: "none", jobsCreated: 320, jobsRetained: 200,
      communitiesBenefited: "85,000 seniors and persons with disabilities who use MARTA daily",
    },
    {
      id: PROJECT_IDS.arteryBRT, portProfileId: PROFILE_ID,
      name: "Atlanta Arterial BRT Network — Phase 1 (3 Corridors)",
      description: "Construction of three bus rapid transit corridors: Capitol Avenue/Metropolitan Parkway (8.2 mi), North Avenue (6.1 mi), and Northside Drive (7.4 mi). Includes dedicated transit lanes, level-boarding stations, and transit signal priority.",
      projectType: "expansion", status: "design", priority: "high", budget: 380_000_000,
      location: "Capitol Ave, North Ave, Northside Dr corridors", startDate: new Date("2025-01-01"), endDate: new Date("2029-06-30"),
      focusAreas: ["Bus rapid transit", "Dedicated transit lanes", "Station construction", "Transit signal priority", "Equity"],
      nepaStatus: "ea_in_progress", nepaDocument: "Environmental Assessment (EA)",
      designCompletion: 45, designPhase: "preliminary",
      permits: [{ name: "City of Atlanta ROW Encroachment Permits", status: "pending" }],
      rightOfWay: "partial_acquisition",
      priorFederalAwards: [], auditFindings: "none", jobsCreated: 1800, jobsRetained: 300,
      emissionsReduction: "Projected 8,500 tons CO2e/year reduction through mode shift and BEB-only BRT operations",
      communitiesBenefited: "South Atlanta, West End, Vine City, English Avenue — historically underserved communities",
    },
    {
      id: PROJECT_IDS.fareSystem, portProfileId: PROFILE_ID,
      name: "Breeze 2.0 Fare Modernization",
      description: "Replacement of the legacy Breeze Card fare collection system with open-loop contactless payment (credit/debit tap), mobile ticketing, and account-based fare capping to ensure low-income riders receive best available fares automatically.",
      projectType: "technology", status: "procurement", priority: "medium", budget: 95_000_000,
      location: "System-wide — all stations and buses", startDate: new Date("2025-06-01"), endDate: new Date("2028-06-30"),
      focusAreas: ["Fare modernization", "Contactless payment", "Equity", "Fare capping", "Technology"],
      permits: [], priorFederalAwards: [], auditFindings: "none", jobsCreated: 40, jobsRetained: 60,
      communitiesBenefited: "All MARTA riders — fare capping projected to save low-income riders $180/year on average",
    },
    {
      id: PROJECT_IDS.avondaleMaint, portProfileId: PROFILE_ID,
      name: "Avondale Rail Maintenance Facility Modernization",
      description: "Major renovation of the 45-year-old Avondale heavy rail maintenance facility including new wheel truing machine, upgraded overhead cranes, expanded vehicle storage, and electrical infrastructure for CQ400 series compatibility.",
      projectType: "rehabilitation", status: "construction", priority: "high", budget: 85_000_000,
      location: "Avondale Maintenance Facility, Decatur", startDate: new Date("2024-03-01"), endDate: new Date("2027-03-31"),
      focusAreas: ["Maintenance facility", "State of good repair", "Rail infrastructure", "Workforce safety"],
      permits: [{ name: "DeKalb County Building Permit", status: "obtained", date: "2024-02-15" }],
      priorFederalAwards: [], auditFindings: "none", jobsCreated: 85, jobsRetained: 320,
      communitiesBenefited: "320 maintenance workers; improved rail reliability for all 200,000+ daily rail riders",
    },
    {
      id: PROJECT_IDS.campbelltonRd, portProfileId: PROFILE_ID,
      name: "Campbellton Road BRT Corridor",
      description: "New 8-mile BRT corridor from Oakland City Station to Greenbriar Mall and Camp Creek Marketplace. Includes 14 stations, dedicated guideway, and park-and-ride at Greenbriar. FTA Small Starts evaluation in progress.",
      projectType: "expansion", status: "design", priority: "high", budget: 275_000_000,
      location: "Oakland City Station to Camp Creek Marketplace", startDate: new Date("2025-03-01"), endDate: new Date("2029-12-31"),
      focusAreas: ["Bus rapid transit", "Environmental justice", "Community connectivity", "Economic development"],
      nepaStatus: "ea_in_progress", nepaDocument: "Environmental Assessment (EA)",
      designCompletion: 35, designPhase: "preliminary",
      permits: [], priorFederalAwards: [{ program: "RAISE", amount: 22_000_000, year: 2024, status: "active" }],
      auditFindings: "none", jobsCreated: 1200, jobsRetained: 180,
      emissionsReduction: "Projected 4,800 tons CO2e/year reduction",
      communitiesBenefited: "Southwest Atlanta — 94% of corridor census tracts qualify as disadvantaged under CEJST",
    },
    {
      id: PROJECT_IDS.transitSignal, portProfileId: PROFILE_ID,
      name: "Transit Signal Priority (TSP) Deployment — Phase 2",
      description: "Expansion of transit signal priority to 180 additional intersections across high-ridership bus corridors, reducing bus travel times by an estimated 12-18%.",
      projectType: "technology", status: "construction", priority: "medium", budget: 18_000_000,
      location: "180 intersections system-wide", startDate: new Date("2025-01-01"), endDate: new Date("2026-12-31"),
      focusAreas: ["Transit signal priority", "Bus speed and reliability", "ITS", "Operations"],
      permits: [{ name: "City of Atlanta Traffic Signal Agreement", status: "obtained", date: "2024-11-15" }],
      priorFederalAwards: [], auditFindings: "none", jobsCreated: 25, jobsRetained: 40,
      communitiesBenefited: "Bus riders on 35 high-frequency routes — estimated 4.2 million annual hours saved",
    },
  ];

  for (const project of projects) {
    await prisma.project.create({ data: project });
    console.log(`  Created: ${project.name}`);
  }
  console.log(`  ✓ ${projects.length} projects seeded`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. AWARDS
// ═══════════════════════════════════════════════════════════════════════════════

async function seedAwards() {
  console.log("Seeding awards...");

  const awards = [
    {
      id: AWARD_IDS.lowNo, portProfileId: PROFILE_ID,
      fain: "GA-2023-013-00", cfda: "20.526",
      awardingAgency: "U.S. Department of Transportation / Federal Transit Administration",
      program: "Low-No Emission Vehicle Program", title: "Battery-Electric Bus Deployment Phase 1",
      description: "Procurement and deployment of 25 battery-electric buses (BEBs) and depot charging infrastructure at Perry Boulevard Bus Operations Facility. Includes workforce training for electric bus maintenance technicians.",
      totalAmount: 26_900_000,
      performancePeriodStart: new Date("2023-09-01"), performancePeriodEnd: new Date("2027-08-31"),
      matchPercentage: 15, matchTypes: ["cash"], matchCommitted: 4_035_000, matchRequired: 4_747_059,
      status: "active", projectIds: [PROJECT_IDS.busFleetZE],
      indirectCostRate: 0.1250, indirectCostBase: "mtdc", indirectCostType: "provisional",
      indirectCostPeriodStart: new Date("2023-01-01"), indirectCostPeriodEnd: new Date("2025-12-31"),
    },
    {
      id: AWARD_IDS.cig, portProfileId: PROFILE_ID,
      fain: "GA-2020-003-00", cfda: "20.500",
      awardingAgency: "U.S. Department of Transportation / Federal Transit Administration",
      program: "CIG New Starts", title: "Five Points Station Transformation",
      description: "Full Funding Grant Agreement for the reconstruction of Five Points Station, MARTA's central multimodal hub. Includes new vertical circulation, expanded mezzanine, ADA improvements, and TOD-ready infrastructure.",
      totalAmount: 307_000_000,
      performancePeriodStart: new Date("2024-01-15"), performancePeriodEnd: new Date("2029-06-30"),
      matchPercentage: 40, matchTypes: ["cash", "in_kind"], matchCommitted: 152_000_000, matchRequired: 204_666_667,
      status: "active", projectIds: [PROJECT_IDS.fivePoints],
    },
    {
      id: AWARD_IDS.busFac, portProfileId: PROFILE_ID,
      fain: "GA-2022-008-00", cfda: "20.526",
      awardingAgency: "U.S. Department of Transportation / Federal Transit Administration",
      program: "Bus and Bus Facilities 5339(b)", title: "Perry Boulevard Bus Maintenance Facility Renovation",
      description: "Major renovation of Perry Boulevard Bus Operations Facility including electric bus charging infrastructure, new maintenance bays, upgraded lifts and shop equipment, and stormwater management improvements.",
      totalAmount: 18_500_000,
      performancePeriodStart: new Date("2022-10-01"), performancePeriodEnd: new Date("2026-09-30"),
      matchPercentage: 20, matchTypes: ["cash"], matchCommitted: 4_625_000, matchRequired: 4_625_000,
      status: "active", projectIds: [PROJECT_IDS.avondaleMaint],
    },
    {
      id: AWARD_IDS.raise, portProfileId: PROFILE_ID,
      fain: "693JJ32450012", cfda: "20.933",
      awardingAgency: "U.S. Department of Transportation / Office of the Secretary",
      program: "RAISE", title: "Campbellton Road BRT Corridor Phase 1",
      description: "Design and initial construction of the Campbellton Road BRT corridor from Oakland City Station to Greenbriar Mall, serving environmental justice communities in southwest Atlanta.",
      totalAmount: 22_000_000,
      performancePeriodStart: new Date("2024-07-01"), performancePeriodEnd: new Date("2028-06-30"),
      matchPercentage: 20, matchTypes: ["cash", "in_kind"], matchCommitted: 4_800_000, matchRequired: 5_500_000,
      status: "active", projectIds: [PROJECT_IDS.campbelltonRd],
    },
    {
      id: AWARD_IDS.tsp, portProfileId: PROFILE_ID,
      fain: "GA-2024-TSP-002", cfda: "20.507",
      awardingAgency: "U.S. Department of Transportation / Federal Transit Administration",
      program: "FTA Urbanized Area Formula (5307)", title: "Transit Signal Priority Phase 2 Deployment",
      description: "Deployment of transit signal priority hardware and software at 180 intersections across high-ridership bus corridors to improve bus speed and reliability.",
      totalAmount: 8_400_000,
      performancePeriodStart: new Date("2025-01-01"), performancePeriodEnd: new Date("2026-12-31"),
      matchPercentage: 20, matchTypes: ["cash"], matchCommitted: 2_100_000, matchRequired: 2_100_000,
      status: "active", projectIds: [PROJECT_IDS.transitSignal],
    },
    {
      id: AWARD_IDS.crp, portProfileId: PROFILE_ID,
      fain: "GA-CRP-2024-0015", cfda: "20.205",
      awardingAgency: "Georgia Department of Transportation (GDOT) / FHWA pass-through",
      program: "Carbon Reduction Program", title: "Transit Stop Enhancements & Pedestrian Access",
      description: "Upgrades to 45 bus shelters with solar lighting and real-time arrival signs, plus pedestrian safety improvements at 22 station-area crosswalks to encourage transit mode shift.",
      totalAmount: 5_200_000,
      performancePeriodStart: new Date("2024-04-01"), performancePeriodEnd: new Date("2026-03-31"),
      matchPercentage: 20, matchTypes: ["cash"], matchCommitted: 1_300_000, matchRequired: 1_300_000,
      status: "active", projectIds: [PROJECT_IDS.transitSignal],
    },
  ];

  for (const award of awards) {
    await prisma.award.create({ data: award });
    console.log(`  Created: ${award.program} — ${award.title.slice(0, 50)}... ($${(Number(award.totalAmount) / 1_000_000).toFixed(1)}M)`);
  }
  console.log(`  ✓ ${awards.length} awards seeded`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. BUDGET CATEGORIES
// ═══════════════════════════════════════════════════════════════════════════════

async function seedBudgetCategories() {
  console.log("Seeding budget categories...");

  const cats = [
    // Low-No
    { id: BUDGET_CAT_IDS.lowNo_buses, awardId: AWARD_IDS.lowNo, name: "Battery-Electric Bus Procurement (25 units)", ceiling: 18_750_000, spent: 11_250_000 },
    { id: BUDGET_CAT_IDS.lowNo_charging, awardId: AWARD_IDS.lowNo, name: "Depot Charging Infrastructure", ceiling: 5_100_000, spent: 3_570_000 },
    { id: BUDGET_CAT_IDS.lowNo_facility, awardId: AWARD_IDS.lowNo, name: "Facility Electrical Upgrades", ceiling: 1_850_000, spent: 1_480_000 },
    { id: BUDGET_CAT_IDS.lowNo_admin, awardId: AWARD_IDS.lowNo, name: "Project Management & Training", ceiling: 1_200_000, spent: 720_000 },
    // CIG
    { id: BUDGET_CAT_IDS.cig_construction, awardId: AWARD_IDS.cig, name: "Station Construction & Structural", ceiling: 195_000_000, spent: 58_500_000 },
    { id: BUDGET_CAT_IDS.cig_vehicles, awardId: AWARD_IDS.cig, name: "Vertical Circulation Equipment", ceiling: 42_000_000, spent: 12_600_000 },
    { id: BUDGET_CAT_IDS.cig_engineering, awardId: AWARD_IDS.cig, name: "Engineering & Design", ceiling: 38_000_000, spent: 30_400_000 },
    { id: BUDGET_CAT_IDS.cig_rightOfWay, awardId: AWARD_IDS.cig, name: "Right-of-Way & Utilities", ceiling: 18_000_000, spent: 14_400_000 },
    { id: BUDGET_CAT_IDS.cig_admin, awardId: AWARD_IDS.cig, name: "Project Administration", ceiling: 14_000_000, spent: 7_000_000 },
    // Bus Facilities
    { id: BUDGET_CAT_IDS.busFac_construction, awardId: AWARD_IDS.busFac, name: "Facility Construction & Renovation", ceiling: 11_200_000, spent: 8_960_000 },
    { id: BUDGET_CAT_IDS.busFac_equipment, awardId: AWARD_IDS.busFac, name: "Shop Equipment & Lifts", ceiling: 4_200_000, spent: 3_360_000 },
    { id: BUDGET_CAT_IDS.busFac_engineering, awardId: AWARD_IDS.busFac, name: "Engineering & Design", ceiling: 1_800_000, spent: 1_620_000 },
    { id: BUDGET_CAT_IDS.busFac_admin, awardId: AWARD_IDS.busFac, name: "Project Administration", ceiling: 1_300_000, spent: 975_000 },
    // RAISE
    { id: BUDGET_CAT_IDS.raise_brt, awardId: AWARD_IDS.raise, name: "BRT Guideway Construction", ceiling: 13_200_000, spent: 3_960_000 },
    { id: BUDGET_CAT_IDS.raise_stations, awardId: AWARD_IDS.raise, name: "Station Construction (6 stations)", ceiling: 5_400_000, spent: 1_080_000 },
    { id: BUDGET_CAT_IDS.raise_signals, awardId: AWARD_IDS.raise, name: "Traffic Signals & TSP", ceiling: 1_800_000, spent: 540_000 },
    { id: BUDGET_CAT_IDS.raise_admin, awardId: AWARD_IDS.raise, name: "Project Administration & Outreach", ceiling: 1_600_000, spent: 640_000 },
    // TSP
    { id: BUDGET_CAT_IDS.tsp_hardware, awardId: AWARD_IDS.tsp, name: "TSP Hardware (180 intersections)", ceiling: 5_400_000, spent: 2_700_000 },
    { id: BUDGET_CAT_IDS.tsp_software, awardId: AWARD_IDS.tsp, name: "Central Software & Integration", ceiling: 2_200_000, spent: 880_000 },
    { id: BUDGET_CAT_IDS.tsp_admin, awardId: AWARD_IDS.tsp, name: "Project Management", ceiling: 800_000, spent: 320_000 },
    // CRP
    { id: BUDGET_CAT_IDS.crp_shelters, awardId: AWARD_IDS.crp, name: "Bus Shelter Upgrades (45 locations)", ceiling: 3_200_000, spent: 1_920_000 },
    { id: BUDGET_CAT_IDS.crp_ped, awardId: AWARD_IDS.crp, name: "Pedestrian Safety Improvements", ceiling: 1_400_000, spent: 700_000 },
    { id: BUDGET_CAT_IDS.crp_admin, awardId: AWARD_IDS.crp, name: "Project Administration", ceiling: 600_000, spent: 360_000 },
  ];

  for (const cat of cats) { await prisma.budgetCategory.create({ data: cat }); }
  console.log(`  ✓ ${cats.length} budget categories seeded`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. EXPENSES
// ═══════════════════════════════════════════════════════════════════════════════

async function seedExpenses() {
  console.log("Seeding expenses...");

  const expenses = [
    // Low-No
    { awardId: AWARD_IDS.lowNo, categoryId: BUDGET_CAT_IDS.lowNo_buses, date: new Date("2024-06-15"), description: "BEB procurement — 10 units delivered (New Flyer Xcelsior CHARGE NG)", vendor: "New Flyer of America", amount: 7_500_000, status: "drawn" },
    { awardId: AWARD_IDS.lowNo, categoryId: BUDGET_CAT_IDS.lowNo_buses, date: new Date("2025-03-01"), description: "BEB procurement — 5 additional units delivered", vendor: "New Flyer of America", amount: 3_750_000, status: "approved" },
    { awardId: AWARD_IDS.lowNo, categoryId: BUDGET_CAT_IDS.lowNo_charging, date: new Date("2024-08-01"), description: "Depot charger installation — 15 plug-in chargers at Perry Blvd", vendor: "ABB E-mobility", amount: 2_100_000, status: "drawn" },
    { awardId: AWARD_IDS.lowNo, categoryId: BUDGET_CAT_IDS.lowNo_charging, date: new Date("2025-02-15"), description: "Additional 10 chargers and load management system", vendor: "ABB E-mobility", amount: 1_470_000, status: "approved" },
    { awardId: AWARD_IDS.lowNo, categoryId: BUDGET_CAT_IDS.lowNo_facility, date: new Date("2024-09-15"), description: "Electrical switchgear and transformer upgrade — Perry Blvd", vendor: "Georgia Power / Pike Electric", amount: 1_480_000, status: "drawn" },
    { awardId: AWARD_IDS.lowNo, categoryId: BUDGET_CAT_IDS.lowNo_admin, date: new Date("2024-12-15"), description: "EV maintenance technician training program — Cohort 1", vendor: "Atlanta Technical College", amount: 360_000, status: "drawn" },
    { awardId: AWARD_IDS.lowNo, categoryId: BUDGET_CAT_IDS.lowNo_admin, date: new Date("2025-04-01"), description: "Q1 2025 project management and FTA reporting", vendor: "MARTA Staff", amount: 360_000, status: "approved" },

    // CIG Five Points
    { awardId: AWARD_IDS.cig, categoryId: BUDGET_CAT_IDS.cig_engineering, date: new Date("2024-06-01"), description: "100% design completion — architectural and structural", vendor: "AECOM / TVS Design JV", amount: 18_200_000, status: "drawn" },
    { awardId: AWARD_IDS.cig, categoryId: BUDGET_CAT_IDS.cig_engineering, date: new Date("2025-01-15"), description: "Construction engineering and inspection services", vendor: "AECOM", amount: 12_200_000, status: "approved" },
    { awardId: AWARD_IDS.cig, categoryId: BUDGET_CAT_IDS.cig_construction, date: new Date("2024-10-01"), description: "Phase 1 demolition and north entrance excavation", vendor: "Holder-Brasfield & Gorrie JV", amount: 28_500_000, status: "drawn" },
    { awardId: AWARD_IDS.cig, categoryId: BUDGET_CAT_IDS.cig_construction, date: new Date("2025-04-01"), description: "Structural steel and foundation work — Phase 1", vendor: "Holder-Brasfield & Gorrie JV", amount: 30_000_000, status: "approved" },
    { awardId: AWARD_IDS.cig, categoryId: BUDGET_CAT_IDS.cig_vehicles, date: new Date("2025-02-01"), description: "Elevator procurement — 8 high-speed units", vendor: "ThyssenKrupp Elevator", amount: 12_600_000, status: "approved" },
    { awardId: AWARD_IDS.cig, categoryId: BUDGET_CAT_IDS.cig_rightOfWay, date: new Date("2024-03-15"), description: "Utility relocation — Georgia Power and Atlanta Watershed", vendor: "Georgia Power / City of Atlanta", amount: 14_400_000, status: "drawn" },
    { awardId: AWARD_IDS.cig, categoryId: BUDGET_CAT_IDS.cig_admin, date: new Date("2024-12-01"), description: "FY2024 program management and FTA quarterly reporting", vendor: "MARTA CIG Program Office", amount: 3_500_000, status: "drawn" },
    { awardId: AWARD_IDS.cig, categoryId: BUDGET_CAT_IDS.cig_admin, date: new Date("2025-06-01"), description: "FY2025 H1 program management", vendor: "MARTA CIG Program Office", amount: 3_500_000, status: "logged" },

    // Bus Facilities
    { awardId: AWARD_IDS.busFac, categoryId: BUDGET_CAT_IDS.busFac_construction, date: new Date("2023-06-01"), description: "Building renovation — roof replacement and bay expansion", vendor: "Holder Construction", amount: 4_800_000, status: "drawn" },
    { awardId: AWARD_IDS.busFac, categoryId: BUDGET_CAT_IDS.busFac_construction, date: new Date("2024-03-01"), description: "Electrical and HVAC upgrades", vendor: "Holder Construction", amount: 4_160_000, status: "drawn" },
    { awardId: AWARD_IDS.busFac, categoryId: BUDGET_CAT_IDS.busFac_equipment, date: new Date("2024-06-15"), description: "Heavy-duty bus lifts and diagnostic equipment", vendor: "Stertil-Koni", amount: 3_360_000, status: "drawn" },
    { awardId: AWARD_IDS.busFac, categoryId: BUDGET_CAT_IDS.busFac_engineering, date: new Date("2023-02-01"), description: "Design and construction administration", vendor: "Gresham Smith", amount: 1_620_000, status: "drawn" },
    { awardId: AWARD_IDS.busFac, categoryId: BUDGET_CAT_IDS.busFac_admin, date: new Date("2024-09-01"), description: "Project management and FTA reporting", vendor: "MARTA Staff", amount: 975_000, status: "drawn" },

    // RAISE
    { awardId: AWARD_IDS.raise, categoryId: BUDGET_CAT_IDS.raise_brt, date: new Date("2025-03-01"), description: "Corridor grading and utility relocation — Phase 1", vendor: "C.W. Matthews Contracting", amount: 2_400_000, status: "approved" },
    { awardId: AWARD_IDS.raise, categoryId: BUDGET_CAT_IDS.raise_brt, date: new Date("2025-06-01"), description: "Dedicated guideway paving — Oakland City to Greenbriar", vendor: "C.W. Matthews Contracting", amount: 1_560_000, status: "logged" },
    { awardId: AWARD_IDS.raise, categoryId: BUDGET_CAT_IDS.raise_stations, date: new Date("2025-05-01"), description: "Station platform and shelter construction — 3 stations", vendor: "New South Construction", amount: 1_080_000, status: "logged" },
    { awardId: AWARD_IDS.raise, categoryId: BUDGET_CAT_IDS.raise_signals, date: new Date("2025-04-01"), description: "TSP equipment at 12 Campbellton Rd intersections", vendor: "Applied Information Inc", amount: 540_000, status: "approved" },
    { awardId: AWARD_IDS.raise, categoryId: BUDGET_CAT_IDS.raise_admin, date: new Date("2025-01-15"), description: "Community outreach and project administration", vendor: "MARTA Planning / Purpose Built Communities", amount: 640_000, status: "approved" },

    // TSP
    { awardId: AWARD_IDS.tsp, categoryId: BUDGET_CAT_IDS.tsp_hardware, date: new Date("2025-06-01"), description: "TSP controllers and antennas — 90 intersections (Phase 2a)", vendor: "Applied Information Inc", amount: 2_700_000, status: "approved" },
    { awardId: AWARD_IDS.tsp, categoryId: BUDGET_CAT_IDS.tsp_software, date: new Date("2025-04-01"), description: "Central management software license and integration", vendor: "Applied Information Inc", amount: 880_000, status: "approved" },
    { awardId: AWARD_IDS.tsp, categoryId: BUDGET_CAT_IDS.tsp_admin, date: new Date("2025-03-01"), description: "Project management — Phase 2a", vendor: "MARTA ITS Division", amount: 320_000, status: "drawn" },

    // CRP
    { awardId: AWARD_IDS.crp, categoryId: BUDGET_CAT_IDS.crp_shelters, date: new Date("2024-09-01"), description: "Solar-powered shelters with real-time displays — 20 locations", vendor: "Brasco International", amount: 1_280_000, status: "drawn" },
    { awardId: AWARD_IDS.crp, categoryId: BUDGET_CAT_IDS.crp_shelters, date: new Date("2025-03-15"), description: "Additional 15 shelter installations", vendor: "Brasco International", amount: 640_000, status: "approved" },
    { awardId: AWARD_IDS.crp, categoryId: BUDGET_CAT_IDS.crp_ped, date: new Date("2025-02-01"), description: "HAWK signals and crosswalk improvements — 12 locations", vendor: "City of Atlanta / Arcadis", amount: 700_000, status: "approved" },
    { awardId: AWARD_IDS.crp, categoryId: BUDGET_CAT_IDS.crp_admin, date: new Date("2024-10-01"), description: "GDOT reporting and project management", vendor: "MARTA Staff", amount: 360_000, status: "drawn" },
  ];

  for (const exp of expenses) { await prisma.expense.create({ data: exp }); }
  console.log(`  ✓ ${expenses.length} expenses seeded`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. MATCH LEDGER
// ═══════════════════════════════════════════════════════════════════════════════

async function seedMatchLedger() {
  console.log("Seeding match ledger...");

  const entries = [
    { awardId: AWARD_IDS.lowNo, date: new Date("2023-10-01"), description: "MARTA cash match — BEB procurement Phase 1", amount: 2_000_000, type: "cash" },
    { awardId: AWARD_IDS.lowNo, date: new Date("2024-06-01"), description: "MARTA cash match — charging infrastructure", amount: 2_035_000, type: "cash" },
    { awardId: AWARD_IDS.cig, date: new Date("2024-03-01"), description: "More MARTA sales tax contribution — FY2024", amount: 65_000_000, type: "cash" },
    { awardId: AWARD_IDS.cig, date: new Date("2025-01-15"), description: "More MARTA sales tax contribution — FY2025 H1", amount: 45_000_000, type: "cash" },
    { awardId: AWARD_IDS.cig, date: new Date("2024-07-01"), description: "In-kind: MARTA real estate contribution (Five Points air rights)", amount: 42_000_000, type: "in_kind" },
    { awardId: AWARD_IDS.busFac, date: new Date("2022-11-01"), description: "MARTA capital program cash match", amount: 4_625_000, type: "cash" },
    { awardId: AWARD_IDS.raise, date: new Date("2024-08-01"), description: "MARTA cash match — BRT design", amount: 2_800_000, type: "cash" },
    { awardId: AWARD_IDS.raise, date: new Date("2025-01-01"), description: "In-kind: MARTA staff project management and community outreach", amount: 2_000_000, type: "in_kind" },
    { awardId: AWARD_IDS.tsp, date: new Date("2025-02-01"), description: "MARTA formula fund transfer — TSP local match", amount: 2_100_000, type: "cash" },
    { awardId: AWARD_IDS.crp, date: new Date("2024-05-01"), description: "MARTA cash match — shelter program", amount: 1_300_000, type: "cash" },
  ];

  for (const entry of entries) { await prisma.matchLedgerEntry.create({ data: entry }); }
  console.log(`  ✓ ${entries.length} match ledger entries seeded`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. DRAWDOWN REQUESTS
// ═══════════════════════════════════════════════════════════════════════════════

async function seedDrawdowns() {
  console.log("Seeding drawdown requests...");

  const drawdowns = [
    { awardId: AWARD_IDS.lowNo, expenseIds: ["Low-No Q2/Q3 2024"], totalAmount: 11_080_000, status: "payment_received", submittedDate: new Date("2024-10-15"), approvedDate: new Date("2024-11-05"), paymentDate: new Date("2024-11-28"), notes: "FY2024 drawdown — 10 BEBs delivered + charging infrastructure" },
    { awardId: AWARD_IDS.lowNo, expenseIds: ["Low-No Q1 2025"], totalAmount: 5_580_000, status: "submitted", submittedDate: new Date("2025-04-10"), notes: "Q1 FY2025 — 5 additional BEBs + training" },
    { awardId: AWARD_IDS.cig, expenseIds: ["CIG FY2024"], totalAmount: 61_100_000, status: "payment_received", submittedDate: new Date("2025-01-15"), approvedDate: new Date("2025-02-10"), paymentDate: new Date("2025-03-05"), notes: "FY2024 annual drawdown — engineering, demo, utility relocation" },
    { awardId: AWARD_IDS.cig, expenseIds: ["CIG Q1 2025"], totalAmount: 42_600_000, status: "submitted", submittedDate: new Date("2025-05-01"), notes: "Q1 FY2025 — structural steel, elevators, construction management" },
    { awardId: AWARD_IDS.busFac, expenseIds: ["Bus Fac all"], totalAmount: 14_915_000, status: "payment_received", submittedDate: new Date("2024-10-01"), approvedDate: new Date("2024-10-20"), paymentDate: new Date("2024-11-08"), notes: "FY2024 cumulative drawdown — facility renovation substantially complete" },
    { awardId: AWARD_IDS.raise, expenseIds: ["RAISE Q1 2025"], totalAmount: 3_040_000, status: "submitted", submittedDate: new Date("2025-04-15"), notes: "Initial construction drawdown — grading and outreach" },
    { awardId: AWARD_IDS.tsp, expenseIds: ["TSP Phase 2a"], totalAmount: 3_900_000, status: "draft", notes: "Pending final intersection counts — hardware and software" },
    { awardId: AWARD_IDS.crp, expenseIds: ["CRP FY2024-25"], totalAmount: 2_980_000, status: "submitted", submittedDate: new Date("2025-04-01"), notes: "Shelter installations and pedestrian improvements" },
  ];

  for (const dd of drawdowns) { await prisma.drawdownRequest.create({ data: dd }); }
  console.log(`  ✓ ${drawdowns.length} drawdown requests seeded`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8. BUDGET MODIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════════

async function seedBudgetModifications() {
  console.log("Seeding budget modifications...");

  await prisma.budgetModification.create({
    data: {
      awardId: AWARD_IDS.lowNo,
      fromCategoryId: BUDGET_CAT_IDS.lowNo_admin, toCategoryId: BUDGET_CAT_IDS.lowNo_charging,
      amount: 150_000,
      justification: "Training costs under budget due to in-kind partnership with Atlanta Technical College; additional charging load management hardware needed for 25-bus depot configuration.",
      status: "approved", requestedDate: new Date("2025-01-15"), approvedDate: new Date("2025-02-05"),
    },
  });

  await prisma.budgetModification.create({
    data: {
      awardId: AWARD_IDS.cig,
      fromCategoryId: BUDGET_CAT_IDS.cig_admin, toCategoryId: BUDGET_CAT_IDS.cig_construction,
      amount: 2_400_000,
      justification: "Unforeseen subsurface conditions at Five Points north entrance required additional structural shoring and dewatering during demolition phase.",
      status: "approved", requestedDate: new Date("2024-11-01"), approvedDate: new Date("2024-12-15"),
    },
  });

  console.log("  ✓ 2 budget modifications seeded");
}

// ═══════════════════════════════════════════════════════════════════════════════
// 9. SCHEDULED REPORTS
// ═══════════════════════════════════════════════════════════════════════════════

async function seedScheduledReports() {
  console.log("Seeding scheduled reports...");

  const reports = [
    // Low-No
    { awardId: AWARD_IDS.lowNo, type: "sf425", title: "SF-425 Federal Financial Report — Q4 2024", dueDate: new Date("2025-01-30"), periodStart: new Date("2024-10-01"), periodEnd: new Date("2024-12-31"), status: "submitted", submittedDate: new Date("2025-01-28") },
    { awardId: AWARD_IDS.lowNo, type: "progress", title: "Quarterly Progress Report — Q4 2024", dueDate: new Date("2025-01-30"), periodStart: new Date("2024-10-01"), periodEnd: new Date("2024-12-31"), status: "submitted", submittedDate: new Date("2025-01-29") },
    { awardId: AWARD_IDS.lowNo, type: "sf425", title: "SF-425 Federal Financial Report — Q1 2025", dueDate: new Date("2025-04-30"), periodStart: new Date("2025-01-01"), periodEnd: new Date("2025-03-31"), status: "submitted", submittedDate: new Date("2025-04-25") },
    { awardId: AWARD_IDS.lowNo, type: "sf425", title: "SF-425 Federal Financial Report — Q2 2026", dueDate: new Date("2026-10-31"), periodStart: new Date("2026-04-01"), periodEnd: new Date("2026-06-30"), status: "upcoming" },
    { awardId: AWARD_IDS.lowNo, type: "progress", title: "Quarterly Progress Report — Q2 2026", dueDate: new Date("2026-10-31"), periodStart: new Date("2026-04-01"), periodEnd: new Date("2026-06-30"), status: "upcoming" },
    { awardId: AWARD_IDS.lowNo, type: "sf270", title: "SF-270 Request for Advance or Reimbursement — Q1 2025", dueDate: new Date("2025-04-30"), periodStart: new Date("2025-01-01"), periodEnd: new Date("2025-03-31"), status: "submitted", submittedDate: new Date("2025-04-25") },
    { awardId: AWARD_IDS.lowNo, type: "sf270", title: "SF-270 Request for Advance or Reimbursement — Q2 2026", dueDate: new Date("2026-10-31"), periodStart: new Date("2026-04-01"), periodEnd: new Date("2026-06-30"), status: "upcoming" },
    { awardId: AWARD_IDS.lowNo, type: "baba", title: "BABA Compliance Report — Q4 2024", dueDate: new Date("2025-01-30"), periodStart: new Date("2024-10-01"), periodEnd: new Date("2024-12-31"), status: "submitted", submittedDate: new Date("2025-01-28") },
    { awardId: AWARD_IDS.lowNo, type: "baba", title: "BABA Compliance Report — Q2 2026", dueDate: new Date("2026-10-31"), periodStart: new Date("2026-04-01"), periodEnd: new Date("2026-06-30"), status: "drafting", notes: "Reviewing Buy America certifications for New Flyer BEB assembly (Anniston, AL plant)" },

    // CIG Five Points
    { awardId: AWARD_IDS.cig, type: "sf425", title: "SF-425 Federal Financial Report — Q4 2024", dueDate: new Date("2025-01-30"), periodStart: new Date("2024-10-01"), periodEnd: new Date("2024-12-31"), status: "submitted", submittedDate: new Date("2025-01-27") },
    { awardId: AWARD_IDS.cig, type: "sf425", title: "SF-425 Federal Financial Report — Q2 2026", dueDate: new Date("2026-10-31"), periodStart: new Date("2026-04-01"), periodEnd: new Date("2026-06-30"), status: "in_progress", notes: "Draft in review by CFO" },
    { awardId: AWARD_IDS.cig, type: "progress", title: "Quarterly Progress Report — Q2 2026", dueDate: new Date("2026-10-31"), periodStart: new Date("2026-04-01"), periodEnd: new Date("2026-06-30"), status: "in_progress" },
    { awardId: AWARD_IDS.cig, type: "sf270", title: "SF-270 Request for Advance or Reimbursement — Q4 2024", dueDate: new Date("2025-01-30"), periodStart: new Date("2024-10-01"), periodEnd: new Date("2024-12-31"), status: "submitted", submittedDate: new Date("2025-01-27") },
    { awardId: AWARD_IDS.cig, type: "sf270", title: "SF-270 Request for Advance or Reimbursement — Q2 2026", dueDate: new Date("2026-10-31"), periodStart: new Date("2026-04-01"), periodEnd: new Date("2026-06-30"), status: "drafting", notes: "Pending final Phase 1 invoicing" },
    { awardId: AWARD_IDS.cig, type: "baba", title: "BABA Compliance Report — Q4 2024", dueDate: new Date("2025-01-30"), periodStart: new Date("2024-10-01"), periodEnd: new Date("2024-12-31"), status: "submitted", submittedDate: new Date("2025-01-28") },
    { awardId: AWARD_IDS.cig, type: "baba", title: "BABA Compliance Report — Q2 2026", dueDate: new Date("2026-10-31"), periodStart: new Date("2026-04-01"), periodEnd: new Date("2026-06-30"), status: "upcoming" },

    // Bus Facilities
    { awardId: AWARD_IDS.busFac, type: "sf425", title: "SF-425 Federal Financial Report — H2 2024", dueDate: new Date("2025-01-30"), periodStart: new Date("2024-07-01"), periodEnd: new Date("2024-12-31"), status: "submitted", submittedDate: new Date("2025-01-25") },
    { awardId: AWARD_IDS.busFac, type: "sf425", title: "SF-425 Federal Financial Report — H2 2026", dueDate: new Date("2027-02-01"), periodStart: new Date("2026-07-01"), periodEnd: new Date("2026-12-31"), status: "upcoming" },
    { awardId: AWARD_IDS.busFac, type: "closeout", title: "Final Closeout Report — Perry Blvd Renovation", dueDate: new Date("2027-03-31"), periodStart: new Date("2022-10-01"), periodEnd: new Date("2026-09-30"), status: "in_progress", notes: "Compiling final as-built documentation and equipment inventory" },

    // RAISE
    { awardId: AWARD_IDS.raise, type: "sf425", title: "SF-425 Federal Financial Report — Q1 2025", dueDate: new Date("2025-04-30"), periodStart: new Date("2025-01-01"), periodEnd: new Date("2025-03-31"), status: "submitted", submittedDate: new Date("2025-04-28") },
    { awardId: AWARD_IDS.raise, type: "progress", title: "Semi-Annual Progress Report — H1 2026", dueDate: new Date("2026-10-31"), periodStart: new Date("2026-01-01"), periodEnd: new Date("2026-06-30"), status: "drafting" },
    { awardId: AWARD_IDS.raise, type: "sf270", title: "SF-270 Request for Advance or Reimbursement — Q2 2026", dueDate: new Date("2026-10-31"), periodStart: new Date("2026-04-01"), periodEnd: new Date("2026-06-30"), status: "upcoming" },
    { awardId: AWARD_IDS.raise, type: "baba", title: "BABA Compliance Report — Q1 2025", dueDate: new Date("2025-04-30"), periodStart: new Date("2025-01-01"), periodEnd: new Date("2025-03-31"), status: "submitted", submittedDate: new Date("2025-04-28") },

    // Single Audit
    { awardId: AWARD_IDS.cig, type: "sefa", title: "Schedule of Expenditures of Federal Awards (SEFA) — FY2024", dueDate: new Date("2025-03-31"), periodStart: new Date("2023-10-01"), periodEnd: new Date("2024-09-30"), status: "submitted", submittedDate: new Date("2025-03-28") },
    { awardId: AWARD_IDS.cig, type: "single_audit", title: "Single Audit Report — FY2025", dueDate: new Date("2027-09-30"), periodStart: new Date("2024-10-01"), periodEnd: new Date("2025-09-30"), status: "in_progress", notes: "Deloitte engaged — fieldwork scheduled Q3 2026" },
  ];

  for (const report of reports) { await prisma.scheduledReport.create({ data: report }); }
  console.log(`  ✓ ${reports.length} scheduled reports seeded`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 10. DISCOVERED GRANTS & PIPELINE
// ═══════════════════════════════════════════════════════════════════════════════

async function seedDiscoveredGrants() {
  console.log("Seeding discovered grants...");

  const grants = [
    {
      id: GRANT_IDS.lowNo2027,
      title: "FY 2027 Low or No Emission Vehicle Program (Low-No)",
      agency: "U.S. Department of Transportation — Federal Transit Administration",
      agencyCode: "DOT", opportunityNumber: "FTA-2027-003-TPM",
      description: "Provides funding to state and local governmental authorities for the purchase or lease of zero-emission and low-emission transit buses, including acquisition, construction, and leasing of required supporting facilities.",
      awardFloor: 2_000_000, awardCeiling: 65_000_000, totalFunding: 1_200_000_000,
      closeDate: new Date("2027-02-15"), postDate: new Date("2026-10-01"), status: "forecasted",
      applicationUrl: "https://www.transit.dot.gov/lowno", costSharing: true,
      eligibility: ["Transit agencies", "State DOTs", "Nonprofit organizations acting on behalf of transit agencies"],
      fundingCategories: ["Zero-Emission Buses", "Battery-Electric Buses", "Hydrogen Fuel Cell Buses", "Charging Infrastructure"],
      fundingInstruments: ["Grant"], alnNumbers: ["20.526"],
      contactName: "FTA Office of Program Management", contactEmail: "lowno@dot.gov",
    },
    {
      id: GRANT_IDS.allStations,
      title: "FY 2027 All Stations Accessibility Program (ASAP)",
      agency: "U.S. Department of Transportation — Federal Transit Administration",
      agencyCode: "DOT", opportunityNumber: "FTA-2027-008-TFM",
      description: "Capital funding to legacy transit agencies for ADA accessibility improvements at existing stations, including elevators, escalators, ramps, tactile wayfinding, and platform modifications.",
      awardFloor: 5_000_000, awardCeiling: 50_000_000, totalFunding: 350_000_000,
      closeDate: new Date("2027-01-31"), postDate: new Date("2026-09-15"), status: "forecasted",
      applicationUrl: "https://www.transit.dot.gov/ASAP", costSharing: true,
      eligibility: ["Transit agencies with legacy stations pre-dating ADA (1990)"],
      fundingCategories: ["ADA Accessibility", "Elevators", "Escalators", "Station Modifications"],
      fundingInstruments: ["Grant"], alnNumbers: ["20.526"],
      contactName: "FTA Office of Transit Facilities Management", contactEmail: "asap@dot.gov",
    },
    {
      id: GRANT_IDS.busRapid2027,
      title: "FY 2027 Capital Investment Grants — Small Starts (BRT)",
      agency: "U.S. Department of Transportation — Federal Transit Administration",
      agencyCode: "DOT", opportunityNumber: "FTA-2027-CIG-SS",
      description: "Capital funding for new fixed guideway, corridor-based bus rapid transit, and extension projects with total cost under $400M and federal share under $150M.",
      awardFloor: 25_000_000, awardCeiling: 150_000_000, totalFunding: 900_000_000,
      closeDate: new Date("2027-03-31"), postDate: new Date("2026-11-01"), status: "forecasted",
      applicationUrl: "https://www.transit.dot.gov/CIG", costSharing: true,
      eligibility: ["Transit agencies", "State and local governments"],
      fundingCategories: ["Bus Rapid Transit", "Fixed Guideway", "Corridor-Based Transit"],
      fundingInstruments: ["Grant"], alnNumbers: ["20.500"],
      contactName: "FTA Office of Capital Investment Programs", contactEmail: "CIG@dot.gov",
    },
    {
      id: GRANT_IDS.crisi2027,
      title: "FY 2027 Consolidated Rail Infrastructure and Safety Improvements (CRISI)",
      agency: "U.S. Department of Transportation — Federal Railroad Administration",
      agencyCode: "DOT", opportunityNumber: "FRA-CRISI-FY2027",
      description: "Funds capital investments in rail infrastructure, including transit-rail intermodal connections, grade crossing safety, and shared-use corridor improvements.",
      awardFloor: 1_000_000, awardCeiling: 50_000_000, totalFunding: 600_000_000,
      closeDate: new Date("2027-04-30"), postDate: new Date("2026-12-01"), status: "forecasted",
      applicationUrl: "https://railroads.dot.gov/CRISI", costSharing: true,
      eligibility: ["State and local governments", "Transit agencies", "Amtrak", "Rail carriers"],
      fundingCategories: ["Rail Infrastructure", "Grade Crossings", "Intermodal Connections", "Safety"],
      fundingInstruments: ["Grant"], alnNumbers: ["20.325"],
      contactName: "FRA Office of Infrastructure Investment", contactEmail: "crisi@dot.gov",
    },
    {
      id: GRANT_IDS.mega2027,
      title: "FY 2027 MEGA (National Infrastructure Project Assistance) Grants",
      agency: "U.S. Department of Transportation — Office of the Secretary",
      agencyCode: "DOT", opportunityNumber: "USDOT-MEGA-FY2027",
      description: "Supports large, complex projects that are difficult to fund through traditional programs, including multimodal transit expansion, highway-transit interchange, and regionally significant capacity improvements.",
      awardFloor: 100_000_000, awardCeiling: 500_000_000, totalFunding: 2_000_000_000,
      closeDate: new Date("2027-05-15"), postDate: new Date("2027-01-15"), status: "forecasted",
      applicationUrl: "https://www.transportation.gov/mega", costSharing: true,
      eligibility: ["State and local governments", "Transit agencies", "Metropolitan planning organizations"],
      fundingCategories: ["Multimodal", "Transit Expansion", "Highway-Transit", "Capacity"],
      fundingInstruments: ["Grant"], alnNumbers: ["20.939"],
      contactName: "MEGA Program Office", contactEmail: "MEGAgrants@dot.gov",
    },
  ];

  for (const grant of grants) {
    await prisma.discoveredGrant.create({ data: grant });
    console.log(`  Created: ${grant.title.slice(0, 60)}...`);
  }
  console.log(`  ✓ ${grants.length} discovered grants seeded`);
}

async function seedPipelineGrants() {
  console.log("Seeding pipeline grants...");

  const pipeline = [
    {
      grantId: GRANT_IDS.lowNo2027, portProfileId: PROFILE_ID,
      stage: "drafting",
      notes: "Developing application for Phase 2 — 40 additional BEBs and on-route charging at 3 BRT corridors. $38M request with 15% MARTA match.",
      overallScore: 92, eligibilityScore: 98, alignmentScore: 95, impactScore: 90, competitivenessScore: 85,
      recommendation: "strong_apply", eligibilityStatus: "eligible",
      strengths: [
        "Phase 1 completed — 25 BEBs in revenue service with 99.1% availability",
        "Perry Boulevard depot charging fully operational, proven scalable design",
        "75% of bus routes serve environmental justice communities (CEJST qualified)",
        "Established workforce training pipeline with Atlanta Technical College",
      ],
      concerns: [
        "Georgia Power grid upgrade timeline at Laredo Drive facility uncertain",
        "40-bus order is large — supply chain delivery schedule needs confirmation",
        "On-route charging technology less proven at MARTA than depot charging",
      ],
      keyRequirements: ["Fleet Transition Plan update", "Charging infrastructure deployment schedule", "Workforce development plan", "Environmental justice analysis", "15% non-federal match"],
      scoredAt: new Date("2026-11-15"), addedAt: new Date("2026-10-20"),
    },
    {
      grantId: GRANT_IDS.allStations, portProfileId: PROFILE_ID,
      stage: "drafting",
      notes: "Phase 2 application for 10 remaining stations. $28M request. Strong position given successful Phase 1 (8 stations on-time, under budget).",
      overallScore: 94, eligibilityScore: 99, alignmentScore: 97, impactScore: 92, competitivenessScore: 88,
      recommendation: "strong_apply", eligibilityStatus: "eligible",
      strengths: [
        "Phase 1 ASAP award ($32.4M) executing on-time and under budget",
        "MARTA is legacy system (opened 1979) — strong eligibility for ASAP",
        "22 of 38 stations in disadvantaged communities — clear equity case",
        "Detailed ADA Transition Plan with station-specific deficiency assessments",
      ],
      concerns: [
        "Elevator lead times remain 18-24 months — procurement timing critical",
        "2 stations require structural modifications with temporary service disruption",
      ],
      keyRequirements: ["ADA Transition Plan", "Station condition assessments", "Community engagement documentation", "20% non-federal match"],
      scoredAt: new Date("2026-10-01"), addedAt: new Date("2026-09-25"),
    },
    {
      grantId: GRANT_IDS.busRapid2027, portProfileId: PROFILE_ID,
      stage: "eligible",
      notes: "Evaluating CIG Small Starts for Campbellton Road BRT Phase 2 or Atlanta Arterial BRT corridors. RAISE-funded Phase 1 will demonstrate ridership demand.",
      overallScore: 81, eligibilityScore: 92, alignmentScore: 85, impactScore: 80, competitivenessScore: 67,
      recommendation: "strong_apply", eligibilityStatus: "eligible",
      strengths: [
        "Campbellton Road Phase 1 (RAISE-funded) will provide ridership baseline data",
        "94% of corridor census tracts qualify as disadvantaged under CEJST",
        "Strong local match from More MARTA and city of Atlanta",
        "Atlanta BeltLine + BRT integration creates compelling multimodal network",
      ],
      concerns: [
        "CIG evaluation process is lengthy — 2-3 year review cycle",
        "Ridership forecasts for Campbellton corridor need validation from Phase 1 data",
        "Environmental Assessment not yet complete for full corridor",
      ],
      keyRequirements: ["Alternatives Analysis", "Environmental review", "Ridership forecasts", "Financial plan with 40% local match", "Project management plan"],
      scoredAt: new Date("2026-11-20"), addedAt: new Date("2026-11-10"),
    },
    {
      grantId: GRANT_IDS.crisi2027, portProfileId: PROFILE_ID,
      stage: "eligible",
      notes: "Potential application for Lindbergh-Doraville corridor rail-bus intermodal improvements and 3 at-grade crossing safety upgrades.",
      overallScore: 74, eligibilityScore: 88, alignmentScore: 78, impactScore: 72, competitivenessScore: 58,
      recommendation: "consider", eligibilityStatus: "eligible",
      strengths: [
        "Rail-bus transfer improvements address documented safety and efficiency gaps",
        "3 at-grade crossings on Gold Line have documented incident history",
        "Strong intermodal connectivity story — MARTA rail + Norfolk Southern freight",
      ],
      concerns: [
        "CRISI historically favors freight rail — transit applications less competitive",
        "Intermodal improvements are relatively modest in scope",
        "Norfolk Southern coordination timeline uncertain",
      ],
      keyRequirements: ["Safety analysis for grade crossings", "Intermodal connectivity study", "20% non-federal match", "Letters of support from freight partners"],
      scoredAt: new Date("2026-12-15"), addedAt: new Date("2026-12-10"),
    },
    {
      grantId: GRANT_IDS.mega2027, portProfileId: PROFILE_ID,
      stage: "eligible",
      notes: "Evaluating for Clifton Corridor LRT — $2.6B total project cost. MEGA could provide $200-400M alongside CIG New Starts. Very competitive program.",
      overallScore: 76, eligibilityScore: 94, alignmentScore: 82, impactScore: 78, competitivenessScore: 50,
      recommendation: "consider", eligibilityStatus: "eligible",
      strengths: [
        "Clifton Corridor is nationally significant — serves CDC, Emory, VA Medical Center",
        "$2.6B project is exactly the scale MEGA targets",
        "Strong multi-source funding: More MARTA, DeKalb T-SPLOST, Emory/CDC partnership",
        "135,000 daily trips in corridor — transformative mode shift potential",
      ],
      concerns: [
        "MEGA is extremely competitive (~200 applications for ~20 awards)",
        "EA not yet complete — project readiness is a concern for FY2027 funding",
        "30% design — MEGA prefers more advanced projects",
        "Need concurrent CIG New Starts application — complex dual-track federal engagement",
      ],
      keyRequirements: ["Benefit-Cost Analysis", "Project readiness assessment", "Environmental review status", "Financial plan", "Letters of support"],
      scoredAt: new Date("2027-01-20"), addedAt: new Date("2027-01-15"),
    },
  ];

  for (const pg of pipeline) {
    await prisma.pipelineGrant.create({ data: pg });
    console.log(`  Pipeline: ${pg.stage} — ${pg.grantId}`);
  }
  console.log(`  ✓ ${pipeline.length} pipeline grants seeded`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 11. GRANT DRAFTS
// ═══════════════════════════════════════════════════════════════════════════════

async function seedGrantDrafts() {
  console.log("Seeding grant drafts...");

  const drafts = [
    {
      portProfileId: PROFILE_ID,
      grantId: GRANT_IDS.lowNo2027,
      grantProgram: "Low-No Emission Vehicle Program",
      status: "drafting",
      overallCompleteness: 45,
      sections: [
        { name: "Project Narrative", completeness: 60, content: "MARTA proposes Phase 2 of its Zero-Emission Bus Fleet Transition Program..." },
        { name: "Fleet Transition Plan", completeness: 70, content: "MARTA's Fleet Transition Plan targets full zero-emission bus conversion by 2035..." },
        { name: "Budget Narrative", completeness: 35, content: "Total project cost: $44.7M. Federal request: $38M (85%). Local match: $6.7M (15%)..." },
        { name: "Environmental Justice Analysis", completeness: 40, content: "75% of MARTA bus routes serve environmental justice communities..." },
        { name: "Workforce Development Plan", completeness: 30, content: "MARTA will expand its EV technician training partnership with Atlanta Technical College..." },
      ],
      attachmentsChecklist: [
        { name: "SF-424 Application for Federal Assistance", status: "complete" },
        { name: "Fleet Transition Plan", status: "in_progress" },
        { name: "Charging Infrastructure Plan", status: "in_progress" },
        { name: "Letters of Support", status: "not_started" },
        { name: "Environmental Justice Analysis", status: "in_progress" },
      ],
    },
    {
      portProfileId: PROFILE_ID,
      grantId: GRANT_IDS.allStations,
      grantProgram: "All Stations Accessibility Program (ASAP)",
      status: "drafting",
      overallCompleteness: 55,
      sections: [
        { name: "Project Narrative", completeness: 70, content: "MARTA requests $28M for Phase 2 ADA accessibility improvements at 10 remaining priority stations..." },
        { name: "ADA Transition Plan", completeness: 80, content: "MARTA's ADA Transition Plan identifies 47 specific deficiencies across 10 stations..." },
        { name: "Budget Narrative", completeness: 50, content: "Total project cost: $35M. Federal request: $28M (80%). Local match: $7M (20%)..." },
        { name: "Community Engagement Summary", completeness: 45, content: "MARTA conducted 12 public meetings and 4 accessibility advisory sessions..." },
        { name: "Station Condition Assessments", completeness: 40, content: "Detailed condition assessments for 10 stations completed by AECOM in Q2 2026..." },
      ],
      attachmentsChecklist: [
        { name: "SF-424 Application for Federal Assistance", status: "complete" },
        { name: "ADA Transition Plan", status: "complete" },
        { name: "Station Condition Assessments", status: "in_progress" },
        { name: "Letters of Support", status: "in_progress" },
        { name: "Title VI Compliance Documentation", status: "not_started" },
      ],
    },
  ];

  for (const draft of drafts) {
    await prisma.grantDraft.create({ data: draft });
    console.log(`  Draft: ${draft.grantProgram} (${draft.overallCompleteness}% complete)`);
  }
  console.log(`  ✓ ${drafts.length} grant drafts seeded`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 12. SUBRECIPIENTS
// ═══════════════════════════════════════════════════════════════════════════════

async function seedSubrecipients() {
  console.log("Seeding subrecipients...");

  const subrecipients = [
    {
      awardId: AWARD_IDS.lowNo,
      entityName: "Atlanta Technical College",
      uei: "ATC8765432100",
      classification: "subrecipient",
      classificationAnswers: [
        { question: "Does the entity determine who is eligible to receive federal assistance?", answer: "yes" },
        { question: "Does the entity have programmatic decision-making responsibility?", answer: "yes" },
      ],
      riskLevel: "standard",
      riskFactors: ["First-time federal subrecipient", "Strong institutional capacity"],
      monitoringIntensity: "standard",
      subawardAmount: 720_000,
      cumulativeSpend: 360_000,
      singleAuditRequired: false,
      expenseReportingMode: "line_item",
      status: "active",
    },
    {
      awardId: AWARD_IDS.raise,
      entityName: "Purpose Built Communities",
      uei: "PBC1234567890",
      classification: "subrecipient",
      classificationAnswers: [
        { question: "Does the entity determine who is eligible to receive federal assistance?", answer: "yes" },
        { question: "Does the entity have programmatic decision-making responsibility?", answer: "yes" },
      ],
      riskLevel: "standard",
      riskFactors: ["Experienced federal subrecipient", "Strong community engagement track record"],
      monitoringIntensity: "standard",
      subawardAmount: 1_200_000,
      cumulativeSpend: 480_000,
      singleAuditRequired: false,
      expenseReportingMode: "line_item",
      status: "active",
    },
    {
      awardId: AWARD_IDS.cig,
      entityName: "City of Atlanta Department of Public Works",
      uei: "COA9876543210",
      classification: "subrecipient",
      classificationAnswers: [
        { question: "Does the entity determine who is eligible to receive federal assistance?", answer: "yes" },
        { question: "Does the entity have programmatic decision-making responsibility?", answer: "yes" },
      ],
      riskLevel: "low",
      riskFactors: ["Established government entity", "Strong single audit history", "Prior FTA subrecipient experience"],
      monitoringIntensity: "standard",
      subawardAmount: 14_400_000,
      cumulativeSpend: 14_400_000,
      singleAuditRequired: true,
      expenseReportingMode: "lump_sum",
      status: "active",
    },
  ];

  for (const sub of subrecipients) {
    await prisma.subrecipient.create({ data: sub });
    console.log(`  Created: ${sub.entityName} ($${(Number(sub.subawardAmount) / 1_000_000).toFixed(1)}M)`);
  }
  console.log(`  ✓ ${subrecipients.length} subrecipients seeded`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 13. USERS
// ═══════════════════════════════════════════════════════════════════════════════

async function seedUsers() {
  console.log("Seeding users...");
  const users = [
    { email: "drafter@marta.demo", name: "Marcus Williams", title: "Grants Analyst", role: "drafter" },
    { email: "reviewer@marta.demo", name: "Sharon Mitchell", title: "Director of Grants Management", role: "reviewer" },
    { email: "cfo@marta.demo", name: "Kevin Hurley", title: "Chief Financial Officer", role: "certifying_official" },
  ];
  for (const user of users) {
    await prisma.$executeRawUnsafe(`
      INSERT INTO users (id, port_id, email, name, title, role, created_at, updated_at)
      VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, NOW(), NOW())
      ON CONFLICT (email) DO NOTHING
    `, "marta", user.email, user.name, user.title, user.role);
    console.log(`  Seeded: ${user.email}`);
  }
  console.log(`  ✓ ${users.length} users seeded`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log("\n══════════════════════════════════════════════════════════════");
  console.log("  Seeding MARTA — Production Tables");
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
    await seedDiscoveredGrants();  console.log("");
    await seedPipelineGrants();    console.log("");
    await seedGrantDrafts();       console.log("");
    await seedSubrecipients();     console.log("");
    await seedUsers();

    console.log("\n══════════════════════════════════════════════════════════════");
    console.log("  ✓ MARTA seed complete (production tables)!");
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
