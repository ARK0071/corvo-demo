/**
 * USDOT Grant Awards Database
 *
 * Historical awards across USDOT discretionary grant programs:
 * - PIDP (Port Infrastructure Development Program)
 * - RAISE (Rebuilding American Infrastructure with Sustainability and Equity)
 * - INFRA (Infrastructure for Rebuilding America)
 * - MEGA (Multimodal Project Discretionary Grant)
 * - BUILD (Better Utilizing Investments to Leverage Development) - historical
 *
 * Used for competitive intelligence and scoring calibration.
 */

export interface USDOTAward {
  program: string;
  programCode: string;
  recipient: string;
  project: string;
  amount: number;
  federalShare: number; // Percentage (0-100)
  location: {
    state: string;
    city?: string;
    county?: string;
  };
  year: number;
  projectType?: string;
  focusAreas?: string[];
}

/**
 * Historical USDOT grant awards
 * Data sourced from USDOT published award announcements and USAspending.gov
 */
export const USDOT_AWARDS: USDOTAward[] = [
  // PIDP Awards (sample - see marad-pidp-awards.ts for more)
  {
    program: "Port Infrastructure Development Program",
    programCode: "PIDP",
    recipient: "Port of Long Beach",
    project: "Terminal Expansion and Zero-Emission Equipment",
    amount: 52_000_000,
    federalShare: 80,
    location: { state: "CA", city: "Long Beach" },
    year: 2024,
    projectType: "Terminal Expansion",
    focusAreas: ["zero-emission", "terminal expansion"],
  },
  // RAISE Awards
  {
    program: "Rebuilding American Infrastructure with Sustainability and Equity",
    programCode: "RAISE",
    recipient: "Port of Mobile",
    project: "Intermodal Facility and Rail Improvements",
    amount: 25_000_000,
    federalShare: 80,
    location: { state: "AL", city: "Mobile" },
    year: 2024,
    projectType: "Intermodal Connectivity",
    focusAreas: ["rail infrastructure", "intermodal"],
  },
  {
    program: "Rebuilding American Infrastructure with Sustainability and Equity",
    programCode: "RAISE",
    recipient: "Port of Tacoma",
    project: "Terminal Access Road Improvements",
    amount: 18_000_000,
    federalShare: 80,
    location: { state: "WA", city: "Tacoma" },
    year: 2023,
    projectType: "Road Infrastructure",
    focusAreas: ["road infrastructure", "access improvements"],
  },
  // INFRA Awards
  {
    program: "Infrastructure for Rebuilding America",
    programCode: "INFRA",
    recipient: "Port of Los Angeles",
    project: "Alameda Corridor Improvements",
    amount: 30_000_000,
    federalShare: 80,
    location: { state: "CA", city: "Los Angeles" },
    year: 2024,
    projectType: "Freight Corridor",
    focusAreas: ["freight corridor", "rail infrastructure"],
  },
  {
    program: "Infrastructure for Rebuilding America",
    programCode: "INFRA",
    recipient: "Port of Houston",
    project: "Highway 225 Freight Corridor",
    amount: 28_000_000,
    federalShare: 80,
    location: { state: "TX", city: "Houston" },
    year: 2023,
    projectType: "Freight Corridor",
    focusAreas: ["freight corridor", "highway infrastructure"],
  },
  // MEGA Awards
  {
    program: "Multimodal Project Discretionary Grant",
    programCode: "MEGA",
    recipient: "Port of New York and New Jersey",
    project: "Port Authority Comprehensive Modernization",
    amount: 150_000_000,
    federalShare: 60,
    location: { state: "NJ", city: "Newark" },
    year: 2024,
    projectType: "Comprehensive Modernization",
    focusAreas: ["terminal modernization", "multimodal"],
  },
];

/**
 * Get awards by program
 */
export function getAwardsByProgram(programCode: string): USDOTAward[] {
  return USDOT_AWARDS.filter((award) => award.programCode === programCode);
}

/**
 * Get awards by year
 */
export function getAwardsByYear(year: number): USDOTAward[] {
  return USDOT_AWARDS.filter((award) => award.year === year);
}

/**
 * Get awards by state
 */
export function getAwardsByState(state: string): USDOTAward[] {
  return USDOT_AWARDS.filter((award) => award.location.state === state);
}

/**
 * Get awards by project type
 */
export function getAwardsByProjectType(projectType: string): USDOTAward[] {
  return USDOT_AWARDS.filter((award) => award.projectType === projectType);
}

/**
 * Get USDOT award statistics
 */
export function getUSDOTAwardStats() {
  return {
    totalAwards: USDOT_AWARDS.length,
    totalFunding: USDOT_AWARDS.reduce((sum, award) => sum + award.amount, 0),
    averageAward: USDOT_AWARDS.length > 0
      ? USDOT_AWARDS.reduce((sum, award) => sum + award.amount, 0) / USDOT_AWARDS.length
      : 0,
    byProgram: USDOT_AWARDS.reduce((acc, award) => {
      acc[award.programCode] = (acc[award.programCode] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    byYear: USDOT_AWARDS.reduce((acc, award) => {
      acc[award.year] = (acc[award.year] || 0) + 1;
      return acc;
    }, {} as Record<number, number>),
    byState: USDOT_AWARDS.reduce((acc, award) => {
      const state = award.location.state;
      acc[state] = (acc[state] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  };
}
