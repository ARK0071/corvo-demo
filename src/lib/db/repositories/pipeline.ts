import { prisma } from "../client";
import { PipelineGrant as PrismaPipeline, Prisma } from "@/generated/prisma";

// Pipeline stages
export type PipelineStage =
  | "eligible"
  | "drafting"
  | "applied"
  | "under_review"
  | "awarded"
  | "reporting"
  | "closeout"
  | "rejected";

// Application-level pipeline grant type (similar to existing interface)
export interface PipelineGrant {
  id: string; // UUID from database
  grantId: string; // Grants.gov opportunity ID
  portProfileId: string;
  opportunityNumber?: string;
  title: string;
  agency: string;
  agencyCode?: string;
  awardFloor: number;
  awardCeiling: number;
  totalFunding: number;
  closeDate?: string;
  description?: string;
  applicationUrl?: string;
  stage: PipelineStage;
  addedAt: string;
  notes: string;
  focusAreas: string[];
  eligibleActivities: string[];
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  // Scores (from merged grant_scores)
  overallScore?: number;
  eligibilityScore?: number;
  alignmentScore?: number;
  impactScore?: number;
  competitivenessScore?: number;
  recommendation?: string;
  eligibilityStatus?: string;
  strengths: string[];
  concerns: string[];
  keyRequirements: string[];
  scoredAt?: string;
}

// Convert Prisma model + joined grant data to application type
function toPipelineGrant(
  pipeline: PrismaPipeline & {
    grant?: {
      opportunityNumber: string | null;
      title: string;
      agency: string;
      agencyCode: string | null;
      awardFloor: Prisma.Decimal;
      awardCeiling: Prisma.Decimal;
      totalFunding: Prisma.Decimal;
      closeDate: Date | null;
      description: string | null;
      applicationUrl: string | null;
      fundingCategories: Prisma.JsonValue;
      eligibility: Prisma.JsonValue;
      contactName: string | null;
      contactEmail: string | null;
      contactPhone: string | null;
    };
  }
): PipelineGrant {
  const grant = pipeline.grant;
  return {
    id: pipeline.id,
    grantId: pipeline.grantId,
    portProfileId: pipeline.portProfileId,
    opportunityNumber: grant?.opportunityNumber || undefined,
    title: grant?.title || "Unknown Grant",
    agency: grant?.agency || "Unknown Agency",
    agencyCode: grant?.agencyCode || undefined,
    awardFloor: grant ? Number(grant.awardFloor) : 0,
    awardCeiling: grant ? Number(grant.awardCeiling) : 0,
    totalFunding: grant ? Number(grant.totalFunding) : 0,
    closeDate: grant?.closeDate?.toISOString().split("T")[0] || undefined,
    description: grant?.description || undefined,
    applicationUrl: grant?.applicationUrl || undefined,
    stage: pipeline.stage as PipelineStage,
    addedAt: pipeline.addedAt.toISOString(),
    notes: pipeline.notes,
    focusAreas: (grant?.fundingCategories as string[]) || [],
    eligibleActivities: (grant?.eligibility as string[]) || [],
    contactName: grant?.contactName || undefined,
    contactEmail: grant?.contactEmail || undefined,
    contactPhone: grant?.contactPhone || undefined,
    overallScore: pipeline.overallScore || undefined,
    eligibilityScore: pipeline.eligibilityScore || undefined,
    alignmentScore: pipeline.alignmentScore || undefined,
    impactScore: pipeline.impactScore || undefined,
    competitivenessScore: pipeline.competitivenessScore || undefined,
    recommendation: pipeline.recommendation || undefined,
    eligibilityStatus: pipeline.eligibilityStatus || undefined,
    strengths: (pipeline.strengths as string[]) || [],
    concerns: (pipeline.concerns as string[]) || [],
    keyRequirements: (pipeline.keyRequirements as string[]) || [],
    scoredAt: pipeline.scoredAt?.toISOString() || undefined,
  };
}

// Include clause for joining grant data
const includeGrant = {
  grant: {
    select: {
      opportunityNumber: true,
      title: true,
      agency: true,
      agencyCode: true,
      awardFloor: true,
      awardCeiling: true,
      totalFunding: true,
      closeDate: true,
      description: true,
      applicationUrl: true,
      fundingCategories: true,
      eligibility: true,
      contactName: true,
      contactEmail: true,
      contactPhone: true,
    },
  },
};

// Get all pipeline grants for a port profile
export async function getAllPipelineGrants(
  portProfileId: string
): Promise<PipelineGrant[]> {
  const results = await prisma.pipelineGrant.findMany({
    where: { portProfileId },
    include: includeGrant,
    orderBy: { addedAt: "desc" },
  });
  return results.map(toPipelineGrant);
}

// Get pipeline grants by stage
export async function getGrantsByStage(
  portProfileId: string,
  stage: PipelineStage
): Promise<PipelineGrant[]> {
  const results = await prisma.pipelineGrant.findMany({
    where: { portProfileId, stage },
    include: includeGrant,
    orderBy: { addedAt: "desc" },
  });
  return results.map(toPipelineGrant);
}

// Get a single pipeline grant by grant ID and port profile
export async function getPipelineGrantByGrantId(
  grantId: string,
  portProfileId: string
): Promise<PipelineGrant | null> {
  const result = await prisma.pipelineGrant.findUnique({
    where: {
      grantId_portProfileId: { grantId, portProfileId },
    },
    include: includeGrant,
  });
  return result ? toPipelineGrant(result) : null;
}

// Get pipeline grant by its ID
export async function getPipelineGrantById(
  id: string
): Promise<PipelineGrant | null> {
  const result = await prisma.pipelineGrant.findUnique({
    where: { id },
    include: includeGrant,
  });
  return result ? toPipelineGrant(result) : null;
}

