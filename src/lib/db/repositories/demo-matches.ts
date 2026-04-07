import { prisma } from "../client";
import { DemoGrantVendorMatch as PrismaMatch, Prisma } from "@/generated/prisma";
import { getTenantConfig } from "../tenant-config";

// Get current port ID from tenant config
function getPortId(): string {
  return getTenantConfig().portId;
}

// Match dimensions type
export interface MatchDimensions {
  capabilityAlignment: number;
  certificationMatch: number;
  geographicFit: number;
  financialCapacity: number;
}

// Recommendation type
export type MatchRecommendation = "strong_match" | "good_match" | "partial_match" | "weak_match";

// Application type
export interface GrantVendorMatch {
  id: string;
  grantId: string;
  vendorId: string;
  overallScore: number;
  dimensions: MatchDimensions;
  strengths: string[];
  gaps: string[];
  recommendation: MatchRecommendation;
  vectorSimilarity?: number;
  computedAt: string;
}

// Convert Prisma model to application type
function toGrantVendorMatch(match: PrismaMatch): GrantVendorMatch {
  return {
    id: match.id,
    grantId: match.grantId,
    vendorId: match.vendorId,
    overallScore: match.overallScore,
    dimensions: {
      capabilityAlignment: match.capabilityAlignment,
      certificationMatch: match.certificationMatch,
      geographicFit: match.geographicFit,
      financialCapacity: match.financialCapacity,
    },
    strengths: (match.strengths as string[]) || [],
    gaps: (match.gaps as string[]) || [],
    recommendation: match.recommendation as MatchRecommendation,
    vectorSimilarity: match.vectorSimilarity || undefined,
    computedAt: match.computedAt.toISOString(),
  };
}

// Get all matches for a grant
export async function getMatchesForGrant(grantId: string): Promise<GrantVendorMatch[]> {
  const portId = getPortId();
  const matches = await prisma.demoGrantVendorMatch.findMany({
    where: { grantId, portId },
    orderBy: { overallScore: "desc" },
  });
  return matches.map(toGrantVendorMatch);
}

// Get all matches for a vendor
export async function getMatchesForVendor(vendorId: string): Promise<GrantVendorMatch[]> {
  const portId = getPortId();
  const matches = await prisma.demoGrantVendorMatch.findMany({
    where: { vendorId, portId },
    orderBy: { overallScore: "desc" },
  });
  return matches.map(toGrantVendorMatch);
}

// Get a specific match
export async function getMatch(
  grantId: string,
  vendorId: string
): Promise<GrantVendorMatch | undefined> {
  const portId = getPortId();
  const match = await prisma.demoGrantVendorMatch.findFirst({
    where: { grantId, vendorId, portId },
  });
  return match ? toGrantVendorMatch(match) : undefined;
}

// Get top matches for a grant
export async function getTopMatchesForGrant(
  grantId: string,
  limit: number = 10
): Promise<GrantVendorMatch[]> {
  const portId = getPortId();
  const matches = await prisma.demoGrantVendorMatch.findMany({
    where: { grantId, portId },
    orderBy: { overallScore: "desc" },
    take: limit,
  });
  return matches.map(toGrantVendorMatch);
}

// Get matches by recommendation level
export async function getMatchesByRecommendation(
  recommendation: MatchRecommendation
): Promise<GrantVendorMatch[]> {
  const portId = getPortId();
  const matches = await prisma.demoGrantVendorMatch.findMany({
    where: { portId, recommendation },
    orderBy: { overallScore: "desc" },
  });
  return matches.map(toGrantVendorMatch);
}

