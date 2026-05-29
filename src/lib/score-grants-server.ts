/**
 * Server-side grant scoring. Used by /api/score-grants and grant-intelligence tools.
 *
 * Supports hybrid scoring:
 * - DB-first: Uses pgvector embeddings from database when available
 * - File-based fallback: Uses pre-computed JSON embeddings
 * - OpenAI fallback: Generates embeddings on-the-fly
 */

import * as fs from "fs";
import * as path from "path";
import type { DiscoveredGrant } from "@/lib/grants-gov";
import {
  buildGrantEmbeddingText,
  embedTexts,
  cosineSimilarity,
  similarityToScore,
} from "@/lib/embeddings";
import {
  isHardNegativeGrant,
  scoreEligibility,
  scoreImpact,
  computeFinalScore,
  getRecommendation,
  type GrantScore,
  type TopProjectMatch,
  type TopDomainMatch,
} from "@/data/grant-scoring";
import { getProfile, DEFAULT_PROFILE_ID, ensureProfilesLoaded } from "@/data/profiles";
import { initializeProjectsForProfile } from "@/data/projects";
import domainEmbeddingsData from "@/data/embeddings/funding-domain-embeddings.json";
import { getTenantConfig } from "@/lib/db/tenant-config";

// DB vector similarity cache (grant ID -> profile similarity score)
const dbVectorSimilarityCache = new Map<string, number>();

/**
 * Fetch vector similarity scores from database for grants with embeddings.
 * Uses pgvector cosine similarity between grant embeddings and profile embedding.
 */
async function getDBVectorSimilarities(
  grantIds: string[],
  profileId: string
): Promise<Map<string, number>> {
  const result = new Map<string, number>();

  // Check if we have DATABASE_URL configured
  if (!process.env.DATABASE_URL) {
    return result;
  }

  try {
    // Dynamic import to avoid loading DB client when not needed
    const { prisma } = await import("@/lib/db/client");
    const tenantConfig = getTenantConfig();

    // Determine which tables to use based on environment
    const grantsTable =
      tenantConfig.environment === "demo"
        ? "demo_discovered_grants"
        : "discovered_grants";
    const profilesTable =
      tenantConfig.environment === "demo"
        ? "demo_port_profiles"
        : "port_profiles";

    // Build query for batch similarity computation
    // This query computes cosine similarity between grant embeddings and profile embedding
    const similarities = await prisma.$queryRawUnsafe(
      `
      SELECT
        g.id as grant_id,
        1 - (g.grant_embedding <=> p.profile_embedding) as similarity
      FROM ${grantsTable} g
      CROSS JOIN ${profilesTable} p
      WHERE g.id = ANY($1::text[])
        AND g.grant_embedding IS NOT NULL
        AND p.profile_embedding IS NOT NULL
        AND p.slug = $2
      `,
      grantIds,
      profileId
    ) as Array<{ grant_id: string; similarity: number }>;

    for (const row of similarities) {
      // Convert cosine similarity (0-1) to score (0-100)
      const score = Math.round(((row.similarity + 1) / 2) * 100);
      result.set(row.grant_id, score);
      dbVectorSimilarityCache.set(`${row.grant_id}:${profileId}`, score);
    }

    console.log(
      `[score-grants] DB vector similarity: found ${result.size}/${grantIds.length} grants with embeddings`
    );
  } catch (error) {
    console.error("[score-grants] DB vector similarity query failed:", error);
    // Return empty result - will fall back to OpenAI/file-based embeddings
  }

  return result;
}

/**
 * Get cached DB similarity score for a grant-profile pair
 */
function getCachedDBSimilarity(
  grantId: string,
  profileId: string
): number | null {
  const cached = dbVectorSimilarityCache.get(`${grantId}:${profileId}`);
  return cached !== undefined ? cached : null;
}

interface ProjectEmbedding {
  name: string;
  text: string;
  vector: number[];
}

interface ProfileEmbedding {
  profileId: string;
  text: string;
  vector: number[];
}

interface DomainEmbedding {
  name: string;
  text: string;
  vector: number[];
}

const EMBEDDINGS_ROOT = path.join(process.cwd(), "src/data/embeddings");

const grantEmbeddingCache = new Map<string, number[]>();

function readJsonIfExists<T>(filePath: string): T | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function loadProjectEmbeddingsForProfile(profileId: string): Record<string, ProjectEmbedding> {
  const scoped = path.join(EMBEDDINGS_ROOT, "profiles", profileId, "project-embeddings.json");
  const fromProfile = readJsonIfExists<Record<string, ProjectEmbedding>>(scoped);
  if (fromProfile && Object.keys(fromProfile).length > 0) return fromProfile;

  if (profileId === "port-freeport") {
    const legacy = path.join(EMBEDDINGS_ROOT, "project-embeddings.json");
    const fromLegacy = readJsonIfExists<Record<string, ProjectEmbedding>>(legacy);
    if (fromLegacy) return fromLegacy;
  }

  return {};
}

