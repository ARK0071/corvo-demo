"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Award as AwardIcon,
  DollarSign,
  FileText,
  Banknote,
  Users,
  ShieldCheck,
  ClipboardList,
  Loader2,
  RefreshCw,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTenantHeaders, useTenant } from "@/contexts/tenant-context";

// ─── Types ───

interface Award {
  id: string;
  fain: string;
  cfda: string;
  awardingAgency: string;
  program: string;
  title: string;
  description: string;
  totalAmount: number;
  budgetCategories: { id: string; name: string; ceiling: number; spent: number }[];
  performancePeriod: { start: string; end: string };
  matchRequirement: { percentage: number; types: string[]; committed: number; required: number };
  matchLedger: { id: string; date: string; description: string; amount: number; type: string }[];
  status: string;
}

interface Expense {
  id: string;
  categoryId: string;
  date: string;
  description: string;
  vendor: string;
  amount: number;
  status: string;
  flagReason?: string;
}

interface DrawdownRequest {
  id: string;
  totalAmount: number;
  status: string;
  submittedDate?: string;
  approvedDate?: string;
  paymentDate?: string;
  notes: string;
  createdAt: string;
}

interface Report {
  id: string;
  type: string;
  title: string;
  dueDate: string;
  periodStart: string;
  periodEnd: string;
  status: string;
}

interface Subrecipient {
  id: string;
  entityName: string;
  classification: string;
  riskLevel: string;
  subawardAmount: number;
  cumulativeSpend: number;
  reports: { id: string; status: string; dueDate: string }[];
}

interface ComplianceChecklist {
  id: string;
  template: string;
  title: string;
  status: string;
  completedItems: number;
  totalItems: number;
}

// ─── Helpers ───

function fmt(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}
function fmtFull(n: number): string { return `$${n.toLocaleString()}`; }
function fmtDate(d: string | null | undefined): string {
  if (!d) return "-";
  try { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); } catch { return d; }
}

// ─── Tab definitions ───

const TABS = [
  { key: "budget", label: "Budget", icon: DollarSign },
  { key: "expenses", label: "Expenses", icon: ClipboardList },
  { key: "reports", label: "Reports", icon: FileText },
  { key: "drawdowns", label: "Drawdowns", icon: Banknote },
  { key: "subs", label: "Subrecipients", icon: Users },
  { key: "compliance", label: "Compliance", icon: ShieldCheck },
] as const;

type TabKey = (typeof TABS)[number]["key"];

// ─── Page ───

