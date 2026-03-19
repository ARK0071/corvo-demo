/**
 * Grant-Project Matching
 *
 * Matches grants to projects based on focus area overlap,
 * budget fit, and keyword similarity.
 */

import type { Project } from "./projects";
import type { PipelineGrant } from "./grant-pipeline";
import type { DiscoveredGrant } from "@/lib/grants-gov";

export interface GrantProjectMatch {
  grantId: string;
  projectId: string;
  matchScore: number; // 0-100
  recommendation: "strong_match" | "good_match" | "partial_match" | "weak_match";
  reasons: string[];
}

type GrantLike = PipelineGrant | DiscoveredGrant;

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
}

function keywordOverlap(a: string[], b: string[]): number {
  const setA = new Set(a.map(normalize));
  const setB = new Set(b.map(normalize));
  let matches = 0;
  for (const word of setA) {
    if (setB.has(word)) matches++;
  }
  const union = new Set([...setA, ...setB]).size;
  return union > 0 ? matches / union : 0;
}

function textOverlap(text: string, keywords: string[]): number {
  const lower = text.toLowerCase();
  let hits = 0;
  for (const kw of keywords) {
    if (lower.includes(kw.toLowerCase())) hits++;
  }
  return keywords.length > 0 ? hits / keywords.length : 0;
}

function scoreMatch(project: Project, grant: GrantLike): GrantProjectMatch {
  const grantFocusAreas = "focusAreas" in grant ? (grant.focusAreas ?? []) : [];
  const grantActivities = "eligibleActivities" in grant ? (grant.eligibleActivities ?? []) : [];
  const grantDesc = grant.description || "";
  const grantTitle = grant.title || "";

  // Focus area overlap (40%)
  const focusScore = keywordOverlap(project.focusAreas, [...grantFocusAreas, ...grantActivities]) * 100;

  // Description keyword match (30%)
  const descScore = textOverlap(`${grantDesc} ${grantTitle}`, project.focusAreas) * 100;

  // Budget fit (15%) - project budget should be in grant's range
  let budgetScore = 50;
  const ceiling = "awardCeiling" in grant ? grant.awardCeiling : 0;
  const floor = "awardFloor" in grant ? grant.awardFloor : 0;
  if (ceiling > 0 && project.budget > 0) {
    if (project.budget <= ceiling && project.budget >= floor) {
      budgetScore = 100;
    } else if (project.budget <= ceiling * 2) {
      budgetScore = 60;
    } else {
      budgetScore = 20;
    }
  }

  // Project readiness (15%)
  const readinessMap: Record<string, number> = {
    construction: 90,
    procurement: 80,
    design: 60,
    planning: 40,
    completed: 10,
    on_hold: 10,
  };
  const readinessScore = readinessMap[project.status] ?? 40;

  const overall = Math.round(
    focusScore * 0.4 + descScore * 0.3 + budgetScore * 0.15 + readinessScore * 0.15
  );

  const reasons: string[] = [];
  if (focusScore >= 30) reasons.push("Strong focus area alignment");
  if (descScore >= 40) reasons.push("Grant description matches project needs");
  if (budgetScore >= 80) reasons.push("Project budget fits within grant range");
  if (readinessScore >= 70) reasons.push("Project is implementation-ready");
  if (reasons.length === 0) reasons.push("Limited alignment between project and grant");

  const recommendation =
    overall >= 70
      ? "strong_match"
      : overall >= 50
      ? "good_match"
      : overall >= 30
      ? "partial_match"
      : "weak_match";

  return {
    grantId: grant.id,
    projectId: project.id,
    matchScore: overall,
    recommendation,
    reasons,
  };
}

export function matchGrantsToProject(
  project: Project,
  grants: GrantLike[]
): GrantProjectMatch[] {
  return grants
    .map((g) => scoreMatch(project, g))
    .filter((m) => m.matchScore > 15)
    .sort((a, b) => b.matchScore - a.matchScore);
}

export function matchGrantToProjects(
  grant: GrantLike,
  projects: Project[]
): GrantProjectMatch[] {
  return projects
    .map((p) => scoreMatch(p, grant))
    .filter((m) => m.matchScore > 15)
    .sort((a, b) => b.matchScore - a.matchScore);
}
