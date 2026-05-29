/**
 * Project State Management
 *
 * Tracks port infrastructure projects for grant matching and vendor outreach.
 */

import { louisianaGatewayProjects } from "./louisiana-projects";

export interface ProjectReadiness {
  nepaStatus: "not_started" | "categorical_exclusion" | "ea_in_progress" | "ea_complete" | "eis_in_progress" | "eis_complete" | "record_of_decision";
  nepaDocument?: string;
  nepaCompletionDate?: string;
  designCompletion: number; // 0-100 percentage
  designPhase: "conceptual" | "preliminary" | "final" | "complete";
  permits: { name: string; status: "obtained" | "pending" | "not_required"; date?: string }[];
  rightOfWay: "acquired" | "in_progress" | "not_needed";
  procurementApproach?: string;
  constructionStartTarget?: string;
  shovelReady: boolean;
}

export interface ProjectPastPerformance {
  priorFederalAwards: { program: string; amount: number; year: number; status: "completed_on_time" | "completed_late" | "active" | "closed" }[];
  auditFindings: "none" | "minor" | "significant";
  onTimeCompletion: number; // percentage of past projects completed on time
}

export interface ProjectMetrics {
  jobsCreated?: number;
  jobsRetained?: number;
  tonnageImpact?: number;
  emissionsReduction?: string;
  safetyImpact?: string;
  economicImpact?: string;
  communitiesBenefited?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  projectType: string;
  status: "planning" | "design" | "procurement" | "construction" | "completed" | "on_hold";
  priority: "critical" | "high" | "medium" | "low";
  budget: number;
  location?: string;
  startDate?: string;
  endDate?: string;
  focusAreas: string[];
  notes?: string;
  readiness?: ProjectReadiness;
  pastPerformance?: ProjectPastPerformance;
  metrics?: ProjectMetrics;
  fundingSource?: string;
  costShareSource?: string;
}

// Mutable in-memory project state
const projects: Project[] = [];
let initializedProfileId: string | null = null;

export function getAllProjects(): Project[] {
  return projects;
}

export function getProjectById(id: string): Project | undefined {
  return projects.find((p) => p.id === id);
}

