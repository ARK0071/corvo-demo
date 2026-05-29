"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DollarSign,
  Banknote,
  FileText,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Users,
  Check,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTenantHeaders, useTenant } from "@/contexts/tenant-context";
import SF425FormView from "../components/SF425FormView";
import SF270FormView from "../components/SF270FormView";
import PPRFormView from "../components/PPRFormView";
import ReportDetailView from "../components/ReportDetailView";

// ─── Types ───

interface Report {
  id: string;
  awardId: string;
  awardTitle: string;
  program: string;
  fain?: string;
  type: string;
  title: string;
  dueDate: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  awardingAgency?: string;
  drafterUserId?: string | null;
  reviewerUserId?: string | null;
  reviewedAt?: string | null;
  reviewNotes?: string | null;
  certificationId?: string | null;
  contentLockedAt?: string | null;
}

interface SubrecipientReport {
  id: string;
  subrecipientName: string;
  awardTitle: string;
  program: string;
  reportType: string;
  title: string;
  dueDate: string;
  status: string;
}

// ─── Helpers ───

function fmtShortDate(d: string): string {
  try { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }); } catch { return d; }
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function reportTypeLabel(type: string): string {
  const map: Record<string, string> = { sf425: "SF-425", sf270: "SF-270", progress: "Progress Report", closeout: "Closeout" };
  return map[type] || type;
}

function statusBadgeColor(status: string, isOverdue: boolean): string {
  if (isOverdue) return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  const map: Record<string, string> = {
    upcoming: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    submitted: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    drafting: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    pending_review: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    ready_to_certify: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    certified: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    filed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  };
  return map[status] || "bg-gray-100 text-gray-600";
}

// ─── View types ───

type DetailView =
  | { mode: "detail"; report: Report }
  | { mode: "sf425"; report: Report }
  | { mode: "sf270"; report: Report }
  | { mode: "ppr"; report: Report };

// ─── Page ───

