"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, ClipboardCheck, ListChecks, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTenantHeaders, useTenant } from "@/contexts/tenant-context";
import { fmtDate } from "./helpers";

interface CloseoutItem {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  completedDate?: string;
  required: boolean;
}

interface CloseoutChecklist {
  awardId: string;
  items: CloseoutItem[];
}

interface Award {
  id: string;
  program: string;
  title: string;
  performancePeriod: { start: string; end: string };
}

interface CloseoutViewProps {
  awardId: string;
  onBack: () => void;
  onRefresh: () => void;
}

export default function CloseoutView({ awardId, onBack, onRefresh }: CloseoutViewProps) {
  const headers = useTenantHeaders();
  const tenant = useTenant();
  const [checklist, setChecklist] = useState<CloseoutChecklist | null>(null);
  const [award, setAward] = useState<Award | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (tenant.isLoading) return;
    setLoading(true);
    const h = { ...headers, "Content-Type": "application/json" };
    try {
      const [clRes, awRes] = await Promise.all([
        fetch(`/api/closeout?awardId=${awardId}`, { headers: h }),
        fetch(`/api/awards/form-data?awardId=${awardId}&formType=raw`, { headers: h }),
      ]);
      if (clRes.ok) setChecklist(await clRes.json());
      if (awRes.ok) {
        const data = await awRes.json();
        setAward(data.award || null);
      }
    } catch { /* */ }
    setLoading(false);
  }, [awardId, headers, tenant.isLoading]);

  useEffect(() => { fetchData(); }, [awardId, tenant.isLoading, tenant.portId]);

  const handleToggle = useCallback(async (itemId: string, completed: boolean) => {
    try {
      const res = await fetch("/api/closeout", {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ awardId, itemId, completed }),
      });
      if (res.ok) {
        // Update local state
        setChecklist((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            items: prev.items.map((item) =>
              item.id === itemId
                ? { ...item, completed, completedDate: completed ? new Date().toISOString().split("T")[0] : undefined }
                : item
            ),
          };
        });
        onRefresh();
      }
    } catch { /* */ }
  }, [awardId, headers, onRefresh]);

  if (loading) {
    return <div className="flex-1 flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!checklist || !award) return <p className="p-6 text-muted-foreground">Award not found.</p>;

  const totalRequired = checklist.items.filter((i) => i.required).length;
  const completedRequired = checklist.items.filter((i) => i.required && i.completed).length;

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <div>
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3">
          <ArrowLeft className="h-4 w-4" /> Back to Reporting
        </button>
        <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-amber-500" />
          Closeout: {award.program}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{award.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Performance period ended {fmtDate(award.performancePeriod.end)} &middot; Closeout due within 120 days
        </p>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Closeout Progress</span>
            <span className="text-sm font-bold tabular-nums">{completedRequired}/{totalRequired} required items</span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-[#3d8b8b] rounded-full transition-all" style={{ width: `${totalRequired > 0 ? (completedRequired / totalRequired) * 100 : 0}%` }} />
          </div>
        </CardContent>
      </Card>

      {/* Checklist */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ListChecks className="h-4 w-4" /> Closeout Checklist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {checklist.items.map((item) => (
              <label
                key={item.id}
                className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${item.completed ? "bg-emerald-50 dark:bg-emerald-950/20" : "hover:bg-muted/50"}`}
              >
                <input
                  type="checkbox"
                  checked={item.completed}
                  onChange={(e) => handleToggle(item.id, e.target.checked)}
                  className="rounded mt-0.5"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${item.completed ? "line-through text-muted-foreground" : ""}`}>{item.label}</span>
                    {item.required && <Badge variant="outline" className="text-[9px]">Required</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                  {item.completedDate && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">Completed {fmtDate(item.completedDate)}</p>
                  )}
                </div>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
