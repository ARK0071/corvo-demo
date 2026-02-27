/**
 * Grant Intelligence Tool Implementations
 */

import {
  getAllPipelineGrants,
  getPipelineGrantById,
  type PipelineGrant,
} from "@/data/grant-pipeline";
import { currentPortProfile } from "@/data/port-profile";
import { fetchGrantDetails, type DiscoveredGrant } from "@/lib/grants-gov";
import { scoreGrantForPort, type GrantScore } from "@/data/grant-scoring";
import { getAllProjects, getProjectById } from "@/data/projects";
import { matchGrantsToProject, matchGrantToProjects } from "@/data/grant-project-matching";
import { analyzeCompetitiveIntelligence } from "@/data/competitive-intelligence";

// In-memory cache of grant scores (keyed by grant ID)
const grantScoreCache = new Map<string, GrantScore>();

/**
 * Get grants in the pipeline, optionally filtered by stage or urgency
 */
export async function getPipelineGrants(params: {
  stage?: "eligible" | "applied" | "under_review" | "awarded" | "rejected";
  urgent?: boolean;
}) {
  const allGrants = getAllPipelineGrants();
  let filtered = params.stage
    ? allGrants.filter((g) => g.stage === params.stage)
    : allGrants;

  if (params.urgent) {
    const now = new Date();
    filtered = filtered.filter((g) => {
      if (!g.closeDate) return false;
      const deadline = new Date(g.closeDate);
      const daysRemaining = Math.ceil(
        (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysRemaining <= 14 && daysRemaining >= 0;
    });
  }

  const summary = filtered.map((g) => ({
    id: g.id,
    title: g.title,
    agency: g.agency,
    stage: g.stage,
    awardCeiling: g.awardCeiling,
    closeDate: g.closeDate,
    daysRemaining: g.closeDate
      ? Math.ceil(
          (new Date(g.closeDate).getTime() - new Date().getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : null,
    notes: g.notes || null,
  }));

  return {
    count: filtered.length,
    totalValue: filtered.reduce((sum, g) => sum + (g.awardCeiling || 0), 0),
    grants: summary,
  };
}

/**
 * Explain why a grant received its fit score
 */
export async function explainGrantScore(params: { grantId: string }) {
  // Try to get from pipeline first
  let pipelineGrant = getPipelineGrantById(params.grantId);
  let discoveredGrant: DiscoveredGrant | null = null;

  if (pipelineGrant) {
    // Convert PipelineGrant to DiscoveredGrant for scoring
    discoveredGrant = {
      id: pipelineGrant.id,
      opportunityNumber: pipelineGrant.opportunityNumber,
      title: pipelineGrant.title,
      agency: pipelineGrant.agency,
      agencyCode: pipelineGrant.agencyCode,
      description: pipelineGrant.description,
      awardFloor: pipelineGrant.awardFloor,
      awardCeiling: pipelineGrant.awardCeiling,
      totalFunding: pipelineGrant.totalFunding,
      closeDate: pipelineGrant.closeDate,
      postDate: "",
      status: "posted",
      applicationUrl: pipelineGrant.applicationUrl,
      eligibility: pipelineGrant.eligibleActivities,
      fundingCategories: pipelineGrant.focusAreas,
      fundingInstruments: [],
      costSharing: false,
      alnNumbers: [],
      contactName: pipelineGrant.contactName,
      contactEmail: pipelineGrant.contactEmail,
      contactPhone: pipelineGrant.contactPhone,
    };
  } else {
    // Fetch from Grants.gov
    try {
      discoveredGrant = await fetchGrantDetails(params.grantId);
    } catch (error) {
      return {
        error: `Grant ${params.grantId} not found in pipeline or Grants.gov`,
      };
    }
  }

  // Check cache first
  let score = grantScoreCache.get(params.grantId);
  if (!score) {
    // Score the grant
    score = scoreGrantForPort(discoveredGrant, currentPortProfile);
    grantScoreCache.set(params.grantId, score);
  }

  // Calculate deadline info
  const daysRemaining = score.grant.closeDate
    ? Math.ceil(
        (new Date(score.grant.closeDate).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  return {
    grantId: params.grantId,
    title: score.grant.title,
    agency: score.grant.agency,
    overallScore: score.overallScore,
    recommendation: score.recommendation,
    eligibilityStatus: score.eligibilityStatus,
    breakdown: {
      eligibility: {
        score: score.eligibilityScore,
        status: score.eligibilityStatus,
        max: 100,
      },
      alignment: {
        score: score.alignmentScore,
        max: 100,
        weight: "35%",
      },
      impact: {
        score: score.impactScore,
        max: 100,
        weight: "15%",
      },
      competitiveness: {
        score: score.competitivenessScore,
        max: 100,
        weight: "15%",
      },
    },
    strengths: score.strengths,
    concerns: score.concerns,
    keyRequirements: score.keyRequirements,
    deadline: {
      closeDate: score.grant.closeDate || null,
      daysRemaining,
      urgency:
        daysRemaining === null
          ? "unknown"
          : daysRemaining <= 7
            ? "CRITICAL"
            : daysRemaining <= 14
              ? "URGENT"
              : daysRemaining <= 30
                ? "UPCOMING"
                : "FUTURE",
    },
  };
}

/**
 * Calculate financial scenarios for a grant
 */
export async function calculateFinancialScenario(params: {
  grantId: string;
  requestAmount?: number;
}) {
  const pipelineGrant = getPipelineGrantById(params.grantId);
  if (!pipelineGrant) {
    return { error: `Grant ${params.grantId} not found in pipeline` };
  }

  const grantAmount = params.requestAmount || pipelineGrant.awardCeiling || 0;
  const localMatchRate = 0.2; // Assume 20% local match (typical for federal grants)
  const localMatch = grantAmount * localMatchRate;

  // Bond alternative calculation (20-year bond at 5% interest)
  const bondTerm = 20;
  const bondRate = 0.05;
  const monthlyRate = bondRate / 12;
  const numPayments = bondTerm * 12;
  const monthlyPayment =
    (grantAmount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
    (Math.pow(1 + monthlyRate, numPayments) - 1);
  const totalBondCost = monthlyPayment * numPayments;
  const bondInterest = totalBondCost - grantAmount;

  // Operating budget affordability
  const operatingBudget = currentPortProfile.characteristics.operatingBudget || 50_000_000;
  const matchAsPercentOfBudget = (localMatch / operatingBudget) * 100;

  return {
    grantId: params.grantId,
    title: pipelineGrant.title,
    scenario: {
      grantFunding: {
        totalRequest: grantAmount,
        federalShare: grantAmount - localMatch,
        localMatch,
        localMatchRate: localMatchRate * 100,
        netCost: localMatch,
      },
      bondAlternative: {
        principal: grantAmount,
        interestRate: bondRate * 100,
        term: bondTerm,
        totalCost: totalBondCost,
        totalInterest: bondInterest,
        monthlyPayment,
      },
      comparison: {
        grantSavings: totalBondCost - localMatch,
        savingsPercentage:
          ((totalBondCost - localMatch) / totalBondCost) * 100,
      },
    },
    affordability: {
      operatingBudget,
      matchAsPercentOfBudget,
      affordable: matchAsPercentOfBudget < 20, // Rule of thumb: match should be <20% of annual budget
      assessment:
        matchAsPercentOfBudget < 10
          ? "Highly affordable from operating reserves"
          : matchAsPercentOfBudget < 20
            ? "Affordable with budget planning"
            : matchAsPercentOfBudget < 30
              ? "Tight — may require financing"
              : "Not affordable from operating budget alone",
    },
  };
}

/**
 * Analyze grant deadlines by urgency tier
 */
export async function getDeadlineUrgency(params: { includeApplied?: boolean }) {
  const allGrants = getAllPipelineGrants();
  const now = new Date();

  // Filter to grants with deadlines
  let grantsWithDeadlines = allGrants.filter((g) => g.closeDate);

  // Optionally exclude already applied grants
  if (!params.includeApplied) {
    grantsWithDeadlines = grantsWithDeadlines.filter(
      (g) =>
        g.stage === "eligible" ||
        g.stage === "applied" ||
        g.stage === "under_review"
    );
  }

  // Categorize by urgency
  const categorized: Record<
    string,
    Array<{
      id: string;
      title: string;
      stage: string;
      daysRemaining: number;
      closeDate: string;
      awardCeiling: number;
    }>
  > = {
    CRITICAL: [],
    URGENT: [],
    UPCOMING: [],
    FUTURE: [],
  };

  for (const grant of grantsWithDeadlines) {
    const deadline = new Date(grant.closeDate!);
    const daysRemaining = Math.ceil(
      (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysRemaining < 0) continue; // Skip past deadlines

    const category =
      daysRemaining <= 7
        ? "CRITICAL"
        : daysRemaining <= 14
          ? "URGENT"
          : daysRemaining <= 30
            ? "UPCOMING"
            : "FUTURE";

    categorized[category].push({
      id: grant.id,
      title: grant.title,
      stage: grant.stage,
      daysRemaining,
      closeDate: grant.closeDate!,
      awardCeiling: grant.awardCeiling,
    });
  }

  // Sort each category by days remaining
  for (const category of Object.keys(categorized)) {
    categorized[category].sort((a, b) => a.daysRemaining - b.daysRemaining);
  }

  return {
    summary: {
      critical: categorized.CRITICAL.length,
      urgent: categorized.URGENT.length,
      upcoming: categorized.UPCOMING.length,
      future: categorized.FUTURE.length,
    },
    deadlines: categorized,
  };
}

/**
 * Recommend next actions based on pipeline status
 */
export async function recommendNextActions() {
  const allGrants = getAllPipelineGrants();
  const now = new Date();

  const recommendations: Array<{
    priority: "high" | "medium" | "low";
    action: string;
    reason: string;
    grantId?: string;
  }> = [];

  // Check for critical deadlines
  const criticalDeadlines = allGrants.filter((g) => {
    if (!g.closeDate) return false;
    const daysRemaining = Math.ceil(
      (new Date(g.closeDate).getTime() - now.getTime()) /
        (1000 * 60 * 60 * 24)
    );
    return daysRemaining <= 7 && daysRemaining >= 0 && g.stage === "eligible";
  });

  for (const grant of criticalDeadlines) {
    recommendations.push({
      priority: "high",
      action: `Apply for ${grant.title}`,
      reason: `Deadline in ${Math.ceil((new Date(grant.closeDate!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))} days`,
      grantId: grant.id,
    });
  }

  // Check for high-value opportunities not yet applied
  const highValueEligible = allGrants
    .filter((g) => g.stage === "eligible" && g.awardCeiling > 10_000_000)
    .sort((a, b) => b.awardCeiling - a.awardCeiling)
    .slice(0, 3);

  for (const grant of highValueEligible) {
    if (recommendations.find((r) => r.grantId === grant.id)) continue; // Skip if already recommended

    recommendations.push({
      priority: "medium",
      action: `Review ${grant.title} for application`,
      reason: `High-value opportunity ($${(grant.awardCeiling / 1_000_000).toFixed(1)}M)`,
      grantId: grant.id,
    });
  }

  // Check for awarded grants without vendor matches
  const awardedGrants = allGrants.filter((g) => g.stage === "awarded");
  if (awardedGrants.length > 0) {
    recommendations.push({
      priority: "medium",
      action: "Match vendors to awarded grants",
      reason: `${awardedGrants.length} grant${awardedGrants.length !== 1 ? "s" : ""} awarded — use Vendor Outreach tab to find contractors`,
    });
  }

  // If no recommendations, suggest scanning for new opportunities
  if (recommendations.length === 0) {
    recommendations.push({
      priority: "low",
      action: "Scan for new grant opportunities",
      reason:
        "No critical deadlines or pending actions — use Discover tab to search Grants.gov",
    });
  }

  return {
    count: recommendations.length,
    recommendations: recommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }),
  };
}

/**
 * Compare two grants side-by-side
 */
export async function compareTwoGrants(params: {
  grantId1: string;
  grantId2: string;
}) {
  const grant1 = getPipelineGrantById(params.grantId1);
  const grant2 = getPipelineGrantById(params.grantId2);

  if (!grant1) return { error: `Grant ${params.grantId1} not found` };
  if (!grant2) return { error: `Grant ${params.grantId2} not found` };

  // Get scores for both grants
  const score1 =
    grantScoreCache.get(params.grantId1) ||
    scoreGrantForPort(
      {
        id: grant1.id,
        opportunityNumber: grant1.opportunityNumber,
        title: grant1.title,
        agency: grant1.agency,
        agencyCode: grant1.agencyCode,
        description: grant1.description,
        awardFloor: grant1.awardFloor,
        awardCeiling: grant1.awardCeiling,
        totalFunding: grant1.totalFunding,
        closeDate: grant1.closeDate,
        postDate: "",
        status: "posted",
        applicationUrl: grant1.applicationUrl,
        eligibility: grant1.eligibleActivities,
        fundingCategories: grant1.focusAreas,
        fundingInstruments: [],
        costSharing: false,
        alnNumbers: [],
      },
      currentPortProfile
    );

  const score2 =
    grantScoreCache.get(params.grantId2) ||
    scoreGrantForPort(
      {
        id: grant2.id,
        opportunityNumber: grant2.opportunityNumber,
        title: grant2.title,
        agency: grant2.agency,
        agencyCode: grant2.agencyCode,
        description: grant2.description,
        awardFloor: grant2.awardFloor,
        awardCeiling: grant2.awardCeiling,
        totalFunding: grant2.totalFunding,
        closeDate: grant2.closeDate,
        postDate: "",
        status: "posted",
        applicationUrl: grant2.applicationUrl,
        eligibility: grant2.eligibleActivities,
        fundingCategories: grant2.focusAreas,
        fundingInstruments: [],
        costSharing: false,
        alnNumbers: [],
      },
      currentPortProfile
    );

  return {
    comparison: [
      {
        metric: "Overall Score",
        grant1: score1.overallScore,
        grant2: score2.overallScore,
        winner:
          score1.overallScore > score2.overallScore
            ? grant1.title
            : grant2.title,
      },
      {
        metric: "Award Ceiling",
        grant1: `$${(grant1.awardCeiling / 1_000_000).toFixed(1)}M`,
        grant2: `$${(grant2.awardCeiling / 1_000_000).toFixed(1)}M`,
        winner:
          grant1.awardCeiling > grant2.awardCeiling
            ? grant1.title
            : grant2.title,
      },
      {
        metric: "Deadline",
        grant1: grant1.closeDate || "TBD",
        grant2: grant2.closeDate || "TBD",
        winner:
          grant1.closeDate && grant2.closeDate
            ? new Date(grant1.closeDate) < new Date(grant2.closeDate)
              ? grant1.title + " (sooner)"
              : grant2.title + " (sooner)"
            : "N/A",
      },
      {
        metric: "Alignment Score",
        grant1: score1.alignmentScore,
        grant2: score2.alignmentScore,
        winner:
          score1.alignmentScore > score2.alignmentScore
            ? grant1.title
            : grant2.title,
      },
      {
        metric: "Recommendation",
        grant1: score1.recommendation,
        grant2: score2.recommendation,
        winner: "See scores",
      },
    ],
    grant1: {
      title: grant1.title,
      agency: grant1.agency,
      strengths: score1.strengths,
      concerns: score1.concerns,
    },
    grant2: {
      title: grant2.title,
      agency: grant2.agency,
      strengths: score2.strengths,
      concerns: score2.concerns,
    },
  };
}

/**
 * Match grants to a project
 */
export async function matchGrantsToProjectTool(params: { projectId: string }) {
  const project = getProjectById(params.projectId);
  if (!project) {
    return { error: `Project ${params.projectId} not found` };
  }

  // Get all grants (from pipeline and available grants)
  const pipelineGrants = getAllPipelineGrants();
  const allGrants = [...pipelineGrants];

  const matches = matchGrantsToProject(project, allGrants);

  return {
    projectId: params.projectId,
    projectName: project.name,
    matchCount: matches.length,
    matches: matches.slice(0, 10).map((match) => {
      const grant = allGrants.find((g) => g.id === match.grantId);
      return {
        grantId: match.grantId,
        grantTitle: grant?.title || "Unknown",
        matchScore: match.matchScore,
        recommendation: match.recommendation,
        reasons: match.reasons,
        breakdown: match.breakdown,
      };
    }),
  };
}

/**
 * Match a grant to projects
 */
export async function getProjectGrantMatches(params: { grantId: string }) {
  // Try to get from pipeline first
  let grant: PipelineGrant | DiscoveredGrant | null = getPipelineGrantById(params.grantId) ?? null;

  if (!grant) {
    // Try to fetch from Grants.gov
    try {
      grant = await fetchGrantDetails(params.grantId);
    } catch (error) {
      return { error: `Grant ${params.grantId} not found` };
    }
  }

  if (!grant) {
    return { error: `Grant ${params.grantId} not found` };
  }

  const projects = getAllProjects();
  const matches = matchGrantToProjects(grant, projects);

  return {
    grantId: params.grantId,
    grantTitle: grant.title,
    matchCount: matches.length,
    matches: matches.slice(0, 10).map((match) => {
      const project = projects.find((p) => p.id === match.projectId);
      return {
        projectId: match.projectId,
        projectName: project?.name || "Unknown",
        matchScore: match.matchScore,
        recommendation: match.recommendation,
        reasons: match.reasons,
        breakdown: match.breakdown,
      };
    }),
  };
}

/**
 * Get competitive intelligence for a grant
 */
export async function getCompetitiveIntelligence(params: { grantId: string }) {
  // Try to get from pipeline first
  let grant: PipelineGrant | DiscoveredGrant | null = getPipelineGrantById(params.grantId) ?? null;
  
  // If not in pipeline, try to fetch details
  if (!grant) {
    try {
      grant = await fetchGrantDetails(params.grantId);
    } catch (err) {
      return { error: `Grant ${params.grantId} not found` };
    }
  }

  if (!grant) {
    return { error: `Grant ${params.grantId} not found` };
  }

  const competitiveIntel = await analyzeCompetitiveIntelligence(grant as DiscoveredGrant);
  
  if (!competitiveIntel) {
    return {
      grantId: grant.id,
      grantTitle: grant.title,
      message: "No competitive intelligence data available for this grant program",
    };
  }

  return {
    grantId: grant.id,
    grantTitle: grant.title,
    programName: competitiveIntel.programName,
    insights: competitiveIntel.insights,
  };
}
