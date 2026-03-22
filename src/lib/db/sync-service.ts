import { prisma } from "./client";
import { searchGrants, fetchGrantDetails, DiscoveredGrant } from "@/lib/grants-gov";
import { upsertGrants as upsertGrantsToDb } from "./repositories/grants";
import { upsertVendors as upsertVendorsToDb } from "./repositories/vendors";
import {
  embedTexts,
  buildGrantEmbeddingText,
  buildVendorEmbeddingText,
} from "@/lib/embeddings";
import { batchUpdateGrantEmbeddings, batchUpdateVendorEmbeddings } from "./vector";
import { PortVendor } from "@/data/port-vendors";

export interface SyncResult {
  success: boolean;
  recordsFetched: number;
  recordsCreated: number;
  recordsUpdated: number;
  embeddingsGenerated: number;
  errors: string[];
  duration: number;
}

// Create sync log entry
async function createSyncLog(
  entityType: string,
  apiSource: string,
  searchParams: Record<string, unknown>
): Promise<string> {
  const log = await prisma.apiSyncLog.create({
    data: {
      entityType,
      apiSource,
      searchParams: searchParams as object,
      status: "running",
    },
  });
  return log.id;
}

// Update sync log
async function updateSyncLog(
  logId: string,
  data: {
    status: "completed" | "failed";
    recordsFetched?: number;
    recordsCreated?: number;
    recordsUpdated?: number;
    errorMessage?: string;
  }
): Promise<void> {
  await prisma.apiSyncLog.update({
    where: { id: logId },
    data: {
      ...data,
      completedAt: new Date(),
    },
  });
}

// Sync grants from Grants.gov API
export async function syncGrants(params: {
  keyword?: string;
  oppStatuses?: string[];
  rows?: number;
  fetchDetails?: boolean; // Whether to fetch full details for each grant
  generateEmbeddings?: boolean;
}): Promise<SyncResult> {
  const startTime = Date.now();
  const errors: string[] = [];

  const logId = await createSyncLog("grants", "grants.gov", params);

  try {
    // 1. Search grants from API
    const { grants: apiGrants } = await searchGrants({
      keyword: params.keyword,
      oppStatuses: params.oppStatuses || ["posted", "forecasted"],
      rows: params.rows || 100,
    });

    let grantsToUpsert: DiscoveredGrant[] = apiGrants;

    // 2. Optionally fetch full details for each grant
    if (params.fetchDetails) {
      const detailedGrants: DiscoveredGrant[] = [];
      for (const grant of apiGrants) {
        try {
          const detailed = await fetchGrantDetails(grant.id);
          detailedGrants.push(detailed);
        } catch (err) {
          errors.push(`Failed to fetch details for grant ${grant.id}: ${err}`);
          detailedGrants.push(grant); // Use basic info as fallback
        }
      }
      grantsToUpsert = detailedGrants;
    }

    // 3. Upsert grants to database
    const { created, updated } = await upsertGrantsToDb(grantsToUpsert);

    // 4. Generate embeddings if requested
    let embeddingsGenerated = 0;
    if (params.generateEmbeddings && grantsToUpsert.length > 0) {
      try {
        const texts = grantsToUpsert.map((g) => buildGrantEmbeddingText(g));
        const embeddings = await embedTexts(texts);

        const updates: { id: string; embedding: number[] }[] = [];
        for (let i = 0; i < grantsToUpsert.length; i++) {
          const embedding = embeddings[i];
          if (embedding && embedding.length > 0) {
            updates.push({ id: grantsToUpsert[i].id, embedding });
          }
        }

        if (updates.length > 0) {
          await batchUpdateGrantEmbeddings(updates);
          embeddingsGenerated = updates.length;
        }
      } catch (err) {
        errors.push(`Embedding generation failed: ${err}`);
      }
    }

    await updateSyncLog(logId, {
      status: "completed",
      recordsFetched: apiGrants.length,
      recordsCreated: created,
      recordsUpdated: updated,
    });

    return {
      success: true,
      recordsFetched: apiGrants.length,
      recordsCreated: created,
      recordsUpdated: updated,
      embeddingsGenerated,
      errors,
      duration: Date.now() - startTime,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    errors.push(errorMessage);

    await updateSyncLog(logId, {
      status: "failed",
      errorMessage,
    });

    return {
      success: false,
      recordsFetched: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      embeddingsGenerated: 0,
      errors,
      duration: Date.now() - startTime,
    };
  }
}

// Sync vendors from USASpending API
// Note: This requires the USASpending search to return PortVendor-compatible data
export async function syncVendors(params: {
  vendors: PortVendor[]; // Vendors already fetched from API
  generateEmbeddings?: boolean;
}): Promise<SyncResult> {
  const startTime = Date.now();
  const errors: string[] = [];

  const logId = await createSyncLog("vendors", "usaspending", {
    count: params.vendors.length,
  });

  try {
    // 1. Upsert vendors to database
    const { created, updated } = await upsertVendorsToDb(params.vendors);

    // 2. Generate embeddings if requested
    let embeddingsGenerated = 0;
    if (params.generateEmbeddings && params.vendors.length > 0) {
      try {
        const texts = params.vendors.map((v) => buildVendorEmbeddingText(v));
        const embeddings = await embedTexts(texts);

        const updates: { id: string; embedding: number[] }[] = [];
        for (let i = 0; i < params.vendors.length; i++) {
          const embedding = embeddings[i];
          if (embedding && embedding.length > 0) {
            updates.push({ id: params.vendors[i].id, embedding });
          }
        }

        if (updates.length > 0) {
          await batchUpdateVendorEmbeddings(updates);
          embeddingsGenerated = updates.length;
        }
      } catch (err) {
        errors.push(`Embedding generation failed: ${err}`);
      }
    }

    await updateSyncLog(logId, {
      status: "completed",
      recordsFetched: params.vendors.length,
      recordsCreated: created,
      recordsUpdated: updated,
    });

    return {
      success: true,
      recordsFetched: params.vendors.length,
      recordsCreated: created,
      recordsUpdated: updated,
      embeddingsGenerated,
      errors,
      duration: Date.now() - startTime,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    errors.push(errorMessage);

    await updateSyncLog(logId, {
      status: "failed",
      errorMessage,
    });

    return {
      success: false,
      recordsFetched: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      embeddingsGenerated: 0,
      errors,
      duration: Date.now() - startTime,
    };
  }
}

// Get recent sync logs
export async function getRecentSyncLogs(
  limit: number = 10
): Promise<
  Array<{
    id: string;
    entityType: string;
    apiSource: string;
    status: string;
    recordsFetched: number;
    recordsCreated: number;
    recordsUpdated: number;
    startedAt: Date;
    completedAt: Date | null;
    errorMessage: string | null;
  }>
> {
  return prisma.apiSyncLog.findMany({
    orderBy: { startedAt: "desc" },
    take: limit,
  });
}

// Get last successful sync time for entity type
export async function getLastSuccessfulSync(
  entityType: string
): Promise<Date | null> {
  const log = await prisma.apiSyncLog.findFirst({
    where: {
      entityType,
      status: "completed",
    },
    orderBy: { completedAt: "desc" },
    select: { completedAt: true },
  });
  return log?.completedAt || null;
}
