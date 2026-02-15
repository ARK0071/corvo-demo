"use client";

import { Card } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { categories, vendors, transactions, getSpendByMonth, getCategoriesByGroup } from "@/data";

function formatCurrency(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n}`;
}

export default function SpendAnalysisPage() {
  const monthlySpend = getSpendByMonth();
  const maxMonthly = Math.max(...monthlySpend.map((m) => m.amount));

  // Spend by category (top 15)
  const catSpend = categories.map((cat) => {
    const spend = transactions.filter((t) => t.categoryId === cat.id).reduce((s, t) => s + t.amount, 0);
    return { ...cat, spend };
  }).sort((a, b) => b.spend - a.spend).slice(0, 15);

  const maxCatSpend = catSpend[0]?.spend || 1;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="flex items-center gap-3 mb-8">
          <TrendingUp className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Spend Analysis</h1>
            <p className="text-sm text-muted-foreground">Monthly trends and category breakdown</p>
          </div>
        </div>

        {/* Monthly Trend */}
        <Card className="p-5 mb-6">
          <h2 className="text-sm font-semibold mb-4">Monthly Spend Trend (2023-2024)</h2>
          <div className="flex items-end gap-1 h-40">
            {monthlySpend.map((m) => {
              const pct = (m.amount / maxMonthly) * 100;
              const is2024 = m.month.startsWith("2024");
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className={`w-full rounded-t ${is2024 ? "bg-primary/70" : "bg-primary/30"}`}
                    style={{ height: `${pct}%` }}
                    title={`${m.month}: ${formatCurrency(m.amount)}`}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
            <span>Jan 2023</span>
            <span>Dec 2024</span>
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded bg-primary/30" /> 2023</div>
            <div className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded bg-primary/70" /> 2024</div>
          </div>
        </Card>

        {/* Category Breakdown */}
        <Card className="p-5">
          <h2 className="text-sm font-semibold mb-4">Spend by Category (Top 15)</h2>
          <div className="space-y-2.5">
            {catSpend.map((cat) => {
              const pct = (cat.spend / maxCatSpend) * 100;
              return (
                <div key={cat.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium truncate max-w-[60%]">{cat.name}</span>
                    <span className="text-xs font-mono text-muted-foreground">{formatCurrency(cat.spend)}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary/50 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
