/**
 * Porter AI — Entity Semantic Search Tools (Tier 0)
 *
 * Uses OpenAI text-embedding-3-small (1536 dims) to embed user queries
 * and search against pgvector columns on grants, vendors, and profiles.
 *
 * NOTE: Production tables currently have vector(2560) columns (Qwen3).
 * These tools use the existing vector.ts functions which query production tables.
 * If the production embeddings are 2560-dim and we embed with OpenAI (1536-dim),
 * the dimension mismatch will cause a pgvector error. For now, these tools
 * will work against demo tables (1536-dim) or production tables that have been
 * re-embedded with OpenAI. A migration to standardize on 1536 is planned.
 */

import { embedText } from "@/lib/embeddings";
import {
  findSimilarGrants,
  findVendorsForGrant,
  findGrantsForProfile,
} from "@/lib/db/vector";
import { getPorterContext } from "@/lib/porter-context";

/**
 * Semantic grant search: user describes a need in natural language,
 * we embed the query and find similar grants via cosine similarity.
 */
export async function semanticGrantSearch(params: {
  query: string;
  limit?: number;
}) {
  try {
    const embedding = await embedText(params.query);

    const results = await findSimilarGrants(
      embedding,
      params.limit ?? 10,
      0.4
    );

    if (results.length === 0) {
      return {
        count: 0,
        grants: [],
        message: "No similar grants found. Try broadening your description.",
      };
    }

    return {
      count: results.length,
      grants: results.map((r) => ({
        grantId: r.data.id,
        title: r.data.title,
        agency: r.data.agency,
        description: r.data.description?.slice(0, 300),
        awardCeiling: r.data.awardCeiling,
        closeDate: r.data.closeDate?.toISOString().split("T")[0],
        status: r.data.status,
        similarityScore: Math.round(r.similarity * 100) / 100,
      })),
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    // Handle dimension mismatch gracefully
    if (msg.includes("dimension") || msg.includes("vector")) {
      return {
        error:
          "Semantic search is not available — embedding dimensions do not match. Use keyword search instead.",
      };
    }
    return { error: `Semantic search failed: ${msg}` };
  }
}

/**
 * Find projects that match a specific grant via embedding similarity.
 * Uses the port profile's embedding to find grants that match the profile.
 */
export async function findMatchingProjects(params: { grantId: string }) {
  const ctx = getPorterContext();
  if (!ctx.portProfileId) {
    return { error: "No port profile configured." };
  }

  try {
    // Use profile-to-grant matching as a proxy for project matching
    // (projects are linked to the port profile)
    const results = await findGrantsForProfile(ctx.portProfileId, 20, 0.3);

    // Filter to just the requested grant if it's in results
    const match = results.find((r) => r.data.id === params.grantId);

    return {
      grantId: params.grantId,
      profileMatch: match
        ? {
            similarityScore: Math.round(match.similarity * 100) / 100,
            title: match.data.title,
            agency: match.data.agency,
          }
        : null,
      topProfileMatches: results.slice(0, 10).map((r) => ({
        grantId: r.data.id,
        title: r.data.title,
        agency: r.data.agency,
        similarityScore: Math.round(r.similarity * 100) / 100,
        closeDate: r.data.closeDate?.toISOString().split("T")[0],
      })),
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("dimension") || msg.includes("vector")) {
      return {
        error:
          "Semantic matching not available — embedding dimensions do not match.",
      };
    }
    return { error: `Matching failed: ${msg}` };
  }
}

/**
 * Find vendors qualified for a specific grant via embedding similarity.
 */
export async function findQualifiedVendors(params: {
  grantId: string;
  limit?: number;
}) {
  try {
    const results = await findVendorsForGrant(
      params.grantId,
      params.limit ?? 10,
      0.3
    );

    if (results.length === 0) {
      return {
        count: 0,
        vendors: [],
        message:
          "No vendor matches found. The grant may not have embeddings or no vendors match.",
      };
    }

    return {
      count: results.length,
      vendors: results.map((r) => ({
        vendorId: r.data.id,
        name: r.data.name,
        sector: r.data.sector,
        capabilities: r.data.capabilities,
        certifications: r.data.certifications,
        disadvantagedBusiness: r.data.disadvantagedBusiness,
        similarityScore: Math.round(r.similarity * 100) / 100,
      })),
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("dimension") || msg.includes("vector")) {
      return {
        error:
          "Vendor matching not available — embedding dimensions do not match.",
      };
    }
    return { error: `Vendor search failed: ${msg}` };
  }
}
