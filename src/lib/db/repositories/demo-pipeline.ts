import { prisma } from "../client";
import { DemoPipelineGrant as PrismaPipeline, Prisma } from "@/generated/prisma";
import { getTenantConfig } from "../tenant-config";
import type { PipelineStage, PipelineGrant } from "@/data/grant-pipeline";

// Get current port ID from tenant config
function getPortId(): string {
  return getTenantConfig().portId;
}

// Convert Prisma model to application type
function toPipelineGrant(pg: PrismaPipeline): PipelineGrant {
  return {
    id: pg.grantId,
    opportunityNumber: "", // Will be populated from grant relation
    title: "", // Will be populated from grant relation
    agency: "",
    agencyCode: "",
    awardFloor: 0,
    awardCeiling: 0,
    totalFunding: 0,
    closeDate: "",
    description: "",
    applicationUrl: "",
    stage: pg.stage as PipelineStage,
    addedAt: pg.addedAt.toISOString(),
    notes: pg.notes,
    focusAreas: [],
    eligibleActivities: [],
  };
}

// Convert Prisma model with grant relation to full application type
function toPipelineGrantWithGrant(
  pg: PrismaPipeline & { grant?: { title: string; agency: string; agencyCode: string | null; opportunityNumber: string | null; awardFloor: any; awardCeiling: any; totalFunding: any; closeDate: Date | null; description: string | null; applicationUrl: string | null; fundingCategories: any; eligibility: any; contactName: string | null; contactEmail: string | null; contactPhone: string | null } | null }
): PipelineGrant {
  const grant = pg.grant;
  return {
    id: pg.grantId,
    opportunityNumber: grant?.opportunityNumber || "",
    title: grant?.title || "",
    agency: grant?.agency || "",
    agencyCode: grant?.agencyCode || "",
    awardFloor: Number(grant?.awardFloor || 0),
    awardCeiling: Number(grant?.awardCeiling || 0),
    totalFunding: Number(grant?.totalFunding || 0),
    closeDate: grant?.closeDate?.toISOString().split("T")[0] || "",
    description: grant?.description || "",
    applicationUrl: grant?.applicationUrl || "",
    stage: pg.stage as PipelineStage,
    addedAt: pg.addedAt.toISOString(),
    notes: pg.notes,
    focusAreas: (grant?.fundingCategories as string[]) || [],
    eligibleActivities: (grant?.eligibility as string[]) || [],
    contactName: grant?.contactName || undefined,
    contactEmail: grant?.contactEmail || undefined,
    contactPhone: grant?.contactPhone || undefined,
  };
}

// Get all grants in the pipeline for current port
export async function getAllPipelineGrants(): Promise<PipelineGrant[]> {
  const portId = getPortId();
  const results = await prisma.demoPipelineGrant.findMany({
    where: { portId },
    include: {
      grant: true,
    },
    orderBy: { addedAt: "desc" },
  });
  return results.map(toPipelineGrantWithGrant);
}

// Get grants by stage
export async function getGrantsByStage(stage: PipelineStage): Promise<PipelineGrant[]> {
  const portId = getPortId();
  const results = await prisma.demoPipelineGrant.findMany({
    where: { portId, stage },
    include: {
      grant: true,
    },
    orderBy: { addedAt: "desc" },
  });
  return results.map(toPipelineGrantWithGrant);
}

// Get a single grant by ID
export async function getPipelineGrantById(grantId: string): Promise<PipelineGrant | undefined> {
  const portId = getPortId();
  const result = await prisma.demoPipelineGrant.findFirst({
    where: { portId, grantId },
    include: {
      grant: true,
    },
  });
  return result ? toPipelineGrantWithGrant(result) : undefined;
}

// Add a grant to the pipeline (resolves portProfileId from portId if needed)
export async function addToPipeline(
  grantId: string,
  portProfileIdOrSlug: string,
  initialData?: { notes?: string; stage?: PipelineStage }
): Promise<PipelineGrant | null> {
  const portId = getPortId();

  // Check if already in pipeline
  const existing = await prisma.demoPipelineGrant.findFirst({
    where: { portId, grantId },
    include: { grant: true },
  });

  if (existing) {
    return toPipelineGrantWithGrant(existing);
  }

  // Resolve portProfileId - if it's not a valid UUID, look it up by portId
  let portProfileId = portProfileIdOrSlug;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(portProfileIdOrSlug)) {
    // Look up the port profile by portId
    let portProfile = await prisma.demoPortProfile.findFirst({
      where: { portId },
      select: { id: true },
    });

    if (!portProfile) {
      console.error(`[demo-pipeline] No port profile found for portId: ${portId}`);
      return null;
    }

    portProfileId = portProfile.id;
  }

  const result = await prisma.demoPipelineGrant.create({
    data: {
      portId,
      grantId,
      portProfileId,
      stage: initialData?.stage || "eligible",
      notes: initialData?.notes || "",
    },
    include: {
      grant: true,
    },
  });

  return toPipelineGrantWithGrant(result);
}

