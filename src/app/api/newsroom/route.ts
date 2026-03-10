import { NextRequest, NextResponse } from "next/server";
import { searchNewsroom, type NewsArticle } from "@/lib/newsroom";

// ─── In-memory cache (10 min TTL) ───

interface CacheEntry {
  articles: NewsArticle[];
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 10 * 60 * 1000;

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() || "";
  const cacheKey = query.toLowerCase();

  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json({ articles: cached.articles, cached: true });
  }

  try {
    console.log(`[Newsroom API] Searching for "${query || "(default queries)"}"`);

    const articles = await searchNewsroom({
      query: query || undefined,
      maxResults: 40,
    });

    console.log(`[Newsroom API] Found ${articles.length} articles`);

    cache.set(cacheKey, { articles, timestamp: Date.now() });

    return NextResponse.json({ articles, cached: false });
  } catch (error) {
    console.error("[Newsroom API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch news", detail: String(error) },
      { status: 500 }
    );
  }
}
