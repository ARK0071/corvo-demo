/**
 * Document RAG — Ingestion Orchestrator
 *
 * Parse → Chunk → Embed → Store
 *
 * Ingestion happens offline (at document-association time), NOT in the query path.
 * Every chunk gets: dense embedding (OpenAI 1536), tsvector (auto via Postgres trigger),
 * section/page metadata for citations.
 */

import { prisma } from "@/lib/db/client";
import { embedTexts } from "@/lib/embeddings";
import { parsePdf } from "./parsers/pdf-parser";
import { parseText } from "./parsers/text-parser";
import { chunkDocument, DocumentChunkData } from "./chunker";
import { formatVectorForPg } from "@/lib/db/vector";
import crypto from "crypto";

export interface IngestDocumentParams {
  /** Document type for classification and filtering */
  docType: string;
  /** Human-readable title */
  title: string;
  /** Raw content: either a Buffer (PDF) or string (text/markdown) */
  content: Buffer | string;
  /** Format hint */
  format: "pdf" | "text" | "markdown";
  /** Source URL (optional) */
  sourceUrl?: string;
  /** Scope: "global" (shared across tenants) or "tenant" (scoped) */
  scope: "global" | "tenant";
  /** Associated grant ID (null for global corpus) */
  grantId?: string;
  /** Associated award ID (null for global corpus) */
  awardId?: string;
  /** Port profile ID for tenant-scoped docs */
  portProfileId?: string;
}

export interface IngestResult {
  documentId: string;
  chunksCreated: number;
  pageCount: number;
  title: string;
}

/**
 * Ingest a document: parse, chunk, embed, and store.
 *
 * This is the main entry point for document ingestion.
 * Call this when:
 * - A NOFO PDF is fetched from Grants.gov and associated with a grant
 * - Award terms/special conditions are uploaded
 * - Global reference corpus (2 CFR 200) is seeded
 */
export async function ingestDocument(
  params: IngestDocumentParams
): Promise<IngestResult> {
  if (!prisma) {
    throw new Error("Database not available for document ingestion.");
  }

  // 1. Compute checksum to detect re-ingestion
  const contentBytes =
    typeof params.content === "string"
      ? Buffer.from(params.content)
      : params.content;
  const checksum = crypto
    .createHash("sha256")
    .update(contentBytes)
    .digest("hex");

  // Check if this exact document was already ingested
  const existing = await prisma.documentSource.findFirst({
    where: {
      checksum,
      docType: params.docType,
      grantId: params.grantId ?? null,
      awardId: params.awardId ?? null,
    },
    select: { id: true, title: true },
  });

  if (existing) {
    const chunkCount = await prisma.documentChunk.count({
      where: { documentId: existing.id },
    });
    return {
      documentId: existing.id,
      chunksCreated: chunkCount,
      pageCount: 0,
      title: `${existing.title} (already ingested)`,
    };
  }

  // 2. Parse document
  let parsed;
  if (params.format === "pdf") {
    if (typeof params.content === "string") {
      throw new Error("PDF content must be a Buffer.");
    }
    parsed = await parsePdf(params.content, params.title);
  } else {
    const text =
      typeof params.content === "string"
        ? params.content
        : params.content.toString("utf-8");
    parsed = parseText(text, params.title);
  }

  // 3. Chunk the parsed document
  const chunks = chunkDocument(parsed.pages);

  if (chunks.length === 0) {
    throw new Error("Document produced no chunks after parsing.");
  }

  // 4. Create DocumentSource record
  const docSource = await prisma.documentSource.create({
    data: {
      docType: params.docType,
      title: params.title,
      sourceUrl: params.sourceUrl,
      grantId: params.grantId,
      awardId: params.awardId,
      portProfileId: params.portProfileId,
      scope: params.scope,
      pageCount: parsed.pageCount,
      checksum,
    },
  });

  // 5. Embed all chunks in batches
  const BATCH_SIZE = 50;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const texts = batch.map((c) => c.content);
    const embeddings = await embedTexts(texts);
    allEmbeddings.push(...embeddings);
  }

  // 6. Store chunks with embeddings
  // We use raw SQL because Prisma can't handle vector or tsvector inserts
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedding = allEmbeddings[i];

    if (!embedding || embedding.length === 0) continue;

    const vectorStr = formatVectorForPg(embedding);

    await prisma.$executeRawUnsafe(
      `INSERT INTO document_chunks (
        id, document_id, chunk_index, content, section, page_number, metadata, embedding
      ) VALUES (
        uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7::vector
      )`,
      docSource.id,
      chunk.chunkIndex,
      chunk.content,
      chunk.section,
      chunk.pageNumber,
      JSON.stringify(chunk.metadata),
      vectorStr
    );
  }

  // search_terms tsvector is auto-populated by the Postgres trigger

  return {
    documentId: docSource.id,
    chunksCreated: chunks.length,
    pageCount: parsed.pageCount,
    title: params.title,
  };
}

/**
 * Re-ingest a document (delete existing chunks and re-process).
 */
export async function reingestDocument(
  documentId: string,
  content: Buffer | string,
  format: "pdf" | "text" | "markdown"
): Promise<IngestResult> {
  if (!prisma) throw new Error("Database not available.");

  const doc = await prisma.documentSource.findUnique({
    where: { id: documentId },
  });
  if (!doc) throw new Error(`Document ${documentId} not found.`);

  // Delete existing chunks
  await prisma.documentChunk.deleteMany({
    where: { documentId },
  });

  // Re-ingest
  return ingestDocument({
    docType: doc.docType,
    title: doc.title,
    content,
    format,
    sourceUrl: doc.sourceUrl ?? undefined,
    scope: doc.scope as "global" | "tenant",
    grantId: doc.grantId ?? undefined,
    awardId: doc.awardId ?? undefined,
    portProfileId: doc.portProfileId ?? undefined,
  });
}

/**
 * Delete a document and all its chunks.
 */
export async function deleteDocument(documentId: string): Promise<boolean> {
  if (!prisma) return false;

  // Chunks cascade-delete via FK
  const result = await prisma.documentSource.deleteMany({
    where: { id: documentId },
  });
  return result.count > 0;
}
