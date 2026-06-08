"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
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
  AlertTriangle,
  CheckSquare,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PipelineGrant } from "@/data/grant-pipeline";
import type { Project } from "@/data/projects";
import { useProfile } from "@/components/profile-provider";
import { useTenant, useTenantHeaders } from "@/contexts/tenant-context";

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
  const tenant = useTenant();
  const tenantHeaders = useTenantHeaders();
  const [pipeline, setPipeline] = useState<PipelineGrant[]>([]);
  const [pipelineLoading, setPipelineLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [awardStats, setAwardStats] = useState<{ activeCount: number; totalAwarded: number } | null>(null);
  const [reportingStats, setReportingStats] = useState<{ dueNext30Days: number } | null>(null);
  const [dbAwards, setDbAwards] = useState<{ id: string; title: string; program: string; totalAmount: number; budgetCategories: { name: string; ceiling: number; spent: number }[]; status: string }[]>([]);
  const [upcomingReports, setUpcomingReports] = useState<{ id: string; awardTitle: string; program: string; type: string; dueDate: string; status: string }[]>([]);
  const [myTasks, setMyTasks] = useState<{ id: string; title: string; status: string; priority: string; dueDate: string | null; phase: string | null; awardTitle: string | null; pipelineGrantId: string | null }[]>([]);

  // Fetch pipeline from database
  const fetchPipelineFromDB = useCallback(async () => {
    try {
      const res = await fetch("/api/pipeline", {
        headers: { ...tenantHeaders, "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to fetch pipeline");
      const data = await res.json();
      setPipeline(data.grants || []);
      return true;
    } catch (error) {
      console.error("[Dashboard] Pipeline fetch error:", error);
      return false;
    }
  }, [tenantHeaders]);

  useEffect(() => {
    if (tenant.isLoading) return;

    const loadData = async () => {
      // Load pipeline from DB
      setPipelineLoading(true);
      await fetchPipelineFromDB();
      setPipelineLoading(false);

      // Load projects from DB
      fetch("/api/projects", { headers: { ...tenantHeaders, "Content-Type": "application/json" } })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((data) => setProjects(data.projects || []))
        .catch(() => setProjects([]));

      // Fetch award stats from DB
      fetch("/api/awards/stats", { headers: { ...tenantHeaders, "Content-Type": "application/json" } })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((data) => setAwardStats(data))
        .catch(() => setAwardStats(null));

      // Fetch reporting stats from DB
      fetch("/api/reports?stats=true", { headers: { ...tenantHeaders, "Content-Type": "application/json" } })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((data) => setReportingStats(data))
        .catch(() => setReportingStats(null));

      // Fetch awards list for mini-table
      fetch("/api/awards", { headers: { ...tenantHeaders, "Content-Type": "application/json" } })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((data) => setDbAwards((data.awards || []).slice(0, 5)))
        .catch(() => setDbAwards([]));

      // Fetch upcoming reports for mini-table
      fetch("/api/reports?upcoming=true&days=90", { headers: { ...tenantHeaders, "Content-Type": "application/json" } })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((data) => setUpcomingReports((data.reports || []).slice(0, 10)))
        .catch(() => setUpcomingReports([]));

      // Fetch my tasks
      fetch("/api/tasks?myTasks=true", { headers: { ...tenantHeaders, "Content-Type": "application/json" } })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((data) => setMyTasks((data.tasks || []).slice(0, 8)))
        .catch(() => setMyTasks([]));

      // Load news
      fetch("/api/newsroom", { headers: tenantHeaders })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((data) => setNews((data.articles ?? []).slice(0, 5)))
        .catch(() => setNews([]))
        .finally(() => setNewsLoading(false));
    };

    loadData();
  }, [tenant.isLoading, tenant.environment, tenant.portId, profileId, fetchPipelineFromDB, tenantHeaders]);

  // Calculate stage counts from the pipeline state
  const stageCounts = useMemo(() => ({
    eligible: pipeline.filter(g => g.stage === "eligible").length,
    drafting: pipeline.filter(g => g.stage === "drafting").length,
    applied: pipeline.filter(g => g.stage === "applied").length,
    underReview: pipeline.filter(g => g.stage === "under_review").length,
    awarded: pipeline.filter(g => g.stage === "awarded").length,
    reporting: pipeline.filter(g => g.stage === "reporting").length,
    closeout: pipeline.filter(g => g.stage === "closeout").length,
    rejected: pipeline.filter(g => g.stage === "rejected").length,
    total: pipeline.length,
  }), [pipeline]);

  // Unified deadlines: pipeline grant close dates + upcoming report due dates
  const deadlines = useMemo(() => {
    const items: { id: string; title: string; subtitle: string; date: string; type: "grant" | "report"; reportType?: string }[] = [];

    // Pipeline grant close dates (next 90 days)
    for (const g of pipeline) {
      const d = daysUntil(g.closeDate);
      if (d !== null && d >= 0 && d <= 90) {
        items.push({
          id: `grant-${g.id}`,
          title: g.title,
          subtitle: g.agency,
          date: g.closeDate,
          type: "grant",
        });
      }
    }

    // Upcoming report due dates
    for (const r of upcomingReports) {
      items.push({
        id: `report-${r.id}`,
        title: r.awardTitle,
        subtitle: r.program,
        date: r.dueDate,
        type: "report",
        reportType: r.type,
      });
    }

    // Sort by date, soonest first
    items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return items.slice(0, 8);
  }, [pipeline, upcomingReports]);

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
        {/* Row 1: Pipeline Funnel + My Tasks */}
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
            {pipelineLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : stageCounts.total === 0 ? (
              <EmptyHint
                text="No grants in pipeline yet."
                linkLabel="Discover Grants"
                href="/grants?tab=discover"
              />
            ) : (
              <div className="space-y-2">
                <FunnelRow label="Eligible" count={stageCounts.eligible} total={stageCounts.total} color="bg-blue-500" />
                <FunnelRow label="Drafting" count={stageCounts.drafting} total={stageCounts.total} color="bg-indigo-500" />
                <FunnelRow label="Applied" count={stageCounts.applied} total={stageCounts.total} color="bg-purple-500" />
                <FunnelRow label="Under Review" count={stageCounts.underReview} total={stageCounts.total} color="bg-amber-500" />
                <FunnelRow label="Awarded" count={stageCounts.awarded} total={stageCounts.total} color="bg-emerald-500" />
                <FunnelRow label="Reporting" count={stageCounts.reporting} total={stageCounts.total} color="bg-teal-500" />
                <FunnelRow label="Closeout" count={stageCounts.closeout} total={stageCounts.total} color="bg-slate-500" />
                <FunnelRow label="Rejected" count={stageCounts.rejected} total={stageCounts.total} color="bg-red-500" />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4" /> My Tasks
              </span>
              <Link
                href="/grants?tab=pipeline"
                className="text-xs text-[#3d8b8b] hover:underline flex items-center gap-1"
              >
                Pipeline <ArrowRight className="h-3 w-3" />
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {myTasks.length === 0 ? (
              <EmptyHint
                text="No tasks assigned to you."
                linkLabel="View Pipeline"
                href="/grants?tab=pipeline"
              />
            ) : (
              <div className="space-y-2">
                {myTasks.map((t) => {
                  const isOverdue = t.dueDate && t.status !== "done" && t.status !== "submitted" && new Date(t.dueDate) < new Date();
                  return (
                    <div key={t.id} className="flex items-center gap-2.5 text-sm">
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        t.priority === "urgent" ? "bg-red-500" :
                        t.priority === "high" ? "bg-orange-500" :
                        t.priority === "medium" ? "bg-yellow-500" : "bg-slate-400"
                      }`} />
                      <div className="min-w-0 flex-1">
                        <p className={`font-medium truncate ${t.status === "done" ? "line-through text-muted-foreground" : ""}`}>
                          {t.title}
                        </p>
                        {t.phase && (
                          <span className="text-[10px] text-muted-foreground capitalize">{t.phase.replace(/_/g, " ")}</span>
                        )}
                      </div>
                      <Badge className={`text-[10px] px-1.5 py-0 shrink-0 ${
                        t.status === "done" ? "bg-emerald-100 text-emerald-700" :
                        t.status === "in_progress" ? "bg-blue-100 text-blue-700" :
                        t.status === "blocked" ? "bg-red-100 text-red-700" :
                        "bg-slate-100 text-slate-700"
                      }`}>
                        {t.status === "not_started" ? "To Do" :
                         t.status === "in_progress" ? "Active" :
                         t.status.replace(/_/g, " ")}
                      </Badge>
                      {t.dueDate && (
                        <span className={`text-[11px] shrink-0 tabular-nums ${isOverdue ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                          {isOverdue && "! "}
                          {new Date(t.dueDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Row 2: Upcoming Deadlines + Latest News */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4" /> Upcoming Deadlines
              </span>
              <Link
                href="/calendar"
                className="text-xs text-[#3d8b8b] hover:underline flex items-center gap-1"
              >
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {deadlines.length === 0 ? (
              <EmptyHint
                text="No upcoming deadlines in the next 90 days."
                linkLabel="Discover Grants"
                href="/grants?tab=discover"
              />
            ) : (
              <div className="space-y-3">
                {deadlines.map((dl) => {
                  const days = daysUntil(dl.date);
                  const typeLabel: Record<string, string> = { sf425: "SF-425", sf270: "SF-270", progress: "PPR", closeout: "Closeout" };
                  return (
                    <div
                      key={dl.id}
                      className="flex items-start justify-between gap-3 text-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <Badge
                            className={`text-[10px] shrink-0 ${
                              dl.type === "grant"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                            }`}
                          >
                            {dl.type === "grant" ? "Grant" : typeLabel[dl.reportType || ""] || "Report"}
                          </Badge>
                          <p className="font-medium truncate">{dl.title}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{dl.subtitle}</p>
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

        {/* Row 3: Awards + Projects */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Award className="h-4 w-4" /> Awards
              </span>
              <Link
                href="/awards"
                className="text-xs text-[#3d8b8b] hover:underline flex items-center gap-1"
              >
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dbAwards.length === 0 ? (
              <EmptyHint
                text="No awards tracked yet."
                linkLabel="Manage Awards"
                href="/awards"
              />
            ) : (
              <div className="space-y-2">
                {dbAwards.map((a) => {
                  const totalSpent = a.budgetCategories?.reduce((s, c) => s + (c.spent || 0), 0) ?? 0;
                  const burnPct = a.totalAmount > 0 ? Math.round((totalSpent / a.totalAmount) * 100) : 0;
                  const flagged = (a.budgetCategories || []).filter(c => c.ceiling > 0 && (c.spent / c.ceiling) >= 0.8);
                  return (
                    <div key={a.id} className="flex items-center justify-between gap-3 text-sm">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[10px] shrink-0">{a.program}</Badge>
                          <p className="font-medium truncate">{a.title}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${burnPct >= 90 ? "bg-red-500" : burnPct >= 70 ? "bg-amber-500" : "bg-[#3d8b8b]"}`}
                              style={{ width: `${Math.min(burnPct, 100)}%` }}
                            />
                          </div>
                          <span className="text-[10px] tabular-nums text-muted-foreground shrink-0">{burnPct}%</span>
                          {flagged.length > 0 && <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />}
                        </div>
                      </div>
                      <span className="text-xs font-bold tabular-nums text-[#3d8b8b] shrink-0">
                        {fmt(a.totalAmount)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

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

