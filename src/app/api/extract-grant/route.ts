import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { grantExtractPrompt } from "@/lib/grant-extract-prompt";

export const maxDuration = 30;

const rateLimit = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 10;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimit.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimit.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

const grantSchema = z.object({
  name: z.string().describe("Full official name of the grant program"),
  shortName: z.string().describe("Common abbreviation or short name"),
  agency: z.string().describe("Federal agency administering the grant"),
  description: z.string().describe("1-2 sentence summary of the grant purpose"),
  totalFunding: z.number().describe("Total program funding in dollars"),
  minAward: z.number().describe("Minimum individual award amount in dollars"),
  maxAward: z.number().describe("Maximum individual award amount in dollars"),
  matchRequirement: z.number().describe("Local match requirement as a decimal (e.g., 0.20 for 20%)"),
  eligibleActivities: z.array(z.string()).describe("Specific activities eligible for funding"),
  deadline: z.string().describe("Application deadline in YYYY-MM-DD format or TBD"),
  status: z.enum(["open", "upcoming", "closed"]).describe("Current status of the grant"),
  applicationUrl: z.string().describe("URL for the application portal"),
  focusAreas: z.array(z.string()).describe("Key topic/focus areas as lowercase keywords"),
});

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY is not configured." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";
  if (isRateLimited(ip)) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Please wait a moment." }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const { text } = await req.json();

    if (!text || typeof text !== "string" || text.trim().length < 20) {
      return new Response(
        JSON.stringify({ error: "Please provide the grant notice text (at least 20 characters)." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (text.length > 20_000) {
      return new Response(
        JSON.stringify({ error: "Text is too long. Please limit to 20,000 characters." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { object } = await generateObject({
      model: anthropic("claude-sonnet-4-5-20250929"),
      system: grantExtractPrompt,
      prompt: `Extract structured grant information from the following text:\n\n${text}`,
      schema: grantSchema,
    });

    return new Response(JSON.stringify(object), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
