// ─── Subchapter N Compliance Engine ───
// Texas Water Code Ch. 60, Subchapter N overlay for vendor qualification.
// Computes procurement tier, SBD eligibility, agency experience, bond capacity.

import type { ComplianceSummary } from "./vendor-filters";

interface VendorData {
  totalAwardValue: number;
  maxSingleAward: number;
  awardCount: number;
  agencies: string[];
  setAsideTypes: string[];
  samActive: boolean;
}

// Sec. 60.403: under $50K = routine, no competitive bid
// Sec. 60.404/405: over $100K = full competitive bidding or proposal procedures
function computeProcurementTier(maxSingleAward: number): {
  tier: ComplianceSummary["procurementTier"];
  label: string;
} {
  if (maxSingleAward < 50_000) {
    return { tier: "routine", label: "Routine Purchase (< $50K)" };
  }
  if (maxSingleAward < 100_000) {
    return { tier: "delegated", label: "Delegated Authority ($50K–$100K)" };
  }
  return { tier: "competitive", label: "Full Competitive (> $100K)" };
}

// Sec. 60.404(d)(4) / 60.458(6): SBD program qualification
const SBD_SET_ASIDES = new Set([
  "SBA", "Total Small Business", "Partial Small Business",
  "8A", "8(a)", "HZC", "HUBZone",
  "SDVOSBC", "SDVOSB", "Service-Disabled Veteran-Owned",
  "WOSB", "Woman-Owned",
]);

function computeSbdQualification(setAsideTypes: string[]): string | null {
  for (const sa of setAsideTypes) {
    if (SBD_SET_ASIDES.has(sa)) return sa;
    const lower = sa.toLowerCase();
    if (lower.includes("small business")) return "Small Business";
    if (lower.includes("8(a)") || lower.includes("8a")) return "8(a)";
    if (lower.includes("hubzone")) return "HUBZone";
    if (lower.includes("sdvosb") || lower.includes("service-disabled")) return "SDVOSB";
    if (lower.includes("woman") || lower.includes("wosb")) return "WOSB";
  }
  return null;
}

// Strategic agency experience badges
const AGENCY_BADGE_MAP: Record<string, string> = {
  "USACE": "USACE",
  "Army Corps": "USACE",
  "Corps of Engineers": "USACE",
  "MARAD": "MARAD",
  "Maritime Administration": "MARAD",
  "DOT": "DOT",
  "Department of Transportation": "DOT",
  "Federal Highway": "DOT",
  "Federal Transit": "DOT",
  "EPA": "EPA",
  "Environmental Protection": "EPA",
  "DHS": "DHS/USCG",
  "Coast Guard": "DHS/USCG",
  "Homeland Security": "DHS/USCG",
  "CBP": "DHS/USCG",
  "Customs and Border": "DHS/USCG",
  "NOAA": "NOAA",
  "Navy": "Navy",
  "Department of the Navy": "Navy",
  "NAVFAC": "Navy",
};

function computeAgencyBadges(agencies: string[]): string[] {
  const badges = new Set<string>();
  for (const agency of agencies) {
    const upper = agency.toUpperCase();
    for (const [pattern, badge] of Object.entries(AGENCY_BADGE_MAP)) {
      if (upper.includes(pattern.toUpperCase())) {
        badges.add(badge);
      }
    }
  }
  return [...badges];
}

// Bond capacity signal inferred from max contract value
// A vendor whose largest award was $30K probably can't bond for $2M
function computeBondCapacity(maxSingleAward: number): {
  signal: ComplianceSummary["bondCapacitySignal"];
  label: string;
} {
  if (maxSingleAward >= 10_000_000) {
    return { signal: "high", label: `$${(maxSingleAward / 1_000_000).toFixed(0)}M+ demonstrated capacity` };
  }
  if (maxSingleAward >= 1_000_000) {
    return { signal: "medium", label: `$${(maxSingleAward / 1_000_000).toFixed(1)}M demonstrated capacity` };
  }
  if (maxSingleAward > 0) {
    return { signal: "low", label: `$${(maxSingleAward / 1_000).toFixed(0)}K max — limited bonding` };
  }
  return { signal: "unknown", label: "No award data — bond capacity unknown" };
}

export function computeComplianceSummary(vendor: VendorData): ComplianceSummary {
  const { tier, label: procurementTierLabel } = computeProcurementTier(vendor.maxSingleAward);
  const sbdQualification = computeSbdQualification(vendor.setAsideTypes);
  const agencyBadges = computeAgencyBadges(vendor.agencies);
  const { signal: bondCapacitySignal, label: bondCapacityLabel } = computeBondCapacity(vendor.maxSingleAward);

  return {
    procurementTier: tier,
    procurementTierLabel,
    sbdQualification,
    agencyBadges,
    samRegistrationActive: vendor.samActive,
    bondCapacitySignal,
    bondCapacityLabel,
    maxContractValue: vendor.maxSingleAward,
  };
}
