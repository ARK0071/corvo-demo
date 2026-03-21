/**
 * Maritime/port relevance scoring using keyword heuristics.
 * No external API calls — runs anywhere.
 */

import type { PortVendor } from "@/data/port-vendors";

const STRONG_MARITIME_TERMS = [
  "port",
  "maritime",
  "harbor",
  "harbour",
  "seaport",
  "terminal",
  "berth",
  "dredging",
  "dock",
  "wharf",
  "cargo",
  "intermodal",
  "coastal",
  "marine construction",
  "marine engineering",
  "shipyard",
  "drydock",
  "navigation",
  "channel deepening",
  "shore power",
  "cold ironing",
  "container terminal",
];

const MODERATE_TERMS = [
  "rail",
  "logistics",
  "freight",
  "heavy civil",
  "infrastructure",
  "construction",
  "crane",
  "vessel",
  "waterway",
  "levee",
  "flood",
  "stormwater",
  "resilience",
  "environmental",
  "remediation",
  "electrification",
  "zero-emission",
  "clean energy",
];

function buildSearchText(vendor: PortVendor): string {
  return [
    vendor.name,
    vendor.description,
    vendor.sector,
    ...vendor.capabilities,
    ...vendor.pastPortProjects.map((p) => p.name),
  ]
    .join(" ")
    .toLowerCase();
}

export interface MaritimeRelevanceResult {
  score: number;
  reasons: string[];
}

/**
 * Score a vendor's relevance to maritime/port work using lightweight keyword heuristics.
 *
 * Bands:
 *   85–100  strong maritime/port match
 *   55–75   moderate industrial/logistics relevance
 *   20–40   generic relevance
 */
export function scoreMaritimeRelevance(
  vendor: PortVendor
): MaritimeRelevanceResult {
  const text = buildSearchText(vendor);
  const reasons: string[] = [];

  let strongHits = 0;
  for (const term of STRONG_MARITIME_TERMS) {
    if (text.includes(term)) {
      strongHits++;
      if (reasons.length < 3) {
        reasons.push(term);
      }
    }
  }

  let moderateHits = 0;
  for (const term of MODERATE_TERMS) {
    if (text.includes(term)) {
      moderateHits++;
      if (reasons.length < 4) {
        reasons.push(term);
      }
    }
  }

  const portProjectCount = vendor.pastPortProjects.filter((p) =>
    STRONG_MARITIME_TERMS.some((t) => p.name.toLowerCase().includes(t))
  ).length;

  if (portProjectCount > 0 && reasons.length < 5) {
    reasons.push(`${portProjectCount} port-related past project(s)`);
  }

  let score: number;
  if (strongHits >= 3 || (strongHits >= 2 && portProjectCount >= 1)) {
    score = Math.min(100, 85 + strongHits * 2 + portProjectCount * 3);
  } else if (strongHits >= 1 || moderateHits >= 3) {
    score = Math.min(80, 55 + strongHits * 8 + moderateHits * 3);
  } else if (moderateHits >= 1) {
    score = Math.min(50, 25 + moderateHits * 5);
  } else {
    score = 15;
    reasons.length = 0;
    reasons.push("No specific maritime or port keywords found");
  }

  return {
    score: Math.min(100, score),
    reasons:
      reasons.length > 0
        ? reasons.map(
            (r) =>
              r.charAt(0).toUpperCase() + r.slice(1) + " relevance"
          )
        : ["General contractor"],
  };
}
