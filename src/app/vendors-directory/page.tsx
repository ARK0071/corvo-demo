"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Search, ChevronDown, ChevronRight, Shield, Loader2, AlertCircle, ArrowUpDown } from "lucide-react";
import type { PortVendor } from "@/data/port-vendors";

const sectorColors: Record<string, string> = {
  "Marine Construction": "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  "Heavy Civil/Infrastructure": "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  "Environmental/Remediation": "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  "Marine Equipment/Cranes": "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  "Electrical/Power": "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  "Engineering/Design": "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  "Security/IT": "bg-red-500/10 text-red-600 dark:text-red-400",
  "Sustainability/Clean Energy": "bg-green-500/10 text-green-600 dark:text-green-400",
  Other: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
};

const NAICS_OPTIONS = [
  { code: "237990", label: "Marine Construction (237990)" },
  { code: "237110", label: "Water & Sewer Construction (237110)" },
  { code: "237310", label: "Highway & Bridge Construction (237310)" },
  { code: "237120", label: "Oil & Gas Pipeline Construction (237120)" },
  { code: "236220", label: "Commercial Building Construction (236220)" },
  { code: "541620", label: "Environmental Consulting (541620)" },
  { code: "562910", label: "Remediation Services (562910)" },
  { code: "333923", label: "Overhead Crane Manufacturing (333923)" },
  { code: "333120", label: "Construction Machinery Manufacturing (333120)" },
  { code: "238210", label: "Electrical Contractors (238210)" },
  { code: "238220", label: "Plumbing & HVAC Contractors (238220)" },
  { code: "541330", label: "Engineering Services (541330)" },
  { code: "541310", label: "Architectural Services (541310)" },
  { code: "561612", label: "Security Guards & Patrol (561612)" },
  { code: "541512", label: "Computer Systems Design (541512)" },
  { code: "221114", label: "Solar Electric Power (221114)" },
  { code: "221118", label: "Other Electric Power (221118)" },
];

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC",
];

type VendorSortField = "awards" | "amount" | "name";
type VendorSortDir = "desc" | "asc";

