"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Layers,
  FolderKanban,
  Award,
  DollarSign,
  Calendar,
  ArrowRight,
  Loader2,
  Newspaper,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getAllPipelineGrants,
  getStageCount,
  type PipelineGrant,
} from "@/data/grant-pipeline";
import {
  getAllProjects,
  getProjectStats,
  initializeProjectsForProfile,
  type Project,
} from "@/data/projects";
import { getAwardStats } from "@/data/awards";
import { getReportingStats } from "@/data/reporting";
import { useProfile } from "@/components/profile-provider";

// ─── Helpers ───

function fmt(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

function daysUntil(dateStr: string): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

// ─── Types for newsroom ───

interface NewsArticle {
  id: string;
  title: string;
  url: string;
  source: string;
  snippet: string;
  category: string;
  searchProvider: string;
}

// ─── Page ───

export default function PorterDashboardPage() {
  const { profileId } = useProfile();
  const [pipeline, setPipeline] = useState<PipelineGrant[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectStats, setProjectStats] = useState<ReturnType<typeof getProjectStats> | null>(null);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [awardStats, setAwardStats] = useState<ReturnType<typeof getAwardStats> | null>(null);
  const [reportingStats, setReportingStats] = useState<ReturnType<typeof getReportingStats> | null>(null);

  useEffect(() => {
    initializeProjectsForProfile(profileId);
    setPipeline(getAllPipelineGrants());
    setProjects(getAllProjects());
    setProjectStats(getProjectStats());
    setAwardStats(getAwardStats());
    setReportingStats(getReportingStats());

    fetch("/api/newsroom")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setNews((data.articles ?? []).slice(0, 5)))
      .catch(() => setNews([]))
      .finally(() => setNewsLoading(false));
  }, []);

  const stageCounts = useMemo(() => ({
    eligible: getStageCount("eligible"),
    applied: getStageCount("applied"),
    underReview: getStageCount("under_review"),
    awarded: getStageCount("awarded"),
    rejected: getStageCount("rejected"),
    total: pipeline.length,
  }), [pipeline]);

  const upcoming = useMemo(() =>
    pipeline
      .filter((g) => {
        const d = daysUntil(g.closeDate);
        return d !== null && d >= 0 && d <= 30;
      })
      .sort((a, b) => new Date(a.closeDate).getTime() - new Date(b.closeDate).getTime())
      .slice(0, 5),
    [pipeline]
  );

  const fundingStats = useMemo(() => {
    const potentialFunding = pipeline.reduce(
      (s, g) => s + (g.awardCeiling || g.totalFunding || 0),
      0
    );
    const awardedFunding = pipeline
      .filter((g) => g.stage === "awarded")
      .reduce((s, g) => s + (g.awardCeiling || g.totalFunding || 0), 0);
    return { potentialFunding, awardedFunding };
  }, [pipeline]);

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <LayoutDashboard className="h-6 w-6 text-[#3d8b8b]" />
          Porter Dashboard
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Port Freeport grant pipeline, awards, and compliance at a glance.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiCard
          icon={<Layers className="h-4 w-4" />}
          label="Pipeline"
          value={String(stageCounts.total)}
          href="/grants?tab=pipeline"
        />
        <KpiCard
          icon={<DollarSign className="h-4 w-4" />}
          label="Potential Funding"
          value={fmt(fundingStats.potentialFunding)}
          href="/grants?tab=pipeline"
        />
        <KpiCard
          icon={<Award className="h-4 w-4" />}
          label="Active Awards"
          value={String(awardStats?.activeCount ?? 0)}
          accent="text-[#3d8b8b]"
          href="/awards"
        />
        <KpiCard
          icon={<DollarSign className="h-4 w-4" />}
          label="Award Funding"
          value={fmt(awardStats?.totalAwarded ?? 0)}
          href="/awards"
        />
        <KpiCard
          icon={<FileText className="h-4 w-4" />}
          label="Reports Due (30d)"
          value={String(reportingStats?.dueNext30Days ?? 0)}
          accent={(reportingStats?.dueNext30Days ?? 0) > 0 ? "text-amber-600 dark:text-amber-400" : ""}
          href="/reporting"
        />
      </div>

      {/* ── Main Content: 2-column ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline Funnel */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Layers className="h-4 w-4" /> Pipeline Funnel
              </span>
              <Link
                href="/grants?tab=pipeline"
                className="text-xs text-[#3d8b8b] hover:underline flex items-center gap-1"
              >
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stageCounts.total === 0 ? (
              <EmptyHint
                text="No grants in pipeline yet."
                linkLabel="Discover Grants"
                href="/grants?tab=discover"
              />
            ) : (
              <div className="space-y-2">
                <FunnelRow label="Eligible" count={stageCounts.eligible} total={stageCounts.total} color="bg-blue-500" />
                <FunnelRow label="Applied" count={stageCounts.applied} total={stageCounts.total} color="bg-purple-500" />
                <FunnelRow label="Under Review" count={stageCounts.underReview} total={stageCounts.total} color="bg-amber-500" />
                <FunnelRow label="Awarded" count={stageCounts.awarded} total={stageCounts.total} color="bg-emerald-500" />
                <FunnelRow label="Rejected" count={stageCounts.rejected} total={stageCounts.total} color="bg-red-500" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Deadlines */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4" /> Upcoming Deadlines
              </span>
              <Link
                href="/grants?tab=pipeline"
                className="text-xs text-[#3d8b8b] hover:underline flex items-center gap-1"
              >
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <EmptyHint
                text="No upcoming deadlines in the next 30 days."
                linkLabel="Discover Grants"
                href="/grants?tab=discover"
              />
            ) : (
              <div className="space-y-3">
                {upcoming.map((g) => {
                  const days = daysUntil(g.closeDate);
                  return (
                    <div
                      key={g.id}
                      className="flex items-start justify-between gap-3 text-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{g.title}</p>
                        <p className="text-xs text-muted-foreground">{g.agency}</p>
                      </div>
                      <Badge
                        variant="outline"
                        className={`shrink-0 tabular-nums ${
                          days !== null && days <= 7
                            ? "border-red-500/50 text-red-600 dark:text-red-400"
                            : ""
                        }`}
                      >
                        {days !== null ? `${days}d` : "-"}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Projects Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FolderKanban className="h-4 w-4" /> Projects
              </span>
              <Link
                href="/grants?tab=projects"
                className="text-xs text-[#3d8b8b] hover:underline flex items-center gap-1"
              >
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <EmptyHint
                text="No projects added yet."
                linkLabel="Add Projects"
                href="/grants?tab=projects"
              />
            ) : (
              <div className="space-y-2">
                {projects.slice(0, 5).map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{p.name}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="secondary" className="text-[10px] capitalize">
                        {p.status.replace("_", " ")}
                      </Badge>
                      {p.budget > 0 && (
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {fmt(p.budget)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {projects.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center pt-1">
                    + {projects.length - 5} more
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Latest News */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Newspaper className="h-4 w-4" /> Latest News
              </span>
              <Link
                href="/newsroom"
                className="text-xs text-[#3d8b8b] hover:underline flex items-center gap-1"
              >
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {newsLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : news.length === 0 ? (
              <EmptyHint
                text="No news available. Configure BRAVE_SEARCH_API_KEY or TAVILY_API_KEY."
                linkLabel="Open Newsroom"
                href="/newsroom"
              />
            ) : (
              <div className="space-y-3">
                {news.map((a) => (
                  <a
                    key={a.id}
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-sm hover:bg-muted/50 rounded -mx-2 px-2 py-1 transition-colors"
                  >
                    <p className="font-medium line-clamp-1">{a.title}</p>
                    <p className="text-xs text-muted-foreground">{a.source}</p>
                  </a>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}

// ─── Sub-components ───

function KpiCard({
  icon,
  label,
  value,
  accent,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: string;
  href?: string;
}) {
  const inner = (
    <Card className={`hover:shadow-md transition-shadow ${href ? "cursor-pointer" : ""}`}>
      <CardContent className="pt-3 pb-3">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          {icon}
          <span className="text-[10px] uppercase tracking-wider font-medium">
            {label}
          </span>
        </div>
        <p className={`text-lg font-bold tabular-nums ${accent || ""}`}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function FunnelRow({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 text-sm">{label}</span>
      <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
        <div
          className={`h-full ${color} rounded transition-all duration-500`}
          style={{ width: `${Math.max(pct, count > 0 ? 4 : 0)}%` }}
        />
      </div>
      <span className="w-8 text-right text-sm font-medium tabular-nums">
        {count}
      </span>
    </div>
  );
}

function EmptyHint({
  text,
  linkLabel,
  href,
}: {
  text: string;
  linkLabel: string;
  href: string;
}) {
  return (
    <div className="text-center py-6 text-muted-foreground">
      <p className="text-sm">{text}</p>
      <Link
        href={href}
        className="text-sm text-[#3d8b8b] hover:underline mt-1 inline-flex items-center gap-1"
      >
        {linkLabel} <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

