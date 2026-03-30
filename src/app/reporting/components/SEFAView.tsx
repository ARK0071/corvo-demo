"use client";

import { useState, useMemo } from "react";
import { ArrowLeft, BarChart3, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { generateSEFA } from "@/data/reporting";
import { fmtDate, fmtFull } from "./helpers";

interface SEFAViewProps {
  onBack: () => void;
}

export default function SEFAView({ onBack }: SEFAViewProps) {
  const [fyEnd, setFyEnd] = useState("2025-09-30");
  const sefa = useMemo(() => generateSEFA(fyEnd), [fyEnd]);

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <div>
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3">
          <ArrowLeft className="h-4 w-4" /> Back to Reporting
        </button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-[#3d8b8b]" />
              Schedule of Expenditures of Federal Awards (SEFA)
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Fiscal Year Ending {fmtDate(fyEnd)}
            </p>
          </div>
          <div className="shrink-0">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1">Fiscal Year End</label>
            <select
              value={fyEnd}
              onChange={(e) => setFyEnd(e.target.value)}
              className="rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="2023-09-30">FY 2023 (Sep 30, 2023)</option>
              <option value="2024-09-30">FY 2024 (Sep 30, 2024)</option>
              <option value="2025-09-30">FY 2025 (Sep 30, 2025)</option>
              <option value="2026-09-30">FY 2026 (Sep 30, 2026)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Threshold Alert */}
      <Card className={sefa.meetsAuditThreshold ? "border-amber-200 dark:border-amber-800" : ""}>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3">
            {sefa.meetsAuditThreshold ? (
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            )}
            <div>
              <p className="font-medium text-sm">
                Total Federal Expenditures: <span className="tabular-nums">{fmtFull(sefa.totalExpenditures)}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {sefa.meetsAuditThreshold
                  ? "Exceeds $750,000 threshold. Single Audit (2 CFR 200 Subpart F) is required."
                  : "Below $750,000 threshold. Single Audit is not required."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SEFA Table */}
      <Card>
        <CardContent className="pt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground uppercase">CFDA/ALN</th>
                  <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground uppercase">Program</th>
                  <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground uppercase">Agency</th>
                  <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground uppercase">FAIN</th>
                  <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground uppercase">Pass-Through</th>
                  <th className="text-right py-2 text-xs font-medium text-muted-foreground uppercase">Expenditures</th>
                </tr>
              </thead>
              <tbody>
                {sefa.entries.map((entry) => (
                  <tr key={entry.awardId} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="py-2 pr-4 tabular-nums">{entry.cfdaNumber}</td>
                    <td className="py-2 pr-4">{entry.programName}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{entry.awardingAgency}</td>
                    <td className="py-2 pr-4 tabular-nums">{entry.fain}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{entry.passThrough || "Direct"}</td>
                    <td className="py-2 text-right font-medium tabular-nums">{fmtFull(entry.totalExpenditures)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 font-bold">
                  <td colSpan={5} className="py-2 pr-4">Total Federal Expenditures</td>
                  <td className="py-2 text-right tabular-nums">{fmtFull(sefa.totalExpenditures)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
