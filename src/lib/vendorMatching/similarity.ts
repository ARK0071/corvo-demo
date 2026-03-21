/**
 * Vector similarity utilities for vendor matching.
 */

/**
 * Cosine similarity between two vectors. Returns value in [-1, 1].
 * For normalized embedding vectors, the result is typically in [0, 1].
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
 * Convert a cosine similarity value to a 0–100 score.
 * text-embedding-3-small typically produces cross-document similarities
 * in the [0.15, 0.85] range, so we stretch that to fill [0, 100].
 */
export function similarityToScore(sim: number): number {
  const FLOOR = 0.15;
  const CEILING = 0.85;
  const normalized = (sim - FLOOR) / (CEILING - FLOOR);
  return Math.round(Math.max(0, Math.min(100, normalized * 100)));
}

/**
 * Compute a 0–100 semantic capability score from pre-computed embeddings.
 */
export function computeSemanticCapabilityScore(
  vendorEmbedding: number[],
  opportunityEmbedding: number[]
): number {
  const sim = cosineSimilarity(vendorEmbedding, opportunityEmbedding);
  return similarityToScore(sim);
}
