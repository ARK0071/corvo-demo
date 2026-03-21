/**
 * Server-side vendor relevancy scoring via OpenAI embeddings.
 * Computes how relevant each vendor is to a given project using
 * text-embedding-3-small cosine similarity.
 *
 * MUST only be imported from server-side code (API routes).
 */

import OpenAI from "openai";
import { createHash } from "crypto";
import type { Project } from "@/data/projects";
import type { EnrichedVendor } from "@/lib/vendor-filters";
import { NAICS_DESCRIPTIONS } from "@/lib/naics";

const EMBEDDING_MODEL = "text-embedding-3-small";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface CacheEntry {
  vector: number[];
  expiresAt: number;
}

const embeddingCache = new Map<string, CacheEntry>();

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("OPENAI_API_KEY is not configured.");
    _client = new OpenAI({ apiKey: key });
  }
  return _client;
}

function cacheKey(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function getFromCache(key: string): number[] | null {
  const entry = embeddingCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    embeddingCache.delete(key);
    return null;
  }
  return entry.vector;
}

function putInCache(key: string, vector: number[]): void {
  embeddingCache.set(key, { vector, expiresAt: Date.now() + CACHE_TTL_MS });
}

/**
 * Batch-embed texts via OpenAI. Cached texts are served from memory.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const keys = texts.map((t) => cacheKey(t));
  const results: (number[] | null)[] = keys.map((k) => getFromCache(k));

  const uncachedIndices: number[] = [];
  const uncachedInputs: string[] = [];
  for (let i = 0; i < texts.length; i++) {
    if (!results[i]) {
      uncachedIndices.push(i);
      uncachedInputs.push(texts[i].slice(0, 8191));
    }
  }

  if (uncachedInputs.length > 0) {
    const client = getClient();
    console.log(
      `[vendor-relevancy] Embedding ${uncachedInputs.length} text(s) (${texts.length - uncachedInputs.length} cached)`
    );
    const res = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: uncachedInputs,
    });
    const sorted = [...res.data].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
    for (let j = 0; j < sorted.length; j++) {
      const idx = uncachedIndices[j];
      const vec = sorted[j].embedding ?? [];
      results[idx] = vec;
      putInCache(keys[idx], vec);
    }
  }

  return results as number[][];
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * Map cosine similarity to 0-100 score.
 * text-embedding-3-small cross-document range is typically [0.15, 0.85].
 */
export function similarityToScore(sim: number): number {
  const FLOOR = 0.15;
  const CEILING = 0.85;
  const normalized = (sim - FLOOR) / (CEILING - FLOOR);
  return Math.round(Math.max(0, Math.min(100, normalized * 100)));
}

/**
 * Build an embeddable text document from a project.
 */
export function buildProjectDoc(project: Project): string {
  const parts = [
    project.name,
    project.description,
    `Project type: ${project.projectType}`,
  ];
  if (project.focusAreas.length > 0) {
    parts.push("Focus areas: " + project.focusAreas.join(", "));
  }
  if (project.location) {
    parts.push("Location: " + project.location);
  }
  return parts.join(". ");
}

/**
 * Build an embeddable text document from an EnrichedVendor.
 * Uses award titles, NAICS descriptions, and agency experience.
 */
export function buildVendorDoc(vendor: EnrichedVendor): string {
  const parts = [vendor.name];

  if (vendor.naicsCodes.length > 0) {
    const naicsDescs = vendor.naicsCodes
      .map((c) => NAICS_DESCRIPTIONS[c] || c)
      .slice(0, 8);
    parts.push("Capabilities: " + naicsDescs.join(", "));
  }

  if (vendor.agencies.length > 0) {
    parts.push("Agencies: " + vendor.agencies.slice(0, 5).join(", "));
  }

  if (vendor.recentAwards.length > 0) {
    const awardTitles = vendor.recentAwards.map((a) => a.title).slice(0, 5);
    parts.push("Recent work: " + awardTitles.join("; "));
  }

  if (vendor.setAsideTypes.length > 0) {
    parts.push("Set-asides: " + vendor.setAsideTypes.join(", "));
  }

  if (vendor.city || vendor.state) {
    parts.push("Location: " + [vendor.city, vendor.state].filter(Boolean).join(", "));
  }

  return parts.join(". ");
}
