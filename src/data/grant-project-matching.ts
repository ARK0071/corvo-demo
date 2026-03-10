/**
 * Grant-to-Project Matching Algorithm
 *
 * Scores grants against projects based on relevance factors:
 * - Focus area alignment
 * - Budget fit
 * - Timeline alignment
 * - Description relevance
 */

import type { Project } from "./projects";
import type { DiscoveredGrant } from "@/lib/grants-gov";
import type { PipelineGrant } from "./grant-pipeline";

export interface GrantProjectMatch {
  grantId: string;
  projectId: string;
  matchScore: number; // 0-100
  reasons: string[];
  recommendation: "strong_match" | "good_match" | "partial_match" | "weak_match";
  breakdown: {
    focusAreaAlignment: number;
    budgetFit: number;
    timelineAlignment: number;
    descriptionRelevance: number;
  };
}

const STOP_WORDS = new Set([
  "and", "the", "for", "with", "from", "that", "this", "also", "into", "such",
  "other", "through", "including", "related", "based", "using", "under", "over",
  "improvement", "development", "program", "project", "infrastructure",
]);

function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s,/&()\-–]+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
}

/**
 * Score focus area alignment (40% weight)
 */
function scoreFocusAreaAlignment(
  project: Project,
  grant: DiscoveredGrant | PipelineGrant
): { score: number; matches: string[] } {
  const projectKeywords = new Set<string>();
  const grantKeywords = new Set<string>();
  const matches: string[] = [];

  // Extract keywords from project focus areas
  for (const area of project.focusAreas) {
    for (const kw of extractKeywords(area)) {
      projectKeywords.add(kw);
    }
  }

  // Extract keywords from grant funding categories
  const grantCategories = "focusAreas" in grant ? grant.focusAreas : grant.fundingCategories || [];
  for (const category of grantCategories) {
    for (const kw of extractKeywords(category)) {
      grantKeywords.add(kw);
    }
  }

  // Also extract from grant title and description
  for (const kw of extractKeywords(grant.title)) {
    grantKeywords.add(kw);
  }
  for (const kw of extractKeywords(grant.description)) {
    grantKeywords.add(kw);
  }

  // Count matches
  let matchCount = 0;
  for (const kw of projectKeywords) {
    if (grantKeywords.has(kw)) {
      matchCount++;
      matches.push(kw);
    }
  }

  // Score based on match ratio
  const totalProjectKeywords = projectKeywords.size;
  if (totalProjectKeywords === 0) return { score: 50, matches: [] }; // Neutral if no focus areas

  const matchRatio = matchCount / totalProjectKeywords;
  const score = Math.min(100, Math.round(matchRatio * 100));

  return { score, matches: matches.slice(0, 5) }; // Return top 5 matches
}

/**
 * Score budget fit (25% weight)
 */
function scoreBudgetFit(project: Project, grant: DiscoveredGrant | PipelineGrant): number {
  const grantCeiling = grant.awardCeiling || 0;
  const grantFloor = grant.awardFloor || 0;
  const projectBudget = project.budget;

  if (projectBudget === 0) return 50; // Neutral if no budget specified
  if (grantCeiling === 0 && grantFloor === 0) return 50; // Neutral if grant amount unknown

  // Ideal: grant ceiling covers 50-100% of project budget
  const idealRatio = grantCeiling / projectBudget;

  if (idealRatio >= 1.0) {
    // Grant can fully fund the project
    return 100;
  } else if (idealRatio >= 0.5) {
    // Grant can fund 50-100% of project
    return 80;
  } else if (idealRatio >= 0.25) {
    // Grant can fund 25-50% of project
    return 60;
  } else if (idealRatio >= 0.1) {
    // Grant can fund 10-25% of project
    return 40;
  } else {
    // Grant covers less than 10% of project
    return 20;
  }
}

/**
 * Score timeline alignment (20% weight)
 */
