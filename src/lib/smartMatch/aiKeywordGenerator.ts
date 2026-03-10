/**
 * AI-Powered Keyword Generator for Smart Match
 * 
 * Uses Anthropic Claude to generate optimized grant search keywords
 * based on projects, spend signals, and context.
 */

import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import type { DemoContext } from "@/data/demoContext";

// ─── Cache ───

interface CacheEntry {
  keywords: string[];
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Generate a cache key from context
 */
function getCacheKey(context: DemoContext): string {
  // Create a hash from projects and spend categories
  const projectsHash = context.projects
    .map((p) => `${p.id}:${p.name}:${p.focusAreas.join(",")}`)
    .join("|");
  const spendHash = context.spendSignals.topCategoriesL2
    .map((c) => `${c.category}:${c.spend}`)
    .join("|");
  return `${projectsHash}|${spendHash}`;
}

/**
 * Get cached keywords if available
 */
function getCached(key: string): string[] | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.keywords;
}

/**
 * Cache keywords
 */
function setCached(key: string, keywords: string[]): void {
  cache.set(key, {
    keywords,
    timestamp: Date.now(),
  });
}

// ─── Schema ───

const keywordSchema = z.object({
  keywords: z.array(z.string()).describe(
    "Array of 15-20 high-signal grant search keywords aligned with federal/state infrastructure funding language"
  ),
});

// ─── System Prompt ───

const KEYWORD_GENERATION_SYSTEM_PROMPT = `You are a grant search optimization expert specializing in federal and state infrastructure funding programs.

Your task is to generate 15-20 high-signal keywords that will effectively match relevant grant opportunities in federal and state grant databases.

Guidelines:
1. Keywords should be terms commonly used in federal/state grant NOFOs (Notices of Funding Opportunity)
2. Include infrastructure, maritime, port, transportation, and related terminology
3. Prioritize terms that match funding program language (e.g., "resilience", "electrification", "intermodal", "zero-emission")
4. Include both specific technical terms and broader program categories
5. Consider federal agency terminology (DOT, MARAD, EPA, etc.)
6. Keywords should be searchable terms (avoid overly generic words)
7. Return exactly 15-20 keywords as a JSON array

Focus on terms that will match:
- Infrastructure grants (ports, terminals, transportation)
- Maritime and navigation programs
- Environmental and resilience funding
- Energy and electrification programs
- Workforce and economic development grants`;

/**
 * Generate keywords using AI
 */
export async function generateKeywordsWithAI(
  context: DemoContext,
  timeoutMs: number = 10000
): Promise<string[]> {
  // Check cache first
  const cacheKey = getCacheKey(context);
  const cached = getCached(cacheKey);
  if (cached) {
    console.log("[AI Keywords] Using cached keywords");
    return cached;
  }

  // Check if API key is configured
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  console.log("[AI Keywords] Generating keywords with AI...");

  // Prepare input data
  const client = "Port Freeport Texas U.S. public port authority";
  const projects = context.projects.map((p) => ({
    name: p.name,
    description: p.description,
    focus_areas: p.focusAreas,
    budget: p.budget,
    location: p.location,
  }));
  const topSpendCategories = context.spendSignals.topCategoriesL2.map((c) => ({
    category: c.category,
    spend: c.spend,
  }));

  const prompt = `Generate 15-20 high-signal grant-search keywords aligned with federal/state infrastructure funding language.

Client: ${client}

Projects:
${projects.map((p, i) => `
${i + 1}. ${p.name}
   Description: ${p.description}
   Focus Areas: ${p.focus_areas.join(", ")}
   Budget: ${p.budget ? `$${(p.budget / 1_000_000).toFixed(1)}M` : "N/A"}
   Location: ${p.location || "N/A"}
`).join("\n")}

Top Spend Categories:
${topSpendCategories.map((c, i) => `
${i + 1}. ${c.category}: $${(c.spend / 1_000_000).toFixed(2)}M
`).join("\n")}

Objective: Generate 10-20 high-signal grant-search keywords aligned with federal/state infrastructure funding language.

Consider:
- The specific projects and their focus areas
- The spend patterns (what the port is investing in)
- Federal grant program terminology
- Maritime and port infrastructure language
- Transportation and intermodal terminology
- Environmental and resilience funding terms`;

  try {
    // Create a promise with timeout
    const aiPromise = generateObject({
      model: anthropic("claude-sonnet-4-5-20250929"),
      system: KEYWORD_GENERATION_SYSTEM_PROMPT,
      prompt,
      schema: keywordSchema,
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("AI keyword generation timeout")), timeoutMs);
    });

    const result = await Promise.race([aiPromise, timeoutPromise]);
    const keywords = result.object.keywords;

    // Validate and clean keywords
    const cleanedKeywords = keywords
      .map((k) => k.toLowerCase().trim())
      .filter((k) => k.length >= 3 && k.length <= 50)
      .slice(0, 20);

    if (cleanedKeywords.length < 10) {
      console.warn(`[AI Keywords] Only generated ${cleanedKeywords.length} keywords (expected 15-20)`);
    }

    // Cache the results
    setCached(cacheKey, cleanedKeywords);

    console.log(`[AI Keywords] Generated ${cleanedKeywords.length} keywords:`, cleanedKeywords.join(", "));
    return cleanedKeywords;
  } catch (error) {
    console.error("[AI Keywords] Error generating keywords:", error);
    throw error;
  }
}