// Add a grant to the pipeline
export async function addToPipeline(
  grantId: string,
  portProfileId: string,
  scores?: {
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
): Promise<PipelineGrant> {
  const result = await prisma.pipelineGrant.upsert({
    where: {
      grantId_portProfileId: { grantId, portProfileId },
    },
    create: {
      grantId,
      portProfileId,
      stage: "eligible",
      notes: "",
      overallScore: scores?.overallScore,
      eligibilityScore: scores?.eligibilityScore,
      alignmentScore: scores?.alignmentScore,
      impactScore: scores?.impactScore,
      competitivenessScore: scores?.competitivenessScore,
      recommendation: scores?.recommendation,
      eligibilityStatus: scores?.eligibilityStatus,
      strengths: scores?.strengths || [],
      concerns: scores?.concerns || [],
      keyRequirements: scores?.keyRequirements || [],
      scoredAt: scores ? new Date() : null,
    },
    update: {
      // Don't overwrite existing data, just return
    },
    include: includeGrant,
  });
  return toPipelineGrant(result);
}

// Move grant to a different stage
export async function moveGrantToStage(
  grantId: string,
  portProfileId: string,
  newStage: PipelineStage
): Promise<PipelineGrant | null> {
  try {
    const result = await prisma.pipelineGrant.update({
      where: {
        grantId_portProfileId: { grantId, portProfileId },
      },
      data: { stage: newStage },
      include: includeGrant,
    });
    return toPipelineGrant(result);
  } catch {
    return null;
  }
}

// Update grant notes
export async function updateGrantNotes(
  grantId: string,
  portProfileId: string,
  notes: string
): Promise<PipelineGrant | null> {
  try {
    const result = await prisma.pipelineGrant.update({
      where: {
        grantId_portProfileId: { grantId, portProfileId },
      },
      data: { notes },
      include: includeGrant,
    });
    return toPipelineGrant(result);
  } catch {
    return null;
  }
}

// Update grant scores
export async function updateGrantScores(
  grantId: string,
  portProfileId: string,
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
  try {
    const result = await prisma.pipelineGrant.update({
      where: {
        grantId_portProfileId: { grantId, portProfileId },
      },
      data: {
        ...scores,
        scoredAt: new Date(),
      },
      include: includeGrant,
    });
    return toPipelineGrant(result);
  } catch {
    return null;
  }
}

// Remove grant from pipeline
export async function removeFromPipeline(
  grantId: string,
  portProfileId: string
): Promise<boolean> {
  try {
    await prisma.pipelineGrant.delete({
      where: {
        grantId_portProfileId: { grantId, portProfileId },
      },
    });
    return true;
  } catch {
    return false;
  }
}

// Check if grant is in pipeline
export async function isInPipeline(
  grantId: string,
  portProfileId: string
): Promise<boolean> {
  const count = await prisma.pipelineGrant.count({
    where: { grantId, portProfileId },
  });
  return count > 0;
}

// Get pipeline statistics
export async function getPipelineStats(portProfileId: string): Promise<{
  total: number;
  eligible: number;
  drafting: number;
  applied: number;
  underReview: number;
  awarded: number;
  reporting: number;
  closeout: number;
  rejected: number;
}> {
  const counts = await prisma.pipelineGrant.groupBy({
    by: ["stage"],
    where: { portProfileId },
    _count: true,
  });

  const stageCounts: Record<string, number> = {};
  for (const c of counts) {
    stageCounts[c.stage] = c._count;
  }

  return {
    total: counts.reduce((sum: number, c: typeof counts[number]) => sum + c._count, 0),
    eligible: stageCounts["eligible"] || 0,
    drafting: stageCounts["drafting"] || 0,
    applied: stageCounts["applied"] || 0,
    underReview: stageCounts["under_review"] || 0,
    awarded: stageCounts["awarded"] || 0,
    reporting: stageCounts["reporting"] || 0,
    closeout: stageCounts["closeout"] || 0,
    rejected: stageCounts["rejected"] || 0,
  };
}

// Get awarded grants (for vendor outreach)
export async function getAwardedGrants(
  portProfileId: string
): Promise<PipelineGrant[]> {
  return getGrantsByStage(portProfileId, "awarded");
}

// Clear all pipeline grants for a port profile
export async function clearPipeline(portProfileId: string): Promise<void> {
  await prisma.pipelineGrant.deleteMany({
    where: { portProfileId },
  });
}

// Batch add grants to pipeline with scores
export async function batchAddToPipeline(
  portProfileId: string,
  grants: Array<{
    grantId: string;
    scores?: {
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
    };
  }>
): Promise<number> {
  let added = 0;

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    for (const { grantId, scores } of grants) {
      const existing = await tx.pipelineGrant.findUnique({
        where: {
          grantId_portProfileId: { grantId, portProfileId },
        },
        select: { id: true },
      });

      if (!existing) {
        await tx.pipelineGrant.create({
          data: {
            grantId,
            portProfileId,
            stage: "eligible",
            notes: "",
            overallScore: scores?.overallScore,
            eligibilityScore: scores?.eligibilityScore,
            alignmentScore: scores?.alignmentScore,
            impactScore: scores?.impactScore,
            competitivenessScore: scores?.competitivenessScore,
            recommendation: scores?.recommendation,
            eligibilityStatus: scores?.eligibilityStatus,
            strengths: scores?.strengths || [],
            concerns: scores?.concerns || [],
            keyRequirements: scores?.keyRequirements || [],
            scoredAt: scores ? new Date() : null,
          },
        });
        added++;
      }
    }
  });

  return added;
}
