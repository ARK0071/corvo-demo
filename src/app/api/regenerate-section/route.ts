import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth";
import {
  regenerateSingleSection,
  checkSectionRegenRateLimit,
  type RegenerateSectionRequest,
} from "@/lib/grant-drafting";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const rateLimit = checkSectionRegenRateLimit(session.user.id);
  if (!rateLimit.allowed) {
    return new Response(
      JSON.stringify({ error: "Rate limit exceeded. Try again later.", resetAt: rateLimit.resetAt.toISOString() }),
      { status: 429, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY is not configured." }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    const body: RegenerateSectionRequest = await req.json();

    if (!body.sectionId || !body.entityProfile || !body.grantRequirements) {
      return new Response(
        JSON.stringify({ error: "sectionId, entityProfile, and grantRequirements are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const section = await regenerateSingleSection(body);

    return new Response(JSON.stringify({ section }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Regeneration failed";
    console.error("Section regen error:", error);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
