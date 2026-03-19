/**
 * Grant Eligibility and Scoring System
 *
 * Scores grants based on how well they match the port authority's
 * profile, priorities, and eligibility criteria.
 */

import type { DiscoveredGrant } from "@/lib/grants-gov";
import type { PortProfile } from "./port-profile";
import { currentPortProfile } from "./port-profile";

export interface GrantScore {
  grantId: string;
  grant: DiscoveredGrant;
  overallScore: number; // 0-100
  eligibilityScore: number; // 0-100 - Can we apply?
  alignmentScore: number; // 0-100 - Does it match our priorities?
  impactScore: number; // 0-100 - Potential impact
  competitivenessScore: number; // 0-100 - How competitive are we?
  recommendation: "highly_recommended" | "recommended" | "consider" | "not_recommended";
  eligibilityStatus: "eligible" | "likely_eligible" | "unclear" | "not_eligible";
  strengths: string[];
  concerns: string[];
  keyRequirements: string[];
}

const ELIGIBILITY_KEYWORDS = {
  portAuthority: [
    "port authority",
    "port district",
    "special district",
    "public port",
    "seaport",
    "maritime",
  ],
  airportAuthority: [
    "airport",
    "aviation",
    "aeronautics",
    "airport authority",
    "airport operator",
    "FAA",
    "air carrier",
  ],
  stateLocal: [
    "state government",
    "local government",
    "county",
    "municipality",
    "city",
    "township",
  ],
  publicEntity: [
    "public agency",
    "government",
    "authority",
    "publicly chartered",
  ],
};

const STOP_WORDS = new Set([
  "and", "the", "for", "with", "from", "that", "this", "also", "into", "such",
  "other", "through", "including", "related", "based", "using", "under", "over",
  "improvement", "program", "project",
]);

const HARD_NEGATIVE_KEYWORDS = [
  // Education-focused programs
  "k-12",
  "elementary school",
  "middle school",
  "high school",
  "school district",
  "university",
  "college",
  "higher education",
  "students",
  // Individual social services
  "housing voucher",
  "affordable housing",
  "medicaid",
  "medicare",
  "supplemental nutrition assistance",
  "snap benefits",
  "veterans housing",
  "nuclear",
  "pregnant",
  "lifespan",
  "aids",
  "clinical",
  "cybersecurity",

];

function isHardNegativeGrant(grant: DiscoveredGrant): boolean {
  const text = [
    grant.title,
    grant.description,
    ...grant.fundingCategories,
    ...grant.eligibility,
  ]
    .join(" ")
    .toLowerCase();

  return HARD_NEGATIVE_KEYWORDS.some((kw) => text.includes(kw));
}

function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s,/&()\-–]+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
}

/**
 * Score grant eligibility based on applicant types
 */
function scoreEligibility(grant: DiscoveredGrant, profile: PortProfile): {
  score: number;
  status: GrantScore["eligibilityStatus"];
  reasons: string[];
} {
  const eligibilityText = grant.eligibility.join(" ").toLowerCase();
  const reasons: string[] = [];
  const isAirport = profile.classification.toLowerCase().includes("airport");

  // Check for explicit port authority or airport authority eligibility
  if (isAirport) {
    const airportKeywordMatch = ELIGIBILITY_KEYWORDS.airportAuthority.some((kw) =>
      eligibilityText.includes(kw.toLowerCase())
    );

    if (airportKeywordMatch) {
      reasons.push("Explicitly eligible for airport authorities");
      return { score: 100, status: "eligible", reasons };
    }
  } else {
    const portKeywordMatch = ELIGIBILITY_KEYWORDS.portAuthority.some((kw) =>
      eligibilityText.includes(kw)
    );

    if (portKeywordMatch) {
      reasons.push("Explicitly eligible for port authorities");
      return { score: 100, status: "eligible", reasons };
    }
  }

  // Check for special district (which port authorities typically are)
  if (eligibilityText.includes("special district")) {
    reasons.push("Eligible as a special district government");
    return { score: 95, status: "eligible", reasons };
  }

  // Check for state/local government
  const stateLocalMatch = ELIGIBILITY_KEYWORDS.stateLocal.some((kw) =>
    eligibilityText.includes(kw)
  );

  if (stateLocalMatch && profile.entityType.toLowerCase().includes("government")) {
    reasons.push("Eligible as a state/local government entity");
    return { score: 90, status: "eligible", reasons };
  }

  // Check for public entity
  const publicEntityMatch = ELIGIBILITY_KEYWORDS.publicEntity.some((kw) =>
    eligibilityText.includes(kw)
  );

  if (publicEntityMatch) {
    reasons.push("Likely eligible as a public entity");
    return { score: 75, status: "likely_eligible", reasons };
  }

  // Unrestricted eligibility
  if (
    eligibilityText.includes("unrestricted") ||
    eligibilityText.includes("any type of entity")
  ) {
    reasons.push("Open to any type of entity");
    return { score: 85, status: "eligible", reasons };
  }

  // No clear match - but if eligibility is empty (common for search results),
  // assume likely eligible since port authorities are common applicants
  if (grant.eligibility.length === 0) {
    reasons.push("Eligibility criteria not specified - likely eligible as public entity");
    return { score: 70, status: "likely_eligible", reasons };
  }

  reasons.push("Eligibility unclear - review required");
  return { score: 40, status: "unclear", reasons };
}

