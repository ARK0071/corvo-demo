"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ChevronDown,
  ChevronRight,
  Filter,
  RotateCcw,
  Building2,
  Tag,
  FileStack,
  Users,
  Hash,
  ListOrdered,
  ArrowUpDown,
  Search,
} from "lucide-react";
import {
  type GrantDiscoveryFilterState,
  OPP_STATUS_OPTIONS,
  GRANTS_AGENCY_PRESETS,
  FUNDING_CATEGORY_OPTIONS,
  FUNDING_INSTRUMENT_OPTIONS,
  ELIGIBILITY_OPTIONS,
  SORT_BY_OPTIONS,
  ROWS_OPTIONS,
  getDefaultGrantDiscoveryFilters,
  countActiveDiscoveryFilters,
} from "@/lib/grants-gov-filters";

interface GrantDiscoveryFiltersProps {
  filters: GrantDiscoveryFilterState;
  onChange: (filters: GrantDiscoveryFilterState) => void;
  onReset: () => void;
}

function FilterSection({
  title,
  icon,
  children,
  defaultOpen = false,
  badge,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string | number;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border/50 last:border-b-0">
      <button
        type="button"
        className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-muted/50 transition-colors text-left"
        onClick={() => setOpen(!open)}
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        )}
        <span className="text-muted-foreground shrink-0">{icon}</span>
        <span className="text-xs font-medium flex-1">{title}</span>
        {badge !== undefined && badge !== 0 && (
          <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
            {badge}
          </Badge>
        )}
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}

