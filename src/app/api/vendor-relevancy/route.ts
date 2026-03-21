import { NextResponse } from "next/server";
import {
  embedTexts,
  cosineSimilarity,
  similarityToScore,
  buildProjectDoc,
  buildVendorDoc,
} from "@/lib/vendor-relevancy";
import type { Project } from "@/data/projects";
import type { EnrichedVendor } from "@/lib/vendor-filters";

export const runtime = "nodejs";

interface RequestBody {
  project: Project;
  vendors: EnrichedVendor[];
}

/**
 * POST /api/vendor-relevancy
 * Computes semantic relevancy scores for vendors against a project.
 * Returns { scores: Record<vendorId, number> }.
 */
export async function POST(req: Request) {
  try {
    const body: RequestBody = await req.json();
    const { project, vendors } = body;

    if (!project || !vendors?.length) {
      return NextResponse.json(
        { error: "project and vendors[] are required" },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      console.warn("[vendor-relevancy] OPENAI_API_KEY not set — returning fallback scores");
      const scores: Record<string, number> = {};
      for (const v of vendors) {
        scores[v.id] = 50;
      }
      return NextResponse.json({ scores });
    }

    const projectDoc = buildProjectDoc(project);
    const vendorDocs = vendors.map(buildVendorDoc);

    const allTexts = [projectDoc, ...vendorDocs];
    const embeddings = await embedTexts(allTexts);
    const projectEmbedding = embeddings[0];

    const scores: Record<string, number> = {};
    for (let i = 0; i < vendors.length; i++) {
      const sim = cosineSimilarity(projectEmbedding, embeddings[i + 1]);
      scores[vendors[i].id] = similarityToScore(sim);
    }

    console.log(
      `[vendor-relevancy] Scored ${vendors.length} vendors for project "${project.name}"`
    );

    return NextResponse.json({ scores });
  } catch (err) {
    console.error("[vendor-relevancy] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Relevancy scoring failed" },
      { status: 500 }
    );
  }
}
