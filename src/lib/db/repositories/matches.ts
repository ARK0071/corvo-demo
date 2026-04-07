import { prisma } from "../client";
import { GrantVendorMatch as PrismaMatch, Prisma } from "@/generated/prisma";

// Match recommendation types
export type MatchRecommendation =
  | "strong_match"
  | "good_match"
  | "partial_match"
  | "weak_match";

// Application-level match type
export interface GrantVendorMatch {
  id: string;
  grantId: string;
  vendorId: string;
  overallScore: number;
  capabilityAlignment: number;
  certificationMatch: number;
  geographicFit: number;
  financialCapacity: number;
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
    capabilityAlignment: match.capabilityAlignment,
    certificationMatch: match.certificationMatch,
    geographicFit: match.geographicFit,
    financialCapacity: match.financialCapacity,
    strengths: (match.strengths as string[]) || [],
    gaps: (match.gaps as string[]) || [],
    recommendation: match.recommendation as MatchRecommendation,
    vectorSimilarity: match.vectorSimilarity || undefined,
    computedAt: match.computedAt.toISOString(),
  };
}

// Get matches for a grant
export async function getMatchesForGrant(
  grantId: string,
  limit: number = 50
): Promise<GrantVendorMatch[]> {
  const matches = await prisma.grantVendorMatch.findMany({
    where: { grantId },
    orderBy: { overallScore: "desc" },
    take: limit,
  });
  return matches.map(toGrantVendorMatch);
}

// Get matches for a vendor
export async function getMatchesForVendor(
  vendorId: string,
  limit: number = 50
): Promise<GrantVendorMatch[]> {
  const matches = await prisma.grantVendorMatch.findMany({
    where: { vendorId },
    orderBy: { overallScore: "desc" },
    take: limit,
  });
  return matches.map(toGrantVendorMatch);
}

// Get specific match
export async function getMatch(
  grantId: string,
  vendorId: string
): Promise<GrantVendorMatch | null> {
  const match = await prisma.grantVendorMatch.findUnique({
    where: {
      grantId_vendorId: { grantId, vendorId },
    },
  });
  return match ? toGrantVendorMatch(match) : null;
}

// Create or update a match
export async function upsertMatch(
  match: Omit<GrantVendorMatch, "id" | "computedAt">
): Promise<GrantVendorMatch> {
  const data = {
    overallScore: match.overallScore,
    capabilityAlignment: match.capabilityAlignment,
    certificationMatch: match.certificationMatch,
    geographicFit: match.geographicFit,
    financialCapacity: match.financialCapacity,
    strengths: match.strengths,
    gaps: match.gaps,
    recommendation: match.recommendation,
    vectorSimilarity: match.vectorSimilarity,
    computedAt: new Date(),
  };

  const result = await prisma.grantVendorMatch.upsert({
    where: {
      grantId_vendorId: { grantId: match.grantId, vendorId: match.vendorId },
    },
    create: {
      grantId: match.grantId,
      vendorId: match.vendorId,
      ...data,
    },
    update: data,
  });

  return toGrantVendorMatch(result);
}

// Batch upsert matches
export async function batchUpsertMatches(
  matches: Omit<GrantVendorMatch, "id" | "computedAt">[]
): Promise<{ created: number; updated: number }> {
  let created = 0;
  let updated = 0;

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    for (const match of matches) {
      const existing = await tx.grantVendorMatch.findUnique({
        where: {
          grantId_vendorId: { grantId: match.grantId, vendorId: match.vendorId },
        },
        select: { id: true },
      });

      const data = {
        overallScore: match.overallScore,
        capabilityAlignment: match.capabilityAlignment,
        certificationMatch: match.certificationMatch,
        geographicFit: match.geographicFit,
        financialCapacity: match.financialCapacity,
        strengths: match.strengths,
        gaps: match.gaps,
        recommendation: match.recommendation,
        vectorSimilarity: match.vectorSimilarity,
        computedAt: new Date(),
      };

      if (existing) {
        await tx.grantVendorMatch.update({
          where: { id: existing.id },
          data,
        });
        updated++;
      } else {
        await tx.grantVendorMatch.create({
          data: {
            grantId: match.grantId,
            vendorId: match.vendorId,
            ...data,
          },
        });
        created++;
      }
    }
  });

  return { created, updated };
}

// Delete match
export async function deleteMatch(
  grantId: string,
  vendorId: string
): Promise<boolean> {
  try {
    await prisma.grantVendorMatch.delete({
      where: {
        grantId_vendorId: { grantId, vendorId },
      },
    });
    return true;
  } catch {
    return false;
  }
}

// Delete all matches for a grant
export async function deleteMatchesForGrant(grantId: string): Promise<number> {
  const result = await prisma.grantVendorMatch.deleteMany({
    where: { grantId },
  });
  return result.count;
}

// Get top matches (across all grants/vendors)
export async function getTopMatches(
  limit: number = 100,
  minScore: number = 70
): Promise<GrantVendorMatch[]> {
  const matches = await prisma.grantVendorMatch.findMany({
    where: {
      overallScore: { gte: minScore },
    },
    orderBy: { overallScore: "desc" },
    take: limit,
  });
  return matches.map(toGrantVendorMatch);
}

// Get match statistics
export async function getMatchStats(): Promise<{
  total: number;
  strongMatches: number;
  goodMatches: number;
  partialMatches: number;
  weakMatches: number;
  avgScore: number;
}> {
  const [counts, avgResult] = await Promise.all([
    prisma.grantVendorMatch.groupBy({
      by: ["recommendation"],
      _count: true,
    }),
    prisma.grantVendorMatch.aggregate({
      _avg: { overallScore: true },
    }),
  ]);

  const recCounts: Record<string, number> = {};
  let total = 0;
  for (const c of counts) {
    recCounts[c.recommendation] = c._count;
    total += c._count;
  }

  return {
    total,
    strongMatches: recCounts["strong_match"] || 0,
    goodMatches: recCounts["good_match"] || 0,
    partialMatches: recCounts["partial_match"] || 0,
    weakMatches: recCounts["weak_match"] || 0,
    avgScore: avgResult._avg.overallScore || 0,
  };
}

// Find matches with high vector similarity but low rule-based score (potential hidden gems)
export async function findPotentialMatches(
  minVectorSimilarity: number = 0.7,
  maxOverallScore: number = 60,
  limit: number = 50
): Promise<GrantVendorMatch[]> {
  const matches = await prisma.grantVendorMatch.findMany({
    where: {
      vectorSimilarity: { gte: minVectorSimilarity },
      overallScore: { lt: maxOverallScore },
    },
    orderBy: { vectorSimilarity: "desc" },
    take: limit,
  });
  return matches.map(toGrantVendorMatch);
}
