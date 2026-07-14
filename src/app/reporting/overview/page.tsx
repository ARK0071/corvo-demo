"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  FileText,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  ArrowRight,
  Loader2,
  RefreshCw,
  Banknote,
  ShieldCheck,
  CalendarDays,
  Download,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTenantHeaders, useTenant } from "@/contexts/tenant-context";

// ─── Types ───

interface Report {
  id: string;
  awardId: string;
  awardTitle: string;
  program: string;
  type: string;
  title: string;
  dueDate: string;
  periodStart: string;
  periodEnd: string;
  status: string;
}

interface AwardStats {
  totalAwarded: number;
  totalSpent: number;
  totalDrawn: number;
  totalRemaining: number;
  activeCount: number;
  closeoutCount: number;
  totalAwards: number;
}

interface ReportStats {
  totalReports: number;
  upcoming: number;
  overdue: number;
  submitted: number;
  dueNext30Days: number;
}

interface Award {
  id: string;
  program: string;
  title: string;
  totalAmount: number;
  status: string;
  performancePeriod: { start: string; end: string };
}

// ─── Helpers ───

function fmt(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
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
  const map: Record<string, string> = { sf425: "SF-425", sf270: "SF-270", progress: "Progress Report", ppr: "SF-PPR", sefa: "SEFA", closeout: "Closeout" };
  return map[type] || type;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Data Hook ───

function useReportingData() {
  const headers = useTenantHeaders();
  const tenant = useTenant();

  const [allReports, setAllReports] = useState<Report[]>([]);
  const [overdueReports, setOverdueReports] = useState<Report[]>([]);
  const [upcomingReports, setUpcomingReports] = useState<Report[]>([]);
  const [reportStats, setReportStats] = useState<ReportStats | null>(null);
  const [awardStats, setAwardStats] = useState<AwardStats | null>(null);
  const [awards, setAwards] = useState<Award[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (tenant.isLoading) return;
    setLoading(true);
    setError(null);

    const h = { ...headers, "Content-Type": "application/json" };

    async function safeFetch<T>(url: string, fallback: T): Promise<T> {
      try {
        const res = await fetch(url, { headers: h });
        if (!res.ok) return fallback;
        return await res.json();
      } catch {
        return fallback;
      }
    }

    try {
      const [allData, overdueData, upcomingData, statsData, awardStatsData, awardsData] = await Promise.all([
        safeFetch<{ reports?: Report[] }>("/api/reports", {}),
        safeFetch<{ reports?: Report[] }>("/api/reports?overdue=true", {}),
        safeFetch<{ reports?: Report[] }>("/api/reports?upcoming=true&days=30", {}),
        safeFetch<ReportStats | null>("/api/reports?stats=true", null),
        safeFetch<AwardStats | null>("/api/awards/stats", null),
        safeFetch<{ awards?: Award[] } | Award[]>("/api/awards", []),
      ]);

      setAllReports(allData.reports || []);
      setOverdueReports(overdueData.reports || []);
      setUpcomingReports(upcomingData.reports || []);
      setReportStats(statsData);
      setAwardStats(awardStatsData);

      if (Array.isArray(awardsData)) {
        setAwards(awardsData);
      } else {
        setAwards((awardsData as { awards?: Award[] }).awards || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [headers, tenant.isLoading]);

  useEffect(() => {
    fetchAll();
  }, [tenant.isLoading, tenant.portId]);

  return { allReports, overdueReports, upcomingReports, reportStats, awardStats, awards, loading, error, refresh: fetchAll };
}

// ─── Page ───

export default function ReportingOverviewPage() {
  const { allReports, overdueReports, upcomingReports, reportStats, awardStats, awards, loading, error, refresh } = useReportingData();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-6">
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-8 w-8 mx-auto text-red-500 mb-3" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={refresh}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const drawdownRate = awardStats && awardStats.totalAwarded > 0
    ? Math.round((awardStats.totalDrawn / awardStats.totalAwarded) * 100)
    : 0;

  const spendRate = awardStats && awardStats.totalAwarded > 0
    ? Math.round((awardStats.totalSpent / awardStats.totalAwarded) * 100)
    : 0;

  const overdueCount = overdueReports.length;
  const complianceHealth = overdueCount === 0 ? "green" : overdueCount <= 2 ? "yellow" : "red";
  const complianceLabel = complianceHealth === "green" ? "On Track" : complianceHealth === "yellow" ? "Needs Attention" : "At Risk";

  // Build 6-month timeline from all reports
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const timelineMonths = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i - 1, 1);
    const year = d.getFullYear();
    const month = d.getMonth();
    const reports = allReports
      .filter((r) => {
        const due = new Date(r.dueDate);
        return due.getMonth() === month && due.getFullYear() === year && r.status !== "submitted";
      })
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    return { year, month, label: `${MONTH_NAMES[month]} ${year}`, reports };
  });

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-5 w-5 text-[#3d8b8b]" />
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Compliance Reporting</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Compliance Hub</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {awardStats?.activeCount || 0} active awards &middot; {fmt(awardStats?.totalAwarded || 0)} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              downloadCsv(
                "reports.csv",
                ["Award", "Program", "Report Type", "Due Date", "Period Start", "Period End", "Status"],
                allReports.map((r) => [r.awardTitle, r.program, reportTypeLabel(r.type), r.dueDate, r.periodStart, r.periodEnd, r.status])
              );
            }}
            disabled={allReports.length === 0}
          >
            <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <Card className="cursor-help">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck className={`h-4 w-4 ${complianceHealth === "green" ? "text-emerald-500" : complianceHealth === "yellow" ? "text-amber-500" : "text-red-500"}`} />
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Compliance</span>
                </div>
                <p className={`text-xl font-bold ${complianceHealth === "green" ? "text-emerald-600" : complianceHealth === "yellow" ? "text-amber-600" : "text-red-600"}`}>
                  {complianceLabel}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {overdueCount === 0 ? "No overdue reports" : `${overdueCount} overdue`}
                </p>
              </CardContent>
            </Card>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <p className="text-xs">
              {complianceHealth === "green" ? "All reports are filed on time." : complianceHealth === "yellow" ? "1-2 reports are past due. Submit soon to stay compliant." : "3+ overdue reports. Risk of audit findings or funding suspension."}
            </p>
          </TooltipContent>
        </Tooltip>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-[#3d8b8b]" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Awarded</span>
            </div>
            <p className="text-xl font-bold">{fmt(awardStats?.totalAwarded || 0)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{awardStats?.totalAwards || 0} awards</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Banknote className="h-4 w-4 text-emerald-500" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Drawn Down</span>
            </div>
            <p className="text-xl font-bold text-emerald-600">{fmt(awardStats?.totalDrawn || 0)}</p>
            <div className="mt-1.5">
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${drawdownRate}%` }} />
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">{drawdownRate}% of awarded</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Spent</span>
            </div>
            <p className="text-xl font-bold">{fmt(awardStats?.totalSpent || 0)}</p>
            <div className="mt-1.5">
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${spendRate}%` }} />
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">{spendRate}% &middot; {fmt(awardStats?.totalRemaining || 0)} remaining</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overdue + Upcoming side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overdue */}
        <Card className={overdueReports.length > 0 ? "border-red-200 dark:border-red-800" : ""}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 cursor-help">
                    <AlertTriangle className={`h-4 w-4 ${overdueReports.length > 0 ? "text-red-500" : "text-muted-foreground"}`} />
                    Overdue
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="text-xs">Reports past their due date that have not been submitted. Overdue reports may trigger audit findings.</p>
                </TooltipContent>
              </Tooltip>
              {overdueReports.length > 0 && (
                <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">{overdueReports.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overdueReports.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 py-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>All clear</span>
              </div>
            ) : (
              <div className="space-y-2">
                {overdueReports.slice(0, 5).map((r) => (
                  <ReportRow key={r.id} report={r} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-[#3d8b8b]" />
                Due Next 30 Days
              </div>
              {upcomingReports.length > 0 && <Badge variant="outline">{upcomingReports.length}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingReports.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2 italic">Nothing due</p>
            ) : (
              <div className="space-y-2">
                {upcomingReports.slice(0, 5).map((r) => (
                  <ReportRow key={r.id} report={r} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Report Timeline — integrated */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Report Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {timelineMonths.map((month) => {
              const isCurrent = month.month === currentMonth && month.year === currentYear;
              const hasReports = month.reports.length > 0;

              return (
                <div key={month.label} className="flex items-stretch gap-0">
                  {/* Month label */}
                  <div className={`w-24 shrink-0 flex items-start pt-3 pb-3 pr-3 ${isCurrent ? "font-semibold" : ""}`}>
                    <div className="flex items-center gap-1.5">
                      {isCurrent && <div className="h-2 w-2 rounded-full bg-[#3d8b8b] animate-pulse" />}
                      <span className={`text-xs ${isCurrent ? "text-[#3d8b8b]" : "text-muted-foreground"}`}>{month.label}</span>
                    </div>
                  </div>

                  {/* Timeline line */}
                  <div className="relative flex flex-col items-center w-5 shrink-0">
                    <div className={`w-px flex-1 ${isCurrent ? "bg-[#3d8b8b]" : "bg-border"}`} />
                    {hasReports && (
                      <div className={`absolute top-3 h-2.5 w-2.5 rounded-full border-2 ${isCurrent ? "border-[#3d8b8b] bg-[#3d8b8b]" : "border-border bg-background"}`} />
                    )}
                  </div>

                  {/* Reports */}
                  <div className={`flex-1 pl-3 py-2 ${!hasReports ? "min-h-[36px]" : ""}`}>
                    {hasReports ? (
                      <div className="space-y-1.5">
                        {month.reports.map((r) => {
                          const days = daysUntil(r.dueDate);
                          const isOverdue = days < 0;
                          const isUrgent = days >= 0 && days <= 7;
                          return (
                            <Link
                              key={r.id}
                              href={`/reporting/forms?reportId=${encodeURIComponent(r.id)}`}
                              className={`flex items-center justify-between p-2 rounded-md text-xs transition-colors ${
                                isOverdue ? "bg-red-50/50 dark:bg-red-950/10 hover:bg-red-100/60 dark:hover:bg-red-950/20" : isUrgent ? "bg-amber-50/50 dark:bg-amber-950/10 hover:bg-amber-100/60 dark:hover:bg-amber-950/20" : "hover:bg-muted/50"
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <Badge className={`text-[9px] shrink-0 ${
                                  isOverdue ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                    : isUrgent ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                    : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                }`}>
                                  {isOverdue ? "overdue" : r.status.replace("_", " ")}
                                </Badge>
                                <span className="font-medium truncate">{reportTypeLabel(r.type)}</span>
                                <span className="text-muted-foreground truncate hidden sm:inline">{r.program}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-muted-foreground hidden md:inline">
                                  {fmtShortDate(r.periodStart)} - {fmtShortDate(r.periodEnd)}
                                </span>
                                <Badge variant="outline" className={`tabular-nums text-[9px] ${
                                  isOverdue ? "border-red-500/50 text-red-600 dark:text-red-400"
                                    : isUrgent ? "border-amber-500/50 text-amber-600 dark:text-amber-400" : ""
                                }`}>
                                  {isOverdue ? `${Math.abs(days)}d overdue` : `${days}d`}
                                </Badge>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[10px] text-muted-foreground pt-2 italic">No reports due</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Awards Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Awards
            </div>
            <Link href="/awards" className="text-xs text-muted-foreground hover:text-[#3d8b8b] flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {awards.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2 italic">No awards found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground uppercase">Program</th>
                    <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground uppercase">Award</th>
                    <th className="text-right py-2 pr-4 text-xs font-medium text-muted-foreground uppercase">Amount</th>
                    <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground uppercase">Status</th>
                    <th className="text-left py-2 text-xs font-medium text-muted-foreground uppercase">Period End</th>
                  </tr>
                </thead>
                <tbody>
                  {awards.slice(0, 8).map((a) => (
                    <tr key={a.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-2 pr-4"><Badge variant="outline" className="text-[10px]">{a.program}</Badge></td>
                      <td className="py-2 pr-4 truncate max-w-[200px]">{a.title}</td>
                      <td className="py-2 pr-4 text-right tabular-nums font-medium">{fmt(Number(a.totalAmount))}</td>
                      <td className="py-2 pr-4">
                        <Badge className={`text-[10px] ${
                          a.status === "active" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : a.status === "closeout_pending" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                            : "bg-gray-100 text-gray-600"
                        }`}>
                          {a.status === "closeout_pending" ? "closeout" : a.status}
                        </Badge>
                      </td>
                      <td className="py-2 text-muted-foreground text-xs tabular-nums">{fmtDate(a.performancePeriod?.end)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report Stats */}
      {reportStats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[
            { label: "Total Reports", value: reportStats.totalReports },
            { label: "Overdue", value: reportStats.overdue, color: reportStats.overdue > 0 ? "text-red-600" : "text-emerald-600" },
            { label: "Due 30d", value: reportStats.dueNext30Days, color: reportStats.dueNext30Days > 0 ? "text-amber-600" : undefined },
            { label: "Upcoming", value: reportStats.upcoming },
            { label: "Submitted", value: reportStats.submitted, color: "text-emerald-600" },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</p>
                <p className={`text-2xl font-bold tabular-nums mt-1 ${s.color || ""}`}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Report Row Component ───

function ReportRow({ report }: { report: Report }) {
  const days = daysUntil(report.dueDate);
  const isOverdue = days < 0;
  const isUrgent = days >= 0 && days <= 7;

  return (
    <Link
      href={`/reporting/forms?reportId=${encodeURIComponent(report.id)}`}
      className={`flex items-center justify-between p-2.5 rounded-md transition-colors ${
        isOverdue ? "bg-red-50/50 dark:bg-red-950/10 hover:bg-red-100/60 dark:hover:bg-red-950/20" : isUrgent ? "bg-amber-50/50 dark:bg-amber-950/10 hover:bg-amber-100/60 dark:hover:bg-amber-950/20" : "hover:bg-muted/50"
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${
          isOverdue ? "bg-red-100 dark:bg-red-900/40" : isUrgent ? "bg-amber-100 dark:bg-amber-900/40" : "bg-muted"
        }`}>
          <span className={`text-[10px] font-bold tabular-nums ${
            isOverdue ? "text-red-600 dark:text-red-400" : isUrgent ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
          }`}>
            {isOverdue ? `${Math.abs(days)}d` : `${days}d`}
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{reportTypeLabel(report.type)}</p>
          <p className="text-xs text-muted-foreground truncate">{report.program} &mdash; {report.awardTitle}</p>
        </div>
      </div>
      <span className="text-xs text-muted-foreground shrink-0">{fmtDate(report.dueDate)}</span>
    </Link>
  );
}
