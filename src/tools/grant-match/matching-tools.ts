import { getGrantById } from "@/data/grants";
import { getPortVendorById, portVendors } from "@/data/port-vendors";
import { getTopMatchesForGrant, getTopGrantsForVendor, getMatchDetails, scoreVendorForGrant } from "@/data/matches";

export function matchVendorsToGrantProgram(params: {
  grantId: string;
  limit?: number;
  minScore?: number;
  sector?: string;
}) {
  const grant = getGrantById(params.grantId);
  if (!grant) {
    return { error: `Grant program not found: ${params.grantId}. Valid IDs: grant-01 through grant-12.` };
  }

  const limit = params.limit || 10;
  let matches = getTopMatchesForGrant(params.grantId, 60); // get all then filter

  if (params.minScore !== undefined) {
    matches = matches.filter((m) => m.overallScore >= params.minScore!);
  }

  if (params.sector) {
    const q = params.sector.toLowerCase();
    matches = matches.filter((m) => {
      const vendor = getPortVendorById(m.vendorId);
      return vendor && vendor.sector.toLowerCase().includes(q);
    });
  }

  matches = matches.slice(0, limit);

  return {
    grantProgram: {
      id: grant.id,
      name: grant.shortName,
      fullName: grant.name,
      maxAward: grant.maxAward,
    },
    totalMatches: matches.length,
    matches: matches.map((m) => {
      const vendor = getPortVendorById(m.vendorId)!;
      return {
        rank: matches.indexOf(m) + 1,
        vendorId: m.vendorId,
        vendorName: vendor.name,
        sector: vendor.sector,
        overallScore: m.overallScore,
        recommendation: m.recommendation,
        dimensions: m.dimensions,
        strengths: m.strengths,
        gaps: m.gaps,
        bondingCapacity: vendor.bondingCapacity,
        dbeStatus: vendor.disadvantagedBusiness,
      };
    }),
    distribution: {
      strongMatches: matches.filter((m) => m.recommendation === "strong_match").length,
      goodMatches: matches.filter((m) => m.recommendation === "good_match").length,
      partialMatches: matches.filter((m) => m.recommendation === "partial_match").length,
      weakMatches: matches.filter((m) => m.recommendation === "weak_match").length,
    },
  };
}

export function matchGrantsToVendorProfile(params: {
  vendorId: string;
  limit?: number;
}) {
  const vendor = getPortVendorById(params.vendorId);
  if (!vendor) {
    return { error: `Vendor not found: ${params.vendorId}. Vendors are loaded dynamically from federal data - use the Vendor Directory to search first.` };
  }

  const limit = params.limit || 5;
  const matches = getTopGrantsForVendor(params.vendorId, limit);

  return {
    vendor: {
      id: vendor.id,
      name: vendor.name,
      sector: vendor.sector,
      capabilities: vendor.capabilities,
    },
    totalMatches: matches.length,
    bestGrants: matches.map((m) => {
      const grant = getGrantById(m.grantId)!;
      return {
        rank: matches.indexOf(m) + 1,
        grantId: m.grantId,
        grantName: grant.shortName,
        fullName: grant.name,
        agency: grant.agency,
        overallScore: m.overallScore,
        recommendation: m.recommendation,
        maxAward: grant.maxAward,
        deadline: grant.deadline,
        status: grant.status,
        dimensions: m.dimensions,
        strengths: m.strengths,
        gaps: m.gaps,
      };
    }),
  };
}

export function getDetailedScorecard(params: { grantId: string; vendorId: string }) {
  const grant = getGrantById(params.grantId);
  if (!grant) {
    return { error: `Grant program not found: ${params.grantId}` };
  }

  const vendor = getPortVendorById(params.vendorId);
  if (!vendor) {
    return { error: `Vendor not found: ${params.vendorId}` };
  }

  // Recompute to get fresh score
  const match = scoreVendorForGrant(vendor, grant);

  return {
    grantProgram: {
      name: grant.shortName,
      fullName: grant.name,
      agency: grant.agency,
      maxAward: grant.maxAward,
      matchRequirement: grant.matchRequirement,
    },
    vendor: {
      name: vendor.name,
      sector: vendor.sector,
      annualRevenue: vendor.annualRevenue,
      bondingCapacity: vendor.bondingCapacity,
      employeeCount: vendor.employeeCount,
    },
    overallScore: match.overallScore,
    recommendation: match.recommendation,
    scorecard: {
      capabilityAlignment: {
        score: match.dimensions.capabilityAlignment,
        weight: "40%",
        description: "How well vendor NAICS/PSC capabilities match grant-eligible activities",
      },
      certificationMatch: {
        score: match.dimensions.certificationMatch,
        weight: "25%",
        description: "Alignment of vendor business designations with grant requirements",
      },
      geographicFit: {
        score: match.dimensions.geographicFit,
        weight: "20%",
        description: "US presence and domestic preference compliance",
      },
      financialCapacity: {
        score: match.dimensions.financialCapacity,
        weight: "15%",
        description: "Bonding registration and financial capacity indicators",
      },
    },
    strengths: match.strengths,
    gaps: match.gaps,
    relevantCertifications: vendor.certifications,
    dbeStatus: vendor.disadvantagedBusiness,
  };
}
