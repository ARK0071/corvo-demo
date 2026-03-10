/**
 * Smart Match Ranker
 * 
 * Ranks grants based on project match, focus overlap, spend signals, budget fit, and deadline urgency.
 */

import type { DiscoveredGrant } from "@/lib/grants-gov";
import type { SmartContext } from "./contextBuilder";

// Stopwords to filter out
const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by",
  "from", "as", "is", "was", "are", "were", "been", "be", "have", "has", "had", "do", "does",
  "did", "will", "would", "should", "could", "may", "might", "must", "can", "this", "that",
  "these", "those", "i", "you", "he", "she", "it", "we", "they", "what", "which", "who",
  "when", "where", "why", "how", "all", "each", "every", "both", "few", "more", "most",
  "other", "some", "such", "no", "nor", "not", "only", "own", "same", "so", "than", "too",
  "very", "s", "t", "can", "will", "just", "don", "should", "now",
]);

export interface SmartMatchResult {
  score: number; // 0-100 rounded
  bestProject?: {
    id: string;
    name: string;
  };
  matchedFocus: string[];
  matchedSpendCategories: string[];
  matchedSpendVendors: string[];
  budgetNote: string;
  deadlineNote: string;
  why: string[];
}

export interface GrantInput {
  id?: string;
  title: string;
  description?: string;
  agency?: string;
  closeDate?: string;
  awardFloor?: number;
  awardCeiling?: number;
  totalFunding?: number;
  fundingCategories?: string[];
  url?: string;
}

/**
 * Normalize text: lowercase, strip punctuation
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Tokenize text: split, remove stopwords, return Set
 */
export function tokenize(text: string): Set<string> {
  const normalized = normalizeText(text);
  const words = normalized.split(/\s+/);
  const tokens = new Set<string>();

  for (const word of words) {
    const cleaned = word.trim();
    if (cleaned.length >= 3 && !STOPWORDS.has(cleaned)) {
      tokens.add(cleaned);
    }
  }

  return tokens;
}

/**
 * Calculate Jaccard similarity between two token sets
 */
export function jaccard(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;

  const intersection = new Set<string>();
  for (const item of setA) {
    if (setB.has(item)) {
      intersection.add(item);
    }
  }

  const union = new Set<string>([...setA, ...setB]);
  return intersection.size / union.size;
}

/**
 * Find best project match for a grant
 */
export function bestProjectMatch(
  grant: GrantInput,
  projects: SmartContext["projects"]
): { bestProject: SmartContext["projects"][0] | null; score: number; matchedTokens: string[] } {
  if (projects.length === 0) {
    return { bestProject: null, score: 0, matchedTokens: [] };
  }

  const grantText = `${grant.title} ${grant.description || ""}`.toLowerCase();
  const grantTokens = tokenize(grantText);

  let bestScore = 0;
  let bestProject: SmartContext["projects"][0] | null = null;
  let bestMatchedTokens: string[] = [];

  for (const project of projects) {
    const projectText = `${project.name} ${project.description}`.toLowerCase();
    const projectTokens = tokenize(projectText);

    const similarity = jaccard(grantTokens, projectTokens);
    if (similarity > bestScore) {
      bestScore = similarity;
      bestProject = project;
      
      // Find matched tokens
      const matched: string[] = [];
      for (const token of grantTokens) {
        if (projectTokens.has(token)) {
          matched.push(token);
        }
      }
      bestMatchedTokens = matched.slice(0, 5); // Top 5 matched tokens
    }
  }

  return {
    bestProject: bestProject,
    score: bestScore,
    matchedTokens: bestMatchedTokens,
  };
}

/**
 * Calculate focus area overlap
 */
export function focusOverlap(
  grant: GrantInput,
  focusAreas: string[],
  keywords: string[]
): { score: number; matchedFocus: string[] } {
  const grantCategories = (grant.fundingCategories || []).map((c) => c.toLowerCase());
  const grantText = `${grant.title} ${grant.description || ""}`.toLowerCase();
  const grantTokens = tokenize(grantText);

  const matched: string[] = [];
  const allFocusTerms = [...focusAreas, ...keywords];

  for (const term of allFocusTerms) {
    const termLower = term.toLowerCase();
    
    // Check if term appears in funding categories
    if (grantCategories.some((cat) => cat.includes(termLower) || termLower.includes(cat))) {
      matched.push(term);
      continue;
    }

    // Check if term appears in grant text
    if (grantTokens.has(termLower) || grantText.includes(termLower)) {
      matched.push(term);
    }
  }

  // Score based on overlap ratio
  const score = allFocusTerms.length > 0 
    ? Math.min(matched.length / Math.max(allFocusTerms.length, 10), 1.0)
    : 0;

  return {
    score,
    matchedFocus: [...new Set(matched)].slice(0, 10), // Dedupe and limit
  };
}

/**
 * Calculate spend match (categories and vendors)
 */
