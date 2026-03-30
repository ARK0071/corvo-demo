"use client";

import { useState, useCallback, useMemo } from "react";
import {
  FileText,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  Sparkles,
  ClipboardCheck,
  DollarSign,
  Banknote,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  getAllReports,
  getUpcomingReports,
  getOverdueReports,
  getReportingStats,
  getReportsForAward,
} from "@/data/reporting";
import { getAllAwards } from "@/data/awards";
import { daysUntil, fmtDate, fmtShortDate, reportTypeLabel, statusColor, MONTH_NAMES } from "./components/helpers";

// Sub-views
import ReportDetailView from "./components/ReportDetailView";
import SEFAView from "./components/SEFAView";
import CloseoutView from "./components/CloseoutView";
import SF425FormView from "./components/SF425FormView";
import SF270FormView from "./components/SF270FormView";
import PPRFormView from "./components/PPRFormView";
import ReportingCalendar from "./components/ReportingCalendar";

// ─── Page ───

export default function ReportingPage() {
  const [activeTab, setActiveTab] = useState("timeline");
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [showSEFA, setShowSEFA] = useState(false);
  const [showCloseout, setShowCloseout] = useState<string | null>(null);
  const [showSF425, setShowSF425] = useState<string | null>(null);
  const [showSF270, setShowSF270] = useState<string | null>(null);
  const [showPPR, setShowPPR] = useState<string | null>(null);
  const [, setRefresh] = useState(0);
  const forceRefresh = useCallback(() => setRefresh((n) => n + 1), []);

  const stats = useMemo(() => getReportingStats(), []);
  const upcomingReports = useMemo(() => getUpcomingReports(90), []);
  const overdueReports = useMemo(() => getOverdueReports(), []);
  const allReports = useMemo(() => getAllReports(), []);
  const awards = useMemo(() => getAllAwards(), []);

  // Build 6-month timeline data
  const timelineData = useMemo(() => {
    const now = new Date();
    const months: { year: number; month: number; label: string; reports: typeof allReports }[] = [];

    for (let i = -1; i < 5; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const label = `${MONTH_NAMES[month]} ${year}`;

      const monthReports = allReports
        .filter((r) => {
          const due = new Date(r.dueDate);
          return due.getMonth() === month && due.getFullYear() === year && r.status !== "submitted";
        })
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

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

  // ─── Sub-view routing ───

  if (showSF425) {
    return (
      <SF425FormView
        reportId={showSF425}
        onBack={() => setShowSF425(null)}
      />
    );
  }

  if (showSF270) {
    return (
      <SF270FormView
        reportId={showSF270}
        onBack={() => setShowSF270(null)}
      />
    );
  }

  if (showPPR) {
    return (
      <PPRFormView
        reportId={showPPR}
        onBack={() => setShowPPR(null)}
      />
    );
  }

  if (selectedReportId) {
    return (
      <ReportDetailView
        reportId={selectedReportId}
        onBack={() => setSelectedReportId(null)}
        onRefresh={forceRefresh}
        onOpenSF425={(id) => { setSelectedReportId(null); setShowSF425(id); }}
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
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="by_award">By Award</TabsTrigger>
          <TabsTrigger value="forms">Forms</TabsTrigger>
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
                  <div className="flex items-stretch gap-0">
                    <div className={`w-28 shrink-0 flex items-start pt-3 pb-3 pr-4 ${isCurrent ? "font-semibold" : ""}`}>
                      <div className="flex items-center gap-2">
                        {isCurrent && <div className="h-2 w-2 rounded-full bg-[#3d8b8b] animate-pulse" />}
                        <span className={`text-sm ${isCurrent ? "text-[#3d8b8b]" : "text-muted-foreground"}`}>{month.label}</span>
                      </div>
                    </div>

                    <div className="relative flex flex-col items-center w-6 shrink-0">
                      <div className={`w-px flex-1 ${isCurrent ? "bg-[#3d8b8b]" : "bg-border"}`} />
                      {hasReports && (
                        <div className={`absolute top-3 h-3 w-3 rounded-full border-2 ${isCurrent ? "border-[#3d8b8b] bg-[#3d8b8b]" : "border-border bg-background"}`} />
                      )}
                    </div>

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

            <div className="flex items-stretch gap-0">
              <div className="w-28 shrink-0" />
              <div className="relative flex flex-col items-center w-6 shrink-0">
                <div className="w-px h-4 bg-border" />
                <div className="h-1.5 w-1.5 rounded-full bg-border" />
              </div>
              <div className="flex-1 pl-4 py-2">
                <p className="text-xs text-muted-foreground italic">
                  {allReports.filter((r) => r.status !== "submitted").length - timelineData.reduce((s, m) => s + m.reports.length, 0)} more reports beyond this window
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── Calendar Tab ── */}
        <TabsContent value="calendar">
          <ReportingCalendar onSelectReport={(id) => setSelectedReportId(id)} />
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

        {/* ── Forms Tab ── */}
        <TabsContent value="forms">
          <div className="mt-4 space-y-6">
            <p className="text-sm text-muted-foreground">
              Auto-populated federal report forms. Select an award and period to generate.
            </p>

            {/* SF-425 Reports */}
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-[#3d8b8b]" />
                SF-425 Federal Financial Reports
              </h3>
              <div className="space-y-2">
                {allReports
                  .filter((r) => r.type === "sf425" && r.status !== "submitted")
                  .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
                  .slice(0, 8)
                  .map((r) => {
                    const days = daysUntil(r.dueDate);
                    const isOverdue = days < 0;
                    return (
                      <button
                        key={r.id}
                        onClick={() => setShowSF425(r.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-all hover:shadow-md ${
                          isOverdue ? "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20" : "border-border hover:border-[#3d8b8b]/30"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Badge className={`text-[10px] shrink-0 ${statusColor(isOverdue ? "overdue" : r.status)}`}>
                            {isOverdue ? "overdue" : r.status.replace("_", " ")}
                          </Badge>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{r.program} &mdash; SF-425</p>
                            <p className="text-xs text-muted-foreground truncate">{r.awardTitle}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-muted-foreground">{fmtShortDate(r.periodStart)} - {fmtShortDate(r.periodEnd)}</p>
                          <p className="text-xs tabular-nums font-medium">Due {fmtShortDate(r.dueDate)}</p>
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* SF-270 Reimbursement Requests */}
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Banknote className="h-4 w-4 text-[#3d8b8b]" />
                SF-270 Reimbursement Requests
              </h3>
              <div className="space-y-2">
                {allReports
                  .filter((r) => r.type === "sf425" && r.status !== "submitted")
                  .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
                  .slice(0, 6)
                  .map((r) => (
                    <button
                      key={`sf270-${r.id}`}
                      onClick={() => setShowSF270(r.id)}
                      className="w-full flex items-center justify-between p-3 rounded-lg border border-border text-left transition-all hover:shadow-md hover:border-[#3d8b8b]/30"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Banknote className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{r.program} &mdash; SF-270</p>
                          <p className="text-xs text-muted-foreground truncate">{r.awardTitle}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-muted-foreground">{fmtShortDate(r.periodStart)} - {fmtShortDate(r.periodEnd)}</p>
                      </div>
                    </button>
                  ))}
              </div>
            </div>

            {/* SF-PPR Progress Reports */}
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#3d8b8b]" />
                Performance Progress Reports (SF-PPR)
              </h3>
              <div className="space-y-2">
                {allReports
                  .filter((r) => r.type === "progress" && r.status !== "submitted")
                  .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
                  .slice(0, 8)
                  .map((r) => {
                    const days = daysUntil(r.dueDate);
                    const isOverdue = days < 0;
                    return (
                      <button
                        key={r.id}
                        onClick={() => setShowPPR(r.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-all hover:shadow-md ${
                          isOverdue ? "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20" : "border-border hover:border-[#3d8b8b]/30"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Badge className={`text-[10px] shrink-0 ${statusColor(isOverdue ? "overdue" : r.status)}`}>
                            {isOverdue ? "overdue" : r.status.replace("_", " ")}
                          </Badge>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{r.program} &mdash; {r.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{r.awardTitle}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-muted-foreground">{fmtShortDate(r.periodStart)} - {fmtShortDate(r.periodEnd)}</p>
                          <p className="text-xs tabular-nums font-medium">Due {fmtShortDate(r.dueDate)}</p>
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>
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

            {awards
              .filter((a) => a.status === "closeout_pending")
              .map((award) => (
                <Card
                  key={award.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setShowCloseout(award.id)}
                >
                  <CardContent className="pt-6 pb-6 text-center">
                    <ClipboardCheck className="h-8 w-8 mx-auto text-amber-500 mb-2" />
                    <h3 className="font-semibold">Closeout: {award.program}</h3>
                    <p className="text-sm text-muted-foreground mt-1 truncate">{award.title}</p>
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
