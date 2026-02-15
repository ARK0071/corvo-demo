"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tags, Check, X, ChevronRight } from "lucide-react";
import { vendors, categories } from "@/data";

const sampleReviewItems = vendors.slice(0, 12).map((v) => {
  const cat = categories.find((c) => c.id === v.categoryId);
  const sub = cat?.subcategories.find((s) => s.id === v.subcategoryId);
  return {
    id: v.id,
    vendor: v.name,
    description: `Annual spend: $${v.annualSpend.toLocaleString()}`,
    suggestedCategory: cat?.name || "Unknown",
    suggestedSubcategory: sub?.name || "Unknown",
    confidence: Math.floor(Math.random() * 20) + 80,
    status: "pending" as "pending" | "approved" | "rejected",
  };
});

export default function ReviewPage() {
  const [items, setItems] = useState(sampleReviewItems);

  const pending = items.filter((i) => i.status === "pending");
  const approved = items.filter((i) => i.status === "approved").length;
  const rejected = items.filter((i) => i.status === "rejected").length;

  function handleAction(id: string, status: "approved" | "rejected") {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Tags className="h-6 w-6 text-muted-foreground" />
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Categorization Review</h1>
              <p className="text-sm text-muted-foreground">Review suggested category assignments</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-muted-foreground">{pending.length} pending</span>
            <span className="text-green-600">{approved} approved</span>
            <span className="text-red-500">{rejected} rejected</span>
          </div>
        </div>

        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id} className={`p-4 transition-opacity ${item.status !== "pending" ? "opacity-50" : ""}`}>
              <div className="flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium truncate">{item.vendor}</span>
                    <Badge variant={item.confidence >= 90 ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
                      {item.confidence}%
                    </Badge>
                    {item.status === "approved" && <Badge className="bg-green-500/10 text-green-600 text-[10px] px-1.5 py-0">Approved</Badge>}
                    {item.status === "rejected" && <Badge className="bg-red-500/10 text-red-500 text-[10px] px-1.5 py-0">Rejected</Badge>}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span>{item.suggestedCategory}</span>
                    <ChevronRight className="h-3 w-3" />
                    <span>{item.suggestedSubcategory}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                </div>
                {item.status === "pending" && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0 text-green-600 hover:bg-green-500/10" onClick={() => handleAction(item.id, "approved")}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0 text-red-500 hover:bg-red-500/10" onClick={() => handleAction(item.id, "rejected")}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