function formatAwardAmount(n: number) {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n}`;
}

export default function VendorsDirectoryPage() {
  const [vendors, setVendors] = useState<PortVendor[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [selectedNaics, setSelectedNaics] = useState<string[]>([]);
  const [selectedState, setSelectedState] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<VendorSortField>("awards");
  const [sortDir, setSortDir] = useState<VendorSortDir>("desc");
  const [resultSize, setResultSize] = useState<number>(500);
  const [dataSource, setDataSource] = useState<"both" | "recipients" | "awards">("both");

  function handleSort(field: VendorSortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortField(field);
      setSortDir(field === "name" ? "asc" : "desc");
    }
  }

  const sortedVendors = [...vendors].sort((a, b) => {
    const dir = sortDir === "desc" ? -1 : 1;
    switch (sortField) {
      case "awards":
        return (a.pastPortProjects.length - b.pastPortProjects.length) * dir;
      case "amount":
        return (a.annualRevenue - b.annualRevenue) * dir;
      case "name":
        return a.name.localeCompare(b.name) * dir;
      default:
        return 0;
    }
  });

  async function handleSearch() {
    setLoading(true);
    setError(null);

    try {
      const maxPages = Math.ceil(resultSize / 100);
      const body: Record<string, unknown> = { maxPages, limit: 100, source: dataSource };

      if (selectedNaics.length > 0) {
        body.naicsCodes = selectedNaics;
      }
      if (selectedState) {
        body.state = selectedState;
      }
      if (searchQuery.trim()) {
        body.query = searchQuery.trim();
      }

      const res = await fetch("/api/sam-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to search federal contractors");
      }

      const data = await res.json() as { vendors: PortVendor[]; totalRecords: number };
      setVendors(data.vendors);
      setTotalRecords(data.totalRecords);
      setHasSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function toggleNaics(code: string) {
    setSelectedNaics((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  }

  function toggleVendor(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Building2 className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Vendor Directory</h1>
            <p className="text-sm text-muted-foreground">
              Search federal contractors using USASpending.gov data
            </p>
          </div>
        </div>

        {/* Search Controls */}
        <Card className="p-5 mb-6">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search by company name or keyword..."
                className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="flex gap-3 flex-wrap">
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">All States</option>
                {US_STATES.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
              <select
                value={resultSize}
                onChange={(e) => setResultSize(Number(e.target.value))}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value={100}>100 vendors</option>
                <option value={300}>300 vendors</option>
                <option value={500}>500 vendors</option>
                <option value={1000}>1,000 vendors</option>
              </select>
              <select
                value={dataSource}
                onChange={(e) => setDataSource(e.target.value as "both" | "recipients" | "awards")}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="both">All Sources (Max Coverage)</option>
                <option value="recipients">Top Recipients Only</option>
                <option value="awards">Award Search (Broadest)</option>
              </select>
              <Button onClick={handleSearch} disabled={loading} className="gap-2">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Searching {resultSize} vendors...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    Search Federal Vendors
                  </>
                )}
              </Button>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-2">Filter by NAICS code (port-relevant industries):</p>
              <div className="flex flex-wrap gap-1.5">
                {NAICS_OPTIONS.map((opt) => (
                  <button
                    key={opt.code}
                    onClick={() => toggleNaics(opt.code)}
                    className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors ${
                      selectedNaics.includes(opt.code)
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {!hasSearched && !loading && (
          <div className="text-center py-16 text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-sm">Select NAICS codes or enter a search query, then click &quot;Search Federal Vendors&quot;</p>
            <p className="text-xs mt-1">Results are pulled from USASpending.gov federal contract data</p>
          </div>
        )}

        {hasSearched && (
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-muted-foreground">
              {vendors.length} unique vendors loaded ({totalRecords.toLocaleString()} total awards found)
            </p>
            {vendors.length > 1 && (
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Sort:</span>
                {([["awards", "Awards"], ["amount", "Total Amount"], ["name", "Name"]] as const).map(([field, label]) => (
                  <button
                    key={field}
                    onClick={() => handleSort(field)}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                      sortField === field
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {label} {sortField === field && (sortDir === "desc" ? "\u2193" : "\u2191")}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          {sortedVendors.map((vendor) => {
            const isOpen = expanded.has(vendor.id);

            return (
              <Card key={vendor.id} className="overflow-hidden">
                <button
                  className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors text-left"
                  onClick={() => toggleVendor(vendor.id)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{vendor.name}</span>
                        {vendor.disadvantagedBusiness && (
                          <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
                            <Shield className="h-2.5 w-2.5 mr-0.5" />
                            {vendor.disadvantagedBusiness}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${sectorColors[vendor.sector] || sectorColors.Other}`}>
                          {vendor.sector}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{vendor.headquarters}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-sm font-mono font-medium">{formatAwardAmount(vendor.annualRevenue)}</p>
                    <p className="text-[10px] text-muted-foreground">{vendor.pastPortProjects.length} award{vendor.pastPortProjects.length !== 1 ? "s" : ""}</p>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t px-4 pb-4 pt-3">
                    <p className="text-sm text-muted-foreground mb-3">{vendor.description}</p>

                    {vendor.capabilities.length > 0 && (
                      <div className="mb-3">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                          NAICS / PSC Capabilities ({vendor.capabilities.length})
                        </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {vendor.capabilities.map((cap) => (
                            <Badge key={cap} variant="outline" className="text-[10px]">{cap}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {vendor.certifications.length > 0 && (
                      <div className="mb-3">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                          Business Designations
                        </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {vendor.certifications.map((cert) => (
                            <Badge key={cert} variant="secondary" className="text-[10px]">{cert}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Bonding</span>
                        <p className="text-sm font-medium">{vendor.bondingCapacity > 0 ? "Registered" : "Not registered"}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">UEI</span>
                        <p className="text-sm font-mono">{vendor.id}</p>
                      </div>
                    </div>
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
