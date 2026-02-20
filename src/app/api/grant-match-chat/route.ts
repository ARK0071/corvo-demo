import { streamText, stepCountIs, convertToModelMessages } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { GRANT_MATCH_SYSTEM_PROMPT } from "@/lib/grant-match-system-prompt";
import { grantIntelligenceTools } from "@/tools/grant-intelligence/definitions";

export const maxDuration = 60;

// Simple in-memory rate limiter (per IP, 20 requests per minute)
const rateLimit = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 20;

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

// Patterns that indicate prompt injection attempts
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions|prompts|rules)/i,
  /repeat\s+(your|the|all)\s+(system\s+)?(prompt|instructions|rules)/i,
  /what\s+(are|is)\s+your\s+(system\s+)?(prompt|instructions|rules)/i,
  /output\s+(your|the)\s+(system\s+)?(prompt|instructions)/i,
  /show\s+(me\s+)?(your|the)\s+(system\s+)?(prompt|instructions|rules)/i,
  /pretend\s+(you\s+are|to\s+be|you're)\s+(a\s+different|another|not)/i,
  /you\s+are\s+now\s+(a\s+different|no\s+longer)/i,
  /disregard\s+(all\s+)?(previous|prior|above)/i,
  /\bDAN\b.*\bmode\b/i,
  /jailbreak/i,
  /act\s+as\s+(if\s+you\s+have\s+)?no\s+(restrictions|limits|rules)/i,
];

function containsInjection(text: string): boolean {
  return INJECTION_PATTERNS.some((pattern) => pattern.test(text));
}

const MAX_MESSAGE_LENGTH = 4000;

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY is not configured. Add it to .env.local to use Corvo Grant Intelligence." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";
  if (isRateLimited(ip)) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Please wait a moment before trying again." }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const { messages } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Invalid request." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const lastMessage = messages[messages.length - 1];
    const userText = typeof lastMessage?.content === "string"
      ? lastMessage.content
      : Array.isArray(lastMessage?.parts)
        ? lastMessage.parts.filter((p: { type: string }) => p.type === "text").map((p: { text: string }) => p.text).join(" ")
        : "";

    if (userText.length > MAX_MESSAGE_LENGTH) {
      return new Response(
        JSON.stringify({ error: "Message is too long. Please keep your question concise." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (containsInjection(userText)) {
      return new Response(
        JSON.stringify({ error: "I'm Corvo, a grant intelligence assistant for port authorities. I can help you evaluate federal grants, score opportunities, and calculate financial scenarios. What would you like to explore?" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const modelMessages = await convertToModelMessages(messages, {
      tools: grantIntelligenceTools,
    });

    const result = streamText({
      model: anthropic("claude-sonnet-4-5-20250929"),
      system: GRANT_MATCH_SYSTEM_PROMPT,
      messages: modelMessages,
      tools: grantIntelligenceTools,
      stopWhen: stepCountIs(8),
    });

    return result.toUIMessageStreamResponse();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    const status = message.includes("rate") || message.includes("429") ? 429 : 500;
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { "Content-Type": "application/json" } }
    );
  }
}
