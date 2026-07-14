"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Loader2,
  ExternalLink,
  Newspaper,
  Award,
  Megaphone,
  DollarSign,
  Handshake,
  Landmark,
  Globe,
  Filter,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProfile } from "@/components/profile-provider";

// ─── Types (mirror server) ───

type NewsCategory =
  | "grant_award"
  | "new_grant_program"
  | "port_funding"
  | "vendor_opportunity"
  | "policy_regulation"
  | "general";

interface NewsArticle {
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

// ─── Category metadata ───

const CATEGORY_META: Record<
  NewsCategory,
  { label: string; color: string; icon: React.ReactNode }
> = {
  grant_award: {
    label: "Grant Award",
    color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    icon: <Award className="h-3.5 w-3.5" />,
  },
  new_grant_program: {
    label: "New Program",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
    icon: <Megaphone className="h-3.5 w-3.5" />,
  },
  port_funding: {
    label: "Port Funding",
    color: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300",
    icon: <DollarSign className="h-3.5 w-3.5" />,
  },
  vendor_opportunity: {
    label: "Vendor / Contract",
    color: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    icon: <Handshake className="h-3.5 w-3.5" />,
  },
  policy_regulation: {
    label: "Policy / Regulation",
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
    icon: <Landmark className="h-3.5 w-3.5" />,
  },
  general: {
    label: "General",
    color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    icon: <Globe className="h-3.5 w-3.5" />,
  },
};

function fmt(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

// ─── Page ───

export default function NewsroomPage() {
  const [query, setQuery] = useState("");
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [activeFilter, setActiveFilter] = useState<NewsCategory | "all">("all");
  const { profileId } = useProfile();

  const doSearch = useCallback(
    async (q?: string) => {
      setLoading(true);
      setError(null);
      setSearched(true);
      try {
        const qs = q !== undefined ? q : query;
        const params = new URLSearchParams();
        if (qs.trim()) params.set("q", qs.trim());
        if (profileId) params.set("profile", profileId);
        const url = `/api/newsroom${params.toString() ? `?${params}` : ""}`;
        const res = await fetch(url);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `API returned ${res.status}`);
        }
        const data = (await res.json()) as { articles: NewsArticle[] };
        setArticles(data.articles);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err));
        setArticles([]);
      } finally {
        setLoading(false);
      }
    },
    [query, profileId]
  );

  // Auto-load on mount (and re-load when profile changes)
  useEffect(() => {
    doSearch("");
  }, [profileId]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered =
    activeFilter === "all"
      ? articles
      : articles.filter((a) => a.category === activeFilter);

  // Category counts for filter chips
  const categoryCounts = articles.reduce(
    (acc, a) => {
      acc[a.category] = (acc[a.category] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Newspaper className="h-6 w-6 text-[#3d8b8b]" />
          Newsroom
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Recent news on port grant awards, new funding programs, vendor
          opportunities, and policy updates. Powered by Brave Search &amp;
          Tavily.
        </p>
      </div>

      {/* Search bar */}
      <div className="flex gap-2 max-w-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && doSearch()}
            placeholder="Search news (e.g. PIDP, Port of Houston, RAISE grant)…"
            className="pl-9"
          />
        </div>
        <Button
          onClick={() => doSearch()}
          disabled={loading}
          className="bg-[#3d8b8b] hover:bg-[#2d6b6b] text-white"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Search className="h-4 w-4 mr-2" />
          )}
          Search
        </Button>
      </div>

      {/* Filter chips */}
      {articles.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <FilterChip
            active={activeFilter === "all"}
            onClick={() => setActiveFilter("all")}
            label={`All (${articles.length})`}
          />
          {(Object.keys(CATEGORY_META) as NewsCategory[]).map((cat) => {
            const count = categoryCounts[cat] || 0;
            if (count === 0) return null;
            const meta = CATEGORY_META[cat];
            return (
              <FilterChip
                key={cat}
                active={activeFilter === cat}
                onClick={() => setActiveFilter(cat)}
                label={`${meta.label} (${count})`}
                icon={meta.icon}
              />
            );
          })}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#3d8b8b] mx-auto" />
            <p className="text-muted-foreground text-sm">
              Scanning news sources…
            </p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30">
          <CardContent className="pt-4">
            <p className="font-medium text-red-700 dark:text-red-400">
              Search failed
            </p>
            <p className="text-sm text-red-600 dark:text-red-300 mt-1">
              {error}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Empty */}
      {!loading && searched && articles.length === 0 && !error && (
        <div className="text-center py-16 text-muted-foreground">
          <Newspaper className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No news found</p>
          <p className="text-sm mt-1">
            Try a different search term, or check that BRAVE_SEARCH_API_KEY /
            TAVILY_API_KEY are configured.
          </p>
        </div>
      )}

      {/* Results */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Components ───

function FilterChip({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
        active
          ? "bg-[#3d8b8b] text-white"
          : "bg-muted text-muted-foreground hover:bg-muted/80"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function ArticleCard({ article }: { article: NewsArticle }) {
  const meta = CATEGORY_META[article.category];
  const snippet =
    article.snippet.length > 220
      ? article.snippet.slice(0, 220) + "…"
      : article.snippet;

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block group"
    >
      <Card className="h-full hover:shadow-md transition-shadow hover:border-[#3d8b8b]/40">
        <CardContent className="pt-4 space-y-2.5 h-full flex flex-col">
          {/* Top row: category + funding + source */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${meta.color}`}
            >
              {meta.icon}
              {meta.label}
            </span>
            {article.fundingAmount && (
              <Badge variant="outline" className="text-xs tabular-nums">
                {fmt(article.fundingAmount)}
              </Badge>
            )}
            <span className="ml-auto text-xs text-muted-foreground truncate max-w-[140px]">
              {article.source}
            </span>
          </div>

          {/* Title */}
          <h3 className="font-semibold text-sm leading-snug group-hover:text-[#3d8b8b] transition-colors line-clamp-2">
            {article.title}
          </h3>

          {/* Snippet */}
          <p className="text-xs text-muted-foreground flex-1 line-clamp-3">
            {snippet}
          </p>

          {/* Footer */}
          <div className="flex items-center justify-between pt-1 border-t text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              {article.publishedDate && (
                <span>{article.publishedDate}</span>
              )}
              <Badge variant="secondary" className="text-[10px] px-1.5">
                {article.searchProvider === "tavily" ? "Tavily" : "Brave"}
              </Badge>
            </div>
            <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </CardContent>
      </Card>
    </a>
  );
}
