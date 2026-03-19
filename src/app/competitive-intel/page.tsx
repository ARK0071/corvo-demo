"use client";

import { useState, useCallback } from "react";
import {
  Search,
  DollarSign,
  Award,
  BarChart3,
  Building2,
  Loader2,
  ExternalLink,
  TrendingUp,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ─── Types (mirror server response) ───

interface YearBucket {
  year: number;
  totalAmount: number;
  awardCount: number;
}

interface AgencyBucket {
  agency: string;
  totalAmount: number;
  awardCount: number;
}

interface ProgramBucket {
  program: string;
  totalAmount: number;
  awardCount: number;
}

interface RecentAward {
  recipient: string;
  amount: number;
  startDate: string | null;
  endDate: string | null;
  agency: string;
  assistanceListing: string | null;
  description: string | null;
  stateCode: string | null;
  usaSpendingUrl: string | null;
}

interface AggregatedPortIntel {
  portName: string;
  totalFunding: number;
  awardCount: number;
  avgAward: number;
  dateRange: { earliest: string | null; latest: string | null };
  byYear: YearBucket[];
  topAgencies: AgencyBucket[];
  topPrograms: ProgramBucket[];
  recentAwards: RecentAward[];
}

// ─── Formatting helpers ───

function fmt(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
}

function fmtDate(d: string | null): string {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

// ─── Bar chart (pure CSS) ───

function FundingByYearChart({ data }: { data: YearBucket[] }) {
  if (data.length === 0) return <p className="text-muted-foreground text-sm">No data</p>;
  const maxAmt = Math.max(...data.map((d) => d.totalAmount));

  return (
    <div className="space-y-2">
      {data.map((d) => {
        const pct = maxAmt > 0 ? (d.totalAmount / maxAmt) * 100 : 0;
        return (
          <div key={d.year} className="flex items-center gap-3">
            <span className="w-12 text-sm font-medium text-right tabular-nums">
              {d.year}
            </span>
            <div className="flex-1 h-7 bg-muted rounded overflow-hidden relative">
              <div
                className="h-full bg-[#3d8b8b] rounded transition-all duration-500"
                style={{ width: `${Math.max(pct, 2)}%` }}
              />
              <span className="absolute inset-y-0 left-2 flex items-center text-xs font-medium text-white mix-blend-difference">
                {fmt(d.totalAmount)} ({d.awardCount})
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Page component ───

export default function CompetitiveIntelPage() {
  const [query, setQuery] = useState("Port Freeport");
  const [data, setData] = useState<AggregatedPortIntel | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const doSearch = useCallback(async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const res = await fetch(
        `/api/competitive-intel/port?port_name=${encodeURIComponent(q)}`
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `API returned ${res.status}`);
      }
      const result = (await res.json()) as AggregatedPortIntel;
      setData(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [query]);

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Competitive Intelligence
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Search USAspending for historical grant &amp; assistance awards by
          recipient (port name). Last 5 years by default.
        </p>
      </div>

      {/* Search bar */}
      <div className="flex gap-2 max-w-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && doSearch()}
            placeholder="Enter port or recipient name…"
            className="pl-9"
          />
        </div>
        <Button
          onClick={doSearch}
          disabled={loading || !query.trim()}
          className="bg-[#3d8b8b] hover:bg-[#2d6b6b] text-white"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Search className="h-4 w-4 mr-2" />
          )}
          Search
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-red-700 dark:text-red-400">
              Search failed
            </p>
            <p className="text-sm text-red-600 dark:text-red-300 mt-1">
              {error}
            </p>
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#3d8b8b] mx-auto" />
            <p className="text-muted-foreground text-sm">
              Searching USAspending for &quot;{query}&quot;…
            </p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && searched && data && data.awardCount === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Award className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No awards found</p>
          <p className="text-sm mt-1">
            Try a different port or recipient name.
          </p>
        </div>
      )}

      {/* Results */}
      {!loading && data && data.awardCount > 0 && (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard
              icon={<DollarSign className="h-5 w-5" />}
              label="Total Funding"
              value={fmt(data.totalFunding)}
            />
            <SummaryCard
              icon={<Award className="h-5 w-5" />}
              label="Awards"
              value={data.awardCount.toLocaleString()}
            />
            <SummaryCard
              icon={<TrendingUp className="h-5 w-5" />}
              label="Avg Award"
              value={fmt(data.avgAward)}
            />
            <SummaryCard
              icon={<Calendar className="h-5 w-5" />}
              label="Date Range"
              value={`${fmtDate(data.dateRange.earliest)} – ${fmtDate(data.dateRange.latest)}`}
              small
            />
          </div>

          {/* Funding by year chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4" /> Funding by Year
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FundingByYearChart data={data.byYear} />
            </CardContent>
          </Card>

          {/* Tables row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top agencies */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="h-4 w-4" /> Top Agencies
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SimpleTable
                  rows={data.topAgencies}
                  columns={[
                    { key: "agency", label: "Agency" },
                    {
                      key: "totalAmount",
                      label: "Total",
                      format: (v) => fmt(v as number),
                      align: "right",
                    },
                    {
                      key: "awardCount",
                      label: "#",
                      align: "right",
                    },
                  ]}
                />
              </CardContent>
            </Card>

            {/* Top programs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Award className="h-4 w-4" /> Top Programs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SimpleTable
                  rows={data.topPrograms}
                  columns={[
                    { key: "program", label: "Program" },
                    {
                      key: "totalAmount",
                      label: "Total",
                      format: (v) => fmt(v as number),
                      align: "right",
                    },
                    {
                      key: "awardCount",
                      label: "#",
                      align: "right",
                    },
                  ]}
                />
              </CardContent>
            </Card>
          </div>

          {/* Recent awards */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Award className="h-4 w-4" /> Recent Awards (Top 10)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.recentAwards.map((award, i) => (
                <AwardCard key={i} award={award} />
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── Inline components ───

function SummaryCard({
  icon,
  label,
  value,
  small,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  small?: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-[#3d8b8b]/10 p-2 text-[#3d8b8b]">
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              {label}
            </p>
            <p
              className={`font-bold truncate ${small ? "text-sm" : "text-lg"}`}
            >
              {value}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface ColumnDef {
  key: string;
  label: string;
  format?: (v: unknown) => string;
  align?: "left" | "right";
}

function SimpleTable({
  rows,
  columns,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rows: any[];
  columns: ColumnDef[];
}) {
  if (rows.length === 0) {
    return <p className="text-muted-foreground text-sm">No data</p>;
  }

  return (
    <div className="overflow-x-auto -mx-6 px-6">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            {columns.map((c) => (
              <th
                key={c.key}
                className={`py-2 px-2 font-medium text-muted-foreground text-xs uppercase tracking-wider ${
                  c.align === "right" ? "text-right" : "text-left"
                }`}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b last:border-0 hover:bg-muted/50">
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={`py-2 px-2 ${
                    c.align === "right" ? "text-right tabular-nums" : ""
                  }`}
                >
                  {c.format
                    ? c.format(row[c.key])
                    : String(row[c.key] ?? "-")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AwardCard({ award }: { award: RecentAward }) {
  const snippet =
    award.description && award.description.length > 180
      ? award.description.slice(0, 180) + "…"
      : award.description;

  return (
    <div className="rounded-lg border p-4 hover:bg-muted/30 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-base tabular-nums">
              {fmt(award.amount)}
            </span>
            {award.startDate && (
              <Badge variant="secondary" className="text-xs">
                {award.startDate.slice(0, 4)}
              </Badge>
            )}
            {award.assistanceListing && (
              <Badge variant="outline" className="text-xs">
                AL {award.assistanceListing}
              </Badge>
            )}
            {award.stateCode && (
              <Badge variant="outline" className="text-xs">
                {award.stateCode}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{award.agency}</p>
          <p className="text-sm font-medium">{award.recipient}</p>
          {snippet && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {snippet}
            </p>
          )}
        </div>
        {award.usaSpendingUrl && (
          <a
            href={award.usaSpendingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-[#3d8b8b] hover:text-[#2d6b6b]"
            title="View on USAspending"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>
    </div>
  );
}
