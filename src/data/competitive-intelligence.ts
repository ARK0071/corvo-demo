/**
 * Competitive Intelligence Service
 *
 * Analyzes historical grant awards to provide competitive insights:
 * - Which ports won similar grants
 * - Award size patterns and distributions
 * - Geographic patterns
 * - Project type success rates
 * - Competitive positioning advice
 */

import type { DiscoveredGrant } from "@/lib/grants-gov";
import { PIDP_AWARDS, type PIDPAward } from "./marad-pidp-awards";
import { USDOT_AWARDS, type USDOTAward } from "./usdot-awards";
import type { PortProfile } from "./port-profile";
import { getDefaultProfile, ensureProfilesLoaded } from "./port-profile";
import { getCompetitiveIntelligenceFromUSAspending, type GrantAward } from "@/lib/usaspending";

export interface CompetitiveInsight {
  grantId: string;
  programName: string;
  insights: {
    historicalAwards: {
      count: number;
      totalFunding: number;
      averageAward: number;
      medianAward: number;
      minAward: number;
      maxAward: number;
    };
    similarProjects: Array<{
      recipient: string;
      project: string;
      amount: number;
      year: number;
      location: string;
      projectType?: string;
    }>;
    geographicPatterns: {
      topStates: Array<{ state: string; count: number; totalFunding: number }>;
      regionalFocus: string; // e.g., "Gulf Coast", "West Coast", "National"
    };
    projectTypeSuccess: Array<{
      projectType: string;
      count: number;
      averageAward: number;
      successRate: number; // Percentage of applications that won
    }>;
    competitivePosition: {
      portAdvantages: string[];
      portRisks: string[];
      recommendation: string;
    };
    usaspendingData?: {
      totalAwards: number;
      totalFunding: number;
      topRecipients: Array<{ recipient: string; awardCount: number; totalAmount: number; location: string }>;
      recentAwards: Array<{ recipient: string; amount: number; year: number; location: string; description: string }>;
    };
  };
}

/**
 * CFDA number mapping for common grant programs
 */
const PROGRAM_CFDA_MAP: Record<string, string> = {
  "PSGP": "97.056", // Port Security Grant Program
  "PIDP": "20.823", // Port Infrastructure Development Program
  "RAISE": "20.205", // Rebuilding American Infrastructure with Sustainability and Equity
  "INFRA": "20.205", // Infrastructure for Rebuilding America
  "CRISI": "20.325", // Consolidated Rail Infrastructure and Safety Improvements
  "EPA Clean Ports": "66.039", // Clean Ports Program
};

/**
 * Analyze competitive intelligence for a specific grant
 */
