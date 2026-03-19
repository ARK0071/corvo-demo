import { type GrantProgram } from "./grants";
import { portVendors, type PortVendor } from "./port-vendors";

export interface MatchDimensions {
  capabilityAlignment: number;   // 0-100
  certificationMatch: number;    // 0-100
  geographicFit: number;         // 0-100
  financialCapacity: number;     // 0-100
}

export interface GrantVendorMatch {
  grantId: string;
  vendorId: string;
  overallScore: number;          // 0-100 weighted average
  dimensions: MatchDimensions;
  strengths: string[];
  gaps: string[];
  recommendation: "strong_match" | "good_match" | "partial_match" | "weak_match";
}

// Grant focus → relevant capabilities mapping (for pre-defined grants)
const grantCapabilityMap: Record<string, string[]> = {
  "grant-01": ["dredging", "marine construction", "wharf construction", "intermodal", "port electrification", "terminal", "freight rail", "berth", "stormwater", "heavy civil", "engineering"],
  "grant-02": ["zero-emission", "electric", "hydrogen", "fuel cell", "charging", "shore power", "battery", "EV", "clean energy", "electrification", "solar"],
  "grant-03": ["infrastructure construction", "transportation", "multimodal", "port", "transit", "highway", "bridge", "engineering"],
  "grant-04": ["freight", "highway construction", "intermodal", "rail freight", "marine highway", "bridge construction"],
  "grant-05": ["EPC", "infrastructure construction", "bridge construction", "multimodal", "freight hub", "heavy civil", "engineering"],
  "grant-06": ["dredging", "navigation", "flood", "water", "dam", "channel", "levee"],
  "grant-07": ["flood control", "resilience", "hurricane", "stormwater", "coastal", "sea wall", "mitigation", "nature-based", "environmental"],
  "grant-08": ["cybersecurity", "surveillance", "access control", "security", "detection", "emergency response", "maritime domain awareness"],
  "grant-09": ["solar", "battery", "microgrid", "hydrogen", "renewable", "clean energy", "wind", "storage", "smart grid", "electric"],
  "grant-10": ["diesel", "engine replacement", "retrofit", "drayage", "marine vessel", "idle reduction", "alternative fuel", "environmental"],
  "grant-11": ["infrastructure", "industrial", "technology", "workforce", "modernization", "water", "broadband"],
  "grant-12": ["shipyard", "drydock", "marine railway", "crane", "workforce training", "marine equipment"],
};

// Grant focus → relevant certifications mapping
const grantCertMap: Record<string, string[]> = {
  "grant-01": ["USACE", "ISO 9001", "DBE", "SDB"],
  "grant-02": ["ISO 14001", "UL", "Energy Star", "DBE"],
  "grant-03": ["ISO 9001", "OSHA", "DBE", "SDB"],
  "grant-04": ["ISO 9001", "OSHA", "DBE"],
  "grant-05": ["ISO 9001", "ISO 14001", "OSHA", "DBE"],
  "grant-06": ["USACE", "ISO 14001", "DBE"],
  "grant-07": ["ISO 14001", "OSHA", "DBE"],
  "grant-08": ["ISO 27001", "CMMC", "FedRAMP", "SDVOSB"],
  "grant-09": ["ISO 14001", "UL", "DBE"],
  "grant-10": ["ISO 14001", "UL", "DBE"],
  "grant-11": ["ISO 9001", "DBE", "SDB", "HUBZone"],
  "grant-12": ["USACE", "ISO 9001", "Buy America", "DBE"],
};

// Stop-words excluded from keyword extraction
const STOP_WORDS = new Set([
  "and", "the", "for", "with", "from", "that", "this", "also", "into", "such",
  "other", "through", "including", "related", "based", "using", "under", "over",
]);

