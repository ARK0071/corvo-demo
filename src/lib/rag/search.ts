/**
 * Document RAG — Hybrid Search (BM25 + Dense + Reciprocal Rank Fusion)
 *
 * Query path: user question → embed → dense ANN (top 50) + BM25 (top 50)
 * → merge via RRF → return top-k passages with citations.
 *
 * All results are tenant-scoped: portProfileId filter is enforced server-side.
 * Global corpus (scope='global') is accessible to all tenants.
 */

import { prisma } from "@/lib/db/client";
import { embedText } from "@/lib/embeddings";
import { formatVectorForPg } from "@/lib/db/vector";

export interface DocumentPassage {
  content: string;
  section: string | null;
  pageNumber: number | null;
  docType: string;
  sourceTitle: string;
  documentId: string;
  score: number;
}

export interface SearchDocumentsParams {
  query: string;
  portProfileId?: string;
  grantId?: string;
  awardId?: string;
  docType?: string;
  limit?: number;
}

interface RawSearchRow {
  chunk_id: string;
  content: string;
  section: string | null;
  page_number: number | null;
  doc_type: string;
  title: string;
  document_id: string;
  score: number;
}

/**
 * Hybrid document search combining BM25 (lexical) and dense (semantic) retrieval.
 *
 * This is the function behind the `search_documents` Porter tool.
 * Retrieved passages are returned with citation metadata.
 */
export async function searchDocuments(
  params: SearchDocumentsParams
): Promise<{ passages: DocumentPassage[] }> {
  if (!prisma) {
    return { passages: [] };
  }

  const limit = params.limit ?? 10;
  const retrievalLimit = 50; // Retrieve more, then re-rank

  // Build the tenant filter: always include global corpus + tenant-scoped docs
  const scopeFilter = params.portProfileId
    ? `(ds.scope = 'global' OR ds.port_profile_id = '${params.portProfileId}'::uuid)`
    : `ds.scope = 'global'`;

  const extraFilters: string[] = [scopeFilter];
  if (params.grantId) {
    extraFilters.push(`(ds.grant_id = '${params.grantId}' OR ds.grant_id IS NULL)`);
  }
  if (params.awardId) {
    extraFilters.push(`(ds.award_id = '${params.awardId}'::uuid OR ds.award_id IS NULL)`);
  }
  if (params.docType) {
    extraFilters.push(`ds.doc_type = '${params.docType}'`);
  }
  const whereClause = extraFilters.join(" AND ");

  // Run dense and BM25 searches in parallel
  const [denseResults, bm25Results] = await Promise.all([
    denseSearch(params.query, whereClause, retrievalLimit),
    bm25Search(params.query, whereClause, retrievalLimit),
  ]);

  // Reciprocal Rank Fusion
  const fused = reciprocalRankFusion(denseResults, bm25Results, 60);

  // Take top-k
  const topK = fused.slice(0, limit);

  return {
    passages: topK.map((r) => ({
      content: r.content,
      section: r.section,
      pageNumber: r.page_number,
      docType: r.doc_type,
      sourceTitle: r.title,
      documentId: r.document_id,
      score: Math.round(r.score * 1000) / 1000,
    })),
  };
}

/**
 * Dense (semantic) search using pgvector cosine similarity.
 */
async function denseSearch(
  query: string,
  whereClause: string,
  limit: number
): Promise<RawSearchRow[]> {
  try {
    const embedding = await embedText(query);
    const vectorStr = formatVectorForPg(embedding);

    const results: RawSearchRow[] = await prisma.$queryRawUnsafe(
      `SELECT
        dc.id as chunk_id,
        dc.content,
        dc.section,
        dc.page_number,
        ds.doc_type,
        ds.title,
        ds.id as document_id,
        (1 - (dc.embedding <=> '${vectorStr}'::vector)) as score
      FROM document_chunks dc
      JOIN document_sources ds ON dc.document_id = ds.id
      WHERE dc.embedding IS NOT NULL
        AND ${whereClause}
      ORDER BY dc.embedding <=> '${vectorStr}'::vector
      LIMIT ${limit}`
    );

    return results;
  } catch (error) {
    console.error("[rag/search] Dense search failed:", error);
    return [];
  }
}

/**
 * BM25 (lexical) search using PostgreSQL full-text search.
 */
async function bm25Search(
  query: string,
  whereClause: string,
  limit: number
): Promise<RawSearchRow[]> {
  try {
    // Convert query to tsquery — use plainto_tsquery for robustness
    const results: RawSearchRow[] = await prisma.$queryRawUnsafe(
      `SELECT
        dc.id as chunk_id,
        dc.content,
        dc.section,
        dc.page_number,
        ds.doc_type,
        ds.title,
        ds.id as document_id,
        ts_rank_cd(dc.search_terms, plainto_tsquery('english', $1)) as score
      FROM document_chunks dc
      JOIN document_sources ds ON dc.document_id = ds.id
      WHERE dc.search_terms @@ plainto_tsquery('english', $1)
        AND ${whereClause}
      ORDER BY ts_rank_cd(dc.search_terms, plainto_tsquery('english', $1)) DESC
      LIMIT ${limit}`,
      query
    );

    return results;
  } catch (error) {
    console.error("[rag/search] BM25 search failed:", error);
    return [];
  }
}

/**
 * Reciprocal Rank Fusion (RRF) to merge two ranked lists.
 *
 * RRF score = sum over lists of 1 / (k + rank)
 * where k is a constant (typically 60) that dampens high-rank dominance.
 */
function reciprocalRankFusion(
  listA: RawSearchRow[],
  listB: RawSearchRow[],
  k: number = 60
): RawSearchRow[] {
  const scoreMap = new Map<string, { row: RawSearchRow; rrfScore: number }>();

  // Process list A (dense)
  for (let rank = 0; rank < listA.length; rank++) {
    const row = listA[rank];
    const key = row.chunk_id;
    const existing = scoreMap.get(key);
    const rrfContrib = 1 / (k + rank + 1);

    if (existing) {
      existing.rrfScore += rrfContrib;
    } else {
      scoreMap.set(key, { row, rrfScore: rrfContrib });
    }
  }

  // Process list B (BM25)
  for (let rank = 0; rank < listB.length; rank++) {
    const row = listB[rank];
    const key = row.chunk_id;
    const existing = scoreMap.get(key);
    const rrfContrib = 1 / (k + rank + 1);

    if (existing) {
      existing.rrfScore += rrfContrib;
    } else {
      scoreMap.set(key, { row, rrfScore: rrfContrib });
    }
  }

  // Sort by combined RRF score
  return Array.from(scoreMap.values())
    .sort((a, b) => b.rrfScore - a.rrfScore)
    .map((entry) => ({
      ...entry.row,
      score: entry.rrfScore,
    }));
}
