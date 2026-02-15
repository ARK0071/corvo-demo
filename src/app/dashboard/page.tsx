"use client";

import { Card } from "@/components/ui/card";
import { categories, vendors, transactions, getTotalSpend, getTopVendors, getCategoriesByGroup } from "@/data";
import { LayoutDashboard, DollarSign, Users, FolderTree, TrendingUp, TrendingDown } from "lucide-react";

const groupColors: Record<string, string> = {
  "Technology & Digital": "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  "People & Workplace": "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  "Finance & Operations": "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  "Supply Chain & Logistics": "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  "Infrastructure & Facilities": "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  "Marketing & Sales": "bg-pink-500/10 text-pink-600 dark:text-pink-400",
  "Direct Materials": "bg-red-500/10 text-red-600 dark:text-red-400",
  "Corporate Finance & Admin": "bg-slate-500/10 text-slate-600 dark:text-slate-400",
};

function formatCurrency(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n}`;
}

export default function DashboardPage() {
  const totalSpend = getTotalSpend();
  const topVendors = getTopVendors(5);
  const groups = ["Technology & Digital", "People & Workplace", "Finance & Operations", "Supply Chain & Logistics", "Infrastructure & Facilities", "Marketing & Sales", "Direct Materials", "Corporate Finance & Admin"];

  const txns2024 = transactions.filter((t) => t.date.startsWith("2024"));
  const txns2023 = transactions.filter((t) => t.date.startsWith("2023"));
  const spend2024 = txns2024.reduce((s, t) => s + t.amount, 0);
  const spend2023 = txns2023.reduce((s, t) => s + t.amount, 0);
  const yoyChange = spend2023 > 0 ? ((spend2024 - spend2023) / spend2023) * 100 : 0;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex items-center gap-3 mb-8">
          <LayoutDashboard className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Procurement overview across all categories</p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Total Spend</span>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">{formatCurrency(totalSpend)}</p>
            <p className="text-xs text-muted-foreground mt-1">2023-2024 combined</p>
          </Card>
          <Card className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">YoY Change</span>
              {yoyChange >= 0 ? <TrendingUp className="h-4 w-4 text-red-500" /> : <TrendingDown className="h-4 w-4 text-green-500" />}
            </div>
            <p className="text-2xl font-bold">{yoyChange >= 0 ? "+" : ""}{yoyChange.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground mt-1">2024 vs 2023</p>
          </Card>
          <Card className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Active Vendors</span>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">{vendors.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Across all categories</p>
          </Card>
          <Card className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Categories</span>
              <FolderTree className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">{categories.length}</p>
            <p className="text-xs text-muted-foreground mt-1">In 8 groups</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Vendors */}
          <Card className="p-5">
            <h2 className="text-sm font-semibold mb-4">Top Vendors by Spend</h2>
            <div className="space-y-3">
              {topVendors.map((v, i) => (
                <div key={v.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                    <span className="text-sm font-medium">{v.name}</span>
                  </div>
                  <span className="text-sm font-mono">{formatCurrency(v.annualSpend)}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Spend by Group */}
          <Card className="p-5">
            <h2 className="text-sm font-semibold mb-4">Spend by Group</h2>
            <div className="space-y-3">
              {groups.map((group) => {
                const cats = getCategoriesByGroup(group);
                const catIds = new Set(cats.map((c) => c.id));
                const groupSpend = transactions.filter((t) => catIds.has(t.categoryId)).reduce((s, t) => s + t.amount, 0);
                const pct = totalSpend > 0 ? (groupSpend / totalSpend) * 100 : 0;
                return (
                  <div key={group}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${groupColors[group] || ""}`}>{group}</span>
                      <span className="text-sm font-mono">{formatCurrency(groupSpend)}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary/60 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
