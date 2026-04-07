"use client";

import { useState, useCallback } from "react";
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
import { useReportSummary, useDraftPersistence } from "../hooks/useAwardFormData";
import { useTenantHeaders } from "@/contexts/tenant-context";
import { fmt, fmtFull, fmtDate, daysUntil, reportTypeLabel, statusColor } from "./helpers";

interface ReportDetailViewProps {
  reportId: string;
  awardId: string;
  periodStart: string;
  periodEnd: string;
  program: string;
  awardTitle: string;
  dueDate: string;
  status: string;
  title: string;
  type: string;
  onBack: () => void;
  onRefresh: () => void;
  onOpenSF425?: () => void;
}

export default function ReportDetailView({
  reportId, awardId, periodStart, periodEnd,
  program, awardTitle, dueDate, status, title, type,
  onBack, onRefresh, onOpenSF425,
}: ReportDetailViewProps) {
  const tenantHeaders = useTenantHeaders();
  const { data: summaryData, loading, refresh } = useReportSummary(awardId, periodStart, periodEnd);
  const { saveDraft } = useDraftPersistence(reportId);

  const [narrativeLoading, setNarrativeLoading] = useState(false);
  const [narrative, setNarrative] = useState<string | null>(null);

  const content = summaryData;
  const days = daysUntil(dueDate);
  const isOverdue = days < 0 && status !== "submitted";

  const handleGenerateNarrative = useCallback(async () => {
    if (!content) return;
    setNarrativeLoading(true);
    try {
      const res = await fetch("/api/report-narrative", {
        method: "POST",
        headers: { ...tenantHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          awardTitle,
          program,
          periodStart,
          periodEnd,
          description: "",
          financialSummary: content.financialSummary,
          matchSummary: content.matchSummary,
          completionPercentage: content.completionPercentage,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setNarrative(data.narrative);
        saveDraft(content, data.narrative);
      } else {
        setNarrative("Unable to generate narrative. Ensure ANTHROPIC_API_KEY is configured.");
      }
    } catch {
      setNarrative("Unable to generate narrative. Ensure ANTHROPIC_API_KEY is configured.");
    } finally {
      setNarrativeLoading(false);
    }
  }, [content, awardTitle, program, periodStart, periodEnd, tenantHeaders, saveDraft]);

  const handleMarkSubmitted = useCallback(async () => {
    try {
      await fetch("/api/reports", {
        method: "PUT",
        headers: { ...tenantHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, status: "submitted" }),
      });
      onRefresh();
    } catch { /* */ }
  }, [reportId, tenantHeaders, onRefresh]);

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3">
          <ArrowLeft className="h-4 w-4" /> Back to Reporting
        </button>

        <div className={`rounded-xl border p-5 ${isOverdue ? "border-red-200 bg-red-50/30 dark:border-red-800 dark:bg-red-950/10" : "bg-muted/20"}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Badge className={statusColor(isOverdue ? "overdue" : status)}>
                  {isOverdue ? "overdue" : status.replace("_", " ")}
                </Badge>
                <Badge variant="outline">{program}</Badge>
                <Badge variant="outline" className="text-[10px]">{reportTypeLabel(type)}</Badge>
              </div>
              <h1 className="text-xl font-bold tracking-tight">{title}</h1>
              <Link href="/awards" className="text-sm text-muted-foreground mt-1 hover:text-[#3d8b8b] hover:underline inline-flex items-center gap-1">
                <Award className="h-3 w-3" />
                {awardTitle}
              </Link>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>Period: {fmtDate(periodStart)} - {fmtDate(periodEnd)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>Due: {fmtDate(dueDate)}</span>
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
        <Button onClick={refresh} disabled={loading}>
          {loading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <BarChart3 className="h-3.5 w-3.5 mr-1" />}
          Refresh Data
        </Button>
        {content && (
          <Button variant="outline" onClick={handleGenerateNarrative} disabled={narrativeLoading}>
            {narrativeLoading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
            AI Draft Narrative
          </Button>
        )}
        {type === "sf425" && onOpenSF425 && (
          <Button variant="outline" onClick={onOpenSF425}>
            <DollarSign className="h-3.5 w-3.5 mr-1" /> View SF-425 Form
          </Button>
        )}
        {status !== "submitted" && (
          <Button variant="outline" onClick={handleMarkSubmitted}>
            <Send className="h-3.5 w-3.5 mr-1" /> Mark Submitted
          </Button>
        )}
      </div>

      {/* Content */}
      {content ? (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4" /> Financial Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-4">
                {[
                  { label: "Awarded", value: content.financialSummary.totalAwarded },
                  { label: "This Period", value: content.financialSummary.totalExpendedThisPeriod },
                  { label: "Cumulative", value: content.financialSummary.totalExpendedCumulative },
                  { label: "Drawn Down", value: content.financialSummary.totalDrawnDown, color: "text-emerald-600" },
                  { label: "Remaining", value: content.financialSummary.remainingBalance },
                ].map((kpi) => (
                  <div key={kpi.label} className="text-center">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
                    <p className={`text-lg font-bold tabular-nums ${kpi.color || ""}`}>{fmt(kpi.value)}</p>
                  </div>
                ))}
              </div>

              <h4 className="text-sm font-medium mb-2">Budget vs. Actual by Category</h4>
              <div className="space-y-3">
                {content.financialSummary.byCategory.map((cat) => {
                  const pct = cat.budgeted > 0 ? Math.round((cat.spent / cat.budgeted) * 100) : 0;
                  return (
                    <div key={cat.name}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span>{cat.name}</span>
                        <span className="tabular-nums text-muted-foreground">{fmtFull(cat.spent)} / {fmtFull(cat.budgeted)} ({pct}%)</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-[#3d8b8b]"}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

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
      ) : (
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
