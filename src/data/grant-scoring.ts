/**
 * Grant Eligibility and Scoring System
 *
 * Rule-based eligibility and impact scoring. Embedding-based profile/project/domain
 * similarity is computed in the /api/score-grants route.
 */

import type { DiscoveredGrant } from "@/lib/grants-gov";
import type { PortProfile } from "./port-profile";
import { currentPortProfile } from "./port-profile";

export interface TopProjectMatch {
  projectId: string;
  projectName: string;
  similarity: number; // 0-100
}

export interface TopDomainMatch {
  domainId: string;
  domainName: string;
  similarity: number; // 0-100
}

export interface GrantScore {
  grantId: string;
  grant: DiscoveredGrant;
  overallScore: number; // 0-100
  eligibilityScore: number; // 0-100 - Can we apply?
  profileAlignmentScore: number; // 0-100 - Embedding similarity vs port profile
  projectSimilarityScore: number; // 0-100 - Best project match
  fundingDomainSimilarityScore: number; // 0-100 - Best funding domain match
  impactScore: number; // 0-100 - Potential impact
  recommendation: "highly_recommended" | "recommended" | "consider" | "not_recommended";
  eligibilityStatus: "eligible" | "likely_eligible" | "unclear" | "not_eligible";
  strengths: string[];
  concerns: string[];
  keyRequirements: string[];
  topProjectMatches: TopProjectMatch[];
  topDomainMatches: TopDomainMatch[];
  /** True when profile/project/domain embeddings were used; false when placeholders or no key */
  embeddingScoresAvailable: boolean;
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

const HARD_NEGATIVE_KEYWORDS = [
  "k-12",
  "elementary school",
  "middle school",
  "high school",
  "school district",
  "university",
  "college",
  "higher education",
  "students",
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

export function isHardNegativeGrant(grant: DiscoveredGrant): boolean {
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

/**
 * Score grant eligibility based on applicant types
 */
export function scoreEligibility(grant: DiscoveredGrant, profile: PortProfile): {
  score: number;
  status: GrantScore["eligibilityStatus"];
  reasons: string[];
} {
  const eligibilityText = (grant.eligibility || []).join(" ").toLowerCase();
  const reasons: string[] = [];
  const isAirport = profile.classification.toLowerCase().includes("airport");

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

  if (eligibilityText.includes("special district")) {
    reasons.push("Eligible as a special district government");
    return { score: 95, status: "eligible", reasons };
  }

  const stateLocalMatch = ELIGIBILITY_KEYWORDS.stateLocal.some((kw) =>
    eligibilityText.includes(kw)
  );
  if (stateLocalMatch && profile.entityType.toLowerCase().includes("government")) {
    reasons.push("Eligible as a state/local government entity");
    return { score: 90, status: "eligible", reasons };
  }

  const publicEntityMatch = ELIGIBILITY_KEYWORDS.publicEntity.some((kw) =>
    eligibilityText.includes(kw)
  );
  if (publicEntityMatch) {
    reasons.push("Likely eligible as a public entity");
    return { score: 75, status: "likely_eligible", reasons };
  }

  if (
    eligibilityText.includes("unrestricted") ||
    eligibilityText.includes("any type of entity")
  ) {
    reasons.push("Open to any type of entity");
    return { score: 85, status: "eligible", reasons };
  }

  if (grant.eligibility.length === 0) {
    reasons.push("Eligibility criteria not specified - likely eligible as public entity");
    return { score: 70, status: "likely_eligible", reasons };
  }

  reasons.push("Eligibility unclear - review required");
  return { score: 40, status: "unclear", reasons };
}

/**
 * Score potential impact
 */
export function scoreImpact(grant: DiscoveredGrant, profile: PortProfile): number {
  let score = 50;

  if (grant.awardCeiling > 0 && profile.characteristics.operatingBudget) {
    const ratio = grant.awardCeiling / profile.characteristics.operatingBudget;
    if (ratio >= 2) score += 30;
    else if (ratio >= 1) score += 25;
    else if (ratio >= 0.5) score += 20;
    else if (ratio >= 0.1) score += 10;
  }

  if (grant.totalFunding > 0) {
    if (grant.totalFunding >= 1_000_000_000) score += 15;
    else if (grant.totalFunding >= 100_000_000) score += 10;
    else if (grant.totalFunding >= 10_000_000) score += 5;
  }

  if (!grant.costSharing) score += 5;

  return Math.min(100, score);
}

/**
 * Compute final overall score from sub-scores.
 * Weights: Eligibility 25%, Profile 25%, Projects 20%, Domains 15%, Impact 15%
 */
export function computeFinalScore(params: {
  eligibilityScore: number;
  profileAlignmentScore: number;
  projectSimilarityScore: number;
  fundingDomainSimilarityScore: number;
  impactScore: number;
}): number {
  return Math.round(
    params.eligibilityScore * 0.25 +
      params.profileAlignmentScore * 0.25 +
      params.projectSimilarityScore * 0.2 +
      params.fundingDomainSimilarityScore * 0.15 +
      params.impactScore * 0.15
  );
}

/**
 * Determine recommendation from overall score and eligibility
 */
export function getRecommendation(
  overallScore: number,
  eligibilityStatus: GrantScore["eligibilityStatus"],
  profileAlignmentScore: number
): GrantScore["recommendation"] {
  if (profileAlignmentScore < 20) return "not_recommended";
  if (overallScore >= 75 && eligibilityStatus === "eligible") return "highly_recommended";
  if (overallScore >= 60) return "recommended";
  if (overallScore >= 45) return "consider";
  return "not_recommended";
}

/**
 * Get only eligible grants from a list of scores
 */
export function getEligibleGrants(scores: GrantScore[]): GrantScore[] {
  return scores.filter(
    (s) =>
      s.eligibilityStatus === "eligible" || s.eligibilityStatus === "likely_eligible"
  );
}

/**
 * Get highly recommended grants from a list of scores
 */
export function getRecommendedGrants(scores: GrantScore[]): GrantScore[] {
  return scores.filter(
    (s) =>
      s.recommendation === "highly_recommended" || s.recommendation === "recommended"
  );
}
