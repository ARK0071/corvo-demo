/**
 * Grant Pipeline State Management
 *
 * Tracks grants through the application lifecycle:
 * Eligible → Applied → Under Review → Awarded → Rejected
 */

export type PipelineStage = "eligible" | "applied" | "under_review" | "awarded" | "rejected";

export interface PipelineGrant {
  id: string;                    // Grants.gov opportunity ID
  opportunityNumber: string;      // e.g., "NOFO-123456"
  title: string;
  agency: string;
  agencyCode: string;
  awardFloor: number;
  awardCeiling: number;
  totalFunding: number;
  closeDate: string;             // ISO date string
  description: string;
  applicationUrl: string;
  stage: PipelineStage;
  addedAt: string;               // ISO timestamp when added to pipeline
  notes: string;                 // User notes
  focusAreas: string[];          // Funding categories
  eligibleActivities: string[];  // Derived from synopsis
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
}

// Mutable in-memory pipeline state (same pattern as port-vendors.ts)
const pipelineGrants: PipelineGrant[] = [];

/**
 * Get all grants in the pipeline
 */
export function getAllPipelineGrants(): PipelineGrant[] {
  return pipelineGrants;
}

/**
 * Get grants by stage
 */
export function getGrantsByStage(stage: PipelineStage): PipelineGrant[] {
  return pipelineGrants.filter((g) => g.stage === stage);
}

/**
 * Get a single grant by ID
 */
export function getPipelineGrantById(id: string): PipelineGrant | undefined {
  return pipelineGrants.find((g) => g.id === id);
}

/**
 * Add a grant to the pipeline (defaults to "eligible" stage)
 */
export function addToPipeline(
  grant: Omit<PipelineGrant, "stage" | "addedAt" | "notes">
): PipelineGrant {
  // Check if already in pipeline
  const existing = pipelineGrants.find((g) => g.id === grant.id);
  if (existing) {
    return existing;
  }

  const newGrant: PipelineGrant = {
    ...grant,
    stage: "eligible",
    addedAt: new Date().toISOString(),
    notes: "",
  };

  pipelineGrants.push(newGrant);
  return newGrant;
}

/**
 * Move a grant to a different stage
 */
export function moveGrantToStage(id: string, newStage: PipelineStage): PipelineGrant | null {
  const grant = pipelineGrants.find((g) => g.id === id);
  if (!grant) return null;

  grant.stage = newStage;
  return grant;
}

/**
 * Update grant notes
 */
export function updateGrantNotes(id: string, notes: string): PipelineGrant | null {
  const grant = pipelineGrants.find((g) => g.id === id);
  if (!grant) return null;

  grant.notes = notes;
  return grant;
}

/**
 * Remove a grant from the pipeline
 */
export function removeFromPipeline(id: string): boolean {
  const index = pipelineGrants.findIndex((g) => g.id === id);
  if (index === -1) return false;

  pipelineGrants.splice(index, 1);
  return true;
}

/**
 * Clear all pipeline grants (useful for testing)
 */
export function clearPipeline(): void {
  pipelineGrants.length = 0;
}

/**
 * Get count of grants by stage
 */
export function getStageCount(stage: PipelineStage): number {
  return pipelineGrants.filter((g) => g.stage === stage).length;
}

/**
 * Get all awarded grants (for vendor outreach)
 */
export function getAwardedGrants(): PipelineGrant[] {
  return getGrantsByStage("awarded");
}

/**
 * Check if a grant is already in the pipeline
 */
export function isInPipeline(id: string): boolean {
  return pipelineGrants.some((g) => g.id === id);
}

/**
 * Get count of grants with deadlines in the next 30 days
 */
export function getUpcomingDeadlineCount(): number {
  const now = Date.now();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  return pipelineGrants.filter((g) => {
    if (!g.closeDate) return false;
    const d = new Date(g.closeDate).getTime();
    return !isNaN(d) && d >= now && d <= now + thirtyDays;
  }).length;
}

/**
 * Get pipeline statistics
 */
export function getPipelineStats() {
  return {
    total: pipelineGrants.length,
    eligible: getStageCount("eligible"),
    applied: getStageCount("applied"),
    underReview: getStageCount("under_review"),
    awarded: getStageCount("awarded"),
    rejected: getStageCount("rejected"),
  };
}
