"use client";

import { useEffect, useState, useCallback } from "react";
import { useTenantHeaders } from "@/contexts/tenant-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Circle,
  Upload,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";

interface DashboardData {
  subrecipient: {
    riskLevel: string;
    singleAuditRequired: boolean;
    cumulativeSpend: number;
    monitoringIntensity: string;
    classification: string;
  };
  upcomingDeadlines: Array<{
    id: string;
    title: string;
    dueDate: string;
    reportType: string;
    status: string;
  }>;
}

interface ComplianceItem {
  id: string;
  title: string;
  description: string;
  category: string;
  required: boolean;
  completed: boolean;
  dueDate?: string;
}

const RISK_COLORS: Record<string, string> = {
  low: "bg-emerald-100 text-emerald-700",
  standard: "bg-blue-100 text-blue-700",
  elevated: "bg-amber-100 text-amber-700",
  high: "bg-red-100 text-red-700",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function buildComplianceItems(data: DashboardData): ComplianceItem[] {
  const items: ComplianceItem[] = [];
  const sub = data.subrecipient;

  if (sub.singleAuditRequired) {
    items.push({
      id: "single_audit",
      title: "Single Audit Report",
      description:
        "Submit completed Single Audit (2 CFR 200 Subpart F) for the most recent fiscal year. Required when federal expenditures exceed $750,000.",
      category: "single_audit",
      required: true,
      completed: false,
    });
  }

  items.push({
    id: "debarment",
    title: "Debarment & Suspension Certification",
    description:
      "Certify that your organization and key personnel are not debarred, suspended, or excluded from federal programs (2 CFR 180).",
    category: "certification",
    required: true,
    completed: false,
  });

  items.push({
    id: "conflict_interest",
    title: "Conflict of Interest Disclosure",
    description:
      "Annual disclosure of any actual or potential conflicts of interest related to the subaward.",
    category: "certification",
    required: true,
    completed: false,
  });

  if (sub.classification === "subrecipient") {
    items.push({
      id: "financial_report",
      title: "Financial Status Report",
      description:
        "Submit expenditure report for the current reporting period per the monitoring schedule.",
      category: "financial_report",
      required: true,
      completed: false,
    });

    items.push({
      id: "performance_report",
      title: "Performance Progress Report",
      description:
        "Report on program objectives, milestones, and deliverables for the current period.",
      category: "performance_report",
      required: true,
      completed: false,
    });
  }

  items.push({
    id: "buy_america",
    title: "Buy America Certification",
    description:
      "Certify compliance with Buy America/BABA requirements for any procurements using federal funds.",
    category: "certification",
    required: false,
    completed: false,
  });

  items.push({
    id: "dbe_utilization",
    title: "DBE Utilization Report",
    description:
      "Report on Disadvantaged Business Enterprise participation and good faith efforts.",
    category: "certification",
    required: false,
    completed: false,
  });

  // Mark items completed if they have linked received reports
  for (const deadline of data.upcomingDeadlines) {
    if (deadline.status === "received") {
      const match = items.find(
        (i) =>
          i.category === deadline.reportType ||
          deadline.title.toLowerCase().includes(i.id.replace(/_/g, " "))
      );
      if (match) match.completed = true;
    }
  }

  return items;
}

export default function SubCompliance() {
  const headers = useTenantHeaders();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/sub/dashboard", { headers });
      if (res.ok) {
        setData(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading || !data) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading compliance...</p>
      </div>
    );
  }

  const items = buildComplianceItems(data);
  const completedCount = items.filter((i) => i.completed).length;
  const requiredItems = items.filter((i) => i.required);
  const optionalItems = items.filter((i) => !i.required);

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Compliance</h1>
        <p className="text-sm text-muted-foreground">
          Required certifications and self-service forms
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <ShieldCheck className="h-4 w-4" />
              Completed
            </div>
            <p className="text-lg font-semibold">
              {completedCount}/{items.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground mb-1">Risk Level</div>
            <Badge className={RISK_COLORS[data.subrecipient.riskLevel]}>
              {data.subrecipient.riskLevel}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground mb-1">Monitoring</div>
            <p className="text-sm font-medium capitalize">
              {data.subrecipient.monitoringIntensity.replace(/_/g, " ")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground mb-1">
              Single Audit
            </div>
            {data.subrecipient.singleAuditRequired ? (
              <Badge variant="destructive">Required</Badge>
            ) : (
              <Badge variant="outline">Not Required</Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Required items */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Required Compliance Items
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {requiredItems.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-3 p-3 border rounded-lg"
            >
              {item.completed ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {item.description}
                </p>
              </div>
              {!item.completed && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    (window.location.href = `/sub/documents?prefill=${item.category}`)
                  }
                >
                  <Upload className="h-3.5 w-3.5 mr-1" />
                  Upload
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Optional items */}
      {optionalItems.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Additional Certifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {optionalItems.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 p-3 border rounded-lg"
              >
                {item.completed ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {item.description}
                  </p>
                </div>
                {!item.completed && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      (window.location.href = `/sub/documents?prefill=${item.category}`)
                    }
                  >
                    <Upload className="h-3.5 w-3.5 mr-1" />
                    Upload
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
