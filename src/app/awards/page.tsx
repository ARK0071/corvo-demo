"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Award,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  Plus,
  BarChart3,
  Receipt,
  CreditCard,
  ChevronDown,
  ChevronUp,
  Paperclip,
  AlertCircle,
  ShieldCheck,
  ArrowUpDown,
  X,
  Calendar,
  Target,
  Wallet,
  CircleDot,
  FileText,
  RefreshCw,
  Loader2,
  Database,
  Upload,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useTenant, useTenantHeaders } from "@/contexts/tenant-context";
import {
  getAllAwards as getInMemoryAwards,
  getAwardById,
  getAwardStats as getInMemoryStats,
  getExpensesForAward,
  getDrawdownsForAward,
  getBudgetModsForAward,
  getMatchStatus,
  getAttentionItems as getInMemoryAttentionItems,
  validateExpense,
  logExpense,
  checkExpenseAllowability,
  updateExpenseStatus,
  addMatchEntry,
  createDrawdown,
  updateDrawdownStatus,
  getEligibleExpensesForDrawdown,
  createBudgetMod,
  approveBudgetMod,
  type Award as AwardType,
  type Expense,
  type DrawdownRequest,
  type MatchType,
  type AttentionItem,
  type ExpenseValidationResult,
} from "@/data/awards";
import { getReportsForAward } from "@/data/reporting";

// ─── Helpers ───

function fmt(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
}

