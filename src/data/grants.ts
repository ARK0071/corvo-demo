export interface GrantProgram {
  id: string;
  name: string;
  shortName: string;
  agency: string;
  description: string;
  totalFunding: number;
  minAward: number;
  maxAward: number;
  matchRequirement: number; // e.g. 0.20 = 20% local match required
  eligibleActivities: string[];
  deadline: string;
  status: "open" | "upcoming" | "closed";
  applicationUrl: string;
  focusAreas: string[];
}

const grantPrograms: GrantProgram[] = [
  {
    id: "grant-01",
    name: "Port Infrastructure Development Program",
    shortName: "PIDP",
    agency: "U.S. Department of Transportation (USDOT)",
    description: "Competitive discretionary grant program to fund improvements at coastal seaports, inland river ports, and Great Lakes ports. Supports projects that improve safety, efficiency, and reliability of goods movement.",
    totalFunding: 662_000_000,
    minAward: 1_000_000,
    maxAward: 100_000_000,
    matchRequirement: 0.20,
    eligibleActivities: [
      "Wharf and dock rehabilitation",
      "Intermodal connector improvements",
      "Port electrification and zero-emission equipment",
      "Gate and terminal technology systems",
      "Freight rail access improvements",
      "Berth deepening and channel improvements",
      "Stormwater management and environmental mitigation",
    ],
    deadline: "2025-06-13",
    status: "open",
    applicationUrl: "https://www.maritime.dot.gov/PIDPgrants",
    focusAreas: ["port infrastructure", "intermodal connectivity", "zero-emission equipment", "climate resilience"],
  },
  {
    id: "grant-02",
    name: "Clean Ports Program",
    shortName: "EPA Clean Ports",
    agency: "U.S. Environmental Protection Agency (EPA)",
    description: "Provides funding for zero-emission port equipment and infrastructure, reducing diesel emissions and improving air quality in port-adjacent communities under the Inflation Reduction Act.",
    totalFunding: 3_000_000_000,
    minAward: 5_000_000,
    maxAward: 500_000_000,
    matchRequirement: 0,
    eligibleActivities: [
      "Zero-emission cargo handling equipment",
      "Electric vehicle charging infrastructure",
      "Shore power (cold ironing) systems",
      "Hydrogen fueling infrastructure",
      "Battery-electric drayage trucks",
      "Electric yard tractors and forklifts",
      "Climate and air quality monitoring",
    ],
    deadline: "2025-09-30",
    status: "open",
    applicationUrl: "https://www.epa.gov/ports-initiative/cleanports",
    focusAreas: ["zero-emission", "electrification", "air quality", "environmental justice"],
  },
  {
    id: "grant-03",
    name: "Rebuilding American Infrastructure with Sustainability and Equity",
    shortName: "RAISE",
    agency: "U.S. Department of Transportation (USDOT)",
    description: "Invests in road, rail, transit, and port projects that have significant local or regional impact. Emphasizes safety, environmental sustainability, equity, and economic competitiveness.",
    totalFunding: 1_500_000_000,
    minAward: 5_000_000,
    maxAward: 45_000_000,
    matchRequirement: 0.20,
    eligibleActivities: [
      "Highway and bridge projects",
      "Public transit improvements",
      "Passenger and freight rail",
      "Port and intermodal facilities",
      "Surface transportation infrastructure",
      "Planning and design for capital projects",
    ],
    deadline: "2025-04-14",
    status: "open",
    applicationUrl: "https://www.transportation.gov/raise",
    focusAreas: ["multimodal", "equity", "sustainability", "economic competitiveness"],
  },
  {
    id: "grant-04",
    name: "Infrastructure for Rebuilding America",
    shortName: "INFRA",
    agency: "U.S. Department of Transportation (USDOT)",
    description: "Provides dedicated, discretionary funding for projects of national and regional significance that address critical freight and highway infrastructure needs.",
    totalFunding: 1_550_000_000,
    minAward: 5_000_000,
    maxAward: 200_000_000,
    matchRequirement: 0.40,
    eligibleActivities: [
      "Highway freight projects",
      "Highway or bridge projects on the NHS",
      "Intermodal or rail freight projects",
      "Railway-highway grade crossing projects",
      "Marine highway corridor projects",
    ],
    deadline: "2025-08-04",
    status: "open",
    applicationUrl: "https://www.transportation.gov/grants/infra-grants-program",
    focusAreas: ["freight", "national significance", "highway", "intermodal"],
  },
  {
    id: "grant-05",
    name: "National Infrastructure Project Assistance",
    shortName: "MEGA",
    agency: "U.S. Department of Transportation (USDOT)",
    description: "Funds large, complex projects that are difficult to fund by other means and generate national or regional economic, mobility, and safety benefits.",
    totalFunding: 2_000_000_000,
    minAward: 100_000_000,
    maxAward: 500_000_000,
    matchRequirement: 0.40,
    eligibleActivities: [
      "Large-scale surface transportation projects",
      "Major bridge reconstruction",
      "Freight hub and corridor projects",
      "Port-to-rail intermodal connectors",
      "Complex multimodal projects",
    ],
    deadline: "2025-10-01",
    status: "upcoming",
    applicationUrl: "https://www.transportation.gov/grants/mega-grant-program",
    focusAreas: ["mega projects", "multimodal", "economic impact", "regional significance"],
  },
  {
    id: "grant-06",
    name: "Water Infrastructure Finance and Innovation Act",
    shortName: "WIFIA",
    agency: "U.S. Army Corps of Engineers",
    description: "Provides long-term, low-cost supplemental credit assistance for regionally and nationally significant water infrastructure projects, including port-related water and flood control projects.",
    totalFunding: 5_000_000_000,
    minAward: 20_000_000,
    maxAward: 1_000_000_000,
    matchRequirement: 0.51,
    eligibleActivities: [
      "Navigation channel deepening and widening",
      "Flood risk management",
      "Water supply infrastructure",
      "Storm damage reduction",
      "Aquatic ecosystem restoration",
      "Dam safety and rehabilitation",
    ],
    deadline: "2025-12-31",
    status: "upcoming",
    applicationUrl: "https://www.epa.gov/wifia",
    focusAreas: ["water infrastructure", "navigation", "flood control", "resilience"],
  },
  {
    id: "grant-07",
    name: "Building Resilient Infrastructure and Communities",
    shortName: "BRIC",
    agency: "Federal Emergency Management Agency (FEMA)",
    description: "Supports states, local communities, tribes, and territories in proactive hazard mitigation projects, reducing risks from disasters and natural hazards.",
    totalFunding: 1_000_000_000,
    minAward: 1_000_000,
    maxAward: 50_000_000,
    matchRequirement: 0.25,
    eligibleActivities: [
      "Flood control and sea wall construction",
      "Hurricane-hardening of port facilities",
      "Stormwater management systems",
      "Building code adoption and enforcement",
      "Hazard mitigation planning",
      "Nature-based solutions for coastal resilience",
    ],
    deadline: "2025-03-28",
    status: "open",
    applicationUrl: "https://www.fema.gov/grants/mitigation/building-resilient-infrastructure-communities",
    focusAreas: ["hazard mitigation", "resilience", "flood control", "climate adaptation"],
  },
  {
    id: "grant-08",
    name: "Port Security Grant Program",
    shortName: "PSGP",
    agency: "Federal Emergency Management Agency (FEMA)",
    description: "Provides funding to protect critical port infrastructure from terrorism and other threats. Supports enhanced maritime domain awareness, cybersecurity, and physical security measures.",
    totalFunding: 100_000_000,
    minAward: 100_000,
    maxAward: 5_000_000,
    matchRequirement: 0.25,
    eligibleActivities: [
      "Maritime domain awareness systems",
      "Cybersecurity enhancements",
      "Access control and perimeter security",
      "TWIC reader installations",
      "Surveillance and detection systems",
      "Emergency response equipment",
      "Training and exercise programs",
    ],
    deadline: "2025-05-15",
    status: "open",
    applicationUrl: "https://www.fema.gov/grants/preparedness/port-security",
    focusAreas: ["security", "cybersecurity", "surveillance", "emergency response"],
  },
  {
    id: "grant-09",
    name: "Clean Energy Manufacturing and Deployment",
    shortName: "DOE Clean Energy",
    agency: "U.S. Department of Energy (DOE)",
    description: "Supports deployment of clean energy technologies at ports and industrial facilities, including microgrids, battery storage, and renewable energy systems.",
    totalFunding: 750_000_000,
    minAward: 2_000_000,
    maxAward: 75_000_000,
    matchRequirement: 0.50,
    eligibleActivities: [
      "Solar and wind installations at port facilities",
      "Battery energy storage systems",
      "Microgrid development",
      "Green hydrogen production",
      "Waste heat recovery systems",
      "Smart grid integration",
    ],
    deadline: "2025-07-18",
    status: "open",
    applicationUrl: "https://www.energy.gov/clean-energy-manufacturing",
    focusAreas: ["clean energy", "microgrids", "battery storage", "hydrogen"],
  },
  {
    id: "grant-10",
    name: "Diesel Emissions Reduction Act",
    shortName: "DERA",
    agency: "U.S. Environmental Protection Agency (EPA)",
    description: "Provides funding to reduce emissions from existing diesel engines through verified technologies, replacements, and alternative fuel conversions.",
    totalFunding: 100_000_000,
    minAward: 200_000,
    maxAward: 6_000_000,
    matchRequirement: 0,
    eligibleActivities: [
      "Diesel engine replacement with Tier 4 or zero-emission",
      "Diesel retrofit technologies (DPF, DOC, SCR)",
      "Alternative fuel conversions",
      "Idle reduction technologies",
      "Drayage truck replacement",
      "Marine vessel repowering",
    ],
    deadline: "2025-05-01",
    status: "open",
    applicationUrl: "https://www.epa.gov/dera",
    focusAreas: ["diesel emissions", "engine replacement", "air quality", "drayage"],
  },
  {
    id: "grant-11",
    name: "Public Works and Economic Development Program",
    shortName: "EDA Public Works",
    agency: "Economic Development Administration (EDA)",
    description: "Empowers distressed communities to revitalize, expand, and upgrade their physical infrastructure to support regional economic development.",
    totalFunding: 300_000_000,
    minAward: 500_000,
    maxAward: 30_000_000,
    matchRequirement: 0.20,
    eligibleActivities: [
      "Port facility modernization",
      "Industrial park development",
      "Technology infrastructure",
      "Workforce development facilities",
      "Water and sewer systems supporting port operations",
      "Broadband and telecommunications infrastructure",
    ],
    deadline: "2025-11-30",
    status: "upcoming",
    applicationUrl: "https://www.eda.gov/funding/programs/public-works",
    focusAreas: ["economic development", "job creation", "distressed communities", "infrastructure modernization"],
  },
  {
    id: "grant-12",
    name: "Small Shipyard Grant Program",
    shortName: "MARAD Shipyard",
    agency: "Maritime Administration (MARAD)",
    description: "Assists qualified shipyard facilities with capital improvements and maritime training to foster efficiency and competitiveness in the U.S. shipbuilding industry.",
    totalFunding: 40_000_000,
    minAward: 100_000,
    maxAward: 10_000_000,
    matchRequirement: 0.25,
    eligibleActivities: [
      "Shipyard equipment modernization",
      "Drydock upgrades and repairs",
      "Marine railway improvements",
      "Workforce training programs",
      "Environmental compliance upgrades",
      "Crane and heavy-lift capacity additions",
    ],
    deadline: "2025-04-30",
    status: "open",
    applicationUrl: "https://www.maritime.dot.gov/grants-finances/small-shipyard-grants",
    focusAreas: ["shipyard", "maritime workforce", "shipbuilding", "equipment modernization"],
  },
];

