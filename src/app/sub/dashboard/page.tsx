"use client";

import { useEffect, useState, useCallback } from "react";
import { useTenantHeaders } from "@/contexts/tenant-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DollarSign,
  FileText,
  AlertTriangle,
  Calendar,
  ClipboardList,
  TrendingUp,
} from "lucide-react";

interface DashboardData {
  subrecipient: {
    entityName: string;
    riskLevel: string;
    monitoringIntensity: string;
    subawardAmount: number;
    cumulativeSpend: number;
    singleAuditRequired: boolean;
    expenseReportingMode: string;
  };
  award: {
    title: string;
    program: string;
    fain: string;
    performancePeriodStart: string;
    performancePeriodEnd: string;
  };
  stats: {
    overdueReports: number;
    upcomingDeadlines: number;
    pendingActionItems: number;
    remainingBalance: number;
    singleAuditThresholdPct: number;
  };
  upcomingDeadlines: Array<{
    id: string;
    title: string;
    dueDate: string;
    reportType: string;
    status: string;
  }>;
  pendingDocs: Array<{
    id: string;
    title: string;
    status: string;
    reviewNotes: string | null;
    updatedAt: string;
  }>;
  recentExpenses: Array<{
    id: string;
    description: string;
    amount: number;
    status: string;
    category: string;
  }>;
  upcomingVisits: Array<{
    id: string;
    type: string;
    scheduledDate: string;
    status: string;
    location: string | null;
  }>;
}

const RISK_COLORS: Record<string, string> = {
  low: "bg-emerald-100 text-emerald-700",
  standard: "bg-blue-100 text-blue-700",
  elevated: "bg-amber-100 text-amber-700",
  high: "bg-red-100 text-red-700",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  submitted: "bg-blue-100 text-blue-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  uploaded: "bg-blue-100 text-blue-700",
  accepted: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  proposed: "bg-blue-100 text-blue-700",
  confirmed: "bg-emerald-100 text-emerald-700",
};

function formatCurrency(val: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(val);
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function SubDashboard() {
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

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Unable to load dashboard. Please try again.
        </p>
      </div>
    );
  }

  const { subrecipient: sub, award, stats } = data;
  const spendPct =
    Number(sub.subawardAmount) > 0
      ? (Number(sub.cumulativeSpend) / Number(sub.subawardAmount)) * 100
      : 0;

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold">{sub.entityName}</h1>
        <p className="text-sm text-muted-foreground">
          {award.program} &mdash; {award.fain}
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              Subaward
            </div>
            <p className="text-lg font-semibold">
              {formatCurrency(Number(sub.subawardAmount))}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              Spent
            </div>
            <p className="text-lg font-semibold">
              {formatCurrency(Number(sub.cumulativeSpend))}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats.remainingBalance)} remaining
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <AlertTriangle className="h-4 w-4" />
              Overdue
            </div>
            <p className="text-lg font-semibold">{stats.overdueReports}</p>
            <p className="text-xs text-muted-foreground">
              {stats.upcomingDeadlines} upcoming
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <ClipboardList className="h-4 w-4" />
              Action Items
            </div>
            <p className="text-lg font-semibold">{stats.pendingActionItems}</p>
          </CardContent>
        </Card>
      </div>

      {/* Spend progress */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Spend Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Progress value={spendPct} className="h-3" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{spendPct.toFixed(1)}% spent</span>
            <span>
              {sub.singleAuditRequired ? (
                <Badge variant="destructive" className="text-[10px]">
                  Single Audit Required
                </Badge>
              ) : stats.singleAuditThresholdPct >= 0.8 ? (
                <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-600">
                  Approaching $750K threshold
                </Badge>
              ) : null}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Badge className={RISK_COLORS[sub.riskLevel]}>{sub.riskLevel} risk</Badge>
            <span className="text-muted-foreground">
              Monitoring: {sub.monitoringIntensity}
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Upcoming Deadlines */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Upcoming Deadlines
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.upcomingDeadlines.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming deadlines</p>
            ) : (
              <div className="space-y-2">
                {data.upcomingDeadlines.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between text-sm border-b pb-2 last:border-0"
                  >
                    <div>
                      <p className="font-medium">{d.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Due {formatDate(d.dueDate)}
                      </p>
                    </div>
                    <Badge
                      className={
                        new Date(d.dueDate) < new Date()
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-700"
                      }
                    >
                      {new Date(d.dueDate) < new Date() ? "Overdue" : d.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Items */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Recent Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.pendingDocs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending documents</p>
            ) : (
              <div className="space-y-2">
                {data.pendingDocs.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between text-sm border-b pb-2 last:border-0"
                  >
                    <div>
                      <p className="font-medium">{d.title}</p>
                      {d.reviewNotes && (
                        <p className="text-xs text-red-600">{d.reviewNotes}</p>
                      )}
                    </div>
                    <Badge className={STATUS_COLORS[d.status] || ""}>{d.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Visits */}
      {data.upcomingVisits.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Monitoring Visits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.upcomingVisits.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between text-sm border-b pb-2 last:border-0"
                >
                  <div>
                    <p className="font-medium capitalize">
                      {v.type.replace(/_/g, " ")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(v.scheduledDate)}
                      {v.location && ` — ${v.location}`}
                    </p>
                  </div>
                  <Badge className={STATUS_COLORS[v.status] || ""}>{v.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance period */}
      <div className="text-xs text-muted-foreground">
        Performance Period: {formatDate(award.performancePeriodStart)} &mdash;{" "}
        {formatDate(award.performancePeriodEnd)}
      </div>
    </div>
  );
}
