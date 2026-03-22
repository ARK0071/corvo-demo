/**
 * Embedding service that bridges OpenAI embeddings with pgvector storage.
 * Uses the team's embeddings.ts utilities for generation, stores in PostgreSQL.
 */

import { prisma } from "./client";
import { dbConfig, tableNames } from "./config";
import {
  embedText,
  embedTexts,
  buildGrantEmbeddingText,
  buildProjectEmbeddingText,
  buildProfileEmbeddingText,
} from "@/lib/embeddings";
import type { DiscoveredGrant } from "@/lib/grants-gov";
import type { PortVendor } from "@/data/port-vendors";
import type { PortProfile } from "@/data/port-profile";

// Format embedding array for PostgreSQL vector type
function formatVectorForPg(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

// Build embeddable text from a vendor
function buildVendorEmbeddingText(vendor: PortVendor): string {
  const parts: string[] = [
    vendor.name,
    vendor.description || "",
    vendor.sector || "",
    ...(vendor.capabilities || []),
    ...(vendor.certifications || []),
  ];
  return parts.filter(Boolean).join(" ");
}

/**
 * Generate and store embedding for a single grant
 */
export async function embedAndStoreGrant(grant: DiscoveredGrant): Promise<void> {
  const text = buildGrantEmbeddingText(grant);
  const embedding = await embedText(text);

  if (embedding.length === 0) {
    console.warn(`[embedding-service] Empty embedding for grant ${grant.id}`);
    return;
  }

  const vectorStr = formatVectorForPg(embedding);
  const tableName = tableNames.discoveredGrants;

  await prisma.$executeRawUnsafe(`
    UPDATE ${tableName}
    SET grant_embedding = '${vectorStr}'::vector
    WHERE id = $1
  `, grant.id);

  console.log(`[embedding-service] Stored embedding for grant ${grant.id}`);
}

/**
 * Generate and store embeddings for multiple grants (batched)
 */
export async function embedAndStoreGrants(grants: DiscoveredGrant[]): Promise<{
  success: number;
  failed: number;
}> {
  if (grants.length === 0) return { success: 0, failed: 0 };

  const texts = grants.map(buildGrantEmbeddingText);
  const embeddings = await embedTexts(texts);

  let success = 0;
  let failed = 0;
  const tableName = tableNames.discoveredGrants;

  for (let i = 0; i < grants.length; i++) {
    const grant = grants[i];
    const embedding = embeddings[i];

    if (!embedding || embedding.length === 0) {
      console.warn(`[embedding-service] Empty embedding for grant ${grant.id}`);
      failed++;
      continue;
    }

    try {
      const vectorStr = formatVectorForPg(embedding);
      await prisma.$executeRawUnsafe(`
        UPDATE ${tableName}
        SET grant_embedding = '${vectorStr}'::vector
        WHERE id = $1
      `, grant.id);
      success++;
    } catch (err) {
      console.error(`[embedding-service] Failed to store embedding for grant ${grant.id}:`, err);
      failed++;
    }
  }

  console.log(`[embedding-service] Stored ${success}/${grants.length} grant embeddings`);
  return { success, failed };
}

/**
 * Generate and store embedding for a single vendor
 */
export async function embedAndStoreVendor(vendor: PortVendor): Promise<void> {
  const text = buildVendorEmbeddingText(vendor);
  const embedding = await embedText(text);

  if (embedding.length === 0) {
    console.warn(`[embedding-service] Empty embedding for vendor ${vendor.id}`);
    return;
  }

  const vectorStr = formatVectorForPg(embedding);
  const tableName = tableNames.portVendors;

  await prisma.$executeRawUnsafe(`
    UPDATE ${tableName}
    SET vendor_embedding = '${vectorStr}'::vector
    WHERE id = $1
  `, vendor.id);

  console.log(`[embedding-service] Stored embedding for vendor ${vendor.id}`);
}

/**
 * Generate and store embeddings for multiple vendors (batched)
 */
export async function embedAndStoreVendors(vendors: PortVendor[]): Promise<{
  success: number;
  failed: number;
}> {
  if (vendors.length === 0) return { success: 0, failed: 0 };

  const texts = vendors.map(buildVendorEmbeddingText);
  const embeddings = await embedTexts(texts);

  let success = 0;
  let failed = 0;
  const tableName = tableNames.portVendors;

  for (let i = 0; i < vendors.length; i++) {
    const vendor = vendors[i];
    const embedding = embeddings[i];

    if (!embedding || embedding.length === 0) {
      console.warn(`[embedding-service] Empty embedding for vendor ${vendor.id}`);
      failed++;
      continue;
    }

    try {
      const vectorStr = formatVectorForPg(embedding);
      await prisma.$executeRawUnsafe(`
        UPDATE ${tableName}
        SET vendor_embedding = '${vectorStr}'::vector
        WHERE id = $1
      `, vendor.id);
      success++;
    } catch (err) {
      console.error(`[embedding-service] Failed to store embedding for vendor ${vendor.id}:`, err);
      failed++;
    }
  }

  console.log(`[embedding-service] Stored ${success}/${vendors.length} vendor embeddings`);
  return { success, failed };
}

/**
 * Generate and store embedding for a port profile
 */
export async function embedAndStoreProfile(profile: PortProfile, profileId: string): Promise<void> {
  const text = buildProfileEmbeddingText(profile);
  const embedding = await embedText(text);

  if (embedding.length === 0) {
    console.warn(`[embedding-service] Empty embedding for profile ${profileId}`);
    return;
  }

  const vectorStr = formatVectorForPg(embedding);
  const tableName = tableNames.portProfiles;

  await prisma.$executeRawUnsafe(`
    UPDATE ${tableName}
    SET profile_embedding = '${vectorStr}'::vector
    WHERE id = $1::uuid
  `, profileId);

  console.log(`[embedding-service] Stored embedding for profile ${profileId}`);
}

/**
 * Find grants without embeddings that need processing
 */
export async function getGrantsWithoutEmbeddings(limit: number = 100): Promise<string[]> {
  const tableName = tableNames.discoveredGrants;
  const results = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
    SELECT id FROM ${tableName}
    WHERE grant_embedding IS NULL
    LIMIT ${limit}
  `);
  return results.map((r) => r.id);
}

/**
 * Find vendors without embeddings that need processing
 */
export async function getVendorsWithoutEmbeddings(limit: number = 100): Promise<string[]> {
  const tableName = tableNames.portVendors;
  const results = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
    SELECT id FROM ${tableName}
    WHERE vendor_embedding IS NULL
    LIMIT ${limit}
  `);
  return results.map((r) => r.id);
}

