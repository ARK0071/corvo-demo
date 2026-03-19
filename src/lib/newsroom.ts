/**
 * Newsroom - port grant news aggregation via Brave Search + Tavily.
 * Server-side only.
 */

import { searchBrave } from "./brave-search";
import { searchTavily } from "./tavily-search";

// ─── Types ───

export interface NewsArticle {
  id: string;
  title: string;
  url: string;
  source: string;
  snippet: string;
  publishedDate: string | null;
  category: NewsCategory;
  relevanceScore: number;
  fundingAmount: number | null;
  searchProvider: "brave" | "tavily";
}

export type NewsCategory =
  | "grant_award"
  | "new_grant_program"
  | "port_funding"
  | "vendor_opportunity"
  | "policy_regulation"
  | "general";

// ─── Category inference ───

const CATEGORY_RULES: [RegExp, NewsCategory][] = [
  [/\b(awarded|receives?|wins?|won|secures?|selected)\b.*\b(grant|funding|award)\b/i, "grant_award"],
  [/\b(grant|funding|award)\b.*\b(awarded|receives?|wins?|won|secures?|selected)\b/i, "grant_award"],
  [/\b(new|announces?|launches?|opens?|released|nofo|notice of funding)\b.*\b(grant|program|opportunity)\b/i, "new_grant_program"],
  [/\b(grant|program|opportunity)\b.*\b(new|announces?|launches?|opens?|released|nofo)\b/i, "new_grant_program"],
  [/\b(port|maritime|terminal|harbor)\b.*\b(funding|investment|infrastructure|expansion)\b/i, "port_funding"],
  [/\b(contract|rfp|rfq|bid|procurement|vendor|solicitation)\b/i, "vendor_opportunity"],
  [/\b(regulation|legislation|bill|act|policy|executive order)\b/i, "policy_regulation"],
];

function inferCategory(text: string): NewsCategory {
  for (const [pattern, cat] of CATEGORY_RULES) {
    if (pattern.test(text)) return cat;
  }
  return "general";
}

function extractFunding(text: string): number | null {
  const match = text.match(/\$[\d,.]+\s*(?:million|billion|M|B)?/i);
  if (!match) return null;
  const raw = match[0].replace(/[$,]/g, "");
  const num = parseFloat(raw);
  if (isNaN(num)) return null;
  const lower = raw.toLowerCase();
  if (lower.includes("billion") || lower.endsWith("b")) return num * 1_000_000_000;
  if (lower.includes("million") || lower.endsWith("m")) return num * 1_000_000;
  return num;
}

function extractHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// ─── Search queries ───

const NEWS_QUERIES = [
  "port grant awarded 2025 2026",
  "port infrastructure grant funding announcement",
  "PIDP grant award port",
  "RAISE grant port infrastructure",
  "new port grant program federal",
  "maritime port funding opportunity NOFO",
  "port authority contract vendor procurement",
  "port terminal expansion grant",
];

// ─── Public API ───

export interface NewsSearchParams {
  query?: string;
  maxResults?: number;
}

export async function searchNewsroom(
  params: NewsSearchParams = {}
): Promise<NewsArticle[]> {
  const { query, maxResults = 40 } = params;
  const articles: NewsArticle[] = [];

  const queries = query
    ? [query, `${query} port grant`, `${query} port infrastructure funding`]
    : NEWS_QUERIES;

  const bravePromises: Promise<void>[] = [];
  const tavilyPromises: Promise<void>[] = [];

  // Brave Search - up to 4 queries, past month freshness
  if (process.env.BRAVE_SEARCH_API_KEY) {
    for (const q of queries.slice(0, 4)) {
      bravePromises.push(
        searchBrave(q, { count: 10, freshness: "pm" })
          .then((res) => {
            for (const r of res.web?.results ?? []) {
              const text = `${r.title} ${r.description}`;
              articles.push({
                id: `brave-${r.url.replace(/[^a-zA-Z0-9]/g, "").slice(0, 60)}`,
                title: r.title,
                url: r.url,
                source: extractHostname(r.url),
                snippet: r.description,
                publishedDate: null,
                category: inferCategory(text),
                relevanceScore: 0,
                fundingAmount: extractFunding(text),
                searchProvider: "brave",
              });
            }
          })
          .catch((err) => {
            console.error(`[Newsroom] Brave error for "${q}":`, err);
          })
      );
    }
  }

  // Tavily - up to 3 queries, advanced depth
  if (process.env.TAVILY_API_KEY) {
    for (const q of queries.slice(0, 3)) {
      tavilyPromises.push(
        searchTavily(q, { search_depth: "advanced", max_results: 10 })
          .then((res) => {
            for (const r of res.results ?? []) {
              const text = `${r.title} ${r.content}`;
              articles.push({
                id: `tavily-${r.url.replace(/[^a-zA-Z0-9]/g, "").slice(0, 60)}`,
                title: r.title,
                url: r.url,
                source: extractHostname(r.url),
                snippet: r.content.length > 300 ? r.content.slice(0, 300) + "…" : r.content,
                publishedDate: r.published_date ?? null,
                category: inferCategory(text),
                relevanceScore: r.score,
                fundingAmount: extractFunding(text),
                searchProvider: "tavily",
              });
            }
          })
          .catch((err) => {
            console.error(`[Newsroom] Tavily error for "${q}":`, err);
          })
      );
    }
  }

  await Promise.allSettled([...bravePromises, ...tavilyPromises]);

  // Deduplicate by URL
  const seen = new Map<string, NewsArticle>();
  for (const a of articles) {
    if (!seen.has(a.url)) {
      seen.set(a.url, a);
    }
  }

  // Sort: grant_award and new_grant_program first, then by relevance
  const CATEGORY_PRIORITY: Record<NewsCategory, number> = {
    grant_award: 0,
    new_grant_program: 1,
    port_funding: 2,
    vendor_opportunity: 3,
    policy_regulation: 4,
    general: 5,
  };

  const sorted = [...seen.values()].sort((a, b) => {
    const catDiff = CATEGORY_PRIORITY[a.category] - CATEGORY_PRIORITY[b.category];
    if (catDiff !== 0) return catDiff;
    return b.relevanceScore - a.relevanceScore;
  });

  return sorted.slice(0, maxResults);
}
