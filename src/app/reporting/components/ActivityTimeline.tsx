"use client";

import { useState, useEffect } from "react";
import { useTenantHeaders } from "@/contexts/tenant-context";
import {
  CheckCircle2,
  FileText,
  Send,
  Shield,
  AlertTriangle,
  Bot,
  Clock,
  ChevronDown,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AuditEntry {
  id: string;
  action: string;
  userId: string | null;
  userName: string | null;
  userTitle: string | null;
  userRole: string | null;
  fieldChanged: string | null;
  oldValue: unknown;
  newValue: unknown;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

const ACTION_CONFIG: Record<string, { icon: typeof CheckCircle2; label: string; color: string }> = {
  "report.created": { icon: FileText, label: "Report created", color: "text-blue-500" },
  "report.draft.updated": { icon: FileText, label: "Draft updated", color: "text-blue-500" },
  "report.submitted_for_review": { icon: Send, label: "Submitted for review", color: "text-amber-500" },
  "report.review.approved": { icon: CheckCircle2, label: "Review approved", color: "text-green-500" },
  "report.review.changes_requested": { icon: AlertTriangle, label: "Changes requested", color: "text-red-500" },
  "report.certified": { icon: Shield, label: "Certified", color: "text-emerald-600" },
  "report.filed": { icon: CheckCircle2, label: "Filed", color: "text-emerald-700" },
  "report.status_changed": { icon: FileText, label: "Status changed", color: "text-blue-500" },
  "ai.draft.generated": { icon: Bot, label: "AI draft generated", color: "text-purple-500" },
  "ai.compliance_brief.generated": { icon: Bot, label: "Compliance brief generated", color: "text-purple-500" },
  "ai.expense_scan.executed": { icon: Bot, label: "Expense scan executed", color: "text-purple-500" },
};

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();

  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;

  return d.toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function ActivityTimeline({ reportId }: { reportId: string }) {
  const headers = useTenantHeaders();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!reportId) return;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/reports/${reportId}/activity`, {
          headers: { ...headers, "Content-Type": "application/json" },
        });
        if (res.ok) {
          const data = await res.json();
          setEntries(data.entries || []);
        }
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, [reportId, headers]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading activity…
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-4 text-center">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" />
        No activity recorded yet.
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {entries.map((entry, i) => {
        const config = ACTION_CONFIG[entry.action] || {
          icon: FileText,
          label: entry.action.replace(/\./g, " "),
          color: "text-muted-foreground",
        };
        const Icon = config.icon;
        const isExpanded = expandedIds.has(entry.id);
        const hasMetadata = entry.metadata && Object.keys(entry.metadata).length > 0;
        const isAI = entry.action.startsWith("ai.");
        const isLast = i === entries.length - 1;

        return (
          <div key={entry.id} className="flex gap-3">
            {/* Timeline line + icon */}
            <div className="flex flex-col items-center">
              <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${
                isAI ? "bg-purple-500/10" : "bg-muted"
              }`}>
                <Icon className={`h-3.5 w-3.5 ${config.color}`} />
              </div>
              {!isLast && <div className="w-px flex-1 bg-border min-h-[16px]" />}
            </div>

            {/* Content */}
            <div className="flex-1 pb-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium">
                    {config.label}
                    {entry.userName && (
                      <span className="text-muted-foreground font-normal">
                        {" "}by {entry.userName}
                        {entry.userTitle && ` (${entry.userTitle})`}
                      </span>
                    )}
                    {isAI && (
                      <Badge variant="outline" className="ml-1.5 text-[9px] px-1 py-0">
                        AI
                      </Badge>
                    )}
                  </p>
                  {entry.fieldChanged && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Field: {entry.fieldChanged}
                    </p>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {formatTimestamp(entry.createdAt)}
                </span>
              </div>

              {hasMetadata && (
                <button
                  onClick={() => toggleExpand(entry.id)}
                  className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  Details
                </button>
              )}

              {isExpanded && entry.metadata && (
                <div className="mt-1.5 rounded-md bg-muted/50 p-2 text-[10px] font-mono">
                  {Object.entries(entry.metadata).map(([key, val]) => (
                    <div key={key} className="flex gap-2">
                      <span className="text-muted-foreground">{key}:</span>
                      <span className="break-all">{typeof val === "string" ? val : JSON.stringify(val)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
