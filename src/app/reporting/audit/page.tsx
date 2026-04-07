"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck,
  Loader2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Download,
  Plus,
  FileText,
  ClipboardList,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTenantHeaders, useTenant } from "@/contexts/tenant-context";

// ─── Types ───

interface ComplianceArea {
  id: string;
  name: string;
  status: "red" | "yellow" | "green";
}

interface Scorecard {
  areas: ComplianceArea[];
  summary: { red: number; yellow: number; green: number; total: number };
  openFindings: number;
  materialWeaknesses: number;
  overdueReports: number;
}

interface AuditFinding {
  id: string;
  auditYear: number;
  findingNumber: string;
  title: string;
  description: string;
  complianceArea: string;
  severity: string;
  status: string;
  award?: { title: string; program: string };
  correctiveActions: CorrectiveAction[];
}

interface CorrectiveAction {
  id: string;
  action: string;
  responsible: string;
  targetDate: string;
  status: string;
  completedAt?: string;
}

interface ChecklistSummary {
  id: string;
  template: string;
  title: string;
  status: string;
  completedItems: number;
  totalItems: number;
  award: { title: string; program: string };
}

// ─── Helpers ───

function statusIcon(status: string) {
  if (status === "red") return <XCircle className="h-4 w-4 text-red-500" />;
  if (status === "yellow") return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
}

function severityColor(severity: string): string {
  const map: Record<string, string> = {
    material_weakness: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    significant_deficiency: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    finding: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  };
  return map[severity] || "bg-gray-100 text-gray-600";
}

function capStatusColor(status: string): string {
  const map: Record<string, string> = {
    pending: "bg-gray-100 text-gray-700",
    in_progress: "bg-blue-100 text-blue-700",
    completed: "bg-emerald-100 text-emerald-700",
    overdue: "bg-red-100 text-red-700",
  };
  return map[status] || "bg-gray-100 text-gray-600";
}

// ─── Page ───