export default function AwardDetailPage() {
  const params = useParams();
  const awardId = params.id as string;
  const headers = useTenantHeaders();
  const tenant = useTenant();

  const [award, setAward] = useState<Award | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [drawdowns, setDrawdowns] = useState<DrawdownRequest[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [subs, setSubs] = useState<Subrecipient[]>([]);
  const [checklists, setChecklists] = useState<ComplianceChecklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("budget");

  const fetchAll = useCallback(async () => {
    if (tenant.isLoading || !awardId) return;
    setLoading(true);
    const h = { ...headers, "Content-Type": "application/json" };
    try {
      const [rawRes, expRes, ddRes, rptRes, subRes, clRes] = await Promise.all([
        fetch(`/api/awards/form-data?awardId=${awardId}&formType=raw`, { headers: h }),
        fetch(`/api/awards/expenses?awardId=${awardId}`, { headers: h }),
        fetch(`/api/awards/drawdowns?awardId=${awardId}`, { headers: h }),
        fetch(`/api/reports?awardId=${awardId}`, { headers: h }),
        fetch(`/api/subrecipients?awardId=${awardId}`, { headers: h }),
        fetch(`/api/compliance?section=checklists&awardId=${awardId}`, { headers: h }),
      ]);
      if (rawRes.ok) { const d = await rawRes.json(); setAward(d.award); }
      if (expRes.ok) { const d = await expRes.json(); setExpenses(d.expenses || []); }
      if (ddRes.ok) { const d = await ddRes.json(); setDrawdowns(d.drawdowns || []); }
      if (rptRes.ok) { const d = await rptRes.json(); setReports(d.reports || []); }
      if (subRes.ok) { const d = await subRes.json(); setSubs(d.subrecipients || []); }
      if (clRes.ok) { const d = await clRes.json(); setChecklists(d.checklists || []); }
    } catch { /* */ }
    setLoading(false);
  }, [awardId, headers, tenant.isLoading]);

  useEffect(() => { fetchAll(); }, [awardId, tenant.isLoading, tenant.portId]);

  if (loading) {
    return <div className="flex-1 flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!award) {
    return (
      <div className="flex-1 p-6">
        <Link href="/reporting/overview" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <Card className="border-red-200"><CardContent className="pt-6 text-center">
          <AlertTriangle className="h-8 w-8 mx-auto text-red-500 mb-3" />
          <p className="text-sm text-red-600">Award not found</p>
        </CardContent></Card>
      </div>
    );
  }

  const totalSpent = expenses.filter((e) => e.status !== "flagged").reduce((s, e) => s + e.amount, 0);
  const totalDrawn = drawdowns.filter((d) => d.status === "approved" || d.status === "payment_received").reduce((s, d) => s + d.totalAmount, 0);
  const spendPct = award.totalAmount > 0 ? Math.round((totalSpent / award.totalAmount) * 100) : 0;

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <Link href="/reporting/overview" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3">
          <ArrowLeft className="h-4 w-4" /> Back to Overview
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <AwardIcon className="h-5 w-5 text-[#3d8b8b]" />
              <Badge variant="outline">{award.program}</Badge>
              <Badge className={award.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>{award.status}</Badge>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">{award.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {award.fain} &middot; {award.awardingAgency}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {fmtDate(award.performancePeriod.start)} — {fmtDate(award.performancePeriod.end)}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl font-bold text-[#3d8b8b]">{fmt(award.totalAmount)}</p>
            <p className="text-xs text-muted-foreground">{spendPct}% spent &middot; {fmt(totalDrawn)} drawn</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={fetchAll}><RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh</Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === t.key ? "border-[#3d8b8b] text-[#3d8b8b]" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Budget Tab */}
      {tab === "budget" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card><CardContent className="pt-4 pb-4 text-center">
              <p className="text-xs text-muted-foreground uppercase">Awarded</p>
              <p className="text-xl font-bold mt-1">{fmt(award.totalAmount)}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 pb-4 text-center">
              <p className="text-xs text-muted-foreground uppercase">Spent</p>
              <p className="text-xl font-bold mt-1">{fmt(totalSpent)}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 pb-4 text-center">
              <p className="text-xs text-muted-foreground uppercase">Drawn</p>
              <p className="text-xl font-bold text-emerald-600 mt-1">{fmt(totalDrawn)}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 pb-4 text-center">
              <p className="text-xs text-muted-foreground uppercase">Match ({award.matchRequirement.percentage}%)</p>
              <p className="text-xl font-bold mt-1">{fmt(award.matchRequirement.committed)}</p>
              <p className="text-[10px] text-muted-foreground">of {fmt(award.matchRequirement.required)} required</p>
            </CardContent></Card>
          </div>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Budget Categories</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {award.budgetCategories.map((cat) => {
                  const pct = cat.ceiling > 0 ? Math.round((cat.spent / cat.ceiling) * 100) : 0;
                  return (
                    <div key={cat.id}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span>{cat.name}</span>
                        <span className="tabular-nums text-muted-foreground">{fmtFull(cat.spent)} / {fmtFull(cat.ceiling)} ({pct}%)</span>
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

          {award.matchLedger.length > 0 && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Match Ledger</CardTitle></CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead><tr className="border-b">
                    <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground uppercase">Date</th>
                    <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground uppercase">Description</th>
                    <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground uppercase">Type</th>
                    <th className="text-right py-2 text-xs font-medium text-muted-foreground uppercase">Amount</th>
                  </tr></thead>
                  <tbody>
                    {award.matchLedger.map((e) => (
                      <tr key={e.id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="py-2 pr-4 text-xs">{fmtDate(e.date)}</td>
                        <td className="py-2 pr-4">{e.description}</td>
                        <td className="py-2 pr-4"><Badge variant="outline" className="text-[10px]">{e.type}</Badge></td>
                        <td className="py-2 text-right tabular-nums font-medium">{fmtFull(e.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Expenses Tab */}
      {tab === "expenses" && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Expenses ({expenses.length})</CardTitle></CardHeader>
          <CardContent>
            {expenses.length === 0 ? <p className="text-sm text-muted-foreground italic py-4">No expenses logged</p> : (
              <div className="overflow-x-auto"><table className="w-full text-sm">
                <thead><tr className="border-b">
                  <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground uppercase">Date</th>
                  <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground uppercase">Description</th>
                  <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground uppercase">Vendor</th>
                  <th className="text-right py-2 pr-4 text-xs font-medium text-muted-foreground uppercase">Amount</th>
                  <th className="text-left py-2 text-xs font-medium text-muted-foreground uppercase">Status</th>
                </tr></thead>
                <tbody>
                  {expenses.slice(0, 50).map((e) => (
                    <tr key={e.id} className={`border-b last:border-0 ${e.status === "flagged" ? "bg-red-50/50 dark:bg-red-950/10" : "hover:bg-muted/50"}`}>
                      <td className="py-2 pr-4 text-xs">{fmtDate(e.date)}</td>
                      <td className="py-2 pr-4 truncate max-w-[200px]">{e.description}</td>
                      <td className="py-2 pr-4 text-muted-foreground">{e.vendor}</td>
                      <td className="py-2 pr-4 text-right tabular-nums font-medium">{fmtFull(e.amount)}</td>
                      <td className="py-2">
                        <Badge className={`text-[10px] ${e.status === "flagged" ? "bg-red-100 text-red-700" : e.status === "drawn" ? "bg-emerald-100 text-emerald-700" : e.status === "approved" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}`}>{e.status}</Badge>
                        {e.flagReason && <p className="text-[10px] text-red-600 mt-0.5">{e.flagReason}</p>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Reports Tab */}
      {tab === "reports" && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Scheduled Reports ({reports.length})</CardTitle></CardHeader>
          <CardContent>
            {reports.length === 0 ? <p className="text-sm text-muted-foreground italic py-4">No reports scheduled</p> : (
              <div className="overflow-x-auto"><table className="w-full text-sm">
                <thead><tr className="border-b">
                  <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground uppercase">Type</th>
                  <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground uppercase">Period</th>
                  <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground uppercase">Due</th>
                  <th className="text-left py-2 text-xs font-medium text-muted-foreground uppercase">Status</th>
                </tr></thead>
                <tbody>
                  {reports.map((r) => {
                    const overdue = r.status !== "submitted" && new Date(r.dueDate) < new Date();
                    return (
                      <tr key={r.id} className={`border-b last:border-0 ${overdue ? "bg-red-50/50 dark:bg-red-950/10" : "hover:bg-muted/50"}`}>
                        <td className="py-2 pr-4 font-medium">{r.type === "sf425" ? "SF-425" : r.type === "progress" ? "Progress" : r.type}</td>
                        <td className="py-2 pr-4 text-xs text-muted-foreground">{fmtDate(r.periodStart)} — {fmtDate(r.periodEnd)}</td>
                        <td className="py-2 pr-4 text-xs">{fmtDate(r.dueDate)}</td>
                        <td className="py-2"><Badge className={`text-[10px] ${overdue ? "bg-red-100 text-red-700" : r.status === "submitted" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>{overdue ? "overdue" : r.status.replace("_", " ")}</Badge></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table></div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Drawdowns Tab */}
      {tab === "drawdowns" && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Drawdown Requests ({drawdowns.length})</CardTitle></CardHeader>
          <CardContent>
            {drawdowns.length === 0 ? <p className="text-sm text-muted-foreground italic py-4">No drawdown requests</p> : (
              <div className="overflow-x-auto"><table className="w-full text-sm">
                <thead><tr className="border-b">
                  <th className="text-right py-2 pr-4 text-xs font-medium text-muted-foreground uppercase">Amount</th>
                  <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground uppercase">Status</th>
                  <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground uppercase">Submitted</th>
                  <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground uppercase">Approved</th>
                  <th className="text-left py-2 text-xs font-medium text-muted-foreground uppercase">Payment</th>
                </tr></thead>
                <tbody>
                  {drawdowns.map((d) => (
                    <tr key={d.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-2 pr-4 text-right tabular-nums font-medium">{fmtFull(d.totalAmount)}</td>
                      <td className="py-2 pr-4"><Badge className={`text-[10px] ${d.status === "payment_received" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>{d.status.replace("_", " ")}</Badge></td>
                      <td className="py-2 pr-4 text-xs">{fmtDate(d.submittedDate)}</td>
                      <td className="py-2 pr-4 text-xs">{fmtDate(d.approvedDate)}</td>
                      <td className="py-2 text-xs">{fmtDate(d.paymentDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Subrecipients Tab */}
      {tab === "subs" && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Subrecipients & Contractors ({subs.length})</CardTitle></CardHeader>
          <CardContent>
            {subs.length === 0 ? <p className="text-sm text-muted-foreground italic py-4">No entities on this award</p> : (
              <div className="space-y-3">
                {subs.map((s) => (
                  <div key={s.id} className="p-3 rounded-lg border">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{s.entityName}</span>
                        <Badge className={s.classification === "subrecipient" ? "bg-purple-100 text-purple-700 text-[10px]" : "bg-gray-100 text-gray-700 text-[10px]"}>{s.classification}</Badge>
                        <Badge className={`text-[10px] ${s.riskLevel === "high" ? "bg-red-100 text-red-700" : s.riskLevel === "elevated" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>{s.riskLevel}</Badge>
                      </div>
                      <span className="text-sm tabular-nums font-medium">{fmt(Number(s.subawardAmount))}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Cumulative spend: {fmtFull(Number(s.cumulativeSpend))}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Compliance Tab */}
      {tab === "compliance" && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Compliance Checklists ({checklists.length})</CardTitle></CardHeader>
          <CardContent>
            {checklists.length === 0 ? <p className="text-sm text-muted-foreground italic py-4">No compliance checklists attached</p> : (
              <div className="space-y-3">
                {checklists.map((cl) => {
                  const pct = cl.totalItems > 0 ? Math.round((cl.completedItems / cl.totalItems) * 100) : 0;
                  return (
                    <div key={cl.id} className="p-3 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{cl.title}</span>
                        <Badge className={cl.status === "compliant" ? "bg-emerald-100 text-emerald-700 text-[10px]" : "bg-blue-100 text-blue-700 text-[10px]"}>{cl.status.replace("_", " ")}</Badge>
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
