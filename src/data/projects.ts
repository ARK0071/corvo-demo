/**
 * Project State Management
 *
 * Tracks port infrastructure projects for grant matching and vendor outreach.
 */

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

export function createProject(data: Omit<Project, "id">): Project {
  const project: Project = {
    ...data,
    id: `proj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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
  } else {
    initializePortFreeportDefaults();
  }
}

/**
 * @deprecated Use initializeProjectsForProfile instead
 */
export function initializePortFreeportProjects(): void {
  initializeProjectsForProfile("port-freeport");
}

function initializePortFreeportDefaults(): void {
  const defaults: Omit<Project, "id">[] = [
    {
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
    },
    {
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
    },
    {
      name: "Zero-Emission Equipment Deployment",
      description:
        "Procurement and deployment of zero-emission cargo handling equipment including electric RTG cranes, yard tractors, and shore power systems.",
      projectType: "equipment",
      status: "procurement",
      priority: "high",
      budget: 45_000_000,
      location: "Port-wide",
      startDate: "2025-03-01",
      endDate: "2026-12-31",
      focusAreas: [
        "Zero-emission equipment",
        "Electrification",
        "Shore power",
        "Air quality",
        "Environmental sustainability",
        "Climate change",
      ],
      notes: "RFP for electric RTGs released. EPA Clean Ports application under development.",
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
