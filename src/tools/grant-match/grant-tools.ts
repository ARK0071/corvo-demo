import { grants, getGrantById, getActiveGrants, getUpcomingGrants, searchGrants as searchGrantsData } from "@/data/grants";

export function searchGrantPrograms(params: {
  query?: string;
  agency?: string;
  focusArea?: string;
  minFunding?: number;
  maxFunding?: number;
  status?: string;
}) {
  let results = [...grants];

  if (params.query) {
    results = searchGrantsData(params.query);
  }

  if (params.agency) {
    const q = params.agency.toLowerCase();
    results = results.filter((g) => g.agency.toLowerCase().includes(q));
  }

  if (params.focusArea) {
    const q = params.focusArea.toLowerCase();
    results = results.filter(
      (g) =>
        g.focusAreas.some((f) => f.toLowerCase().includes(q)) ||
        g.eligibleActivities.some((a) => a.toLowerCase().includes(q))
    );
  }

  if (params.minFunding !== undefined) {
    results = results.filter((g) => g.maxAward >= params.minFunding!);
  }

  if (params.maxFunding !== undefined) {
    results = results.filter((g) => g.minAward <= params.maxFunding!);
  }

  if (params.status) {
    results = results.filter((g) => g.status === params.status);
  }

  return {
    totalResults: results.length,
    grants: results.map((g) => ({
      id: g.id,
      name: g.name,
      shortName: g.shortName,
      agency: g.agency,
      totalFunding: g.totalFunding,
      awardRange: `$${(g.minAward / 1_000_000).toFixed(1)}M - $${(g.maxAward / 1_000_000).toFixed(0)}M`,
      matchRequirement: `${(g.matchRequirement * 100).toFixed(0)}%`,
      deadline: g.deadline,
      status: g.status,
      focusAreas: g.focusAreas,
    })),
    summary: {
      totalFundingAvailable: results.reduce((s, g) => s + g.totalFunding, 0),
      openPrograms: results.filter((g) => g.status === "open").length,
      upcomingPrograms: results.filter((g) => g.status === "upcoming").length,
    },
  };
}

export function getGrantProgramDetails(params: { grantId: string }) {
  const grant = getGrantById(params.grantId);
  if (!grant) {
    return { error: `Grant program not found: ${params.grantId}. Valid IDs: grant-01 through grant-12.` };
  }

  return {
    id: grant.id,
    name: grant.name,
    shortName: grant.shortName,
    agency: grant.agency,
    description: grant.description,
    funding: {
      totalFunding: grant.totalFunding,
      minAward: grant.minAward,
      maxAward: grant.maxAward,
      matchRequirement: grant.matchRequirement,
      matchDescription: grant.matchRequirement > 0
        ? `Applicants must provide a ${(grant.matchRequirement * 100).toFixed(0)}% local match (${(grant.matchRequirement * 100).toFixed(0)} cents for every federal dollar)`
        : "No local match required (100% federal funding available)",
    },
    eligibleActivities: grant.eligibleActivities,
    deadline: grant.deadline,
    status: grant.status,
    applicationUrl: grant.applicationUrl,
    focusAreas: grant.focusAreas,
  };
}

export function analyzeGrantRequirements(params: { grantId: string }) {
  const grant = getGrantById(params.grantId);
  if (!grant) {
    return { error: `Grant program not found: ${params.grantId}` };
  }

  const eligibilityRequirements = [
    "Port authority, state/local government, or tribal entity as lead applicant",
    grant.matchRequirement > 0
      ? `${(grant.matchRequirement * 100).toFixed(0)}% non-federal cost share required`
      : "No cost share required",
    "Project must be located at or benefit a U.S. port facility",
    "Environmental review (NEPA) compliance required",
  ];

  const complianceRequirements = [
    "Buy America/Buy American Act compliance for construction materials",
    "Davis-Bacon prevailing wage requirements for construction workers",
    "Title VI non-discrimination requirements",
    "Single Audit Act compliance for awards over $750,000",
    "DBE good faith efforts documentation",
  ];

  const scoringCriteria = [
    { criterion: "Project merit and technical feasibility", weight: "25%" },
    { criterion: "Economic benefit and job creation", weight: "20%" },
    { criterion: "Environmental sustainability and climate resilience", weight: "20%" },
    { criterion: "Equity and environmental justice", weight: "15%" },
    { criterion: "Innovation and technology adoption", weight: "10%" },
    { criterion: "Project readiness and implementation plan", weight: "10%" },
  ];

  return {
    grantName: grant.name,
    shortName: grant.shortName,
    agency: grant.agency,
    eligibilityRequirements,
    complianceRequirements,
    scoringCriteria,
    keyDates: {
      deadline: grant.deadline,
      estimatedAwardAnnouncement: "60-90 days after deadline",
      performancePeriod: "3-5 years from award date",
    },
    vendorImplications: {
      requiredCapabilities: grant.eligibleActivities,
      preferredCertifications: ["ISO 9001", "ISO 14001", "OSHA VPP", "Buy America Compliant"],
      dbeRequirement: "Good faith efforts to meet DBE participation goals (typically 10-15%)",
      bondingRequirement: `Vendors should have bonding capacity of at least $${(grant.minAward / 1_000_000).toFixed(0)}M for minimum award size`,
    },
  };
}

export function compareGrantPrograms(params: { grantIds: string[] }) {
  const grantDetails = params.grantIds
    .map((id) => getGrantById(id))
    .filter((g): g is NonNullable<typeof g> => g !== undefined);

  if (grantDetails.length < 2) {
    return { error: "Need at least 2 valid grant IDs to compare. Valid IDs: grant-01 through grant-12." };
  }

  return {
    comparison: grantDetails.map((g) => ({
      name: g.shortName,
      fullName: g.name,
      agency: g.agency,
      totalFunding: g.totalFunding,
      awardRange: { min: g.minAward, max: g.maxAward },
      matchRequirement: g.matchRequirement,
      deadline: g.deadline,
      status: g.status,
      focusAreas: g.focusAreas,
      eligibleActivities: g.eligibleActivities.length,
    })),
    analysis: {
      highestFunding: grantDetails.reduce((a, b) => (a.totalFunding > b.totalFunding ? a : b)).shortName,
      lowestMatchRequirement: grantDetails.reduce((a, b) => (a.matchRequirement < b.matchRequirement ? a : b)).shortName,
      largestMaxAward: grantDetails.reduce((a, b) => (a.maxAward > b.maxAward ? a : b)).shortName,
      earliestDeadline: grantDetails.reduce((a, b) => (a.deadline < b.deadline ? a : b)).shortName,
      overlappingFocusAreas: findOverlappingAreas(grantDetails.map((g) => g.focusAreas)),
    },
  };
}

function findOverlappingAreas(focusArrays: string[][]): string[] {
  if (focusArrays.length < 2) return [];
  const first = new Set(focusArrays[0].map((f) => f.toLowerCase()));
  return focusArrays[0].filter((f) =>
    focusArrays.slice(1).every((arr) =>
      arr.some((a) => a.toLowerCase().includes(f.toLowerCase()) || f.toLowerCase().includes(a.toLowerCase()))
    )
  );
}
