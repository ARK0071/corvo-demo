/**
 * Server-side OpenAI embedding utility for vendor matching.
 * Uses text-embedding-3-small with in-memory SHA256 cache.
 *
 * MUST only be imported from server-side code (API routes, server actions).
 */

import OpenAI from "openai";
import { createHash } from "crypto";

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
    if (!key) {
      throw new Error(
        "OPENAI_API_KEY is not configured. Add it to .env.local."
      );
    }
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
  embeddingCache.set(key, {
    vector,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

/**
 * Embed multiple texts in a single batched API call.
 * Cached texts are served from the in-memory cache;
 * only uncached texts hit the API.
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
      `[vendor-embedding] Calling OpenAI for ${uncachedInputs.length} text(s) (${texts.length - uncachedInputs.length} cached)`
    );
    const res = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: uncachedInputs,
    });
    const sorted = [...res.data].sort(
      (a, b) => (a.index ?? 0) - (b.index ?? 0)
    );
    for (let j = 0; j < sorted.length; j++) {
      const idx = uncachedIndices[j];
      const vec = sorted[j].embedding ?? [];
      results[idx] = vec;
      putInCache(keys[idx], vec);
    }
  } else {
    console.log(
      `[vendor-embedding] All ${texts.length} text(s) served from cache`
    );
  }

  return results as number[][];
}

/**
 * Embed a single text (convenience wrapper).
 */
export async function embedText(text: string): Promise<number[]> {
  const [vec] = await embedTexts([text]);
  return vec;
}