export function spendMatch(
  grant: GrantInput,
  categories: SmartContext["spendSignals"]["topCategoriesL2"],
  vendors: SmartContext["spendSignals"]["topVendors"]
): {
  categoryScore: number;
  vendorScore: number;
  matchedCategories: string[];
  matchedVendors: string[];
} {
  const grantText = `${grant.title} ${grant.description || ""}`.toLowerCase();
  const grantTokens = tokenize(grantText);

  // Match categories
  const matchedCategories: string[] = [];
  for (const category of categories) {
    const categoryTerms = category.category.toLowerCase().split(/\s+/);
    for (const term of categoryTerms) {
      if (term.length >= 3 && (grantTokens.has(term) || grantText.includes(term))) {
        matchedCategories.push(category.category);
        break;
      }
    }
  }

  // Match vendors
  const matchedVendors: string[] = [];
  for (const vendor of vendors) {
    const vendorTerms = vendor.vendor.toLowerCase().split(/\s+/);
    for (const term of vendorTerms) {
      if (term.length >= 3 && (grantTokens.has(term) || grantText.includes(term))) {
        matchedVendors.push(vendor.vendor);
        break;
      }
    }
  }

  // Scores based on match ratio
  const categoryScore = categories.length > 0
    ? Math.min(matchedCategories.length / Math.max(categories.length, 5), 1.0)
    : 0;

  const vendorScore = vendors.length > 0
    ? Math.min(matchedVendors.length / Math.max(vendors.length, 5), 1.0)
    : 0;

  return {
    categoryScore,
    vendorScore,
    matchedCategories: [...new Set(matchedCategories)],
    matchedVendors: [...new Set(matchedVendors)],
  };
}

/**
 * Calculate budget fit
 */
export function budgetFit(
  grant: GrantInput,
  budgetRange: SmartContext["derived"]["budgetRange"]
): { score: number; note: string } {
  // If no budget range, neutral score
  if (budgetRange.min === null && budgetRange.max === null) {
    return { score: 0.5, note: "Budget not specified" };
  }

  // Get grant funding amount
  const grantAmount = grant.totalFunding || grant.awardCeiling || grant.awardFloor || 0;

  if (grantAmount === 0) {
    return { score: 0.5, note: "Grant budget not specified" };
  }

  // Check if grant amount overlaps with budget range
  const min = budgetRange.min || 0;
  const max = budgetRange.max || Infinity;

  if (grantAmount >= min && grantAmount <= max) {
    return { score: 1.0, note: `Budget fits: ${formatCurrency(grantAmount)} within ${formatCurrency(min)}-${formatCurrency(max)}` };
  }

  // Check if close (within 20%)
  const rangeSize = max - min;
  const tolerance = rangeSize * 0.2;

  if (grantAmount >= min - tolerance && grantAmount <= max + tolerance) {
    return { score: 0.7, note: `Budget close: ${formatCurrency(grantAmount)} near ${formatCurrency(min)}-${formatCurrency(max)}` };
  }

  // Far from range
  return { score: 0.2, note: `Budget mismatch: ${formatCurrency(grantAmount)} vs ${formatCurrency(min)}-${formatCurrency(max)}` };
}

/**
 * Format currency for display
 */
