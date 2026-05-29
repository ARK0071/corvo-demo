/**
 * POST /api/embed-project
 *
 * Embeds a newly created project and appends it to project-embeddings.json.
 * Called by the grants page after creating a project.
 */

import { NextResponse } from "next/server";
import * as path from "path";
import * as fs from "fs";
import { embedText, buildProjectEmbeddingText } from "@/lib/embeddings";
import type { Project } from "@/data/projects";
import { getProfile, DEFAULT_PROFILE_ID, ensureProfilesLoaded } from "@/data/profiles";

export const maxDuration = 30;

const EMBEDDINGS_DIR = path.join(process.cwd(), "src/data/embeddings");

export async function POST(req: Request) {
  try {
    await ensureProfilesLoaded();
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured. Run npm run generate-embeddings after adding your key." },
        { status: 500 }
      );
    }

    const raw = (await req.json()) as Project & { profileId?: string };
    const profileId =
      typeof raw.profileId === "string" && getProfile(raw.profileId)
        ? raw.profileId
        : DEFAULT_PROFILE_ID;
    const { profileId: _drop, ...rest } = raw;
    const project = rest as Project;

    if (!project.id || !project.name) {
      return NextResponse.json({ error: "Invalid project: id and name required" }, { status: 400 });
    }

    const text = buildProjectEmbeddingText(project);
    const vector = await embedText(text);

    const profileDir = path.join(EMBEDDINGS_DIR, "profiles", profileId);
    const projectEmbeddingsPath = path.join(profileDir, "project-embeddings.json");

    let projectEmbeddings: Record<string, { name: string; text: string; vector: number[] }> = {};
    if (fs.existsSync(projectEmbeddingsPath)) {
      const fileRaw = fs.readFileSync(projectEmbeddingsPath, "utf-8");
      projectEmbeddings = JSON.parse(fileRaw);
    } else if (profileId === "port-freeport") {
      const legacy = path.join(EMBEDDINGS_DIR, "project-embeddings.json");
      if (fs.existsSync(legacy)) {
        projectEmbeddings = JSON.parse(fs.readFileSync(legacy, "utf-8"));
      }
    }

    projectEmbeddings[project.id] = { name: project.name, text, vector };

    fs.mkdirSync(profileDir, { recursive: true });
    fs.writeFileSync(projectEmbeddingsPath, JSON.stringify(projectEmbeddings, null, 2));

    return NextResponse.json({ ok: true, projectId: project.id, profileId });
  } catch (err) {
    console.error("[embed-project] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Embedding failed" },
      { status: 500 }
    );
  }
}
