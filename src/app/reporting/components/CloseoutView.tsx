"use client";

import { useState, useMemo } from "react";
import { ArrowLeft, ClipboardCheck, ListChecks } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAwardById } from "@/data/awards";
import { getCloseoutChecklist, updateCloseoutItem } from "@/data/reporting";
import { fmtDate } from "./helpers";

interface CloseoutViewProps {
  awardId: string;
  onBack: () => void;
  onRefresh: () => void;
}

export default function CloseoutView({ awardId, onBack, onRefresh }: CloseoutViewProps) {
  const [, setRefresh] = useState(0);
  const award = useMemo(() => getAwardById(awardId), [awardId]);
  const checklist = useMemo(() => getCloseoutChecklist(awardId), [awardId]);

  const totalRequired = checklist.items.filter((i) => i.required).length;
  const completedRequired = checklist.items.filter((i) => i.required && i.completed).length;

  if (!award) return <p className="p-6 text-muted-foreground">Award not found.</p>;

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
            <span className="text-sm font-bold tabular-nums">
              {completedRequired}/{totalRequired} required items
            </span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-[#3d8b8b] rounded-full transition-all"
              style={{ width: `${totalRequired > 0 ? (completedRequired / totalRequired) * 100 : 0}%` }}
            />
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
                className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  item.completed ? "bg-emerald-50 dark:bg-emerald-950/20" : "hover:bg-muted/50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={item.completed}
                  onChange={(e) => {
                    updateCloseoutItem(awardId, item.id, e.target.checked);
                    setRefresh((n) => n + 1);
                    onRefresh();
                  }}
                  className="rounded mt-0.5"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${item.completed ? "line-through text-muted-foreground" : ""}`}>
                      {item.label}
                    </span>
                    {item.required && <Badge variant="outline" className="text-[9px]">Required</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                  {item.completedDate && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                      Completed {fmtDate(item.completedDate)}
                    </p>
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
