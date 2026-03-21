/**
 * Embedding utilities for grant scoring.
 * Uses OpenAI text-embedding-3-small. Server-only (OPENAI_API_KEY).
 */

import OpenAI from "openai";
import type { DiscoveredGrant } from "@/lib/grants-gov";
import type { Project } from "@/data/projects";
import type { PortProfile } from "@/data/port-profile";

const EMBEDDING_MODEL = "text-embedding-3-small";

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      throw new Error("OPENAI_API_KEY is not configured. Add it to .env.local for embedding-based scoring.");
    }
    _client = new OpenAI({ apiKey: key });
  }
  return _client;
}

/**
 * Embed a single text string via OpenAI text-embedding-3-small.
 */
export async function embedText(text: string): Promise<number[]> {
  const client = getClient();
  console.log("[embedding] Calling OpenAI API for 1 text...");
  const res = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text.slice(0, 8191), // model limit
  });
  const vec = res.data[0]?.embedding ?? [];
  console.log("[embedding] OpenAI API OK: 1 vector, dim", vec.length, vec.length > 0 ? "(valid)" : "(empty)");
  return vec;
}

/**
 * Embed multiple texts in a single API call (more efficient).
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const client = getClient();
  const inputs = texts.map((t) => t.slice(0, 8191));
  console.log("[embedding] Calling OpenAI API for", texts.length, "text(s)...");
  const res = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: inputs,
  });
  const sorted = [...res.data].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  const vectors = sorted.map((d) => d.embedding ?? []);
  const dim = vectors[0]?.length ?? 0;
  const allValid = vectors.every((v) => v.length === dim && v.length > 0);
  console.log(
    "[embedding] OpenAI API OK:",
    vectors.length,
    "vectors, dim",
    dim,
    allValid ? "(all valid)" : "(some invalid)"
  );
  return vectors;
}

/**
 * Cosine similarity between two vectors. Returns value in [0, 1] for normalized vectors.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * Convert cosine similarity to a 0-100 score (cosine is typically in [-1, 1], we map to [0, 100]).
 */
export function similarityToScore(sim: number): number {
  return Math.round(((sim + 1) / 2) * 100);
}

/** Strip HTML tags for embedding text */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Build embeddable text from a grant.
 */
export function buildGrantEmbeddingText(grant: DiscoveredGrant): string {
  const parts: string[] = [
    grant.title,
    stripHtml(grant.description || ""),
    ...(grant.fundingCategories || []),
    ...(grant.eligibility || []),
  ];
  return parts.filter(Boolean).join(" ");
}

/**
 * Build embeddable text from a project.
 */
export function buildProjectEmbeddingText(project: Project): string {
  const parts: string[] = [
    project.name,
    project.description,
    ...(project.focusAreas || []),
    project.projectType,
  ];
  return parts.filter(Boolean).join(" ");
}

/**
 * Build embeddable text from a port profile (priorities + needs + capabilities + environmental goals).
 */
export function buildProfileEmbeddingText(profile: PortProfile): string {
  const parts: string[] = [
    ...(profile.priorities || []),
    ...(profile.needs || []),
    ...(profile.capabilities || []),
    ...(profile.environmentalGoals || []),
  ];
  return parts.filter(Boolean).join(" ");
}
