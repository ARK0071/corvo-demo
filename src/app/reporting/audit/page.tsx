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
  ClipboardList,
  ChevronDown,
  ChevronRight,
  Trash2,
  Star,
  BookOpen,
  Check,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTenantHeaders, useTenant } from "@/contexts/tenant-context";

// ─── Types ───

interface Reason {
  type: string;
  label: string;
  entityId?: string;
  severity?: string;
}

interface ComplianceArea {
  id: string;
  name: string;
  status: "red" | "yellow" | "green";
  reasons: Reason[];
}

interface Scorecard {
  areas: ComplianceArea[];
  summary: { red: number; yellow: number; green: number; total: number };
  openFindings: number;
  materialWeaknesses: number;
  overdueReports: number;
}

interface CorrectiveAction {
  id: string;
  action: string;
  responsible: string;
  targetDate: string;
  status: string;
  completedAt?: string;
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
  award?: { id: string; title: string; program: string };
  correctiveActions: CorrectiveAction[];
}

interface ChecklistItem {
  id: string;
  section: string;
  requirement: string;
  cfrReference: string | null;
  isCompleted: boolean;
  completedAt: string | null;
  completedBy: string | null;
  notes: string;
  sortOrder: number;
}

interface ChecklistFull {
  id: string;
  template: string;
  title: string;
  status: string;
  completedItems: number;
  totalItems: number;
  award: { title: string; program: string };
  items: ChecklistItem[];
}

interface AwardOption {
  id: string;
  title: string;
  program: string;
  awardingAgency: string;
  budgetCategoryNames: string[];
  existingTemplates: string[];
}

interface TemplateOption {
  key: string;
  title: string;
  itemCount: number;
}

// ─── Constants ───

const COMPLIANCE_AREAS = [
  { id: "activities_allowed", name: "Activities Allowed/Unallowed" },
  { id: "allowable_costs", name: "Allowable Costs/Cost Principles" },
  { id: "cash_management", name: "Cash Management" },
  { id: "eligibility", name: "Eligibility" },
  { id: "equipment", name: "Equipment/Real Property" },
  { id: "matching", name: "Matching/Level of Effort" },
  { id: "period_of_performance", name: "Period of Performance" },
  { id: "procurement", name: "Procurement/Suspension/Debarment" },
  { id: "program_income", name: "Program Income" },
  { id: "reporting", name: "Reporting" },
  { id: "subrecipient_monitoring", name: "Subrecipient Monitoring" },
  { id: "special_tests", name: "Special Tests and Provisions" },
];

const SEVERITY_OPTIONS = [
  { value: "material_weakness", label: "Material Weakness" },
  { value: "significant_deficiency", label: "Significant Deficiency" },
  { value: "finding", label: "Finding" },
];

const FINDING_STATUSES = ["open", "in_progress", "remediated", "closed"];
const CAP_STATUSES = ["pending", "in_progress", "completed", "overdue"];

const BABA_PROGRAMS = ["PIDP", "CRISI", "INFRA", "RAISE", "Mega"];
const DOT_AGENCIES = ["MARAD", "FRA", "FTA", "FHWA", "FAA"];

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
    pending: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    overdue: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
  return map[status] || "bg-gray-100 text-gray-600";
}

function findingStatusColor(status: string): string {
  const map: Record<string, string> = {
    open: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    remediated: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    closed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  };
  return map[status] || "bg-gray-100 text-gray-600";
}

function isTemplateRecommended(template: string, award: AwardOption): boolean {
  if (template === "buy_america") return BABA_PROGRAMS.some(p => award.program.includes(p));
  if (template === "davis_bacon") return award.budgetCategoryNames.some(n => n.toLowerCase().includes("construction"));
  if (template === "nepa") return true;
  if (template === "title_vi_dbe") return DOT_AGENCIES.some(a => award.awardingAgency.includes(a));
  return false;
}

// ─── Page ───

