"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  ChevronRight,
  DollarSign,
  Layers,
  Award,
  Percent,
  ArrowUpDown,
  Users,
  LayoutGrid,
  Search,
  X,
} from "lucide-react";
import {
  categories,
  vendors,
  transactions,
  getSpendByMonth,
  formatCurrency,
} from "@/data";
import type { Vendor } from "@/data";

// ─── Types ───

type ViewLevel = "group" | "category" | "subcategory" | "vendor";
type SortField = "spend" | "name" | "count";
type SortDir = "desc" | "asc";

interface DrillRow {
  id: string;
  name: string;
  spend: number;
  childCount: number;
  childLabel: string;
  vendorCount: number;
}

interface VendorRow {
  id: string;
  name: string;
  spend: number;
  contractStatus: string;
  riskScore: number;
  location: string;
  diversityStatus: string;
  subcategoryName: string;
  categoryName: string;
}

// ─── Non-Addressable Categories (internal transfers, not true spend) ───

const NON_ADDRESSABLE_CATS = new Set([
  "cat-46", // Financial Transactions (Internal Transfers & Allocations, Interest & Debt, Revenue Adjustments)
  "cat-47", // Miscellaneous & Petty Cash
  "cat-48", // Operational Adjustments
]);

// ─── Precomputed Aggregations ───

const addressableTransactions = transactions.filter((t) => !NON_ADDRESSABLE_CATS.has(t.categoryId));
const totalSpendAll = addressableTransactions.reduce((s, t) => s + t.amount, 0);

// Addressable categories & vendors (exclude non-addressable)
const addressableCategories = categories.filter((c) => !NON_ADDRESSABLE_CATS.has(c.id));
const addressableVendors = vendors.filter((v) => !NON_ADDRESSABLE_CATS.has(v.categoryId));

// Spend by category ID
const spendByCat = new Map<string, number>();
for (const t of addressableTransactions) {
  spendByCat.set(t.categoryId, (spendByCat.get(t.categoryId) || 0) + t.amount);
}

// Spend by subcategory ID
const spendBySub = new Map<string, number>();
for (const t of addressableTransactions) {
  spendBySub.set(t.subcategoryId, (spendBySub.get(t.subcategoryId) || 0) + t.amount);
}

// Vendors by category
const vendorsByCat = new Map<string, Vendor[]>();
for (const v of addressableVendors) {
  const list = vendorsByCat.get(v.categoryId) || [];
  list.push(v);
  vendorsByCat.set(v.categoryId, list);
}

// Vendors by subcategory
const vendorsBySub = new Map<string, Vendor[]>();
for (const v of addressableVendors) {
  const list = vendorsBySub.get(v.subcategoryId) || [];
  list.push(v);
  vendorsBySub.set(v.subcategoryId, list);
}

// Unique groups (from addressable categories only)
const groups = [...new Set(addressableCategories.map((c) => c.group))];

// Category lookup (all categories, for breadcrumb/navigation)
const catById = new Map(categories.map((c) => [c.id, c]));

// Subcategory lookup
const subById = new Map(
  categories.flatMap((c) => c.subcategories.map((s) => [s.id, { ...s, categoryName: c.name, groupName: c.group }]))
);

// Spend by vendor (from addressable transactions)
const spendByVendor = new Map<string, number>();
for (const t of addressableTransactions) {
  spendByVendor.set(t.vendorId, (spendByVendor.get(t.vendorId) || 0) + t.amount);
}

// Vendor locations: group all vendor entries by name to find multi-category vendors
interface VendorLocation {
  vendorId: string;
  categoryId: string;
  categoryName: string;
  subcategoryId: string;
  subcategoryName: string;
  groupName: string;
  spend: number;
}
const vendorLocationsByName = new Map<string, VendorLocation[]>();
for (const v of addressableVendors) {
  const cat = catById.get(v.categoryId);
  const sub = subById.get(v.subcategoryId);
  const loc: VendorLocation = {
    vendorId: v.id,
    categoryId: v.categoryId,
    categoryName: cat?.name || "",
    subcategoryId: v.subcategoryId,
    subcategoryName: sub?.name || "",
    groupName: cat?.group || "",
    spend: spendByVendor.get(v.id) || v.annualSpend,
  };
  const key = v.name.toLowerCase();
  const existing = vendorLocationsByName.get(key) || [];
  existing.push(loc);
  vendorLocationsByName.set(key, existing);
}

