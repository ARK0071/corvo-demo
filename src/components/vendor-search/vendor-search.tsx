"use client";

import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Search,
  Loader2,
  Users,
  AlertCircle,
  Download,
  SlidersHorizontal,
  ChevronLeft,
  BarChart3,
  Shield,
  DollarSign,
  Building2,
  FileText,
} from "lucide-react";
import {
  getDefaultFilters,
  type VendorSearchFilters,
  type EnrichedVendor,
} from "@/lib/vendor-filters";
import { VendorFilters } from "./vendor-filters";
import { VendorCard } from "./vendor-card";

function formatCurrency(n: number) {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  if (n > 0) return `$${n.toLocaleString()}`;
  return "$0";
}

interface SearchResponse {
  vendors: EnrichedVendor[];
  totalRecords: number;
  filtersApplied: Record<string, unknown>;
}

export function VendorSearch() {
  const [filters, setFilters] = useState<VendorSearchFilters>(getDefaultFilters);
  const [vendors, setVendors] = useState<EnrichedVendor[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [showFilters, setShowFilters] = useState(true);

  const handleSearch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/vendor-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filters),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Search failed");
      }

      const data: SearchResponse = await res.json();
      setVendors(data.vendors);
      setTotalRecords(data.totalRecords);
      setHasSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const handleReset = useCallback(() => {
    setFilters(getDefaultFilters());
    setVendors([]);
    setTotalRecords(0);
    setHasSearched(false);
    setError(null);
  }, []);

  // Aggregate stats for the results summary
  const stats = vendors.length > 0 ? {
    totalValue: vendors.reduce((sum, v) => sum + v.totalAwardValue, 0),
    avgAwards: Math.round(vendors.reduce((sum, v) => sum + v.awardCount, 0) / vendors.length),
    sbdCount: vendors.filter((v) => v.compliance.sbdQualification).length,
    competitiveCount: vendors.filter((v) => v.compliance.procurementTier === "competitive").length,
    uniqueAgencies: new Set(vendors.flatMap((v) => v.compliance.agencyBadges)).size,
  } : null;

  return (
    <div className="flex gap-4 items-start">
      {/* Filter Panel (Left) */}
      {showFilters && (
        <div className="w-72 shrink-0 sticky top-4">
          <VendorFilters
            filters={filters}
            onChange={setFilters}
            onReset={handleReset}
            resultCount={vendors.length}
          />
          <Button
            onClick={handleSearch}
            disabled={loading}
            className="w-full mt-3 gap-2"
            size="sm"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Search className="h-3.5 w-3.5" />
            )}
            {loading ? "Searching GovCon..." : "Search Vendors"}
          </Button>
        </div>
      )}

      {/* Results Panel (Right) */}
      <div className="flex-1 min-w-0">
        {/* Results header bar */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {!showFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(true)}
                className="gap-1 h-7 text-[11px]"
              >
                <SlidersHorizontal className="h-3 w-3" />
                Filters
              </Button>
            )}
            {showFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(false)}
                className="gap-1 h-7 text-[11px]"
              >
                <ChevronLeft className="h-3 w-3" />
                Hide Filters
              </Button>
            )}
            {hasSearched && (
              <span className="text-xs text-muted-foreground">
                {vendors.length} vendor{vendors.length !== 1 ? "s" : ""} found
                {totalRecords > 0 && ` (${totalRecords} total records)`}
              </span>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <Card className="p-4 mb-3 border-destructive/50 bg-destructive/5">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <div>
                <p className="text-sm text-destructive font-medium">Search Error</p>
                <p className="text-xs text-destructive/80 mt-0.5">{error}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Loading */}
        {loading && (
          <Card className="p-8">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
              <div className="text-center">
                <p className="text-sm font-medium">Searching Federal Contracts</p>
                <p className="text-xs mt-1">
                  Querying GovCon API with {filters.naicsCodes.length} NAICS code{filters.naicsCodes.length !== 1 ? "s" : ""},
                  {" "}{filters.states.length} state{filters.states.length !== 1 ? "s" : ""}...
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Empty state */}
        {!loading && !hasSearched && (
          <Card className="p-12">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Users className="h-10 w-10 opacity-30" />
              <div className="text-center">
                <p className="text-sm font-medium">Vendor Intelligence Search</p>
                <p className="text-xs mt-1 max-w-md">
                  Configure filters to find qualified federal contractors. Results are enriched with
                  Subchapter N compliance data to support Texas Water Code Ch. 60 procurement decisions.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* No results */}
        {!loading && hasSearched && vendors.length === 0 && (
          <Card className="p-8">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Search className="h-8 w-8 opacity-30" />
              <div className="text-center">
                <p className="text-sm font-medium">No Vendors Found</p>
                <p className="text-xs mt-1">
                  Try broadening your filters — add more NAICS codes, expand the state selection,
                  or widen the date range.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Results summary stats */}
        {!loading && stats && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3">
            <Card className="p-2.5 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Vendors</p>
              <p className="text-lg font-semibold font-mono">{vendors.length}</p>
            </Card>
            <Card className="p-2.5 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Value</p>
              <p className="text-lg font-semibold font-mono">{formatCurrency(stats.totalValue)}</p>
            </Card>
            <Card className="p-2.5 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg Awards</p>
              <p className="text-lg font-semibold font-mono">{stats.avgAwards}</p>
            </Card>
            <Card className="p-2.5 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">SBD Qualified</p>
              <p className="text-lg font-semibold font-mono">{stats.sbdCount}</p>
            </Card>
            <Card className="p-2.5 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Competitive-Tier</p>
              <p className="text-lg font-semibold font-mono">{stats.competitiveCount}</p>
            </Card>
          </div>
        )}

        {/* Vendor cards */}
        {!loading && vendors.length > 0 && (
          <div className="space-y-2">
            {vendors.map((vendor, i) => (
              <VendorCard key={vendor.id} vendor={vendor} rank={i + 1} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
