"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe2, TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react";
import { marketTrends, vendors } from "@/data";

const tariffScenarios = [
  { region: "China", category: "Hardware & Equipment", currentRate: "25%", proposedRate: "35%", impactedSpend: 3200000, riskLevel: "high" as const },
  { region: "EU", category: "Chemicals & Lubricants", currentRate: "5%", proposedRate: "8%", impactedSpend: 1800000, riskLevel: "medium" as const },
  { region: "Mexico", category: "Industrial Supplies", currentRate: "0%", proposedRate: "10%", impactedSpend: 950000, riskLevel: "medium" as const },
  { region: "India", category: "IT Services", currentRate: "0%", proposedRate: "0%", impactedSpend: 4200000, riskLevel: "low" as const },
  { region: "Vietnam", category: "Packaging & Materials", currentRate: "3%", proposedRate: "12%", impactedSpend: 620000, riskLevel: "high" as const },
];

const riskColors = { high: "bg-red-500/10 text-red-500", medium: "bg-amber-500/10 text-amber-600", low: "bg-green-500/10 text-green-600" };

function formatCurrency(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n}`;
}

export default function TariffPage() {
  const internationalVendors = vendors.filter((v) => !v.location.includes(", ") || !["NY", "CA", "IL", "TX", "GA", "MA", "WA", "CO", "FL", "OR", "AZ", "NC", "MI", "MN", "PA", "TN", "OH", "IN", "SD"].some((st) => v.location.endsWith(st)));

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Globe2 className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Tariff Intelligence</h1>
            <p className="text-sm text-muted-foreground">Trade policy impact analysis and commodity price monitoring</p>
          </div>
        </div>

        {/* Tariff Scenarios */}
        <h2 className="text-sm font-semibold mb-3">Active Tariff Scenarios</h2>
        <div className="space-y-3 mb-8">
          {tariffScenarios.map((s) => (
            <Card key={s.region + s.category} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className={`h-4 w-4 ${s.riskLevel === "high" ? "text-red-500" : s.riskLevel === "medium" ? "text-amber-500" : "text-green-500"}`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{s.region}</span>
                      <span className="text-xs text-muted-foreground">{s.category}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                      <span>{s.currentRate}</span>
                      <span>-&gt;</span>
                      <span className="font-medium text-foreground">{s.proposedRate}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <Badge className={`${riskColors[s.riskLevel]} text-[10px]`}>{s.riskLevel}</Badge>
                  <p className="text-xs text-muted-foreground mt-1">Impacted: {formatCurrency(s.impactedSpend)}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Commodity Prices */}
        <h2 className="text-sm font-semibold mb-3">Commodity Price Watch</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {marketTrends.map((trend) => (
            <Card key={trend.commodity} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{trend.commodity}</span>
                {trend.percentFromAvg > 2 ? <TrendingUp className="h-4 w-4 text-red-500" /> : trend.percentFromAvg < -2 ? <TrendingDown className="h-4 w-4 text-green-500" /> : <Minus className="h-4 w-4 text-muted-foreground" />}
              </div>
              <p className="text-xl font-bold">{trend.currentPrice} <span className="text-xs font-normal text-muted-foreground">{trend.unit}</span></p>
              <p className="text-xs text-muted-foreground mt-1">{trend.percentFromAvg > 0 ? "+" : ""}{trend.percentFromAvg}% vs 12mo avg</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
