"use client";

import { useState, useCallback } from "react";
import {
  ArrowLeft,
  FileText,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Loader2,
  Printer,
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePPRFormData, useReportSummary, useDraftPersistence } from "../hooks/useAwardFormData";
import type { PPRFormData, PPRMilestone, PPRSection } from "@/data/federal-report-templates";
import { fmtDate } from "./helpers";
import { useTenantHeaders } from "@/contexts/tenant-context";

interface PPRFormViewProps {
  reportId: string;
  awardId: string;
  periodStart: string;
  periodEnd: string;
  program: string;
  awardTitle: string;
  onBack: () => void;
}

export default function PPRFormView({
  reportId, awardId, periodStart, periodEnd,
  program, awardTitle, onBack,
}: PPRFormViewProps) {
  const tenantHeaders = useTenantHeaders();
  const { data: apiData, loading, error, refresh } = usePPRFormData(awardId, periodStart, periodEnd);
  const { data: summaryData } = useReportSummary(awardId, periodStart, periodEnd);
  const { saveDraft } = useDraftPersistence(reportId);

  const [formData, setFormData] = useState<PPRFormData | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["accomplishments"]));
  const [loadingSections, setLoadingSections] = useState<Set<string>>(new Set());

  if (apiData && !formData) {
    setFormData(apiData);
  }

  const toggleSection = useCallback((id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleAIDraft = useCallback(
    async (section: PPRSection) => {
      if (!formData) return;

      setLoadingSections((prev) => new Set(prev).add(section.id));

      try {
        const res = await fetch("/api/report-ppr-narrative", {
          method: "POST",
          headers: { ...tenantHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({
            sectionId: section.id,
            sectionTitle: section.title,
            sectionPrompt: section.prompt,
            awardTitle,
            program,
            periodStart,
            periodEnd,
            milestones: formData.milestones,
            financialSummary: summaryData?.financialSummary || null,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const updated = {
            ...formData,
            sections: formData.sections.map((s) =>
              s.id === section.id ? { ...s, aiDraft: data.narrative } : s
            ),
          };
          setFormData(updated);
          saveDraft(updated);
        }
      } catch {
        // Silent — user can retry
      } finally {
        setLoadingSections((prev) => {
          const next = new Set(prev);
          next.delete(section.id);
          return next;
        });
      }
    },
    [formData, awardTitle, program, periodStart, periodEnd, summaryData, saveDraft, tenantHeaders]
  );

  const handleSectionContent = useCallback(
    (sectionId: string, content: string) => {
      if (!formData) return;
      const updated = {
        ...formData,
        sections: formData.sections.map((s) =>
          s.id === sectionId ? { ...s, userContent: content } : s
        ),
      };
      setFormData(updated);
      saveDraft(updated);
    },
    [formData, saveDraft]
  );

  const handleMilestoneStatus = useCallback(
    (milestoneId: string, status: PPRMilestone["status"]) => {
      if (!formData) return;
      const updated = {
        ...formData,
        milestones: formData.milestones.map((m) =>
          m.id === milestoneId ? { ...m, status, completionDate: status === "completed" ? new Date().toISOString().split("T")[0] : m.completionDate } : m
        ),
      };
      setFormData(updated);
      saveDraft(updated);
    },
    [formData, saveDraft]
  );

  const handleMilestoneNotes = useCallback(
    (milestoneId: string, notes: string) => {
      if (!formData) return;
      const updated = {
        ...formData,
        milestones: formData.milestones.map((m) =>
          m.id === milestoneId ? { ...m, notes } : m
        ),
      };
      setFormData(updated);
      saveDraft(updated);
    },
    [formData, saveDraft]
  );

  if (loading && !formData) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !formData) {
    return (
      <div className="flex-1 p-6">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <Card className="border-red-200">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-8 w-8 mx-auto text-red-500 mb-3" />
            <p className="text-sm text-red-600">{error}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => { setFormData(null); refresh(); }}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!formData) return null;

  const milestoneStatusIcon = (status: PPRMilestone["status"]) => {
    switch (status) {
      case "completed": return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case "in_progress": return <Clock className="h-4 w-4 text-[#3d8b8b]" />;
      case "delayed": return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      default: return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3">
          <ArrowLeft className="h-4 w-4" /> Back to Report
        </button>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#3d8b8b]" />
              Performance Progress Report (SF-PPR)
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {formData.program} &mdash; {formData.awardTitle}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Period: {fmtDate(formData.reportingPeriod.start)} - {fmtDate(formData.reportingPeriod.end)}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-3.5 w-3.5 mr-1" /> Print
          </Button>
        </div>
      </div>

      {/* Report Header Info */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-0.5">Recipient</label>
              <p>{formData.recipientName}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-0.5">Program</label>
              <p>{formData.program}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-0.5">Reporting Period</label>
              <p>{fmtDate(formData.reportingPeriod.start)} - {fmtDate(formData.reportingPeriod.end)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Narrative Sections */}
      <div className="space-y-2">
        {formData.sections.map((section) => {
          const isExpanded = expandedSections.has(section.id);
          const isLoading = loadingSections.has(section.id);
          const hasContent = section.userContent || section.aiDraft;

          return (
            <Card key={section.id}>
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  <span className="text-sm font-medium">{section.title}</span>
                  {hasContent && (
                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px]">Draft</Badge>
                  )}
                </div>
              </button>

              {isExpanded && (
                <CardContent className="pt-0 pb-4 px-4">
                  <div className="rounded-md bg-muted/30 p-3 mb-3">
                    <p className="text-xs text-muted-foreground">{section.prompt}</p>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <Button variant="outline" size="sm" onClick={() => handleAIDraft(section)} disabled={isLoading}>
                      {isLoading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
                      AI Draft
                    </Button>
                    {section.aiDraft && !section.userContent && (
                      <Button variant="ghost" size="sm" onClick={() => handleSectionContent(section.id, section.aiDraft)}>
                        Use AI Draft
                      </Button>
                    )}
                  </div>

                  {section.aiDraft && !section.userContent && (
                    <div className="rounded-md border border-purple-200 dark:border-purple-800 bg-purple-50/30 dark:bg-purple-950/10 p-3 mb-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Sparkles className="h-3 w-3 text-purple-500" />
                        <span className="text-[10px] uppercase tracking-wider font-medium text-purple-600 dark:text-purple-400">AI Draft</span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{section.aiDraft}</p>
                      <p className="text-[10px] text-muted-foreground mt-2">Click &ldquo;Use AI Draft&rdquo; to adopt, or write your own below.</p>
                    </div>
                  )}

                  <textarea
                    value={section.userContent}
                    onChange={(e) => handleSectionContent(section.id, e.target.value)}
                    placeholder="Write your response here, or use the AI Draft button above..."
                    className="w-full h-32 rounded-md border bg-background px-3 py-2 text-sm resize-y"
                  />
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Milestones */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Project Milestones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground uppercase w-8"></th>
                  <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground uppercase">Milestone</th>
                  <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground uppercase w-28">Target Date</th>
                  <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground uppercase w-32">Status</th>
                  <th className="text-left py-2 text-xs font-medium text-muted-foreground uppercase">Notes</th>
                </tr>
              </thead>
              <tbody>
                {formData.milestones.map((milestone) => (
                  <tr key={milestone.id} className="border-b last:border-0">
                    <td className="py-2.5 pr-4">{milestoneStatusIcon(milestone.status)}</td>
                    <td className="py-2.5 pr-4 font-medium">{milestone.description}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground tabular-nums text-xs">{fmtDate(milestone.targetDate)}</td>
                    <td className="py-2.5 pr-4">
                      <select
                        value={milestone.status}
                        onChange={(e) => handleMilestoneStatus(milestone.id, e.target.value as PPRMilestone["status"])}
                        className="rounded border bg-background px-2 py-1 text-xs"
                      >
                        <option value="not_started">Not Started</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="delayed">Delayed</option>
                      </select>
                    </td>
                    <td className="py-2.5">
                      <input
                        type="text"
                        value={milestone.notes}
                        onChange={(e) => handleMilestoneNotes(milestone.id, e.target.value)}
                        className="w-full rounded border bg-background px-2 py-1 text-xs"
                        placeholder="Add notes..."
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Objectives */}
      {formData.objectives.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Program Objectives & Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {formData.objectives.map((obj) => (
                <div key={obj.id}>
                  <h4 className="text-sm font-medium mb-2">{obj.description}</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-1.5 pr-4 text-xs font-medium text-muted-foreground">Metric</th>
                          <th className="text-right py-1.5 pr-4 text-xs font-medium text-muted-foreground w-24">Target</th>
                          <th className="text-right py-1.5 text-xs font-medium text-muted-foreground w-24">Actual</th>
                        </tr>
                      </thead>
                      <tbody>
                        {obj.metrics.map((m, i) => (
                          <tr key={i} className="border-b last:border-0">
                            <td className="py-1.5 pr-4">{m.name}</td>
                            <td className="py-1.5 pr-4 text-right tabular-nums text-muted-foreground">{m.target}</td>
                            <td className="py-1.5 text-right tabular-nums font-medium">{m.actual}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground text-center pb-4">
        Per 2 CFR 200.329 &mdash; Performance reports must be submitted within 30 days after the reporting period.
      </p>
    </div>
  );
}
