/**
 * Extended Entity Profile for Grant Application Drafting
 *
 * Rich data about the applicant entity used to populate grant applications.
 * This goes beyond the basic PortProfile to include financials, past awards,
 * infrastructure details, economic impact, and community data needed for
 * federal grant prose.
 */

export interface EntityProfile {
  name: string;
  legalName: string;
  entityType: string;
  classification: string;
  uei: string;
  ein: string;

  location: {
    city: string;
    state: string;
    stateCode: string;
    county: string;
    region: string;
    congressionalDistrict: string;
  };

  leadership: {
    executiveDirector: string;
    cfo: string;
    boardChair: string;
  };

  financials: {
    annualRevenue: number;
    operatingBudget: number;
    capitalBudget: number;
    bondRating: string;
    matchFundingCapacity: number;
    totalAssets: number;
  };

  infrastructure: {
    terminalFacilities: string[];
    channelDepth: number;
    channelWidth: number;
    berths: number;
    railConnections: string[];
    acreage: number;
  };

  operations: {
    annualTonnage: number;
    annualTEUs: number;
    vesselCalls: number;
    employeeCount: number;
    directJobs: number;
    cargoTypes: string[];
  };

  economicImpact: {
    regionalEconomicImpact: number;
    directJobs: number;
    totalJobs: number;
    tradeValue: number;
    annualTaxRevenue: number;
  };

  currentProjects: {
    name: string;
    description: string;
    totalCost: number;
    status: string;
    partnerAgencies: string[];
  }[];

  pastGrantAwards: {
    program: string;
    awardYear: number;
    awardAmount: number;
    projectName: string;
    agency: string;
    status: string;
  }[];

  certifications: string[];
  strategicPriorities: string[];
  environmentalGoals: string[];
  communityImpact: string[];

  disadvantagedCommunityData: {
    description: string;
    povertyRate: number;
    pm25Percentile: number;
    justiceFortyTracker: boolean;
    censusTract: string;
  };

  climateResilienceData: {
    floodZone: string;
    hurricaneExposure: string;
    emissionsBaseline: string;
    emissionsReductionTarget: string;
    existingMitigations: string[];
    plannedMitigations: string[];
  };
}

/**
 * Port Freeport — Full Entity Profile
 */
