"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Network } from "lucide-react";
import { vendors, categories, duplicateVendorClusters } from "@/data";

export default function VendorGraphPage() {
  const topByCategory = categories.slice(0, 10).map((cat) => {
    const catVendors = vendors.filter((v) => v.categoryId === cat.id).sort((a, b) => b.annualSpend - a.annualSpend).slice(0, 3);
    return { category: cat.name, vendors: catVendors };
  }).filter((g) => g.vendors.length > 0);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Network className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Vendor Graph</h1>
            <p className="text-sm text-muted-foreground">Vendor relationships, duplicates, and category connections</p>
          </div>
        </div>

        {/* Duplicate Clusters */}
        <h2 className="text-sm font-semibold mb-3">Duplicate Vendor Clusters</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
          {duplicateVendorClusters.slice(0, 8).map((cluster) => (
            <Card key={cluster.canonical} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{cluster.canonical}</span>
                <span className="text-xs font-mono text-muted-foreground">${(cluster.totalFragmentedSpend / 1000).toFixed(0)}k</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {cluster.duplicates.map((dup) => (
                  <Badge key={dup} variant="secondary" className="text-[10px]">{dup}</Badge>
                ))}
              </div>
            </Card>
          ))}
        </div>

        {/* Category-Vendor Map */}
        <h2 className="text-sm font-semibold mb-3">Top Vendors by Category</h2>
        <div className="space-y-3">
          {topByCategory.map((group) => (
            <Card key={group.category} className="p-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">{group.category}</p>
              <div className="flex flex-wrap gap-2">
                {group.vendors.map((v) => (
                  <div key={v.id} className="flex items-center gap-2 bg-muted/50 rounded px-3 py-1.5">
                    <span className="text-sm">{v.name}</span>
                    <span className="text-xs text-muted-foreground font-mono">${(v.annualSpend / 1000).toFixed(0)}k</span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
