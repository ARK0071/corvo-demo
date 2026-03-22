import { prisma } from "./client";
import { Prisma } from "@/generated/prisma";

// Vector operations using raw SQL (pgvector)
// Prisma doesn't natively support vector operations, so we use $queryRaw

export interface VectorSearchResult<T> {
  data: T;
  similarity: number;
}

// Format embedding array for PostgreSQL vector type
export function formatVectorForPg(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

// Find similar grants by embedding
export async function findSimilarGrants(
  embedding: number[],
  limit: number = 20,
  minSimilarity: number = 0.5
): Promise<VectorSearchResult<{
  id: string;
  title: string;
  agency: string;
  description: string | null;
  awardFloor: number;
  awardCeiling: number;
  closeDate: Date | null;
  status: string;
}>[]> {
  const vectorStr = formatVectorForPg(embedding);

  const results = await prisma.$queryRaw<Array<{
    id: string;
    title: string;
    agency: string;
    description: string | null;
    award_floor: Prisma.Decimal;
    award_ceiling: Prisma.Decimal;
    close_date: Date | null;
    status: string;
    similarity: number;
  }>>`
    SELECT
      id,
      title,
      agency,
      description,
      award_floor,
      award_ceiling,
      close_date,
      status,
      1 - (grant_embedding <=> ${vectorStr}::vector) as similarity
    FROM discovered_grants
    WHERE grant_embedding IS NOT NULL
      AND 1 - (grant_embedding <=> ${vectorStr}::vector) > ${minSimilarity}
    ORDER BY grant_embedding <=> ${vectorStr}::vector
    LIMIT ${limit}
  `;

  return results.map((r) => ({
    data: {
      id: r.id,
      title: r.title,
      agency: r.agency,
      description: r.description,
      awardFloor: Number(r.award_floor),
      awardCeiling: Number(r.award_ceiling),
      closeDate: r.close_date,
      status: r.status,
    },
    similarity: r.similarity,
  }));
}

// Find similar vendors by embedding
export async function findSimilarVendors(
  embedding: number[],
  limit: number = 20,
  minSimilarity: number = 0.5
): Promise<VectorSearchResult<{
  id: string;
  name: string;
  sector: string | null;
  capabilities: string[];
  certifications: string[];
  disadvantagedBusiness: string | null;
}>[]> {
  const vectorStr = formatVectorForPg(embedding);

  const results = await prisma.$queryRaw<Array<{
    id: string;
    name: string;
    sector: string | null;
    capabilities: string[];
    certifications: string[];
    disadvantaged_business: string | null;
    similarity: number;
  }>>`
    SELECT
      id,
      name,
      sector,
      capabilities,
      certifications,
      disadvantaged_business,
      1 - (vendor_embedding <=> ${vectorStr}::vector) as similarity
    FROM port_vendors
    WHERE vendor_embedding IS NOT NULL
      AND 1 - (vendor_embedding <=> ${vectorStr}::vector) > ${minSimilarity}
    ORDER BY vendor_embedding <=> ${vectorStr}::vector
    LIMIT ${limit}
  `;

  return results.map((r) => ({
    data: {
      id: r.id,
      name: r.name,
      sector: r.sector,
      capabilities: r.capabilities,
      certifications: r.certifications,
      disadvantagedBusiness: r.disadvantaged_business,
    },
    similarity: r.similarity,
  }));
}

// Find grants similar to a port profile
export async function findGrantsForProfile(
  profileId: string,
  limit: number = 50,
  minSimilarity: number = 0.4
): Promise<VectorSearchResult<{
  id: string;
  title: string;
  agency: string;
  description: string | null;
  awardFloor: number;
  awardCeiling: number;
  closeDate: Date | null;
  status: string;
}>[]> {
  const results = await prisma.$queryRaw<Array<{
    id: string;
    title: string;
    agency: string;
    description: string | null;
    award_floor: Prisma.Decimal;
    award_ceiling: Prisma.Decimal;
    close_date: Date | null;
    status: string;
    similarity: number;
  }>>`
    SELECT
      g.id,
      g.title,
      g.agency,
      g.description,
      g.award_floor,
      g.award_ceiling,
      g.close_date,
      g.status,
      1 - (g.grant_embedding <=> p.profile_embedding) as similarity
    FROM discovered_grants g, port_profiles p
    WHERE p.id = ${profileId}::uuid
      AND g.grant_embedding IS NOT NULL
      AND p.profile_embedding IS NOT NULL
      AND g.status IN ('posted', 'forecasted')
      AND 1 - (g.grant_embedding <=> p.profile_embedding) > ${minSimilarity}
    ORDER BY g.grant_embedding <=> p.profile_embedding
    LIMIT ${limit}
  `;

  return results.map((r) => ({
    data: {
      id: r.id,
      title: r.title,
      agency: r.agency,
      description: r.description,
      awardFloor: Number(r.award_floor),
      awardCeiling: Number(r.award_ceiling),
      closeDate: r.close_date,
      status: r.status,
    },
    similarity: r.similarity,
  }));
}

// Find vendors similar to a grant
export async function findVendorsForGrant(
  grantId: string,
  limit: number = 30,
  minSimilarity: number = 0.4
): Promise<VectorSearchResult<{
  id: string;
  name: string;
  sector: string | null;
  capabilities: string[];
  certifications: string[];
  disadvantagedBusiness: string | null;
  bondingCapacity: number;
}>[]> {
  const results = await prisma.$queryRaw<Array<{
    id: string;
    name: string;
    sector: string | null;
    capabilities: string[];
    certifications: string[];
    disadvantaged_business: string | null;
    bonding_capacity: Prisma.Decimal;
    similarity: number;
  }>>`
    SELECT
      v.id,
      v.name,
      v.sector,
      v.capabilities,
      v.certifications,
      v.disadvantaged_business,
      v.bonding_capacity,
      1 - (v.vendor_embedding <=> g.grant_embedding) as similarity
    FROM port_vendors v, discovered_grants g
    WHERE g.id = ${grantId}
      AND v.vendor_embedding IS NOT NULL
      AND g.grant_embedding IS NOT NULL
      AND 1 - (v.vendor_embedding <=> g.grant_embedding) > ${minSimilarity}
    ORDER BY v.vendor_embedding <=> g.grant_embedding
    LIMIT ${limit}
  `;

  return results.map((r) => ({
    data: {
      id: r.id,
      name: r.name,
      sector: r.sector,
      capabilities: r.capabilities,
      certifications: r.certifications,
      disadvantagedBusiness: r.disadvantaged_business,
      bondingCapacity: Number(r.bonding_capacity),
    },
    similarity: r.similarity,
  }));
}

// Update grant embedding
export async function updateGrantEmbedding(
  grantId: string,
  embedding: number[]
): Promise<void> {
  const vectorStr = formatVectorForPg(embedding);
  await prisma.$executeRaw`
    UPDATE discovered_grants
    SET grant_embedding = ${vectorStr}::vector
    WHERE id = ${grantId}
  `;
}

// Update vendor embedding
export async function updateVendorEmbedding(
  vendorId: string,
  embedding: number[]
): Promise<void> {
  const vectorStr = formatVectorForPg(embedding);
  await prisma.$executeRaw`
    UPDATE port_vendors
    SET vendor_embedding = ${vectorStr}::vector
    WHERE id = ${vendorId}
  `;
}

// Update profile embedding
export async function updateProfileEmbedding(
  profileId: string,
  embedding: number[]
): Promise<void> {
  const vectorStr = formatVectorForPg(embedding);
  await prisma.$executeRaw`
    UPDATE port_profiles
    SET profile_embedding = ${vectorStr}::vector
    WHERE id = ${profileId}::uuid
  `;
}

// Batch update embeddings (more efficient for sync operations)
export async function batchUpdateGrantEmbeddings(
  updates: Array<{ id: string; embedding: number[] }>
): Promise<void> {
  // Use transaction for batch updates
  await prisma.$transaction(
    updates.map(({ id, embedding }) => {
      const vectorStr = formatVectorForPg(embedding);
      return prisma.$executeRaw`
        UPDATE discovered_grants
        SET grant_embedding = ${vectorStr}::vector
        WHERE id = ${id}
      `;
    })
  );
}

export async function batchUpdateVendorEmbeddings(
  updates: Array<{ id: string; embedding: number[] }>
): Promise<void> {
  await prisma.$transaction(
    updates.map(({ id, embedding }) => {
      const vectorStr = formatVectorForPg(embedding);
      return prisma.$executeRaw`
        UPDATE port_vendors
        SET vendor_embedding = ${vectorStr}::vector
        WHERE id = ${id}
      `;
    })
  );
}