export function createProject(data: Omit<Project, "id"> & { id?: string }): Project {
  const { id: explicitId, ...fields } = data;
  const project: Project = {
    ...fields,
    id: explicitId ?? `proj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  };
  projects.push(project);
  return project;
}

export function updateProject(id: string, data: Partial<Omit<Project, "id">>): Project | null {
  const project = projects.find((p) => p.id === id);
  if (!project) return null;
  Object.assign(project, data);
  return project;
}

export function deleteProject(id: string): boolean {
  const index = projects.findIndex((p) => p.id === id);
  if (index === -1) return false;
  projects.splice(index, 1);
  return true;
}

export function getProjectStats() {
  const totalBudget = projects.reduce((s, p) => s + p.budget, 0);
  const byStatus = {
    planning: projects.filter((p) => p.status === "planning").length,
    design: projects.filter((p) => p.status === "design").length,
    procurement: projects.filter((p) => p.status === "procurement").length,
    construction: projects.filter((p) => p.status === "construction").length,
    completed: projects.filter((p) => p.status === "completed").length,
    on_hold: projects.filter((p) => p.status === "on_hold").length,
  };
  return { total: projects.length, totalBudget, byStatus };
}

/**
 * Initialize projects for a given profile (clears and reloads when profile changes)
 */
export function initializeProjectsForProfile(profileId: string): void {
  if (initializedProfileId === profileId) return;
  // Clear existing projects
  projects.length = 0;
  initializedProfileId = profileId;

  if (profileId === "lawa") {
    initializeLAWAProjects();
  } else if (profileId === "louisiana-gateway-port") {
    louisianaGatewayProjects.forEach((p) => createProject(p));
  } else if (profileId === "port-freeport") {
    initializePortFreeportDefaults();
  }
  // Other profiles (e.g. DB-created entities) start with no projects
}

/**
 * @deprecated Use initializeProjectsForProfile instead
 */
export function initializePortFreeportProjects(): void {
  initializeProjectsForProfile("port-freeport");
}

function initializePortFreeportDefaults(): void {
  /** Must match keys in `src/data/embeddings/project-embeddings.json` for semantic scores. */
  const E = {
    fhcip: "project-1774111453788-5a6f75btg",
    velascoExpansion: "project-1774111453788-qdmjdsjzg",
    velascoAccess: "project-1774111453788-0snae8q68",
    stsCranes: "project-1774111453788-28isn1y16",
    concrete15: "project-1774111453788-c3m885j1l",
    terminalStreet: "project-1774111453788-p9ypwjhd3",
    cathodic: "project-1774111453788-bqeartlx5",
  } as const;

  const defaults: (Omit<Project, "id"> & { id?: string })[] = [
    {
      id: E.fhcip,
      name: "Freeport Harbor Channel Improvement Project (FHCIP)",
      description:
        "Deepening the Freeport Harbor Channel from 46 ft to 56 ft MLLW in partnership with USACE. Enables accommodation of larger Post-Panamax vessels and increases port competitiveness.",
      projectType: "infrastructure",
      status: "construction",
      priority: "critical",
      budget: 295_000_000,
      location: "Freeport Harbor Channel",
      startDate: "2023-06-01",
      endDate: "2027-12-31",
      focusAreas: [
        "Channel deepening",
        "Navigation improvement",
        "Port infrastructure",
        "Economic competitiveness",
        "Freight movement",
      ],
      notes: "USACE partnership. Federal cost-share secured. NEPA Record of Decision obtained.",
      readiness: {
        nepaStatus: "record_of_decision",
        nepaDocument: "Environmental Impact Statement (EIS)",
        nepaCompletionDate: "2022-09-15",
        designCompletion: 100,
        designPhase: "complete",
        permits: [
          { name: "USACE Section 10/404 Permit", status: "obtained", date: "2022-11-01" },
          { name: "TCEQ Water Quality Certification", status: "obtained", date: "2022-10-15" },
          { name: "USCG Bridge Permit", status: "obtained", date: "2023-01-20" },
        ],
        rightOfWay: "acquired",
        procurementApproach: "Design-bid-build, USACE-managed construction contract",
        constructionStartTarget: "2023-06-01",
        shovelReady: true,
      },
      pastPerformance: {
        priorFederalAwards: [
          { program: "USACE Civil Works", amount: 117_000_000, year: 2022, status: "active" },
        ],
        auditFindings: "none",
        onTimeCompletion: 95,
      },
      metrics: {
        jobsCreated: 850,
        jobsRetained: 2400,
        tonnageImpact: 15_000_000,
        emissionsReduction: "Enables larger vessels with lower per-TEU fuel consumption, estimated 18% reduction in vessel emissions per ton of cargo",
        safetyImpact: "Eliminates need for tide-restricted transit of large vessels, reducing collision risk",
        economicImpact: "$3.2B estimated regional economic impact over 20 years",
        communitiesBenefited: "Brazoria County (pop. 388,000), including Freeport, Clute, Lake Jackson, and Angleton",
      },
      fundingSource: "USACE federal appropriation + Port Freeport local match",
      costShareSource: "Port Freeport Series 2024 Revenue Bonds + operating reserves",
    },
    {
      id: E.velascoExpansion,
      name: "Velasco Terminal Phase 2 Expansion",
      description:
        "Expansion of the Velasco Container Terminal including additional berths, container yard, and intermodal rail connections to increase container throughput capacity.",
      projectType: "expansion",
      status: "design",
      priority: "high",
      budget: 180_000_000,
      location: "Velasco Terminal",
      startDate: "2025-01-01",
      endDate: "2028-06-30",
      focusAreas: [
        "Container terminal",
        "Intermodal connectivity",
        "Rail infrastructure",
        "Port expansion",
        "Supply chain",
      ],
      notes: "Preliminary engineering 60% complete.",
      readiness: {
        nepaStatus: "ea_in_progress",
        nepaDocument: "Environmental Assessment (EA)",
        nepaCompletionDate: "2025-09-30",
        designCompletion: 60,
        designPhase: "preliminary",
        permits: [
          { name: "USACE Section 10/404 Permit", status: "pending" },
          { name: "TCEQ Stormwater Permit", status: "pending" },
          { name: "Brazoria County Site Development Permit", status: "obtained", date: "2024-08-15" },
        ],
        rightOfWay: "acquired",
        procurementApproach: "Design-build with GMP, competitive RFP planned Q1 2026",
        constructionStartTarget: "2026-03-01",
        shovelReady: false,
      },
      pastPerformance: {
        priorFederalAwards: [
          { program: "PIDP FY2023", amount: 15_960_000, year: 2023, status: "active" },
          { program: "TxDOT Rider 37", amount: 8_200_000, year: 2022, status: "active" },
        ],
        auditFindings: "none",
        onTimeCompletion: 95,
      },
      metrics: {
        jobsCreated: 1200,
        jobsRetained: 3500,
        tonnageImpact: 8_000_000,
        economicImpact: "$1.8B estimated regional economic impact over 20 years",
        communitiesBenefited: "Brazoria County, greater Houston metro area freight corridor",
      },
      fundingSource: "Federal grant + Port Freeport revenue bonds",
      costShareSource: "Port Freeport Series 2024 Revenue Bonds ($36M authorized)",
    },
    {
      name: "Zero-Emission Equipment Deployment",
      description:
        "Procurement and deployment of zero-emission cargo handling equipment including electric RTG cranes, yard tractors, and shore power systems to improve operational efficiency and energy resilience.",
      projectType: "equipment",
      status: "procurement",
      priority: "high",
      budget: 45_000_000,
      location: "Port-wide",
      startDate: "2025-03-01",
      endDate: "2026-12-31",
      focusAreas: [
        "Energy resilience",
        "Electrification",
        "Shore power",
        "Air quality",
        "Operational efficiency",
        "Equipment modernization",
      ],
      notes: "RFP for electric RTGs released. EPA Clean Ports application under development.",
      readiness: {
        nepaStatus: "categorical_exclusion",
        nepaDocument: "Categorical Exclusion (CE) — equipment replacement on existing facilities",
        designCompletion: 90,
        designPhase: "final",
        permits: [
          { name: "Electrical infrastructure permit", status: "obtained", date: "2025-01-10" },
          { name: "Air quality permit modification", status: "pending" },
        ],
        rightOfWay: "not_needed",
        procurementApproach: "Competitive RFP for equipment + installation, sole source for OEM shore power",
        constructionStartTarget: "2025-06-01",
        shovelReady: true,
      },
      metrics: {
        jobsCreated: 25,
        jobsRetained: 180,
        emissionsReduction: "Estimated 4,200 tons CO2e/year reduction; eliminates 98% of NOx from replaced diesel equipment",
        safetyImpact: "Reduces diesel particulate exposure for 180+ terminal workers",
        communitiesBenefited: "Freeport, Clute, and surrounding environmental justice communities within 1-mile radius of port operations",
      },
    },
    {
      name: "Port Security Enhancement Program",
      description:
        "Upgrades to TWIC-compliant access control, CCTV surveillance network, perimeter intrusion detection, and cybersecurity infrastructure.",
      projectType: "security",
      status: "planning",
      priority: "medium",
      budget: 12_000_000,
      location: "Port-wide",
      focusAreas: [
        "Port security",
        "Cybersecurity",
        "Access control",
        "Surveillance",
        "MTSA compliance",
      ],
    },
    {
      name: "Stormwater and Climate Resilience Infrastructure",
      description:
        "Green infrastructure improvements including bioswales, retention ponds, elevated electrical systems, and hurricane-hardened facilities.",
      projectType: "resilience",
      status: "planning",
      priority: "medium",
      budget: 28_000_000,
      location: "Port-wide",
      focusAreas: [
        "Climate resilience",
        "Stormwater management",
        "Hurricane resilience",
        "Green infrastructure",
        "Flood mitigation",
      ],
    },
    {
      id: E.velascoAccess,
      name: "Velasco Terminal Access & North Gate Entrance",
      description:
        "Construction of new terminal access road and north gate entrance facility to improve traffic flow and reduce congestion at the Velasco Terminal.",
      projectType: "infrastructure",
      status: "construction",
      priority: "high",
      budget: 11_900_000,
      location: "Velasco Terminal",
      startDate: "2024-06-01",
      focusAreas: [
        "Terminal access",
        "Traffic management",
        "Gate infrastructure",
        "Port operations",
      ],
    },
    {
      id: E.stsCranes,
      name: "Super Post-Panamax STS Gantry Cranes (2 units)",
      description:
        "Procurement of two super post-Panamax ship-to-shore gantry cranes for the Velasco Container Terminal to handle larger vessels and increase throughput.",
      projectType: "equipment",
      status: "procurement",
      priority: "critical",
      budget: 50_000_000,
      location: "Velasco Terminal",
      focusAreas: [
        "Container handling",
        "Crane infrastructure",
        "Port modernization",
        "Vessel accommodation",
        "Cargo throughput",
      ],
      notes: "Ordered, delivery expected FY2025. Funded via Series 2024 revenue bonds.",
    },
    {
      id: E.concrete15,
      name: "15-Acre Concrete Storage Area",
      description:
        "Construction of a 15-acre concrete storage area for container and cargo staging, part of the $25.6M combined concrete/street improvement program.",
      projectType: "infrastructure",
      status: "planning",
      priority: "medium",
      budget: 12_800_000,
      location: "Velasco Terminal Area",
      startDate: "2025-01-01",
      focusAreas: [
        "Container storage",
        "Yard expansion",
        "Cargo staging",
        "Port capacity",
      ],
      notes: "Partially grant-funded.",
    },
    {
      id: E.terminalStreet,
      name: "Terminal Access Street Reconstruction",
      description:
        "Reconstruction of terminal access streets to support increased heavy truck traffic from expanded container and RoRo operations.",
      projectType: "infrastructure",
      status: "planning",
      priority: "medium",
      budget: 12_800_000,
      location: "Port-wide",
      startDate: "2025-01-01",
      focusAreas: [
        "Road reconstruction",
        "Heavy vehicle access",
        "Port infrastructure",
        "Freight movement",
      ],
      notes: "Part of $25.6M combined program. Partially grant-funded.",
    },
    {
      id: E.cathodic,
      name: "Cathodic Protection Systems",
      description:
        "Installation and upgrade of cathodic protection systems across port dock infrastructure to prevent corrosion and extend asset lifespan.",
      projectType: "maintenance",
      status: "construction",
      priority: "medium",
      budget: 4_660_000,
      location: "Port-wide",
      focusAreas: [
        "Corrosion prevention",
        "Dock maintenance",
        "Asset preservation",
        "Marine infrastructure",
      ],
      notes: "$241K expended to date. Funded via Series 2024 revenue bonds.",
    },
    {
      name: "Rail-Served Industrial Park Development",
      description:
        "Development of a rail-served industrial park with 40,000 ft of rail tracks, vehicle storage, warehousing, and distribution centers to support intermodal commerce.",
      projectType: "expansion",
      status: "planning",
      priority: "high",
      budget: 75_000_000,
      location: "Port Freeport Industrial Area",
      focusAreas: [
        "Rail infrastructure",
        "Intermodal connectivity",
        "Warehousing",
        "Distribution",
        "Industrial development",
        "Supply chain",
      ],
      notes: "Strategic Initiative #3. Supports efficient commerce movement to Texas/U.S. markets.",
    },
    {
      name: "Portwide Pavement Repairs",
      description:
        "Comprehensive pavement repair and rehabilitation program across all port facilities to maintain safe and efficient operations.",
      projectType: "maintenance",
      status: "construction",
      priority: "medium",
      budget: 4_778_772,
      location: "Port-wide",
      focusAreas: [
        "Pavement repair",
        "Road maintenance",
        "Port operations",
        "Safety",
      ],
      notes: "$4.76M of $4.78M authorized already expended.",
    },
  ];

  defaults.forEach((d) => createProject(d));
}

function initializeLAWAProjects(): void {
  const defaults: Omit<Project, "id">[] = [
    {
      name: "Automated People Mover (APM)",
      description:
        "Electric train system connecting the LAX Central Terminal Area to the Metro K Line, a consolidated rental car facility (ConRAC), and an intermodal transportation facility. 2.25-mile elevated guideway with 6 stations.",
      projectType: "infrastructure",
      status: "construction",
      priority: "critical",
      budget: 4_900_000_000,
      location: "LAX Central Terminal Area",
      startDate: "2019-09-01",
      endDate: "2026-12-31",
      focusAreas: [
        "Ground transportation",
        "Rail transit",
        "Passenger experience",
        "Metro connectivity",
        "Sustainability",
      ],
      notes: "Design-build by LAX Integrated Express Solutions (LINXS). Testing phase underway.",
    },
    {
      name: "Consolidated Rent-A-Car Facility (ConRAC)",
      description:
        "Centralized rental car facility replacing 18 separate off-airport lots. Connected to terminals via APM. Includes 6,200+ ready/return spaces and customer service building.",
      projectType: "infrastructure",
      status: "construction",
      priority: "critical",
      budget: 2_300_000_000,
      location: "LAX – East of Airport",
      startDate: "2019-06-01",
      endDate: "2026-12-31",
      focusAreas: [
        "Ground transportation",
        "Rental car consolidation",
        "Traffic reduction",
        "Passenger convenience",
        "Emissions reduction",
      ],
      notes: "Linked to APM system. Eliminates shuttle bus traffic on airport roadways.",
    },
    {
      name: "Terminal 4 Modernization",
      description:
        "Full renovation of Terminal 4 including new concourse, expanded holdrooms, modern concessions, upgraded mechanical/electrical systems, and improved passenger circulation.",
      projectType: "modernization",
      status: "construction",
      priority: "high",
      budget: 900_000_000,
      location: "LAX Terminal 4",
      startDate: "2022-01-01",
      endDate: "2027-06-30",
      focusAreas: [
        "Terminal modernization",
        "Passenger experience",
        "Concessions",
        "ADA compliance",
        "Energy efficiency",
      ],
      notes: "Phased construction to maintain airline operations during renovation.",
    },
    {
      name: "Power and Utility Distribution Upgrade",
      description:
        "Modernization of LAX electrical infrastructure including new Central Utility Plant, distribution feeders, backup generation, and smart grid systems to support electrification of ground transportation.",
      projectType: "infrastructure",
      status: "design",
      priority: "high",
      budget: 550_000_000,
      location: "LAX Campus-wide",
      startDate: "2023-06-01",
      endDate: "2028-12-31",
      focusAreas: [
        "Electrical infrastructure",
        "Utility modernization",
        "Electrification",
        "Resilience",
        "Smart grid",
      ],
      notes: "Required to support APM, ConRAC, and EV charging infrastructure.",
    },
    {
      name: "Airfield and Terminal Modernization Program (ATMP) Roadways",
      description:
        "Reconfiguration of LAX landside roadways to create a simplified arrivals and departures level, elevated connector roads, and improved curbside management.",
      projectType: "infrastructure",
      status: "design",
      priority: "high",
      budget: 1_200_000_000,
      location: "LAX Central Terminal Area",
      startDate: "2024-01-01",
      endDate: "2029-12-31",
      focusAreas: [
        "Roadway modernization",
        "Traffic flow",
        "Curbside management",
        "Passenger access",
        "Congestion reduction",
      ],
      notes: "Part of broader LAMP (LAX Modernization Program). Environmental clearance obtained.",
    },
    {
      name: "Midfield Satellite Concourse South (MSC South)",
      description:
        "New 12-gate satellite concourse west of the Tom Bradley International Terminal providing additional wide-body aircraft gates and connected via underground tunnel.",
      projectType: "expansion",
      status: "construction",
      priority: "high",
      budget: 1_600_000_000,
      location: "LAX Midfield Area",
      startDate: "2020-03-01",
      endDate: "2026-09-30",
      focusAreas: [
        "Gate expansion",
        "International capacity",
        "Wide-body accommodation",
        "Passenger processing",
        "Concourse development",
      ],
      notes: "Connected to TBIT via underground pedestrian tunnel with moving walkways.",
    },
    {
      name: "Wayfinding and Digital Experience Program",
      description:
        "Comprehensive upgrade of airport wayfinding signage, digital directories, real-time flight information displays, and mobile app integration across all terminals.",
      projectType: "technology",
      status: "procurement",
      priority: "medium",
      budget: 85_000_000,
      location: "LAX All Terminals",
      startDate: "2025-01-01",
      endDate: "2027-06-30",
      focusAreas: [
        "Digital signage",
        "Wayfinding",
        "Passenger experience",
        "Technology integration",
        "ADA accessibility",
      ],
      notes: "Includes multilingual support and integration with LAWA mobile app.",
    },
    {
      name: "Auxiliary Curbside and Pick-up Facility",
      description:
        "New off-terminal pick-up and drop-off lots connected by shuttle to reduce Central Terminal Area congestion. Includes TNC (rideshare) staging and taxi holding areas.",
      projectType: "infrastructure",
      status: "planning",
      priority: "medium",
      budget: 200_000_000,
      location: "LAX – East of Terminals",
      startDate: "2025-06-01",
      endDate: "2028-12-31",
      focusAreas: [
        "Curbside management",
        "Traffic mitigation",
        "Rideshare operations",
        "Ground transportation",
        "Congestion relief",
      ],
      notes: "Coordinates with APM system to provide alternative access points.",
    },
    {
      name: "Terminal 5 Modernization",
      description:
        "Renovation of Terminal 5 including expanded security checkpoint, new holdrooms, updated concessions, improved baggage system, and seismic upgrades.",
      projectType: "modernization",
      status: "planning",
      priority: "medium",
      budget: 750_000_000,
      location: "LAX Terminal 5",
      startDate: "2026-01-01",
      endDate: "2029-12-31",
      focusAreas: [
        "Terminal modernization",
        "Security screening",
        "Seismic resilience",
        "Baggage handling",
        "Concessions",
      ],
      notes: "Planning phase. Sequenced after Terminal 4 modernization.",
    },
    {
      name: "Baggage Optimization and Automation",
      description:
        "Deployment of automated baggage handling systems, RFID tracking, and AI-based sortation to improve bag delivery times and reduce mishandled baggage rates.",
      projectType: "technology",
      status: "design",
      priority: "medium",
      budget: 320_000_000,
      location: "LAX Terminals 1-8 and TBIT",
      startDate: "2024-06-01",
      endDate: "2028-06-30",
      focusAreas: [
        "Baggage handling",
        "Automation",
        "RFID tracking",
        "Operational efficiency",
        "Passenger satisfaction",
      ],
      notes: "Phased rollout starting with TBIT and Terminal 4.",
    },
    {
      name: "Infrastructure Capital Renewal Program",
      description:
        "Ongoing program for airfield pavement rehabilitation, taxiway improvements, runway safety area enhancements, and FAA-mandated infrastructure upgrades.",
      projectType: "infrastructure",
      status: "construction",
      priority: "high",
      budget: 400_000_000,
      location: "LAX Airfield",
      startDate: "2020-01-01",
      endDate: "2030-12-31",
      focusAreas: [
        "Airfield pavement",
        "Runway safety",
        "Taxiway improvements",
        "FAA compliance",
        "Infrastructure renewal",
      ],
      notes: "Annual program with FAA AIP funding. Coordinated with airline operations scheduling.",
    },
    {
      name: "Tom Bradley International Terminal (TBIT) Refresh",
      description:
        "Interior refresh of TBIT including new premium lounge spaces, updated retail/dining, enhanced customs and border protection areas, and improved connecting passenger flows.",
      projectType: "modernization",
      status: "design",
      priority: "medium",
      budget: 450_000_000,
      location: "LAX TBIT",
      startDate: "2025-01-01",
      endDate: "2028-12-31",
      focusAreas: [
        "International terminal",
        "Customs and border protection",
        "Premium lounges",
        "Retail and dining",
        "Connecting passengers",
      ],
      notes: "Coordinated with MSC South opening to manage passenger flows.",
    },
    {
      name: "FAA Airport Improvement Grant Package FY2025-2027",
      description:
        "Bundled FAA AIP-eligible projects including runway rehab, navigational aid upgrades, noise mitigation, and Part 139 compliance work.",
      projectType: "grant_funded",
      status: "planning",
      priority: "high",
      budget: 180_000_000,
      location: "LAX and VNY",
      startDate: "2025-10-01",
      endDate: "2027-09-30",
      focusAreas: [
        "FAA AIP funding",
        "Runway rehabilitation",
        "Noise mitigation",
        "Navigational aids",
        "Part 139 compliance",
      ],
      notes: "Annual AIP entitlement plus discretionary grant applications.",
    },
    {
      name: "Van Nuys Airport (VNY) Taxiway Rehabilitation",
      description:
        "Full-depth reconstruction of Taxiways A and B at Van Nuys Airport including drainage improvements, LED lighting upgrades, and pavement markings to meet FAA standards.",
      projectType: "infrastructure",
      status: "construction",
      priority: "medium",
      budget: 45_000_000,
      location: "Van Nuys Airport (VNY)",
      startDate: "2024-03-01",
      endDate: "2026-06-30",
      focusAreas: [
        "Taxiway rehabilitation",
        "Airfield pavement",
        "LED lighting",
        "Drainage improvement",
        "FAA standards",
      ],
      notes: "Partially funded through FAA AIP. Night construction to minimize operational impact.",
    },
    {
      name: "Sustainability and Net-Zero Emissions Program",
      description:
        "Comprehensive sustainability initiative including solar panel installation, EV charging infrastructure, sustainable aviation fuel (SAF) partnerships, and carbon offset programs targeting net-zero by 2045.",
      projectType: "sustainability",
      status: "planning",
      priority: "high",
      budget: 250_000_000,
      location: "LAX and VNY Campus-wide",
      startDate: "2024-01-01",
      endDate: "2045-12-31",
      focusAreas: [
        "Sustainability",
        "Net-zero emissions",
        "Solar energy",
        "EV charging",
        "Sustainable aviation fuel",
        "Carbon reduction",
      ],
      notes: "Aligned with City of LA Green New Deal and LAWA Sustainability Action Plan.",
    },
  ];

  defaults.forEach((d) => createProject(d));
}
