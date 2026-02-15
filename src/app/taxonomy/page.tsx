"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GitBranch, ChevronDown, ChevronRight } from "lucide-react";
import { categories } from "@/data";

const groups = [
  "Technology & Digital",
  "People & Workplace",
  "Finance & Operations",
  "Supply Chain & Logistics",
  "Infrastructure & Facilities",
  "Marketing & Sales",
  "Direct Materials",
  "Corporate Finance & Admin",
];

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

export default function TaxonomyPage() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["Technology & Digital"]));

  function toggleGroup(group: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="flex items-center gap-3 mb-8">
          <GitBranch className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Taxonomy Mapper</h1>
            <p className="text-sm text-muted-foreground">3-level PE Mapping taxonomy -- {groups.length} groups, {categories.length} categories, {categories.reduce((s, c) => s + c.subcategories.length, 0)} subcategories</p>
          </div>
        </div>

        <div className="space-y-3">
          {groups.map((group) => {
            const cats = categories.filter((c) => c.group === group);
            const isOpen = expanded.has(group);

            return (
              <Card key={group} className="overflow-hidden">
                <button
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left"
                  onClick={() => toggleGroup(group)}
                >
                  <div className="flex items-center gap-3">
                    {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${groupColors[group] || ""}`}>{group}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{cats.length} categories</span>
                </button>

                {isOpen && (
                  <div className="border-t px-4 pb-4">
                    {cats.map((cat) => (
                      <div key={cat.id} className="mt-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-[10px] font-mono">{cat.id}</Badge>
                          <span className="text-sm font-medium">{cat.name}</span>
                        </div>
                        <div className="ml-6 space-y-1">
                          {cat.subcategories.map((sub) => (
                            <div key={sub.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded">{sub.id}</span>
                              <span>{sub.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
