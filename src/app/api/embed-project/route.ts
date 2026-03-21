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

export const maxDuration = 30;

const EMBEDDINGS_DIR = path.join(process.cwd(), "src/data/embeddings");
const PROJECT_EMBEDDINGS_PATH = path.join(EMBEDDINGS_DIR, "project-embeddings.json");

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured. Run npm run generate-embeddings after adding your key." },
        { status: 500 }
      );
    }

    const project = (await req.json()) as Project;
    if (!project.id || !project.name) {
      return NextResponse.json({ error: "Invalid project: id and name required" }, { status: 400 });
    }

    const text = buildProjectEmbeddingText(project);
    const vector = await embedText(text);

    let projectEmbeddings: Record<string, { name: string; text: string; vector: number[] }> = {};
    if (fs.existsSync(PROJECT_EMBEDDINGS_PATH)) {
      const raw = fs.readFileSync(PROJECT_EMBEDDINGS_PATH, "utf-8");
      projectEmbeddings = JSON.parse(raw);
    }

    projectEmbeddings[project.id] = { name: project.name, text, vector };

    fs.mkdirSync(EMBEDDINGS_DIR, { recursive: true });
    fs.writeFileSync(
      PROJECT_EMBEDDINGS_PATH,
      JSON.stringify(projectEmbeddings, null, 2)
    );

    return NextResponse.json({ ok: true, projectId: project.id });
  } catch (err) {
    console.error("[embed-project] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Embedding failed" },
      { status: 500 }
    );
  }
}
