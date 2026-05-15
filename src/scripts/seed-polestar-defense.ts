/**
 * Seed script for Pole Star Defense — full profile with projects, grants,
 * pipeline, awards, budget categories, expenses, drawdowns, match ledger,
 * scheduled reports, subrecipients, compliance checklists, and audit findings.
 *
 * Run: npx tsx src/scripts/seed-polestar-defense.ts
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

const PORT_ID = "polestar-defense";

// ─── Deterministic UUIDs for cross-references ───
// Profile
const PROFILE_ID = "a1b2c3d4-0001-4000-8000-000000000001";
// Projects
const PROJECT_IDS = {
  tmsModernization: "a1b2c3d4-0002-4000-8000-000000000001",
  mda2Platform: "a1b2c3d4-0002-4000-8000-000000000002",
  cloudMigration: "a1b2c3d4-0002-4000-8000-000000000003",
  aiThreatDetection: "a1b2c3d4-0002-4000-8000-000000000004",
  cyberHardening: "a1b2c3d4-0002-4000-8000-000000000005",
  emissionsMonitoring: "a1b2c3d4-0002-4000-8000-000000000006",
};
// Discovered grants
const GRANT_IDS = {
  dhsSbir: "DHS-SBIR-2026-H001",
  dodSbir: "DOD-SBIR-2026-N001",
  psgp: "DHS-FEMA-PSGP-2026",
  sldCyber: "DHS-SLCGP-2026",
  nsfConvergence: "NSF-OIA-2026-01",
  noaaOceanTech: "NOAA-NOS-2026-01",
};
// Awards
const AWARD_IDS = {
  uscgTms: "a1b2c3d4-0003-4000-8000-000000000001",
  usaceVessel: "a1b2c3d4-0003-4000-8000-000000000002",
  dhsSbir: "a1b2c3d4-0003-4000-8000-000000000003",
  navySbir: "a1b2c3d4-0003-4000-8000-000000000004",
};

// ═══════════════════════════════════════════════════════════════════════════════
// 1. PORT PROFILE
// ═══════════════════════════════════════════════════════════════════════════════

async function seedPortProfile() {
  console.log("Seeding Pole Star Defense port profile...");

  // Upsert to make script re-runnable
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
      name = EXCLUDED.name,
      entity_type = EXCLUDED.entity_type,
      classification = EXCLUDED.classification,
      location = EXCLUDED.location,
      characteristics = EXCLUDED.characteristics,
      priorities = EXCLUDED.priorities,
      capabilities = EXCLUDED.capabilities,
      needs = EXCLUDED.needs,
      certifications = EXCLUDED.certifications,
      environmental_goals = EXCLUDED.environmental_goals,
      community_impact = EXCLUDED.community_impact,
      legal_name = EXCLUDED.legal_name,
      uei = EXCLUDED.uei,
      ein = EXCLUDED.ein,
      location_data = EXCLUDED.location_data,
      leadership = EXCLUDED.leadership,
      financials = EXCLUDED.financials,
      infrastructure = EXCLUDED.infrastructure,
      operations = EXCLUDED.operations,
      economic_impact = EXCLUDED.economic_impact,
      past_grant_awards = EXCLUDED.past_grant_awards,
      disadvantaged_community_data = EXCLUDED.disadvantaged_community_data,
      climate_resilience_data = EXCLUDED.climate_resilience_data,
      updated_at = NOW()
  `,
    PROFILE_ID,
    PORT_ID,
    "polestar-defense",
    "Pole Star Defense",
    "Corporate entity (small business)",
    "Defense Technology Contractor",
    // location
    JSON.stringify({
      city: "St. Petersburg",
      state: "Florida",
      stateCode: "FL",
      county: "Pinellas County",
      region: "Southeast",
    }),
    // characteristics
    JSON.stringify({
      industrySectors: ["Maritime Intelligence", "Defense Technology", "Satellite Telecommunications", "Cybersecurity"],
      annualRevenue: 25_000_000,
      employeeCount: 55,
      operatingBudget: 18_000_000,
    }),
    // priorities
    JSON.stringify([
      "Maritime domain awareness platform modernization",
      "Cloud-native architecture and FedRAMP migration",
      "AI/ML-powered vessel threat detection",
      "Cybersecurity hardening and CMMC compliance",
      "Real-time vessel emissions and sustainability monitoring",
      "Search and rescue technology enhancement",
      "Defense agency customer expansion",
      "Workforce growth in cleared engineering roles",
    ]),
    // capabilities
    JSON.stringify([
      "National Data Center operations for 60+ governments",
      "USCG Track Management System (TMS) development and operations",
      "AMVER search and rescue program enablement",
      "Long Range Identification and Tracking (LRIT) certified data center",
      "Real-time vessel monitoring of 40,000+ ships globally",
      "AIS/satellite/RF data fusion and analytics",
      "Maritime sanctions screening and trade compliance (Purple TRAC)",
      "Dark vessel detection and maritime surveillance",
      "Cloud-based geospatial analytics (AWS GovCloud)",
      "Voyage informatics and emissions monitoring (Podium 5 platform)",
    ]),
    // needs
    JSON.stringify([
      "FedRAMP High authorization for cloud platform",
      "CMMC Level 2 certification infrastructure",
      "AI/ML compute infrastructure for threat detection models",
      "Cleared facility expansion (SCIF build-out)",
      "Advanced satellite data feed integration",
      "Zero-trust network architecture implementation",
      "DevSecOps pipeline tooling and automation",
      "Cybersecurity operations center (CSOC) buildout",
    ]),
    // certifications
    JSON.stringify([
      "ISO 9001 Quality Management System",
      "ISO 27001 Information Security Management",
      "IMO-recognized LRIT Data Center",
      "SAM.gov Active Registration (CAGE: 35FP5)",
      "Secret Facility Clearance (FCL)",
      "AWS GovCloud Authorized Partner",
    ]),
    // environmentalGoals
    JSON.stringify([
      "Enable global vessel emissions monitoring via Podium 5 platform",
      "Support IMO 2030 carbon intensity reduction targets",
      "Reduce own facility carbon footprint through cloud migration",
      "Provide data analytics for sustainable shipping routes",
    ]),
    // communityImpact
    JSON.stringify([
      "High-paying defense technology jobs in St. Petersburg Innovation District",
      "Collaboration with local SBDC for veteran hiring",
      "Partnership with University of South Florida for STEM internships",
      "Maritime safety — enabling USCG search and rescue operations",
      "Anchor tenant at Maritime and Defense Technology Hub",
    ]),
    // legal_name
    "Pole Star Space Applications USA Inc.",
    // uei
    "UC79MCC55YE3",
    // ein
    "59-3712845",
    // locationData
    JSON.stringify({
      address: "450 8th Ave SE",
      city: "St. Petersburg",
      state: "FL",
      zip: "33701",
      congressionalDistrict: "FL-14",
      latitude: 27.7676,
      longitude: -82.6267,
    }),
    // leadership
    JSON.stringify({
      executiveDirector: "Julian Longson, CEO — Pole Star Global",
      cfo: "Ben Minichino, President — Pole Star Defense",
      boardChair: "Alex Field, Managing Director — Defense",
    }),
    // financials
    JSON.stringify({
      annualRevenue: 25_000_000,
      operatingBudget: 18_000_000,
      capitalBudget: 4_000_000,
      bondRating: "N/A — Private",
      matchFundingCapacity: 3_000_000,
      totalAssets: 15_000_000,
    }),
    // infrastructure
    JSON.stringify({
      facilities: [
        "St. Petersburg HQ — 12,000 sq ft (Innovation District)",
        "USCG National Data Center operations",
        "AWS GovCloud production environment",
        "Secure development lab (SCIF-adjacent)",
      ],
      networkCapacity: "Multi-region AWS GovCloud with 99.99% SLA",
      dataProcessing: "Processing 40,000+ vessel tracks in real-time",
      platforms: ["Track Management System (TMS)", "Purple TRAC", "Podium 5", "LRIT Data Center"],
    }),
    // operations
    JSON.stringify({
      activeContracts: 4,
      governmentClients: ["U.S. Coast Guard", "U.S. Army Corps of Engineers", "Department of Homeland Security"],
      vesselTracking: 40_000,
      globalGovernments: 60,
      employeeCount: 55,
      clearedPersonnel: 35,
      dataFeedsProcessed: "AIS, S-AIS, LRIT, Radar, RF, Satellite Imagery",
    }),
    // economicImpact
    JSON.stringify({
      regionalEconomicImpact: 8_500_000,
      directJobs: 55,
      totalJobs: 120,
      averageSalary: 95_000,
      annualTaxRevenue: 450_000,
    }),
    // pastGrantAwards
    JSON.stringify([
      { program: "DHS SBIR Phase II", awardYear: 2022, awardAmount: 1_500_000, projectName: "Maritime Anomaly Detection AI", agency: "DHS S&T", status: "completed" },
      { program: "Navy SBIR Phase I", awardYear: 2023, awardAmount: 250_000, projectName: "Automated Vessel Emissions Monitoring", agency: "NAVWAR", status: "completed" },
      { program: "USCG LRIT Operations", awardYear: 2020, awardAmount: 50_000_000, projectName: "National LRIT Data Center Operations", agency: "USCG", status: "active" },
    ]),
    // disadvantagedCommunityData
    JSON.stringify({
      description: "St. Petersburg's Midtown and South St. Pete neighborhoods are designated disadvantaged communities with high environmental burden scores. Pole Star's Innovation District presence supports workforce diversification.",
      povertyRate: 14.2,
      pm25Percentile: 68,
      justiceFortyTracker: true,
      censusTract: "12103-0024.02",
    }),
    // climateResilienceData
    JSON.stringify({
      floodZone: "AE (100-year floodplain)",
      hurricaneExposure: "High — Gulf Coast Category 3+ risk",
      seaLevelRiseRisk: "Moderate — 1-3 ft by 2060 projection",
      mitigationMeasures: [
        "Cloud-first architecture reduces physical infrastructure risk",
        "Multi-region failover for critical government systems",
        "Hurricane preparedness and continuity of operations plan (COOP)",
      ],
    }),
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
      id: PROJECT_IDS.tmsModernization,
      portId: PORT_ID,
      portProfileId: PROFILE_ID,
      name: "Track Management System (TMS) Modernization",
      description: "Complete rewrite of the USCG Track Management System from legacy Java monolith to cloud-native microservices on AWS GovCloud. Includes real-time vessel tracking, search and rescue coordination, and maritime domain awareness dashboards.",
      projectType: "software_modernization",
      status: "active",
      priority: "critical",
      budget: 12_000_000,
      location: "St. Petersburg, FL / AWS GovCloud",
      startDate: new Date("2025-01-01"),
      endDate: new Date("2027-12-31"),
      focusAreas: ["Maritime Domain Awareness", "Cloud Migration", "Search and Rescue", "Microservices"],
      notes: "Core deliverable under $36M USCG renewal. Phase 1 (API layer) complete. Phase 2 (UI/UX) in progress.",
      fundingSource: "USCG Contract — HSCG23-25-C-TMS001",
      nepaStatus: "categorical_exclusion",
      nepaDocument: "CE — software/IT modernization, no physical construction",
      designCompletion: 65,
      designPhase: "final",
      permits: [],
      rightOfWay: "not_needed",
      procurementApproach: "Sole-source (incumbent follow-on)",
      shovelReady: true,
      priorFederalAwards: [
        { program: "USCG LRIT", amount: 50_000_000, year: 2020, status: "active" },
      ],
      auditFindings: "none",
      onTimeCompletion: 92,
      jobsCreated: 12,
      jobsRetained: 25,
      safetyImpact: "Directly supports USCG search and rescue operations — 3,500+ SAR cases annually",
      economicImpact: "Maintains continuity of $4.6 trillion maritime trade monitored through US waters",
    },
    {
      id: PROJECT_IDS.mda2Platform,
      portId: PORT_ID,
      portProfileId: PROFILE_ID,
      name: "MDA 2.0 — Next-Gen Maritime Domain Awareness Platform",
      description: "Development of next-generation maritime domain awareness platform integrating AIS, S-AIS, satellite imagery, RF detection, and classified intelligence feeds into a unified operational picture for defense and law enforcement agencies.",
      projectType: "product_development",
      status: "planning",
      priority: "high",
      budget: 8_500_000,
      location: "St. Petersburg, FL",
      startDate: new Date("2026-03-01"),
      endDate: new Date("2028-06-30"),
      focusAreas: ["Data Fusion", "AI/ML", "Geospatial Analytics", "Dark Vessel Detection"],
      notes: "Pre-award phase. Pursuing SBIR Phase III and DHS BAA funding. Prototype completed with internal R&D.",
      fundingSource: "Seeking — DHS SBIR Phase III + internal R&D",
      nepaStatus: "not_started",
      designCompletion: 30,
      designPhase: "preliminary",
      permits: [],
      rightOfWay: "not_needed",
      procurementApproach: "SBIR Phase III (non-competitive follow-on)",
      shovelReady: false,
      priorFederalAwards: [
        { program: "DHS SBIR Phase II", amount: 1_500_000, year: 2022, status: "completed" },
      ],
      auditFindings: "none",
      onTimeCompletion: 88,
      jobsCreated: 8,
      economicImpact: "Estimated $12M in follow-on contract value if adopted across DHS components",
    },
    {
      id: PROJECT_IDS.cloudMigration,
      portId: PORT_ID,
      portProfileId: PROFILE_ID,
      name: "FedRAMP High Cloud Migration",
      description: "Migration of all government-facing applications to FedRAMP High authorized AWS GovCloud environment. Includes infrastructure-as-code, CI/CD pipelines, container orchestration, and continuous monitoring.",
      projectType: "infrastructure_modernization",
      status: "active",
      priority: "high",
      budget: 3_200_000,
      location: "AWS GovCloud US-East / US-West",
      startDate: new Date("2025-06-01"),
      endDate: new Date("2026-12-31"),
      focusAreas: ["Cloud Security", "FedRAMP", "DevSecOps", "Zero Trust"],
      notes: "60% of workloads migrated. LRIT Data Center workloads scheduled for Q3 2026.",
      fundingSource: "Internal capital + USCG contract allocation",
      nepaStatus: "categorical_exclusion",
      designCompletion: 80,
      designPhase: "final",
      permits: [],
      rightOfWay: "not_needed",
      shovelReady: true,
      priorFederalAwards: [],
      auditFindings: "none",
      onTimeCompletion: 95,
      jobsCreated: 4,
      jobsRetained: 8,
      economicImpact: "Reduces operational costs by ~30% and improves system availability to 99.99%",
    },
    {
      id: PROJECT_IDS.aiThreatDetection,
      portId: PORT_ID,
      portProfileId: PROFILE_ID,
      name: "AI-Powered Maritime Threat Detection",
      description: "Development of machine learning models for anomalous vessel behavior detection, including dark vessel identification, sanctions evasion patterns, and illicit transshipment detection using multi-source geospatial data.",
      projectType: "research_development",
      status: "active",
      priority: "high",
      budget: 2_800_000,
      location: "St. Petersburg, FL",
      startDate: new Date("2025-09-01"),
      endDate: new Date("2027-03-31"),
      focusAreas: ["Artificial Intelligence", "Machine Learning", "Maritime Security", "Sanctions Enforcement"],
      notes: "Phase 1 models operational — 87% accuracy on dark vessel detection. Phase 2 focuses on behavioral prediction.",
      fundingSource: "DHS SBIR Phase II (completed) + USCG contract R&D allocation",
      nepaStatus: "categorical_exclusion",
      designCompletion: 55,
      designPhase: "preliminary",
      permits: [],
      rightOfWay: "not_needed",
      shovelReady: true,
      priorFederalAwards: [
        { program: "DHS SBIR Phase II", amount: 1_500_000, year: 2022, status: "completed" },
      ],
      auditFindings: "none",
      onTimeCompletion: 90,
      jobsCreated: 6,
      economicImpact: "Potential to prevent billions in sanctions evasion and illegal trade",
    },
    {
      id: PROJECT_IDS.cyberHardening,
      portId: PORT_ID,
      portProfileId: PROFILE_ID,
      name: "CMMC Level 2 Cybersecurity Hardening",
      description: "Enterprise-wide cybersecurity upgrade to achieve Cybersecurity Maturity Model Certification (CMMC) Level 2 compliance. Covers controlled unclassified information (CUI) protection, endpoint detection, SIEM deployment, and zero-trust architecture.",
      projectType: "cybersecurity",
      status: "active",
      priority: "critical",
      budget: 1_500_000,
      location: "St. Petersburg, FL",
      startDate: new Date("2025-04-01"),
      endDate: new Date("2026-09-30"),
      focusAreas: ["CMMC", "Zero Trust", "Endpoint Detection", "SIEM", "CUI Protection"],
      notes: "Required for continued DoD contract eligibility. 110 of 130 NIST 800-171 practices implemented.",
      fundingSource: "Internal capital budget",
      nepaStatus: "not_started",
      designCompletion: 70,
      designPhase: "final",
      permits: [],
      rightOfWay: "not_needed",
      shovelReady: true,
      priorFederalAwards: [],
      auditFindings: "none",
      onTimeCompletion: 85,
      jobsCreated: 3,
      jobsRetained: 5,
      economicImpact: "Preserves eligibility for $90M+ in active and future DoD/DHS contracts",
    },
    {
      id: PROJECT_IDS.emissionsMonitoring,
      portId: PORT_ID,
      portProfileId: PROFILE_ID,
      name: "Global Vessel Emissions Monitoring Platform",
      description: "Enhancement of the Podium 5 platform (acquired from StratumFive) to provide real-time vessel carbon emissions tracking, IMO CII rating calculations, and EU ETS compliance reporting for commercial and government clients.",
      projectType: "product_development",
      status: "active",
      priority: "medium",
      budget: 2_000_000,
      location: "St. Petersburg, FL",
      startDate: new Date("2025-03-01"),
      endDate: new Date("2026-12-31"),
      focusAreas: ["Emissions Monitoring", "IMO Compliance", "Sustainability", "Carbon Tracking"],
      notes: "Podium 5 integrated post-StratumFive acquisition (Oct 2023). Navy proposal for automated emissions monitoring submitted.",
      fundingSource: "Internal R&D + Navy SBIR Phase I (completed)",
      nepaStatus: "not_started",
      designCompletion: 45,
      designPhase: "preliminary",
      permits: [],
      rightOfWay: "not_needed",
      shovelReady: false,
      priorFederalAwards: [
        { program: "Navy SBIR Phase I", amount: 250_000, year: 2023, status: "completed" },
      ],
      auditFindings: "none",
      onTimeCompletion: 88,
      jobsCreated: 4,
      economicImpact: "Supports shipping industry compliance with IMO 2030 carbon intensity targets affecting $14T global trade",
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

  // Delete pipeline refs first, then grants
  await prisma.demoPipelineGrant.deleteMany({ where: { portId: PORT_ID } });

  for (const grantId of Object.values(GRANT_IDS)) {
    await prisma.demoDiscoveredGrant.deleteMany({ where: { id: grantId } });
  }

  const grants = [
    {
      id: GRANT_IDS.dhsSbir,
      portId: PORT_ID,
      title: "DHS SBIR — Maritime Cybersecurity and Domain Awareness Technologies",
      agency: "Department of Homeland Security — Science and Technology Directorate",
      agencyCode: "DHS",
      opportunityNumber: "DHS-SBIR-2026-H001",
      description: "The DHS S&T SBIR program seeks innovative solutions for maritime cybersecurity, domain awareness, and critical infrastructure protection. Topics include AI-powered threat detection, satellite-based vessel monitoring, port cybersecurity, and resilient communications for maritime operations.",
      awardFloor: 150_000,
      awardCeiling: 1_500_000,
      totalFunding: 15_000_000,
      closeDate: new Date("2026-09-15"),
      postDate: new Date("2026-04-01"),
      status: "posted",
      applicationUrl: "https://www.sbir.gov/",
      costSharing: false,
      eligibility: ["Small businesses (< 500 employees)", "US-owned and operated", "Principal investigator primarily employed by offeror"],
      fundingCategories: ["Science and Technology", "Maritime Security", "Cybersecurity"],
      fundingInstruments: ["Contract"],
      alnNumbers: ["97.077"],
      contactName: "DHS SBIR Program Manager",
      contactEmail: "dhssbir@hq.dhs.gov",
    },
    {
      id: GRANT_IDS.dodSbir,
      portId: PORT_ID,
      title: "DoD SBIR — Navy Maritime Surveillance and Autonomous Systems",
      agency: "Department of Defense — Naval Information Warfare Systems Command (NAVWAR)",
      agencyCode: "DOD",
      opportunityNumber: "N2420261234",
      description: "Navy seeks small business innovation in maritime surveillance automation, vessel tracking analytics, autonomous maritime systems, and emissions monitoring for fleet sustainability. Includes topics for real-time data fusion, AI/ML analytics, and cloud-based C4ISR.",
      awardFloor: 50_000,
      awardCeiling: 1_750_000,
      totalFunding: 25_000_000,
      closeDate: new Date("2026-08-01"),
      postDate: new Date("2026-03-15"),
      status: "posted",
      applicationUrl: "https://www.dodsbirsttr.mil/",
      costSharing: false,
      eligibility: ["Small businesses (< 500 employees)", "US-owned and operated"],
      fundingCategories: ["Defense", "Maritime", "Autonomous Systems", "AI/ML"],
      fundingInstruments: ["Contract"],
      alnNumbers: ["12.910"],
      contactName: "NAVWAR SBIR Program Office",
      contactEmail: "navwar.sbir@navy.mil",
    },
    {
      id: GRANT_IDS.psgp,
      portId: PORT_ID,
      title: "FY 2026 Port Security Grant Program (PSGP)",
      agency: "Department of Homeland Security — FEMA",
      agencyCode: "DHS",
      opportunityNumber: "DHS-FEMA-PSGP-2026",
      description: "The Port Security Grant Program provides funding to protect critical port infrastructure from terrorism, enhance maritime domain awareness, improve port-wide maritime security risk management, and support port recovery and resiliency capabilities. Eligible projects include vessel monitoring systems, cybersecurity, and maritime surveillance technology.",
      awardFloor: 100_000,
      awardCeiling: 5_000_000,
      totalFunding: 90_000_000,
      closeDate: new Date("2026-10-31"),
      postDate: new Date("2026-08-01"),
      status: "posted",
      applicationUrl: "https://www.fema.gov/grants/preparedness/port-security",
      costSharing: true,
      eligibility: ["State, local, and tribal governments", "Private sector port operators", "Maritime industry stakeholders"],
      fundingCategories: ["Port Security", "Maritime Domain Awareness", "Cybersecurity", "Critical Infrastructure Protection"],
      fundingInstruments: ["Grant"],
      alnNumbers: ["97.056"],
      contactName: "FEMA Grant Programs Directorate",
      contactEmail: "askcsid@fema.dhs.gov",
    },
    {
      id: GRANT_IDS.sldCyber,
      portId: PORT_ID,
      title: "FY 2026 State and Local Cybersecurity Grant Program",
      agency: "Department of Homeland Security — CISA",
      agencyCode: "DHS",
      opportunityNumber: "DHS-SLCGP-2026-001",
      description: "Supports state, local, and territorial governments and their critical infrastructure partners in addressing cybersecurity risks and threats. Eligible activities include cybersecurity planning, workforce development, zero-trust architecture implementation, and critical infrastructure cyber protection.",
      awardFloor: 25_000,
      awardCeiling: 2_000_000,
      totalFunding: 50_000_000,
      closeDate: new Date("2026-11-30"),
      postDate: new Date("2026-07-15"),
      status: "posted",
      applicationUrl: "https://www.cisa.gov/state-and-local-cybersecurity-grant-program",
      costSharing: true,
      eligibility: ["State and local governments", "Critical infrastructure operators", "Cybersecurity service providers"],
      fundingCategories: ["Cybersecurity", "Critical Infrastructure", "Workforce Development"],
      fundingInstruments: ["Grant"],
      alnNumbers: ["97.139"],
      contactName: "CISA Grants Division",
      contactEmail: "slcgp@cisa.dhs.gov",
    },
    {
      id: GRANT_IDS.nsfConvergence,
      portId: PORT_ID,
      title: "NSF Convergence Accelerator — Track N: Maritime AI and Digital Twins",
      agency: "National Science Foundation — Technology, Innovation and Partnerships",
      agencyCode: "NSF",
      opportunityNumber: "NSF-OIA-2026-01",
      description: "The NSF Convergence Accelerator funds use-inspired, team-based, multidisciplinary research to address national-scale societal challenges. Track N focuses on maritime AI, digital twins for port infrastructure, and advanced analytics for supply chain resilience.",
      awardFloor: 500_000,
      awardCeiling: 5_000_000,
      totalFunding: 40_000_000,
      closeDate: new Date("2026-12-15"),
      postDate: new Date("2026-06-01"),
      status: "posted",
      applicationUrl: "https://new.nsf.gov/funding/initiatives/convergence-accelerator",
      costSharing: false,
      eligibility: ["Institutions of higher education", "Non-profit organizations", "For-profit organizations", "State and local governments"],
      fundingCategories: ["AI/ML", "Maritime", "Digital Twins", "Supply Chain"],
      fundingInstruments: ["Cooperative Agreement"],
      alnNumbers: ["47.084"],
      contactName: "NSF Convergence Accelerator Program",
      contactEmail: "convergence@nsf.gov",
    },
    {
      id: GRANT_IDS.noaaOceanTech,
      portId: PORT_ID,
      title: "NOAA Ocean and Coastal Technology Grants",
      agency: "National Oceanic and Atmospheric Administration — National Ocean Service",
      agencyCode: "DOC",
      opportunityNumber: "NOAA-NOS-2026-01",
      description: "NOAA seeks proposals for advanced ocean observation technology, vessel monitoring innovations, maritime emissions tracking, and coastal resilience data platforms. Includes focus areas for AIS data analytics, marine spatial planning tools, and environmental compliance monitoring systems.",
      awardFloor: 100_000,
      awardCeiling: 3_000_000,
      totalFunding: 20_000_000,
      closeDate: new Date("2026-07-31"),
      postDate: new Date("2026-02-15"),
      status: "posted",
      applicationUrl: "https://www.grants.gov/",
      costSharing: true,
      eligibility: ["Institutions of higher education", "Non-profit organizations", "For-profit organizations", "State and local governments"],
      fundingCategories: ["Ocean Technology", "Vessel Monitoring", "Environmental Compliance", "Coastal Resilience"],
      fundingInstruments: ["Grant", "Cooperative Agreement"],
      alnNumbers: ["11.473"],
      contactName: "NOAA NOS Grants Office",
      contactEmail: "nos.grants@noaa.gov",
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
      portId: PORT_ID,
      grantId: GRANT_IDS.dhsSbir,
      portProfileId: PROFILE_ID,
      stage: "applied",
      notes: "Phase II proposal submitted April 2026. Builds on Phase I dark vessel detection work.",
      overallScore: 91,
      eligibilityScore: 95,
      alignmentScore: 94,
      impactScore: 88,
      competitivenessScore: 87,
      recommendation: "strong_apply",
      eligibilityStatus: "eligible",
      strengths: [
        "Direct follow-on from successful DHS SBIR Phase II (2022)",
        "Strong past performance with USCG Track Management System",
        "AI/ML capabilities demonstrated in dark vessel detection prototype",
        "ISO 27001 certified with Secret FCL",
      ],
      concerns: [
        "Competitive field — 15+ firms expected to propose",
        "Budget may need revision for FedRAMP compliance timeline",
      ],
      keyRequirements: [
        "Small business size standard (< 500 employees)",
        "Principal investigator primarily employed by offeror",
        "Phase I/II performance documentation",
        "Cybersecurity plan per DFARS 252.204-7012",
      ],
      scoredAt: new Date("2026-04-10"),
      addedAt: new Date("2026-04-05"),
    },
    {
      portId: PORT_ID,
      grantId: GRANT_IDS.dodSbir,
      portProfileId: PROFILE_ID,
      stage: "eligible",
      notes: "Evaluating Topic N264-001 (Fleet Emissions Monitoring). Strong alignment with Podium 5.",
      overallScore: 85,
      eligibilityScore: 95,
      alignmentScore: 88,
      impactScore: 82,
      competitivenessScore: 75,
      recommendation: "apply",
      eligibilityStatus: "eligible",
      strengths: [
        "Existing Podium 5 platform for vessel emissions monitoring",
        "Prior Navy SBIR Phase I award in same domain",
        "Technical capability in AIS data fusion",
      ],
      concerns: [
        "Navy SBIR Phase I was 2023 — gap in Navy engagement",
        "Need to demonstrate dual-use (military + commercial) value",
      ],
      keyRequirements: [
        "Small business size standard",
        "CMMC Level 2 (required by FY2026)",
        "Phase I proposal — 20-page technical volume",
      ],
      scoredAt: new Date("2026-03-20"),
      addedAt: new Date("2026-03-18"),
    },
    {
      portId: PORT_ID,
      grantId: GRANT_IDS.psgp,
      portProfileId: PROFILE_ID,
      stage: "eligible",
      notes: "Would partner with Port Tampa Bay or JAXPORT as the eligible applicant (port authority). PSD as technology provider/subrecipient.",
      overallScore: 78,
      eligibilityScore: 70,
      alignmentScore: 90,
      impactScore: 80,
      competitivenessScore: 72,
      recommendation: "consider",
      eligibilityStatus: "eligible_with_partner",
      strengths: [
        "Maritime domain awareness is a core PSGP priority",
        "Proven USCG vessel tracking technology",
        "Can serve as technology provider to port authority applicant",
      ],
      concerns: [
        "Pole Star is not a port authority — must partner with eligible applicant",
        "25% cost share requirement",
        "Competitive against Tier 1 port applications",
      ],
      keyRequirements: [
        "Must be submitted by eligible port authority",
        "25% cost share required",
        "Alignment with Area Maritime Security Plan",
        "Investment Justification (IJ) submission",
      ],
      scoredAt: new Date("2026-05-01"),
      addedAt: new Date("2026-04-28"),
    },
    {
      portId: PORT_ID,
      grantId: GRANT_IDS.nsfConvergence,
      portProfileId: PROFILE_ID,
      stage: "eligible",
      notes: "Would require academic partner (USF or Georgia Tech). Strong alignment with vessel data analytics capabilities.",
      overallScore: 74,
      eligibilityScore: 80,
      alignmentScore: 82,
      impactScore: 72,
      competitivenessScore: 62,
      recommendation: "consider",
      eligibilityStatus: "eligible",
      strengths: [
        "Real-world maritime data assets (40K+ vessels)",
        "Existing government deployment at scale",
        "Clear commercial transition pathway",
      ],
      concerns: [
        "Requires academic PI — need USF or similar partnership",
        "Convergence Accelerator is highly competitive",
        "Team assembly timeline may be tight",
      ],
      keyRequirements: [
        "Multi-disciplinary team with academic PI",
        "Phase 1 proof of concept",
        "Stakeholder engagement plan",
        "Sustainability/transition plan",
      ],
      scoredAt: new Date("2026-05-08"),
      addedAt: new Date("2026-05-05"),
    },
    {
      portId: PORT_ID,
      grantId: GRANT_IDS.noaaOceanTech,
      portProfileId: PROFILE_ID,
      stage: "applied",
      notes: "Proposal submitted for Podium 5 vessel emissions monitoring integration with NOAA AIS data. Letter of support from USCG.",
      overallScore: 82,
      eligibilityScore: 90,
      alignmentScore: 85,
      impactScore: 80,
      competitivenessScore: 73,
      recommendation: "apply",
      eligibilityStatus: "eligible",
      strengths: [
        "Podium 5 platform directly addresses NOAA vessel monitoring needs",
        "Existing AIS data processing pipeline",
        "Letter of support from USCG validates operational relevance",
        "Emissions monitoring aligned with IMO/EPA regulatory requirements",
      ],
      concerns: [
        "NOAA prefers non-profit or academic lead applicants",
        "20% cost share may stretch capital budget",
      ],
      keyRequirements: [
        "Demonstration of ocean technology innovation",
        "Data management plan",
        "20% cost share",
        "Environmental compliance monitoring capability",
      ],
      scoredAt: new Date("2026-02-28"),
      addedAt: new Date("2026-02-20"),
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

  // Clear dependent tables first (reverse FK order)
  for (const table of [
    "demo_corrective_action_plans", "demo_audit_findings",
    "demo_compliance_checklist_items", "demo_compliance_checklists",
    "demo_subrecipient_reports", "demo_subrecipients",
    "demo_closeout_checklists",
    "demo_scheduled_reports",
    "demo_budget_modifications",
    "demo_drawdown_requests",
    "demo_expenses",
    "demo_match_ledger",
    "demo_budget_categories",
    "demo_awards",
  ]) {
    await prisma.$executeRawUnsafe(`DELETE FROM ${table} WHERE port_id = $1`, PORT_ID);
  }

  const awards = [
    {
      id: AWARD_IDS.uscgTms,
      portId: PORT_ID,
      portProfileId: PROFILE_ID,
      fain: "HSCG23-25-C-TMS001",
      cfda: "97.012",
      awardingAgency: "U.S. Coast Guard",
      program: "USCG Track Management System Operations & Modernization",
      title: "Track Management System Modernization and Operations",
      description: "Three-year contract for continued operations, maintenance, and modernization of the USCG Track Management System. Includes cloud migration, real-time vessel tracking, search and rescue support, and maritime domain awareness dashboard development.",
      totalAmount: 36_000_000,
      performancePeriodStart: new Date("2025-10-01"),
      performancePeriodEnd: new Date("2028-09-30"),
      matchPercentage: 0,
      matchTypes: [],
      matchCommitted: 0,
      matchRequired: 0,
      status: "active",
      projectIds: [PROJECT_IDS.tmsModernization, PROJECT_IDS.cloudMigration],
      indirectCostRate: 0.1500,
      indirectCostBase: "mtdc",
      indirectCostType: "provisional",
      indirectCostPeriodStart: new Date("2025-10-01"),
      indirectCostPeriodEnd: new Date("2026-09-30"),
    },
    {
      id: AWARD_IDS.usaceVessel,
      portId: PORT_ID,
      portProfileId: PROFILE_ID,
      fain: "W912P7-25-C-0042",
      cfda: "12.112",
      awardingAgency: "U.S. Army Corps of Engineers",
      program: "USACE Vessel Intelligence for Waterway Management",
      title: "Vessel Intelligence Data Feeds for Inland Waterway Management",
      description: "Five-year contract providing real-time vessel intelligence through multiple data feeds (AIS, S-AIS, satellite) to support Army Corps of Engineers waterway management, lock scheduling, and infrastructure monitoring operations.",
      totalAmount: 400_000,
      performancePeriodStart: new Date("2025-10-01"),
      performancePeriodEnd: new Date("2030-09-30"),
      matchPercentage: 0,
      matchTypes: [],
      matchCommitted: 0,
      matchRequired: 0,
      status: "active",
      projectIds: [],
      indirectCostRate: 0.1500,
      indirectCostBase: "mtdc",
      indirectCostType: "provisional",
      indirectCostPeriodStart: new Date("2025-10-01"),
      indirectCostPeriodEnd: new Date("2026-09-30"),
    },
    {
      id: AWARD_IDS.dhsSbir,
      portId: PORT_ID,
      portProfileId: PROFILE_ID,
      fain: "70RSAT22C00000045",
      cfda: "97.077",
      awardingAgency: "DHS Science & Technology Directorate",
      program: "DHS SBIR Phase II — Maritime Anomaly Detection",
      title: "Maritime Anomaly Detection Using AI/ML on Fused Sensor Data",
      description: "SBIR Phase II award for development of AI/ML-based maritime anomaly detection system. Integrates AIS, satellite imagery, and RF data to identify dark vessels, sanctions evasion, and illicit transshipment patterns.",
      totalAmount: 1_500_000,
      performancePeriodStart: new Date("2022-09-01"),
      performancePeriodEnd: new Date("2024-08-31"),
      matchPercentage: 0,
      matchTypes: [],
      matchCommitted: 0,
      matchRequired: 0,
      status: "closed",
      projectIds: [PROJECT_IDS.aiThreatDetection],
      indirectCostRate: 0.1200,
      indirectCostBase: "mtdc",
      indirectCostType: "fixed",
      indirectCostPeriodStart: new Date("2022-09-01"),
      indirectCostPeriodEnd: new Date("2024-08-31"),
    },
    {
      id: AWARD_IDS.navySbir,
      portId: PORT_ID,
      portProfileId: PROFILE_ID,
      fain: "N68335-23-C-0318",
      cfda: "12.910",
      awardingAgency: "Naval Information Warfare Systems Command (NAVWAR)",
      program: "Navy SBIR Phase I — Automated Vessel Emissions Monitoring",
      title: "Automated Vessel Emissions Monitoring for Fleet Sustainability",
      description: "SBIR Phase I feasibility study for automated vessel emissions monitoring system integrating AIS data with atmospheric models to calculate real-time CO2, SOx, and NOx emissions for Navy and commercial fleets.",
      totalAmount: 250_000,
      performancePeriodStart: new Date("2023-06-01"),
      performancePeriodEnd: new Date("2024-05-31"),
      matchPercentage: 0,
      matchTypes: [],
      matchCommitted: 0,
      matchRequired: 0,
      status: "closed",
      projectIds: [PROJECT_IDS.emissionsMonitoring],
      indirectCostRate: 0.1200,
      indirectCostBase: "mtdc",
      indirectCostType: "fixed",
      indirectCostPeriodStart: new Date("2023-06-01"),
      indirectCostPeriodEnd: new Date("2024-05-31"),
    },
  ];

  for (const award of awards) {
    await prisma.demoAward.create({ data: award });
    console.log(`  Created: ${award.title.slice(0, 60)}... ($${(Number(award.totalAmount) / 1_000_000).toFixed(1)}M)`);
  }

  console.log(`  ✓ ${awards.length} awards seeded`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. BUDGET CATEGORIES
// ═══════════════════════════════════════════════════════════════════════════════

const BUDGET_CAT_IDS = {
  // USCG TMS
  uscg_personnel: "a1b2c3d4-0004-4000-8000-000000000001",
  uscg_fringe: "a1b2c3d4-0004-4000-8000-000000000002",
  uscg_cloud: "a1b2c3d4-0004-4000-8000-000000000003",
  uscg_subcontracts: "a1b2c3d4-0004-4000-8000-000000000004",
  uscg_travel: "a1b2c3d4-0004-4000-8000-000000000005",
  uscg_equipment: "a1b2c3d4-0004-4000-8000-000000000006",
  uscg_other: "a1b2c3d4-0004-4000-8000-000000000007",
  uscg_indirect: "a1b2c3d4-0004-4000-8000-000000000008",
  // USACE
  usace_personnel: "a1b2c3d4-0004-4000-8000-000000000011",
  usace_cloud: "a1b2c3d4-0004-4000-8000-000000000012",
  usace_data_feeds: "a1b2c3d4-0004-4000-8000-000000000013",
  usace_indirect: "a1b2c3d4-0004-4000-8000-000000000014",
};

async function seedBudgetCategories() {
  console.log("Seeding budget categories...");

  const categories = [
    // USCG TMS ($36M)
    { id: BUDGET_CAT_IDS.uscg_personnel, portId: PORT_ID, awardId: AWARD_IDS.uscgTms, name: "Personnel (Direct Labor)", ceiling: 16_200_000, spent: 4_050_000 },
    { id: BUDGET_CAT_IDS.uscg_fringe, portId: PORT_ID, awardId: AWARD_IDS.uscgTms, name: "Fringe Benefits", ceiling: 4_860_000, spent: 1_215_000 },
    { id: BUDGET_CAT_IDS.uscg_cloud, portId: PORT_ID, awardId: AWARD_IDS.uscgTms, name: "Cloud Infrastructure (AWS GovCloud)", ceiling: 5_400_000, spent: 1_350_000 },
    { id: BUDGET_CAT_IDS.uscg_subcontracts, portId: PORT_ID, awardId: AWARD_IDS.uscgTms, name: "Subcontracts", ceiling: 3_600_000, spent: 900_000 },
    { id: BUDGET_CAT_IDS.uscg_travel, portId: PORT_ID, awardId: AWARD_IDS.uscgTms, name: "Travel", ceiling: 540_000, spent: 135_000 },
    { id: BUDGET_CAT_IDS.uscg_equipment, portId: PORT_ID, awardId: AWARD_IDS.uscgTms, name: "Equipment & Licenses", ceiling: 1_800_000, spent: 450_000 },
    { id: BUDGET_CAT_IDS.uscg_other, portId: PORT_ID, awardId: AWARD_IDS.uscgTms, name: "Other Direct Costs", ceiling: 900_000, spent: 225_000 },
    { id: BUDGET_CAT_IDS.uscg_indirect, portId: PORT_ID, awardId: AWARD_IDS.uscgTms, name: "Indirect Costs (15% MTDC)", ceiling: 2_700_000, spent: 675_000 },
    // USACE ($400K)
    { id: BUDGET_CAT_IDS.usace_personnel, portId: PORT_ID, awardId: AWARD_IDS.usaceVessel, name: "Personnel", ceiling: 180_000, spent: 27_000 },
    { id: BUDGET_CAT_IDS.usace_cloud, portId: PORT_ID, awardId: AWARD_IDS.usaceVessel, name: "Cloud & Hosting", ceiling: 100_000, spent: 15_000 },
    { id: BUDGET_CAT_IDS.usace_data_feeds, portId: PORT_ID, awardId: AWARD_IDS.usaceVessel, name: "Data Feed Subscriptions (AIS/S-AIS)", ceiling: 80_000, spent: 12_000 },
    { id: BUDGET_CAT_IDS.usace_indirect, portId: PORT_ID, awardId: AWARD_IDS.usaceVessel, name: "Indirect Costs (15% MTDC)", ceiling: 40_000, spent: 6_000 },
  ];

  for (const cat of categories) {
    await prisma.demoBudgetCategory.create({ data: cat });
  }

  console.log(`  ✓ ${categories.length} budget categories seeded`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. EXPENSES
// ═══════════════════════════════════════════════════════════════════════════════

async function seedExpenses() {
  console.log("Seeding expenses...");

  const expenses = [
    // USCG TMS expenses — Q1 2026 (Oct-Dec 2025) and Q2 2026 (Jan-Mar 2026)
    { portId: PORT_ID, awardId: AWARD_IDS.uscgTms, categoryId: BUDGET_CAT_IDS.uscg_personnel, date: new Date("2025-10-31"), description: "October 2025 direct labor — 18 engineers", vendor: "Pole Star Defense (Internal)", amount: 337_500, status: "drawn" },
    { portId: PORT_ID, awardId: AWARD_IDS.uscgTms, categoryId: BUDGET_CAT_IDS.uscg_personnel, date: new Date("2025-11-30"), description: "November 2025 direct labor — 18 engineers", vendor: "Pole Star Defense (Internal)", amount: 337_500, status: "drawn" },
    { portId: PORT_ID, awardId: AWARD_IDS.uscgTms, categoryId: BUDGET_CAT_IDS.uscg_personnel, date: new Date("2025-12-31"), description: "December 2025 direct labor — 18 engineers", vendor: "Pole Star Defense (Internal)", amount: 337_500, status: "drawn" },
    { portId: PORT_ID, awardId: AWARD_IDS.uscgTms, categoryId: BUDGET_CAT_IDS.uscg_personnel, date: new Date("2026-01-31"), description: "January 2026 direct labor — 20 engineers", vendor: "Pole Star Defense (Internal)", amount: 375_000, status: "drawn" },
    { portId: PORT_ID, awardId: AWARD_IDS.uscgTms, categoryId: BUDGET_CAT_IDS.uscg_personnel, date: new Date("2026-02-28"), description: "February 2026 direct labor — 20 engineers", vendor: "Pole Star Defense (Internal)", amount: 375_000, status: "drawn" },
    { portId: PORT_ID, awardId: AWARD_IDS.uscgTms, categoryId: BUDGET_CAT_IDS.uscg_personnel, date: new Date("2026-03-31"), description: "March 2026 direct labor — 20 engineers", vendor: "Pole Star Defense (Internal)", amount: 375_000, status: "approved" },
    { portId: PORT_ID, awardId: AWARD_IDS.uscgTms, categoryId: BUDGET_CAT_IDS.uscg_personnel, date: new Date("2026-04-30"), description: "April 2026 direct labor — 22 engineers", vendor: "Pole Star Defense (Internal)", amount: 412_500, status: "logged" },
    { portId: PORT_ID, awardId: AWARD_IDS.uscgTms, categoryId: BUDGET_CAT_IDS.uscg_fringe, date: new Date("2025-12-31"), description: "Q1 FY26 fringe benefits (30% of labor)", vendor: "Pole Star Defense (Internal)", amount: 303_750, status: "drawn" },
    { portId: PORT_ID, awardId: AWARD_IDS.uscgTms, categoryId: BUDGET_CAT_IDS.uscg_fringe, date: new Date("2026-03-31"), description: "Q2 FY26 fringe benefits (30% of labor)", vendor: "Pole Star Defense (Internal)", amount: 337_500, status: "approved" },
    { portId: PORT_ID, awardId: AWARD_IDS.uscgTms, categoryId: BUDGET_CAT_IDS.uscg_cloud, date: new Date("2025-10-31"), description: "AWS GovCloud — October 2025", vendor: "Amazon Web Services (GovCloud)", amount: 112_500, status: "drawn" },
    { portId: PORT_ID, awardId: AWARD_IDS.uscgTms, categoryId: BUDGET_CAT_IDS.uscg_cloud, date: new Date("2025-11-30"), description: "AWS GovCloud — November 2025", vendor: "Amazon Web Services (GovCloud)", amount: 112_500, status: "drawn" },
    { portId: PORT_ID, awardId: AWARD_IDS.uscgTms, categoryId: BUDGET_CAT_IDS.uscg_cloud, date: new Date("2025-12-31"), description: "AWS GovCloud — December 2025", vendor: "Amazon Web Services (GovCloud)", amount: 112_500, status: "drawn" },
    { portId: PORT_ID, awardId: AWARD_IDS.uscgTms, categoryId: BUDGET_CAT_IDS.uscg_cloud, date: new Date("2026-01-31"), description: "AWS GovCloud — January 2026", vendor: "Amazon Web Services (GovCloud)", amount: 125_000, status: "drawn" },
    { portId: PORT_ID, awardId: AWARD_IDS.uscgTms, categoryId: BUDGET_CAT_IDS.uscg_cloud, date: new Date("2026-02-28"), description: "AWS GovCloud — February 2026", vendor: "Amazon Web Services (GovCloud)", amount: 125_000, status: "drawn" },
    { portId: PORT_ID, awardId: AWARD_IDS.uscgTms, categoryId: BUDGET_CAT_IDS.uscg_cloud, date: new Date("2026-03-31"), description: "AWS GovCloud — March 2026", vendor: "Amazon Web Services (GovCloud)", amount: 125_000, status: "approved" },
    { portId: PORT_ID, awardId: AWARD_IDS.uscgTms, categoryId: BUDGET_CAT_IDS.uscg_subcontracts, date: new Date("2025-11-15"), description: "PVM — Data analytics integration (Milestone 1)", vendor: "PVM Inc.", amount: 300_000, status: "drawn" },
    { portId: PORT_ID, awardId: AWARD_IDS.uscgTms, categoryId: BUDGET_CAT_IDS.uscg_subcontracts, date: new Date("2026-02-15"), description: "PVM — Data analytics integration (Milestone 2)", vendor: "PVM Inc.", amount: 300_000, status: "approved" },
    { portId: PORT_ID, awardId: AWARD_IDS.uscgTms, categoryId: BUDGET_CAT_IDS.uscg_travel, date: new Date("2025-10-22"), description: "USCG HQ program review — Washington DC (3 staff)", vendor: "Various (travel)", amount: 8_500, status: "drawn" },
    { portId: PORT_ID, awardId: AWARD_IDS.uscgTms, categoryId: BUDGET_CAT_IDS.uscg_travel, date: new Date("2026-01-15"), description: "USCG Sector visit — Miami (2 staff)", vendor: "Various (travel)", amount: 4_200, status: "drawn" },
    { portId: PORT_ID, awardId: AWARD_IDS.uscgTms, categoryId: BUDGET_CAT_IDS.uscg_travel, date: new Date("2026-03-10"), description: "Sea Air Space conference — National Harbor MD (4 staff)", vendor: "Various (travel)", amount: 12_800, status: "approved" },
    { portId: PORT_ID, awardId: AWARD_IDS.uscgTms, categoryId: BUDGET_CAT_IDS.uscg_equipment, date: new Date("2025-10-05"), description: "Satellite data feed hardware — iridium terminals", vendor: "Iridium Communications", amount: 85_000, status: "drawn" },
    { portId: PORT_ID, awardId: AWARD_IDS.uscgTms, categoryId: BUDGET_CAT_IDS.uscg_equipment, date: new Date("2025-12-10"), description: "Security operations monitoring equipment", vendor: "Palo Alto Networks", amount: 62_000, status: "drawn" },
    { portId: PORT_ID, awardId: AWARD_IDS.uscgTms, categoryId: BUDGET_CAT_IDS.uscg_equipment, date: new Date("2026-02-20"), description: "Development workstations — classified network", vendor: "Dell Federal", amount: 48_000, status: "drawn" },
    { portId: PORT_ID, awardId: AWARD_IDS.uscgTms, categoryId: BUDGET_CAT_IDS.uscg_other, date: new Date("2025-11-01"), description: "AIS data subscription — Q1 FY26", vendor: "MarineTraffic", amount: 45_000, status: "drawn" },
    { portId: PORT_ID, awardId: AWARD_IDS.uscgTms, categoryId: BUDGET_CAT_IDS.uscg_other, date: new Date("2026-02-01"), description: "AIS data subscription — Q2 FY26", vendor: "MarineTraffic", amount: 45_000, status: "drawn" },
    { portId: PORT_ID, awardId: AWARD_IDS.uscgTms, categoryId: BUDGET_CAT_IDS.uscg_other, date: new Date("2026-01-15"), description: "Satellite imagery — Maxar archive access", vendor: "Maxar Technologies", amount: 35_000, status: "drawn" },
    { portId: PORT_ID, awardId: AWARD_IDS.uscgTms, categoryId: BUDGET_CAT_IDS.uscg_indirect, date: new Date("2025-12-31"), description: "Q1 FY26 indirect costs (15% MTDC)", vendor: "Pole Star Defense (Internal)", amount: 225_000, status: "drawn" },
    { portId: PORT_ID, awardId: AWARD_IDS.uscgTms, categoryId: BUDGET_CAT_IDS.uscg_indirect, date: new Date("2026-03-31"), description: "Q2 FY26 indirect costs (15% MTDC)", vendor: "Pole Star Defense (Internal)", amount: 250_000, status: "approved" },
    // USACE expenses
    { portId: PORT_ID, awardId: AWARD_IDS.usaceVessel, categoryId: BUDGET_CAT_IDS.usace_personnel, date: new Date("2025-12-31"), description: "Q1 FY26 personnel — vessel data analyst (part-time)", vendor: "Pole Star Defense (Internal)", amount: 13_500, status: "drawn" },
    { portId: PORT_ID, awardId: AWARD_IDS.usaceVessel, categoryId: BUDGET_CAT_IDS.usace_personnel, date: new Date("2026-03-31"), description: "Q2 FY26 personnel — vessel data analyst (part-time)", vendor: "Pole Star Defense (Internal)", amount: 13_500, status: "approved" },
    { portId: PORT_ID, awardId: AWARD_IDS.usaceVessel, categoryId: BUDGET_CAT_IDS.usace_cloud, date: new Date("2025-12-31"), description: "Q1 FY26 cloud hosting — USACE data feeds", vendor: "Amazon Web Services (GovCloud)", amount: 7_500, status: "drawn" },
    { portId: PORT_ID, awardId: AWARD_IDS.usaceVessel, categoryId: BUDGET_CAT_IDS.usace_cloud, date: new Date("2026-03-31"), description: "Q2 FY26 cloud hosting — USACE data feeds", vendor: "Amazon Web Services (GovCloud)", amount: 7_500, status: "approved" },
    { portId: PORT_ID, awardId: AWARD_IDS.usaceVessel, categoryId: BUDGET_CAT_IDS.usace_data_feeds, date: new Date("2025-12-31"), description: "Q1 FY26 AIS/S-AIS data subscriptions", vendor: "Spire Global", amount: 6_000, status: "drawn" },
    { portId: PORT_ID, awardId: AWARD_IDS.usaceVessel, categoryId: BUDGET_CAT_IDS.usace_data_feeds, date: new Date("2026-03-31"), description: "Q2 FY26 AIS/S-AIS data subscriptions", vendor: "Spire Global", amount: 6_000, status: "approved" },
    { portId: PORT_ID, awardId: AWARD_IDS.usaceVessel, categoryId: BUDGET_CAT_IDS.usace_indirect, date: new Date("2025-12-31"), description: "Q1 FY26 indirect costs (15% MTDC)", vendor: "Pole Star Defense (Internal)", amount: 3_000, status: "drawn" },
    { portId: PORT_ID, awardId: AWARD_IDS.usaceVessel, categoryId: BUDGET_CAT_IDS.usace_indirect, date: new Date("2026-03-31"), description: "Q2 FY26 indirect costs (15% MTDC)", vendor: "Pole Star Defense (Internal)", amount: 3_000, status: "approved" },
  ];

  for (const exp of expenses) {
    await prisma.demoExpense.create({ data: exp });
  }

  console.log(`  ✓ ${expenses.length} expenses seeded`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8. DRAWDOWN REQUESTS
// ═══════════════════════════════════════════════════════════════════════════════

async function seedDrawdowns() {
  console.log("Seeding drawdown requests...");

  const drawdowns = [
    {
      portId: PORT_ID,
      awardId: AWARD_IDS.uscgTms,
      expenseIds: ["Q1 FY26 expenses batch"],
      totalAmount: 2_540_250,
      status: "payment_received",
      submittedDate: new Date("2026-01-10"),
      approvedDate: new Date("2026-01-18"),
      paymentDate: new Date("2026-01-25"),
      notes: "Q1 FY26 drawdown — all expenses verified and approved by COTR",
    },
    {
      portId: PORT_ID,
      awardId: AWARD_IDS.uscgTms,
      expenseIds: ["Q2 FY26 expenses batch"],
      totalAmount: 2_685_000,
      status: "submitted",
      submittedDate: new Date("2026-04-08"),
      notes: "Q2 FY26 drawdown — pending COTR review",
    },
    {
      portId: PORT_ID,
      awardId: AWARD_IDS.usaceVessel,
      expenseIds: ["Q1 FY26 USACE batch"],
      totalAmount: 30_000,
      status: "payment_received",
      submittedDate: new Date("2026-01-12"),
      approvedDate: new Date("2026-01-22"),
      paymentDate: new Date("2026-02-01"),
      notes: "Q1 FY26 USACE drawdown",
    },
  ];

  for (const dd of drawdowns) {
    await prisma.demoDrawdownRequest.create({ data: dd });
  }

  console.log(`  ✓ ${drawdowns.length} drawdown requests seeded`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 9. SCHEDULED REPORTS
// ═══════════════════════════════════════════════════════════════════════════════

async function seedScheduledReports() {
  console.log("Seeding scheduled reports...");

  const reports = [
    // USCG TMS reports — quarterly SF-425 + progress
    { portId: PORT_ID, awardId: AWARD_IDS.uscgTms, type: "sf425", title: "SF-425 Federal Financial Report — Q1 FY26", dueDate: new Date("2026-01-30"), periodStart: new Date("2025-10-01"), periodEnd: new Date("2025-12-31"), status: "submitted", submittedDate: new Date("2026-01-28"), notes: "Submitted on time" },
    { portId: PORT_ID, awardId: AWARD_IDS.uscgTms, type: "progress", title: "Quarterly Progress Report — Q1 FY26", dueDate: new Date("2026-01-30"), periodStart: new Date("2025-10-01"), periodEnd: new Date("2025-12-31"), status: "submitted", submittedDate: new Date("2026-01-29"), notes: "Cloud migration milestone 1 achieved" },
    { portId: PORT_ID, awardId: AWARD_IDS.uscgTms, type: "sf425", title: "SF-425 Federal Financial Report — Q2 FY26", dueDate: new Date("2026-04-30"), periodStart: new Date("2026-01-01"), periodEnd: new Date("2026-03-31"), status: "in_progress", notes: "Draft in review — financials reconciled" },
    { portId: PORT_ID, awardId: AWARD_IDS.uscgTms, type: "progress", title: "Quarterly Progress Report — Q2 FY26", dueDate: new Date("2026-04-30"), periodStart: new Date("2026-01-01"), periodEnd: new Date("2026-03-31"), status: "drafting", notes: "Technical narrative in preparation" },
    { portId: PORT_ID, awardId: AWARD_IDS.uscgTms, type: "sf425", title: "SF-425 Federal Financial Report — Q3 FY26", dueDate: new Date("2026-07-30"), periodStart: new Date("2026-04-01"), periodEnd: new Date("2026-06-30"), status: "upcoming" },
    { portId: PORT_ID, awardId: AWARD_IDS.uscgTms, type: "progress", title: "Quarterly Progress Report — Q3 FY26", dueDate: new Date("2026-07-30"), periodStart: new Date("2026-04-01"), periodEnd: new Date("2026-06-30"), status: "upcoming" },
    // USACE reports — semi-annual
    { portId: PORT_ID, awardId: AWARD_IDS.usaceVessel, type: "sf425", title: "SF-425 Federal Financial Report — H1 FY26", dueDate: new Date("2026-04-30"), periodStart: new Date("2025-10-01"), periodEnd: new Date("2026-03-31"), status: "in_progress", notes: "First reporting period under new contract" },
    { portId: PORT_ID, awardId: AWARD_IDS.usaceVessel, type: "progress", title: "Semi-Annual Progress Report — H1 FY26", dueDate: new Date("2026-04-30"), periodStart: new Date("2025-10-01"), periodEnd: new Date("2026-03-31"), status: "drafting", notes: "Data feed uptime: 99.97%" },
    { portId: PORT_ID, awardId: AWARD_IDS.usaceVessel, type: "sf425", title: "SF-425 Federal Financial Report — H2 FY26", dueDate: new Date("2026-10-30"), periodStart: new Date("2026-04-01"), periodEnd: new Date("2026-09-30"), status: "upcoming" },
    // Annual SEFA for both
    { portId: PORT_ID, awardId: AWARD_IDS.uscgTms, type: "sefa", title: "Schedule of Expenditures of Federal Awards (SEFA) — FY2025", dueDate: new Date("2026-03-31"), periodStart: new Date("2024-10-01"), periodEnd: new Date("2025-09-30"), status: "submitted", submittedDate: new Date("2026-03-28"), notes: "Included in annual single audit" },
    { portId: PORT_ID, awardId: AWARD_IDS.uscgTms, type: "single_audit", title: "Single Audit Report — FY2025", dueDate: new Date("2026-06-30"), periodStart: new Date("2024-10-01"), periodEnd: new Date("2025-09-30"), status: "in_progress", notes: "External auditor engaged — fieldwork scheduled May 2026" },
  ];

  for (const report of reports) {
    await prisma.demoScheduledReport.create({ data: report });
  }

  console.log(`  ✓ ${reports.length} scheduled reports seeded`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 10. SUBRECIPIENTS
// ═══════════════════════════════════════════════════════════════════════════════

async function seedSubrecipients() {
  console.log("Seeding subrecipients...");

  const subs = [
    {
      portId: PORT_ID,
      awardId: AWARD_IDS.uscgTms,
      entityName: "PVM Inc.",
      uei: "HJ7KLM4NP2Q8",
      classification: "contractor",
      classificationAnswers: [
        { questionId: "q1", answer: false },
        { questionId: "q2", answer: false },
        { questionId: "q3", answer: false },
        { questionId: "q4", answer: false },
        { questionId: "q5", answer: false },
      ],
      riskLevel: "standard",
      riskFactors: { newEntity: false, priorFindings: false, highSpend: true, noSingleAudit: false, lateReporting: false },
      monitoringIntensity: "quarterly",
      subawardAmount: 1_800_000,
      cumulativeSpend: 600_000,
      singleAuditRequired: false,
      status: "active",
    },
    {
      portId: PORT_ID,
      awardId: AWARD_IDS.uscgTms,
      entityName: "Iridium Communications Inc.",
      uei: "RT5VWX9YZ3A1",
      classification: "contractor",
      classificationAnswers: [
        { questionId: "q1", answer: false },
        { questionId: "q2", answer: false },
        { questionId: "q3", answer: false },
        { questionId: "q4", answer: false },
        { questionId: "q5", answer: false },
      ],
      riskLevel: "low",
      riskFactors: { newEntity: false, priorFindings: false, highSpend: false, noSingleAudit: false, lateReporting: false },
      monitoringIntensity: "annual",
      subawardAmount: 500_000,
      cumulativeSpend: 85_000,
      singleAuditRequired: false,
      status: "active",
    },
    {
      portId: PORT_ID,
      awardId: AWARD_IDS.uscgTms,
      entityName: "University of South Florida — College of Marine Science",
      uei: "BC6DEF2GH4J7",
      classification: "subrecipient",
      classificationAnswers: [
        { questionId: "q1", answer: true },
        { questionId: "q2", answer: true },
        { questionId: "q3", answer: true },
        { questionId: "q4", answer: true },
        { questionId: "q5", answer: true },
      ],
      riskLevel: "standard",
      riskFactors: { newEntity: false, priorFindings: false, highSpend: false, noSingleAudit: false, lateReporting: false },
      monitoringIntensity: "quarterly",
      subawardAmount: 350_000,
      cumulativeSpend: 120_000,
      singleAuditRequired: true,
      status: "active",
    },
  ];

  for (const sub of subs) {
    const created = await prisma.demoSubrecipient.create({ data: sub });
    console.log(`  Created: ${sub.entityName} (${sub.classification})`);

    // Add reports for subrecipients
    if (sub.classification === "subrecipient") {
      const reports = [
        { reportType: "financial", title: "Quarterly Financial Report — Q1 FY26", dueDate: new Date("2026-01-30"), status: "received", receivedDate: new Date("2026-01-28") },
        { reportType: "financial", title: "Quarterly Financial Report — Q2 FY26", dueDate: new Date("2026-04-30"), status: "pending", receivedDate: null },
        { reportType: "progress", title: "Semi-Annual Progress Report", dueDate: new Date("2026-04-30"), status: "pending", receivedDate: null },
      ];

      for (const report of reports) {
        await prisma.demoSubrecipientReport.create({
          data: {
            portId: PORT_ID,
            subrecipientId: created.id,
            ...report,
          },
        });
      }
    }
  }

  console.log(`  ✓ ${subs.length} subrecipients seeded`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 11. COMPLIANCE CHECKLISTS
// ═══════════════════════════════════════════════════════════════════════════════

async function seedComplianceChecklists() {
  console.log("Seeding compliance checklists...");

  const templates: Record<string, { title: string; items: { section: string; requirement: string; cfrReference: string }[] }> = {
    cybersecurity: {
      title: "DFARS / CMMC Cybersecurity Compliance",
      items: [
        { section: "Access Control", requirement: "Limit information system access to authorized users", cfrReference: "NIST 800-171 3.1.1" },
        { section: "Access Control", requirement: "Implement multi-factor authentication for network access", cfrReference: "NIST 800-171 3.1.8" },
        { section: "Access Control", requirement: "Encrypt CUI on mobile devices and removable media", cfrReference: "NIST 800-171 3.1.19" },
        { section: "Audit & Accountability", requirement: "Create and retain system audit logs", cfrReference: "NIST 800-171 3.3.1" },
        { section: "Audit & Accountability", requirement: "Correlate audit review and reporting processes", cfrReference: "NIST 800-171 3.3.5" },
        { section: "Incident Response", requirement: "Establish incident handling capabilities", cfrReference: "NIST 800-171 3.6.1" },
        { section: "Incident Response", requirement: "Report cyber incidents to DoD within 72 hours", cfrReference: "DFARS 252.204-7012" },
        { section: "System Integrity", requirement: "Monitor organizational systems for security threats", cfrReference: "NIST 800-171 3.14.6" },
        { section: "System Integrity", requirement: "Implement endpoint protection and malware scanning", cfrReference: "NIST 800-171 3.14.2" },
        { section: "Risk Assessment", requirement: "Conduct periodic risk assessments", cfrReference: "NIST 800-171 3.11.1" },
      ],
    },
    far_compliance: {
      title: "FAR/DFARS Contract Compliance",
      items: [
        { section: "Cost Accounting", requirement: "Maintain compliant cost accounting system per FAR 31", cfrReference: "FAR 31.201" },
        { section: "Cost Accounting", requirement: "Segregate direct and indirect costs appropriately", cfrReference: "FAR 31.202" },
        { section: "Cost Accounting", requirement: "Document indirect cost rate computation methodology", cfrReference: "FAR 42.703" },
        { section: "Procurement", requirement: "Comply with small business subcontracting plan", cfrReference: "FAR 19.702" },
        { section: "Procurement", requirement: "Verify SAM.gov registration of all subcontractors", cfrReference: "FAR 4.1102" },
        { section: "Reporting", requirement: "Submit Contract Funds Status Report (CFSR) as required", cfrReference: "DFARS 252.242-7005" },
        { section: "Reporting", requirement: "Maintain records per FAR 4.703 (3-year retention)", cfrReference: "FAR 4.703" },
        { section: "Ethics", requirement: "Maintain code of business ethics and conduct", cfrReference: "FAR 52.203-13" },
      ],
    },
  };

  const assignments = [
    { awardId: AWARD_IDS.uscgTms, templateKey: "cybersecurity" },
    { awardId: AWARD_IDS.uscgTms, templateKey: "far_compliance" },
    { awardId: AWARD_IDS.usaceVessel, templateKey: "far_compliance" },
  ];

  for (const assignment of assignments) {
    const tmpl = templates[assignment.templateKey];
    const checklist = await prisma.demoComplianceChecklist.create({
      data: {
        portId: PORT_ID,
        awardId: assignment.awardId,
        template: assignment.templateKey,
        title: tmpl.title,
        status: "in_progress",
        completedItems: 0,
        totalItems: tmpl.items.length,
        items: {
          create: tmpl.items.map((item, i) => ({
            portId: PORT_ID,
            section: item.section,
            requirement: item.requirement,
            cfrReference: item.cfrReference,
            sortOrder: i,
          })),
        },
      },
    });

    // Complete 50-70% of items
    const items = await prisma.demoComplianceChecklistItem.findMany({
      where: { checklistId: checklist.id },
      orderBy: { sortOrder: "asc" },
    });

    const completeCount = Math.floor(items.length * (0.5 + Math.random() * 0.2));
    for (let i = 0; i < completeCount; i++) {
      await prisma.demoComplianceChecklistItem.update({
        where: { id: items[i].id },
        data: {
          isCompleted: true,
          completedAt: new Date(Date.now() - Math.random() * 90 * 86400000),
          completedBy: "Ben Minichino",
        },
      });
    }

    await prisma.demoComplianceChecklist.update({
      where: { id: checklist.id },
      data: { completedItems: completeCount },
    });

    console.log(`  Created: ${tmpl.title} (${completeCount}/${tmpl.items.length} done)`);
  }

  console.log(`  ✓ ${assignments.length} compliance checklists seeded`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 12. AUDIT FINDINGS
// ═══════════════════════════════════════════════════════════════════════════════

async function seedAuditFindings() {
  console.log("Seeding audit findings...");

  const findings = [
    {
      portId: PORT_ID,
      awardId: AWARD_IDS.uscgTms,
      auditYear: 2025,
      findingNumber: "2025-001",
      title: "Indirect Cost Rate Variance Not Timely Reconciled",
      description: "During the FY2025 single audit, it was noted that the provisional indirect cost rate applied to USCG billings was not reconciled to actual costs within the required timeframe. The variance was 1.3% ($47,000). Per FAR 42.703-2, provisional rates must be adjusted to actuals within 6 months of fiscal year end.",
      complianceArea: "cost_accounting",
      severity: "finding",
      status: "in_progress",
    },
    {
      portId: PORT_ID,
      awardId: null,
      auditYear: 2024,
      findingNumber: "2024-001",
      title: "Personnel Timekeeping System Lacks Dual Approval",
      description: "The FY2024 audit identified that the electronic timekeeping system used for direct labor cost allocation did not require supervisory approval for timesheet entries charged to federal contracts. While no questioned costs were identified, the absence of dual-approval controls creates risk per FAR 31.201-2(d) and DCAA audit standards.",
      complianceArea: "internal_controls",
      severity: "significant_deficiency",
      status: "resolved",
    },
  ];

  for (const finding of findings) {
    const created = await prisma.demoAuditFinding.create({ data: finding });
    console.log(`  Created: ${finding.findingNumber} — ${finding.title.slice(0, 50)}...`);

    if (finding.status !== "resolved") {
      const caps = [
        { action: "Reconcile FY2025 provisional rate to actual and submit adjustment", responsible: "Ben Minichino", targetDate: "2026-06-30", status: "in_progress" },
        { action: "Implement quarterly rate reconciliation procedure", responsible: "Alex Field", targetDate: "2026-07-31", status: "pending" },
        { action: "Update accounting procedures manual with rate reconciliation timeline", responsible: "Ben Minichino", targetDate: "2026-08-15", status: "pending" },
      ];

      for (const cap of caps) {
        await prisma.demoCorrectiveActionPlan.create({
          data: {
            portId: PORT_ID,
            findingId: created.id,
            action: cap.action,
            responsible: cap.responsible,
            targetDate: new Date(cap.targetDate),
            status: cap.status,
          },
        });
      }
    }
  }

  console.log(`  ✓ ${findings.length} audit findings seeded`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 13. USERS
// ═══════════════════════════════════════════════════════════════════════════════

async function seedUsers() {
  console.log("Seeding users...");

  const users = [
    { email: "drafter@polestar-defense.demo", name: "Sarah Chen", title: "Contracts Accountant", role: "drafter" },
    { email: "reviewer@polestar-defense.demo", name: "Ben Minichino", title: "President, Pole Star Defense", role: "reviewer" },
    { email: "cfo@polestar-defense.demo", name: "Alex Field", title: "Managing Director, Defense", role: "certifying_official" },
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
  console.log("  Seeding Pole Star Defense — Full Profile Data");
  console.log("══════════════════════════════════════════════════════════════\n");

  try {
    await seedPortProfile();
    console.log("");
    await seedProjects();
    console.log("");
    await seedDiscoveredGrants();
    console.log("");
    await seedPipelineGrants();
    console.log("");
    await seedAwards();
    console.log("");
    await seedBudgetCategories();
    console.log("");
    await seedExpenses();
    console.log("");
    await seedDrawdowns();
    console.log("");
    await seedScheduledReports();
    console.log("");
    await seedSubrecipients();
    console.log("");
    await seedComplianceChecklists();
    console.log("");
    await seedAuditFindings();
    console.log("");
    await seedUsers();

    console.log("\n══════════════════════════════════════════════════════════════");
    console.log("  ✓ Pole Star Defense seed complete!");
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