// Extract significant keywords from a phrase (3+ chars, no stop-words)
function extractKeywords(text: string): string[] {
  return text.toLowerCase().split(/[\s,/&()\-–]+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
}

// Sector → grant focus area affinity (broad domain matching)
const SECTOR_GRANT_AFFINITY: Record<string, string[]> = {
  "Marine Construction": ["dredging", "marine", "wharf", "dock", "berth", "port", "harbor", "channel", "navigation", "coastal", "sea", "shipyard", "drydock"],
  "Heavy Civil/Infrastructure": ["infrastructure", "construction", "highway", "bridge", "freight", "intermodal", "terminal", "multimodal", "transit", "road", "rail"],
  "Environmental/Remediation": ["environmental", "remediation", "pollution", "stormwater", "resilience", "flood", "mitigation", "nature", "climate", "diesel", "emission"],
  "Marine Equipment/Cranes": ["crane", "equipment", "shipyard", "drydock", "marine", "vessel", "cargo", "handling"],
  "Electrical/Power": ["electric", "power", "grid", "electrification", "charging", "shore", "battery", "solar", "renewable", "hydrogen", "microgrid", "energy"],
  "Engineering/Design": ["engineering", "design", "consulting", "assessment", "planning", "architectural", "services"],
  "Security/IT": ["cybersecurity", "security", "surveillance", "access", "detection", "monitoring", "technology", "systems"],
  "Sustainability/Clean Energy": ["solar", "renewable", "clean", "energy", "hydrogen", "battery", "zero-emission", "electric", "storage", "wind"],
};

function scoreCapabilityAlignment(vendor: PortVendor, grant: GrantProgram): number {
  const relevantCaps = grantCapabilityMap[grant.id] || [];
  const searchTerms = relevantCaps.length > 0 ? relevantCaps : grant.focusAreas;

  // 1. Build a set of all grant-related keywords (from search terms + eligible activities)
  const grantKeywords = new Set<string>();
  for (const term of searchTerms) {
    for (const kw of extractKeywords(term)) grantKeywords.add(kw);
  }
  for (const activity of grant.eligibleActivities) {
    for (const kw of extractKeywords(activity)) grantKeywords.add(kw);
  }

  // 2. Build vendor keyword set from capabilities, description, and past projects
  const vendorKeywords = new Set<string>();
  for (const cap of vendor.capabilities) {
    for (const kw of extractKeywords(cap)) vendorKeywords.add(kw);
  }
  for (const kw of extractKeywords(vendor.description)) vendorKeywords.add(kw);
  for (const proj of vendor.pastPortProjects) {
    for (const kw of extractKeywords(proj.name)) vendorKeywords.add(kw);
  }

  // 3. Count keyword overlap (bidirectional)
  let keywordMatches = 0;
  for (const kw of grantKeywords) {
    if (vendorKeywords.has(kw)) {
      keywordMatches++;
    } else {
      // Partial match - check if any vendor keyword contains this grant keyword or vice versa
      for (const vk of vendorKeywords) {
        if (vk.includes(kw) || kw.includes(vk)) {
          keywordMatches += 0.5;
          break;
        }
      }
    }
  }
  const keywordScore = Math.min(100, (keywordMatches / Math.max(grantKeywords.size, 1)) * 120);

  // 4. Sector affinity bonus - does the vendor's sector naturally align with this grant?
  let sectorScore = 0;
  const sectorAffinityTerms = SECTOR_GRANT_AFFINITY[vendor.sector];
  if (sectorAffinityTerms) {
    let sectorHits = 0;
    for (const term of sectorAffinityTerms) {
      if (grantKeywords.has(term)) sectorHits++;
    }
    sectorScore = Math.min(100, (sectorHits / Math.max(sectorAffinityTerms.length * 0.3, 1)) * 100);
  }

  // 5. Past project relevance - vendors with real federal projects matching grant areas
  let projectScore = 0;
  if (vendor.pastPortProjects.length > 0) {
    let projMatches = 0;
    for (const proj of vendor.pastPortProjects) {
      const projWords = extractKeywords(proj.name);
      if (projWords.some((w) => grantKeywords.has(w) || [...grantKeywords].some((gk) => gk.includes(w) || w.includes(gk)))) {
        projMatches++;
      }
    }
    projectScore = Math.min(100, (projMatches / vendor.pastPortProjects.length) * 100);
  }

  // Weighted blend: keyword matching 40%, sector affinity 35%, project relevance 25%
  return Math.round(keywordScore * 0.40 + sectorScore * 0.35 + projectScore * 0.25);
}

// Federal designations that USASpending business_types map to
const FEDERAL_DESIGNATIONS = new Set(["DBE", "SDB", "WBE", "MBE", "SDVOSB", "HUBZone", "WOSB", "Veteran Owned"]);

// Industry certifications that only SAM.gov or manual entry can provide
const INDUSTRY_CERTS = new Set(["ISO 9001", "ISO 14001", "ISO 27001", "OSHA", "USACE", "UL", "Energy Star", "CMMC", "FedRAMP", "Buy America"]);

function scoreCertificationMatch(vendor: PortVendor, grant: GrantProgram): number {
  const relevantCerts = grantCertMap[grant.id] || [];
  if (relevantCerts.length === 0) return 60;

  const allVendorCerts = [...vendor.certifications];
  if (vendor.disadvantagedBusiness) {
    allVendorCerts.push(vendor.disadvantagedBusiness);
  }

  // Split grant certs into federal designations vs industry certs
  const grantFederalCerts = relevantCerts.filter((c) => FEDERAL_DESIGNATIONS.has(c));
  const grantIndustryCerts = relevantCerts.filter((c) => INDUSTRY_CERTS.has(c));

  // Score federal designation matches (USASpending CAN provide these)
  let federalMatches = 0;
  for (const cert of allVendorCerts) {
    for (const rel of grantFederalCerts) {
      if (cert.toLowerCase().includes(rel.toLowerCase()) || rel.toLowerCase().includes(cert.toLowerCase())) {
        federalMatches++;
        break;
      }
    }
  }
  const federalScore = grantFederalCerts.length > 0
    ? Math.round((federalMatches / grantFederalCerts.length) * 100)
    : 50;

  // Score industry cert matches (USASpending cannot provide ISO/OSHA etc.)
  let industryMatches = 0;
  for (const cert of allVendorCerts) {
    for (const rel of grantIndustryCerts) {
      if (cert.toLowerCase().includes(rel.toLowerCase()) || rel.toLowerCase().includes(cert.toLowerCase())) {
        industryMatches++;
        break;
      }
    }
  }
  // Baseline: any vendor in USASpending has won federal contracts,
  // implying they meet basic compliance (OSHA, bonding, insurance, etc.)
  const industryBaseline = vendor.pastPortProjects.length > 0 ? 50 : 35;
  const industryScore = grantIndustryCerts.length > 0
    ? Math.max(industryBaseline, Math.round((industryMatches / grantIndustryCerts.length) * 100))
    : industryBaseline;

  // Weight: federal designations 45%, industry certs 35%, DBE bonus 20%
  let score = Math.round(federalScore * 0.45 + industryScore * 0.35);

  // DBE/small business bonus - significant advantage in federal scoring
  if (vendor.disadvantagedBusiness) {
    score += 25;
  }

  return Math.min(100, score);
}

function scoreGeographicFit(vendor: PortVendor): number {
  const hq = vendor.headquarters.toLowerCase();

  // US state abbreviations - SAM.gov returns real addresses
  const usStates = [
    "al", "ak", "az", "ar", "ca", "co", "ct", "de", "fl", "ga",
    "hi", "id", "il", "in", "ia", "ks", "ky", "la", "me", "md",
    "ma", "mi", "mn", "ms", "mo", "mt", "ne", "nv", "nh", "nj",
    "nm", "ny", "nc", "nd", "oh", "ok", "or", "pa", "ri", "sc",
    "sd", "tn", "tx", "ut", "vt", "va", "wa", "wv", "wi", "wy",
    "dc",
  ];

  // Check if any US state abbreviation is in the headquarters string
  for (const st of usStates) {
    if (hq.includes(`, ${st}`) || hq.endsWith(` ${st}`)) {
      return 85;
    }
  }

  // Check for common US indicators
  if (hq.includes("usa") || hq.includes("united states")) return 85;

  return 50;
}

function scoreFinancialCapacity(vendor: PortVendor, grant: GrantProgram): number {
  // USASpending vendors have real federal award totals in annualRevenue
  if (vendor.annualRevenue > 0) {
    const revenueRatio = vendor.annualRevenue / Math.max(grant.maxAward, 1);
    if (revenueRatio >= 10) return 95;
    if (revenueRatio >= 5) return 90;
    if (revenueRatio >= 2) return 80;
    if (revenueRatio >= 1) return 70;
    if (revenueRatio >= 0.5) return 60;
    if (revenueRatio >= 0.1) return 45;
    return 35;
  }

  // Bonding capacity as fallback signal
  if (vendor.bondingCapacity > 0) return 60;

  return 40; // No financial data available
}

function identifyStrengths(vendor: PortVendor, grant: GrantProgram, dims: MatchDimensions): string[] {
  const strengths: string[] = [];
  if (dims.capabilityAlignment >= 60) strengths.push(`Strong capability alignment with ${grant.shortName} requirements`);
  if (dims.certificationMatch >= 60) strengths.push("Holds relevant certifications/designations for the program");
  if (vendor.disadvantagedBusiness) strengths.push(`${vendor.disadvantagedBusiness} designation provides federal scoring advantage`);
  if (dims.geographicFit >= 80) strengths.push("US-based - meets domestic preference requirements");
  if (dims.financialCapacity >= 65) strengths.push(`Proven federal contractor - $${(vendor.annualRevenue / 1_000_000).toFixed(0)}M in federal awards`);
  if (vendor.pastPortProjects.length >= 3) strengths.push(`${vendor.pastPortProjects.length} documented federal projects in relevant NAICS codes`);
  if (vendor.capabilities.length >= 5) strengths.push(`Diverse capabilities (${vendor.capabilities.length} NAICS/PSC codes)`);
  return strengths.slice(0, 4);
}

function identifyGaps(vendor: PortVendor, grant: GrantProgram, dims: MatchDimensions): string[] {
  const gaps: string[] = [];
  if (dims.capabilityAlignment < 40) gaps.push(`Limited capability alignment with ${grant.shortName} focus areas`);
  if (dims.certificationMatch < 40) gaps.push("No federal small-business designations on file - may limit scoring");
  if (dims.geographicFit < 60) gaps.push("Non-US headquarters may create Buy America compliance challenges");
  if (dims.financialCapacity < 50) gaps.push("Limited federal award history - may need to demonstrate bonding capacity");
  if (vendor.pastPortProjects.length === 0) gaps.push("No documented federal projects - past performance may be hard to demonstrate");
  if (grant.matchRequirement > 0) {
    gaps.push(`Grant requires ${(grant.matchRequirement * 100).toFixed(0)}% local cost-share - verify funding availability`);
  }
  return gaps.slice(0, 3);
}

// Weights for overall score - adapted for USASpending data
const WEIGHTS = {
  capabilityAlignment: 0.40,
  certificationMatch: 0.25,
  geographicFit: 0.20,
  financialCapacity: 0.15,
};

export function scoreVendorForGrant(vendor: PortVendor, grant: GrantProgram): GrantVendorMatch {
  const dimensions: MatchDimensions = {
    capabilityAlignment: scoreCapabilityAlignment(vendor, grant),
    certificationMatch: scoreCertificationMatch(vendor, grant),
    geographicFit: scoreGeographicFit(vendor),
    financialCapacity: scoreFinancialCapacity(vendor, grant),
  };

  const overallScore = Math.round(
    dimensions.capabilityAlignment * WEIGHTS.capabilityAlignment +
    dimensions.certificationMatch * WEIGHTS.certificationMatch +
    dimensions.geographicFit * WEIGHTS.geographicFit +
    dimensions.financialCapacity * WEIGHTS.financialCapacity
  );

  const strengths = identifyStrengths(vendor, grant, dimensions);
  const gaps = identifyGaps(vendor, grant, dimensions);

  let recommendation: GrantVendorMatch["recommendation"];
  if (overallScore >= 65) recommendation = "strong_match";
  else if (overallScore >= 50) recommendation = "good_match";
  else if (overallScore >= 35) recommendation = "partial_match";
  else recommendation = "weak_match";

  return {
    grantId: grant.id,
    vendorId: vendor.id,
    overallScore,
    dimensions,
    strengths,
    gaps,
    recommendation,
  };
}

// Mutable match matrix - populated on demand
export const matchMatrix: GrantVendorMatch[] = [];

export function getTopMatchesForGrant(grantId: string, limit: number = 10): GrantVendorMatch[] {
  return matchMatrix
    .filter((m) => m.grantId === grantId)
    .sort((a, b) => b.overallScore - a.overallScore)
    .slice(0, limit);
}

export function getTopGrantsForVendor(vendorId: string, limit: number = 5): GrantVendorMatch[] {
  return matchMatrix
    .filter((m) => m.vendorId === vendorId)
    .sort((a, b) => b.overallScore - a.overallScore)
    .slice(0, limit);
}

export function getMatchDetails(grantId: string, vendorId: string): GrantVendorMatch | undefined {
  return matchMatrix.find((m) => m.grantId === grantId && m.vendorId === vendorId);
}

export function getStrongMatches(): GrantVendorMatch[] {
  return matchMatrix.filter((m) => m.recommendation === "strong_match");
}

export function getMatchesByRecommendation(rec: GrantVendorMatch["recommendation"]): GrantVendorMatch[] {
  return matchMatrix.filter((m) => m.recommendation === rec);
}

export function scoreVendorsForGrant(vendors: PortVendor[], grant: GrantProgram): GrantVendorMatch[] {
  // Build dynamic capability keywords from the grant's metadata
  if (!grantCapabilityMap[grant.id]) {
    const dynamicCaps: string[] = [...grant.focusAreas];
    for (const activity of grant.eligibleActivities) {
      dynamicCaps.push(activity.toLowerCase());
      for (const word of activity.toLowerCase().split(/[\s,/]+/)) {
        if (word.length > 3 && !["and", "the", "for", "with", "from", "that", "this", "also"].includes(word)) {
          dynamicCaps.push(word);
        }
      }
    }
    grantCapabilityMap[grant.id] = [...new Set(dynamicCaps)];
  }
  if (!grantCertMap[grant.id]) {
    grantCertMap[grant.id] = ["ISO 9001", "ISO 14001", "OSHA", "DBE", "SDB"];
  }

  const newMatches: GrantVendorMatch[] = [];
  for (const vendor of vendors) {
    const match = scoreVendorForGrant(vendor, grant);
    matchMatrix.push(match);
    newMatches.push(match);
  }
  return newMatches;
}

export function addMatchesForGrant(grant: GrantProgram): GrantVendorMatch[] {
  return scoreVendorsForGrant(portVendors, grant);
}