function scoreTimelineAlignment(project: Project, grant: DiscoveredGrant | PipelineGrant): number {
  const grantCloseDate = grant.closeDate;
  const projectStartDate = project.startDate;
  const projectEndDate = project.endDate;

  if (!grantCloseDate) return 50; // Neutral if no grant deadline
  if (!projectStartDate && !projectEndDate) return 50; // Neutral if no project timeline

  const grantDeadline = new Date(grantCloseDate);
  const now = new Date();

  // If grant deadline has passed, low score
  if (grantDeadline < now) return 10;

  // Calculate days until grant deadline
  const daysUntilDeadline = Math.ceil(
    (grantDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  // If project has start date, check if grant deadline aligns
  if (projectStartDate) {
    const projectStart = new Date(projectStartDate);
    const daysUntilProjectStart = Math.ceil(
      (projectStart.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Ideal: grant deadline is 30-90 days before project start (time to apply and get award)
    if (daysUntilDeadline >= daysUntilProjectStart - 90 && daysUntilDeadline <= daysUntilProjectStart - 30) {
      return 100;
    } else if (daysUntilDeadline >= daysUntilProjectStart - 180 && daysUntilDeadline <= daysUntilProjectStart) {
      return 70;
    } else if (daysUntilDeadline > daysUntilProjectStart) {
      return 40; // Grant deadline after project start - less useful
    }
  }

  // Score based on grant deadline proximity
  if (daysUntilDeadline >= 60) {
    return 80; // Plenty of time
  } else if (daysUntilDeadline >= 30) {
    return 60; // Adequate time
  } else if (daysUntilDeadline >= 14) {
    return 40; // Tight timeline
  } else {
    return 20; // Very tight
  }
}

/**
 * Score description relevance (15% weight)
 */
function scoreDescriptionRelevance(
  project: Project,
  grant: DiscoveredGrant | PipelineGrant
): number {
  const projectKeywords = new Set<string>();
  const grantKeywords = new Set<string>();

  // Extract keywords from project description
  for (const kw of extractKeywords(project.description)) {
    projectKeywords.add(kw);
  }
  for (const kw of extractKeywords(project.name)) {
    projectKeywords.add(kw);
  }

  // Extract keywords from grant description and title
  for (const kw of extractKeywords(grant.description)) {
    grantKeywords.add(kw);
  }
  for (const kw of extractKeywords(grant.title)) {
    grantKeywords.add(kw);
  }

  // Count overlapping keywords
  let overlapCount = 0;
  for (const kw of projectKeywords) {
    if (grantKeywords.has(kw)) {
      overlapCount++;
    }
  }

  // Score based on overlap ratio
  const totalKeywords = projectKeywords.size;
  if (totalKeywords === 0) return 50;

  const overlapRatio = overlapCount / totalKeywords;
  return Math.min(100, Math.round(overlapRatio * 100));
}

/**
 * Match grants to a project
 */
export function matchGrantsToProject(
  project: Project,
  grants: (DiscoveredGrant | PipelineGrant)[]
): GrantProjectMatch[] {
  const matches: GrantProjectMatch[] = [];

  for (const grant of grants) {
    const focusArea = scoreFocusAreaAlignment(project, grant);
    const budgetFit = scoreBudgetFit(project, grant);
    const timeline = scoreTimelineAlignment(project, grant);
    const description = scoreDescriptionRelevance(project, grant);

    // Weighted overall score
    const overallScore = Math.round(
      focusArea.score * 0.40 +
      budgetFit * 0.25 +
      timeline * 0.20 +
      description * 0.15
    );

    // Determine recommendation
    let recommendation: GrantProjectMatch["recommendation"];
    if (overallScore >= 75) {
      recommendation = "strong_match";
    } else if (overallScore >= 60) {
      recommendation = "good_match";
    } else if (overallScore >= 40) {
      recommendation = "partial_match";
    } else {
      recommendation = "weak_match";
    }

    // Build reasons
    const reasons: string[] = [];
    if (focusArea.score >= 70) {
      reasons.push(`Strong focus area alignment: ${focusArea.matches.slice(0, 2).join(", ")}`);
    }
    if (budgetFit >= 70) {
      reasons.push("Grant funding aligns well with project budget");
    }
    if (timeline >= 70) {
      reasons.push("Grant deadline aligns with project timeline");
    }
    if (description >= 70) {
      reasons.push("High description relevance");
    }

    matches.push({
      grantId: grant.id,
      projectId: project.id,
      matchScore: overallScore,
      reasons: reasons.slice(0, 3), // Top 3 reasons
      recommendation,
      breakdown: {
        focusAreaAlignment: focusArea.score,
        budgetFit,
        timelineAlignment: timeline,
        descriptionRelevance: description,
      },
    });
  }

  // Sort by match score (highest first)
  return matches.sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Match a grant to all projects
 */
export function matchGrantToProjects(
  grant: DiscoveredGrant | PipelineGrant,
  projects: Project[]
): GrantProjectMatch[] {
  const matches: GrantProjectMatch[] = [];

  for (const project of projects) {
    const [match] = matchGrantsToProject(project, [grant]);
    if (match) {
      matches.push(match);
    }
  }

  // Sort by match score (highest first)
  return matches.sort((a, b) => b.matchScore - a.matchScore);
}