function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(0)}k`;
  }
  return `$${amount}`;
}

/**
 * Calculate deadline urgency
 */
export function deadlineUrgency(grant: GrantInput): { score: number; daysLeft: number | null; note: string } {
  if (!grant.closeDate) {
    return { score: 0.5, daysLeft: null, note: "Deadline not specified" };
  }

  try {
    const closeDate = new Date(grant.closeDate);
    const now = new Date();
    const diffMs = closeDate.getTime() - now.getTime();
    const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) {
      return { score: 0, daysLeft, note: "Deadline passed" };
    }

    // Score: clamp(1 - daysLeft/120, 0, 1)
    // More urgent (fewer days) = higher score
    const rawScore = 1 - daysLeft / 120;
    const score = Math.max(0, Math.min(1, rawScore));

    if (daysLeft <= 7) {
      return { score, daysLeft, note: `Closes in ${daysLeft} day${daysLeft !== 1 ? "s" : ""} - URGENT` };
    }
    if (daysLeft <= 30) {
      return { score, daysLeft, note: `Closes in ${daysLeft} days - Soon` };
    }
    if (daysLeft <= 60) {
      return { score, daysLeft, note: `Closes in ${daysLeft} days` };
    }
    return { score, daysLeft, note: `Closes in ${daysLeft} days` };
  } catch (error) {
    return { score: 0.5, daysLeft: null, note: "Invalid deadline format" };
  }
}

/**
 * Rank a single grant against context
 */
export function rankGrant(grant: GrantInput | DiscoveredGrant, context: SmartContext): SmartMatchResult {
  // Convert DiscoveredGrant to GrantInput if needed
  const grantInput: GrantInput = {
    id: grant.id,
    title: grant.title,
    description: grant.description,
    agency: grant.agency,
    closeDate: grant.closeDate,
    awardFloor: grant.awardFloor,
    awardCeiling: grant.awardCeiling,
    totalFunding: grant.totalFunding,
    fundingCategories: grant.fundingCategories,
    url: "applicationUrl" in grant ? grant.applicationUrl : (grant as GrantInput).url,
  };

  // Calculate all signals
  const projectMatch = bestProjectMatch(grantInput, context.projects);
  const focus = focusOverlap(grantInput, context.derived.focusAreas, context.derived.keywords);
  const spend = spendMatch(grantInput, context.spendSignals.topCategoriesL2, context.spendSignals.topVendors);
  const budget = budgetFit(grantInput, context.derived.budgetRange);
  const deadline = deadlineUrgency(grantInput);

  // Calculate final score with weighted formula
  const finalScore =
    0.45 * projectMatch.score +
    0.25 * focus.score +
    0.15 * budget.score +
    0.10 * deadline.score +
    0.05 * spend.categoryScore;

  // Build why bullets (max 4, priority order)
  const whyBullets: string[] = [];

  // 1. Project match (if score >= 0.12)
  if (projectMatch.score >= 0.12 && projectMatch.bestProject) {
    whyBullets.push(`Matches project: ${projectMatch.bestProject.name}`);
  }

  // 2. Focus overlap (top 3)
  if (focus.matchedFocus.length > 0) {
    const topFocus = focus.matchedFocus.slice(0, 3).join(", ");
    whyBullets.push(`Focus overlap: ${topFocus}`);
  }

  // 3. Spend match (top 2 categories/vendors)
  if (spend.matchedCategories.length > 0 || spend.matchedVendors.length > 0) {
    const spendMatches: string[] = [];
    if (spend.matchedCategories.length > 0) {
      spendMatches.push(...spend.matchedCategories.slice(0, 2));
    }
    if (spend.matchedVendors.length > 0 && spendMatches.length < 2) {
      spendMatches.push(...spend.matchedVendors.slice(0, 2 - spendMatches.length));
    }
    if (spendMatches.length > 0) {
      whyBullets.push(`Spend signal: ${spendMatches.join(", ")}`);
    }
  }

  // 4. Budget fit note (if present or mismatch)
  if (budget.note && budget.note !== "Grant budget not specified" && budget.note !== "Budget not specified") {
    whyBullets.push(budget.note);
  }

  // 5. Deadline note
  if (deadline.note && deadline.daysLeft !== null) {
    whyBullets.push(deadline.note);
  }

  // Limit to 4 bullets
  const finalWhy = whyBullets.slice(0, 4);

  return {
    score: Math.round(finalScore * 100), // 0-100
    bestProject: projectMatch.bestProject
      ? {
          id: projectMatch.bestProject.id,
          name: projectMatch.bestProject.name,
        }
      : undefined,
    matchedFocus: focus.matchedFocus.slice(0, 5),
    matchedSpendCategories: spend.matchedCategories.slice(0, 5),
    matchedSpendVendors: spend.matchedVendors.slice(0, 5),
    budgetNote: budget.note,
    deadlineNote: deadline.note,
    why: finalWhy,
  };
}

/**
 * Rerank grants and return top N
 */
export function rerankGrants(
  grants: DiscoveredGrant[],
  context: SmartContext,
  topN: number = 20
): Array<DiscoveredGrant & { smartMatch: SmartMatchResult }> {
  console.log("[Smart Match Ranker] Starting rerank of", grants.length, "grants");
  console.log("[Smart Match Ranker] Using context:", {
    projects: context.projects.length,
    keywords: context.derived.keywords.length,
    focusAreas: context.derived.focusAreas.length,
    budgetRange: context.derived.budgetRange,
  });
  
  // Rank all grants
  const ranked = grants.map((grant, index) => {
    const match = rankGrant(grant, context);
    if (index < 3) {
      // Log first 3 grants for debugging
      console.log(`[Smart Match Ranker] Grant ${index + 1}: "${grant.title.substring(0, 50)}..."`);
      console.log(`  Score: ${match.score}/100`);
      console.log(`  Project match: ${match.bestProject ? match.bestProject.name : "None"} (${match.matchedFocus.length} focus areas matched)`);
      console.log(`  Why: ${match.why.join("; ")}`);
    }
    return {
      grant,
      match,
    };
  });

  // Sort by score (descending)
  ranked.sort((a, b) => b.match.score - a.match.score);

  // Log score distribution
  const scores = ranked.map(r => r.match.score);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const maxScore = Math.max(...scores);
  const minScore = Math.min(...scores);
  console.log("[Smart Match Ranker] Score distribution:", {
    min: minScore,
    max: maxScore,
    avg: Math.round(avgScore),
    top10: scores.slice(0, 10).join(", "),
  });

  // Return top N with smartMatch attached
  const result = ranked.slice(0, topN).map((item) => ({
    ...item.grant,
    smartMatch: item.match,
  }));
  
  console.log("[Smart Match Ranker] Returning top", result.length, "grants");
  return result;
}
