import { streamText, stepCountIs, convertToModelMessages } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { buildPorterSystemPrompt } from "@/lib/porter-system-prompt";
import { porterTools } from "@/tools/porter/definitions";
import { withAuth } from "@/lib/auth/api-guard";
import { resolvePortProfileId } from "@/lib/db/tenant-config.server";
import { runWithPorterContext } from "@/lib/porter-context";
import { prisma } from "@/lib/db/client";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 120;

// In-memory rate limiter (per user, 30 requests per minute)
const rateLimit = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 30;

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimit.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimit.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

// Prompt injection detection on user input
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

const MAX_MESSAGE_LENGTH = 6000;

export const POST = withAuth(async (request: NextRequest, { user }) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured." },
      { status: 500 }
    );
  }

  if (isRateLimited(user.id)) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment before trying again." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { messages, pageContext } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Invalid request." },
        { status: 400 }
      );
    }

    // Extract last user message text for injection check
    const lastMessage = messages[messages.length - 1];
    const userText =
      typeof lastMessage?.content === "string"
        ? lastMessage.content
        : Array.isArray(lastMessage?.parts)
          ? lastMessage.parts
              .filter((p: { type: string }) => p.type === "text")
              .map((p: { text: string }) => p.text)
              .join(" ")
          : "";

    if (userText.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: "Message is too long. Please keep your question concise." },
        { status: 400 }
      );
    }

    if (containsInjection(userText)) {
      return NextResponse.json(
        {
          error:
            "I'm Porter, Corvo's grant lifecycle assistant. I can help you find grants, manage your pipeline, track compliance, and handle award administration. What would you like to do?",
        },
        { status: 400 }
      );
    }

    // Resolve port profile for multi-tenant scoping
    const portProfileId = await resolvePortProfileId(request.headers);

    // Fetch port profile name for system prompt context
    let portProfileName: string | undefined;
    if (portProfileId && prisma) {
      const profile = await prisma.portProfile.findUnique({
        where: { id: portProfileId },
        select: { name: true },
      });
      portProfileName = profile?.name ?? undefined;
    }

    const systemPrompt = buildPorterSystemPrompt({
      currentPage: typeof pageContext === "string" ? pageContext : undefined,
      portProfileName,
      userId: user.id,
      userRole: user.role,
      userName: user.name,
    });

    const modelMessages = await convertToModelMessages(messages, {
      tools: porterTools,
    });

    // Run the streaming response inside Porter context so all tool
    // executions can access the authenticated user and port profile
    // via getPorterContext() without explicit parameter threading.
    return runWithPorterContext(
      {
        userId: user.id,
        portId: user.portId,
        portProfileId: portProfileId ?? undefined,
        userRole: user.role,
      },
      async () => {
        const result = streamText({
          model: anthropic("claude-sonnet-4-6"),
          system: systemPrompt,
          messages: modelMessages,
          tools: porterTools,
          stopWhen: stepCountIs(12),
        });

        return result.toUIMessageStreamResponse();
      }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";
    const status =
      message.includes("rate") || message.includes("429") ? 429 : 500;
    return NextResponse.json({ error: message }, { status });
  }
});