function ChipToggle({
  options,
  selected,
  onToggle,
}: {
  options: readonly { value: string; label: string }[] | { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const isActive = selected.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onToggle(opt.value)}
            className={`text-[11px] px-2 py-1 rounded-md border transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border hover:bg-muted/70 text-muted-foreground"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function GrantDiscoveryFilters({ filters, onChange, onReset }: GrantDiscoveryFiltersProps) {
  const active = countActiveDiscoveryFilters(filters);

  function update(partial: Partial<GrantDiscoveryFilterState>) {
    onChange({ ...filters, ...partial });
  }

  function toggle(arr: string[], value: string): string[] {
    return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
  }

  return (
    <Card className="overflow-hidden max-h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/50 bg-muted/30 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs font-semibold truncate">Grants.gov filters</span>
          {active > 0 && (
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5 shrink-0">
              {active} active
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={onReset} className="h-6 text-[10px] gap-1 px-2 shrink-0">
          <RotateCcw className="h-3 w-3" />
          Reset
        </Button>
      </div>

      <div className="overflow-y-auto flex-1 min-h-0">
        <FilterSection
          title="Keyword"
          icon={<Search className="h-3.5 w-3.5" />}
          defaultOpen
          badge={filters.keyword.trim() ? 1 : undefined}
        >
          <p className="text-[10px] text-muted-foreground mb-2">
            Leave empty to use the default port / infrastructure keyword set on the server.
          </p>
          <Input
            value={filters.keyword}
            onChange={(e) => update({ keyword: e.target.value })}
            placeholder="e.g. maritime, PIDP, resilience…"
            className="h-8 text-xs"
          />
        </FilterSection>

        <FilterSection
          title="Opportunity status"
          icon={<ListOrdered className="h-3.5 w-3.5" />}
          defaultOpen
          badge={
            filters.oppStatuses.length > 0 && filters.oppStatuses.length < OPP_STATUS_OPTIONS.length
              ? filters.oppStatuses.length
              : undefined
          }
        >
          <ChipToggle
            options={OPP_STATUS_OPTIONS}
            selected={filters.oppStatuses}
            onToggle={(value) => update({ oppStatuses: toggle(filters.oppStatuses, value) })}
          />
        </FilterSection>

        <FilterSection
          title="Agencies"
          icon={<Building2 className="h-3.5 w-3.5" />}
          badge={
            filters.agencyCodes.length + (filters.agenciesCustom.trim() ? 1 : 0) || undefined
          }
        >
          <p className="text-[10px] text-muted-foreground mb-2">
            Grants.gov uses specific office codes (e.g. DOT-MA). Add more separated by | below.
          </p>
          <ChipToggle
            options={GRANTS_AGENCY_PRESETS}
            selected={filters.agencyCodes}
            onToggle={(value) => update({ agencyCodes: toggle(filters.agencyCodes, value) })}
          />
          <p className="text-[10px] text-muted-foreground mt-3 mb-1">Custom codes (optional)</p>
          <Input
            value={filters.agenciesCustom}
            onChange={(e) => update({ agenciesCustom: e.target.value })}
            placeholder="e.g. DOT-FHWA|DOC-NSF"
            className="h-8 text-xs font-mono"
          />
        </FilterSection>

        <FilterSection
          title="Funding categories"
          icon={<Tag className="h-3.5 w-3.5" />}
          badge={filters.fundingCategories.length || undefined}
        >
          <ChipToggle
            options={FUNDING_CATEGORY_OPTIONS}
            selected={filters.fundingCategories}
            onToggle={(value) => update({ fundingCategories: toggle(filters.fundingCategories, value) })}
          />
        </FilterSection>

        <FilterSection
          title="Funding instruments"
          icon={<FileStack className="h-3.5 w-3.5" />}
          badge={filters.fundingInstruments.length || undefined}
        >
          <ChipToggle
            options={FUNDING_INSTRUMENT_OPTIONS}
            selected={filters.fundingInstruments}
            onToggle={(value) => update({ fundingInstruments: toggle(filters.fundingInstruments, value) })}
          />
        </FilterSection>

        <FilterSection
          title="Eligible applicants"
          icon={<Users className="h-3.5 w-3.5" />}
          badge={filters.eligibilities.length || undefined}
        >
          <p className="text-[10px] text-muted-foreground mb-2">Match NOFO applicant eligibility codes.</p>
          <div className="max-h-48 overflow-y-auto pr-1">
            <ChipToggle
              options={ELIGIBILITY_OPTIONS}
              selected={filters.eligibilities}
              onToggle={(value) => update({ eligibilities: toggle(filters.eligibilities, value) })}
            />
          </div>
        </FilterSection>

        <FilterSection
          title="Identifiers"
          icon={<Hash className="h-3.5 w-3.5" />}
          badge={(filters.oppNum.trim() ? 1 : 0) + (filters.aln.trim() ? 1 : 0) || undefined}
        >
          <p className="text-[10px] text-muted-foreground mb-1.5">Opportunity number</p>
          <Input
            value={filters.oppNum}
            onChange={(e) => update({ oppNum: e.target.value })}
            placeholder="e.g. DOT-OST-2024-0001"
            className="h-8 text-xs font-mono mb-3"
          />
          <p className="text-[10px] text-muted-foreground mb-1.5">CFDA / ALN</p>
          <Input
            value={filters.aln}
            onChange={(e) => update({ aln: e.target.value })}
            placeholder="e.g. 20.823"
            className="h-8 text-xs font-mono"
          />
        </FilterSection>

        <FilterSection
          title="Sort & page size"
          icon={<ArrowUpDown className="h-3.5 w-3.5" />}
          badge={filters.sortBy || filters.rows !== 100 ? 1 : undefined}
        >
          <p className="text-[10px] text-muted-foreground mb-1.5">Sort (search2)</p>
          <select
            value={filters.sortBy}
            onChange={(e) => update({ sortBy: e.target.value })}
            className="w-full h-8 text-xs rounded-md border border-input bg-background px-2 mb-3"
          >
            {SORT_BY_OPTIONS.map((o) => (
              <option key={o.value || "default"} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-muted-foreground mb-1.5">Rows per request</p>
          <div className="flex flex-wrap gap-1.5">
            {ROWS_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => update({ rows: n })}
                className={`text-[11px] px-2 py-1 rounded-md border transition-colors ${
                  filters.rows === n
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border hover:bg-muted/70 text-muted-foreground"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </FilterSection>
      </div>
    </Card>
  );
}

export { getDefaultGrantDiscoveryFilters };