// ─── Group Colors ───

const groupColors: Record<string, string> = {
  "Technology & Digital": "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  "People & Workplace": "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  "Finance & Operations": "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  "Supply Chain & Logistics": "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  "Infrastructure & Facilities": "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  "Marketing & Sales": "bg-pink-500/10 text-pink-600 dark:text-pink-400",
  "Direct Materials": "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  "Corporate Finance & Admin": "bg-red-500/10 text-red-600 dark:text-red-400",
};

const contractColors: Record<string, string> = {
  active: "bg-green-500/10 text-green-600 dark:text-green-400",
  expired: "bg-red-500/10 text-red-600 dark:text-red-400",
  no_contract: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
};

// ─── Component ───

export default function SpendAnalysisPage() {
  const [viewLevel, setViewLevel] = useState<ViewLevel>("group");
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [showVendors, setShowVendors] = useState(false);
  const [sortField, setSortField] = useState<SortField>("spend");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedVendorName, setExpandedVendorName] = useState<string | null>(null);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortField(field);
      setSortDir(field === "name" ? "asc" : "desc");
    }
  }

  function drillToGroup(group: string) {
    setSelectedGroup(group);
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setViewLevel("category");
    setShowVendors(false);
    setSortField("spend");
    setSortDir("desc");
    setSearchQuery("");
  }

  function drillToCategory(catId: string) {
    setSelectedCategory(catId);
    setSelectedSubcategory(null);
    setViewLevel("subcategory");
    setShowVendors(false);
    setSortField("spend");
    setSortDir("desc");
    setSearchQuery("");
  }

  function drillToSubcategory(subId: string) {
    setSelectedSubcategory(subId);
    setViewLevel("vendor");
    setShowVendors(false);
    setSortField("spend");
    setSortDir("desc");
    setSearchQuery("");
  }

  function navigateTo(level: ViewLevel) {
    if (level === "group") {
      setSelectedGroup(null);
      setSelectedCategory(null);
      setSelectedSubcategory(null);
    } else if (level === "category") {
      setSelectedCategory(null);
      setSelectedSubcategory(null);
    } else if (level === "subcategory") {
      setSelectedSubcategory(null);
    }
    setViewLevel(level);
    setShowVendors(false);
    setSortField("spend");
    setSortDir("desc");
    setSearchQuery("");
  }

  // ─── Compute Rows for Current Level ───

  const { rows, scopeSpend, scopeLabel } = useMemo(() => {
    const dir = sortDir === "desc" ? -1 : 1;

    if (viewLevel === "group" && !showVendors) {
      // L0: Domain Groups
      const items: DrillRow[] = groups.map((group) => {
        const groupCats = addressableCategories.filter((c) => c.group === group);
        const catIds = new Set(groupCats.map((c) => c.id));
        const spend = addressableTransactions.filter((t) => catIds.has(t.categoryId)).reduce((s, t) => s + t.amount, 0);
        const vCount = addressableVendors.filter((v) => catIds.has(v.categoryId)).length;
        return {
          id: group,
          name: group,
          spend,
          childCount: groupCats.length,
          childLabel: `${groupCats.length} categories`,
          vendorCount: vCount,
        };
      });
      items.sort((a, b) => {
        if (sortField === "spend") return (a.spend - b.spend) * dir;
        if (sortField === "name") return a.name.localeCompare(b.name) * dir;
        return (a.childCount - b.childCount) * dir;
      });
      return { rows: items, scopeSpend: totalSpendAll, scopeLabel: "All Spend" };
    }

    if (viewLevel === "category" && selectedGroup && !showVendors) {
      // L1: Categories within a group (addressable only)
      const groupCats = addressableCategories.filter((c) => c.group === selectedGroup);
      const items: DrillRow[] = groupCats.map((cat) => {
        const spend = spendByCat.get(cat.id) || 0;
        const vCount = vendorsByCat.get(cat.id)?.length || 0;
        return {
          id: cat.id,
          name: cat.name,
          spend,
          childCount: cat.subcategories.length,
          childLabel: `${cat.subcategories.length} subcategories`,
          vendorCount: vCount,
        };
      });
      items.sort((a, b) => {
        if (sortField === "spend") return (a.spend - b.spend) * dir;
        if (sortField === "name") return a.name.localeCompare(b.name) * dir;
        return (a.childCount - b.childCount) * dir;
      });
      const scopeSpend = items.reduce((s, r) => s + r.spend, 0);
      return { rows: items, scopeSpend, scopeLabel: selectedGroup };
    }

    if (viewLevel === "subcategory" && selectedCategory && !showVendors) {
      // L2: Subcategories within a category
      const cat = catById.get(selectedCategory);
      if (!cat) return { rows: [], scopeSpend: 0, scopeLabel: "" };
      const items: DrillRow[] = cat.subcategories.map((sub) => {
        const spend = spendBySub.get(sub.id) || 0;
        const vCount = vendorsBySub.get(sub.id)?.length || 0;
        return {
          id: sub.id,
          name: sub.name,
          spend,
          childCount: vCount,
          childLabel: `${vCount} vendors`,
          vendorCount: vCount,
        };
      });
      items.sort((a, b) => {
        if (sortField === "spend") return (a.spend - b.spend) * dir;
        if (sortField === "name") return a.name.localeCompare(b.name) * dir;
        return (a.childCount - b.childCount) * dir;
      });
      const scopeSpend = items.reduce((s, r) => s + r.spend, 0);
      return { rows: items, scopeSpend, scopeLabel: cat.name };
    }

    return { rows: [], scopeSpend: 0, scopeLabel: "" };
  }, [viewLevel, selectedGroup, selectedCategory, showVendors, sortField, sortDir]);

  // ─── Vendor Rows (for vendor level or vendor toggle) ───

  const vendorRows = useMemo((): VendorRow[] => {
    const dir = sortDir === "desc" ? -1 : 1;
    let filtered: Vendor[];

    if (viewLevel === "vendor" && selectedSubcategory) {
      filtered = vendorsBySub.get(selectedSubcategory) || [];
    } else if (showVendors) {
      if (selectedCategory) {
        filtered = vendorsByCat.get(selectedCategory) || [];
      } else if (selectedGroup) {
        const groupCats = addressableCategories.filter((c) => c.group === selectedGroup);
        const catIds = new Set(groupCats.map((c) => c.id));
        filtered = addressableVendors.filter((v) => catIds.has(v.categoryId));
      } else {
        filtered = addressableVendors;
      }
    } else {
      return [];
    }

    const mapped: VendorRow[] = filtered.map((v) => {
      const sub = subById.get(v.subcategoryId);
      const cat = catById.get(v.categoryId);
      return {
        id: v.id,
        name: v.name,
        spend: spendByVendor.get(v.id) || v.annualSpend,
        contractStatus: v.contractStatus,
        riskScore: v.riskScore,
        location: v.location,
        diversityStatus: v.diversityStatus,
        subcategoryName: sub?.name || "",
        categoryName: cat?.name || "",
      };
    });

    mapped.sort((a, b) => {
      if (sortField === "spend") return (a.spend - b.spend) * dir;
      if (sortField === "name") return a.name.localeCompare(b.name) * dir;
      return (a.riskScore - b.riskScore) * dir;
    });

    return mapped;
  }, [viewLevel, selectedGroup, selectedCategory, selectedSubcategory, showVendors, sortField, sortDir]);

  // ─── Search Filtering ───

  const q = searchQuery.trim().toLowerCase();

  const filteredRows = useMemo(() => {
    if (!q) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(q));
  }, [rows, q]);

  const filteredVendorRows = useMemo(() => {
    if (!q) return vendorRows;
    return vendorRows.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.categoryName.toLowerCase().includes(q) ||
        v.subcategoryName.toLowerCase().includes(q) ||
        v.location.toLowerCase().includes(q)
    );
  }, [vendorRows, q]);

  // Cross-level search: when searching at top level, show matches from all levels
  type SearchResult = { type: "group" | "category" | "subcategory" | "vendor"; id: string; name: string; spend: number; parent: string; locationCount?: number };

  const crossLevelResults = useMemo((): SearchResult[] => {
    if (!q || (viewLevel !== "group" && !showVendors) || showVendors) return [];
    if (viewLevel !== "group") return [];

    const results: SearchResult[] = [];

    // Search categories (addressable only)
    for (const cat of addressableCategories) {
      if (cat.name.toLowerCase().includes(q)) {
        results.push({ type: "category", id: cat.id, name: cat.name, spend: spendByCat.get(cat.id) || 0, parent: cat.group });
      }
      // Search subcategories
      for (const sub of cat.subcategories) {
        if (sub.name.toLowerCase().includes(q)) {
          results.push({ type: "subcategory", id: sub.id, name: sub.name, spend: spendBySub.get(sub.id) || 0, parent: cat.name });
        }
      }
    }

    // Search vendors - deduplicate by name, aggregate spend across all locations
    const seenVendorNames = new Set<string>();
    for (const v of addressableVendors) {
      if (v.name.toLowerCase().includes(q)) {
        const nameKey = v.name.toLowerCase();
        if (seenVendorNames.has(nameKey)) continue;
        seenVendorNames.add(nameKey);

        const locations = vendorLocationsByName.get(nameKey) || [];
        const totalSpend = locations.reduce((s, loc) => s + loc.spend, 0);
        const firstCat = catById.get(v.categoryId);
        results.push({
          type: "vendor",
          id: v.id,
          name: v.name,
          spend: totalSpend,
          parent: locations.length > 1 ? `${locations.length} categories` : firstCat?.name || "",
          locationCount: locations.length,
        });
      }
    }

    results.sort((a, b) => b.spend - a.spend);
    return results.slice(0, 50);
  }, [q, viewLevel, showVendors]);

  const isSearching = q.length > 0;
  const hasCrossResults = crossLevelResults.length > 0;

  // ─── Monthly Trend (scoped) ───

  const monthlySpend = useMemo(() => {
    let filtered = addressableTransactions;
    if (selectedSubcategory) {
      filtered = addressableTransactions.filter((t) => t.subcategoryId === selectedSubcategory);
    } else if (selectedCategory) {
      filtered = addressableTransactions.filter((t) => t.categoryId === selectedCategory);
    } else if (selectedGroup) {
      const groupCats = addressableCategories.filter((c) => c.group === selectedGroup);
      const catIds = new Set(groupCats.map((c) => c.id));
      filtered = addressableTransactions.filter((t) => catIds.has(t.categoryId));
    }
    return getSpendByMonth(filtered);
  }, [selectedGroup, selectedCategory, selectedSubcategory]);

  const maxMonthly = Math.max(...monthlySpend.map((m) => m.amount), 1);

  // ─── KPIs ───

  const showingVendors = viewLevel === "vendor" || showVendors;
  const displayRows = isSearching ? filteredRows : rows;
  const displayVendorRows = isSearching ? filteredVendorRows : vendorRows;
  const currentScopeSpend = showingVendors
    ? displayVendorRows.reduce((s, v) => s + v.spend, 0)
    : isSearching && hasCrossResults ? crossLevelResults.reduce((s, r) => s + r.spend, 0) : scopeSpend;
  const itemCount = showingVendors ? displayVendorRows.length
    : isSearching && hasCrossResults ? crossLevelResults.length
    : displayRows.length;
  const topItem = showingVendors
    ? displayVendorRows[0]?.name || "-"
    : isSearching && hasCrossResults ? crossLevelResults[0]?.name || "-"
    : displayRows[0]?.name || "-";
  const pctOfTotal = totalSpendAll > 0 ? (currentScopeSpend / totalSpendAll) * 100 : 0;

  // ─── Breadcrumb ───

  const breadcrumbs: { label: string; level: ViewLevel }[] = [{ label: "All Spend", level: "group" }];
  if (selectedGroup) breadcrumbs.push({ label: selectedGroup, level: "category" });
  if (selectedCategory) {
    const cat = catById.get(selectedCategory);
    if (cat) breadcrumbs.push({ label: cat.name, level: "subcategory" });
  }
  if (selectedSubcategory) {
    const sub = subById.get(selectedSubcategory);
    if (sub) breadcrumbs.push({ label: sub.name, level: "vendor" });
  }

  const maxRowSpend = showingVendors
    ? Math.max(...displayVendorRows.map((v) => v.spend), 1)
    : isSearching && hasCrossResults
      ? Math.max(...crossLevelResults.map((r) => r.spend), 1)
      : Math.max(...displayRows.map((r) => r.spend), 1);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-5xl px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <TrendingUp className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Spend Analysis</h1>
            <p className="text-sm text-muted-foreground">Drill down by group, category, subcategory, and vendor</p>
          </div>
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1 mb-6 flex-wrap">
          {breadcrumbs.map((bc, i) => (
            <span key={bc.level} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
              <button
                onClick={() => navigateTo(bc.level)}
                className={`text-sm px-2 py-0.5 rounded transition-colors ${
                  i === breadcrumbs.length - 1
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {bc.label}
              </button>
            </span>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setExpandedVendorName(null); }}
            placeholder="Search groups, categories, subcategories, or vendors..."
            className="w-full rounded-md border border-input bg-background pl-9 pr-9 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(""); setExpandedVendorName(null); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-muted-foreground">Scope Spend</span>
              <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <p className="text-lg font-bold font-mono">{formatCurrency(currentScopeSpend)}</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-muted-foreground">{showingVendors ? "Vendors" : "Items"}</span>
              <Layers className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <p className="text-lg font-bold">{itemCount}</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-muted-foreground">Top {showingVendors ? "Vendor" : "Item"}</span>
              <Award className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold truncate">{topItem}</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-muted-foreground">% of Total</span>
              <Percent className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <p className="text-lg font-bold font-mono">{pctOfTotal.toFixed(1)}%</p>
          </Card>
        </div>

        {/* Monthly Trend */}
        <Card className="p-5 mb-6">
          <h2 className="text-sm font-semibold mb-3">Monthly Spend Trend</h2>
          <div className="flex items-end gap-1 h-32">
            {monthlySpend.map((m) => {
              const pct = (m.amount / maxMonthly) * 100;
              const is2024 = m.month.startsWith("2024");
              return (
                <div key={m.month} className="flex-1 h-full flex flex-col justify-end">
                  <div
                    className={`w-full rounded-t ${is2024 ? "bg-primary/70" : "bg-primary/30"}`}
                    style={{ height: `${pct}%` }}
                    title={`${m.month}: ${formatCurrency(m.amount)}`}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
            <span>Jan 2023</span>
            <span>Dec 2024</span>
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded bg-primary/30" /> 2023</div>
            <div className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded bg-primary/70" /> 2024</div>
          </div>
        </Card>

        {/* Controls: View Toggle + Sort */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          {/* View Toggle */}
          {viewLevel !== "vendor" && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setShowVendors(false); setSortField("spend"); setSortDir("desc"); }}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
                  !showVendors ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                <LayoutGrid className="h-3 w-3" />
                Hierarchy
              </button>
              <button
                onClick={() => { setShowVendors(true); setSortField("spend"); setSortDir("desc"); }}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
                  showVendors ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                <Users className="h-3 w-3" />
                Vendors
              </button>
            </div>
          )}

          {/* Sort */}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Sort:</span>
            {(showingVendors
              ? ([["spend", "Spend"], ["name", "Name"], ["count", "Risk"]] as const)
              : ([["spend", "Spend"], ["name", "Name"], ["count", "Count"]] as const)
            ).map(([field, label]) => (
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
        </div>

        {/* Data Rows */}
        <div className="space-y-1.5">
          {/* Cross-level search results (shown when searching at top level) */}
          {isSearching && hasCrossResults && !showingVendors && viewLevel === "group" ? (
            <>
              <p className="text-xs text-muted-foreground mb-2">
                {crossLevelResults.length} results for &quot;{searchQuery}&quot; across all levels
              </p>
              {crossLevelResults.map((result) => {
                const pct = (result.spend / maxRowSpend) * 100;
                const typeLabels: Record<string, string> = { group: "Group", category: "Category", subcategory: "Subcategory", vendor: "Vendor" };
                const typeColors: Record<string, string> = {
                  group: "bg-primary/10 text-primary",
                  category: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
                  subcategory: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
                  vendor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                };

                const isVendor = result.type === "vendor";
                const isExpanded = isVendor && expandedVendorName === result.name.toLowerCase();
                const vendorLocations = isVendor ? vendorLocationsByName.get(result.name.toLowerCase()) || [] : [];

                return (
                  <div key={`${result.type}-${result.id}`}>
                    <button
                      onClick={() => {
                        if (isVendor) {
                          // Toggle expand to show all locations
                          setExpandedVendorName(isExpanded ? null : result.name.toLowerCase());
                        } else {
                          setSearchQuery("");
                          setExpandedVendorName(null);
                          if (result.type === "category") {
                            const cat = catById.get(result.id);
                            if (cat) { drillToGroup(cat.group); setTimeout(() => drillToCategory(result.id), 0); }
                          } else if (result.type === "subcategory") {
                            const sub = subById.get(result.id);
                            if (sub) {
                              const cat = catById.get(sub.parentCategoryId);
                              if (cat) { setSelectedGroup(cat.group); setSelectedCategory(cat.id); drillToSubcategory(result.id); }
                            }
                          }
                        }
                      }}
                      className={`w-full text-left rounded-lg border bg-card p-3 hover:bg-muted/50 transition-colors group ${isExpanded ? "border-primary/40 bg-primary/5" : ""}`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0 ${typeColors[result.type] || ""}`}>
                            {typeLabels[result.type]}
                          </span>
                          <span className="text-sm font-medium truncate">{result.name}</span>
                          {isVendor && vendorLocations.length > 0 && (
                            <Badge variant="outline" className="text-[10px] shrink-0">
                              {vendorLocations.length} {vendorLocations.length === 1 ? "location" : "locations"}
                            </Badge>
                          )}
                          {!isVendor && result.parent && (
                            <span className="text-[10px] text-muted-foreground shrink-0">in {result.parent}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          <span className="text-sm font-mono font-medium">{formatCurrency(result.spend)}</span>
                          {isVendor ? (
                            <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                        </div>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary/40 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </button>

                    {/* Expanded vendor locations */}
                    {isExpanded && vendorLocations.length > 0 && (
                      <div className="ml-4 mt-1 space-y-1 border-l-2 border-primary/20 pl-3">
                        {vendorLocations.map((loc) => (
                          <button
                            key={loc.vendorId}
                            onClick={() => {
                              setSearchQuery("");
                              setExpandedVendorName(null);
                              setSelectedGroup(loc.groupName);
                              setSelectedCategory(loc.categoryId);
                              drillToSubcategory(loc.subcategoryId);
                            }}
                            className="w-full text-left rounded-md border bg-card p-2.5 hover:bg-muted/50 transition-colors group"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <span className="text-[10px] text-muted-foreground shrink-0">{loc.groupName}</span>
                                <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                                <span className="text-xs font-medium truncate">{loc.categoryName}</span>
                                <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                                <span className="text-xs text-muted-foreground truncate">{loc.subcategoryName}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 ml-3">
                                <span className="text-xs font-mono font-medium">{formatCurrency(loc.spend)}</span>
                                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          ) : (
            <>
              {!showingVendors &&
                displayRows.map((row) => {
                  const pct = (row.spend / maxRowSpend) * 100;
                  const isGroup = viewLevel === "group";
                  const colorClass = isGroup ? groupColors[row.name] || "" : "";

                  return (
                    <button
                      key={row.id}
                      onClick={() => {
                        if (viewLevel === "group") drillToGroup(row.id);
                        else if (viewLevel === "category") drillToCategory(row.id);
                        else if (viewLevel === "subcategory") drillToSubcategory(row.id);
                      }}
                      className="w-full text-left rounded-lg border bg-card p-3 hover:bg-muted/50 transition-colors group"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="text-sm font-medium truncate">{row.name}</span>
                          {isGroup && colorClass && (
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${colorClass}`}>
                              {row.childCount} cat
                            </span>
                          )}
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {row.childLabel}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          <span className="text-sm font-mono font-medium">{formatCurrency(row.spend)}</span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary/40 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </button>
                  );
                })}

              {showingVendors &&
                displayVendorRows.map((v) => {
                  const pct = (v.spend / maxRowSpend) * 100;

                  return (
                    <div
                      key={v.id}
                      className="rounded-lg border bg-card p-3"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="text-sm font-medium truncate">{v.name}</span>
                          {v.diversityStatus !== "None" && (
                            <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
                              {v.diversityStatus}
                            </Badge>
                          )}
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${contractColors[v.contractStatus] || ""}`}>
                            {v.contractStatus === "no_contract" ? "No Contract" : v.contractStatus}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 ml-3">
                          <div className="text-right">
                            <p className="text-sm font-mono font-medium">{formatCurrency(v.spend)}</p>
                            <p className="text-[10px] text-muted-foreground">Risk: {v.riskScore}</p>
                          </div>
                        </div>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-1.5">
                        <div
                          className="h-full bg-primary/40 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span>{v.location}</span>
                        {v.subcategoryName && (
                          <>
                            <span>·</span>
                            <span>{v.categoryName} &gt; {v.subcategoryName}</span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
            </>
          )}
        </div>

        {((showingVendors ? displayVendorRows.length : isSearching && hasCrossResults && viewLevel === "group" ? crossLevelResults.length : displayRows.length) === 0) && (
          <div className="text-center py-12 text-muted-foreground">
            <Layers className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">{isSearching ? `No results for "${searchQuery}"` : "No data at this level"}</p>
          </div>
        )}
      </div>
    </div>
  );
}