export async function analyzeCompetitiveIntelligence(grant: DiscoveredGrant): Promise<CompetitiveInsight | null> {
  await ensureProfilesLoaded();
  const profile = getDefaultProfile();
  if (!profile) return null;
  
  // Identify the grant program
  const programName = identifyGrantProgram(grant);
  if (!programName) return null;

  // Get relevant historical awards from static data
  const historicalAwards = getHistoricalAwardsForProgram(programName);
  
  // Get USAspending data for this program
  let usaspendingAwards: GrantAward[] = [];
  try {
    const cfdaNumber = PROGRAM_CFDA_MAP[programName];
    const usaspendingResult = await getCompetitiveIntelligenceFromUSAspending(
      programName,
      cfdaNumber || undefined,
      {
        minAmount: 500_000,
        years: 5,
        states: ["TX", "LA", "MS", "AL", "FL"], // Gulf Coast states
      }
    );
    usaspendingAwards = usaspendingResult?.awards || [];
  } catch (err) {
    console.error("Error fetching USAspending data:", err);
    // Continue with static data only - don't break the UI
    usaspendingAwards = [];
  }

  // Combine static and USAspending data for competitive position analysis
  // Note: allAwards is used for competitive position, which expects historical award format
  const allAwards = [...historicalAwards];
  
  if (allAwards.length === 0 && usaspendingAwards.length === 0) {
    return null; // No historical data available
  }

  // Calculate statistics from all awards (combine static and USAspending)
  const allAmounts = [
    ...historicalAwards.map(a => a.amount),
    ...usaspendingAwards.map(a => a.awardAmount),
  ].sort((a, b) => a - b);
  
  const totalCount = allAmounts.length;
  const totalFunding = allAmounts.reduce((sum, amt) => sum + amt, 0);
  const averageAward = totalCount > 0 ? totalFunding / totalCount : 0;
  const medianAward = totalCount > 0
    ? (totalCount % 2 === 0
      ? (allAmounts[totalCount / 2 - 1] + allAmounts[totalCount / 2]) / 2
      : allAmounts[Math.floor(totalCount / 2)])
    : 0;
  const minAward = allAmounts[0] || 0;
  const maxAward = allAmounts[allAmounts.length - 1] || 0;

  // Find similar projects (combine static and USAspending)
  const similarProjectsStatic = findSimilarProjects(grant, historicalAwards);
  const similarProjectsUSAspending = usaspendingAwards
    .slice(0, 10)
    .map(award => ({
      recipient: award.recipientName,
      project: award.description || "Grant Award",
      amount: award.awardAmount,
      year: parseInt(award.startDate.slice(0, 4)) || new Date().getFullYear(),
      location: `${award.placeOfPerformance.city || ""} ${award.placeOfPerformance.state}`.trim(),
      projectType: extractProjectType(award.description),
      source: "usaspending" as const,
    }));
  
  const similarProjects = [
    ...similarProjectsStatic.map(p => ({ ...p, source: "static" as const })),
    ...similarProjectsUSAspending,
  ].sort((a, b) => b.amount - a.amount).slice(0, 10);

  // Analyze geographic patterns (combine all awards)
  const allAwardsForGeo = [
    ...historicalAwards,
    ...usaspendingAwards.map(a => ({
      amount: a.awardAmount,
      location: { state: a.placeOfPerformance.state, city: a.placeOfPerformance.city },
    })),
  ];
  const geographicPatterns = analyzeGeographicPatterns(allAwardsForGeo);

  // Analyze project type success rates
  const projectTypeSuccess = analyzeProjectTypeSuccess(historicalAwards);

  // Assess competitive position
  const competitivePosition = assessCompetitivePosition(grant, profile, allAwards);

  // USAspending-specific insights
  const usaspendingData = usaspendingAwards.length > 0 ? {
    totalAwards: usaspendingAwards.length,
    totalFunding: usaspendingAwards.reduce((sum, a) => sum + a.awardAmount, 0),
    topRecipients: getTopRecipients(usaspendingAwards),
    recentAwards: usaspendingAwards
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
      .slice(0, 5)
      .map(a => ({
        recipient: a.recipientName,
        amount: a.awardAmount,
        year: parseInt(a.startDate.slice(0, 4)) || new Date().getFullYear(),
        location: `${a.placeOfPerformance.city || ""} ${a.placeOfPerformance.state}`.trim(),
        description: a.description,
      })),
  } : undefined;

  return {
    grantId: grant.id,
    programName,
    insights: {
      historicalAwards: {
        count: totalCount,
        totalFunding,
        averageAward,
        medianAward,
        minAward,
        maxAward,
      },
      similarProjects: similarProjects.slice(0, 10), // Top 10
      geographicPatterns,
      projectTypeSuccess: projectTypeSuccess.slice(0, 5), // Top 5
      competitivePosition,
      usaspendingData,
    },
  };
}

/**
 * Extract project type from description
 */
function extractProjectType(description: string): string {
  const desc = description.toLowerCase();
  if (desc.includes("terminal")) return "Terminal";
  if (desc.includes("dredg")) return "Dredging";
  if (desc.includes("rail") || desc.includes("intermodal")) return "Rail/Intermodal";
  if (desc.includes("security")) return "Security";
  if (desc.includes("equipment") || desc.includes("crane")) return "Equipment";
  if (desc.includes("infrastructure")) return "Infrastructure";
  return "Other";
}

/**
 * Get top recipients from USAspending awards
 */
