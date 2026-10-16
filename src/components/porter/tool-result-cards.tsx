"use client";

import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  DollarSign,
  FileText,
  ArrowRight,
  ExternalLink,
  XCircle,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Generic wrapper: detects tool name and routes to the right card
// ---------------------------------------------------------------------------

interface ToolResultCardProps {
  toolName: string;
  output: unknown;
}

export function ToolResultCard({ toolName, output }: ToolResultCardProps) {
  if (!output || typeof output !== "object") return null;
  const data = output as Record<string, unknown>;

  // Error results
  if (data.error) {
    return <ErrorCard message={String(data.error)} />;
  }

  switch (toolName) {
    case "get_pipeline_overview":
      return <PipelineOverviewCard data={data} />;
    case "search_grants":
    case "semantic_grant_search":
      return <GrantListCard data={data} />;
    case "get_financial_summary":
      return <FinancialCard data={data} />;
    case "get_tasks":
      return <TaskListCard data={data} />;
    case "get_overdue_items":
      return <OverdueCard data={data} />;
    case "get_compliance_status":
      return <ComplianceCard data={data} />;
    case "search_documents":
      return <CitationCard data={data} />;
    case "get_report_status":
      return <ReportStatusCard data={data} />;
    // Write tool confirmations
    case "create_task":
    case "assign_task":
    case "update_task_status":
    case "add_comment":
    case "send_notification":
    case "add_to_pipeline":
      return <WriteConfirmCard toolName={toolName} data={data} />;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Error card
// ---------------------------------------------------------------------------

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="my-1.5 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
      <div className="flex items-center gap-1.5 text-xs text-destructive">
        <XCircle className="h-3.5 w-3.5" />
        <span>{message}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pipeline Overview
// ---------------------------------------------------------------------------

const STAGE_COLORS: Record<string, string> = {
  eligible: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  drafting: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  applied: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  under_review: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  awarded: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  reporting: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  closeout: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

function PipelineOverviewCard({ data }: { data: Record<string, unknown> }) {
  const stages = data.stages as Array<{ stage: string; count: number }> | undefined;
  const total = data.totalGrants as number | undefined;
  if (!stages) return null;

  return (
    <div className="my-1.5 rounded-md border bg-card p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold">Pipeline</span>
        {total != null && (
          <span className="text-[10px] text-muted-foreground">{total} grants total</span>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {stages.map((s) => (
          <span
            key={s.stage}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${STAGE_COLORS[s.stage] || "bg-muted text-muted-foreground"}`}
          >
            {s.stage.replace(/_/g, " ")}
            <span className="font-bold">{s.count}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Grant List (search results)
// ---------------------------------------------------------------------------

function GrantListCard({ data }: { data: Record<string, unknown> }) {
  const grants = (data.grants ?? data.results) as
    | Array<{
        id?: string;
        title?: string;
        agency?: string;
        awardCeiling?: number;
        status?: string;
        similarity?: number;
      }>
    | undefined;
  const count = data.count as number | undefined;
  if (!grants || grants.length === 0) return null;

  return (
    <div className="my-1.5 rounded-md border bg-card">
      <div className="border-b px-3 py-2">
        <span className="text-xs font-semibold">
          {count ?? grants.length} grant{(count ?? grants.length) !== 1 ? "s" : ""} found
        </span>
      </div>
      <div className="divide-y max-h-48 overflow-y-auto">
        {grants.slice(0, 5).map((g, i) => (
          <div key={g.id ?? i} className="px-3 py-2">
            <div className="text-xs font-medium truncate">{g.title}</div>
            <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
              {g.agency && <span>{g.agency}</span>}
              {g.awardCeiling != null && (
                <span className="flex items-center gap-0.5">
                  <DollarSign className="h-2.5 w-2.5" />
                  {formatCurrency(g.awardCeiling)}
                </span>
              )}
              {g.status && (
                <span className={`rounded-full px-1.5 py-0 text-[9px] ${STAGE_COLORS[g.status] || "bg-muted"}`}>
                  {g.status}
                </span>
              )}
              {g.similarity != null && (
                <span className="text-blue-600 dark:text-blue-400">
                  {Math.round(g.similarity * 100)}% match
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      {grants.length > 5 && (
        <div className="border-t px-3 py-1.5 text-[10px] text-muted-foreground text-center">
          +{grants.length - 5} more
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Financial Summary
// ---------------------------------------------------------------------------

function FinancialCard({ data }: { data: Record<string, unknown> }) {
  const budget = data.totalBudget as number | undefined;
  const spent = data.totalSpent as number | undefined;
  const burnRate = data.burnRatePercent as number | undefined;
  const matchGap = data.matchGap as number | undefined;

  if (budget == null) return null;

  const utilization = spent != null && budget > 0 ? (spent / budget) * 100 : 0;

  return (
    <div className="my-1.5 rounded-md border bg-card p-3">
      <div className="mb-2 text-xs font-semibold flex items-center gap-1.5">
        <DollarSign className="h-3.5 w-3.5" />
        Financial Summary
      </div>
      <div className="space-y-2">
        <div>
          <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
            <span>Budget utilization</span>
            <span>{Math.round(utilization)}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${utilization > 90 ? "bg-red-500" : utilization > 70 ? "bg-amber-500" : "bg-green-500"}`}
              style={{ width: `${Math.min(utilization, 100)}%` }}
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-[10px] text-muted-foreground">Budget</div>
            <div className="text-xs font-medium">{formatCurrency(budget)}</div>
          </div>
          {spent != null && (
            <div>
              <div className="text-[10px] text-muted-foreground">Spent</div>
              <div className="text-xs font-medium">{formatCurrency(spent)}</div>
            </div>
          )}
          {burnRate != null && (
            <div>
              <div className="text-[10px] text-muted-foreground">Burn Rate</div>
              <div className="text-xs font-medium">{burnRate}%/mo</div>
            </div>
          )}
        </div>
        {matchGap != null && matchGap > 0 && (
          <div className="flex items-center gap-1.5 text-[10px] text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-3 w-3" />
            Match gap: {formatCurrency(matchGap)}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Task List
// ---------------------------------------------------------------------------

const STATUS_ICON: Record<string, React.ReactNode> = {
  done: <CheckCircle2 className="h-3 w-3 text-green-600" />,
  in_progress: <Clock className="h-3 w-3 text-blue-500" />,
  blocked: <XCircle className="h-3 w-3 text-red-500" />,
  not_started: <Clock className="h-3 w-3 text-muted-foreground" />,
  in_review: <FileText className="h-3 w-3 text-purple-500" />,
  submitted: <CheckCircle2 className="h-3 w-3 text-cyan-600" />,
};

function TaskListCard({ data }: { data: Record<string, unknown> }) {
  const tasks = data.tasks as
    | Array<{ id?: string; title?: string; status?: string; dueDate?: string; assignee?: string }>
    | undefined;
  if (!tasks || tasks.length === 0) return null;

  return (
    <div className="my-1.5 rounded-md border bg-card">
      <div className="border-b px-3 py-2">
        <span className="text-xs font-semibold">{tasks.length} tasks</span>
      </div>
      <div className="divide-y max-h-40 overflow-y-auto">
        {tasks.slice(0, 8).map((t, i) => (
          <div key={t.id ?? i} className="flex items-center gap-2 px-3 py-1.5">
            {STATUS_ICON[t.status ?? "not_started"] ?? STATUS_ICON.not_started}
            <span className="text-xs flex-1 truncate">{t.title}</span>
            {t.dueDate && (
              <span className="text-[10px] text-muted-foreground shrink-0">
                {new Date(t.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            )}
          </div>
        ))}
      </div>
      {tasks.length > 8 && (
        <div className="border-t px-3 py-1.5 text-[10px] text-muted-foreground text-center">
          +{tasks.length - 8} more
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Overdue Items
// ---------------------------------------------------------------------------

function OverdueCard({ data }: { data: Record<string, unknown> }) {
  const items = (data.overdueItems ?? data.items) as
    | Array<{ title?: string; type?: string; daysOverdue?: number }>
    | undefined;
  if (!items || items.length === 0) return null;

  return (
    <div className="my-1.5 rounded-md border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
      <div className="border-b border-red-200 dark:border-red-800 px-3 py-2">
        <span className="text-xs font-semibold text-red-700 dark:text-red-400 flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5" />
          {items.length} overdue item{items.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="divide-y divide-red-100 dark:divide-red-900/30 max-h-32 overflow-y-auto">
        {items.slice(0, 5).map((item, i) => (
          <div key={i} className="flex items-center justify-between px-3 py-1.5">
            <span className="text-xs truncate flex-1">{item.title}</span>
            {item.daysOverdue != null && (
              <span className="text-[10px] text-red-600 dark:text-red-400 shrink-0">
                {item.daysOverdue}d overdue
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Compliance Status
// ---------------------------------------------------------------------------

function ComplianceCard({ data }: { data: Record<string, unknown> }) {
  const areas = data.areas as
    | Array<{ area?: string; status?: string; completedItems?: number; totalItems?: number }>
    | undefined;
  if (!areas) return null;

  return (
    <div className="my-1.5 rounded-md border bg-card">
      <div className="border-b px-3 py-2">
        <span className="text-xs font-semibold">Compliance Status</span>
      </div>
      <div className="divide-y max-h-40 overflow-y-auto">
        {areas.map((a, i) => {
          const pct =
            a.totalItems && a.totalItems > 0
              ? Math.round(((a.completedItems ?? 0) / a.totalItems) * 100)
              : 0;
          return (
            <div key={i} className="flex items-center gap-2 px-3 py-1.5">
              {a.status === "complete" || pct === 100 ? (
                <CheckCircle2 className="h-3 w-3 text-green-600 shrink-0" />
              ) : (
                <Clock className="h-3 w-3 text-amber-500 shrink-0" />
              )}
              <span className="text-xs flex-1 truncate">
                {(a.area ?? "").replace(/_/g, " ")}
              </span>
              <span className="text-[10px] text-muted-foreground shrink-0">
                {a.completedItems ?? 0}/{a.totalItems ?? 0}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Citation Card (Document RAG results)
// ---------------------------------------------------------------------------

function CitationCard({ data }: { data: Record<string, unknown> }) {
  const passages = data.passages as
    | Array<{
        index?: number;
        citation?: { source?: string; section?: string; page?: number | string; docType?: string };
        relevanceScore?: number;
      }>
    | undefined;
  const count = data.count as number | undefined;
  if (!passages || passages.length === 0) return null;

  return (
    <div className="my-1.5 rounded-md border bg-card">
      <div className="border-b px-3 py-2">
        <span className="text-xs font-semibold flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5" />
          {count ?? passages.length} passage{(count ?? passages.length) !== 1 ? "s" : ""} found
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5 p-2">
        {passages.map((p, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-2 py-0.5 text-[10px] text-blue-700 dark:text-blue-400"
            title={`${p.citation?.source ?? "Source"} — ${p.citation?.section ?? ""} (score: ${p.relevanceScore ?? ""})`}
          >
            <ExternalLink className="h-2.5 w-2.5" />
            {p.citation?.source ? truncate(p.citation.source, 25) : `Source ${p.index}`}
            {p.citation?.section && (
              <span className="text-blue-500 dark:text-blue-300">{p.citation.section}</span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Report Status
// ---------------------------------------------------------------------------

function ReportStatusCard({ data }: { data: Record<string, unknown> }) {
  const reports = data.reports as
    | Array<{ reportType?: string; dueDate?: string; status?: string; awardTitle?: string }>
    | undefined;
  if (!reports || reports.length === 0) return null;

  return (
    <div className="my-1.5 rounded-md border bg-card">
      <div className="border-b px-3 py-2">
        <span className="text-xs font-semibold">{reports.length} reports</span>
      </div>
      <div className="divide-y max-h-32 overflow-y-auto">
        {reports.slice(0, 5).map((r, i) => (
          <div key={i} className="flex items-center gap-2 px-3 py-1.5">
            <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs truncate">{r.reportType ?? "Report"}</div>
              {r.awardTitle && (
                <div className="text-[10px] text-muted-foreground truncate">{r.awardTitle}</div>
              )}
            </div>
            {r.dueDate && (
              <span className="text-[10px] text-muted-foreground shrink-0">
                {new Date(r.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Write Confirmation Card
// ---------------------------------------------------------------------------

const WRITE_LABELS: Record<string, string> = {
  create_task: "Task created",
  assign_task: "Task reassigned",
  update_task_status: "Status updated",
  add_comment: "Comment added",
  send_notification: "Notification sent",
  add_to_pipeline: "Added to pipeline",
};

function WriteConfirmCard({ toolName, data }: { toolName: string; data: Record<string, unknown> }) {
  const label = WRITE_LABELS[toolName] || "Action completed";
  const success = data.success !== false && !data.error;

  return (
    <div
      className={`my-1.5 rounded-md border px-3 py-2 flex items-center gap-2 ${
        success
          ? "border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20"
          : "border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20"
      }`}
    >
      {success ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
      ) : (
        <XCircle className="h-3.5 w-3.5 text-red-600 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <span className={`text-xs font-medium ${success ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>
          {label}
        </span>
        {data.title != null && (
          <span className="text-xs text-muted-foreground ml-1.5">— {String(data.title)}</span>
        )}
      </div>
      <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + "..." : str;
}