export const grants = grantPrograms;

export function getGrantById(id: string): GrantProgram | undefined {
  return grants.find((g) => g.id === id);
}

export function getGrantsByAgency(agency: string): GrantProgram[] {
  const q = agency.toLowerCase();
  return grants.filter((g) => g.agency.toLowerCase().includes(q));
}

export function getGrantsByFocusArea(focusArea: string): GrantProgram[] {
  const q = focusArea.toLowerCase();
  return grants.filter((g) => g.focusAreas.some((f) => f.toLowerCase().includes(q)));
}

export function getActiveGrants(): GrantProgram[] {
  return grants.filter((g) => g.status === "open");
}

export function getUpcomingGrants(): GrantProgram[] {
  return grants.filter((g) => g.status === "upcoming");
}

export function searchGrants(query: string): GrantProgram[] {
  const q = query.toLowerCase();
  return grants.filter(
    (g) =>
      g.name.toLowerCase().includes(q) ||
      g.shortName.toLowerCase().includes(q) ||
      g.agency.toLowerCase().includes(q) ||
      g.description.toLowerCase().includes(q) ||
      g.focusAreas.some((f) => f.toLowerCase().includes(q)) ||
      g.eligibleActivities.some((a) => a.toLowerCase().includes(q))
  );
}

let nextId = grantPrograms.length + 1;

export function getNextGrantId(): string {
  return `grant-${String(nextId).padStart(2, "0")}`;
}

export function addGrant(grant: GrantProgram): void {
  grantPrograms.push(grant);
  nextId++;
}