function fmtFull(n: number): string {
  return `$${n.toLocaleString()}`;
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return d;
  }
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function pctOf(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

// ─── Status Colors ───

function statusColor(status: string): string {
  const map: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    suspended: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    closeout_pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    closed: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    draft: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    submitted: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    payment_received: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    logged: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    flagged: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    drawn: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    on_track: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    at_risk: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    shortfall: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    requested: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    denied: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
  return map[status] || "bg-gray-100 text-gray-600";
}

// Award-specific colors — teal palette with varying opacity for cohesion
const AWARD_COLORS = [
  "bg-[#3d8b8b]",
  "bg-[#3d8b8b]/80",
  "bg-[#3d8b8b]/60",
  "bg-[#3d8b8b]/45",
  "bg-[#3d8b8b]/30",
  "bg-[#3d8b8b]/20",
];

const AWARD_COLORS_TEXT = [
  "text-[#3d8b8b]",
  "text-[#3d8b8b]",
  "text-[#3d8b8b]",
  "text-[#3d8b8b]",
  "text-[#3d8b8b]",
  "text-[#3d8b8b]",
];

const AWARD_COLORS_DOT = [
  "bg-[#3d8b8b]",
  "bg-[#3d8b8b]/80",
  "bg-[#3d8b8b]/60",
  "bg-[#3d8b8b]/45",
  "bg-[#3d8b8b]/30",
  "bg-[#3d8b8b]/20",
];

// ─── Page ───

export default function AwardsPage() {
  const [selectedAwardId, setSelectedAwardId] = useState<string | null>(null);
  const [showIntake, setShowIntake] = useState(false);
  const [, setRefresh] = useState(0);
  const forceRefresh = useCallback(() => setRefresh((n) => n + 1), []);

  // DB-first data loading
  const tenant = useTenant();
  const tenantHeaders = useTenantHeaders();
  const [awards, setAwards] = useState<AwardType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [dataSource, setDataSource] = useState<"db" | "memory">("memory");

  // Fetch awards from the database API
  const fetchFromDB = useCallback(async () => {
    try {
      const res = await fetch("/api/awards", {
        headers: {
          ...tenantHeaders,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch awards from DB");
      }

      const data = await res.json();
      if (data.awards && data.awards.length > 0) {
        setAwards(data.awards);
        setDataSource("db");
        setLastSynced(new Date());
        return true;
      }
      return false;
    } catch (error) {
      console.error("[Awards] DB fetch error:", error);
      return false;
    }
  }, [tenantHeaders]);

  // Load data on mount and when tenant changes
  useEffect(() => {
    if (tenant.isLoading) return;

    const loadData = async () => {
      setIsLoading(true);
      const dbSuccess = await fetchFromDB();

      // Fallback to in-memory data if DB returns nothing
      if (!dbSuccess) {
        const inMemoryAwards = getInMemoryAwards();
        setAwards(inMemoryAwards);
        setDataSource("memory");
      }
      setIsLoading(false);
    };

    loadData();
  }, [tenant.isLoading, tenant.environment, tenant.portId, fetchFromDB]);

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchFromDB();
    setIsRefreshing(false);
    forceRefresh();
  }, [fetchFromDB, forceRefresh]);

  // Compute stats from awards data
  const stats = useMemo(() => {
    if (awards.length === 0) return getInMemoryStats();

    let totalAwarded = 0;
    let totalSpent = 0;
    let totalDrawn = 0;

    for (const award of awards) {
      totalAwarded += award.totalAmount;
      const spent = award.budgetCategories.reduce((s, c) => s + c.spent, 0);
      totalSpent += spent;
      // Note: totalDrawn would need to come from drawdown data
    }

    return {
      totalAwards: awards.length,
      totalAwarded,
      totalSpent,
      totalDrawn: getInMemoryStats().totalDrawn, // Fallback for now
      totalRemaining: totalAwarded - totalSpent,
    };
  }, [awards]);

  const attentionItems = useMemo(() => {
    if (awards.length === 0) return getInMemoryAttentionItems();
    const items: AttentionItem[] = [];
    for (const award of awards) {
      for (const cat of award.budgetCategories) {
        if (cat.ceiling <= 0) continue;
        const pct = (cat.spent / cat.ceiling) * 100;
        if (pct >= 95) {
          items.push({ id: `${award.id}-${cat.id}-crit`, awardId: award.id, awardTitle: award.title, type: "budget", severity: "critical", title: `${cat.name} at ${Math.round(pct)}% of ceiling`, description: `${cat.name} has spent $${cat.spent.toLocaleString()} of $${cat.ceiling.toLocaleString()} ceiling.` });
        } else if (pct >= 80) {
          items.push({ id: `${award.id}-${cat.id}-warn`, awardId: award.id, awardTitle: award.title, type: "budget", severity: "warning", title: `${cat.name} at ${Math.round(pct)}% of ceiling`, description: `${cat.name} has spent $${cat.spent.toLocaleString()} of $${cat.ceiling.toLocaleString()} ceiling.` });
        }
        if (cat.spent > cat.ceiling) {
          items.push({ id: `${award.id}-${cat.id}-over`, awardId: award.id, awardTitle: award.title, type: "budget", severity: "critical", title: `${cat.name} over budget`, description: `${cat.name} exceeded ceiling by $${(cat.spent - cat.ceiling).toLocaleString()}.` });
        }
      }
    }
    return items;
  }, [awards]);

  const [showFlaggedOnly, setShowFlaggedOnly] = useState(false);
  const filteredAwards = useMemo(() => {
    if (!showFlaggedOnly) return awards;
    const flaggedIds = new Set(attentionItems.map((a) => a.awardId));
    return awards.filter((a) => flaggedIds.has(a.id));
  }, [awards, attentionItems, showFlaggedOnly]);

  if (showIntake) {
    return (
      <AwardIntakeForm
        tenantHeaders={tenantHeaders}
        portId={tenant.portId}
        onBack={() => setShowIntake(false)}
        onCreated={() => {
          setShowIntake(false);
          handleRefresh();
        }}
      />
    );
  }

  if (selectedAwardId) {
    return (
      <AwardDetailView
        awardId={selectedAwardId}
        onBack={() => setSelectedAwardId(null)}
        onRefresh={forceRefresh}
      />
    );
  }

  const criticalItems = attentionItems.filter((a) => a.severity === "critical");
  const warningItems = attentionItems.filter((a) => a.severity === "warning");

  // Loading state
  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto p-6 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#3d8b8b] mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading awards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Award className="h-6 w-6 text-[#3d8b8b]" />
            Awards
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Post-award grant management for {tenant.portName}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-[10px] gap-1">
              <Database className="h-2.5 w-2.5" />
              {dataSource === "db" ? "Database" : "Demo Data"}
            </Badge>
            {lastSynced && (
              <span className="text-[10px] text-muted-foreground">
                Last synced: {lastSynced.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setShowIntake(true)}
            className="gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Award
          </Button>
          <div className="text-right">
            <p className="text-3xl font-bold tabular-nums text-[#3d8b8b]">{fmt(stats.totalAwarded)}</p>
            <p className="text-xs text-muted-foreground">across {stats.totalAwards} awards</p>
          </div>
        </div>
      </div>

      {/* Portfolio Summary — stacked bar showing all awards by size */}
      <Card>
        <CardContent className="pt-4 pb-4">
          {/* Financial flow: Awarded → Spent → Drawn → Remaining */}
          <div className="flex items-center gap-6 mb-4 text-sm">
            <div>
              <span className="text-muted-foreground">Spent </span>
              <span className="font-bold tabular-nums">{fmt(stats.totalSpent)}</span>
              <span className="text-muted-foreground text-xs ml-1">({pctOf(stats.totalSpent, stats.totalAwarded)}%)</span>
            </div>
            <div className="text-muted-foreground">→</div>
            <div>
              <span className="text-muted-foreground">Drawn </span>
              <span className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{fmt(stats.totalDrawn)}</span>
            </div>
            <div className="text-muted-foreground">→</div>
            <div>
              <span className="text-muted-foreground">Remaining </span>
              <span className="font-bold tabular-nums">{fmt(stats.totalRemaining)}</span>
            </div>
            {criticalItems.length > 0 && (
              <>
                <div className="ml-auto flex items-center gap-1.5 text-red-600 dark:text-red-400">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span className="font-medium text-xs">{criticalItems.length} critical</span>
                </div>
              </>
            )}
            {warningItems.length > 0 && (
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                <AlertCircle className="h-3.5 w-3.5" />
                <span className="font-medium text-xs">{warningItems.length} warning{warningItems.length !== 1 ? "s" : ""}</span>
              </div>
            )}
          </div>

          {/* Stacked bar — each segment is one award */}
          <div className="h-6 bg-muted rounded-full overflow-hidden flex">
            {awards.map((award, i) => {
              const pct = (award.totalAmount / stats.totalAwarded) * 100;
              return (
                <div
                  key={award.id}
                  className={`${AWARD_COLORS[i % AWARD_COLORS.length]} h-full transition-all cursor-pointer hover:opacity-80 first:rounded-l-full last:rounded-r-full`}
                  style={{ width: `${pct}%` }}
                  title={`${award.program}: ${fmt(award.totalAmount)}`}
                  onClick={() => setSelectedAwardId(award.id)}
                />
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
            {awards.map((award, i) => (
              <button
                key={award.id}
                onClick={() => setSelectedAwardId(award.id)}
                className="flex items-center gap-1.5 text-xs hover:underline"
              >
                <span className={`w-2.5 h-2.5 rounded-full ${AWARD_COLORS_DOT[i % AWARD_COLORS_DOT.length]}`} />
                <span className="text-muted-foreground">{award.program}</span>
                <span className="font-medium tabular-nums">{fmt(award.totalAmount)}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filter + Awards Grid */}
      {attentionItems.length > 0 && (
        <div className="flex items-center gap-2">
          <Button
            variant={showFlaggedOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFlaggedOnly(!showFlaggedOnly)}
            className="text-xs"
          >
            <AlertTriangle className="h-3 w-3 mr-1" />
            {showFlaggedOnly ? "Show All Awards" : `Show Flagged Only (${new Set(attentionItems.map(a => a.awardId)).size})`}
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredAwards.map((award, i) => {
          const totalSpent = award.budgetCategories.reduce((s, c) => s + c.spent, 0);
          const spentPct = pctOf(totalSpent, award.totalAmount);
          const matchStatus = getMatchStatus(award.id);
          const daysLeft = daysUntil(award.performancePeriod.end);
          const awardAttention = attentionItems.filter((a) => a.awardId === award.id);
          return (
            <Card
              key={award.id}
              className={`cursor-pointer hover:shadow-md transition-shadow group ${
                awardAttention.some((a) => a.severity === "critical") ? "border-red-200 dark:border-red-900/50" : ""
              }`}
              onClick={() => setSelectedAwardId(award.id)}
            >
              <CardContent className="pt-4 pb-4">
                {/* Top: Program badge + amount */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2 h-2 rounded-full bg-[#3d8b8b]" />
                      <Badge variant="outline" className="text-[10px]">{award.program}</Badge>
                      <Badge className={`text-[10px] ${statusColor(award.status)}`}>
                        {award.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-sm leading-tight group-hover:text-[#3d8b8b] transition-colors">{award.title}</h3>
                  </div>
                  <p className="text-xl font-bold tabular-nums shrink-0 text-[#3d8b8b]">{fmt(award.totalAmount)}</p>
                </div>

                {/* Budget burn bar with category segments */}
                <div className="space-y-1.5 mb-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{spentPct}% spent</span>
                    <span>{fmtFull(award.totalAmount - totalSpent)} remaining</span>
                  </div>
                  <div className="h-2.5 bg-muted rounded-full overflow-hidden flex">
                    {award.budgetCategories.map((cat) => {
                      const catPct = (cat.spent / award.totalAmount) * 100;
                      if (catPct < 0.5) return null;
                      return (
                        <div
                          key={cat.id}
                          className={`h-full transition-all ${spentPct >= 90 ? "bg-red-500" : spentPct >= 70 ? "bg-amber-500" : "bg-[#3d8b8b]"} opacity-80`}
                          style={{ width: `${catPct}%` }}
                          title={`${cat.name}: ${fmtFull(cat.spent)}`}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Per-category budget flags */}
                {(() => {
                  const flagged = award.budgetCategories
                    .filter((c) => c.ceiling > 0 && (c.spent / c.ceiling) >= 0.8)
                    .map((c) => ({ name: c.name, pct: Math.round((c.spent / c.ceiling) * 100), over: c.spent > c.ceiling }))
                    .sort((a, b) => b.pct - a.pct);
                  if (flagged.length === 0) return null;
                  const shown = flagged.slice(0, 3);
                  const extra = flagged.length - shown.length;
                  return (
                    <div className="flex flex-wrap items-center gap-1.5 mb-3">
                      {shown.map((f) => (
                        <span
                          key={f.name}
                          className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${
                            f.over ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            : f.pct >= 95 ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                          }`}
                        >
                          {f.name} {f.over ? "OVER" : `${f.pct}%`}
                        </span>
                      ))}
                      {extra > 0 && (
                        <span className="text-[10px] text-muted-foreground">+{extra} more</span>
                      )}
                    </div>
                  );
                })()}

                {/* Bottom metrics row */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {daysLeft > 0 ? `${daysLeft}d left` : daysLeft === 0 ? "Ends today" : `Ended ${Math.abs(daysLeft)}d ago`}
                    </span>
                    <span className="flex items-center gap-1">
                      <Target className="h-3 w-3" />
                      <span className={matchStatus.status === "on_track" ? "text-emerald-600 dark:text-emerald-400" : matchStatus.status === "at_risk" ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}>
                        {matchStatus.target}% match: {Math.round(matchStatus.percentage)}%
                      </span>
                    </span>
                  </div>
                  {/* Inline attention indicators */}
                  {awardAttention.length > 0 && (
                    <div className="flex items-center gap-1">
                      {awardAttention.some((a) => a.severity === "critical") && (
                        <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                      )}
                      {awardAttention.some((a) => a.severity === "warning") && !awardAttention.some((a) => a.severity === "critical") && (
                        <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                      )}
                      <span className="text-muted-foreground">{awardAttention.length}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// AWARD DETAIL VIEW
// ════════════════════════════════════════════════════════════

function AwardDetailView({ awardId, onBack, onRefresh }: { awardId: string; onBack: () => void; onRefresh: () => void }) {
  const tenant = useTenant();
  const tenantHeaders = useTenantHeaders();
  const [activeTab, setActiveTab] = useState("overview");
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showDrawdownForm, setShowDrawdownForm] = useState(false);
  const [showBudgetModForm, setShowBudgetModForm] = useState(false);
  const [showMatchForm, setShowMatchForm] = useState(false);
  const [, setRefresh] = useState(0);

  // DB-driven data loading
  const [award, setAward] = useState<AwardType | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [drawdowns, setDrawdowns] = useState<DrawdownRequest[]>([]);
  const [budgetMods, setBudgetMods] = useState<ReturnType<typeof getBudgetModsForAward>>([]);
  const [matchStatus, setMatchStatus] = useState<ReturnType<typeof getMatchStatus>>({ required: 0, committed: 0, percentage: 0, target: 0, status: "on_track" as const, periodProgress: 0 });
  const [detailLoading, setDetailLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const fetchDetail = useCallback(async () => {
    const h = { ...tenantHeaders, "Content-Type": "application/json" };
    try {
      const [rawRes, expRes, ddRes] = await Promise.all([
        fetch(`/api/awards/form-data?awardId=${awardId}&formType=raw`, { headers: h }),
        fetch(`/api/awards/expenses?awardId=${awardId}`, { headers: h }),
        fetch(`/api/awards/drawdowns?awardId=${awardId}`, { headers: h }),
      ]);
      if (rawRes.ok) {
        const data = await rawRes.json();
        setAward(data.award || null);
        if (data.award) {
          const ms = data.award.matchRequirement;
          const perfStart = new Date(data.award.performancePeriod.start).getTime();
          const perfEnd = new Date(data.award.performancePeriod.end).getTime();
          const periodProgress = Math.min(100, Math.max(0, ((Date.now() - perfStart) / (perfEnd - perfStart)) * 100));
          const pct = ms.required > 0 ? (ms.committed / ms.required) * 100 : 100;
          setMatchStatus({
            required: ms.required,
            committed: ms.committed,
            percentage: pct,
            target: ms.percentage,
            status: (ms.required > 0 ? (pct >= periodProgress * 0.8 ? "on_track" : pct >= periodProgress * 0.5 ? "at_risk" : "shortfall") : "on_track") as "on_track" | "at_risk" | "shortfall",
            periodProgress,
          });
        }
      }
      if (expRes.ok) { const d = await expRes.json(); setExpenses(d.expenses || []); }
      if (ddRes.ok) { const d = await ddRes.json(); setDrawdowns(d.drawdowns || []); }
    } catch { /* */ }
    setDetailLoading(false);
  }, [awardId, tenantHeaders]);

  useEffect(() => {
    if (!tenant.isLoading) fetchDetail();
  }, [awardId, tenant.isLoading]);

  const refresh = useCallback(() => { setRefresh((n) => n + 1); fetchDetail(); onRefresh(); }, [onRefresh, fetchDetail]);

  const handleDelete = useCallback(async () => {
    if (!confirm(`Delete "${award?.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/awards?id=${awardId}`, {
        method: "DELETE",
        headers: { ...tenantHeaders, "Content-Type": "application/json" },
      });
      if (res.ok) {
        onBack();
        onRefresh();
      }
    } catch { /* */ }
    setDeleting(false);
  }, [awardId, award, tenantHeaders, onBack, onRefresh]);

  if (detailLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!award) return <p className="p-6 text-muted-foreground">Award not found.</p>;

  const totalSpent = award.budgetCategories.reduce((s, c) => s + c.spent, 0);
  const totalDrawn = drawdowns.filter((d) => d.status === "approved" || d.status === "payment_received").reduce((s, d) => s + d.totalAmount, 0);
  const daysLeft = daysUntil(award.performancePeriod.end);

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      {/* Back + Header */}
      <div>
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3">
          <ArrowLeft className="h-4 w-4" /> Back to Awards
        </button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge className={`${statusColor(award.status)}`}>{award.status.replace("_", " ")}</Badge>
              <Badge variant="outline">{award.program}</Badge>
              <Badge variant="outline" className="text-[10px]">FAIN: {award.fain}</Badge>
            </div>
            <h1 className="text-xl font-bold tracking-tight">{award.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">{award.awardingAgency}</p>
            <p className="text-xs text-muted-foreground mt-0.5">CFDA/ALN: {award.cfda} | Period: {fmtDate(award.performancePeriod.start)} - {fmtDate(award.performancePeriod.end)}</p>
            <Link href={`/reporting/awards/${awardId}`} className="inline-flex items-center gap-1 text-xs text-[#3d8b8b] hover:underline mt-1.5">
              <FileText className="h-3 w-3" />
              View in Reporting Module
            </Link>
          </div>
          <div className="text-right shrink-0 space-y-2">
            <p className="text-2xl font-bold tabular-nums text-[#3d8b8b]">{fmt(award.totalAmount)}</p>
            <p className="text-sm text-muted-foreground">Total Award</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
            >
              {deleting ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <X className="h-3.5 w-3.5 mr-1" />}
              Delete Award
            </Button>
          </div>
        </div>
      </div>

      {/* Financial Flow — horizontal pipeline visual */}
      <Card className="bg-muted/30">
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-5 gap-px">
            {[
              { label: "Awarded", value: fmt(award.totalAmount), sub: "100%", color: "" },
              { label: "Spent", value: fmt(totalSpent), sub: `${pctOf(totalSpent, award.totalAmount)}%`, color: "" },
              { label: "Drawn Down", value: fmt(totalDrawn), sub: `${pctOf(totalDrawn, award.totalAmount)}%`, color: "text-emerald-600 dark:text-emerald-400" },
              { label: "Remaining", value: fmt(award.totalAmount - totalSpent), sub: `${pctOf(award.totalAmount - totalSpent, award.totalAmount)}%`, color: "" },
              { label: "Match", value: `${Math.round(matchStatus.percentage)}%`, sub: `${matchStatus.target}% req`, color: matchStatus.status === "on_track" ? "text-emerald-600 dark:text-emerald-400" : matchStatus.status === "at_risk" ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400" },
            ].map((item, i) => (
              <div key={i} className={`text-center ${i > 0 ? "border-l border-border" : ""} px-2`}>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{item.label}</p>
                <p className={`text-lg font-bold tabular-nums ${item.color}`}>{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.sub}</p>
              </div>
            ))}
          </div>
          {/* Performance period bar */}
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>{fmtDate(award.performancePeriod.start)}</span>
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-[#3d8b8b] rounded-full" style={{ width: `${Math.min(100, Math.max(0, matchStatus.periodProgress))}%` }} />
            </div>
            <span>{fmtDate(award.performancePeriod.end)}</span>
            <span className="font-medium">{daysLeft > 0 ? `${daysLeft}d left` : daysLeft === 0 ? "Ends today" : `Ended ${Math.abs(daysLeft)}d ago`}</span>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Budget</TabsTrigger>
          <TabsTrigger value="expenses">Expenses ({expenses.length})</TabsTrigger>
          <TabsTrigger value="drawdowns">Drawdowns ({drawdowns.length})</TabsTrigger>
          <TabsTrigger value="match">Match Tracking</TabsTrigger>
          <TabsTrigger value="modifications">Modifications ({budgetMods.length})</TabsTrigger>
        </TabsList>

        {/* ── Budget Overview Tab ── */}
        <TabsContent value="overview">
          <Card className="mt-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Budget Categories</span>
                <Button size="sm" variant="outline" onClick={() => setShowBudgetModForm(true)}>
                  <ArrowUpDown className="h-3.5 w-3.5 mr-1" /> Request Modification
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {award.budgetCategories.map((cat) => {
                  const pct = pctOf(cat.spent, cat.ceiling);
                  return (
                    <div key={cat.id}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium">{cat.name}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {fmtFull(cat.spent)} / {fmtFull(cat.ceiling)}
                          <span className={`ml-2 font-medium ${pct >= 90 ? "text-red-600" : pct >= 70 ? "text-amber-600" : "text-emerald-600"}`}>
                            ({pct}%)
                          </span>
                        </span>
                      </div>
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-[#3d8b8b]"}`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Remaining: {fmtFull(cat.ceiling - cat.spent)}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 pt-4 border-t">
                <h4 className="text-sm font-medium mb-1">Award Description</h4>
                <p className="text-sm text-muted-foreground">{award.description}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Expenses Tab ── */}
        <TabsContent value="expenses">
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Expense Ledger</h3>
              <Button size="sm" onClick={() => setShowExpenseForm(true)} disabled={award.status === "closed"}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Log Expense
              </Button>
            </div>

            {showExpenseForm && (
              <ExpenseForm
                award={award}
                onClose={() => setShowExpenseForm(false)}
                onSave={() => { setShowExpenseForm(false); refresh(); }}
              />
            )}

            {expenses.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No expenses logged yet.</CardContent></Card>
            ) : (
              <Card>
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    {expenses.sort((a, b) => b.date.localeCompare(a.date)).map((exp) => (
                      <ExpenseRow key={exp.id} expense={exp} award={award} onRefresh={refresh} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ── Drawdowns Tab ── */}
        <TabsContent value="drawdowns">
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Drawdown Requests</h3>
              <Button size="sm" onClick={() => setShowDrawdownForm(true)} disabled={award.status === "closed"}>
                <Plus className="h-3.5 w-3.5 mr-1" /> New Drawdown
              </Button>
            </div>

            {showDrawdownForm && (
              <DrawdownForm
                award={award}
                onClose={() => setShowDrawdownForm(false)}
                onSave={() => { setShowDrawdownForm(false); refresh(); }}
              />
            )}

            {/* Running Ledger — visual pipeline */}
            <Card className="bg-muted/30">
              <CardContent className="pt-4 pb-4">
                <div className="grid grid-cols-4 gap-px">
                  <div className="text-center px-2">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Awarded</p>
                    <p className="text-lg font-bold tabular-nums">{fmt(award.totalAmount)}</p>
                  </div>
                  <div className="text-center px-2 border-l border-border">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Drawn</p>
                    <p className="text-lg font-bold tabular-nums text-emerald-600">{fmt(totalDrawn)}</p>
                  </div>
                  <div className="text-center px-2 border-l border-border">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Pending</p>
                    <p className="text-lg font-bold tabular-nums text-amber-600">
                      {fmt(drawdowns.filter((d) => d.status === "draft" || d.status === "submitted").reduce((s, d) => s + d.totalAmount, 0))}
                    </p>
                  </div>
                  <div className="text-center px-2 border-l border-border">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Remaining</p>
                    <p className="text-lg font-bold tabular-nums">{fmt(award.totalAmount - totalDrawn)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {drawdowns.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No drawdowns yet.</CardContent></Card>
            ) : (
              <div className="space-y-3">
                {drawdowns.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((dd) => (
                  <DrawdownRow key={dd.id} drawdown={dd} onStatusChange={() => refresh()} />
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Match Tracking Tab ── */}
        <TabsContent value="match">
          <div className="mt-4 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Target className="h-4 w-4" /> Match Requirement: {matchStatus.target}%
                  </span>
                  <Button size="sm" onClick={() => setShowMatchForm(true)} disabled={award.status === "closed"}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Record Match
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-6 mb-6">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Required</p>
                    <p className="text-xl font-bold tabular-nums">{fmtFull(Math.round(matchStatus.required))}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Committed</p>
                    <p className={`text-xl font-bold tabular-nums ${matchStatus.status === "on_track" ? "text-emerald-600" : matchStatus.status === "at_risk" ? "text-amber-600" : "text-red-600"}`}>
                      {fmtFull(matchStatus.committed)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Gap</p>
                    <p className={`text-xl font-bold tabular-nums ${matchStatus.required - matchStatus.committed <= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {matchStatus.required - matchStatus.committed <= 0 ? "Fully matched" : fmtFull(Math.round(matchStatus.required - matchStatus.committed))}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Match Progress</span>
                    <span className={`font-medium ${matchStatus.status === "on_track" ? "text-emerald-600" : matchStatus.status === "at_risk" ? "text-amber-600" : "text-red-600"}`}>
                      {Math.round(matchStatus.percentage)}% of required
                    </span>
                  </div>
                  <div className="h-4 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${matchStatus.status === "on_track" ? "bg-emerald-500" : matchStatus.status === "at_risk" ? "bg-amber-500" : "bg-red-500"}`}
                      style={{ width: `${Math.min(matchStatus.percentage, 100)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                    <span>Performance Period Progress</span>
                    <span>{Math.round(matchStatus.periodProgress)}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-gray-400 rounded-full" style={{ width: `${Math.min(matchStatus.periodProgress, 100)}%` }} />
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <Badge className={statusColor(matchStatus.status)}>
                    {matchStatus.status === "on_track" ? "On Track" : matchStatus.status === "at_risk" ? "At Risk" : "Shortfall"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {matchStatus.status === "on_track"
                      ? "Match commitments are pacing with the performance period."
                      : matchStatus.status === "at_risk"
                      ? "Match commitments are falling behind the performance period pace. Action recommended."
                      : "Match commitments are significantly behind. Immediate action required to avoid audit findings."}
                  </span>
                </div>
              </CardContent>
            </Card>

            {showMatchForm && (
              <MatchEntryForm
                award={award}
                onClose={() => setShowMatchForm(false)}
                onSave={() => { setShowMatchForm(false); refresh(); }}
              />
            )}

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Match Ledger</CardTitle>
              </CardHeader>
              <CardContent>
                {award.matchLedger.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No match entries recorded.</p>
                ) : (
                  <div className="space-y-2">
                    {award.matchLedger.sort((a, b) => b.date.localeCompare(a.date)).map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between text-sm p-2 rounded hover:bg-muted/50">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{entry.description}</p>
                          <p className="text-xs text-muted-foreground">{fmtDate(entry.date)}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="outline" className="text-[10px] capitalize">{entry.type.replace("_", " ")}</Badge>
                          <span className="font-medium tabular-nums">{fmtFull(entry.amount)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Budget Modifications Tab ── */}
        <TabsContent value="modifications">
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Budget Modifications</h3>
              <Button size="sm" variant="outline" onClick={() => setShowBudgetModForm(true)} disabled={award.status === "closed"}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Request Modification
              </Button>
            </div>

            {showBudgetModForm && (
              <BudgetModForm
                award={award}
                onClose={() => setShowBudgetModForm(false)}
                onSave={() => { setShowBudgetModForm(false); refresh(); }}
              />
            )}

            {budgetMods.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No budget modifications requested.</CardContent></Card>
            ) : (
              <div className="space-y-3">
                {budgetMods.map((mod) => {
                  const fromCat = award.budgetCategories.find((c) => c.id === mod.fromCategoryId);
                  const toCat = award.budgetCategories.find((c) => c.id === mod.toCategoryId);
                  return (
                    <Card key={mod.id}>
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={statusColor(mod.status)}>{mod.status}</Badge>
                              <span className="text-xs text-muted-foreground">Requested {fmtDate(mod.requestedDate)}</span>
                            </div>
                            <p className="text-sm">
                              Move <span className="font-bold tabular-nums">{fmtFull(mod.amount)}</span> from{" "}
                              <span className="font-medium">{fromCat?.name || "?"}</span> to{" "}
                              <span className="font-medium">{toCat?.name || "?"}</span>
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">{mod.justification}</p>
                          </div>
                          {mod.status === "requested" && (
                            <Button size="sm" variant="outline" onClick={() => { approveBudgetMod(mod.id); refresh(); }}>
                              Approve (Demo)
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Expense Row ───

function ExpenseRow({ expense, award, onRefresh }: { expense: Expense; award: AwardType; onRefresh: () => void }) {
  const headers = useTenantHeaders();
  const [expanded, setExpanded] = useState(false);
  const cat = award.budgetCategories.find((c) => c.id === expense.categoryId);

  const canApprove = expense.status === "logged";
  const canFlag = expense.status === "logged" || expense.status === "approved";
  const canDelete = expense.status !== "drawn";

  const handleStatusChange = async (status: string) => {
    await fetch("/api/awards/expenses", {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ expenseId: expense.id, status }),
    });
    onRefresh();
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this expense?")) return;
    await fetch("/api/awards/expenses", {
      method: "DELETE",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ id: expense.id }),
    });
    onRefresh();
  };

  return (
    <div className={`rounded-lg border ${expense.status === "flagged" ? "border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20" : "border-transparent"}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/30 rounded-lg transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Badge className={`text-[10px] ${statusColor(expense.status)}`}>{expense.status}</Badge>
            <span className="text-xs text-muted-foreground">{fmtDate(expense.date)}</span>
          </div>
          <p className="text-sm font-medium mt-1 truncate">{expense.description}</p>
          <p className="text-xs text-muted-foreground">{expense.vendor} | {cat?.name || "Unknown category"}</p>
        </div>
        <span className="text-sm font-bold tabular-nums shrink-0">{fmtFull(expense.amount)}</span>
        {canDelete && (
          <span onClick={handleDelete} className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-muted-foreground hover:text-red-600 transition-colors" title="Delete expense">
            <X className="h-3.5 w-3.5" />
          </span>
        )}
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2 text-xs">
          {expense.flagReason && (
            <div className="flex items-start gap-2 p-2 bg-red-50 dark:bg-red-950/30 rounded text-red-700 dark:text-red-400">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>{expense.flagReason}</span>
            </div>
          )}
          {expense.overrideJustification && (
            <div className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-950/30 rounded">
              <ShieldCheck className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-600" />
              <span>Override: {expense.overrideJustification}</span>
            </div>
          )}
          {expense.attachments.length > 0 && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Paperclip className="h-3 w-3" />
              {expense.attachments.join(", ")}
            </div>
          )}
          {/* Workflow actions */}
          {(canApprove || canFlag) && (
            <div className="flex items-center gap-2 pt-1">
              {canApprove && (
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); handleStatusChange("approved"); }}>
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
                </Button>
              )}
              {canFlag && (
                <Button size="sm" variant="outline" className="h-7 text-xs text-red-600 hover:text-red-700" onClick={(e) => { e.stopPropagation(); handleStatusChange("flagged"); }}>
                  <AlertTriangle className="h-3 w-3 mr-1" /> Flag
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Drawdown Row ───

function DrawdownRow({ drawdown, onStatusChange }: { drawdown: DrawdownRequest; onStatusChange: () => void }) {
  const headers = useTenantHeaders();
  const statusFlow: Record<string, DrawdownRequest["status"] | null> = {
    draft: "submitted",
    submitted: "approved",
    approved: "payment_received",
    payment_received: null,
  };
  const nextStatus = statusFlow[drawdown.status];

  const handleAdvance = async () => {
    if (!nextStatus) return;
    await fetch("/api/awards/drawdowns", {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ id: drawdown.id, status: nextStatus }),
    });
    onStatusChange();
  };

  const handleDelete = async () => {
    if (!confirm("Delete this drawdown?")) return;
    await fetch("/api/awards/drawdowns", {
      method: "DELETE",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ id: drawdown.id }),
    });
    onStatusChange();
  };

  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge className={statusColor(drawdown.status)}>{drawdown.status.replace("_", " ")}</Badge>
              <span className="text-xs text-muted-foreground">Created {fmtDate(drawdown.createdAt)}</span>
            </div>
            <p className="text-sm font-medium">{drawdown.notes || "Drawdown request"}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {drawdown.expenseIds.length} expense(s)
              {drawdown.submittedDate && ` | Submitted ${fmtDate(drawdown.submittedDate)}`}
              {drawdown.approvedDate && ` | Approved ${fmtDate(drawdown.approvedDate)}`}
              {drawdown.paymentDate && ` | Paid ${fmtDate(drawdown.paymentDate)}`}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-lg font-bold tabular-nums">{fmtFull(drawdown.totalAmount)}</span>
            {nextStatus && (
              <Button size="sm" variant="outline" onClick={handleAdvance}>
                Mark {nextStatus.replace("_", " ")}
              </Button>
            )}
            <span onClick={handleDelete} className="p-1 rounded cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30 text-muted-foreground hover:text-red-600 transition-colors" title="Delete drawdown">
              <X className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Expense Form ───

function ExpenseForm({ award, onClose, onSave }: { award: AwardType; onClose: () => void; onSave: () => void }) {
  const headers = useTenantHeaders();
  const [categoryId, setCategoryId] = useState(award.budgetCategories[0]?.id || "");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [vendor, setVendor] = useState("");
  const [amount, setAmount] = useState("");
  const [attachmentName, setAttachmentName] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [overrideJustification, setOverrideJustification] = useState("");
  const [validation, setValidation] = useState<ExpenseValidationResult | null>(null);

  const allowabilityCheck = useMemo(() => {
    if (!description) return null;
    return checkExpenseAllowability(description);
  }, [description]);

  const handleValidate = useCallback(() => {
    const result = validateExpense(award.id, categoryId, parseFloat(amount) || 0, date, description);
    setValidation(result);
    return result;
  }, [award.id, categoryId, amount, date, description]);

  const handleFileUpload = useCallback(async (file: File) => {
    setExtracting(true);
    setExtractError(null);
    setAttachmentName(file.name);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("categories", JSON.stringify(award.budgetCategories.map(c => ({ id: c.id, name: c.name }))));
      const res = await fetch("/api/awards/expenses/extract", {
        method: "POST",
        headers: Object.fromEntries(Object.entries(headers).filter(([k]) => k.startsWith("x-"))),
        body: fd,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Extraction failed");
      }
      const { extracted } = await res.json();
      if (extracted.vendor) setVendor(extracted.vendor);
      if (extracted.amount) setAmount(String(extracted.amount));
      if (extracted.date) setDate(extracted.date);
      if (extracted.description) setDescription(extracted.description);
      if (extracted.categoryHint) {
        const match = award.budgetCategories.find(c =>
          c.name.toLowerCase().includes(extracted.categoryHint.toLowerCase()) ||
          extracted.categoryHint.toLowerCase().includes(c.name.toLowerCase())
        );
        if (match) setCategoryId(match.id);
      }
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : "Failed to extract details");
    } finally {
      setExtracting(false);
    }
  }, [award.budgetCategories, headers]);

  const handleSubmit = useCallback(async () => {
    const result = handleValidate();
    if (!result.valid && !overrideJustification) return;

    await fetch("/api/awards/expenses", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        awardId: award.id,
        categoryId,
        date,
        description,
        vendor,
        amount: parseFloat(amount) || 0,
        attachments: attachmentName ? [attachmentName] : [],
        overrideJustification: overrideJustification || undefined,
      }),
    });

    onSave();
  }, [award.id, categoryId, date, description, vendor, amount, attachmentName, overrideJustification, handleValidate, onSave, headers]);

  return (
    <Card className="border-[#3d8b8b]/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2"><Plus className="h-4 w-4" /> Log Expense</span>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Budget Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              {award.budgetCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name} (Remaining: {fmtFull(cat.ceiling - cat.spent)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
          </div>

          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g., Concrete pile driving - Section B" className="mt-1" />
            {allowabilityCheck && allowabilityCheck.violations.length > 0 && (
              <div className="mt-1 space-y-1">
                {allowabilityCheck.violations.map((v, i) => (
                  <p key={i} className={`text-xs flex items-center gap-1 ${v.rule.severity === "block" ? "text-red-600" : "text-amber-600"}`}>
                    <AlertTriangle className="h-3 w-3" />
                    {v.rule.description}
                  </p>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Vendor</label>
            <Input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="e.g., Gulf Coast Marine Construction" className="mt-1" />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount ($)</label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="mt-1" />
          </div>

          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Upload Receipt/Invoice (PDF)</label>
            <div className="mt-1 flex items-center gap-3">
              <label className="cursor-pointer inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm hover:bg-muted/50 transition-colors">
                <Upload className="h-4 w-4" />
                {extracting ? "Extracting..." : "Choose PDF"}
                <input
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileUpload(f);
                  }}
                  disabled={extracting}
                />
              </label>
              {extracting && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              {attachmentName && !extracting && (
                <span className="text-xs text-muted-foreground truncate max-w-[200px]">{attachmentName}</span>
              )}
            </div>
            {extractError && (
              <p className="text-xs text-red-500 mt-1">{extractError}</p>
            )}
          </div>

          {validation && !validation.valid && (
            <div className="sm:col-span-2 space-y-2">
              {validation.errors.map((err, i) => (
                <div key={i} className="flex items-start gap-2 p-2 bg-red-50 dark:bg-red-950/30 rounded text-sm text-red-700 dark:text-red-400">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{err}</span>
                </div>
              ))}
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Override Justification (required to submit with errors)</label>
                <Input value={overrideJustification} onChange={(e) => setOverrideJustification(e.target.value)} placeholder="Provide justification for overriding validation..." className="mt-1" />
              </div>
            </div>
          )}

          {validation && validation.warnings.length > 0 && (
            <div className="sm:col-span-2 space-y-1">
              {validation.warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-950/30 rounded text-sm text-amber-700 dark:text-amber-400">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{w}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="outline" onClick={handleValidate}>Validate</Button>
          <Button onClick={handleSubmit} disabled={!description || !vendor || !amount || (!validation?.valid && !overrideJustification)}>
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Log Expense
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Drawdown Form ───

function DrawdownForm({ award, onClose, onSave }: { award: AwardType; onClose: () => void; onSave: () => void }) {
  const headers = useTenantHeaders();
  const [eligibleExpenses, setEligibleExpenses] = useState<Expense[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState("");

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/awards/expenses?awardId=${award.id}`, {
        headers: { ...headers, "Content-Type": "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        setEligibleExpenses((data.expenses || []).filter((e: Expense) => e.status === "approved"));
      }
    })();
  }, [award.id, headers]);

  const toggleExpense = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const selectedTotal = useMemo(
    () => eligibleExpenses.filter((e) => selectedIds.has(e.id)).reduce((s, e) => s + e.amount, 0),
    [eligibleExpenses, selectedIds]
  );

  const handleSubmit = useCallback(async () => {
    if (selectedIds.size === 0) return;
    await fetch("/api/awards/drawdowns", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ awardId: award.id, expenseIds: Array.from(selectedIds), notes }),
    });
    onSave();
  }, [award.id, selectedIds, notes, onSave, headers]);

  return (
    <Card className="border-[#3d8b8b]/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2"><CreditCard className="h-4 w-4" /> New Drawdown Request</span>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {eligibleExpenses.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No approved expenses available for drawdown. Expenses must be in &quot;approved&quot; status.
          </p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground mb-3">Select approved expenses to include in this drawdown request:</p>
            <div className="space-y-2 max-h-60 overflow-auto">
              {eligibleExpenses.map((exp) => (
                <label key={exp.id} className={`flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-muted/50 ${selectedIds.has(exp.id) ? "bg-muted" : ""}`}>
                  <input type="checkbox" checked={selectedIds.has(exp.id)} onChange={() => toggleExpense(exp.id)} className="rounded" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{exp.description}</p>
                    <p className="text-xs text-muted-foreground">{fmtDate(exp.date)} | {exp.vendor}</p>
                  </div>
                  <span className="text-sm font-medium tabular-nums">{fmtFull(exp.amount)}</span>
                </label>
              ))}
            </div>

            <div className="mt-3 p-3 bg-muted/50 rounded flex items-center justify-between">
              <span className="text-sm font-medium">Selected: {selectedIds.size} expense(s)</span>
              <span className="text-lg font-bold tabular-nums">{fmtFull(selectedTotal)}</span>
            </div>

            <div className="mt-3">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Notes</label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g., Q1 FY2025 drawdown request" className="mt-1" />
            </div>
          </>
        )}

        <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={selectedIds.size === 0}>
            <CreditCard className="h-3.5 w-3.5 mr-1" /> Create Drawdown ({fmtFull(selectedTotal)})
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Budget Modification Form ───

function BudgetModForm({ award, onClose, onSave }: { award: AwardType; onClose: () => void; onSave: () => void }) {
  const headers = useTenantHeaders();
  const [fromId, setFromId] = useState(award.budgetCategories[0]?.id || "");
  const [toId, setToId] = useState(award.budgetCategories[1]?.id || "");
  const [amount, setAmount] = useState("");
  const [justification, setJustification] = useState("");

  const handleSubmit = useCallback(async () => {
    if (!fromId || !toId || fromId === toId || !amount || !justification) return;
    // Budget mod API not yet built — use in-memory fallback
    createBudgetMod({ awardId: award.id, fromCategoryId: fromId, toCategoryId: toId, amount: parseFloat(amount), justification });
    onSave();
  }, [award.id, fromId, toId, amount, justification, onSave]);

  return (
    <Card className="border-[#3d8b8b]/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2"><ArrowUpDown className="h-4 w-4" /> Budget Modification Request</span>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Move From</label>
            <select value={fromId} onChange={(e) => setFromId(e.target.value)} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
              {award.budgetCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({fmtFull(c.ceiling - c.spent)} available)</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Move To</label>
            <select value={toId} onChange={(e) => setToId(e.target.value)} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
              {award.budgetCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name} (Current: {fmtFull(c.ceiling)})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount ($)</label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="mt-1" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Justification</label>
            <textarea value={justification} onChange={(e) => setJustification(e.target.value)} placeholder="Explain why this budget reallocation is needed..." className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[80px]" />
          </div>
        </div>

        {fromId === toId && <p className="text-xs text-red-600 mt-2">Source and destination categories must be different.</p>}

        <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!fromId || !toId || fromId === toId || !amount || !justification}>
            <ArrowUpDown className="h-3.5 w-3.5 mr-1" /> Submit Request
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Match Entry Form ───

function MatchEntryForm({ award, onClose, onSave }: { award: AwardType; onClose: () => void; onSave: () => void }) {
  const headers = useTenantHeaders();
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [matchType, setMatchType] = useState<MatchType>(award.matchRequirement.types[0] || "cash");
  const [documentation, setDocumentation] = useState("");

  const handleSubmit = useCallback(async () => {
    if (!description || !amount) return;
    await fetch("/api/awards/match-ledger", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        awardId: award.id,
        date,
        description,
        amount: parseFloat(amount) || 0,
        type: matchType,
        documentation: documentation || undefined,
      }),
    });
    onSave();
  }, [award.id, date, description, amount, matchType, documentation, onSave, headers]);

  return (
    <Card className="border-[#3d8b8b]/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2"><Target className="h-4 w-4" /> Record Match Contribution</span>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Match Type</label>
            <select
              value={matchType}
              onChange={(e) => setMatchType(e.target.value as MatchType)}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              {award.matchRequirement.types.map((t) => (
                <option key={t} value={t}>{t === "in_kind" ? "In-Kind" : t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
          </div>

          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g., Port Authority cash contribution - Phase 3" className="mt-1" />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount ($)</label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="mt-1" />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Documentation</label>
            <Input value={documentation} onChange={(e) => setDocumentation(e.target.value)} placeholder="e.g., resolution-2025-003.pdf" className="mt-1" />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!description || !amount}>
            <Target className="h-3.5 w-3.5 mr-1" /> Record Match
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Award Intake Form ───

const AGENCIES = [
  "U.S. Department of Transportation / Maritime Administration",
  "U.S. Department of Transportation / Federal Railroad Administration",
  "U.S. Department of Transportation / Federal Transit Administration",
  "U.S. Department of Transportation / Federal Highway Administration",
  "U.S. Department of Transportation / Federal Aviation Administration",
  "U.S. Environmental Protection Agency",
  "Texas Department of Transportation",
  "U.S. Army Corps of Engineers",
  "U.S. Department of Energy",
];

const PROGRAMS = [
  "PIDP", "CRISI", "INFRA", "RAISE", "EPA Clean Ports", "FTA Capital",
  "TxDOT SCP", "TxDOT Rider 37", "FAA AIP", "FHWA NHPP", "Other",
];

function AwardIntakeForm({ tenantHeaders, portId, onBack, onCreated }: {
  tenantHeaders: Record<string, string>;
  portId: string;
  onBack: () => void;
  onCreated: () => void;
}) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 0: Basic info
  const [fain, setFain] = useState("");
  const [cfda, setCfda] = useState("");
  const [awardingAgency, setAwardingAgency] = useState(AGENCIES[0]);
  const [program, setProgram] = useState(PROGRAMS[0]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // Step 1: Financials
  const [totalAmount, setTotalAmount] = useState("");
  const [matchPercentage, setMatchPercentage] = useState("20");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");

  // Step 2: Budget categories
  const [categories, setCategories] = useState<{ name: string; ceiling: string }[]>([
    { name: "Construction", ceiling: "" },
    { name: "Engineering & Design", ceiling: "" },
  ]);

  const addCategory = () => setCategories((prev) => [...prev, { name: "", ceiling: "" }]);
  const removeCategory = (i: number) => setCategories((prev) => prev.filter((_, idx) => idx !== i));
  const updateCategory = (i: number, field: "name" | "ceiling", value: string) => {
    setCategories((prev) => prev.map((c, idx) => idx === i ? { ...c, [field]: value } : c));
  };

  const totalBudget = categories.reduce((s, c) => s + (parseFloat(c.ceiling) || 0), 0);
  const awardAmt = parseFloat(totalAmount) || 0;
  const budgetDiff = awardAmt - totalBudget;

  const handleSubmit = async () => {
    setSaving(true);
    setError(null);

    try {
      // Get portProfileId
      const profileRes = await fetch("/api/awards?status=active", {
        headers: { ...tenantHeaders, "Content-Type": "application/json" },
      });
      let portProfileId = portId;
      if (profileRes.ok) {
        const data = await profileRes.json();
        // Use portProfileId from existing awards if available
        if (data.awards?.length > 0) {
          // Awards don't expose portProfileId directly, so we'll use the portId
        }
      }

      const res = await fetch("/api/awards", {
        method: "POST",
        headers: { ...tenantHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          portProfileId: portId,
          fain,
          cfda,
          awardingAgency,
          program,
          title,
          description,
          totalAmount: awardAmt,
          performancePeriod: { start: periodStart, end: periodEnd },
          matchPercentage: parseInt(matchPercentage) || 0,
          matchTypes: ["cash"],
          status: "active",
          budgetCategories: categories
            .filter((c) => c.name && c.ceiling)
            .map((c) => ({ name: c.name, ceiling: parseFloat(c.ceiling) || 0 })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create award");
      }

      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create award");
    } finally {
      setSaving(false);
    }
  };

  const steps = ["Award Details", "Financials & Period", "Budget Categories", "Review"];

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <div>
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3">
          <ArrowLeft className="h-4 w-4" /> Back to Awards
        </button>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Award className="h-6 w-6 text-[#3d8b8b]" />
          New Award Intake
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Register a new federal or state grant award</p>
      </div>

      {/* Steps */}
      <div className="flex items-center gap-2">
        {steps.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <button
              onClick={() => i <= step ? setStep(i) : null}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                i === step ? "bg-[#3d8b8b] text-white" : i < step ? "bg-[#3d8b8b]/10 text-[#3d8b8b]" : "bg-muted text-muted-foreground"
              }`}
            >
              {i < step && <CheckCircle2 className="h-3 w-3" />}
              {label}
            </button>
            {i < steps.length - 1 && <ChevronDown className="h-3 w-3 text-muted-foreground rotate-[-90deg]" />}
          </div>
        ))}
      </div>

      {error && (
        <Card className="border-red-200">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 0: Award Details */}
      {step === 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Award Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1">Federal Award ID (FAIN) *</label>
                <Input value={fain} onChange={(e) => setFain(e.target.value)} placeholder="e.g., 693JF72240015" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">CFDA/ALN Number *</label>
                <Input value={cfda} onChange={(e) => setCfda(e.target.value)} placeholder="e.g., 20.823" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Awarding Agency *</label>
                <select value={awardingAgency} onChange={(e) => setAwardingAgency(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                  {AGENCIES.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Program *</label>
                <select value={program} onChange={(e) => setProgram(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                  {PROGRAMS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium block mb-1">Award Title *</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Velasco Terminal Sustainability Expansion" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium block mb-1">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description of the award scope..." className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-y h-20" />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setStep(1)} disabled={!fain || !cfda || !title}>Next: Financials</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 1: Financials */}
      {step === 1 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Financials & Performance Period</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1">Total Award Amount *</label>
                <Input type="number" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} placeholder="0.00" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Match Percentage (%)</label>
                <Input type="number" value={matchPercentage} onChange={(e) => setMatchPercentage(e.target.value)} placeholder="20" min="0" max="100" />
                {awardAmt > 0 && parseInt(matchPercentage) > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Match required: {fmtFull(Math.round(awardAmt * (parseInt(matchPercentage) / (100 - parseInt(matchPercentage)))))}
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Performance Period Start *</label>
                <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Performance Period End *</label>
                <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(0)}>Back</Button>
              <Button onClick={() => setStep(2)} disabled={!totalAmount || !periodStart || !periodEnd}>Next: Budget</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Budget Categories */}
      {step === 2 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              Budget Categories
              <Button variant="outline" size="sm" onClick={addCategory}><Plus className="h-3.5 w-3.5 mr-1" /> Add Category</Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {categories.map((cat, i) => (
              <div key={i} className="flex items-center gap-3">
                <Input
                  value={cat.name}
                  onChange={(e) => updateCategory(i, "name", e.target.value)}
                  placeholder="Category name"
                  className="flex-1"
                />
                <Input
                  type="number"
                  value={cat.ceiling}
                  onChange={(e) => updateCategory(i, "ceiling", e.target.value)}
                  placeholder="Budget ceiling"
                  className="w-40"
                />
                {categories.length > 1 && (
                  <Button variant="ghost" size="sm" onClick={() => removeCategory(i)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}

            <div className={`flex items-center justify-between pt-3 border-t text-sm ${Math.abs(budgetDiff) > 0.01 ? "text-amber-600" : "text-emerald-600"}`}>
              <span>Budget total: {fmtFull(totalBudget)}</span>
              <span>
                {Math.abs(budgetDiff) < 0.01
                  ? "Matches award amount"
                  : budgetDiff > 0
                  ? `${fmtFull(budgetDiff)} unallocated`
                  : `${fmtFull(Math.abs(budgetDiff))} over-allocated`}
              </span>
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={() => setStep(3)}>Next: Review</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Review & Create</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">FAIN:</span> <span className="font-medium">{fain}</span></div>
              <div><span className="text-muted-foreground">CFDA:</span> <span className="font-medium">{cfda}</span></div>
              <div><span className="text-muted-foreground">Agency:</span> <span className="font-medium">{awardingAgency}</span></div>
              <div><span className="text-muted-foreground">Program:</span> <Badge variant="outline">{program}</Badge></div>
              <div className="col-span-2"><span className="text-muted-foreground">Title:</span> <span className="font-medium">{title}</span></div>
              <div><span className="text-muted-foreground">Amount:</span> <span className="font-bold text-[#3d8b8b]">{fmtFull(awardAmt)}</span></div>
              <div><span className="text-muted-foreground">Match:</span> <span className="font-medium">{matchPercentage}%</span></div>
              <div><span className="text-muted-foreground">Period:</span> <span className="font-medium">{fmtDate(periodStart)} — {fmtDate(periodEnd)}</span></div>
              <div><span className="text-muted-foreground">Budget Categories:</span> <span className="font-medium">{categories.filter((c) => c.name).length}</span></div>
            </div>

            {categories.filter((c) => c.name && c.ceiling).length > 0 && (
              <div className="border rounded-lg p-3 space-y-1">
                {categories.filter((c) => c.name && c.ceiling).map((c, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span>{c.name}</span>
                    <span className="tabular-nums font-medium">{fmtFull(parseFloat(c.ceiling) || 0)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
                Create Award
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
