import { NextRequest, NextResponse } from "next/server";
import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { fetchGrantDetails } from "@/lib/grants-gov";
import { buildUserPrompt } from "@/lib/grant-application-builder";
import { GRANT_APPLICATION_SYSTEM_PROMPT } from "@/lib/grant-application-prompt";

export const maxDuration = 120;

/**
 * POST /api/build-grant-application
 *
 * Streams grant application content using Anthropic.
 * Uses a custom prompt (editable in src/lib/grant-application-prompt.ts).
 * Response is a plain text stream so the client can show content as it arrives.
 */
export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      {
        error:
          "ANTHROPIC_API_KEY is not configured. Add it to .env.local to use the grant application builder.",
      },
      { status: 500 }
    );
  }

  let body: { grantId?: string; portName?: string; customPrompt?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.grantId) {
    return NextResponse.json(
      { error: "grantId is required" },
      { status: 400 }
    );
  }

  const grantId = String(body.grantId);
  const portName = body.portName ?? "the port authority";
  const systemPrompt = body.customPrompt ?? GRANT_APPLICATION_SYSTEM_PROMPT;

  try {
    const grant = await fetchGrantDetails(grantId);
    const userPrompt = buildUserPrompt(grant, portName);

    const result = streamText({
      model: anthropic("claude-sonnet-4-5-20250929"),
      system: systemPrompt,
      prompt: userPrompt,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Error building grant application:", error);
    const message =
      error instanceof Error ? error.message : "Failed to build grant application";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