export default function AuditPage() {
  const headers = useTenantHeaders();
  const tenant = useTenant();
  const [scorecard, setScorecard] = useState<Scorecard | null>(null);
  const [findings, setFindings] = useState<AuditFinding[]>([]);
  const [checklists, setChecklists] = useState<ChecklistSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"scorecard" | "findings" | "checklists">("scorecard");

  const fetchData = useCallback(async () => {
    if (tenant.isLoading) return;
    setLoading(true);
    const h = { ...headers, "Content-Type": "application/json" };
    try {
      const [scorecardRes, findingsRes, checklistsRes] = await Promise.all([
        fetch("/api/compliance?section=scorecard", { headers: h }),
        fetch("/api/compliance?section=findings", { headers: h }),
        fetch("/api/compliance?section=checklists", { headers: h }),
      ]);
      if (scorecardRes.ok) setScorecard(await scorecardRes.json());
      if (findingsRes.ok) { const d = await findingsRes.json(); setFindings(d.findings || []); }
      if (checklistsRes.ok) { const d = await checklistsRes.json(); setChecklists(d.checklists || []); }
    } catch { /* */ }
    setLoading(false);
  }, [headers, tenant.isLoading]);

  useEffect(() => { fetchData(); }, [tenant.isLoading, tenant.portId]);

  if (loading) {
    return <div className="flex-1 flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="h-5 w-5 text-[#3d8b8b]" />
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">2 CFR 200.516</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Audit Readiness</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Compliance scorecard, prior findings, and audit package</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}><RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh</Button>
          <Button variant="outline" size="sm" onClick={() => alert("ZIP export coming soon — will bundle all submitted reports, SEFA, expense ledgers, match docs, and compliance checklists.")}><Download className="h-3.5 w-3.5 mr-1" /> Export Package</Button>
        </div>
      </div>

      {/* Scorecard Summary */}
      {scorecard && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-xs text-muted-foreground uppercase">Compliant</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{scorecard.summary.green}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-xs text-muted-foreground uppercase">Needs Attention</p>
              <p className={`text-2xl font-bold mt-1 ${scorecard.summary.yellow > 0 ? "text-amber-600" : "text-emerald-600"}`}>{scorecard.summary.yellow}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-xs text-muted-foreground uppercase">Non-Compliant</p>
              <p className={`text-2xl font-bold mt-1 ${scorecard.summary.red > 0 ? "text-red-600" : "text-emerald-600"}`}>{scorecard.summary.red}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-xs text-muted-foreground uppercase">Open Findings</p>
              <p className={`text-2xl font-bold mt-1 ${scorecard.openFindings > 0 ? "text-red-600" : "text-emerald-600"}`}>{scorecard.openFindings}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-xs text-muted-foreground uppercase">Overdue Reports</p>
              <p className={`text-2xl font-bold mt-1 ${scorecard.overdueReports > 0 ? "text-red-600" : "text-emerald-600"}`}>{scorecard.overdueReports}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab Selector */}
      <div className="flex items-center gap-2 border-b">
        {[
          { key: "scorecard" as const, label: "Scorecard", icon: ShieldCheck },
          { key: "findings" as const, label: "Findings & CAPs", icon: AlertCircle },
          { key: "checklists" as const, label: "Compliance Checklists", icon: ClipboardList },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key ? "border-[#3d8b8b] text-[#3d8b8b]" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Scorecard Tab */}
      {tab === "scorecard" && scorecard && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">12 Single Audit Compliance Areas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {scorecard.areas.map((area) => (
                <div key={area.id} className="flex items-center gap-3 p-3 rounded-lg border">
                  {statusIcon(area.status)}
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{area.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{area.status === "red" ? "Non-compliant" : area.status === "yellow" ? "Needs attention" : "Compliant"}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Findings Tab */}
      {tab === "findings" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" /> Prior Audit Findings
              </div>
              <Badge variant="outline">{findings.length} total</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {findings.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500 mb-3" />
                <p className="text-sm text-muted-foreground">No prior audit findings recorded</p>
              </div>
            ) : (
              <div className="space-y-4">
                {findings.map((f) => (
                  <div key={f.id} className="p-4 rounded-lg border">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={`text-[10px] ${severityColor(f.severity)}`}>{f.severity.replace("_", " ")}</Badge>
                          <Badge variant="outline" className="text-[10px]">{f.status}</Badge>
                          <span className="text-xs text-muted-foreground">FY{f.auditYear} — {f.findingNumber}</span>
                        </div>
                        <p className="text-sm font-medium">{f.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{f.description}</p>
                      </div>
                    </div>
                    {f.correctiveActions.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Corrective Action Plans</p>
                        {f.correctiveActions.map((cap) => (
                          <div key={cap.id} className="flex items-center justify-between py-1.5">
                            <div className="flex items-center gap-2">
                              <Badge className={`text-[9px] ${capStatusColor(cap.status)}`}>{cap.status}</Badge>
                              <span className="text-xs">{cap.action}</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground">{cap.responsible}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Checklists Tab */}
      {tab === "checklists" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4" /> Compliance Checklists
              </div>
              <Badge variant="outline">{checklists.length} active</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {checklists.length === 0 ? (
              <div className="text-center py-8">
                <ClipboardList className="h-8 w-8 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">No compliance checklists created yet</p>
                <p className="text-xs text-muted-foreground mt-1">Checklists are auto-attached when awards are configured with applicable regulations</p>
              </div>
            ) : (
              <div className="space-y-3">
                {checklists.map((cl) => {
                  const pct = cl.totalItems > 0 ? Math.round((cl.completedItems / cl.totalItems) * 100) : 0;
                  return (
                    <div key={cl.id} className="p-4 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-sm font-medium">{cl.title}</p>
                          <p className="text-xs text-muted-foreground">{cl.award.program} — {cl.award.title}</p>
                        </div>
                        <Badge className={cl.status === "compliant" ? "bg-emerald-100 text-emerald-700" : cl.status === "non_compliant" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}>
                          {cl.status.replace("_", " ")}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${pct === 100 ? "bg-emerald-500" : "bg-[#3d8b8b]"}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs tabular-nums text-muted-foreground">{cl.completedItems}/{cl.totalItems}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
