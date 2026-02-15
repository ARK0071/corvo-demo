"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ListChecks, Clock, CheckCircle2, User } from "lucide-react";

const initialQueue = [
  { id: "q-001", type: "Category Override", vendor: "ACME Steel Corp", detail: "Suggested: MRO & Industrial Supplies. Override requested to: Raw Materials - Steel", priority: "high", assignee: "Sarah K.", createdAt: "2024-12-15" },
  { id: "q-002", type: "Duplicate Resolution", vendor: "Dell Technologies / Dell Inc", detail: "System detected potential duplicate. Merge or keep separate?", priority: "medium", assignee: "Mike R.", createdAt: "2024-12-14" },
  { id: "q-003", type: "Vendor Approval", vendor: "NewTech Solutions LLC", detail: "New vendor onboarding request. Annual estimated spend: $180k", priority: "medium", assignee: null, createdAt: "2024-12-13" },
  { id: "q-004", type: "Contract Review", vendor: "Palo Alto Networks", detail: "Contract expires in 30 days. Auto-renewal clause detected. Above market by 12%.", priority: "high", assignee: "Sarah K.", createdAt: "2024-12-12" },
  { id: "q-005", type: "Anomaly Review", vendor: "Staples", detail: "Spending anomaly: $45k invoice is 3.2x the usual order amount", priority: "high", assignee: null, createdAt: "2024-12-11" },
  { id: "q-006", type: "Category Override", vendor: "Compass Group", detail: "Suggested: Facility Operations. Override to: Food & Catering Services", priority: "low", assignee: "Mike R.", createdAt: "2024-12-10" },
  { id: "q-007", type: "Vendor Approval", vendor: "CloudSecure Inc", detail: "New cybersecurity vendor. SOC2 compliance pending verification.", priority: "medium", assignee: null, createdAt: "2024-12-09" },
];

const priorityColors = { high: "bg-red-500/10 text-red-500", medium: "bg-amber-500/10 text-amber-600", low: "bg-muted text-muted-foreground" };
const typeColors: Record<string, string> = {
  "Category Override": "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  "Duplicate Resolution": "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  "Vendor Approval": "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  "Contract Review": "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  "Anomaly Review": "bg-red-500/10 text-red-600 dark:text-red-400",
};

export default function QueuePage() {
  const [queue, setQueue] = useState(initialQueue);
  const [resolved, setResolved] = useState<string[]>([]);

  function resolve(id: string) {
    setResolved((prev) => [...prev, id]);
  }

  const active = queue.filter((q) => !resolved.includes(q.id));

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <ListChecks className="h-6 w-6 text-muted-foreground" />
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">HITL Queue</h1>
              <p className="text-sm text-muted-foreground">Human-in-the-loop review items requiring attention</p>
            </div>
          </div>
          <Badge variant="secondary">{active.length} open</Badge>
        </div>

        <div className="space-y-3">
          {queue.map((item) => {
            const isResolved = resolved.includes(item.id);
            return (
              <Card key={item.id} className={`p-4 transition-opacity ${isResolved ? "opacity-40" : ""}`}>
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge className={`text-[10px] px-1.5 py-0 ${typeColors[item.type] || ""}`}>{item.type}</Badge>
                      <Badge className={`text-[10px] px-1.5 py-0 ${priorityColors[item.priority as keyof typeof priorityColors]}`}>{item.priority}</Badge>
                      {isResolved && <Badge className="bg-green-500/10 text-green-600 text-[10px] px-1.5 py-0">Resolved</Badge>}
                    </div>
                    <p className="text-sm font-medium">{item.vendor}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.detail}</p>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{item.createdAt}</span>
                      {item.assignee && <span className="flex items-center gap-1"><User className="h-3 w-3" />{item.assignee}</span>}
                    </div>
                  </div>
                  {!isResolved && (
                    <Button size="sm" variant="outline" className="shrink-0" onClick={() => resolve(item.id)}>
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Resolve
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