/**
 * Get embedding statistics
 */
export async function getEmbeddingStats(): Promise<{
  grants: { total: number; withEmbedding: number };
  vendors: { total: number; withEmbedding: number };
  profiles: { total: number; withEmbedding: number };
}> {
  const grantsTable = tableNames.discoveredGrants;
  const vendorsTable = tableNames.portVendors;
  const profilesTable = tableNames.portProfiles;

  const [grantsTotal, grantsWithEmb, vendorsTotal, vendorsWithEmb, profilesTotal, profilesWithEmb] =
    await Promise.all([
      prisma.$queryRawUnsafe<[{ count: bigint }]>(`SELECT COUNT(*) as count FROM ${grantsTable}`),
      prisma.$queryRawUnsafe<[{ count: bigint }]>(`SELECT COUNT(*) as count FROM ${grantsTable} WHERE grant_embedding IS NOT NULL`),
      prisma.$queryRawUnsafe<[{ count: bigint }]>(`SELECT COUNT(*) as count FROM ${vendorsTable}`),
      prisma.$queryRawUnsafe<[{ count: bigint }]>(`SELECT COUNT(*) as count FROM ${vendorsTable} WHERE vendor_embedding IS NOT NULL`),
      prisma.$queryRawUnsafe<[{ count: bigint }]>(`SELECT COUNT(*) as count FROM ${profilesTable}`),
      prisma.$queryRawUnsafe<[{ count: bigint }]>(`SELECT COUNT(*) as count FROM ${profilesTable} WHERE profile_embedding IS NOT NULL`),
    ]);

  return {
    grants: {
      total: Number(grantsTotal[0].count),
      withEmbedding: Number(grantsWithEmb[0].count),
    },
    vendors: {
      total: Number(vendorsTotal[0].count),
      withEmbedding: Number(vendorsWithEmb[0].count),
    },
    profiles: {
      total: Number(profilesTotal[0].count),
      withEmbedding: Number(profilesWithEmb[0].count),
    },
  };
}