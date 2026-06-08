/**
 * Seed script for Burns Engineering Transit DEMO — full profile with prepopulated mock data.
 *
 * Run: npx tsx src/scripts/seed-burns-demo.ts
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

const PORT_ID = "burns-engineering";

// ─── Deterministic UUIDs ───
const PROFILE_ID = "c27b5f13-0001-4000-8000-000000000001";

const PROJECT_IDS = {
  brtCorridor:     "c27b5f13-0002-4000-8000-000000000001",
  zeroBusFleet:    "c27b5f13-0002-4000-8000-000000000002",
  downtownCenter:  "c27b5f13-0002-4000-8000-000000000003",
  adaAccessibility:"c27b5f13-0002-4000-8000-000000000004",
  maintenanceFac:  "c27b5f13-0002-4000-8000-000000000005",
  itsSignalPri:    "c27b5f13-0002-4000-8000-000000000006",
  parkAndRide:     "c27b5f13-0002-4000-8000-000000000007",
  paratransitFleet:"c27b5f13-0002-4000-8000-000000000008",
};

const GRANT_IDS = {
  lowNo:          "FTA-LOWNO-FY2026",
  busFacilities:  "FTA-5339B-FY2026",
  asap:           "FTA-ASAP-FY2026",
  raise:          "USDOT-RAISE-FY2026-TRANSIT",
  carbonReduction:"FHWA-CRP-FY2026",
  todPlanning:    "FTA-TOD-FY2026",
};

const AWARD_IDS = {
  busFac5339:     "c27b5f13-0003-4000-8000-000000000001",
  lowNoEmission:  "c27b5f13-0003-4000-8000-000000000002",
  fdotCorridor:   "c27b5f13-0003-4000-8000-000000000003",
  ftaAdaAccess:   "c27b5f13-0003-4000-8000-000000000004",
  carbonReduction:"c27b5f13-0003-4000-8000-000000000005",
};

const BUDGET_CAT_IDS = {
  bus_vehicles:       "c27b5f13-0004-4000-8000-000000000001",
  bus_charging:       "c27b5f13-0004-4000-8000-000000000002",
  bus_training:       "c27b5f13-0004-4000-8000-000000000003",
  bus_admin:          "c27b5f13-0004-4000-8000-000000000004",
  lowno_buses:        "c27b5f13-0004-4000-8000-000000000005",
  lowno_infra:        "c27b5f13-0004-4000-8000-000000000006",
  lowno_workforce:    "c27b5f13-0004-4000-8000-000000000007",
  lowno_admin:        "c27b5f13-0004-4000-8000-000000000008",
  fdot_construction:  "c27b5f13-0004-4000-8000-000000000009",
  fdot_engineering:   "c27b5f13-0004-4000-8000-00000000000a",
  fdot_signals:       "c27b5f13-0004-4000-8000-00000000000b",
  fdot_admin:         "c27b5f13-0004-4000-8000-00000000000c",
  ada_platforms:      "c27b5f13-0004-4000-8000-00000000000d",
  ada_shelters:       "c27b5f13-0004-4000-8000-00000000000e",
  ada_wayfinding:     "c27b5f13-0004-4000-8000-00000000000f",
  ada_admin:          "c27b5f13-0004-4000-8000-000000000010",
  crp_planning:       "c27b5f13-0004-4000-8000-000000000011",
  crp_infrastructure: "c27b5f13-0004-4000-8000-000000000012",
  crp_admin:          "c27b5f13-0004-4000-8000-000000000013",
};

// ═══════════════════════════════════════════════════════════════════════════════
// 1. PORT PROFILE
// ═══════════════════════════════════════════════════════════════════════════════

async function seedPortProfile() {
  console.log("Seeding Burns Engineering transit profile...");

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
    PROFILE_ID, PORT_ID, "burns-engineering", "Burns Engineering",
    "Metropolitan transit authority", "Public Transit Agency",
    JSON.stringify({ city: "Tampa", state: "Florida", stateCode: "FL", county: "Hillsborough County", region: "Gulf Coast" }),
    JSON.stringify({ cargoTypes: ["Fixed-Route Bus", "Bus Rapid Transit", "Paratransit", "Microtransit"], employeeCount: 320, operatingBudget: 85_000_000 }),
    JSON.stringify(["Zero-emission bus fleet transition", "Bus rapid transit expansion", "ADA accessibility improvements", "Transit-oriented development", "Rider safety and security", "Workforce development", "Service equity and coverage", "Maintenance facility modernization"]),
    JSON.stringify(["Fixed-route bus operations", "Paratransit and demand-response services", "Bus rapid transit corridors", "Transit planning and ridership analysis", "Fleet maintenance and management", "Real-time passenger information systems", "ADA-compliant transit services"]),
    JSON.stringify(["Zero-emission bus procurement", "Charging infrastructure deployment", "BRT corridor expansion", "Maintenance facility electrification", "ADA station accessibility upgrades", "Intelligent transportation systems", "Transit signal priority", "Passenger facility improvements", "Fleet management technology"]),
    JSON.stringify(["FTA Triennial Review compliant", "NTD reporting compliant", "ADA Paratransit Certification", "ISO 14001 Environmental Management"]),
    JSON.stringify(["Transition 100% of bus fleet to zero-emission by 2035", "Reduce fleet diesel consumption by 50% by 2028", "Install solar canopies at 15 major transit stops", "Achieve carbon-neutral operations by 2040", "Implement green infrastructure at all maintenance facilities"]),
    JSON.stringify(["Transit access for 180,000 daily riders across 42 routes", "Environmental justice community service — 68% of routes serve EJ areas", "Workforce training partnerships with Hillsborough Community College and USF", "Low-income fare assistance program serving 12,000+ riders monthly", "ADA accessibility investments exceeding minimum federal requirements"]),
    "Burns Engineering Transit Authority d/b/a Burns Transit",
    "BURNSEXAMPLE123", "59-2800000",
    JSON.stringify({ address: "4305 E 21st Ave", city: "Tampa", state: "FL", zip: "33605", congressionalDistrict: "FL-15", latitude: 27.9654, longitude: -82.4312 }),
    JSON.stringify({ executiveDirector: "Maria Santos", cfo: "David Park", boardChair: "Kathleen Burns-Wright" }),
    JSON.stringify({ annualRevenue: 42_000_000, operatingBudget: 85_000_000, capitalBudget: 65_000_000, bondRating: "A (S&P)", matchFundingCapacity: 30_000_000, totalAssets: 280_000_000 }),
    JSON.stringify({ terminalFacilities: ["Marion Transit Center — Downtown hub, 12 bay covered terminal, 8 routes", "University Area Transit Center — 6 bays, park-and-ride (450 spaces)", "Westshore Transfer Station — 4 bays, connection to regional express", "East Tampa Operations & Maintenance Facility — 180-bus capacity, fueling, wash"], fleetSize: 185, busRoutes: 42, brtCorridors: 1, annualVehicleRevenueMiles: 12_500_000, maintenanceFacilities: 1, parkAndRideLots: 3 }),
    JSON.stringify({ annualRidership: 14_200_000, dailyRidership: 48_000, fleetSize: 185, employeeCount: 320, routeMiles: 680, paratransitTrips: 420_000, onTimePerformance: 82.4, farebox: 18_500_000 }),
    JSON.stringify({ regionalEconomicImpact: 1_200_000_000, directJobs: 320, totalJobs: 4_800, transitDependentRiders: 62_000, propertyValueImpact: 850_000_000 }),
    JSON.stringify([
      { program: "FTA 5339(b) Bus & Bus Facilities", awardYear: 2022, awardAmount: 8_500_000, projectName: "CNG Bus Replacement — 25 Low-Floor Buses", agency: "FTA", status: "Completed" },
      { program: "FTA Low-No Emission Vehicle Program", awardYear: 2023, awardAmount: 6_200_000, projectName: "Battery-Electric Bus Pilot — 10 BEB Units", agency: "FTA", status: "In progress" },
      { program: "FDOT Transit Corridor Program", awardYear: 2021, awardAmount: 4_800_000, projectName: "Fletcher Ave BRT Corridor Phase 1 — Stations and Signal Priority", agency: "FDOT", status: "Completed" },
      { program: "FTA Section 5310", awardYear: 2023, awardAmount: 1_200_000, projectName: "Enhanced Paratransit Vehicles and Technology", agency: "FTA", status: "Completed" },
    ]),
    JSON.stringify({ description: "Burns Engineering service area includes multiple census tracts qualifying as disadvantaged under CEJST and EJScreen. East Tampa, West Tampa, Sulphur Springs, and University Area neighborhoods have elevated environmental burden indicators.", povertyRate: 22.3, pm25Percentile: 71, justiceFortyTracker: true, censusTract: "12057-0018, 12057-0019, 12057-0024, 12057-0041" }),
    JSON.stringify({ floodZone: "AE/VE (coastal flood zone)", hurricaneExposure: "High — Category 3+ hurricane return period approximately 12 years. Service area impacted by Hurricane Irma (2017) and Ian (2022).", emissionsBaseline: "28,500 metric tons CO2e (2022 baseline — Scope 1 fleet emissions)", emissionsReductionTarget: "50% reduction by 2030; carbon neutrality by 2040", existingMitigations: ["Hurricane preparedness and fleet staging plan (updated annually)", "Elevated electrical at Marion Transit Center", "Backup generator at operations facility", "Flood-proofed fuel storage systems"], plannedMitigations: ["Fleet electrification — eliminate 85% of diesel emissions by 2032", "Solar + battery microgrid at East Tampa Maintenance Facility", "Elevated charging infrastructure above 500-year flood level", "Green infrastructure and bioswale installation at all transit centers"] }),
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
      id: PROJECT_IDS.brtCorridor, portId: PORT_ID, portProfileId: PROFILE_ID,
      name: "Hillsborough BRT Corridor Expansion",
      description: "Extension of bus rapid transit service along the Nebraska Ave and Dale Mabry corridors with dedicated lanes, enhanced stations, transit signal priority, and level boarding platforms.",
      projectType: "infrastructure", status: "construction", priority: "critical", budget: 120_000_000,
      location: "Nebraska Ave / Dale Mabry Corridors", startDate: new Date("2024-06-01"), endDate: new Date("2028-12-31"),
      focusAreas: ["Bus rapid transit", "Dedicated lanes", "Transit signal priority", "Station design", "Ridership growth"],
      notes: "Phase 1 (Nebraska Ave) under construction. Phase 2 (Dale Mabry) in design. FTA CIG Small Starts evaluation pending.",
      fundingSource: "FTA Capital Investment Grant + FDOT SIS + local sales tax",
      costShareSource: "Hillsborough County Transportation Surtax + Burns Engineering operating reserves",
      nepaStatus: "ea_in_progress", nepaDocument: "Environmental Assessment (EA)", nepaCompletionDate: new Date("2025-12-31"),
      designCompletion: 65, designPhase: "preliminary",
      permits: [{ name: "FDOT Access Management Permit", status: "obtained", date: "2024-03-15" }, { name: "Hillsborough County ROW Permit", status: "obtained", date: "2024-05-01" }, { name: "SWFWMD ERP", status: "pending" }],
      rightOfWay: "partial", procurementApproach: "Design-build, competitive RFP with best-value selection",
      constructionStartTarget: new Date("2024-06-01"), shovelReady: true,
      priorFederalAwards: [{ program: "FDOT Transit Corridor", amount: 4_800_000, year: 2021, status: "completed" }],
      auditFindings: "none", onTimeCompletion: 88, jobsCreated: 450, jobsRetained: 320,
      emissionsReduction: "BRT corridors projected to shift 2,800 daily auto trips to transit, reducing 3,100 tons CO2e/year",
      safetyImpact: "Dedicated lanes eliminate bus-vehicle conflicts; enhanced lighting and cameras at all stations",
      economicImpact: "$1.4B estimated regional economic impact over 20 years along BRT corridors",
      communitiesBenefited: "East Tampa, Sulphur Springs, University Area, Carrollwood — 180,000+ residents within 1/2 mile of BRT stations",
    },
    {
      id: PROJECT_IDS.zeroBusFleet, portId: PORT_ID, portProfileId: PROFILE_ID,
      name: "Zero-Emission Bus Fleet Transition — Phase 1",
      description: "Procurement of 40 battery-electric buses (BEBs), depot charging infrastructure, and workforce training for Burns Engineering's transition to a fully zero-emission fleet by 2035.",
      projectType: "equipment", status: "procurement", priority: "critical", budget: 56_000_000,
      location: "System-wide / East Tampa Maintenance Facility", startDate: new Date("2025-01-01"), endDate: new Date("2027-06-30"),
      focusAreas: ["Zero-emission vehicles", "Battery-electric buses", "Charging infrastructure", "Workforce development", "Air quality"],
      notes: "10 BEBs from FY2023 Low-No award already in service. Phase 1 adds 40 more. RFP issued for New Flyer Xcelsior CHARGE NG.",
      fundingSource: "FTA Low-No Emission + FTA 5339(b) + local match",
      costShareSource: "Burns Engineering capital reserves + Hillsborough County surtax allocation",
      nepaStatus: "categorical_exclusion", nepaDocument: "Categorical Exclusion (CE) — vehicle replacement on existing routes",
      designCompletion: 80, designPhase: "final",
      permits: [{ name: "Electrical service upgrade permit", status: "obtained", date: "2025-02-15" }, { name: "TECO interconnection agreement", status: "pending" }],
      rightOfWay: "not_needed", procurementApproach: "Competitive RFP — bus procurement + depot charging turnkey contract",
      constructionStartTarget: new Date("2025-06-01"), shovelReady: true,
      priorFederalAwards: [{ program: "FTA Low-No Emission FY2023", amount: 6_200_000, year: 2023, status: "active" }],
      auditFindings: "none",
      jobsCreated: 15, jobsRetained: 45,
      emissionsReduction: "40 BEBs replace diesel: estimated 5,600 tons CO2e/year reduction; eliminates 98% of tailpipe PM2.5 and NOx",
      safetyImpact: "Eliminates diesel particulate exposure for 48,000 daily riders and 180 operators",
      communitiesBenefited: "East Tampa, West Tampa, and Sulphur Springs environmental justice communities — 68% of routes serve EJ areas",
    },
    {
      id: PROJECT_IDS.downtownCenter, portId: PORT_ID, portProfileId: PROFILE_ID,
      name: "Marion Transit Center Modernization",
      description: "Complete renovation of the downtown Marion Transit Center including ADA-compliant platforms, real-time passenger information, climate-controlled waiting areas, and solar canopy installation.",
      projectType: "infrastructure", status: "design", priority: "high", budget: 32_000_000,
      location: "Marion Transit Center, Downtown Tampa", startDate: new Date("2025-06-01"), endDate: new Date("2028-03-31"),
      focusAreas: ["Transit center", "ADA accessibility", "Passenger experience", "Solar energy", "Urban design"],
      notes: "Architect selected. Schematic design at 30%. Community input sessions completed.",
      nepaStatus: "ea_in_progress", nepaDocument: "Environmental Assessment (EA)",
      designCompletion: 30, designPhase: "schematic",
      permits: [{ name: "City of Tampa Building Permit", status: "pending" }, { name: "Historic Preservation Review", status: "obtained", date: "2025-03-10" }],
      rightOfWay: "acquired", procurementApproach: "CM at Risk with GMP",
      constructionStartTarget: new Date("2026-06-01"), shovelReady: false,
      priorFederalAwards: [], auditFindings: "none",
      jobsCreated: 200, jobsRetained: 50,
      economicImpact: "$420M estimated economic development catalyst in downtown Tampa transit-oriented development zone",
      communitiesBenefited: "Downtown Tampa, Ybor City, Channel District — 35,000+ daily transit users",
    },
    {
      id: PROJECT_IDS.adaAccessibility, portId: PORT_ID, portProfileId: PROFILE_ID,
      name: "Systemwide ADA Station Accessibility Program",
      description: "Upgrade 85 bus stops and 3 transit centers to full ADA compliance with level boarding platforms, tactile wayfinding, audible announcements, and shelter improvements.",
      projectType: "infrastructure", status: "construction", priority: "high", budget: 18_000_000,
      location: "System-wide", startDate: new Date("2024-01-01"), endDate: new Date("2026-12-31"),
      focusAreas: ["ADA compliance", "Accessibility", "Bus stop improvements", "Wayfinding", "Shelter upgrades"],
      notes: "Phase 1 (35 stops) complete. Phase 2 (50 stops + 3 centers) underway.",
      nepaStatus: "categorical_exclusion", nepaDocument: "Categorical Exclusion (CE)",
      designCompletion: 100, designPhase: "complete",
      permits: [{ name: "FDOT ROW use permits (multiple)", status: "obtained", date: "2024-06-01" }],
      rightOfWay: "partial", procurementApproach: "Task-order contract with prequalified accessibility contractor",
      constructionStartTarget: new Date("2024-01-01"), shovelReady: true,
      priorFederalAwards: [], auditFindings: "none",
      jobsCreated: 60, jobsRetained: 15,
      communitiesBenefited: "Systemwide — benefits 4,200+ riders with disabilities and 62,000 transit-dependent riders",
    },
    {
      id: PROJECT_IDS.maintenanceFac, portId: PORT_ID, portProfileId: PROFILE_ID,
      name: "East Tampa Maintenance Facility Electrification",
      description: "Conversion of the 180-bus East Tampa Operations & Maintenance Facility from diesel/CNG to fully electric, including high-power depot charging, solar + battery microgrid, and building systems upgrades.",
      projectType: "infrastructure", status: "planning", priority: "high", budget: 45_000_000,
      location: "East Tampa Operations & Maintenance Facility", startDate: new Date("2026-01-01"), endDate: new Date("2029-06-30"),
      focusAreas: ["Facility electrification", "Depot charging", "Solar microgrid", "Battery storage", "Maintenance modernization"],
      notes: "Feasibility study complete. TECO grid capacity assessment underway. Targeting FTA 5339(b) and Low-No FY2026.",
      permits: [], priorFederalAwards: [], auditFindings: "none",
    },
    {
      id: PROJECT_IDS.itsSignalPri, portId: PORT_ID, portProfileId: PROFILE_ID,
      name: "Intelligent Transportation Systems & Transit Signal Priority",
      description: "Deployment of transit signal priority (TSP) at 120 intersections, real-time vehicle tracking, automated passenger counters, and predictive maintenance sensors across the fleet.",
      projectType: "technology", status: "procurement", priority: "medium", budget: 8_200_000,
      location: "System-wide", startDate: new Date("2025-03-01"), endDate: new Date("2026-09-30"),
      focusAreas: ["Transit signal priority", "ITS", "Real-time tracking", "Passenger counting", "Predictive maintenance"],
      notes: "TSP vendor selected. Signal controller upgrades in coordination with Hillsborough County Traffic Engineering.",
      permits: [], priorFederalAwards: [], auditFindings: "none",
    },
    {
      id: PROJECT_IDS.parkAndRide, portId: PORT_ID, portProfileId: PROFILE_ID,
      name: "Regional Park & Ride Network Expansion",
      description: "Construction of two new park-and-ride facilities at I-75/Fletcher and I-275/Bearss with express bus service connections, EV charging, and bicycle storage.",
      projectType: "infrastructure", status: "planning", priority: "medium", budget: 15_000_000,
      location: "I-75/Fletcher and I-275/Bearss", startDate: new Date("2026-06-01"),
      focusAreas: ["Park and ride", "Express bus", "EV charging", "Multimodal", "Commuter access"],
      notes: "Site acquisition negotiations in progress. Environmental screening initiated.",
      permits: [], priorFederalAwards: [], auditFindings: "none",
    },
    {
      id: PROJECT_IDS.paratransitFleet, portId: PORT_ID, portProfileId: PROFILE_ID,
      name: "Paratransit Fleet Modernization",
      description: "Replacement of 30 aging paratransit vehicles with wheelchair-accessible, low-floor cutaway buses equipped with real-time scheduling and mobile fare payment.",
      projectType: "equipment", status: "procurement", priority: "medium", budget: 12_000_000,
      location: "System-wide", startDate: new Date("2025-06-01"), endDate: new Date("2026-12-31"),
      focusAreas: ["Paratransit", "ADA vehicles", "Fleet replacement", "Scheduling technology", "Mobile fare"],
      notes: "RFP in development. FTA 5310 application submitted for partial funding.",
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
      id: GRANT_IDS.lowNo, portId: PORT_ID,
      title: "FY 2026 Low or No Emission Vehicle Program (Low-No)",
      agency: "U.S. Department of Transportation — Federal Transit Administration",
      agencyCode: "DOT", opportunityNumber: "FTA-2026-005-TPM",
      description: "Provides funding to state and local governmental authorities for the purchase or lease of zero-emission and low-emission transit buses, including acquisition, construction, and leasing of required supporting facilities such as charging infrastructure.",
      awardFloor: 2_000_000, awardCeiling: 65_000_000, totalFunding: 1_100_000_000,
      closeDate: new Date("2026-08-01"), postDate: new Date("2026-04-15"), status: "posted",
      applicationUrl: "https://www.transit.dot.gov/lowno", costSharing: true,
      eligibility: ["Transit agencies", "State departments of transportation", "Indian tribes", "Territories"],
      fundingCategories: ["Zero-Emission Buses", "Battery-Electric Buses", "Hydrogen Fuel Cell Buses", "Charging Infrastructure"],
      fundingInstruments: ["Grant"], alnNumbers: ["20.526"],
      contactName: "FTA Office of Program Management", contactEmail: "lowno@dot.gov",
    },
    {
      id: GRANT_IDS.busFacilities, portId: PORT_ID,
      title: "FY 2026 Grants for Buses and Bus Facilities Competitive Program (5339(b))",
      agency: "U.S. Department of Transportation — Federal Transit Administration",
      agencyCode: "DOT", opportunityNumber: "FTA-2026-006-TFM",
      description: "Makes federal resources available to states and direct recipients to replace, rehabilitate, and purchase buses and related equipment, and to construct bus-related facilities including technological changes or innovations to modify low or no emission vehicles or facilities.",
      awardFloor: 2_000_000, awardCeiling: 50_000_000, totalFunding: 550_000_000,
      closeDate: new Date("2026-08-01"), postDate: new Date("2026-04-15"), status: "posted",
      applicationUrl: "https://www.transit.dot.gov/bus-program", costSharing: true,
      eligibility: ["Transit agencies", "State DOTs", "Indian tribes"],
      fundingCategories: ["Bus Replacement", "Bus Facilities", "Maintenance Facilities", "Fleet Modernization"],
      fundingInstruments: ["Grant"], alnNumbers: ["20.526"],
      contactName: "FTA Office of Transit Facilities Management", contactEmail: "busprogram@dot.gov",
    },
    {
      id: GRANT_IDS.asap, portId: PORT_ID,
      title: "FY 2026 All Stations Accessibility Program (ASAP)",
      agency: "U.S. Department of Transportation — Federal Transit Administration",
      agencyCode: "DOT", opportunityNumber: "FTA-2026-009-TPE",
      description: "Provides competitive grants for legacy transit stations and bus stops to upgrade accessibility for persons with disabilities, including level boarding, elevators, tactile wayfinding, and communication systems.",
      awardFloor: 1_000_000, awardCeiling: 25_000_000, totalFunding: 350_000_000,
      closeDate: new Date("2026-09-15"), postDate: new Date("2026-05-15"), status: "posted",
      applicationUrl: "https://www.transit.dot.gov/ASAP", costSharing: true,
      eligibility: ["Transit agencies", "State DOTs"],
      fundingCategories: ["ADA Accessibility", "Station Upgrades", "Level Boarding", "Wayfinding"],
      fundingInstruments: ["Grant"], alnNumbers: ["20.529"],
      contactName: "FTA Office of Transit Programs", contactEmail: "asap@dot.gov",
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
      fundingCategories: ["Surface Transportation", "Multimodal", "Transit Capital", "Safety"],
      fundingInstruments: ["Grant"], alnNumbers: ["20.933"],
      contactName: "RAISE Program Office", contactEmail: "RAISEgrants@dot.gov",
    },
    {
      id: GRANT_IDS.carbonReduction, portId: PORT_ID,
      title: "FY 2026 Carbon Reduction Program (CRP)",
      agency: "U.S. Department of Transportation — Federal Highway Administration",
      agencyCode: "DOT", opportunityNumber: "FHWA-CRP-FY2026",
      description: "Provides funds for projects designed to reduce transportation emissions and the carbon intensity of the surface transportation system. Eligible projects include zero-emission vehicle infrastructure, transit improvements, and congestion management.",
      awardFloor: 500_000, awardCeiling: 20_000_000, totalFunding: 1_260_000_000,
      closeDate: new Date("2026-10-31"), postDate: new Date("2026-06-01"), status: "posted",
      applicationUrl: "https://www.fhwa.dot.gov/bipartisan-infrastructure-law/crp.cfm", costSharing: true,
      eligibility: ["State DOTs", "Metropolitan planning organizations", "Local governments", "Transit agencies"],
      fundingCategories: ["Carbon Reduction", "EV Infrastructure", "Transit Improvements", "Congestion Management"],
      fundingInstruments: ["Grant"], alnNumbers: ["20.205"],
      contactName: "FHWA Office of Natural Environment", contactEmail: "carbonreduction@dot.gov",
    },
    {
      id: GRANT_IDS.todPlanning, portId: PORT_ID,
      title: "FY 2026 Transit-Oriented Development Planning Pilot",
      agency: "U.S. Department of Transportation — Federal Transit Administration",
      agencyCode: "DOT", opportunityNumber: "FTA-2026-012-TPP",
      description: "Provides funding for comprehensive planning associated with an eligible transit capital project to enhance economic development, ridership, and multimodal connectivity near transit stations.",
      awardFloor: 250_000, awardCeiling: 2_000_000, totalFunding: 14_000_000,
      closeDate: new Date("2026-11-15"), postDate: new Date("2026-07-01"), status: "posted",
      applicationUrl: "https://www.transit.dot.gov/TODPilot", costSharing: true,
      eligibility: ["Transit agencies", "State DOTs", "Local governments"],
      fundingCategories: ["Transit-Oriented Development", "Station Area Planning", "Multimodal Connectivity"],
      fundingInstruments: ["Grant"], alnNumbers: ["20.500"],
      contactName: "FTA Office of Planning and Environment", contactEmail: "todpilot@dot.gov",
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
      portId: PORT_ID, grantId: GRANT_IDS.lowNo, portProfileId: PROFILE_ID,
      stage: "applied", notes: "Application submitted for 40 battery-electric buses + depot charging infrastructure. $34M request with 15% local match committed.",
      overallScore: 91, eligibilityScore: 98, alignmentScore: 95, impactScore: 88, competitivenessScore: 83,
      recommendation: "strong_apply", eligibilityStatus: "eligible",
      strengths: ["10 BEBs already in revenue service from FY2023 Low-No — demonstrated deployment capability", "68% of routes serve environmental justice communities (CEJST qualified)", "5,600 tons CO2e/year reduction quantified with EPA methodology", "Comprehensive workforce transition plan with HCC partnership"],
      concerns: ["TECO grid capacity study not yet finalized — may require utility upgrades", "40-bus procurement is ambitious for first large-scale BEB order", "Depot charging installation timeline tight for 24-month performance period"],
      keyRequirements: ["Fleet Transition Plan", "Charging infrastructure deployment schedule", "Workforce development plan", "Environmental justice analysis", "15% non-federal match"],
      scoredAt: new Date("2026-05-15"), addedAt: new Date("2026-04-20"),
    },
    {
      portId: PORT_ID, grantId: GRANT_IDS.busFacilities, portProfileId: PROFILE_ID,
      stage: "drafting", notes: "Developing application for East Tampa Maintenance Facility electrification — $28M request for depot charging, solar microgrid, and building systems.",
      overallScore: 85, eligibilityScore: 95, alignmentScore: 88, impactScore: 84, competitivenessScore: 73,
      recommendation: "strong_apply", eligibilityStatus: "eligible",
      strengths: ["Supports fleet-wide electrification — facility upgrade is prerequisite for 100% BEB by 2035", "Facility is 22 years old — clear rehabilitation need", "Solar microgrid provides resilience and operating cost savings", "Strong alignment with FTA strategic priorities"],
      concerns: ["$28M is large ask for single facility project", "Design only at 15% — lower readiness than ideal", "Utility interconnection timeline uncertainty"],
      keyRequirements: ["Facility condition assessment", "Fleet transition alignment documentation", "Utility coordination letter", "20% non-federal match"],
      scoredAt: new Date("2026-06-01"), addedAt: new Date("2026-05-10"),
    },
    {
      portId: PORT_ID, grantId: GRANT_IDS.asap, portProfileId: PROFILE_ID,
      stage: "applied", notes: "Application for $12M to upgrade 50 bus stops and 3 transit centers with level boarding, tactile wayfinding, and audible real-time info.",
      overallScore: 88, eligibilityScore: 96, alignmentScore: 92, impactScore: 86, competitivenessScore: 78,
      recommendation: "strong_apply", eligibilityStatus: "eligible",
      strengths: ["Phase 1 (35 stops) completed on time and under budget — proven track record", "4,200+ riders with disabilities directly benefit", "Exceeds ADA minimums — universal design approach", "Partnerships with local disability advocacy organizations"],
      concerns: ["50 stops in 24 months is aggressive timeline", "Some stops require ROW coordination with FDOT"],
      keyRequirements: ["ADA compliance gap analysis", "Community engagement documentation", "Station design plans", "20% non-federal match"],
      scoredAt: new Date("2026-05-20"), addedAt: new Date("2026-05-18"),
    },
    {
      portId: PORT_ID, grantId: GRANT_IDS.raise, portProfileId: PROFILE_ID,
      stage: "eligible", notes: "Evaluating for BRT Phase 2 (Dale Mabry Corridor) — $35M capital project with regional multimodal significance.",
      overallScore: 80, eligibilityScore: 92, alignmentScore: 84, impactScore: 79, competitivenessScore: 65,
      recommendation: "consider", eligibilityStatus: "eligible",
      strengths: ["Multimodal BRT project integrating transit, bicycle, and pedestrian infrastructure", "Strong BCA — 2,800 daily auto trips shifted, $1.4B 20-year economic impact", "Environmental justice community — high CEJST scores", "Hillsborough MPO endorsement letter secured"],
      concerns: ["RAISE is extremely competitive (~1,000 applications for ~100 awards)", "BRT Phase 2 still in 30% design — readiness concerns", "EA not yet complete — risk of conditional award"],
      keyRequirements: ["Benefit-Cost Analysis (BCA)", "Project readiness documentation", "20% non-federal match", "Letters of support"],
      scoredAt: new Date("2026-04-25"), addedAt: new Date("2026-04-10"),
    },
    {
      portId: PORT_ID, grantId: GRANT_IDS.carbonReduction, portProfileId: PROFILE_ID,
      stage: "eligible", notes: "Considering for EV charging corridor and TSP deployment — aligned with Hillsborough MPO Carbon Reduction Strategy.",
      overallScore: 74, eligibilityScore: 88, alignmentScore: 78, impactScore: 72, competitivenessScore: 58,
      recommendation: "apply", eligibilityStatus: "eligible",
      strengths: ["Directly reduces transportation carbon emissions", "TSP reduces bus idle time — estimated 8% fuel savings", "Aligns with state Carbon Reduction Strategy", "Complements Low-No and 5339(b) applications"],
      concerns: ["CRP funding is formula-based through state DOTs — requires FDOT support", "Smaller funding pool limits award size", "Must demonstrate quantified carbon reduction methodology"],
      keyRequirements: ["Carbon reduction quantification", "Alignment with state CRP strategy", "FDOT endorsement", "20% non-federal match"],
      scoredAt: new Date("2026-06-05"), addedAt: new Date("2026-06-01"),
    },
    {
      portId: PORT_ID, grantId: GRANT_IDS.todPlanning, portProfileId: PROFILE_ID,
      stage: "drafting", notes: "Planning grant for Marion Transit Center area TOD study — $1.2M request to support downtown revitalization and transit ridership growth.",
      overallScore: 82, eligibilityScore: 95, alignmentScore: 86, impactScore: 78, competitivenessScore: 69,
      recommendation: "apply", eligibilityStatus: "eligible",
      strengths: ["Marion Transit Center renovation creates catalyst for TOD planning", "City of Tampa committed to zoning changes supporting TOD", "Strong ridership base — 35,000+ daily users at downtown hub", "Letters of support from downtown business association and city council"],
      concerns: ["Small program — only $14M total nationally, highly competitive", "Planning grants require clear nexus to capital project", "Must coordinate with City of Tampa comprehensive plan timeline"],
      keyRequirements: ["Capital project nexus documentation", "Local government coordination letter", "Community engagement plan", "20% non-federal match"],
      scoredAt: new Date("2026-06-08"), addedAt: new Date("2026-06-05"),
    },
  ];

  for (const pg of pipeline) {
    await prisma.demoPipelineGrant.create({ data: pg });
    console.log(`  Created: ${pg.grantId} → ${pg.stage} (score: ${pg.overallScore})`);
  }
  console.log(`  ✓ ${pipeline.length} pipeline grants seeded`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. AWARDS
// ═══════════════════════════════════════════════════════════════════════════════

async function seedAwards() {
  console.log("Seeding awards...");

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
      id: AWARD_IDS.busFac5339, portId: PORT_ID, portProfileId: PROFILE_ID,
      fain: "FL-2024-028-00", cfda: "20.526",
      awardingAgency: "U.S. Department of Transportation / Federal Transit Administration",
      program: "FTA 5339(b)", title: "CNG Bus Replacement — 25 Low-Floor Transit Buses",
      description: "Replacement of 25 aging CNG buses with new low-floor, ADA-compliant transit buses to improve fleet reliability, reduce maintenance costs, and enhance passenger experience across 12 fixed routes.",
      totalAmount: 12_800_000,
      performancePeriodStart: new Date("2023-10-01"), performancePeriodEnd: new Date("2026-09-30"),
      matchPercentage: 20, matchTypes: ["cash"], matchCommitted: 2_560_000, matchRequired: 3_200_000,
      status: "active", projectIds: [PROJECT_IDS.zeroBusFleet],
      indirectCostRate: 0.1500, indirectCostBase: "mtdc", indirectCostType: "provisional",
      indirectCostPeriodStart: new Date("2023-10-01"), indirectCostPeriodEnd: new Date("2026-09-30"),
    },
    {
      id: AWARD_IDS.lowNoEmission, portId: PORT_ID, portProfileId: PROFILE_ID,
      fain: "FL-2024-056-00", cfda: "20.526",
      awardingAgency: "U.S. Department of Transportation / Federal Transit Administration",
      program: "FTA Low-No Emission", title: "Battery-Electric Bus Deployment — 10 BEB + Charging",
      description: "Procurement and deployment of 10 battery-electric buses and installation of overnight depot charging infrastructure at East Tampa Maintenance Facility. Includes operator training and maintenance workforce development.",
      totalAmount: 8_500_000,
      performancePeriodStart: new Date("2024-04-01"), performancePeriodEnd: new Date("2027-03-31"),
      matchPercentage: 15, matchTypes: ["cash"], matchCommitted: 1_275_000, matchRequired: 1_500_000,
      status: "active", projectIds: [PROJECT_IDS.zeroBusFleet],
    },
    {
      id: AWARD_IDS.fdotCorridor, portId: PORT_ID, portProfileId: PROFILE_ID,
      fain: "FDOT-FPN-44783419201", cfda: "20.507",
      awardingAgency: "Florida Department of Transportation",
      program: "FDOT Transit Corridor", title: "Nebraska Ave BRT Corridor — Phase 1 Stations & TSP",
      description: "Construction of 14 enhanced BRT stations with level boarding platforms, transit signal priority at 28 intersections, and queue jump lanes along the Nebraska Ave corridor from downtown Tampa to USF.",
      totalAmount: 6_200_000,
      performancePeriodStart: new Date("2024-01-01"), performancePeriodEnd: new Date("2026-12-31"),
      matchPercentage: 50, matchTypes: ["cash", "in_kind"], matchCommitted: 3_100_000, matchRequired: 6_200_000,
      status: "active", projectIds: [PROJECT_IDS.brtCorridor],
    },
    {
      id: AWARD_IDS.ftaAdaAccess, portId: PORT_ID, portProfileId: PROFILE_ID,
      fain: "FL-2023-041-00", cfda: "20.529",
      awardingAgency: "U.S. Department of Transportation / Federal Transit Administration",
      program: "FTA ASAP", title: "Phase 1 ADA Bus Stop Accessibility Upgrades",
      description: "Upgrade of 35 high-ridership bus stops with ADA-compliant concrete pads, level boarding platforms, tactile wayfinding strips, shelter improvements, and real-time audible passenger information displays.",
      totalAmount: 4_100_000,
      performancePeriodStart: new Date("2023-07-01"), performancePeriodEnd: new Date("2025-12-31"),
      matchPercentage: 20, matchTypes: ["cash", "in_kind"], matchCommitted: 820_000, matchRequired: 1_025_000,
      status: "active", projectIds: [PROJECT_IDS.adaAccessibility],
    },
    {
      id: AWARD_IDS.carbonReduction, portId: PORT_ID, portProfileId: PROFILE_ID,
      fain: "FHWA-CRP-FL-2024-0089", cfda: "20.205",
      awardingAgency: "Federal Highway Administration (via FDOT)",
      program: "Carbon Reduction Program", title: "Fleet Electrification Planning & Charging Design",
      description: "Comprehensive fleet electrification planning study, grid impact assessment, and charging infrastructure preliminary design for Burns Engineering's 2035 zero-emission fleet transition.",
      totalAmount: 3_200_000,
      performancePeriodStart: new Date("2024-07-01"), performancePeriodEnd: new Date("2026-06-30"),
      matchPercentage: 20, matchTypes: ["cash"], matchCommitted: 640_000, matchRequired: 800_000,
      status: "active", projectIds: [PROJECT_IDS.maintenanceFac],
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
    // FTA 5339(b) — $12.8M
    { id: BUDGET_CAT_IDS.bus_vehicles, portId: PORT_ID, awardId: AWARD_IDS.busFac5339, name: "Bus Procurement (25 units)", ceiling: 10_200_000, spent: 7_650_000 },
    { id: BUDGET_CAT_IDS.bus_charging, portId: PORT_ID, awardId: AWARD_IDS.busFac5339, name: "Fueling Infrastructure", ceiling: 1_400_000, spent: 980_000 },
    { id: BUDGET_CAT_IDS.bus_training, portId: PORT_ID, awardId: AWARD_IDS.busFac5339, name: "Operator Training", ceiling: 600_000, spent: 420_000 },
    { id: BUDGET_CAT_IDS.bus_admin, portId: PORT_ID, awardId: AWARD_IDS.busFac5339, name: "Project Administration", ceiling: 600_000, spent: 360_000 },
    // FTA Low-No — $8.5M
    { id: BUDGET_CAT_IDS.lowno_buses, portId: PORT_ID, awardId: AWARD_IDS.lowNoEmission, name: "Battery-Electric Bus Procurement (10 units)", ceiling: 6_200_000, spent: 3_100_000 },
    { id: BUDGET_CAT_IDS.lowno_infra, portId: PORT_ID, awardId: AWARD_IDS.lowNoEmission, name: "Depot Charging Infrastructure", ceiling: 1_500_000, spent: 600_000 },
    { id: BUDGET_CAT_IDS.lowno_workforce, portId: PORT_ID, awardId: AWARD_IDS.lowNoEmission, name: "Workforce Development", ceiling: 450_000, spent: 180_000 },
    { id: BUDGET_CAT_IDS.lowno_admin, portId: PORT_ID, awardId: AWARD_IDS.lowNoEmission, name: "Project Administration", ceiling: 350_000, spent: 175_000 },
    // FDOT Corridor — $6.2M
    { id: BUDGET_CAT_IDS.fdot_construction, portId: PORT_ID, awardId: AWARD_IDS.fdotCorridor, name: "Station Construction (14 stations)", ceiling: 4_000_000, spent: 2_400_000 },
    { id: BUDGET_CAT_IDS.fdot_engineering, portId: PORT_ID, awardId: AWARD_IDS.fdotCorridor, name: "Engineering & Design", ceiling: 900_000, spent: 810_000 },
    { id: BUDGET_CAT_IDS.fdot_signals, portId: PORT_ID, awardId: AWARD_IDS.fdotCorridor, name: "Transit Signal Priority (28 intersections)", ceiling: 1_000_000, spent: 400_000 },
    { id: BUDGET_CAT_IDS.fdot_admin, portId: PORT_ID, awardId: AWARD_IDS.fdotCorridor, name: "Project Administration", ceiling: 300_000, spent: 180_000 },
    // FTA ASAP — $4.1M
    { id: BUDGET_CAT_IDS.ada_platforms, portId: PORT_ID, awardId: AWARD_IDS.ftaAdaAccess, name: "Level Boarding Platforms", ceiling: 2_200_000, spent: 1_760_000 },
    { id: BUDGET_CAT_IDS.ada_shelters, portId: PORT_ID, awardId: AWARD_IDS.ftaAdaAccess, name: "Shelter Improvements", ceiling: 1_100_000, spent: 880_000 },
    { id: BUDGET_CAT_IDS.ada_wayfinding, portId: PORT_ID, awardId: AWARD_IDS.ftaAdaAccess, name: "Tactile Wayfinding & Signage", ceiling: 500_000, spent: 400_000 },
    { id: BUDGET_CAT_IDS.ada_admin, portId: PORT_ID, awardId: AWARD_IDS.ftaAdaAccess, name: "Project Administration", ceiling: 300_000, spent: 225_000 },
    // Carbon Reduction — $3.2M
    { id: BUDGET_CAT_IDS.crp_planning, portId: PORT_ID, awardId: AWARD_IDS.carbonReduction, name: "Fleet Electrification Study", ceiling: 1_800_000, spent: 720_000 },
    { id: BUDGET_CAT_IDS.crp_infrastructure, portId: PORT_ID, awardId: AWARD_IDS.carbonReduction, name: "Charging Infrastructure Design", ceiling: 1_100_000, spent: 330_000 },
    { id: BUDGET_CAT_IDS.crp_admin, portId: PORT_ID, awardId: AWARD_IDS.carbonReduction, name: "Project Administration", ceiling: 300_000, spent: 150_000 },
  ];

  for (const cat of cats) { await prisma.demoBudgetCategory.create({ data: cat }); }
  console.log(`  ✓ ${cats.length} budget categories seeded`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. EXPENSES
// ═══════════════════════════════════════════════════════════════════════════════

async function seedExpenses() {
  console.log("Seeding expenses...");

  const expenses = [
    // FTA 5339(b) Bus Replacement
    { portId: PORT_ID, awardId: AWARD_IDS.busFac5339, categoryId: BUDGET_CAT_IDS.bus_vehicles, date: new Date("2024-06-15"), description: "Bus procurement deposit — 15 Gillig low-floor transit buses", vendor: "Gillig LLC", amount: 4_500_000, status: "drawn" },
    { portId: PORT_ID, awardId: AWARD_IDS.busFac5339, categoryId: BUDGET_CAT_IDS.bus_vehicles, date: new Date("2024-12-01"), description: "Bus delivery milestone — 10 units delivered and accepted", vendor: "Gillig LLC", amount: 2_000_000, status: "drawn" },
    { portId: PORT_ID, awardId: AWARD_IDS.busFac5339, categoryId: BUDGET_CAT_IDS.bus_vehicles, date: new Date("2025-03-15"), description: "Final delivery — 15 remaining units", vendor: "Gillig LLC", amount: 1_150_000, status: "approved" },
    { portId: PORT_ID, awardId: AWARD_IDS.busFac5339, categoryId: BUDGET_CAT_IDS.bus_charging, date: new Date("2024-09-01"), description: "CNG fueling station upgrades", vendor: "Trillium Energy Solutions", amount: 980_000, status: "drawn" },
    { portId: PORT_ID, awardId: AWARD_IDS.busFac5339, categoryId: BUDGET_CAT_IDS.bus_training, date: new Date("2024-08-15"), description: "Operator and mechanic training program — new bus familiarization", vendor: "National Transit Institute", amount: 420_000, status: "drawn" },
    { portId: PORT_ID, awardId: AWARD_IDS.busFac5339, categoryId: BUDGET_CAT_IDS.bus_admin, date: new Date("2024-10-01"), description: "Project management and FTA reporting — FY2024", vendor: "Burns Engineering Staff", amount: 210_000, status: "drawn" },
    { portId: PORT_ID, awardId: AWARD_IDS.busFac5339, categoryId: BUDGET_CAT_IDS.bus_admin, date: new Date("2025-04-01"), description: "Q2 FY2025 project administration", vendor: "Burns Engineering Staff", amount: 150_000, status: "approved" },
    // FTA Low-No Emission
    { portId: PORT_ID, awardId: AWARD_IDS.lowNoEmission, categoryId: BUDGET_CAT_IDS.lowno_buses, date: new Date("2024-10-15"), description: "BEB procurement deposit — 10 New Flyer Xcelsior CHARGE NG", vendor: "New Flyer Industries", amount: 1_860_000, status: "drawn" },
    { portId: PORT_ID, awardId: AWARD_IDS.lowNoEmission, categoryId: BUDGET_CAT_IDS.lowno_buses, date: new Date("2025-03-01"), description: "BEB delivery milestone — 5 units delivered and commissioning", vendor: "New Flyer Industries", amount: 1_240_000, status: "approved" },
    { portId: PORT_ID, awardId: AWARD_IDS.lowNoEmission, categoryId: BUDGET_CAT_IDS.lowno_infra, date: new Date("2025-01-15"), description: "Depot charger installation — 5 ABB 150kW dispensers", vendor: "ABB E-Mobility", amount: 600_000, status: "approved" },
    { portId: PORT_ID, awardId: AWARD_IDS.lowNoEmission, categoryId: BUDGET_CAT_IDS.lowno_workforce, date: new Date("2024-11-01"), description: "High-voltage technician training — HCC partnership", vendor: "Hillsborough Community College", amount: 180_000, status: "drawn" },
    { portId: PORT_ID, awardId: AWARD_IDS.lowNoEmission, categoryId: BUDGET_CAT_IDS.lowno_admin, date: new Date("2025-01-01"), description: "Q1 FY2025 project management and FTA reporting", vendor: "Burns Engineering Staff", amount: 175_000, status: "approved" },
    // FDOT BRT Corridor
    { portId: PORT_ID, awardId: AWARD_IDS.fdotCorridor, categoryId: BUDGET_CAT_IDS.fdot_engineering, date: new Date("2024-03-15"), description: "BRT station design and engineering — 14 stations", vendor: "Kimley-Horn and Associates", amount: 620_000, status: "drawn" },
    { portId: PORT_ID, awardId: AWARD_IDS.fdotCorridor, categoryId: BUDGET_CAT_IDS.fdot_engineering, date: new Date("2024-09-01"), description: "Construction engineering and inspection", vendor: "Kimley-Horn and Associates", amount: 190_000, status: "approved" },
    { portId: PORT_ID, awardId: AWARD_IDS.fdotCorridor, categoryId: BUDGET_CAT_IDS.fdot_construction, date: new Date("2024-08-01"), description: "Station construction — Phase 1 (7 northbound stations)", vendor: "Kiewit Infrastructure", amount: 1_350_000, status: "drawn" },
    { portId: PORT_ID, awardId: AWARD_IDS.fdotCorridor, categoryId: BUDGET_CAT_IDS.fdot_construction, date: new Date("2025-02-15"), description: "Station construction — Phase 2 (7 southbound stations)", vendor: "Kiewit Infrastructure", amount: 1_050_000, status: "approved" },
    { portId: PORT_ID, awardId: AWARD_IDS.fdotCorridor, categoryId: BUDGET_CAT_IDS.fdot_signals, date: new Date("2025-01-10"), description: "TSP controller installation — first 12 intersections", vendor: "Applied Information Inc", amount: 400_000, status: "logged" },
    { portId: PORT_ID, awardId: AWARD_IDS.fdotCorridor, categoryId: BUDGET_CAT_IDS.fdot_admin, date: new Date("2024-06-01"), description: "FDOT quarterly reporting and project coordination", vendor: "Burns Engineering Staff", amount: 180_000, status: "drawn" },
    // FTA ASAP — ADA
    { portId: PORT_ID, awardId: AWARD_IDS.ftaAdaAccess, categoryId: BUDGET_CAT_IDS.ada_platforms, date: new Date("2024-02-15"), description: "Concrete pad and platform construction — 20 stops", vendor: "Ajax Paving Industries", amount: 1_100_000, status: "drawn" },
    { portId: PORT_ID, awardId: AWARD_IDS.ftaAdaAccess, categoryId: BUDGET_CAT_IDS.ada_platforms, date: new Date("2024-08-01"), description: "Platform construction — remaining 15 stops", vendor: "Ajax Paving Industries", amount: 660_000, status: "drawn" },
    { portId: PORT_ID, awardId: AWARD_IDS.ftaAdaAccess, categoryId: BUDGET_CAT_IDS.ada_shelters, date: new Date("2024-05-01"), description: "Shelter fabrication and installation — 35 stops", vendor: "Tolar Manufacturing", amount: 880_000, status: "drawn" },
    { portId: PORT_ID, awardId: AWARD_IDS.ftaAdaAccess, categoryId: BUDGET_CAT_IDS.ada_wayfinding, date: new Date("2024-06-15"), description: "Tactile wayfinding strips and ADA signage", vendor: "Armor-Tile Tactile Systems", amount: 400_000, status: "drawn" },
    { portId: PORT_ID, awardId: AWARD_IDS.ftaAdaAccess, categoryId: BUDGET_CAT_IDS.ada_admin, date: new Date("2024-09-01"), description: "FTA reporting and ADA compliance documentation", vendor: "Burns Engineering Staff", amount: 225_000, status: "drawn" },
    // Carbon Reduction
    { portId: PORT_ID, awardId: AWARD_IDS.carbonReduction, categoryId: BUDGET_CAT_IDS.crp_planning, date: new Date("2024-10-15"), description: "Fleet electrification feasibility study — Phase 1", vendor: "WSP USA", amount: 480_000, status: "drawn" },
    { portId: PORT_ID, awardId: AWARD_IDS.carbonReduction, categoryId: BUDGET_CAT_IDS.crp_planning, date: new Date("2025-03-01"), description: "Grid impact assessment and utility coordination", vendor: "WSP USA", amount: 240_000, status: "approved" },
    { portId: PORT_ID, awardId: AWARD_IDS.carbonReduction, categoryId: BUDGET_CAT_IDS.crp_infrastructure, date: new Date("2025-02-01"), description: "Charging infrastructure preliminary design — 30%", vendor: "Black & Veatch", amount: 330_000, status: "logged" },
    { portId: PORT_ID, awardId: AWARD_IDS.carbonReduction, categoryId: BUDGET_CAT_IDS.crp_admin, date: new Date("2025-01-01"), description: "Project administration and FDOT reporting", vendor: "Burns Engineering Staff", amount: 150_000, status: "approved" },
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
    { portId: PORT_ID, awardId: AWARD_IDS.busFac5339, date: new Date("2024-01-15"), description: "Burns Engineering cash match — bus procurement Phase 1", amount: 1_280_000, type: "cash" },
    { portId: PORT_ID, awardId: AWARD_IDS.busFac5339, date: new Date("2024-09-01"), description: "Burns Engineering cash match — bus procurement Phase 2", amount: 1_280_000, type: "cash" },
    { portId: PORT_ID, awardId: AWARD_IDS.lowNoEmission, date: new Date("2024-06-01"), description: "Burns Engineering cash match — BEB procurement", amount: 850_000, type: "cash" },
    { portId: PORT_ID, awardId: AWARD_IDS.lowNoEmission, date: new Date("2025-01-15"), description: "Burns Engineering cash match — charging infrastructure", amount: 425_000, type: "cash" },
    { portId: PORT_ID, awardId: AWARD_IDS.fdotCorridor, date: new Date("2024-04-01"), description: "Burns Engineering cash match — BRT corridor", amount: 1_550_000, type: "cash" },
    { portId: PORT_ID, awardId: AWARD_IDS.fdotCorridor, date: new Date("2024-10-15"), description: "In-kind: Staff project oversight and community engagement", amount: 620_000, type: "in_kind" },
    { portId: PORT_ID, awardId: AWARD_IDS.fdotCorridor, date: new Date("2025-03-01"), description: "Burns Engineering cash match — Phase 2 station construction", amount: 930_000, type: "cash" },
    { portId: PORT_ID, awardId: AWARD_IDS.ftaAdaAccess, date: new Date("2023-09-01"), description: "Burns Engineering cash match — ADA improvements", amount: 500_000, type: "cash" },
    { portId: PORT_ID, awardId: AWARD_IDS.ftaAdaAccess, date: new Date("2024-06-01"), description: "In-kind: Engineering staff ADA design work", amount: 320_000, type: "in_kind" },
    { portId: PORT_ID, awardId: AWARD_IDS.carbonReduction, date: new Date("2024-08-01"), description: "Burns Engineering cash match — electrification planning", amount: 640_000, type: "cash" },
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
    { portId: PORT_ID, awardId: AWARD_IDS.busFac5339, expenseIds: ["5339 bus + training FY2024"], totalAmount: 8_110_000, status: "payment_received", submittedDate: new Date("2024-11-15"), approvedDate: new Date("2024-12-05"), paymentDate: new Date("2024-12-20"), notes: "FY2024 drawdown — bus procurement deposits, CNG upgrades, training" },
    { portId: PORT_ID, awardId: AWARD_IDS.busFac5339, expenseIds: ["5339 delivery Q1 2025"], totalAmount: 1_300_000, status: "submitted", submittedDate: new Date("2025-04-10"), notes: "Q1 FY2025 — bus delivery milestone + admin" },
    { portId: PORT_ID, awardId: AWARD_IDS.lowNoEmission, expenseIds: ["Low-No BEB deposit"], totalAmount: 2_040_000, status: "payment_received", submittedDate: new Date("2025-01-10"), approvedDate: new Date("2025-01-28"), paymentDate: new Date("2025-02-15"), notes: "BEB procurement deposit + HV technician training" },
    { portId: PORT_ID, awardId: AWARD_IDS.lowNoEmission, expenseIds: ["Low-No infra + delivery"], totalAmount: 2_015_000, status: "draft", notes: "Pending — BEB delivery milestone + charging infrastructure" },
    { portId: PORT_ID, awardId: AWARD_IDS.fdotCorridor, expenseIds: ["FDOT BRT FY2024"], totalAmount: 2_150_000, status: "payment_received", submittedDate: new Date("2024-10-15"), approvedDate: new Date("2024-11-01"), paymentDate: new Date("2024-11-20"), notes: "FY2024 — engineering + Phase 1 station construction" },
    { portId: PORT_ID, awardId: AWARD_IDS.fdotCorridor, expenseIds: ["FDOT BRT Q1 2025"], totalAmount: 1_640_000, status: "submitted", submittedDate: new Date("2025-03-20"), notes: "Phase 2 station construction + TSP installation" },
    { portId: PORT_ID, awardId: AWARD_IDS.ftaAdaAccess, expenseIds: ["ASAP all FY2024"], totalAmount: 3_265_000, status: "payment_received", submittedDate: new Date("2024-10-01"), approvedDate: new Date("2024-10-20"), paymentDate: new Date("2024-11-05"), notes: "Phase 1 — all 35 stops complete" },
    { portId: PORT_ID, awardId: AWARD_IDS.carbonReduction, expenseIds: ["CRP planning FY2024"], totalAmount: 480_000, status: "payment_received", submittedDate: new Date("2025-01-15"), approvedDate: new Date("2025-02-01"), paymentDate: new Date("2025-02-20"), notes: "Fleet electrification study Phase 1" },
    { portId: PORT_ID, awardId: AWARD_IDS.carbonReduction, expenseIds: ["CRP Q1 2025"], totalAmount: 720_000, status: "submitted", submittedDate: new Date("2025-04-05"), notes: "Grid assessment + charging design + admin" },
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
      portId: PORT_ID, awardId: AWARD_IDS.lowNoEmission,
      fromCategoryId: BUDGET_CAT_IDS.lowno_workforce, toCategoryId: BUDGET_CAT_IDS.lowno_infra,
      amount: 50_000,
      justification: "Workforce development costs running under budget due to in-kind HCC contribution; additional charging infrastructure conduit work identified during site prep.",
      status: "approved", requestedDate: new Date("2025-02-15"), approvedDate: new Date("2025-03-01"),
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
    // FTA 5339(b) — quarterly FFR + milestone
    { portId: PORT_ID, awardId: AWARD_IDS.busFac5339, type: "sf425", title: "SF-425 Federal Financial Report — Q4 2024", dueDate: new Date("2025-01-30"), periodStart: new Date("2024-10-01"), periodEnd: new Date("2024-12-31"), status: "submitted", submittedDate: new Date("2025-01-28") },
    { portId: PORT_ID, awardId: AWARD_IDS.busFac5339, type: "progress", title: "Quarterly Milestone Report — Q4 2024", dueDate: new Date("2025-01-30"), periodStart: new Date("2024-10-01"), periodEnd: new Date("2024-12-31"), status: "submitted", submittedDate: new Date("2025-01-29") },
    { portId: PORT_ID, awardId: AWARD_IDS.busFac5339, type: "sf425", title: "SF-425 Federal Financial Report — Q1 2025", dueDate: new Date("2025-04-30"), periodStart: new Date("2025-01-01"), periodEnd: new Date("2025-03-31"), status: "submitted", submittedDate: new Date("2025-04-25") },
    { portId: PORT_ID, awardId: AWARD_IDS.busFac5339, type: "sf425", title: "SF-425 Federal Financial Report — Q2 2025", dueDate: new Date("2025-07-30"), periodStart: new Date("2025-04-01"), periodEnd: new Date("2025-06-30"), status: "upcoming" },
    // FTA Low-No — quarterly FFR + semi-annual progress
    { portId: PORT_ID, awardId: AWARD_IDS.lowNoEmission, type: "sf425", title: "SF-425 Federal Financial Report — Q4 2024", dueDate: new Date("2025-01-30"), periodStart: new Date("2024-10-01"), periodEnd: new Date("2024-12-31"), status: "submitted", submittedDate: new Date("2025-01-27") },
    { portId: PORT_ID, awardId: AWARD_IDS.lowNoEmission, type: "sf425", title: "SF-425 Federal Financial Report — Q1 2025", dueDate: new Date("2025-04-30"), periodStart: new Date("2025-01-01"), periodEnd: new Date("2025-03-31"), status: "in_progress", notes: "Draft in review — Maria reviewing before submission" },
    { portId: PORT_ID, awardId: AWARD_IDS.lowNoEmission, type: "progress", title: "Semi-Annual Progress Report — H1 2025", dueDate: new Date("2025-07-30"), periodStart: new Date("2025-01-01"), periodEnd: new Date("2025-06-30"), status: "upcoming" },
    // FDOT Corridor — quarterly
    { portId: PORT_ID, awardId: AWARD_IDS.fdotCorridor, type: "sf425", title: "SF-425 Federal Financial Report — Q1 2025", dueDate: new Date("2025-04-30"), periodStart: new Date("2025-01-01"), periodEnd: new Date("2025-03-31"), status: "drafting", notes: "First quarterly report with Phase 2 construction expenses" },
    { portId: PORT_ID, awardId: AWARD_IDS.fdotCorridor, type: "progress", title: "Quarterly Progress Report — Q1 2025", dueDate: new Date("2025-04-30"), periodStart: new Date("2025-01-01"), periodEnd: new Date("2025-03-31"), status: "drafting" },
    // FTA ASAP — semi-annual
    { portId: PORT_ID, awardId: AWARD_IDS.ftaAdaAccess, type: "sf425", title: "SF-425 Federal Financial Report — H2 2024", dueDate: new Date("2025-01-30"), periodStart: new Date("2024-07-01"), periodEnd: new Date("2024-12-31"), status: "submitted", submittedDate: new Date("2025-01-25") },
    { portId: PORT_ID, awardId: AWARD_IDS.ftaAdaAccess, type: "sf425", title: "SF-425 Federal Financial Report — H1 2025", dueDate: new Date("2025-07-30"), periodStart: new Date("2025-01-01"), periodEnd: new Date("2025-06-30"), status: "upcoming" },
    // Carbon Reduction
    { portId: PORT_ID, awardId: AWARD_IDS.carbonReduction, type: "sf425", title: "SF-425 Federal Financial Report — Q1 2025", dueDate: new Date("2025-04-30"), periodStart: new Date("2025-01-01"), periodEnd: new Date("2025-03-31"), status: "in_progress", notes: "Including grid assessment expenses" },
    // Annual
    { portId: PORT_ID, awardId: AWARD_IDS.busFac5339, type: "sefa", title: "Schedule of Expenditures of Federal Awards (SEFA) — FY2024", dueDate: new Date("2025-03-31"), periodStart: new Date("2023-10-01"), periodEnd: new Date("2024-09-30"), status: "submitted", submittedDate: new Date("2025-03-28") },
    { portId: PORT_ID, awardId: AWARD_IDS.busFac5339, type: "single_audit", title: "Single Audit Report — FY2024", dueDate: new Date("2025-06-30"), periodStart: new Date("2023-10-01"), periodEnd: new Date("2024-09-30"), status: "in_progress", notes: "External auditor (RSM US LLP) — fieldwork in progress" },
  ];

  for (const report of reports) { await prisma.demoScheduledReport.create({ data: report }); }
  console.log(`  ✓ ${reports.length} scheduled reports seeded`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 12. SUBRECIPIENTS
// ═══════════════════════════════════════════════════════════════════════════════

async function seedSubrecipients() {
  console.log("Seeding subrecipients...");

  const subs = [
    { portId: PORT_ID, awardId: AWARD_IDS.fdotCorridor, entityName: "Kiewit Infrastructure South Co.", uei: "KW7MNPQ8R2T5", classification: "contractor", classificationAnswers: [{ questionId: "q1", answer: false }, { questionId: "q2", answer: false }, { questionId: "q3", answer: false }, { questionId: "q4", answer: false }, { questionId: "q5", answer: false }], riskLevel: "standard", riskFactors: { newEntity: false, priorFindings: false, highSpend: true, noSingleAudit: false, lateReporting: false }, monitoringIntensity: "quarterly", subawardAmount: 4_000_000, cumulativeSpend: 2_400_000, singleAuditRequired: true, status: "active" },
    { portId: PORT_ID, awardId: AWARD_IDS.lowNoEmission, entityName: "Hillsborough Community College — Workforce Training", uei: "HC5WBRC4D8N1", classification: "subrecipient", classificationAnswers: [{ questionId: "q1", answer: true }, { questionId: "q2", answer: true }, { questionId: "q3", answer: true }, { questionId: "q4", answer: true }, { questionId: "q5", answer: true }], riskLevel: "standard", riskFactors: { newEntity: false, priorFindings: false, highSpend: false, noSingleAudit: false, lateReporting: false }, monitoringIntensity: "quarterly", subawardAmount: 350_000, cumulativeSpend: 180_000, singleAuditRequired: false, status: "active" },
    { portId: PORT_ID, awardId: AWARD_IDS.ftaAdaAccess, entityName: "Tampa Bay Center for Independent Living", uei: "TB9PLK7GH3J2", classification: "subrecipient", classificationAnswers: [{ questionId: "q1", answer: false }, { questionId: "q2", answer: true }, { questionId: "q3", answer: true }, { questionId: "q4", answer: true }, { questionId: "q5", answer: true }], riskLevel: "elevated", riskFactors: { newEntity: true, priorFindings: false, highSpend: false, noSingleAudit: true, lateReporting: false }, monitoringIntensity: "quarterly_plus", subawardAmount: 280_000, cumulativeSpend: 112_000, singleAuditRequired: false, status: "active" },
    { portId: PORT_ID, awardId: AWARD_IDS.carbonReduction, entityName: "WSP USA Inc. — Fleet Electrification Study", uei: "WS5TUV8WX1Y3", classification: "contractor", classificationAnswers: [{ questionId: "q1", answer: false }, { questionId: "q2", answer: false }, { questionId: "q3", answer: false }, { questionId: "q4", answer: false }, { questionId: "q5", answer: false }], riskLevel: "low", riskFactors: { newEntity: false, priorFindings: false, highSpend: false, noSingleAudit: false, lateReporting: false }, monitoringIntensity: "annual", subawardAmount: 1_800_000, cumulativeSpend: 720_000, singleAuditRequired: false, status: "active" },
    { portId: PORT_ID, awardId: AWARD_IDS.busFac5339, entityName: "East Tampa Community Development Corp", uei: "ET2CDE5FG8H0", classification: "subrecipient", classificationAnswers: [{ questionId: "q1", answer: true }, { questionId: "q2", answer: true }, { questionId: "q3", answer: true }, { questionId: "q4", answer: false }, { questionId: "q5", answer: true }], riskLevel: "high", riskFactors: { newEntity: true, priorFindings: true, highSpend: false, noSingleAudit: true, lateReporting: true }, monitoringIntensity: "monthly", subawardAmount: 200_000, cumulativeSpend: 65_000, singleAuditRequired: false, status: "active" },
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
// 13. COMPLIANCE CHECKLISTS
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
    fta_triennial: { title: "FTA Triennial Review Compliance", items: [
      { section: "Financial Management", requirement: "Maintain adequate financial management system per 2 CFR 200", cfrReference: "2 CFR 200.302" },
      { section: "Financial Management", requirement: "Demonstrate proper cost allocation procedures", cfrReference: "2 CFR 200.405" },
      { section: "Procurement", requirement: "Follow competitive procurement requirements for all contracts", cfrReference: "2 CFR 200.320" },
      { section: "Procurement", requirement: "Maintain documentation of procurement decisions", cfrReference: "2 CFR 200.318" },
      { section: "ADA Compliance", requirement: "Ensure all vehicles meet ADA accessibility requirements", cfrReference: "49 CFR 37" },
      { section: "ADA Compliance", requirement: "Maintain complementary paratransit service", cfrReference: "49 CFR 37.121" },
      { section: "ADA Compliance", requirement: "Document ADA service complaints and resolutions", cfrReference: "49 CFR 37.17" },
      { section: "Title VI", requirement: "Maintain Title VI program and conduct service equity analysis", cfrReference: "49 CFR 21" },
      { section: "Charter/School Bus", requirement: "Certify compliance with charter and school bus restrictions", cfrReference: "49 CFR 604" },
      { section: "Drug & Alcohol", requirement: "Maintain FTA drug and alcohol testing program", cfrReference: "49 CFR 655" },
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
    { awardId: AWARD_IDS.busFac5339, templateKey: "buy_america" },
    { awardId: AWARD_IDS.busFac5339, templateKey: "fta_triennial" },
    { awardId: AWARD_IDS.lowNoEmission, templateKey: "buy_america" },
    { awardId: AWARD_IDS.fdotCorridor, templateKey: "davis_bacon" },
    { awardId: AWARD_IDS.fdotCorridor, templateKey: "title_vi_dbe" },
    { awardId: AWARD_IDS.ftaAdaAccess, templateKey: "title_vi_dbe" },
    { awardId: AWARD_IDS.ftaAdaAccess, templateKey: "fta_triennial" },
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
      await prisma.demoComplianceChecklistItem.update({ where: { id: items[i].id }, data: { isCompleted: true, completedAt: new Date(Date.now() - Math.random() * 90 * 86400000), completedBy: "Maria Santos" } });
    }
    await prisma.demoComplianceChecklist.update({ where: { id: checklist.id }, data: { completedItems: completeCount } });
    console.log(`  Created: ${tmpl.title} (${completeCount}/${tmpl.items.length} done)`);
  }
  console.log(`  ✓ ${assignments.length} compliance checklists seeded`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 14. AUDIT FINDINGS
// ═══════════════════════════════════════════════════════════════════════════════

async function seedAuditFindings() {
  console.log("Seeding audit findings...");

  const findings = [
    { portId: PORT_ID, awardId: AWARD_IDS.busFac5339, auditYear: 2024, findingNumber: "2024-001", title: "Bus Procurement Contract Modification Not Pre-Approved", description: "During the FY2024 audit, it was identified that a $180K contract modification for additional bus accessories was executed without prior FTA approval. While the modification appeared reasonable and within scope, FTA procurement guidelines require prior written approval for modifications exceeding the simplified acquisition threshold.", complianceArea: "procurement", severity: "significant_deficiency", status: "in_progress" },
    { portId: PORT_ID, awardId: AWARD_IDS.lowNoEmission, auditYear: 2024, findingNumber: "2024-002", title: "Incomplete Environmental Justice Documentation", description: "The Low-No Emission award file lacked complete documentation of environmental justice community outreach activities required under the Community Benefit Plan. While outreach was conducted, sign-in sheets and meeting summaries were not consistently maintained.", complianceArea: "reporting", severity: "finding", status: "resolved" },
    { portId: PORT_ID, awardId: null, auditYear: 2023, findingNumber: "2023-001", title: "Inadequate Time and Effort Documentation", description: "The FY2023 audit identified that Burns Engineering staff charged to multiple federal awards did not maintain adequate time and effort certifications as required under 2 CFR 200.430. Semi-annual certifications were missing for 3 of 8 staff members.", complianceArea: "allowable_costs", severity: "material_weakness", status: "in_progress" },
  ];

  for (const finding of findings) {
    const created = await prisma.demoAuditFinding.create({ data: finding });
    console.log(`  Created: ${finding.findingNumber} — ${finding.title.slice(0, 50)}...`);

    if (finding.status !== "resolved") {
      const caps = finding.findingNumber === "2024-001" ? [
        { action: "Develop written contract modification approval procedures with FTA thresholds", responsible: "David Park", targetDate: "2026-06-30", status: "in_progress" },
        { action: "Submit retroactive approval request to FTA Region 4 for identified modification", responsible: "Rachel Torres", targetDate: "2026-05-15", status: "completed" },
        { action: "Implement procurement checklist with modification approval requirements", responsible: "Maria Santos", targetDate: "2026-07-31", status: "pending" },
      ] : [
        { action: "Implement electronic time tracking system with federal project codes", responsible: "David Park", targetDate: "2026-04-30", status: "in_progress" },
        { action: "Develop semi-annual certification process and calendar reminders", responsible: "Rachel Torres", targetDate: "2026-05-31", status: "pending" },
        { action: "Conduct training for all staff charged to federal awards on time documentation requirements", responsible: "Maria Santos", targetDate: "2026-06-30", status: "pending" },
        { action: "Complete retroactive certifications for FY2023 period", responsible: "David Park", targetDate: "2026-05-15", status: "in_progress" },
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
    { email: "drafter@burns-engineering.demo", name: "Rachel Torres", title: "Grants Coordinator", role: "drafter" },
    { email: "reviewer@burns-engineering.demo", name: "David Park", title: "Director of Planning & Grants", role: "reviewer" },
    { email: "cfo@burns-engineering.demo", name: "Maria Santos", title: "Executive Director / CEO", role: "certifying_official" },
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
  console.log("  Seeding Burns Engineering Transit DEMO — Full Profile Data");
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
    console.log("  ✓ Burns Engineering Transit DEMO seed complete!");
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