export default function AuditPage() {
  const headers = useTenantHeaders();
  const tenant = useTenant();

  const [scorecard, setScorecard] = useState<Scorecard | null>(null);
  const [findings, setFindings] = useState<AuditFinding[]>([]);
  const [checklists, setChecklists] = useState<ChecklistFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"scorecard" | "findings" | "checklists">("scorecard");

  // Expandable state
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set());
  const [expandedChecklists, setExpandedChecklists] = useState<Set<string>>(new Set());

  // Dialog state
  const [showFindingDialog, setShowFindingDialog] = useState(false);
  const [showCAPDialog, setShowCAPDialog] = useState<string | null>(null);
  const [showChecklistDialog, setShowChecklistDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: "finding" | "cap" | "checklist"; id: string; label: string } | null>(null);

  // Award/template data for checklist dialog
  const [awardOptions, setAwardOptions] = useState<AwardOption[]>([]);
  const [templateOptions, setTemplateOptions] = useState<TemplateOption[]>([]);

  // Form state for Add Finding
  const [findingForm, setFindingForm] = useState({
    auditYear: new Date().getFullYear(),
    findingNumber: "",
    title: "",
    description: "",
    complianceArea: "",
    severity: "",
    awardId: "",
  });

  // Form state for Add CAP
  const [capForm, setCAPForm] = useState({
    actionText: "",
    responsible: "",
    targetDate: "",
  });

  // Form state for Attach Checklist
  const [checklistForm, setChecklistForm] = useState({
    awardId: "",
    template: "",
  });

  const [submitting, setSubmitting] = useState(false);

  // Awards list for finding dialog
  const [findingAwards, setFindingAwards] = useState<{ id: string; title: string; program: string }[]>([]);

  const h = useCallback(() => ({ ...headers, "Content-Type": "application/json" }), [headers]);

  const fetchData = useCallback(async () => {
    if (tenant.isLoading) return;
    setLoading(true);
    try {
      const [scorecardRes, findingsRes, checklistsRes] = await Promise.all([
        fetch("/api/compliance?section=scorecard", { headers: h() }),
        fetch("/api/compliance?section=findings", { headers: h() }),
        fetch("/api/compliance?section=checklists", { headers: h() }),
      ]);
      if (scorecardRes.ok) setScorecard(await scorecardRes.json());
      if (findingsRes.ok) {
        const d = await findingsRes.json();
        setFindings(d.findings || []);
      }
      if (checklistsRes.ok) {
        const d = await checklistsRes.json();
        setChecklists(d.checklists || []);
      }
    } catch { /* network error — keep existing state */ }
    setLoading(false);
  }, [h, tenant.isLoading]);

  const fetchAwardsAndTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/compliance?section=awards", { headers: h() });
      if (res.ok) {
        const d = await res.json();
        setAwardOptions(d.awards || []);
        setTemplateOptions(d.templates || []);
        setFindingAwards((d.awards || []).map((a: AwardOption) => ({ id: a.id, title: a.title, program: a.program })));
      }
    } catch { /* */ }
  }, [h]);

  useEffect(() => { fetchData(); }, [tenant.isLoading, tenant.portId]);

  // Toggle expand for scorecard areas
  const toggleArea = (id: string) => {
    setExpandedAreas(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Toggle expand for checklists
  const toggleChecklist = (id: string) => {
    setExpandedChecklists(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // ─── CRUD: Add Finding ───
  const handleAddFinding = async () => {
    if (!findingForm.title || !findingForm.findingNumber || !findingForm.complianceArea || !findingForm.severity) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/compliance", {
        method: "POST",
        headers: h(),
        body: JSON.stringify({
          action: "createFinding",
          awardId: findingForm.awardId || null,
          auditYear: findingForm.auditYear,
          findingNumber: findingForm.findingNumber,
          title: findingForm.title,
          description: findingForm.description,
          complianceArea: findingForm.complianceArea,
          severity: findingForm.severity,
        }),
      });
      if (res.ok) {
        setShowFindingDialog(false);
        setFindingForm({ auditYear: new Date().getFullYear(), findingNumber: "", title: "", description: "", complianceArea: "", severity: "", awardId: "" });
        fetchData();
      }
    } catch { /* */ }
    setSubmitting(false);
  };

  // ─── CRUD: Add CAP ───
  const handleAddCAP = async () => {
    if (!showCAPDialog || !capForm.actionText || !capForm.responsible || !capForm.targetDate) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/compliance", {
        method: "POST",
        headers: h(),
        body: JSON.stringify({
          action: "createCAP",
          findingId: showCAPDialog,
          actionText: capForm.actionText,
          responsible: capForm.responsible,
          targetDate: capForm.targetDate,
        }),
      });
      if (res.ok) {
        setShowCAPDialog(null);
        setCAPForm({ actionText: "", responsible: "", targetDate: "" });
        fetchData();
      }
    } catch { /* */ }
    setSubmitting(false);
  };

  // ─── CRUD: Update Status ───
  const updateFindingStatus = async (findingId: string, status: string) => {
    try {
      await fetch("/api/compliance", {
        method: "PUT",
        headers: h(),
        body: JSON.stringify({ action: "updateFindingStatus", findingId, status }),
      });
      fetchData();
    } catch { /* */ }
  };

  const updateCAPStatus = async (capId: string, status: string) => {
    try {
      await fetch("/api/compliance", {
        method: "PUT",
        headers: h(),
        body: JSON.stringify({ action: "updateCAPStatus", capId, status }),
      });
      fetchData();
    } catch { /* */ }
  };

  // ─── CRUD: Delete ───
  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/compliance?entity=${deleteConfirm.type === "cap" ? "cap" : deleteConfirm.type}&id=${deleteConfirm.id}`, {
        method: "DELETE",
        headers: h(),
      });
      if (res.ok) {
        setDeleteConfirm(null);
        fetchData();
      }
    } catch { /* */ }
    setSubmitting(false);
  };

  // ─── CRUD: Toggle Checklist Item ───
  const toggleChecklistItem = async (itemId: string, completed: boolean) => {
    try {
      await fetch("/api/compliance", {
        method: "PUT",
        headers: h(),
        body: JSON.stringify({ action: "toggleItem", itemId, completed }),
      });
      fetchData();
    } catch { /* */ }
  };

  // ─── CRUD: Attach Checklist ───
  const handleAttachChecklist = async () => {
    if (!checklistForm.awardId || !checklistForm.template) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/compliance", {
        method: "POST",
        headers: h(),
        body: JSON.stringify({
          action: "createChecklist",
          awardId: checklistForm.awardId,
          template: checklistForm.template,
        }),
      });
      if (res.ok) {
        setShowChecklistDialog(false);
        setChecklistForm({ awardId: "", template: "" });
        fetchData();
        fetchAwardsAndTemplates();
      }
    } catch { /* */ }
    setSubmitting(false);
  };

  // Selected award for checklist dialog
  const selectedChecklistAward = awardOptions.find(a => a.id === checklistForm.awardId);

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

      {/* ═══════════════════════════════════════ */}
      {/* Scorecard Tab — Expandable Areas       */}
      {/* ═══════════════════════════════════════ */}
      {tab === "scorecard" && scorecard && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">12 Single Audit Compliance Areas</CardTitle>
            <p className="text-xs text-muted-foreground">Click any area to see the specific issues driving its status</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {scorecard.areas.map((area) => {
                const isExpanded = expandedAreas.has(area.id);
                const hasReasons = area.reasons && area.reasons.length > 0;
                return (
                  <div key={area.id} className={`rounded-lg border transition-colors ${area.status !== "green" ? "border-l-2" : ""} ${area.status === "red" ? "border-l-red-500" : area.status === "yellow" ? "border-l-amber-500" : ""}`}>
                    <button
                      onClick={() => toggleArea(area.id)}
                      className="flex items-center gap-3 p-3 w-full text-left hover:bg-muted/50 rounded-lg transition-colors"
                    >
                      {statusIcon(area.status)}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{area.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {area.status === "red" ? "Non-compliant" : area.status === "yellow" ? "Needs attention" : "Compliant"}
                          {hasReasons && ` — ${area.reasons.length} issue${area.reasons.length !== 1 ? "s" : ""}`}
                        </p>
                      </div>
                      {hasReasons ? (
                        isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      ) : null}
                    </button>
                    {isExpanded && (
                      <div className="px-3 pb-3 pt-0">
                        <div className="border-t pt-2 space-y-1.5">
                          {hasReasons ? area.reasons.map((r, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs">
                              <span className="mt-0.5 shrink-0">
                                {r.type === "finding" || r.type === "material_weakness" ? <XCircle className="h-3 w-3 text-red-500" /> :
                                 r.type === "overdue_report" || r.type === "overdue_sub_report" || r.type === "expired" ? <AlertCircle className="h-3 w-3 text-red-500" /> :
                                 r.type === "flagged_expense" || r.type === "stale_drawdown" || r.type === "high_risk_sub" || r.type === "expiring_soon" || r.type === "match_gap" ? <AlertTriangle className="h-3 w-3 text-amber-500" /> :
                                 <AlertCircle className="h-3 w-3 text-muted-foreground" />}
                              </span>
                              <span className="text-muted-foreground">{r.label}</span>
                            </div>
                          )) : (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                              No issues detected
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══════════════════════════════════════ */}
      {/* Findings & CAPs Tab — Full CRUD        */}
      {/* ═══════════════════════════════════════ */}
      {tab === "findings" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" /> Prior Audit Findings
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{findings.length} total</Badge>
                <Button size="sm" onClick={() => { setShowFindingDialog(true); fetchAwardsAndTemplates(); }}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Finding
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {findings.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500 mb-3" />
                <p className="text-sm text-muted-foreground">No prior audit findings recorded</p>
                <p className="text-xs text-muted-foreground mt-1">Click &quot;Add Finding&quot; to record a finding from a prior audit</p>
              </div>
            ) : (
              <div className="space-y-4">
                {findings.map((f) => (
                  <div key={f.id} className="p-4 rounded-lg border">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge className={`text-[10px] ${severityColor(f.severity)}`}>{f.severity.replace(/_/g, " ")}</Badge>
                          <span className="text-xs text-muted-foreground">FY{f.auditYear} — {f.findingNumber}</span>
                          {f.award && <Badge variant="outline" className="text-[10px]">{f.award.program}: {f.award.title}</Badge>}
                        </div>
                        <p className="text-sm font-medium">{f.title}</p>
                        {f.description && <p className="text-xs text-muted-foreground mt-1">{f.description}</p>}
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Area: {COMPLIANCE_AREAS.find(a => a.id === f.complianceArea)?.name || f.complianceArea}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Select value={f.status} onValueChange={(val) => updateFindingStatus(f.id, val)}>
                          <SelectTrigger size="sm" className={`h-7 text-[10px] ${findingStatusColor(f.status)}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FINDING_STATUSES.map(s => (
                              <SelectItem key={s} value={s} className="text-xs">{s.replace(/_/g, " ")}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600"
                          onClick={() => setDeleteConfirm({ type: "finding", id: f.id, label: `Finding ${f.findingNumber}: ${f.title}` })}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Corrective Action Plans */}
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-muted-foreground">Corrective Action Plans</p>
                        <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setShowCAPDialog(f.id)}>
                          <Plus className="h-3 w-3 mr-1" /> Add CAP
                        </Button>
                      </div>
                      {f.correctiveActions.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">No corrective actions — click &quot;Add CAP&quot; to create one</p>
                      ) : (
                        <div className="space-y-2">
                          {f.correctiveActions.map((cap) => (
                            <div key={cap.id} className="flex items-start justify-between gap-2 py-1.5 px-2 rounded bg-muted/30">
                              <div className="min-w-0 flex-1">
                                <p className="text-xs">{cap.action}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[10px] text-muted-foreground">{cap.responsible}</span>
                                  <span className="text-[10px] text-muted-foreground">Due: {new Date(cap.targetDate).toLocaleDateString()}</span>
                                  {cap.completedAt && <span className="text-[10px] text-emerald-600">Completed: {new Date(cap.completedAt).toLocaleDateString()}</span>}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <Select value={cap.status} onValueChange={(val) => updateCAPStatus(cap.id, val)}>
                                  <SelectTrigger size="sm" className={`h-6 text-[9px] ${capStatusColor(cap.status)}`}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {CAP_STATUSES.map(s => (
                                      <SelectItem key={s} value={s} className="text-xs">{s.replace(/_/g, " ")}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-muted-foreground hover:text-red-600"
                                  onClick={() => setDeleteConfirm({ type: "cap", id: cap.id, label: cap.action })}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* Checklists Tab — Attach + Interactive Items    */}
      {/* ═══════════════════════════════════════════════ */}
      {tab === "checklists" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4" /> Compliance Checklists
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{checklists.length} active</Badge>
                <Button size="sm" onClick={() => { setShowChecklistDialog(true); fetchAwardsAndTemplates(); }}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Attach Checklist
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {checklists.length === 0 ? (
              <div className="text-center py-8">
                <ClipboardList className="h-8 w-8 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">No compliance checklists created yet</p>
                <p className="text-xs text-muted-foreground mt-1">Click &quot;Attach Checklist&quot; to add a regulatory checklist to an award</p>
              </div>
            ) : (
              <div className="space-y-3">
                {checklists.map((cl) => {
                  const pct = cl.totalItems > 0 ? Math.round((cl.completedItems / cl.totalItems) * 100) : 0;
                  const isExpanded = expandedChecklists.has(cl.id);
                  const groupedItems = cl.items?.reduce<Record<string, ChecklistItem[]>>((acc, item) => {
                    (acc[item.section] = acc[item.section] || []).push(item);
                    return acc;
                  }, {}) || {};

                  return (
                    <div key={cl.id} className="rounded-lg border">
                      <button
                        onClick={() => toggleChecklist(cl.id)}
                        className="flex items-center gap-3 p-4 w-full text-left hover:bg-muted/50 transition-colors rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="text-sm font-medium">{cl.title}</p>
                              <p className="text-xs text-muted-foreground">{cl.award.program} — {cl.award.title}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={cl.status === "compliant" ? "bg-emerald-100 text-emerald-700" : cl.status === "non_compliant" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}>
                                {cl.status.replace(/_/g, " ")}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${pct === 100 ? "bg-emerald-500" : "bg-[#3d8b8b]"}`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs tabular-nums text-muted-foreground">{cl.completedItems}/{cl.totalItems}</span>
                          </div>
                        </div>
                        {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-4 space-y-4">
                          <div className="border-t pt-3 flex items-center justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-muted-foreground hover:text-red-600"
                              onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ type: "checklist", id: cl.id, label: cl.title }); }}
                            >
                              <Trash2 className="h-3 w-3 mr-1" /> Remove Checklist
                            </Button>
                          </div>
                          {Object.entries(groupedItems).map(([section, items]) => (
                            <div key={section}>
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{section}</p>
                              <div className="space-y-1">
                                {items.map((item) => (
                                  <div key={item.id} className={`flex items-start gap-3 p-2.5 rounded-md border transition-colors ${item.isCompleted ? "bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-800/30" : "hover:bg-muted/50"}`}>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); toggleChecklistItem(item.id, !item.isCompleted); }}
                                      className={`mt-0.5 shrink-0 h-4 w-4 rounded border flex items-center justify-center transition-colors ${item.isCompleted ? "bg-emerald-500 border-emerald-500 text-white" : "border-gray-300 hover:border-[#3d8b8b]"}`}
                                    >
                                      {item.isCompleted && <Check className="h-3 w-3" />}
                                    </button>
                                    <div className="min-w-0 flex-1">
                                      <p className={`text-xs ${item.isCompleted ? "line-through text-muted-foreground" : ""}`}>{item.requirement}</p>
                                      <div className="flex items-center gap-2 mt-0.5">
                                        {item.cfrReference && (
                                          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                                            <BookOpen className="h-2.5 w-2.5" /> {item.cfrReference}
                                          </span>
                                        )}
                                        {item.isCompleted && item.completedBy && (
                                          <span className="text-[10px] text-emerald-600">by {item.completedBy} on {item.completedAt ? new Date(item.completedAt).toLocaleDateString() : ""}</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ════════════════════ */}
      {/* Add Finding Dialog  */}
      {/* ════════════════════ */}
      <Dialog open={showFindingDialog} onOpenChange={setShowFindingDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Audit Finding</DialogTitle>
            <DialogDescription>Record a finding from a prior single audit or monitoring review.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="auditYear">Audit Year</Label>
                <Input id="auditYear" type="number" value={findingForm.auditYear} onChange={e => setFindingForm(p => ({ ...p, auditYear: parseInt(e.target.value) || new Date().getFullYear() }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="findingNumber">Finding Number</Label>
                <Input id="findingNumber" placeholder="e.g. 2024-001" value={findingForm.findingNumber} onChange={e => setFindingForm(p => ({ ...p, findingNumber: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="findingTitle">Title</Label>
              <Input id="findingTitle" placeholder="Brief finding title" value={findingForm.title} onChange={e => setFindingForm(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="findingDesc">Description</Label>
              <Textarea id="findingDesc" placeholder="Detailed description of the finding..." rows={3} value={findingForm.description} onChange={e => setFindingForm(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Compliance Area</Label>
                <Select value={findingForm.complianceArea} onValueChange={val => setFindingForm(p => ({ ...p, complianceArea: val }))}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select area" /></SelectTrigger>
                  <SelectContent>
                    {COMPLIANCE_AREAS.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Severity</Label>
                <Select value={findingForm.severity} onValueChange={val => setFindingForm(p => ({ ...p, severity: val }))}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select severity" /></SelectTrigger>
                  <SelectContent>
                    {SEVERITY_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Linked Award (Optional)</Label>
              <Select value={findingForm.awardId || "none"} onValueChange={val => setFindingForm(p => ({ ...p, awardId: val === "none" ? "" : val }))}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Organization-wide" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Organization-wide (no specific award)</SelectItem>
                  {findingAwards.map(a => <SelectItem key={a.id} value={a.id}>{a.program}: {a.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFindingDialog(false)}>Cancel</Button>
            <Button onClick={handleAddFinding} disabled={submitting || !findingForm.title || !findingForm.findingNumber || !findingForm.complianceArea || !findingForm.severity}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
              Add Finding
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════ */}
      {/* Add CAP Dialog  */}
      {/* ═══════════════ */}
      <Dialog open={!!showCAPDialog} onOpenChange={(open) => { if (!open) setShowCAPDialog(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Corrective Action Plan</DialogTitle>
            <DialogDescription>Define a corrective action to address this finding.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="capAction">Action</Label>
              <Textarea id="capAction" placeholder="Describe the corrective action..." rows={3} value={capForm.actionText} onChange={e => setCAPForm(p => ({ ...p, actionText: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="capResponsible">Responsible Party</Label>
                <Input id="capResponsible" placeholder="e.g. CFO, Grants Manager" value={capForm.responsible} onChange={e => setCAPForm(p => ({ ...p, responsible: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="capTargetDate">Target Date</Label>
                <Input id="capTargetDate" type="date" value={capForm.targetDate} onChange={e => setCAPForm(p => ({ ...p, targetDate: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCAPDialog(null)}>Cancel</Button>
            <Button onClick={handleAddCAP} disabled={submitting || !capForm.actionText || !capForm.responsible || !capForm.targetDate}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
              Add CAP
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════ */}
      {/* Attach Checklist Dialog */}
      {/* ═══════════════════════ */}
      <Dialog open={showChecklistDialog} onOpenChange={setShowChecklistDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Attach Compliance Checklist</DialogTitle>
            <DialogDescription>Select an award and a regulatory checklist template. Templates are recommended based on the award&apos;s program and characteristics.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Award</Label>
              <Select value={checklistForm.awardId || "placeholder"} onValueChange={val => { setChecklistForm(p => ({ ...p, awardId: val === "placeholder" ? "" : val, template: "" })); }}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select an award" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="placeholder" disabled>Select an award</SelectItem>
                  {awardOptions.map(a => <SelectItem key={a.id} value={a.id}>{a.program}: {a.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {selectedChecklistAward && (
              <div className="space-y-1.5">
                <Label>Template</Label>
                <div className="space-y-2">
                  {templateOptions.map(t => {
                    const alreadyAttached = selectedChecklistAward.existingTemplates.includes(t.key);
                    const recommended = isTemplateRecommended(t.key, selectedChecklistAward);
                    const isSelected = checklistForm.template === t.key;
                    return (
                      <button
                        key={t.key}
                        disabled={alreadyAttached}
                        onClick={() => setChecklistForm(p => ({ ...p, template: t.key }))}
                        className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
                          alreadyAttached ? "opacity-50 cursor-not-allowed border-muted" :
                          isSelected ? "border-[#3d8b8b] bg-[#3d8b8b]/5" :
                          "border-transparent hover:border-border hover:bg-muted/50"
                        } ${!alreadyAttached && !isSelected ? "border-muted" : ""}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{t.title}</p>
                            <p className="text-xs text-muted-foreground">{t.itemCount} requirements</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {recommended && !alreadyAttached && (
                              <Badge className="bg-amber-100 text-amber-700 text-[10px]">
                                <Star className="h-2.5 w-2.5 mr-0.5" /> Recommended
                              </Badge>
                            )}
                            {alreadyAttached && (
                              <Badge variant="outline" className="text-[10px]">Already attached</Badge>
                            )}
                            {isSelected && <CheckCircle2 className="h-4 w-4 text-[#3d8b8b]" />}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChecklistDialog(false)}>Cancel</Button>
            <Button onClick={handleAttachChecklist} disabled={submitting || !checklistForm.awardId || !checklistForm.template}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
              Attach Checklist
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════════════════════ */}
      {/* Delete Confirmation  */}
      {/* ════════════════════ */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {deleteConfirm?.type === "finding" ? "this finding and all its corrective actions" : deleteConfirm?.type === "checklist" ? "this checklist and all its items" : "this corrective action"}?
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm font-medium truncate">{deleteConfirm?.label}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
