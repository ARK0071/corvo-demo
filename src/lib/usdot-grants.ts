/**
 * USDOT Grant Programs Integration
 *
 * Pulls grant opportunities from US Department of Transportation programs
 * that are relevant to port authorities:
 * - PIDP (Port Infrastructure Development Program)
 * - RAISE (Rebuilding American Infrastructure with Sustainability and Equity)
 * - INFRA (Infrastructure for Rebuilding America)
 * - MEGA (Multimodal Project Discretionary Grant)
 * - BUILD (Better Utilizing Investments to Leverage Development) - historical
 */

import type { DiscoveredGrant } from "./grants-gov";

// USDOT grant programs of interest to ports
export const USDOT_PROGRAMS = {
  PIDP: {
    name: "Port Infrastructure Development Program",
    agency: "DOT-MARAD",
    agencyCode: "DOT",
    alnNumber: "20.823",
    typical_funding: 450_000_000,
    typical_ceiling: 112_500_000,
    typical_floor: 1_000_000,
    match_required: true,
    match_rate: 0.2, // 20% local match
    eligibility: [
      "State governments",
      "Local governments",
      "Special district governments",
      "Port authorities",
    ],
    focus_areas: [
      "Port infrastructure development",
      "Port capacity expansion",
      "Intermodal connectivity",
      "Terminal modernization",
      "Marine highway projects",
    ],
  },
  RAISE: {
    name: "Rebuilding American Infrastructure with Sustainability and Equity",
    agency: "DOT-OST",
    agencyCode: "DOT",
    typical_funding: 1_500_000_000,
    typical_ceiling: 25_000_000,
    typical_floor: 1_000_000,
    match_required: true,
    match_rate: 0.2,
    eligibility: [
      "State governments",
      "Local governments",
      "Tribal governments",
      "Port authorities",
      "MPOs",
    ],
    focus_areas: [
      "Surface transportation",
      "Freight infrastructure",
      "Intermodal connections",
      "Economic competitiveness",
      "Climate change and resilience",
      "Equity and environmental justice",
    ],
  },
  INFRA: {
    name: "Infrastructure for Rebuilding America",
    agency: "DOT-FHWA",
    agencyCode: "DOT",
    typical_funding: 1_800_000_000,
    typical_ceiling: 100_000_000,
    typical_floor: 5_000_000,
    match_required: true,
    match_rate: 0.2,
    eligibility: [
      "State governments",
      "Local governments",
      "Political subdivisions",
      "Port authorities",
      "Tribal governments",
    ],
    focus_areas: [
      "Highway and bridge projects",
      "Freight intermodal projects",
      "Railway-highway grade crossings",
      "Freight projects on the National Highway Freight Network",
    ],
  },
  MEGA: {
    name: "Multimodal Project Discretionary Grant",
    agency: "DOT-OST",
    agencyCode: "DOT",
    typical_funding: 1_000_000_000,
    typical_ceiling: 100_000_000,
    typical_floor: 5_000_000,
    match_required: true,
    match_rate: 0.2,
    eligibility: [
      "State governments",
      "Local governments",
      "Political subdivisions",
      "Port authorities",
      "Transit agencies",
    ],
    focus_areas: [
      "Multimodal freight infrastructure",
      "Passenger transportation",
      "Supply chain efficiency",
      "Economic vitality",
    ],
  },
};

/**
 * Search USDOT grants via Grants.gov with DOT-specific filters
 */
export async function searchUSDOTGrants(params: {
  programs?: Array<keyof typeof USDOT_PROGRAMS>;
  status?: "posted" | "forecasted" | "all";
}): Promise<DiscoveredGrant[]> {
  const { programs, status = "all" } = params;

  // Build search queries for each program
  const searches: Promise<DiscoveredGrant[]>[] = [];

  const programsToSearch = programs || (Object.keys(USDOT_PROGRAMS) as Array<keyof typeof USDOT_PROGRAMS>);

  for (const programKey of programsToSearch) {
    const program = USDOT_PROGRAMS[programKey];

    // Search Grants.gov for this program
    const searchPromise = fetch("https://api.grants.gov/v1/api/search2", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        keyword: program.name,
        agencies: program.agencyCode,
        oppStatuses: status === "all" ? "posted|forecasted" : status,
        rows: 10,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.data?.oppHits) return [];

        return data.data.oppHits.map((hit: any) => ({
          id: String(hit.id),
          opportunityNumber: hit.number || "",
          title: hit.title || program.name,
          agency: program.agency,
          agencyCode: program.agencyCode,
          description: "",
          awardFloor: program.typical_floor,
          awardCeiling: program.typical_ceiling,
          totalFunding: program.typical_funding,
          closeDate: hit.closeDate || "",
          postDate: hit.openDate || "",
          status: hit.oppStatus || "unknown",
          applicationUrl: `https://www.grants.gov/search-results-detail/${hit.id}`,
          eligibility: program.eligibility,
          fundingCategories: program.focus_areas,
          fundingInstruments: ["Grant", "Cooperative Agreement"],
          costSharing: program.match_required,
          alnNumbers: program.alnNumber ? [program.alnNumber] : [],
        }));
      })
      .catch((err) => {
        console.error(`Error searching for ${program.name}:`, err);
        return [];
      });

    searches.push(searchPromise);
  }

  const results = await Promise.all(searches);
  return results.flat();
}

/**
 * Get enhanced DOT grant information with typical funding amounts
 */
export function enhanceUSDOTGrant(grant: DiscoveredGrant): DiscoveredGrant {
  // Try to match to known DOT programs
  for (const [key, program] of Object.entries(USDOT_PROGRAMS)) {
    if (
      grant.title.toLowerCase().includes(program.name.toLowerCase()) ||
      grant.title.toLowerCase().includes(key.toLowerCase())
    ) {
      return {
        ...grant,
        awardFloor: grant.awardFloor || program.typical_floor,
        awardCeiling: grant.awardCeiling || program.typical_ceiling,
        totalFunding: grant.totalFunding || program.typical_funding,
        eligibility: grant.eligibility.length > 0 ? grant.eligibility : program.eligibility,
        fundingCategories: [...new Set([...grant.fundingCategories, ...program.focus_areas])],
        costSharing: program.match_required,
      };
    }
  }

  return grant;
}

/**
 * Build targeted USDOT search query for Grants.gov
 */
export function buildUSDOTSearchQuery(): string {
  // Include all major DOT program names and keywords
  return [
    "PIDP",
    "Port Infrastructure Development",
    "RAISE",
    "INFRA",
    "MEGA",
    "Multimodal",
    "Maritime",
    "Port",
    "Freight",
    "Intermodal",
  ].join(" OR ");
}

/**
 * Get typical funding cycles for DOT programs
 */
export function getUSDOTFundingCycles(): Array<{
  program: string;
  typical_announcement: string;
  typical_deadline: string;
  fiscal_year: number;
}> {
  const currentYear = new Date().getFullYear();

  return [
    {
      program: "PIDP",
      typical_announcement: "September",
      typical_deadline: "December - February",
      fiscal_year: currentYear + 1,
    },
    {
      program: "RAISE",
      typical_announcement: "January - February",
      typical_deadline: "April - May",
      fiscal_year: currentYear,
    },
    {
      program: "INFRA",
      typical_announcement: "February - March",
      typical_deadline: "May - June",
      fiscal_year: currentYear,
    },
    {
      program: "MEGA",
      typical_announcement: "March - April",
      typical_deadline: "June - July",
      fiscal_year: currentYear,
    },
  ];
}