export const PORT_FREEPORT_ENTITY: EntityProfile = {
  name: "Port Freeport",
  legalName: "Brazoria County Navigation District No. 1 d/b/a Port Freeport",
  entityType: "Special district government",
  classification: "Public Port Authority",
  uei: "EXAMPLE1234567",
  ein: "74-6000000",

  location: {
    city: "Freeport",
    state: "Texas",
    stateCode: "TX",
    county: "Brazoria County",
    region: "Gulf Coast",
    congressionalDistrict: "TX-14",
  },

  leadership: {
    executiveDirector: "Phyllis Saathoff",
    cfo: "John Hoss",
    boardChair: "Shane Pirtle",
  },

  financials: {
    annualRevenue: 30_000_000,
    operatingBudget: 50_000_000,
    capitalBudget: 120_000_000,
    bondRating: "A+ (S&P)",
    matchFundingCapacity: 80_000_000,
    totalAssets: 450_000_000,
  },

  infrastructure: {
    terminalFacilities: [
      "Velasco Terminal — Container and general cargo, 2 berths, 500,000 TEU capacity",
      "Parcel Terminal — Bulk and breakbulk cargo, 4 berths",
      "Liquid Cargo Dock — Chemical and petroleum product transfers",
      "Phillips 66/Freeport LNG — Adjacent private terminals with shared channel",
    ],
    channelDepth: 46,
    channelWidth: 400,
    berths: 8,
    railConnections: [
      "BNSF Railway — direct rail access to Velasco Terminal",
      "Union Pacific — interchange via BNSF connection",
      "SH 36 corridor — dedicated port access road",
    ],
    acreage: 250,
  },

  operations: {
    annualTonnage: 30_000_000,
    annualTEUs: 95_000,
    vesselCalls: 1_200,
    employeeCount: 50,
    directJobs: 2_400,
    cargoTypes: [
      "Containerized cargo",
      "Dry bulk (aggregates, cement, salt)",
      "Liquid bulk (chemicals, petroleum)",
      "Breakbulk and project cargo",
      "LNG (adjacent Freeport LNG facility)",
    ],
  },

  economicImpact: {
    regionalEconomicImpact: 5_800_000_000,
    directJobs: 2_400,
    totalJobs: 25_000,
    tradeValue: 28_000_000_000,
    annualTaxRevenue: 95_000_000,
  },

  currentProjects: [
    {
      name: "Freeport Harbor Channel Improvement Project (FHCIP)",
      description:
        "Deepening the Freeport Harbor Channel from 46 ft to 56 ft MLLW, widening select reaches, and extending the channel to accommodate Post-Panamax vessels. Federal-local cost-share project with USACE Galveston District.",
      totalCost: 295_000_000,
      status: "Under construction — Phase 1 dredging underway",
      partnerAgencies: ["U.S. Army Corps of Engineers (USACE) — Galveston District"],
    },
    {
      name: "Velasco Terminal Phase 2 Expansion",
      description:
        "Expansion of the Velasco Container Terminal including 2 additional berths, 40-acre container yard expansion, new intermodal rail facility, and upgraded crane infrastructure to increase capacity to 800,000 TEU.",
      totalCost: 180_000_000,
      status: "Design — 60% engineering complete",
      partnerAgencies: ["BNSF Railway"],
    },
    {
      name: "Zero-Emission Equipment Deployment Program",
      description:
        "Procurement of 8 electric RTG cranes, 20 electric yard tractors, shore power systems for 4 berths, and on-site battery storage and charging infrastructure.",
      totalCost: 45_000_000,
      status: "Procurement — RFP for electric RTGs released",
      partnerAgencies: ["EPA Region 6", "Texas Commission on Environmental Quality"],
    },
  ],

  pastGrantAwards: [
    {
      program: "PIDP",
      awardYear: 2021,
      awardAmount: 22_000_000,
      projectName: "Velasco Terminal Phase 1 — Crane and Berth Improvements",
      agency: "MARAD",
      status: "Completed",
    },
    {
      program: "Port Security Grant Program (PSGP)",
      awardYear: 2020,
      awardAmount: 1_200_000,
      projectName: "Surveillance and Access Control Modernization",
      agency: "FEMA",
      status: "Completed",
    },
    {
      program: "PSGP",
      awardYear: 2022,
      awardAmount: 850_000,
      projectName: "Cybersecurity Infrastructure Enhancement",
      agency: "FEMA",
      status: "Completed",
    },
    {
      program: "RAISE",
      awardYear: 2023,
      awardAmount: 15_000_000,
      projectName: "Intermodal Rail Connectivity — Velasco Terminal Rail Spur",
      agency: "USDOT",
      status: "In progress",
    },
  ],

  certifications: [
    "Green Marine Environmental Certification (Level 3)",
    "ISO 14001 Environmental Management System",
    "OSHA Voluntary Protection Program — Star Site",
    "C-TPAT Partner",
    "MTSA-compliant Facility Security Plan",
  ],

  strategicPriorities: [
    "Complete FHCIP channel deepening to 56 ft by 2027",
    "Double container throughput capacity via Velasco Phase 2",
    "Achieve 50% emissions reduction by 2030 (2019 baseline)",
    "Strengthen intermodal rail connections for inland freight access",
    "Enhance climate resilience for hurricane and flood preparedness",
    "Expand workforce development and local hire programs",
    "Maintain competitive position as Gulf Coast deep-water gateway",
  ],

  environmentalGoals: [
    "Transition to 100% zero-emission cargo handling equipment by 2035",
    "Install shore power at all berths by 2028",
    "Reduce port-related PM2.5 and NOx emissions by 60% (2019 baseline)",
    "Implement green stormwater infrastructure across all facilities",
    "Achieve carbon neutrality in Scope 1 and 2 emissions by 2040",
  ],

  communityImpact: [
    "Workforce Development Center — annual training for 200+ local workers in maritime logistics, heavy equipment, and safety certifications",
    "Port Freeport Scholarship Program — $500K annual scholarships to Brazoria County students",
    "Community Advisory Panel — quarterly meetings with Freeport, Quintana, and Jones Creek residents",
    "Local First Procurement Policy — 35% of operating spend directed to Brazoria County businesses",
    "Environmental Justice Initiative — community air quality monitoring at 6 fence-line stations",
  ],

  disadvantagedCommunityData: {
    description:
      "Adjacent census tracts (48039-7101, 7102, 7103) in Freeport, TX qualify as disadvantaged under CEJST and EJScreen. The area has elevated environmental burden indicators and below-median income levels.",
    povertyRate: 18.7,
    pm25Percentile: 82,
    justiceFortyTracker: true,
    censusTract: "48039-7101, 48039-7102, 48039-7103",
  },

  climateResilienceData: {
    floodZone: "AE (100-year coastal flood zone)",
    hurricaneExposure: "High — Category 3+ hurricane return period approximately 15 years. Facility directly impacted by Hurricane Harvey (2017).",
    emissionsBaseline: "42,000 metric tons CO2e (2019 baseline — Scope 1 and 2)",
    emissionsReductionTarget: "50% reduction by 2030; carbon neutrality by 2040",
    existingMitigations: [
      "Hurricane preparedness and evacuation plan (updated annually)",
      "Seawall and bulkhead elevation at Velasco Terminal",
      "Backup generator system for critical operations",
      "Elevated electrical infrastructure at new berths",
    ],
    plannedMitigations: [
      "Green infrastructure — 15-acre bioswale and retention system",
      "Elevation of remaining electrical systems above 500-year flood level",
      "Living shoreline pilot along Brazos River entrance",
      "Resilient pavement and drainage upgrades across container yard",
    ],
  },
};