function getTopRecipients(awards: GrantAward[]): Array<{
  recipient: string;
  awardCount: number;
  totalAmount: number;
  location: string;
}> {
  const recipientMap = new Map<string, { count: number; total: number; location: string }>();
  
  for (const award of awards) {
    const existing = recipientMap.get(award.recipientName);
    if (existing) {
      existing.count++;
      existing.total += award.awardAmount;
    } else {
      recipientMap.set(award.recipientName, {
        count: 1,
        total: award.awardAmount,
        location: `${award.placeOfPerformance.city || ""} ${award.placeOfPerformance.state}`.trim(),
      });
    }
  }
  
  return Array.from(recipientMap.entries())
    .map(([recipient, data]) => ({
      recipient,
      awardCount: data.count,
      totalAmount: data.total,
      location: data.location,
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 5);
}

/**
 * Identify the grant program from grant details
 */
function identifyGrantProgram(grant: DiscoveredGrant): string | null {
  const title = grant.title.toLowerCase();
  const description = (grant.description || "").toLowerCase();
  const agency = grant.agency.toLowerCase();
  const combined = `${title} ${description} ${agency}`;

  // Check for specific programs
  if (combined.includes("pidp") || combined.includes("port infrastructure development")) {
    return "PIDP";
  }
  if (combined.includes("raise") || combined.includes("rebuilding american infrastructure")) {
    return "RAISE";
  }
  if (combined.includes("infra") || combined.includes("infrastructure for rebuilding")) {
    return "INFRA";
  }
  if (combined.includes("mega") || combined.includes("multimodal project discretionary")) {
    return "MEGA";
  }
  if (combined.includes("build") && combined.includes("better utilizing investments")) {
    return "BUILD";
  }
  if (combined.includes("crisi") || combined.includes("consolidated rail infrastructure")) {
    return "CRISI";
  }
  if (combined.includes("psgp") || combined.includes("port security grant")) {
    return "PSGP";
  }
  if (combined.includes("clean ports") || combined.includes("zero-emission")) {
    return "EPA Clean Ports";
  }

  // Generic DOT programs
  if (agency.includes("dot") || agency.includes("transportation")) {
    return "USDOT General";
  }

  return null;
}

/**
 * Get historical awards for a specific program
 */
function getHistoricalAwardsForProgram(programName: string): Array<PIDPAward | USDOTAward> {
  const allAwards: Array<PIDPAward | USDOTAward> = [];

  if (programName === "PIDP") {
    allAwards.push(...PIDP_AWARDS);
  } else if (["RAISE", "INFRA", "MEGA", "BUILD"].includes(programName)) {
    const programCode = programName === "BUILD" ? "RAISE" : programName; // BUILD became RAISE
    allAwards.push(...USDOT_AWARDS.filter(a => a.programCode === programCode));
  } else if (programName === "USDOT General") {
    allAwards.push(...USDOT_AWARDS);
  }

  return allAwards;
}

/**
 * Find similar projects based on grant keywords and project types
 */
function findSimilarProjects(
  grant: DiscoveredGrant,
  historicalAwards: Array<PIDPAward | USDOTAward>
): Array<{
  recipient: string;
  project: string;
  amount: number;
  year: number;
  location: string;
  projectType?: string;
}> {
  // Extract keywords from grant
  const grantKeywords = extractKeywords(grant.title + " " + (grant.description || ""));
  
  return historicalAwards
    .map(award => {
      const projectText = `${award.project} ${award.projectType || ""}`.toLowerCase();
      const keywordMatches = grantKeywords.filter(kw => projectText.includes(kw.toLowerCase())).length;
      
      return {
        award,
        relevanceScore: keywordMatches,
      };
    })
    .filter(item => item.relevanceScore > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .map(item => ({
      recipient: item.award.recipient,
      project: item.award.project,
      amount: item.award.amount,
      year: item.award.year,
      location: `${item.award.location.city || ""} ${item.award.location.state}`.trim(),
      projectType: item.award.projectType,
    }));
}

/**
 * Analyze geographic patterns in awards
 * Accepts any award-like object with amount and location
 */
function analyzeGeographicPatterns(
  awards: Array<{ amount: number; location: { state: string; city?: string } }>
): {
  topStates: Array<{ state: string; count: number; totalFunding: number }>;
  regionalFocus: string;
} {
  const stateStats = awards.reduce((acc, award) => {
    const state = award.location.state;
    if (!acc[state]) {
      acc[state] = { count: 0, totalFunding: 0 };
    }
    acc[state].count++;
    acc[state].totalFunding += award.amount;
    return acc;
  }, {} as Record<string, { count: number; totalFunding: number }>);

  const topStates = Object.entries(stateStats)
    .map(([state, stats]) => ({ state, ...stats }))
    .sort((a, b) => b.totalFunding - a.totalFunding)
    .slice(0, 5);

  // Determine regional focus
  const gulfCoastStates = ["TX", "LA", "MS", "AL", "FL"];
  const westCoastStates = ["CA", "OR", "WA"];
  const eastCoastStates = ["ME", "NH", "MA", "RI", "CT", "NY", "NJ", "PA", "MD", "VA", "NC", "SC", "GA"];

  const gulfCount = topStates.filter(s => gulfCoastStates.includes(s.state)).length;
  const westCount = topStates.filter(s => westCoastStates.includes(s.state)).length;
  const eastCount = topStates.filter(s => eastCoastStates.includes(s.state)).length;

  let regionalFocus = "National";
  if (gulfCount >= 2) regionalFocus = "Gulf Coast";
  else if (westCount >= 2) regionalFocus = "West Coast";
  else if (eastCount >= 2) regionalFocus = "East Coast";

  return { topStates, regionalFocus };
}

/**
 * Analyze project type success rates
 */
function analyzeProjectTypeSuccess(
  awards: Array<PIDPAward | USDOTAward>
): Array<{
  projectType: string;
  count: number;
  averageAward: number;
  successRate: number;
}> {
  const typeStats = awards.reduce((acc, award) => {
    const projectType = "projectType" in award && award.projectType 
      ? award.projectType 
      : "Other";
    
    if (!acc[projectType]) {
      acc[projectType] = { count: 0, totalFunding: 0 };
    }
    acc[projectType].count++;
    acc[projectType].totalFunding += award.amount;
    return acc;
  }, {} as Record<string, { count: number; totalFunding: number }>);

  return Object.entries(typeStats)
    .map(([projectType, stats]) => ({
      projectType,
      count: stats.count,
      averageAward: stats.totalFunding / stats.count,
      successRate: (stats.count / awards.length) * 100, // Percentage of total awards
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Assess competitive position for the port
 */
function assessCompetitivePosition(
  grant: DiscoveredGrant,
  profile: PortProfile,
  historicalAwards: Array<PIDPAward | USDOTAward>
): {
  portAdvantages: string[];
  portRisks: string[];
  recommendation: string;
} {
  const advantages: string[] = [];
  const risks: string[] = [];

  // Check geographic advantage
  const txAwards = historicalAwards.filter(a => a.location.state === "TX");
  if (txAwards.length > 0) {
    advantages.push(`Texas ports have won ${txAwards.length} similar awards historically`);
  } else {
    risks.push("Limited historical awards to Texas ports in this program");
  }

  // Check award size fit
  const avgAward = historicalAwards.reduce((sum, a) => sum + a.amount, 0) / historicalAwards.length;
  if (grant.awardCeiling && grant.awardCeiling >= avgAward * 0.8) {
    advantages.push(`Grant award range (${formatCurrency(grant.awardCeiling)}) aligns with historical average (${formatCurrency(avgAward)})`);
  }

  // Check project type alignment
  const projectTypes = historicalAwards
    .map(a => "projectType" in a ? a.projectType : null)
    .filter((pt): pt is string => pt !== null);
  
  const commonTypes = [...new Set(projectTypes)];
  if (commonTypes.length > 0) {
    advantages.push(`Common project types: ${commonTypes.slice(0, 3).join(", ")}`);
  }

  // Generate recommendation
  let recommendation = "Moderate competitiveness";
  if (advantages.length >= 3) {
    recommendation = "Strong competitive position";
  } else if (risks.length >= 2) {
    recommendation = "Challenging but possible with strong application";
  }

  return {
    portAdvantages: advantages,
    portRisks: risks,
    recommendation,
  };
}

/**
 * Extract keywords from text
 */
function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by",
    "program", "grant", "funding", "opportunity", "infrastructure", "development",
  ]);
  
  return text
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word))
    .slice(0, 10);
}

/**
 * Format currency
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Get competitive intelligence summary for multiple grants
 */
export async function getCompetitiveIntelligenceSummary(grants: DiscoveredGrant[]) {
  const settled = await Promise.all(
    grants.map(grant => analyzeCompetitiveIntelligence(grant))
  );
  const insights = settled.filter((ci): ci is CompetitiveInsight => ci !== null);

  return {
    totalGrants: grants.length,
    grantsWithIntel: insights.length,
    programs: [...new Set(insights.map(i => i.programName))],
    insights,
  };
}