function loadProfileEmbeddingForProfile(profileId: string): ProfileEmbedding | null {
  const scoped = path.join(EMBEDDINGS_ROOT, "profiles", profileId, "profile-embedding.json");
  const fromProfile = readJsonIfExists<ProfileEmbedding>(scoped);
  if (fromProfile) return fromProfile;

  if (profileId === "port-freeport") {
    const legacy = path.join(EMBEDDINGS_ROOT, "profile-embedding.json");
    return readJsonIfExists<ProfileEmbedding>(legacy);
  }

  return null;
}

function loadDomainEmbeddings(): Record<string, DomainEmbedding> {
  return domainEmbeddingsData as unknown as Record<string, DomainEmbedding>;
}

function hasValidVector(vec: number[]): boolean {
  return Array.isArray(vec) && vec.length > 0;
}

/**
 * Score grants server-side (embedding + eligibility + impact).
 * @param profileId — must match Client Profile / embeddings under `embeddings/profiles/{id}/`
 */
export async function scoreGrantsServer(
  grants: DiscoveredGrant[],
  profileId: string = DEFAULT_PROFILE_ID
): Promise<GrantScore[]> {
  if (grants.length === 0) return [];

  await ensureProfilesLoaded();
  const resolvedProfileId = getProfile(profileId) ? profileId : DEFAULT_PROFILE_ID;
  initializeProjectsForProfile(resolvedProfileId);

  const profile = getProfile(resolvedProfileId) ?? getProfile(DEFAULT_PROFILE_ID)!;
  const projectEmbeddings = loadProjectEmbeddingsForProfile(resolvedProfileId);
  const profileEmbedding = loadProfileEmbeddingForProfile(resolvedProfileId);
  const domainEmbeddings = loadDomainEmbeddings();

  const hasOpenAI = !!process.env.OPENAI_API_KEY;

  const profileVecValid = profileEmbedding && hasValidVector(profileEmbedding.vector);
  const projectCount = Object.values(projectEmbeddings).filter((p) => hasValidVector(p.vector)).length;
  const domainCount = Object.values(domainEmbeddings).filter((d) => hasValidVector(d.vector)).length;

  // Check if DB embeddings are available
  const hasDatabase = !!process.env.DATABASE_URL;

  console.log("[score-grants] Config:", {
    profileId: resolvedProfileId,
    openaiKey: hasOpenAI ? "set" : "NOT SET",
    database: hasDatabase ? "configured" : "NOT SET",
    profileEmbedding: profileEmbedding ? (profileVecValid ? "valid" : "empty vector") : "missing file",
    projectEmbeddings: `${projectCount}/${Object.keys(projectEmbeddings).length} valid`,
    domainEmbeddings: `${domainCount}/${Object.keys(domainEmbeddings).length} valid`,
  });

  const filtered = grants.filter((g) => !isHardNegativeGrant(g));

  // Try DB-first: fetch vector similarities from database if available
  let dbSimilarities = new Map<string, number>();
  if (hasDatabase) {
    dbSimilarities = await getDBVectorSimilarities(
      filtered.map((g) => g.id),
      resolvedProfileId
    );
  }

  const texts = filtered.map((g) => buildGrantEmbeddingText(g));

  let grantVectors: number[][] = [];
  if (hasOpenAI) {
    const toEmbed: { grant: DiscoveredGrant; text: string }[] = [];
    for (let i = 0; i < filtered.length; i++) {
      const g = filtered[i];
      const cachedVec = grantEmbeddingCache.get(g.id);
      if (!cachedVec) {
        toEmbed.push({ grant: g, text: texts[i] });
      }
    }

    if (toEmbed.length > 0) {
      console.log("[score-grants] Embedding", toEmbed.length, "grants (cache had", filtered.length - toEmbed.length, "cached)");
      const newVectors = await embedTexts(toEmbed.map((x) => x.text));
      let idx = 0;
      for (const { grant } of toEmbed) {
        const vec = newVectors[idx++] ?? [];
        grantEmbeddingCache.set(grant.id, vec);
      }
    } else {
      console.log("[score-grants] All", filtered.length, "grants already cached, skipping OpenAI call");
    }

    for (let i = 0; i < filtered.length; i++) {
      const vec = grantEmbeddingCache.get(filtered[i].id);
      grantVectors.push(vec ?? []);
    }
  } else {
    console.log("[score-grants] No OpenAI key — grant embeddings skipped");
    grantVectors = filtered.map(() => []);
  }

  const scores: GrantScore[] = [];

  for (let i = 0; i < filtered.length; i++) {
    const grant = filtered[i];
    const grantVec = grantVectors[i] ?? [];

    const eligibility = scoreEligibility(grant, profile);
    const impactScore = scoreImpact(grant, profile);

    // Profile alignment: DB similarity takes precedence, then file-based, then OpenAI
    let profileAlignmentScore = 0;
    let profileAlignmentSource: "db" | "file" | "openai" | "none" = "none";

    // 1. Try DB-stored vector similarity first
    const dbSimilarity = dbSimilarities.get(grant.id);
    if (dbSimilarity !== undefined) {
      profileAlignmentScore = dbSimilarity;
      profileAlignmentSource = "db";
    }
    // 2. Fall back to file-based/OpenAI embeddings
    else if (hasValidVector(grantVec) && profileEmbedding && hasValidVector(profileEmbedding.vector)) {
      const sim = cosineSimilarity(grantVec, profileEmbedding.vector);
      profileAlignmentScore = similarityToScore(sim);
      profileAlignmentSource = hasOpenAI ? "openai" : "file";
    }

    const topProjectMatches: TopProjectMatch[] = [];
    let projectSimilarityScore = 0;
    if (hasValidVector(grantVec)) {
      for (const [projId, proj] of Object.entries(projectEmbeddings)) {
        if (!hasValidVector(proj.vector)) continue;
        const sim = cosineSimilarity(grantVec, proj.vector);
        const score = similarityToScore(sim);
        topProjectMatches.push({ projectId: projId, projectName: proj.name, similarity: score });
      }
      topProjectMatches.sort((a, b) => b.similarity - a.similarity);
      projectSimilarityScore = topProjectMatches[0]?.similarity ?? 0;
    }

    const topDomainMatches: TopDomainMatch[] = [];
    let fundingDomainSimilarityScore = 0;
    if (hasValidVector(grantVec)) {
      for (const [domainId, data] of Object.entries(domainEmbeddings)) {
        if (!hasValidVector(data.vector)) continue;
        const sim = cosineSimilarity(grantVec, data.vector);
        const score = similarityToScore(sim);
        topDomainMatches.push({ domainId, domainName: data.name, similarity: score });
      }
      topDomainMatches.sort((a, b) => b.similarity - a.similarity);
      fundingDomainSimilarityScore = topDomainMatches[0]?.similarity ?? 0;
    }

    const overallScore = computeFinalScore({
      eligibilityScore: eligibility.score,
      profileAlignmentScore,
      projectSimilarityScore,
      fundingDomainSimilarityScore,
      impactScore,
    });

    const recommendation = getRecommendation(
      overallScore,
      eligibility.status,
      profileAlignmentScore
    );

    const strengths: string[] = [
      ...eligibility.reasons,
      ...topProjectMatches.slice(0, 2).map((m) => `${m.projectName} (${m.similarity}% match)`),
      ...topDomainMatches.slice(0, 1).map((m) => `${m.domainName} (${m.similarity}% match)`),
    ];

    const concerns: string[] = [];
    if (eligibility.status !== "eligible") concerns.push("Eligibility may need verification");
    if (grant.costSharing) concerns.push("Requires local cost-share/match");
    if (profileAlignmentScore < 50) concerns.push("Limited alignment with current priorities");

    const keyRequirements: string[] = [];
    if (grant.costSharing) keyRequirements.push("Local cost-share required");
    if (grant.closeDate) keyRequirements.push(`Application deadline: ${grant.closeDate}`);

    // Embedding scores are available if we have DB similarity OR valid OpenAI/file-based embeddings
    const embeddingScoresAvailable =
      profileAlignmentSource !== "none" ||
      (hasOpenAI &&
        hasValidVector(grantVec) &&
        (hasValidVector(profileEmbedding?.vector ?? []) ||
          Object.values(projectEmbeddings).some((p) => hasValidVector(p.vector)) ||
          Object.values(domainEmbeddings).some((d) => hasValidVector(d.vector))));

    if (i === 0) {
      console.log("[score-grants] First grant similarity sample:", {
        grantId: grant.id,
        grantTitle: grant.title.length > 50 ? grant.title.slice(0, 50) + "..." : grant.title,
        profileAlignmentScore,
        profileAlignmentSource,
        projectSimilarityScore,
        topProject: topProjectMatches[0]?.projectName,
        topDomain: topDomainMatches[0]?.domainName,
        domainSimilarity: topDomainMatches[0]?.similarity,
        embeddingScoresAvailable,
      });
    }

    scores.push({
      grantId: grant.id,
      grant,
      overallScore,
      eligibilityScore: eligibility.score,
      profileAlignmentScore,
      projectSimilarityScore,
      fundingDomainSimilarityScore,
      impactScore,
      recommendation,
      eligibilityStatus: eligibility.status,
      strengths: strengths.slice(0, 5),
      concerns: concerns.slice(0, 3),
      keyRequirements,
      topProjectMatches,
      topDomainMatches,
      embeddingScoresAvailable,
    });
  }

  scores.sort((a, b) => b.overallScore - a.overallScore);

  const withEmbeddings = scores.filter((s) => s.embeddingScoresAvailable).length;
  const withDBSimilarity = dbSimilarities.size;
  console.log(
    "[score-grants] Done:",
    scores.length,
    "scored,",
    withEmbeddings,
    "with embedding-based similarity",
    withDBSimilarity > 0 ? `(${withDBSimilarity} from DB)` : "(all from OpenAI/file)"
  );

  return scores;
}