export default function FormsPage() {
  const headers = useTenantHeaders();
  const tenant = useTenant();
  const [reports, setReports] = useState<Report[]>([]);
  const [subReports, setSubReports] = useState<SubrecipientReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<DetailView | null>(null);

  const fetchReports = useCallback(async () => {
    if (tenant.isLoading) return;
    setLoading(true);
    try {
      const hdrs = { ...headers, "Content-Type": "application/json" };
      const [reportsRes, subRes] = await Promise.all([
        fetch("/api/reports", { headers: hdrs }),
        fetch("/api/subrecipients/reports", { headers: hdrs }),
      ]);
      if (reportsRes.ok) {
        const data = await reportsRes.json();
        setReports(data.reports || []);
      }
      if (subRes.ok) {
        const data = await subRes.json();
        setSubReports(data.reports || []);
      }
    } catch { /* */ }
    setLoading(false);
  }, [headers, tenant.isLoading]);

  useEffect(() => { fetchReports(); }, [tenant.isLoading, tenant.portId]);

  const handleSelectReport = (report: Report) => {
    // For SF-425 reports, go directly to the form
    if (report.type === "sf425") {
      setView({ mode: "sf425", report });
    } else if (report.type === "progress" || report.type === "ppr") {
      setView({ mode: "ppr", report });
    } else {
      setView({ mode: "detail", report });
    }
  };

  const handleSelectSF270 = (report: Report) => {
    setView({ mode: "sf270", report });
  };

  // ─── Detail Views ───

  if (view) {
    const r = view.report;

    if (view.mode === "sf425") {
      return (
        <SF425FormView
          reportId={r.id}
          awardId={r.awardId}
          periodStart={r.periodStart}
          periodEnd={r.periodEnd}
          program={r.program}
          awardTitle={r.awardTitle}
          dueDate={r.dueDate}
          awardingAgency={r.awardingAgency}
          onBack={() => setView(null)}
          reportStatus={r.status}
          certificationId={r.certificationId}
          contentLockedAt={r.contentLockedAt}
          reviewNotes={r.reviewNotes}
          onStatusChange={() => { fetchReports(); setView(null); }}
        />
      );
    }

    if (view.mode === "sf270") {
      return (
        <SF270FormView
          reportId={r.id}
          awardId={r.awardId}
          periodStart={r.periodStart}
          periodEnd={r.periodEnd}
          program={r.program}
          awardTitle={r.awardTitle}
          awardingAgency={r.awardingAgency}
          onBack={() => setView(null)}
          reportStatus={r.status}
          onStatusChange={() => { fetchReports(); setView(null); }}
        />
      );
    }

    if (view.mode === "ppr") {
      return (
        <PPRFormView
          reportId={r.id}
          awardId={r.awardId}
          periodStart={r.periodStart}
          periodEnd={r.periodEnd}
          program={r.program}
          awardTitle={r.awardTitle}
          onBack={() => setView(null)}
          reportStatus={r.status}
          onStatusChange={() => { fetchReports(); setView(null); }}
        />
      );
    }

    // detail mode
    return (
      <ReportDetailView
        reportId={r.id}
        awardId={r.awardId}
        periodStart={r.periodStart}
        periodEnd={r.periodEnd}
        program={r.program}
        awardTitle={r.awardTitle}
        dueDate={r.dueDate}
        status={r.status}
        title={r.title}
        type={r.type}
        onBack={() => setView(null)}
        onRefresh={fetchReports}
        onOpenSF425={r.type === "sf425" ? () => setView({ mode: "sf425", report: r }) : undefined}
      />
    );
  }

  // ─── List View ───

  if (loading) {
    return <div className="flex-1 flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  const pending = reports.filter((r) => r.status !== "submitted");
  const sf425Reports = pending.filter((r) => r.type === "sf425").sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const progressReports = pending.filter((r) => r.type === "progress").sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const closeoutReports = pending.filter((r) => r.type === "closeout");

  return (
    <div className="flex-1 overflow-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Federal Report Forms</h1>
        <p className="text-sm text-muted-foreground mt-1">Auto-populated forms with financial data — click to view details</p>
      </div>

      <FormSection
        icon={<DollarSign className="h-4 w-4 text-[#3d8b8b]" />}
        title="SF-425 Federal Financial Reports"
        reports={sf425Reports}
        onSelect={handleSelectReport}
      />

      <FormSection
        icon={<Banknote className="h-4 w-4 text-[#3d8b8b]" />}
        title="SF-270 Reimbursement Requests"
        reports={sf425Reports.slice(0, 6)}
        onSelect={handleSelectSF270}
        labelOverride="SF-270"
      />

      <FormSection
        icon={<FileText className="h-4 w-4 text-[#3d8b8b]" />}
        title="Performance Progress Reports"
        reports={progressReports}
        onSelect={handleSelectReport}
      />

      {closeoutReports.length > 0 && (
        <FormSection
          icon={<CheckCircle2 className="h-4 w-4 text-amber-500" />}
          title="Closeout Reports"
          reports={closeoutReports}
          onSelect={handleSelectReport}
        />
      )}

      <SubrecipientSection
        reports={subReports}
        headers={headers}
        onRefresh={fetchReports}
      />
    </div>
  );
}

// ─── Form Section ───

function FormSection({ icon, title, reports, onSelect, labelOverride }: {
  icon: React.ReactNode;
  title: string;
  reports: Report[];
  onSelect: (r: Report) => void;
  labelOverride?: string;
}) {
  return (
    <section>
      <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">{icon}{title}</h2>
      {reports.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No pending reports</p>
      ) : (
        <div className="space-y-2">
          {reports.slice(0, 10).map((r) => {
            const days = daysUntil(r.dueDate);
            const isOverdue = days < 0 && r.status !== "submitted";
            return (
              <button
                key={`${labelOverride || ""}-${r.id}`}
                onClick={() => onSelect(r)}
                className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-all hover:shadow-md ${
                  isOverdue ? "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20" : "border-border hover:border-[#3d8b8b]/30"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Badge className={`text-[10px] shrink-0 ${statusBadgeColor(r.status, isOverdue)}`}>
                    {isOverdue ? "overdue" : r.status.replace("_", " ")}
                  </Badge>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {r.program}{r.fain ? ` (${r.fain})` : ""} &mdash; {labelOverride || reportTypeLabel(r.type)}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{r.awardTitle}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{fmtShortDate(r.periodStart)} - {fmtShortDate(r.periodEnd)}</p>
                    <p className="text-xs tabular-nums font-medium">Due {fmtShortDate(r.dueDate)}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ─── Subrecipient Section ───

function SubrecipientSection({ reports, headers, onRefresh }: {
  reports: SubrecipientReport[];
  headers: Record<string, string>;
  onRefresh: () => void;
}) {
  const [marking, setMarking] = useState<string | null>(null);

  const handleMarkReceived = async (reportId: string) => {
    setMarking(reportId);
    try {
      await fetch("/api/subrecipients", {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "markReceived", reportId }),
      });
      onRefresh();
    } catch { /* */ }
    setMarking(null);
  };

  return (
    <section>
      <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <Users className="h-4 w-4 text-amber-500" />
        Subrecipient Monitoring Reports
      </h2>
      {reports.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No pending subrecipient reports</p>
      ) : (
        <div className="space-y-2">
          {reports.map((sr) => {
            const isOverdue = sr.status === "overdue";
            return (
              <div
                key={sr.id}
                className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                  isOverdue
                    ? "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20"
                    : "border-border"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Badge
                    className={`text-[10px] shrink-0 ${
                      isOverdue
                        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    }`}
                  >
                    {sr.status}
                  </Badge>
                  <Badge className="text-[10px] shrink-0 bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                    {sr.reportType}
                  </Badge>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {sr.subrecipientName} &mdash; {sr.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {sr.program} &bull; {sr.awardTitle}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <p className="text-xs tabular-nums font-medium">
                    Due {fmtShortDate(sr.dueDate)}
                  </p>
                  <button
                    onClick={() => handleMarkReceived(sr.id)}
                    disabled={marking === sr.id}
                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/30 transition-colors disabled:opacity-50"
                  >
                    {marking === sr.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Check className="h-3 w-3" />
                    )}
                    Mark Received
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
