/**
 * One-time script to generate pre-computed embeddings for spend categories,
 * projects, and port profile. Run: npx tsx src/scripts/generate-embeddings.ts
 *
 * Requires OPENAI_API_KEY in .env.local
 */

import * as path from "path";
import * as fs from "fs";
import { config } from "dotenv";
import { SPEND_CATEGORIES } from "@/data/spend-mapping";
import { initializePortFreeportProjects, getAllProjects } from "@/data/projects";
import { getDefaultProfile, DEFAULT_PROFILE_ID } from "@/data/profiles";
import {
  embedText,
  embedTexts,
  buildProjectEmbeddingText,
  buildProfileEmbeddingText,
} from "@/lib/embeddings";

config({ path: path.join(process.cwd(), ".env.local") });

const EMBEDDINGS_DIR = path.join(process.cwd(), "src/data/embeddings");

async function main() {
  console.log("Generating embeddings...");
  console.log("OPENAI_API_KEY:", process.env.OPENAI_API_KEY ? "set" : "NOT SET");
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required. Add it to .env.local");
  }

  fs.mkdirSync(EMBEDDINGS_DIR, { recursive: true });

  // 1. Spend embeddings
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

  // 2. Project embeddings (initialize default projects first)
  console.log("\n2. Embedding projects...");
  initializePortFreeportProjects();
  const projects = getAllProjects();
  const projectTexts = projects.map((p) => buildProjectEmbeddingText(p));
  const projectVectors = await embedTexts(projectTexts);
  const projectEmbeddings: Record<
    string,
    { name: string; text: string; vector: number[] }
  > = {};
  for (let i = 0; i < projects.length; i++) {
    const p = projects[i];
    projectEmbeddings[p.id] = {
      name: p.name,
      text: projectTexts[i],
      vector: projectVectors[i] ?? [],
    };
  }
  fs.writeFileSync(
    path.join(EMBEDDINGS_DIR, "project-embeddings.json"),
    JSON.stringify(projectEmbeddings, null, 2)
  );
  console.log(`   Wrote project-embeddings.json (${projects.length} projects)`);

  // 3. Profile embedding
  console.log("\n3. Embedding port profile...");
  const profile = getDefaultProfile();
  const profileText = buildProfileEmbeddingText(profile);
  const profileVector = await embedText(profileText);
  const profileEmbedding = {
    profileId: DEFAULT_PROFILE_ID,
    text: profileText,
    vector: profileVector,
  };
  fs.writeFileSync(
    path.join(EMBEDDINGS_DIR, "profile-embedding.json"),
    JSON.stringify(profileEmbedding, null, 2)
  );
  console.log(`   Wrote profile-embedding.json (${DEFAULT_PROFILE_ID})`);

  console.log("\nDone. Embeddings saved to src/data/embeddings/");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
