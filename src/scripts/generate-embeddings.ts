/**
 * Pre-computed embeddings for spend categories, projects, port profiles, and funding domains.
 *
 * Usage:
 *   npx tsx src/scripts/generate-embeddings.ts              # all bundled client profiles below
 *   npx tsx src/scripts/generate-embeddings.ts port-freeport
 *   npx tsx src/scripts/generate-embeddings.ts louisiana-gateway-port
 *
 * Requires OPENAI_API_KEY in .env.local
 */

import * as path from "path";
import * as fs from "fs";
import { config } from "dotenv";
import { SPEND_CATEGORIES } from "@/data/spend-mapping";
import { initializeProjectsForProfile, getAllProjects } from "@/data/projects";
import { getProfile } from "@/data/profiles";
import {
  embedText,
  embedTexts,
  buildProjectEmbeddingText,
  buildProfileEmbeddingText,
} from "@/lib/embeddings";

config({ path: path.join(process.cwd(), ".env.local") });

const EMBEDDINGS_DIR = path.join(process.cwd(), "src/data/embeddings");

/** Profiles that ship static project lists in-repo (add IDs here when new demo clients get projects). */
const PROFILE_IDS_WITH_PROJECT_EMBEDDINGS = ["port-freeport", "louisiana-gateway-port"] as const;

async function writeProfileEmbeddings(profileId: string) {
  const profile = getProfile(profileId);
  if (!profile) {
    console.warn(`   Skip unknown profile: ${profileId}`);
    return;
  }

  initializeProjectsForProfile(profileId);
  const projects = getAllProjects();
  if (projects.length === 0) {
    console.warn(`   Skip ${profileId}: no projects after initialize`);
    return;
  }

  const projectTexts = projects.map((p) => buildProjectEmbeddingText(p));
  const projectVectors = await embedTexts(projectTexts);
  const projectEmbeddings: Record<string, { name: string; text: string; vector: number[] }> = {};
  for (let i = 0; i < projects.length; i++) {
    const p = projects[i];
    projectEmbeddings[p.id] = {
      name: p.name,
      text: projectTexts[i],
      vector: projectVectors[i] ?? [],
    };
  }

  const profileDir = path.join(EMBEDDINGS_DIR, "profiles", profileId);
  fs.mkdirSync(profileDir, { recursive: true });
  const projectPath = path.join(profileDir, "project-embeddings.json");
  fs.writeFileSync(projectPath, JSON.stringify(projectEmbeddings, null, 2));
  console.log(`   Wrote ${projectPath} (${projects.length} projects)`);

  const profileText = buildProfileEmbeddingText(profile);
  const profileVector = await embedText(profileText);
  const profileEmbedding = {
    profileId,
    text: profileText,
    vector: profileVector,
  };
  const profilePath = path.join(profileDir, "profile-embedding.json");
  fs.writeFileSync(profilePath, JSON.stringify(profileEmbedding, null, 2));
  console.log(`   Wrote ${profilePath}`);

  if (profileId === "port-freeport") {
    fs.writeFileSync(
      path.join(EMBEDDINGS_DIR, "project-embeddings.json"),
      JSON.stringify(projectEmbeddings, null, 2)
    );
    fs.writeFileSync(
      path.join(EMBEDDINGS_DIR, "profile-embedding.json"),
      JSON.stringify(profileEmbedding, null, 2)
    );
    console.log("   Updated legacy project-embeddings.json + profile-embedding.json (port-freeport)");
  }
}

async function main() {
  console.log("Generating embeddings...");
  console.log("OPENAI_API_KEY:", process.env.OPENAI_API_KEY ? "set" : "NOT SET");
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required. Add it to .env.local");
  }

  fs.mkdirSync(EMBEDDINGS_DIR, { recursive: true });

  const argProfile = process.argv[2];
  const profileIds = argProfile
    ? [argProfile]
    : [...PROFILE_IDS_WITH_PROJECT_EMBEDDINGS];

  // 1. Spend embeddings (global)
  console.log("\n1. Embedding spend categories...");
  const spendTexts = SPEND_CATEGORIES.map((c) => c.embeddingTheme);
  const spendVectors = await embedTexts(spendTexts);
  const spendEmbeddings: Record<
    string,
    { embeddingTheme: string; weight: number; vector: number[] }
  > = {};
  for (let i = 0; i < SPEND_CATEGORIES.length; i++) {
    const cat = SPEND_CATEGORIES[i];
    spendEmbeddings[cat.category] = {
      embeddingTheme: cat.embeddingTheme,
      weight: cat.weight,
      vector: spendVectors[i] ?? [],
    };
  }
  fs.writeFileSync(
    path.join(EMBEDDINGS_DIR, "spend-embeddings.json"),
    JSON.stringify(spendEmbeddings, null, 2)
  );
  console.log(`   Wrote spend-embeddings.json (${SPEND_CATEGORIES.length} categories)`);

  // 2–3. Per-profile project + profile embeddings
  console.log("\n2–3. Embedding projects + port profile(s)...");
  for (const pid of profileIds) {
    console.log(`\n   --- ${pid} ---`);
    await writeProfileEmbeddings(pid);
  }

  // 4. Funding domain embeddings
  console.log("\n4. Embedding funding domains...");
  const domainsPath = path.join(process.cwd(), "fundingDomainEmbeddings.json");
  const domainsRaw = fs.readFileSync(domainsPath, "utf-8");
  const domains = JSON.parse(domainsRaw) as { id: string; name: string; embeddingText: string }[];
  const domainTexts = domains.map((d) => d.embeddingText);
  const domainVectors = await embedTexts(domainTexts);
  const domainEmbeddings: Record<string, { name: string; text: string; vector: number[] }> = {};
  for (let i = 0; i < domains.length; i++) {
    const d = domains[i];
    domainEmbeddings[d.id] = {
      name: d.name,
      text: d.embeddingText,
      vector: domainVectors[i] ?? [],
    };
  }
  fs.writeFileSync(
    path.join(EMBEDDINGS_DIR, "funding-domain-embeddings.json"),
    JSON.stringify(domainEmbeddings, null, 2)
  );
  console.log(`   Wrote funding-domain-embeddings.json (${domains.length} domains)`);

  console.log("\nDone. Embeddings saved under src/data/embeddings/");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
