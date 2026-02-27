import { NextResponse } from "next/server";
import { generateKeywordsWithAI } from "@/lib/smartMatch/aiKeywordGenerator";
import type { DemoContext } from "@/data/demoContext";

export async function POST(request: Request) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY not configured" },
        { status: 503 }
      );
    }

    const body = await request.json() as { context: DemoContext };
    if (!body.context) {
      return NextResponse.json(
        { error: "Missing context in request body" },
        { status: 400 }
      );
    }

    const keywords = await generateKeywordsWithAI(body.context);

    return NextResponse.json({ keywords, source: "AI" });
  } catch (error) {
    console.error("[API smart-match-keywords] Error:", error);
    return NextResponse.json(
      { error: "AI keyword generation failed", detail: String(error) },
      { status: 500 }
    );
  }
}