/**
 * Score alignment with port priorities
 */
function scoreAlignment(grant: DiscoveredGrant, profile: PortProfile): {
  score: number;
  matches: string[];
} {
  const grantKeywords = new Set<string>();
  const matches: string[] = [];

  // Extract keywords from grant
  for (const text of [
    grant.title,
    grant.description,
    ...grant.fundingCategories,
    ...grant.eligibility,
  ]) {
    for (const kw of extractKeywords(text)) {
      grantKeywords.add(kw);
    }
  }

  // Check priority alignment
  let priorityMatches = 0;
  for (const priority of profile.priorities) {
    const priorityKeywords = extractKeywords(priority);
    const hasMatch = priorityKeywords.some((kw) => grantKeywords.has(kw));

    if (hasMatch) {
      priorityMatches++;
      matches.push(priority);
    }
  }

  // Check needs alignment
  let needsMatches = 0;
  for (const need of profile.needs) {
    const needKeywords = extractKeywords(need);
    const hasMatch = needKeywords.some((kw) => grantKeywords.has(kw));

    if (hasMatch) {
      needsMatches++;
      matches.push(`Addresses need: ${need}`);
    }
  }

  const priorityScore = Math.min(
    100,
    (priorityMatches / Math.max(profile.priorities.length * 0.3, 1)) * 100
  );
  const needsScore = Math.min(
    100,
    (needsMatches / Math.max(profile.needs.length * 0.3, 1)) * 100
  );

  const score = Math.round(priorityScore * 0.6 + needsScore * 0.4);

  return { score, matches };
}

/**
 * Score potential impact
 */
function scoreImpact(grant: DiscoveredGrant, profile: PortProfile): number {
  let score = 50; // Base score

  // Award size relative to operating budget
  if (grant.awardCeiling > 0 && profile.characteristics.operatingBudget) {
    const ratio = grant.awardCeiling / profile.characteristics.operatingBudget;

    if (ratio >= 2) score += 30; // Transformative
    else if (ratio >= 1) score += 25; // Very significant
    else if (ratio >= 0.5) score += 20; // Significant
    else if (ratio >= 0.1) score += 10; // Moderate
  }

  // Total program funding (indicates importance/resources)
  if (grant.totalFunding > 0) {
    if (grant.totalFunding >= 1_000_000_000) score += 15; // Major program
    else if (grant.totalFunding >= 100_000_000) score += 10;
    else if (grant.totalFunding >= 10_000_000) score += 5;
  }

  // Cost sharing (lower is better)
  if (!grant.costSharing) {
    score += 5; // No match required
  }

  return Math.min(100, score);
}

/**
 * Score competitiveness
 */
function scoreCompetitiveness(grant: DiscoveredGrant, profile: PortProfile): {
  score: number;
  factors: string[];
} {
  const factors: string[] = [];
  let score = 50; // Base competitiveness

  // Location advantage
  const grantText = `${grant.title} ${grant.description}`.toLowerCase();
  const isAirport = profile.classification.toLowerCase().includes("airport");
  const locationTerms = [
    profile.location.state.toLowerCase(),
    profile.location.city.toLowerCase(),
    profile.location.region.toLowerCase(),
    "region",
  ];

  if (locationTerms.some((term) => grantText.includes(term))) {
    score += 15;
    factors.push(`Regional focus matches ${profile.name} location`);
  }

  // Sector focus - port/maritime or airport/aviation depending on profile
  const sectorFocus = isAirport
    ? grant.fundingCategories.some((c) => c.toLowerCase().includes("transport")) ||
      grantText.includes("airport") ||
      grantText.includes("aviation") ||
      grantText.includes("faa")
    : grant.fundingCategories.some((c) => c.toLowerCase().includes("transport")) ||
      grantText.includes("port") ||
      grantText.includes("maritime");

  if (sectorFocus) {
    score += 20;
    factors.push(isAirport ? "Direct airport/aviation focus" : "Direct port/maritime focus");
  }

  // Penalize grants that target the opposite sector
  const wrongSector = isAirport
    ? grantText.includes("port") && !grantText.includes("airport") && !grantText.includes("transport")
      || grantText.includes("maritime") || grantText.includes("seaport")
    : grantText.includes("airport") && !grantText.includes("port")
      || grantText.includes("aviation") || grantText.includes("faa");

  if (wrongSector) {
    score -= 25;
    factors.push(isAirport ? "Grant targets port/maritime sector - low relevance for airports" : "Grant targets airport/aviation sector - low relevance for ports");
  }

  // Certifications match
  if (profile.certifications.length > 0) {
    score += 10;
    factors.push(`Strong existing certifications (${profile.certifications.slice(0, 2).join(", ")})`);
  }

  // Past experience
  score += 5;
  factors.push("Established port authority with operational track record");

  return { score: Math.min(100, score), factors };
}

