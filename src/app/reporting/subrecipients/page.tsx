"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Plus,
  Shield,
  FileText,
  DollarSign,
  CheckCircle2,
  XCircle,
  ChevronRight,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTenantHeaders, useTenant } from "@/contexts/tenant-context";

// ─── Types ───

interface SubrecipientReport {
  id: string;
  reportType: string;
  title: string;
  dueDate: string;
  status: string;
  receivedDate?: string;
}

interface Subrecipient {
  id: string;
  awardId: string;
  entityName: string;
  uei?: string;
  classification: string;
  riskLevel: string;
  monitoringIntensity: string;
  subawardAmount: number;
  cumulativeSpend: number;
  singleAuditRequired: boolean;
  status: string;
  reports: SubrecipientReport[];
  award: { title: string; program: string; fain?: string };
}

interface Award {
  id: string;
  title: string;
  program: string;
}

// ─── Helpers ───

function fmt(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

function fmtFull(n: number): string { return `$${n.toLocaleString()}`; }

function riskColor(level: string): string {
  const map: Record<string, string> = {
    low: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    standard: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    elevated: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
  return map[level] || "bg-gray-100 text-gray-600";
}

// ─── Classification Wizard ───

const CLASSIFICATION_QUESTIONS = [
  { id: "q1", text: "Does the entity determine who is eligible to receive federal assistance?" },
  { id: "q2", text: "Does the entity have its performance measured against program objectives?" },
  { id: "q3", text: "Does the entity have responsibility for programmatic decision-making?" },
  { id: "q4", text: "Does the entity have responsibility for adherence to applicable federal program requirements?" },
  { id: "q5", text: "Does the entity use federal funds to carry out a program vs. providing goods/services?" },
];

// ─── Page ───

export default function SubrecipientsPage() {
  const headers = useTenantHeaders();
  const tenant = useTenant();
  const [subs, setSubs] = useState<Subrecipient[]>([]);
  const [awards, setAwards] = useState<Award[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);

  const fetchData = useCallback(async () => {
    if (tenant.isLoading) return;
    setLoading(true);
    try {
      const [subsRes, awardsRes] = await Promise.all([
        fetch("/api/subrecipients", { headers: { ...headers, "Content-Type": "application/json" } }),
        fetch("/api/awards", { headers: { ...headers, "Content-Type": "application/json" } }),
      ]);
      if (subsRes.ok) {
        const data = await subsRes.json();
        setSubs(data.subrecipients || []);
      }
      if (awardsRes.ok) {
        const data = await awardsRes.json();
        setAwards(data.awards || data || []);
      }
    } catch { /* */ }
    setLoading(false);
  }, [headers, tenant.isLoading]);

  useEffect(() => { fetchData(); }, [tenant.isLoading, tenant.portId]);

  // ─── Wizard ───

  if (showWizard) {
    return (
      <ClassificationWizard
        awards={awards}
        headers={headers}
        onBack={() => setShowWizard(false)}
        onCreated={() => { setShowWizard(false); fetchData(); }}
      />
    );
  }

  if (loading) {
    return <div className="flex-1 flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  // Stats
  const totalSubs = subs.filter((s) => s.classification === "subrecipient").length;
  const totalContractors = subs.filter((s) => s.classification === "contractor").length;
  const highRisk = subs.filter((s) => s.riskLevel === "high" || s.riskLevel === "elevated").length;
  const overdueReports = subs.flatMap((s) => s.reports).filter((r) => r.status === "pending" && new Date(r.dueDate) < new Date()).length;
  const nearThreshold = subs.filter((s) => {
    const spend = Number(s.cumulativeSpend);
    return spend >= 600000 && spend < 750000;
  }).length;

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-5 w-5 text-[#3d8b8b]" />
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">2 CFR 200.331-332</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Subrecipient Monitoring</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Classification, risk assessment, and report collection</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}><RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh</Button>
          <Button size="sm" onClick={() => setShowWizard(true)}><Plus className="h-3.5 w-3.5 mr-1" /> Add Entity</Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-xs text-muted-foreground uppercase">Subrecipients</p>
            <p className="text-2xl font-bold text-[#3d8b8b] mt-1">{totalSubs}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-xs text-muted-foreground uppercase">Contractors</p>
            <p className="text-2xl font-bold mt-1">{totalContractors}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-xs text-muted-foreground uppercase">High/Elevated Risk</p>
            <p className={`text-2xl font-bold mt-1 ${highRisk > 0 ? "text-red-600" : "text-emerald-600"}`}>{highRisk}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-xs text-muted-foreground uppercase">Overdue Reports</p>
            <p className={`text-2xl font-bold mt-1 ${overdueReports > 0 ? "text-red-600" : "text-emerald-600"}`}>{overdueReports}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-xs text-muted-foreground uppercase">Near $750K</p>
            <p className={`text-2xl font-bold mt-1 ${nearThreshold > 0 ? "text-amber-600" : "text-emerald-600"}`}>{nearThreshold}</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" /> All Entities
          </CardTitle>
        </CardHeader>
        <CardContent>
          {subs.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-8 w-8 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">No subrecipients or contractors added yet</p>
              <Button size="sm" className="mt-3" onClick={() => setShowWizard(true)}><Plus className="h-3.5 w-3.5 mr-1" /> Add First Entity</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground uppercase">Entity</th>
                    <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground uppercase">Award</th>
                    <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground uppercase">Type</th>
                    <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground uppercase">Risk</th>
                    <th className="text-right py-2 pr-4 text-xs font-medium text-muted-foreground uppercase">Subaward</th>
                    <th className="text-right py-2 pr-4 text-xs font-medium text-muted-foreground uppercase">Spend</th>
                    <th className="text-left py-2 text-xs font-medium text-muted-foreground uppercase">Reports</th>
                    <th className="py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {subs.map((sub) => {
                    const spend = Number(sub.cumulativeSpend);
                    const nearLimit = spend >= 600000 && spend < 750000;
                    const overLimit = spend >= 750000;
                    const overdueCount = sub.reports.filter((r) => r.status === "pending" && new Date(r.dueDate) < new Date()).length;

                    return (
                      <tr key={sub.id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="py-2.5 pr-4">
                          <div>
                            <p className="font-medium">{sub.entityName}</p>
                            {sub.uei && <p className="text-xs text-muted-foreground">UEI: {sub.uei}</p>}
                          </div>
                        </td>
                        <td className="py-2.5 pr-4">
                          <Badge variant="outline" className="text-[10px]">{sub.award.program}</Badge>
                        </td>
                        <td className="py-2.5 pr-4">
                          <Badge className={sub.classification === "subrecipient" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" : "bg-gray-100 text-gray-700"} >
                            {sub.classification}
                          </Badge>
                        </td>
                        <td className="py-2.5 pr-4">
                          <Badge className={`text-[10px] ${riskColor(sub.riskLevel)}`}>{sub.riskLevel}</Badge>
                        </td>
                        <td className="py-2.5 pr-4 text-right tabular-nums">{fmt(Number(sub.subawardAmount))}</td>
                        <td className="py-2.5 pr-4 text-right">
                          <span className={`tabular-nums font-medium ${overLimit ? "text-red-600" : nearLimit ? "text-amber-600" : ""}`}>
                            {fmt(spend)}
                          </span>
                          {(nearLimit || overLimit) && (
                            <p className="text-[10px] text-amber-600">{overLimit ? "Single Audit req'd" : "Approaching $750K"}</p>
                          )}
                        </td>
                        <td className="py-2.5">
                          {sub.reports.length === 0 ? (
                            <span className="text-xs text-muted-foreground">-</span>
                          ) : (
                            <div className="flex items-center gap-1">
                              <span className="text-xs tabular-nums">{sub.reports.filter((r) => r.status === "received").length}/{sub.reports.length}</span>
                              {overdueCount > 0 && (
                                <Badge className="bg-red-100 text-red-700 text-[9px]">{overdueCount} overdue</Badge>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 text-center">
                          <span
                            onClick={async () => {
                              if (!confirm(`Delete ${sub.entityName}?`)) return;
                              await fetch("/api/subrecipients", {
                                method: "DELETE",
                                headers: { ...headers, "Content-Type": "application/json" },
                                body: JSON.stringify({ id: sub.id }),
                              });
                              fetchData();
                            }}
                            className="inline-flex p-1 rounded cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30 text-muted-foreground hover:text-red-600 transition-colors"
                            title="Delete subrecipient"
                          >
                            <X className="h-3.5 w-3.5" />
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Classification Wizard Component ───

function ClassificationWizard({ awards, headers, onBack, onCreated }: {
  awards: Award[];
  headers: Record<string, string>;
  onBack: () => void;
  onCreated: () => void;
}) {
  const [step, setStep] = useState(0); // 0=info, 1=classification, 2=risk, 3=review
  const [entityName, setEntityName] = useState("");
  const [uei, setUei] = useState("");
  const [selectedAwardId, setSelectedAwardId] = useState(awards[0]?.id || "");
  const [subawardAmount, setSubawardAmount] = useState("");
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [riskFactors, setRiskFactors] = useState<Record<string, boolean>>({
    newEntity: false, priorFindings: false, highSpend: false, noSingleAudit: false, lateReporting: false,
  });
  const [saving, setSaving] = useState(false);

  const yesCount = Object.values(answers).filter(Boolean).length;
  const classification = yesCount >= 3 ? "subrecipient" : "contractor";

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/subrecipients", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          awardId: selectedAwardId,
          entityName,
          uei: uei || undefined,
          subawardAmount: parseFloat(subawardAmount) || 0,
          classificationAnswers: CLASSIFICATION_QUESTIONS.map((q) => ({
            questionId: q.id,
            question: q.text,
            answer: answers[q.id] || false,
          })),
          riskFactors,
        }),
      });
      if (res.ok) onCreated();
    } catch { /* */ }
    setSaving(false);
  };

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <div>
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3">
          <ChevronRight className="h-4 w-4 rotate-180" /> Back
        </button>
        <h1 className="text-2xl font-bold tracking-tight">Add Entity</h1>
        <p className="text-sm text-muted-foreground mt-1">Classification wizard per 2 CFR 200.331</p>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2">
        {["Entity Info", "Classification", "Risk Assessment", "Review"].map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <button
              onClick={() => i <= step ? setStep(i) : null}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                i === step ? "bg-[#3d8b8b] text-white" : i < step ? "bg-[#3d8b8b]/10 text-[#3d8b8b]" : "bg-muted text-muted-foreground"
              }`}
            >
              {i < step ? <CheckCircle2 className="h-3 w-3" /> : null}
              {label}
            </button>
            {i < 3 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {/* Step 0: Info */}
      {step === 0 && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1">Entity Name *</label>
              <input value={entityName} onChange={(e) => setEntityName(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="e.g., ABC Engineering Corp" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">UEI (optional)</label>
              <input value={uei} onChange={(e) => setUei(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Unique Entity Identifier" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Award *</label>
              <select value={selectedAwardId} onChange={(e) => setSelectedAwardId(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                {awards.map((a) => <option key={a.id} value={a.id}>{a.program} — {a.title}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Subaward Amount *</label>
              <input type="number" value={subawardAmount} onChange={(e) => setSubawardAmount(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="0" />
            </div>
            <Button onClick={() => setStep(1)} disabled={!entityName || !subawardAmount}>Next: Classification</Button>
          </CardContent>
        </Card>
      )}

      {/* Step 1: Classification questions */}
      {step === 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Subrecipient vs Contractor (2 CFR 200.331)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {CLASSIFICATION_QUESTIONS.map((q) => (
              <div key={q.id} className="flex items-start gap-3 p-3 rounded-lg border">
                <div className="flex gap-2 shrink-0 mt-0.5">
                  <button
                    onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: true }))}
                    className={`px-2 py-1 rounded text-xs font-medium ${answers[q.id] === true ? "bg-[#3d8b8b] text-white" : "bg-muted"}`}
                  >Yes</button>
                  <button
                    onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: false }))}
                    className={`px-2 py-1 rounded text-xs font-medium ${answers[q.id] === false ? "bg-gray-600 text-white" : "bg-muted"}`}
                  >No</button>
                </div>
                <p className="text-sm">{q.text}</p>
              </div>
            ))}
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30">
              <Shield className={`h-5 w-5 ${classification === "subrecipient" ? "text-purple-500" : "text-gray-500"}`} />
              <div>
                <p className="text-sm font-medium">Classification: <span className={classification === "subrecipient" ? "text-purple-600" : ""}>{classification}</span></p>
                <p className="text-xs text-muted-foreground">{yesCount}/5 criteria met — {classification === "subrecipient" ? "monitoring obligations apply" : "standard contract management"}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(0)}>Back</Button>
              <Button onClick={() => setStep(2)}>Next: Risk Assessment</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Risk Assessment */}
      {step === 2 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Risk Assessment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { key: "newEntity", label: "New entity (no prior federal award history)" },
              { key: "priorFindings", label: "Prior audit findings or questioned costs" },
              { key: "highSpend", label: "High spend volume (>$500K subaward)" },
              { key: "noSingleAudit", label: "No Single Audit on file when required" },
              { key: "lateReporting", label: "History of late or incomplete reporting" },
            ].map((factor) => (
              <label key={factor.key} className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50">
                <input
                  type="checkbox"
                  checked={riskFactors[factor.key] || false}
                  onChange={(e) => setRiskFactors((prev) => ({ ...prev, [factor.key]: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">{factor.label}</span>
              </label>
            ))}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={() => setStep(3)}>Next: Review</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Review & Create</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">Entity:</span> <span className="font-medium">{entityName}</span></div>
              <div><span className="text-muted-foreground">UEI:</span> <span className="font-medium">{uei || "N/A"}</span></div>
              <div><span className="text-muted-foreground">Subaward:</span> <span className="font-medium">{fmtFull(parseFloat(subawardAmount) || 0)}</span></div>
              <div><span className="text-muted-foreground">Classification:</span> <Badge className={classification === "subrecipient" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-700"}>{classification}</Badge></div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
                Create Entity
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