// Create or update a match
export async function upsertMatch(data: {
  grantId: string;
  vendorId: string;
  overallScore: number;
  dimensions: MatchDimensions;
  strengths: string[];
  gaps: string[];
  recommendation: MatchRecommendation;
  vectorSimilarity?: number;
}): Promise<GrantVendorMatch> {
  const portId = getPortId();

  // Check if match exists
  const existing = await prisma.demoGrantVendorMatch.findFirst({
    where: { grantId: data.grantId, vendorId: data.vendorId, portId },
  });

  let match: PrismaMatch;
  if (existing) {
    match = await prisma.demoGrantVendorMatch.update({
      where: { id: existing.id },
      data: {
        overallScore: data.overallScore,
        capabilityAlignment: data.dimensions.capabilityAlignment,
        certificationMatch: data.dimensions.certificationMatch,
        geographicFit: data.dimensions.geographicFit,
        financialCapacity: data.dimensions.financialCapacity,
        strengths: data.strengths,
        gaps: data.gaps,
        recommendation: data.recommendation,
        vectorSimilarity: data.vectorSimilarity || null,
        computedAt: new Date(),
      },
    });
  } else {
    match = await prisma.demoGrantVendorMatch.create({
      data: {
        portId,
        grantId: data.grantId,
        vendorId: data.vendorId,
        overallScore: data.overallScore,
        capabilityAlignment: data.dimensions.capabilityAlignment,
        certificationMatch: data.dimensions.certificationMatch,
        geographicFit: data.dimensions.geographicFit,
        financialCapacity: data.dimensions.financialCapacity,
        strengths: data.strengths,
        gaps: data.gaps,
        recommendation: data.recommendation,
        vectorSimilarity: data.vectorSimilarity || null,
      },
    });
  }

  return toGrantVendorMatch(match);
}

// Batch upsert matches
export async function upsertMatches(
  matches: {
    grantId: string;
    vendorId: string;
    overallScore: number;
    dimensions: MatchDimensions;
    strengths: string[];
    gaps: string[];
    recommendation: MatchRecommendation;
    vectorSimilarity?: number;
  }[]
): Promise<{ created: number; updated: number }> {
  let created = 0;
  let updated = 0;

  for (const data of matches) {
    const portId = getPortId();
    const existing = await prisma.demoGrantVendorMatch.findFirst({
      where: { grantId: data.grantId, vendorId: data.vendorId, portId },
      select: { id: true },
    });

    if (existing) {
      updated++;
    } else {
      created++;
    }

    await upsertMatch(data);
  }

  return { created, updated };
}

// Delete match
export async function deleteMatch(grantId: string, vendorId: string): Promise<boolean> {
  const portId = getPortId();
  const existing = await prisma.demoGrantVendorMatch.findFirst({
    where: { grantId, vendorId, portId },
  });
  if (!existing) return false;

  await prisma.demoGrantVendorMatch.delete({ where: { id: existing.id } });
  return true;
}

// Delete all matches for a grant
export async function deleteMatchesForGrant(grantId: string): Promise<number> {
  const portId = getPortId();
  const result = await prisma.demoGrantVendorMatch.deleteMany({
    where: { grantId, portId },
  });
  return result.count;
}

// Delete all matches for a vendor
export async function deleteMatchesForVendor(vendorId: string): Promise<number> {
  const portId = getPortId();
  const result = await prisma.demoGrantVendorMatch.deleteMany({
    where: { vendorId, portId },
  });
  return result.count;
}

// Get match statistics
export async function getMatchStats(): Promise<{
  totalMatches: number;
  byRecommendation: Record<MatchRecommendation, number>;
  avgScore: number;
}> {
  const portId = getPortId();
  const matches = await prisma.demoGrantVendorMatch.findMany({
    where: { portId },
    select: { overallScore: true, recommendation: true },
  });

  const byRecommendation: Record<MatchRecommendation, number> = {
    strong_match: 0,
    good_match: 0,
    partial_match: 0,
    weak_match: 0,
  };

  let totalScore = 0;
  for (const m of matches) {
    byRecommendation[m.recommendation as MatchRecommendation]++;
    totalScore += m.overallScore;
  }

  return {
    totalMatches: matches.length,
    byRecommendation,
    avgScore: matches.length > 0 ? Math.round(totalScore / matches.length) : 0,
  };
}

// Clear all matches for current port
export async function clearMatches(): Promise<void> {
  const portId = getPortId();
  await prisma.demoGrantVendorMatch.deleteMany({ where: { portId } });
}