/**
 * Score a grant for the current port profile
 */
export function scoreGrantForPort(
  grant: DiscoveredGrant,
  profile: PortProfile = currentPortProfile
): GrantScore {
  const eligibility = scoreEligibility(grant, profile);
  const alignment = scoreAlignment(grant, profile);
  const impactScore = scoreImpact(grant, profile);
  const competitiveness = scoreCompetitiveness(grant, profile);

  // Weighted overall score
  const overallScore = Math.round(
    eligibility.score * 0.35 +
      alignment.score * 0.35 +
      impactScore * 0.15 +
      competitiveness.score * 0.15
  );

  // Determine recommendation
  let recommendation: GrantScore["recommendation"];

  // Check for sector mismatch (port grant for airport profile or vice versa)
  const grantFullText = `${grant.title} ${grant.description}`.toLowerCase();
  const isAirportProfile = profile.classification.toLowerCase().includes("airport");
  const sectorMismatch = isAirportProfile
    ? (grantFullText.includes("port") || grantFullText.includes("maritime") || grantFullText.includes("seaport"))
      && !grantFullText.includes("airport") && !grantFullText.includes("aviation") && !grantFullText.includes("transport")
    : (grantFullText.includes("airport") || grantFullText.includes("aviation"))
      && !grantFullText.includes("port") && !grantFullText.includes("maritime");

  // If alignment is very low (< 20) or sector mismatch, the grant is likely irrelevant
  if (alignment.score < 20 || sectorMismatch) {
    recommendation = "not_recommended";
  } else if (overallScore >= 75 && eligibility.status === "eligible") {
    recommendation = "highly_recommended";
  } else if (overallScore >= 60) {
    recommendation = "recommended";
  } else if (overallScore >= 45) {
    recommendation = "consider";
  } else {
    recommendation = "not_recommended";
  }

  // Build strengths
  const strengths: string[] = [
    ...eligibility.reasons,
    ...alignment.matches.slice(0, 3),
    ...competitiveness.factors.slice(0, 2),
  ];

  // Build concerns
  const concerns: string[] = [];
  if (eligibility.status !== "eligible") {
    concerns.push("Eligibility may need verification");
  }
  if (grant.costSharing) {
    concerns.push("Requires local cost-share/match");
  }
  if (alignment.score < 50) {
    concerns.push("Limited alignment with current priorities");
  }

  // Key requirements
  const keyRequirements: string[] = [];
  if (grant.costSharing) {
    keyRequirements.push("Local cost-share required");
  }
  if (grant.closeDate) {
    keyRequirements.push(`Application deadline: ${grant.closeDate}`);
  }

  return {
    grantId: grant.id,
    grant,
    overallScore,
    eligibilityScore: eligibility.score,
    alignmentScore: alignment.score,
    impactScore,
    competitivenessScore: competitiveness.score,
    recommendation,
    eligibilityStatus: eligibility.status,
    strengths: strengths.slice(0, 5),
    concerns: concerns.slice(0, 3),
    keyRequirements,
  };
}

/**
 * Score multiple grants and return sorted by score
 */
export function scoreGrantsForPort(
  grants: DiscoveredGrant[],
  profile: PortProfile = currentPortProfile
): GrantScore[] {
  const scored = grants
    .filter((grant) => !isHardNegativeGrant(grant))
    .map((grant) => scoreGrantForPort(grant, profile))
    .sort((a, b) => b.overallScore - a.overallScore);

  // Debug logging: top 10 scored grants
  if (process.env.NODE_ENV !== "production") {
    console.log(
      "[GrantScoring] Top grants:",
      scored.slice(0, 10).map((g) => ({
        id: g.grantId,
        title: g.grant.title,
        overallScore: g.overallScore,
        recommendation: g.recommendation,
      }))
    );
  }

  return scored;
}

/**
 * Get only eligible grants
 */
export function getEligibleGrants(
  grants: DiscoveredGrant[],
  profile: PortProfile = currentPortProfile
): GrantScore[] {
  return scoreGrantsForPort(grants, profile).filter(
    (score) =>
      score.eligibilityStatus === "eligible" ||
      score.eligibilityStatus === "likely_eligible"
  );
}

/**
 * Get highly recommended grants
 */
export function getRecommendedGrants(
  grants: DiscoveredGrant[],
  profile: PortProfile = currentPortProfile
): GrantScore[] {
  return scoreGrantsForPort(grants, profile).filter(
    (score) =>
      score.recommendation === "highly_recommended" ||
      score.recommendation === "recommended"
  );
}
