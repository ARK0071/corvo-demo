"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  FileText,
  Award,
  Calendar,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowLeft,
  BarChart3,
  DollarSign,
  Target,
  Loader2,
  Send,
  Sparkles,
  ListChecks,
  CircleDot,
  ClipboardCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  getAllReports,
  getUpcomingReports,
  getOverdueReports,
  getReportingAlerts,
  getReportingStats,
  getReportsForAward,
  updateReportStatus,
  generateReportContent,
  generateSEFA,
  getCloseoutChecklist,
  updateCloseoutItem,
  type ScheduledReport,
  type ReportContent,
} from "@/data/reporting";
import { getAllAwards, getAwardById } from "@/data/awards";

// ─── Helpers ───

function fmt(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
}

function fmtFull(n: number): string {
  return `$${n.toLocaleString()}`;
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return d;
  }
}

function fmtShortDate(d: string): string {
  try {
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return d;
  }
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function reportTypeLabel(type: string): string {
  const map: Record<string, string> = {
    sf425: "SF-425",
    progress: "Progress Report",
    sefa: "SEFA",
    single_audit: "Single Audit",
    closeout: "Closeout",
    custom: "Custom",
  };
  return map[type] || type;
}

function statusColor(status: string): string {
  const map: Record<string, string> = {
    upcoming: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    draft_ready: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    submitted: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    overdue: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    on_track: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    at_risk: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    shortfall: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
  return map[status] || "bg-gray-100 text-gray-600";
}

// Month names for timeline
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ─── Page ───

export default function ReportingPage() {
  const [activeTab, setActiveTab] = useState("timeline");
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [showSEFA, setShowSEFA] = useState(false);
  const [showCloseout, setShowCloseout] = useState<string | null>(null);
  const [, setRefresh] = useState(0);
  const forceRefresh = useCallback(() => setRefresh((n) => n + 1), []);

  const stats = useMemo(() => getReportingStats(), []);
  const alerts = useMemo(() => getReportingAlerts(), []);
  const upcomingReports = useMemo(() => getUpcomingReports(90), []);
  const overdueReports = useMemo(() => getOverdueReports(), []);
  const allReports = useMemo(() => getAllReports(), []);
  const awards = useMemo(() => getAllAwards(), []);

  // Build 6-month timeline data
  const timelineData = useMemo(() => {
    const now = new Date();
    const months: { year: number; month: number; label: string; reports: ScheduledReport[] }[] = [];

    for (let i = -1; i < 5; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const label = `${MONTH_NAMES[month]} ${year}`;

      const monthReports = allReports.filter((r) => {
        const due = new Date(r.dueDate);
        return due.getMonth() === month && due.getFullYear() === year && r.status !== "submitted";
      }).sort((a, b) => a.dueDate.localeCompare(b.dueDate));

      months.push({ year, month, label, reports: monthReports });
    }
    return months;
  }, [allReports]);

  // Next deadline for hero
  const nextDeadline = useMemo(() => {
    if (overdueReports.length > 0) return overdueReports[0];
    if (upcomingReports.length > 0) return upcomingReports[0];
    return null;
  }, [overdueReports, upcomingReports]);

  if (selectedReportId) {
    return (
      <ReportDetailView
        reportId={selectedReportId}
        onBack={() => setSelectedReportId(null)}
        onRefresh={forceRefresh}
      />
    );
  }

  if (showSEFA) {
    return <SEFAView onBack={() => setShowSEFA(false)} />;
  }

  if (showCloseout) {
    return (
      <CloseoutView
        awardId={showCloseout}
        onBack={() => setShowCloseout(null)}
        onRefresh={forceRefresh}
      />
    );
  }

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      {/* ── Hero: Deadline Countdown ── */}
      <div className="rounded-xl border bg-gradient-to-br from-slate-50 to-white dark:from-slate-900/50 dark:to-slate-950 p-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-5 w-5 text-[#3d8b8b]" />
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Compliance Reporting</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Report Deadlines</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {stats.overdue > 0
                ? `${stats.overdue} overdue report${stats.overdue > 1 ? "s" : ""} requiring immediate attention`
                : stats.dueNext30Days > 0
                ? `${stats.dueNext30Days} report${stats.dueNext30Days > 1 ? "s" : ""} due in the next 30 days`
                : "All reports are current"}
            </p>
          </div>

          {/* Next deadline countdown */}
          {nextDeadline && (
            <div className="text-right shrink-0">
              {(() => {
                const days = daysUntil(nextDeadline.dueDate);
                const isOverdue = days < 0;
                return (
                  <div className={`rounded-lg border px-4 py-3 ${isOverdue ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30" : days <= 7 ? "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30" : "border-[#3d8b8b]/20 bg-[#3d8b8b]/5"}`}>
                    <p className={`text-2xl font-bold tabular-nums ${isOverdue ? "text-red-600 dark:text-red-400" : days <= 7 ? "text-amber-600 dark:text-amber-400" : "text-[#3d8b8b]"}`}>
                      {isOverdue ? `${Math.abs(days)}d` : `${days}d`}
                    </p>
                    <p className={`text-[10px] uppercase tracking-wider font-medium ${isOverdue ? "text-red-500" : "text-muted-foreground"}`}>
                      {isOverdue ? "Overdue" : "Until Next"}
                    </p>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Inline summary stats */}
        <div className="flex items-center gap-6 mt-4 pt-4 border-t border-border/50">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-red-500" />
            <span className="text-xs text-muted-foreground">{stats.overdue} Overdue</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-amber-500" />
            <span className="text-xs text-muted-foreground">{stats.dueNext30Days} Due Soon</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-blue-500" />
            <span className="text-xs text-muted-foreground">{stats.upcoming} Upcoming</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-xs text-muted-foreground">{stats.submitted} Submitted</span>
          </div>
        </div>
      </div>

      {/* ── Overdue Alerts Banner ── */}
      {overdueReports.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span className="text-sm font-semibold text-red-700 dark:text-red-400">
              {overdueReports.length} Overdue Report{overdueReports.length > 1 ? "s" : ""}
            </span>
          </div>
          <div className="space-y-2">
            {overdueReports.slice(0, 4).map((report) => {
              const days = Math.abs(daysUntil(report.dueDate));
              return (
                <button
                  key={report.id}
                  onClick={() => setSelectedReportId(report.id)}
                  className="w-full flex items-center justify-between gap-3 p-2.5 rounded-md bg-white/60 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 transition-colors text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-red-600 dark:text-red-400 tabular-nums">{days}d</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{reportTypeLabel(report.type)}</p>
                      <p className="text-xs text-muted-foreground truncate">{report.program} &mdash; {report.awardTitle}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">Due {fmtShortDate(report.dueDate)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="by_award">By Award</TabsTrigger>
          <TabsTrigger value="tools">Tools</TabsTrigger>
        </TabsList>

        {/* ── Timeline Tab ── */}
        <TabsContent value="timeline">
          <div className="mt-4 space-y-1">
            {timelineData.map((month) => {
              const isCurrent = month.month === currentMonth && month.year === currentYear;
              const hasReports = month.reports.length > 0;

              return (
                <div key={month.label} className="relative">
                  {/* Month row */}
                  <div className={`flex items-stretch gap-0 ${isCurrent ? "" : ""}`}>
                    {/* Month label column */}
                    <div className={`w-28 shrink-0 flex items-start pt-3 pb-3 pr-4 ${isCurrent ? "font-semibold" : ""}`}>
                      <div className="flex items-center gap-2">
                        {isCurrent && <div className="h-2 w-2 rounded-full bg-[#3d8b8b] animate-pulse" />}
                        <span className={`text-sm ${isCurrent ? "text-[#3d8b8b]" : "text-muted-foreground"}`}>{month.label}</span>
                      </div>
                    </div>

                    {/* Timeline line + dots */}
                    <div className="relative flex flex-col items-center w-6 shrink-0">
                      <div className={`w-px flex-1 ${isCurrent ? "bg-[#3d8b8b]" : "bg-border"}`} />
                      {hasReports && (
                        <div className={`absolute top-3 h-3 w-3 rounded-full border-2 ${isCurrent ? "border-[#3d8b8b] bg-[#3d8b8b]" : "border-border bg-background"}`} />
                      )}
                    </div>

                    {/* Report cards */}
                    <div className={`flex-1 pl-4 py-2 ${!hasReports ? "min-h-[40px]" : ""}`}>
                      {hasReports ? (
                        <div className="space-y-2">
                          {month.reports.map((report) => {
                            const days = daysUntil(report.dueDate);
                            const isOverdue = days < 0;
                            const isUrgent = days >= 0 && days <= 7;

                            return (
                              <button
                                key={report.id}
                                onClick={() => setSelectedReportId(report.id)}
                                className={`w-full text-left rounded-lg border p-3 transition-all hover:shadow-md ${
                                  isOverdue
                                    ? "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20"
                                    : isUrgent
                                    ? "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20"
                                    : "border-border hover:border-[#3d8b8b]/30"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <Badge className={`text-[10px] shrink-0 ${statusColor(isOverdue ? "overdue" : report.status)}`}>
                                      {isOverdue ? "overdue" : report.status.replace("_", " ")}
                                    </Badge>
                                    <span className="text-sm font-medium truncate">{reportTypeLabel(report.type)}</span>
                                    <span className="text-xs text-muted-foreground truncate hidden sm:inline">{report.program}</span>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-xs text-muted-foreground hidden md:inline">
                                      {fmtShortDate(report.periodStart)} - {fmtShortDate(report.periodEnd)}
                                    </span>
                                    <Badge
                                      variant="outline"
                                      className={`tabular-nums text-[10px] ${
                                        isOverdue
                                          ? "border-red-500/50 text-red-600 dark:text-red-400"
                                          : isUrgent
                                          ? "border-amber-500/50 text-amber-600 dark:text-amber-400"
                                          : ""
                                      }`}
                                    >
                                      {isOverdue ? `${Math.abs(days)}d overdue` : `${days}d`}
                                    </Badge>
                                  </div>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1 truncate">{report.awardTitle}</p>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground pt-2 italic">No reports due</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Timeline end cap */}
            <div className="flex items-stretch gap-0">
              <div className="w-28 shrink-0" />
              <div className="relative flex flex-col items-center w-6 shrink-0">
                <div className="w-px h-4 bg-border" />
                <div className="h-1.5 w-1.5 rounded-full bg-border" />
              </div>
              <div className="flex-1 pl-4 py-2">
                <p className="text-xs text-muted-foreground italic">
                  {allReports.filter(r => r.status !== "submitted").length - timelineData.reduce((s, m) => s + m.reports.length, 0)} more reports beyond this window
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── By Award Tab ── */}
        <TabsContent value="by_award">
          <div className="mt-4 space-y-4">
            {awards.map((award) => {
              const awardReports = getReportsForAward(award.id);
              const upcoming = awardReports.filter((r) => r.status !== "submitted");
              const submitted = awardReports.filter((r) => r.status === "submitted");
              const nextReport = upcoming.sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];

              return (
                <Card key={award.id}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <Badge variant="outline" className="text-[10px] shrink-0">{award.program}</Badge>
                          <span className="text-sm font-medium truncate">{award.title}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {upcoming.length} pending &middot; {submitted.length} submitted
                        </p>
                      </div>
                      {nextReport && (
                        <div className="text-right shrink-0">
                          <p className="text-xs text-muted-foreground">Next due</p>
                          <p className="text-sm font-medium tabular-nums">{fmtShortDate(nextReport.dueDate)}</p>
                        </div>
                      )}
                    </div>

                    {upcoming.length === 0 ? (
                      <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>All reports up to date</span>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {upcoming.slice(0, 4).map((r) => {
                          const days = daysUntil(r.dueDate);
                          const isOverdue = days < 0;
                          return (
                            <button
                              key={r.id}
                              onClick={() => setSelectedReportId(r.id)}
                              className="w-full flex items-center justify-between text-sm p-2 rounded hover:bg-muted/50 text-left"
                            >
                              <div className="flex items-center gap-2">
                                <Badge className={`text-[10px] ${statusColor(isOverdue ? "overdue" : r.status)}`}>
                                  {isOverdue ? "overdue" : r.status.replace("_", " ")}
                                </Badge>
                                <span>{reportTypeLabel(r.type)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground tabular-nums">{fmtDate(r.dueDate)}</span>
                                {isOverdue && (
                                  <Badge variant="outline" className="text-[10px] border-red-500/50 text-red-600 dark:text-red-400 tabular-nums">
                                    {Math.abs(days)}d late
                                  </Badge>
                                )}
                              </div>
                            </button>
                          );
                        })}
                        {upcoming.length > 4 && (
                          <p className="text-xs text-muted-foreground text-center pt-1">+ {upcoming.length - 4} more</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ── Tools Tab ── */}
        <TabsContent value="tools">
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setShowSEFA(true)}>
              <CardContent className="pt-6 pb-6 text-center">
                <BarChart3 className="h-8 w-8 mx-auto text-[#3d8b8b] mb-2" />
                <h3 className="font-semibold">Generate SEFA</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Schedule of Expenditures of Federal Awards for audit purposes.
                </p>
              </CardContent>
            </Card>

            {awards.filter((a) => a.status === "closeout_pending").map((award) => (
              <Card
                key={award.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setShowCloseout(award.id)}
              >
                <CardContent className="pt-6 pb-6 text-center">
                  <ClipboardCheck className="h-8 w-8 mx-auto text-amber-500 mb-2" />
                  <h3 className="font-semibold">Closeout: {award.program}</h3>
                  <p className="text-sm text-muted-foreground mt-1 truncate">
                    {award.title}
                  </p>
                </CardContent>
              </Card>
            ))}

            <Card className="opacity-60">
              <CardContent className="pt-6 pb-6 text-center">
                <Sparkles className="h-8 w-8 mx-auto text-purple-400 mb-2" />
                <h3 className="font-semibold">AI Compliance Review</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Claude reviews reports for consistency and compliance before submission.
                </p>
                <Badge variant="outline" className="mt-2 text-[10px]">Coming Soon</Badge>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// REPORT DETAIL VIEW
// ════════════════════════════════════════════════════════════

function ReportDetailView({ reportId, onBack, onRefresh }: { reportId: string; onBack: () => void; onRefresh: () => void }) {
  const [content, setContent] = useState<ReportContent | null>(null);
  const [generating, setGenerating] = useState(false);
  const [narrativeLoading, setNarrativeLoading] = useState(false);
  const [narrative, setNarrative] = useState<string | null>(null);
  const [, setRefresh] = useState(0);

  const allReports = useMemo(() => getAllReports(), []);
  const report = useMemo(() => allReports.find((r) => r.id === reportId), [allReports, reportId]);
  const award = useMemo(() => report ? getAwardById(report.awardId) : undefined, [report]);

  // Auto-populate report data on mount
  useEffect(() => {
    if (report && !content) {
      const c = generateReportContent(reportId);
      setContent(c);
    }
  }, [reportId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGenerateReport = useCallback(() => {
    if (!report) return;
    setGenerating(true);
    setTimeout(() => {
      const c = generateReportContent(reportId);
      setContent(c);
      setGenerating(false);
    }, 500);
  }, [report, reportId]);

  const handleGenerateNarrative = useCallback(async () => {
    if (!report || !award) return;
    setNarrativeLoading(true);

    try {
      const res = await fetch("/api/report-narrative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          awardTitle: award.title,
          program: award.program,
          periodStart: report.periodStart,
          periodEnd: report.periodEnd,
          description: award.description,
          financialSummary: content?.financialSummary,
          matchSummary: content?.matchSummary,
          completionPercentage: content?.completionPercentage,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setNarrative(data.narrative);
      } else {
        setNarrative("Unable to generate narrative. Ensure ANTHROPIC_API_KEY is configured.");
      }
    } catch {
      setNarrative("Unable to generate narrative. Ensure ANTHROPIC_API_KEY is configured.");
    } finally {
      setNarrativeLoading(false);
    }
  }, [report, award, content]);

  const handleMarkSubmitted = useCallback(() => {
    if (!report) return;
    updateReportStatus(reportId, "submitted");
    setRefresh((n) => n + 1);
    onRefresh();
  }, [reportId, report, onRefresh]);

  if (!report) return <p className="p-6 text-muted-foreground">Report not found.</p>;

  const days = daysUntil(report.dueDate);
  const isOverdue = days < 0;

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      {/* Back + Header */}
      <div>
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3">
          <ArrowLeft className="h-4 w-4" /> Back to Reporting
        </button>

        {/* Report header card */}
        <div className={`rounded-xl border p-5 ${isOverdue ? "border-red-200 bg-red-50/30 dark:border-red-800 dark:bg-red-950/10" : "bg-muted/20"}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Badge className={statusColor(isOverdue ? "overdue" : report.status)}>
                  {isOverdue ? "overdue" : report.status.replace("_", " ")}
                </Badge>
                <Badge variant="outline">{report.program}</Badge>
                <Badge variant="outline" className="text-[10px]">{reportTypeLabel(report.type)}</Badge>
              </div>
              <h1 className="text-xl font-bold tracking-tight">{report.title}</h1>
              <Link href="/awards" className="text-sm text-muted-foreground mt-1 hover:text-[#3d8b8b] hover:underline inline-flex items-center gap-1">
                <Award className="h-3 w-3" />
                {report.awardTitle}
              </Link>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>Period: {fmtDate(report.periodStart)} - {fmtDate(report.periodEnd)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>Due: {fmtDate(report.dueDate)}</span>
                </div>
              </div>
            </div>
            <div className={`rounded-lg border px-4 py-3 text-center shrink-0 ${isOverdue ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30" : days <= 7 ? "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30" : "border-[#3d8b8b]/20 bg-[#3d8b8b]/5"}`}>
              <p className={`text-2xl font-bold tabular-nums ${isOverdue ? "text-red-600 dark:text-red-400" : days <= 7 ? "text-amber-600 dark:text-amber-400" : "text-[#3d8b8b]"}`}>
                {isOverdue ? `${Math.abs(days)}d` : `${days}d`}
              </p>
              <p className={`text-[10px] uppercase tracking-wider font-medium ${isOverdue ? "text-red-500" : "text-muted-foreground"}`}>
                {isOverdue ? "Overdue" : "Remaining"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button onClick={handleGenerateReport} disabled={generating}>
          {generating ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <BarChart3 className="h-3.5 w-3.5 mr-1" />}
          Refresh Data
        </Button>
        {content && (
          <Button variant="outline" onClick={handleGenerateNarrative} disabled={narrativeLoading}>
            {narrativeLoading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
            AI Draft Narrative
          </Button>
        )}
        {report.status !== "submitted" && (
          <Button variant="outline" onClick={handleMarkSubmitted}>
            <Send className="h-3.5 w-3.5 mr-1" /> Mark Submitted
          </Button>
        )}
      </div>

      {/* Generated Content */}
      {content && (
        <div className="space-y-4">
          {/* Financial Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4" /> Financial Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-4">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Awarded</p>
                  <p className="text-lg font-bold tabular-nums">{fmt(content.financialSummary.totalAwarded)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">This Period</p>
                  <p className="text-lg font-bold tabular-nums">{fmt(content.financialSummary.totalExpendedThisPeriod)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Cumulative</p>
                  <p className="text-lg font-bold tabular-nums">{fmt(content.financialSummary.totalExpendedCumulative)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Drawn Down</p>
                  <p className="text-lg font-bold tabular-nums text-emerald-600">{fmt(content.financialSummary.totalDrawnDown)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Remaining</p>
                  <p className="text-lg font-bold tabular-nums">{fmt(content.financialSummary.remainingBalance)}</p>
                </div>
              </div>

              {/* By Category */}
              <h4 className="text-sm font-medium mb-2">Budget vs. Actual by Category</h4>
              <div className="space-y-3">
                {content.financialSummary.byCategory.map((cat) => {
                  const pct = cat.budgeted > 0 ? Math.round((cat.spent / cat.budgeted) * 100) : 0;
                  return (
                    <div key={cat.name}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span>{cat.name}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {fmtFull(cat.spent)} / {fmtFull(cat.budgeted)} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-[#3d8b8b]"}`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Match Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4" /> Match Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground uppercase">Required</p>
                  <p className="text-lg font-bold tabular-nums">{fmtFull(Math.round(content.matchSummary.required))}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground uppercase">Committed</p>
                  <p className={`text-lg font-bold tabular-nums ${content.matchSummary.status === "on_track" ? "text-emerald-600" : content.matchSummary.status === "at_risk" ? "text-amber-600" : "text-red-600"}`}>
                    {fmtFull(content.matchSummary.committed)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground uppercase">Status</p>
                  <Badge className={`mt-1 ${statusColor(content.matchSummary.status)}`}>
                    {content.matchSummary.status === "on_track" ? "On Track" : content.matchSummary.status === "at_risk" ? "At Risk" : "Shortfall"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Completion */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Overall Completion</span>
                <span className="text-sm font-bold tabular-nums">{content.completionPercentage}%</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-[#3d8b8b] rounded-full transition-all" style={{ width: `${content.completionPercentage}%` }} />
              </div>
            </CardContent>
          </Card>

          {/* AI Narrative */}
          {narrative && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-500" /> AI-Generated Progress Narrative
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <div className="whitespace-pre-wrap text-sm">{narrative}</div>
                </div>
                <p className="text-xs text-muted-foreground mt-3 pt-3 border-t">
                  This narrative was generated by Claude and should be reviewed and edited before submission.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Loading state */}
      {!content && (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 mx-auto text-muted-foreground/50 mb-3 animate-spin" />
            <p className="text-sm text-muted-foreground">Loading report data...</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// SEFA VIEW
// ════════════════════════════════════════════════════════════

function SEFAView({ onBack }: { onBack: () => void }) {
  const [fyEnd, setFyEnd] = useState("2025-09-30");
  const sefa = useMemo(() => generateSEFA(fyEnd), [fyEnd]);

  const fyYear = new Date(fyEnd).getFullYear();

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <div>
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3">
          <ArrowLeft className="h-4 w-4" /> Back to Reporting
        </button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-[#3d8b8b]" />
              Schedule of Expenditures of Federal Awards (SEFA)
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Fiscal Year Ending {fmtDate(fyEnd)}
            </p>
          </div>
          <div className="shrink-0">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1">Fiscal Year End</label>
            <select
              value={fyEnd}
              onChange={(e) => setFyEnd(e.target.value)}
              className="rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="2023-09-30">FY 2023 (Sep 30, 2023)</option>
              <option value="2024-09-30">FY 2024 (Sep 30, 2024)</option>
              <option value="2025-09-30">FY 2025 (Sep 30, 2025)</option>
              <option value="2026-09-30">FY 2026 (Sep 30, 2026)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Threshold Alert */}
      <Card className={sefa.meetsAuditThreshold ? "border-amber-200 dark:border-amber-800" : ""}>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3">
            {sefa.meetsAuditThreshold ? (
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            )}
            <div>
              <p className="font-medium text-sm">
                Total Federal Expenditures: <span className="tabular-nums">{fmtFull(sefa.totalExpenditures)}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {sefa.meetsAuditThreshold
                  ? "Exceeds $750,000 threshold. Single Audit (2 CFR 200 Subpart F) is required."
                  : "Below $750,000 threshold. Single Audit is not required."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SEFA Table */}
      <Card>
        <CardContent className="pt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground uppercase">CFDA/ALN</th>
                  <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground uppercase">Program</th>
                  <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground uppercase">Agency</th>
                  <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground uppercase">FAIN</th>
                  <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground uppercase">Pass-Through</th>
                  <th className="text-right py-2 text-xs font-medium text-muted-foreground uppercase">Expenditures</th>
                </tr>
              </thead>
              <tbody>
                {sefa.entries.map((entry) => (
                  <tr key={entry.awardId} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="py-2 pr-4 tabular-nums">{entry.cfdaNumber}</td>
                    <td className="py-2 pr-4">{entry.programName}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{entry.awardingAgency}</td>
                    <td className="py-2 pr-4 tabular-nums">{entry.fain}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{entry.passThrough || "Direct"}</td>
                    <td className="py-2 text-right font-medium tabular-nums">{fmtFull(entry.totalExpenditures)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 font-bold">
                  <td colSpan={5} className="py-2 pr-4">Total Federal Expenditures</td>
                  <td className="py-2 text-right tabular-nums">{fmtFull(sefa.totalExpenditures)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// CLOSEOUT VIEW
// ════════════════════════════════════════════════════════════

function CloseoutView({ awardId, onBack, onRefresh }: { awardId: string; onBack: () => void; onRefresh: () => void }) {
  const [, setRefresh] = useState(0);
  const award = useMemo(() => getAwardById(awardId), [awardId]);
  const checklist = useMemo(() => getCloseoutChecklist(awardId), [awardId]);

  const totalRequired = checklist.items.filter((i) => i.required).length;
  const completedRequired = checklist.items.filter((i) => i.required && i.completed).length;

  if (!award) return <p className="p-6 text-muted-foreground">Award not found.</p>;

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <div>
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3">
          <ArrowLeft className="h-4 w-4" /> Back to Reporting
        </button>
        <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-amber-500" />
          Closeout: {award.program}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{award.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Performance period ended {fmtDate(award.performancePeriod.end)} &middot; Closeout due within 120 days
        </p>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Closeout Progress</span>
            <span className="text-sm font-bold tabular-nums">
              {completedRequired}/{totalRequired} required items
            </span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-[#3d8b8b] rounded-full transition-all"
              style={{ width: `${totalRequired > 0 ? (completedRequired / totalRequired) * 100 : 0}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Checklist */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ListChecks className="h-4 w-4" /> Closeout Checklist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {checklist.items.map((item) => (
              <label
                key={item.id}
                className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  item.completed ? "bg-emerald-50 dark:bg-emerald-950/20" : "hover:bg-muted/50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={item.completed}
                  onChange={(e) => {
                    updateCloseoutItem(awardId, item.id, e.target.checked);
                    setRefresh((n) => n + 1);
                    onRefresh();
                  }}
                  className="rounded mt-0.5"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${item.completed ? "line-through text-muted-foreground" : ""}`}>
                      {item.label}
                    </span>
                    {item.required && <Badge variant="outline" className="text-[9px]">Required</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                  {item.completedDate && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                      Completed {fmtDate(item.completedDate)}
                    </p>
                  )}
                </div>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
