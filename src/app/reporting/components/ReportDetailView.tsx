"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Award,
  BarChart3,
  Calendar,
  Clock,
  DollarSign,
  Loader2,
  Send,
  Sparkles,
  Target,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getAllReports,
  updateReportStatus,
  generateReportContent,
  type ReportContent,
} from "@/data/reporting";
import { getAwardById } from "@/data/awards";
import { fmt, fmtFull, fmtDate, daysUntil, reportTypeLabel, statusColor } from "./helpers";

interface ReportDetailViewProps {
  reportId: string;
  onBack: () => void;
  onRefresh: () => void;
  onOpenSF425?: (reportId: string) => void;
}

export default function ReportDetailView({ reportId, onBack, onRefresh, onOpenSF425 }: ReportDetailViewProps) {
  const [content, setContent] = useState<ReportContent | null>(null);
  const [generating, setGenerating] = useState(false);
  const [narrativeLoading, setNarrativeLoading] = useState(false);
  const [narrative, setNarrative] = useState<string | null>(null);
  const [, setRefresh] = useState(0);

  const allReports = useMemo(() => getAllReports(), []);
  const report = useMemo(() => allReports.find((r) => r.id === reportId), [allReports, reportId]);
  const award = useMemo(() => (report ? getAwardById(report.awardId) : undefined), [report]);

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
      <div className="flex items-center gap-2 flex-wrap">
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
        {report.type === "sf425" && onOpenSF425 && (
          <Button variant="outline" onClick={() => onOpenSF425(reportId)}>
            <DollarSign className="h-3.5 w-3.5 mr-1" /> View SF-425 Form
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
