"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Banknote,
  Loader2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpDown,
  TrendingUp,
  DollarSign,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTenantHeaders, useTenant } from "@/contexts/tenant-context";

// ─── Types ───

interface EnrichedDrawdown {
  id: string;
  awardId: string;
  awardTitle: string;
  program: string;
  fain: string;
  totalAmount: number;
  status: string;
  submittedDate?: string;
  approvedDate?: string;
  paymentDate?: string;
  notes: string;
  createdAt: string;
  daysOutstanding: number;
}

interface AgingBucket {
  count: number;
  amount: number;
}

interface PipelineData {
  drawdowns: EnrichedDrawdown[];
  agingSummary: Record<string, AgingBucket>;
  cashFlow: {
    pendingReimbursements: number;
    upcomingSpend: number;
    totalPaymentsReceived: number;
    totalExpended: number;
    netPosition: number;
  };
  pipelineSummary: Record<string, AgingBucket>;
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

function statusColor(status: string): string {
  const map: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    submitted: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    approved: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    payment_received: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  };
  return map[status] || "bg-gray-100 text-gray-600";
}

// ─── Page ───

export default function DrawdownsPage() {
  const headers = useTenantHeaders();
  const tenant = useTenant();
  const [data, setData] = useState<PipelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date" | "amount" | "aging">("date");

  const fetchPipeline = useCallback(async () => {
    if (tenant.isLoading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/awards/drawdowns/pipeline", {
        headers: { ...headers, "Content-Type": "application/json" },
      });
      if (res.ok) setData(await res.json());
    } catch { /* */ }
    setLoading(false);
  }, [headers, tenant.isLoading]);

  useEffect(() => { fetchPipeline(); }, [tenant.isLoading, tenant.portId]);

  if (loading) {
    return <div className="flex-1 flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!data) {
    return (
      <div className="flex-1 p-6">
        <Card className="border-red-200">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-8 w-8 mx-auto text-red-500 mb-3" />
            <p className="text-sm text-red-600">Failed to load pipeline data</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={fetchPipeline}><RefreshCw className="h-3.5 w-3.5 mr-1" /> Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Filter + sort
  let drawdowns = data.drawdowns;
  if (filter !== "all") drawdowns = drawdowns.filter((d) => d.status === filter);

  drawdowns = [...drawdowns].sort((a, b) => {
    if (sortBy === "amount") return b.totalAmount - a.totalAmount;
    if (sortBy === "aging") return b.daysOutstanding - a.daysOutstanding;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const ps = data.pipelineSummary;
  const cf = data.cashFlow;

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Banknote className="h-5 w-5 text-[#3d8b8b]" />
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">2 CFR 200.305</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Reimbursement Pipeline</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Cross-award drawdown tracking, aging, and cash flow</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchPipeline}><RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh</Button>
      </div>

      {/* Pipeline Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Draft", ...ps.draft, color: "text-gray-600", icon: Clock },
          { label: "Submitted", ...ps.submitted, color: "text-blue-600", icon: ArrowUpDown },
          { label: "Approved", ...ps.approved, color: "text-amber-600", icon: CheckCircle2 },
          { label: "Paid", ...ps.paymentReceived, color: "text-emerald-600", icon: Banknote },
        ].map((item) => (
          <Card key={item.label} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter(item.label === "Paid" ? "payment_received" : item.label.toLowerCase())}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <item.icon className={`h-4 w-4 ${item.color}`} />
                <span className="text-xs text-muted-foreground uppercase tracking-wider">{item.label}</span>
              </div>
              <p className={`text-xl font-bold ${item.color}`}>{fmt(item.amount)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.count} request{item.count !== 1 ? "s" : ""}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Aging + Cash Flow */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Aging Report */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" /> Aging Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(data.agingSummary).map(([bucket, val]) => {
                const pct = cf.pendingReimbursements > 0 ? Math.round((val.amount / cf.pendingReimbursements) * 100) : 0;
                const isOverdue = bucket === "90+";
                return (
                  <div key={bucket}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className={isOverdue ? "text-red-600 font-medium" : ""}>{bucket} days</span>
                      <span className="tabular-nums text-muted-foreground">{fmtFull(val.amount)} ({val.count})</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isOverdue ? "bg-red-500" : bucket === "61-90" ? "bg-amber-500" : "bg-[#3d8b8b]"}`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Cash Flow Snapshot */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Cash Flow Snapshot
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { label: "Total Payments Received", value: cf.totalPaymentsReceived, color: "text-emerald-600" },
                { label: "Total Expended", value: cf.totalExpended, color: "" },
                { label: "Pending Reimbursements", value: cf.pendingReimbursements, color: "text-blue-600" },
                { label: "Expenses Not Yet Drawn", value: cf.upcomingSpend, color: "text-amber-600" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  <span className={`text-sm font-bold tabular-nums ${item.color}`}>{fmtFull(item.value)}</span>
                </div>
              ))}
              <div className="border-t pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Net Cash Position</span>
                  <span className={`text-lg font-bold tabular-nums ${cf.netPosition >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {cf.netPosition >= 0 ? "" : "-"}{fmtFull(Math.abs(cf.netPosition))}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Drawdowns Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Drawdown Requests
            </div>
            <div className="flex items-center gap-2">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="rounded border bg-background px-2 py-1 text-xs"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="approved">Approved</option>
                <option value="payment_received">Paid</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="rounded border bg-background px-2 py-1 text-xs"
              >
                <option value="date">Sort: Date</option>
                <option value="amount">Sort: Amount</option>
                <option value="aging">Sort: Aging</option>
              </select>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {drawdowns.length === 0 ? (
            <p className="text-sm text-muted-foreground italic py-4 text-center">No drawdown requests found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground uppercase">Award</th>
                    <th className="text-right py-2 pr-4 text-xs font-medium text-muted-foreground uppercase">Amount</th>
                    <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground uppercase">Status</th>
                    <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground uppercase">Submitted</th>
                    <th className="text-right py-2 pr-4 text-xs font-medium text-muted-foreground uppercase">Days Out</th>
                    <th className="text-left py-2 text-xs font-medium text-muted-foreground uppercase">Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {drawdowns.map((d) => {
                    const isAging = d.daysOutstanding > 60 && (d.status === "submitted" || d.status === "approved");
                    return (
                      <tr key={d.id} className={`border-b last:border-0 ${isAging ? "bg-red-50/50 dark:bg-red-950/10" : "hover:bg-muted/50"}`}>
                        <td className="py-2.5 pr-4">
                          <div>
                            <p className="font-medium truncate max-w-[200px]">{d.program}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">{d.awardTitle}</p>
                          </div>
                        </td>
                        <td className="py-2.5 pr-4 text-right tabular-nums font-medium">{fmtFull(d.totalAmount)}</td>
                        <td className="py-2.5 pr-4">
                          <Badge className={`text-[10px] ${statusColor(d.status)}`}>
                            {d.status.replace("_", " ")}
                          </Badge>
                        </td>
                        <td className="py-2.5 pr-4 text-muted-foreground text-xs">{fmtDate(d.submittedDate)}</td>
                        <td className="py-2.5 pr-4 text-right">
                          {d.status === "submitted" || d.status === "approved" ? (
                            <span className={`tabular-nums text-xs font-medium ${d.daysOutstanding > 60 ? "text-red-600" : d.daysOutstanding > 30 ? "text-amber-600" : "text-muted-foreground"}`}>
                              {d.daysOutstanding}d
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="py-2.5 text-muted-foreground text-xs">{fmtDate(d.paymentDate)}</td>
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