// Move a grant to a different stage
export async function moveGrantToStage(
  grantId: string,
  newStage: PipelineStage
): Promise<PipelineGrant | null> {
  const portId = getPortId();

  const existing = await prisma.demoPipelineGrant.findFirst({
    where: { portId, grantId },
  });

  if (!existing) return null;

  const result = await prisma.demoPipelineGrant.update({
    where: { id: existing.id },
    data: { stage: newStage },
    include: {
      grant: true,
    },
  });

  return toPipelineGrantWithGrant(result);
}

// Update grant notes
export async function updateGrantNotes(
  grantId: string,
  notes: string
): Promise<PipelineGrant | null> {
  const portId = getPortId();

  const existing = await prisma.demoPipelineGrant.findFirst({
    where: { portId, grantId },
  });

  if (!existing) return null;

  const result = await prisma.demoPipelineGrant.update({
    where: { id: existing.id },
    data: { notes },
    include: {
      grant: true,
    },
  });

  return toPipelineGrantWithGrant(result);
}

// Update grant scores
export async function updateGrantScores(
  grantId: string,
  scores: {
    overallScore?: number;
    eligibilityScore?: number;
    alignmentScore?: number;
    impactScore?: number;
    competitivenessScore?: number;
    recommendation?: string;
    eligibilityStatus?: string;
    strengths?: string[];
    concerns?: string[];
    keyRequirements?: string[];
  }
): Promise<PipelineGrant | null> {
  const portId = getPortId();

  const existing = await prisma.demoPipelineGrant.findFirst({
    where: { portId, grantId },
  });

  if (!existing) return null;

  const result = await prisma.demoPipelineGrant.update({
    where: { id: existing.id },
    data: {
      overallScore: scores.overallScore,
      eligibilityScore: scores.eligibilityScore,
      alignmentScore: scores.alignmentScore,
      impactScore: scores.impactScore,
      competitivenessScore: scores.competitivenessScore,
      recommendation: scores.recommendation,
      eligibilityStatus: scores.eligibilityStatus,
      strengths: scores.strengths || [],
      concerns: scores.concerns || [],
      keyRequirements: scores.keyRequirements || [],
      scoredAt: new Date(),
    },
    include: {
      grant: true,
    },
  });

  return toPipelineGrantWithGrant(result);
}

// Remove a grant from the pipeline
export async function removeFromPipeline(grantId: string): Promise<boolean> {
  const portId = getPortId();

  const existing = await prisma.demoPipelineGrant.findFirst({
    where: { portId, grantId },
  });

  if (!existing) return false;

  await prisma.demoPipelineGrant.delete({
    where: { id: existing.id },
  });

  return true;
}

// Check if a grant is already in the pipeline
export async function isInPipeline(grantId: string): Promise<boolean> {
  const portId = getPortId();
  const result = await prisma.demoPipelineGrant.findFirst({
    where: { portId, grantId },
    select: { id: true },
  });
  return !!result;
}

// Get count of grants by stage
export async function getStageCount(stage: PipelineStage): Promise<number> {
  const portId = getPortId();
  return prisma.demoPipelineGrant.count({
    where: { portId, stage },
  });
}

// Get pipeline statistics
export async function getPipelineStats(): Promise<{
  total: number;
  eligible: number;
  applied: number;
  underReview: number;
  awarded: number;
  rejected: number;
}> {
  const portId = getPortId();
  const results = await prisma.demoPipelineGrant.groupBy({
    by: ["stage"],
    where: { portId },
    _count: true,
  });

  const stats = {
    total: 0,
    eligible: 0,
    applied: 0,
    underReview: 0,
    awarded: 0,
    rejected: 0,
  };

  for (const r of results) {
    const count = r._count;
    stats.total += count;
    switch (r.stage) {
      case "eligible":
        stats.eligible = count;
        break;
      case "applied":
        stats.applied = count;
        break;
      case "under_review":
        stats.underReview = count;
        break;
      case "awarded":
        stats.awarded = count;
        break;
      case "rejected":
        stats.rejected = count;
        break;
    }
  }

  return stats;
}

// Get count of grants with deadlines in the next 30 days
export async function getUpcomingDeadlineCount(): Promise<number> {
  const portId = getPortId();
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const results = await prisma.demoPipelineGrant.findMany({
    where: { portId },
    include: {
      grant: {
        select: { closeDate: true },
      },
    },
  });

  return results.filter((r: typeof results[number]) => {
    const closeDate = r.grant?.closeDate;
    if (!closeDate) return false;
    return closeDate >= now && closeDate <= thirtyDaysFromNow;
  }).length;
}

// Get all awarded grants (for vendor outreach)
export async function getAwardedGrants(): Promise<PipelineGrant[]> {
  return getGrantsByStage("awarded");
}

// Clear all pipeline grants for current port (useful for testing)
export async function clearPipeline(): Promise<void> {
  const portId = getPortId();
  await prisma.demoPipelineGrant.deleteMany({
    where: { portId },
  });
}
