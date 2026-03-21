"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ChevronDown,
  ChevronRight,
  X,
  Filter,
  RotateCcw,
  MapPin,
  Building2,
  DollarSign,
  Calendar,
  Hash,
  Shield,
  FileText,
  Briefcase,
  FolderKanban,
  Loader2,
} from "lucide-react";
import {
  PORT_NAICS_OPTIONS,
  NOTICE_TYPE_OPTIONS,
  SET_ASIDE_OPTIONS,
  GULF_COAST_STATES,
  ALL_STATES,
  PRESET_AGENCIES,
  PROCUREMENT_TIERS,
  PORT_PSC_OPTIONS,
  getDefaultFilters,
  type VendorSearchFilters,
  type NoticeType,
} from "@/lib/vendor-filters";
import type { Project } from "@/data/projects";

interface VendorFiltersProps {
  filters: VendorSearchFilters;
  onChange: (filters: VendorSearchFilters) => void;
  onReset: () => void;
  resultCount?: number;
  projects?: Project[];
  selectedProjectId: string | null;
  onProjectChange: (projectId: string | null) => void;
  scoringInProgress?: boolean;
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

function ChipSelect({
  options,
  selected,
  onToggle,
  renderLabel,
}: {
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
  renderLabel?: (option: { value: string; label: string }) => React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const isActive = selected.includes(opt.value);
        return (
          <button
            key={opt.value}
            onClick={() => onToggle(opt.value)}
            className={`text-[11px] px-2 py-1 rounded-md border transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border hover:bg-muted/70 text-muted-foreground"
            }`}
          >
            {renderLabel ? renderLabel(opt) : opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function VendorFilters({
  filters,
  onChange,
  onReset,
  resultCount,
  projects,
  selectedProjectId,
  onProjectChange,
  scoringInProgress,
}: VendorFiltersProps) {
  const [showAllStates, setShowAllStates] = useState(false);
  const activeFilterCount = [
    filters.naicsCodes.length > 0,
    filters.noticeType !== "Award Notice",
    filters.setAsides.length > 0,
    filters.states.length > 0,
    filters.agencies.length > 0 || filters.agencySearch,
    filters.valueRange.min != null || filters.valueRange.max != null,
    filters.pscCodes.length > 0,
  ].filter(Boolean).length;

  function update(partial: Partial<VendorSearchFilters>) {
    onChange({ ...filters, ...partial });
  }

  function toggleInArray(arr: string[], value: string): string[] {
    return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
  }

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/50 bg-muted/30">
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold">Vendor Filters</span>
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
              {activeFilterCount} active
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={onReset} className="h-6 text-[10px] gap-1 px-2">
          <RotateCcw className="h-3 w-3" />
          Reset
        </Button>
      </div>

      {/* Project Relevancy Sort */}
      {projects && projects.length > 0 && (
        <FilterSection
          title="Sort by Project Relevancy"
          icon={<FolderKanban className="h-3.5 w-3.5" />}
          defaultOpen={true}
          badge={selectedProjectId ? 1 : undefined}
        >
          <p className="text-[10px] text-muted-foreground mb-2">
            Re-sort results by semantic relevancy to a project
          </p>
          <div className="space-y-1">
            <button
              onClick={() => onProjectChange(null)}
              className={`w-full text-left text-[11px] px-2.5 py-1.5 rounded-md border transition-colors ${
                !selectedProjectId
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border hover:bg-muted/70 text-muted-foreground"
              }`}
            >
              <span className="font-medium">Default (by award value)</span>
            </button>
            {projects.map((proj) => (
              <button
                key={proj.id}
                onClick={() => onProjectChange(proj.id)}
                disabled={scoringInProgress}
                className={`w-full text-left text-[11px] px-2.5 py-1.5 rounded-md border transition-colors ${
                  selectedProjectId === proj.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border hover:bg-muted/70 text-muted-foreground"
                } disabled:opacity-50`}
              >
                <span className="font-medium">{proj.name}</span>
                <span className="block text-[10px] opacity-70 mt-0.5 truncate">
                  {proj.projectType} — {proj.status}
                </span>
              </button>
            ))}
          </div>
          {scoringInProgress && (
            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Computing relevancy scores...
            </div>
          )}
        </FilterSection>
      )}

      {/* Filter 1: NAICS Codes */}
      <FilterSection
        title="NAICS Code"
        icon={<Hash className="h-3.5 w-3.5" />}
        defaultOpen={true}
        badge={filters.naicsCodes.length}
      >
        <p className="text-[10px] text-muted-foreground mb-2">
          Sec. 60.404 — item classification per federal NAICS
        </p>
        <div className="flex flex-wrap gap-1.5">
          {PORT_NAICS_OPTIONS.map((opt) => {
            const isActive = filters.naicsCodes.includes(opt.code);
            return (
              <button
                key={opt.code}
                onClick={() => update({ naicsCodes: toggleInArray(filters.naicsCodes, opt.code) })}
                title={opt.description}
                className={`text-[10px] px-2 py-1 rounded-md border transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border hover:bg-muted/70 text-muted-foreground"
                }`}
              >
                {opt.code}
              </button>
            );
          })}
        </div>
        {filters.naicsCodes.length > 0 && (
          <div className="mt-2 space-y-0.5">
            {filters.naicsCodes.map((code) => {
              const opt = PORT_NAICS_OPTIONS.find((o) => o.code === code);
              return (
                <div key={code} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span className="font-mono">{code}</span>
                  <span className="opacity-60">—</span>
                  <span>{opt?.description}</span>
                </div>
              );
            })}
          </div>
        )}
      </FilterSection>

      {/* Filter 2: Notice Type */}
      <FilterSection
        title="Notice Type"
        icon={<FileText className="h-3.5 w-3.5" />}
        defaultOpen={true}
        badge={filters.noticeType !== "Award Notice" ? 1 : undefined}
      >
        <div className="space-y-1">
          {NOTICE_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => update({ noticeType: opt.value })}
              className={`w-full text-left text-[11px] px-2.5 py-1.5 rounded-md border transition-colors ${
                filters.noticeType === opt.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border hover:bg-muted/70 text-muted-foreground"
              }`}
            >
              <span className="font-medium">{opt.label}</span>
              <span className="block text-[10px] opacity-70 mt-0.5">{opt.description}</span>
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Filter 3: Set-Aside Status */}
      <FilterSection
        title="Set-Aside Status"
        icon={<Shield className="h-3.5 w-3.5" />}
        badge={filters.setAsides.filter((s) => s !== "").length}
      >
        <p className="text-[10px] text-muted-foreground mb-2">
          Sec. 60.404(d)(4) / 60.458(6) — SBD program impact
        </p>
        <ChipSelect
          options={SET_ASIDE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          selected={filters.setAsides.length === 0 ? [""] : filters.setAsides}
          onToggle={(v) => {
            if (v === "") {
              update({ setAsides: [] });
            } else {
              update({ setAsides: toggleInArray(filters.setAsides.filter((s) => s !== ""), v) });
            }
          }}
        />
      </FilterSection>

      {/* Filter 4: State / Geography */}
      <FilterSection
        title="State / Geography"
        icon={<MapPin className="h-3.5 w-3.5" />}
        defaultOpen={true}
        badge={filters.states.length}
      >
        <p className="text-[10px] text-muted-foreground mb-2">
          Sec. 60.458(7) — total long-term cost includes mobilization
        </p>
        <div className="mb-2">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Gulf Coast</span>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {GULF_COAST_STATES.map((st) => {
              const isActive = filters.states.includes(st.code);
              return (
                <button
                  key={st.code}
                  onClick={() => update({ states: toggleInArray(filters.states, st.code) })}
                  className={`text-[11px] px-2 py-1 rounded-md border transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border hover:bg-muted/70 text-muted-foreground"
                  }`}
                >
                  {st.code}
                </button>
              );
            })}
          </div>
        </div>
        <button
          onClick={() => setShowAllStates(!showAllStates)}
          className="text-[10px] text-primary hover:underline"
        >
          {showAllStates ? "Hide all states" : "Show all states..."}
        </button>
        {showAllStates && (
          <div className="flex flex-wrap gap-1 mt-2 max-h-40 overflow-y-auto">
            {ALL_STATES.filter((s) => !GULF_COAST_STATES.some((g) => g.code === s.code)).map((st) => {
              const isActive = filters.states.includes(st.code);
              return (
                <button
                  key={st.code}
                  onClick={() => update({ states: toggleInArray(filters.states, st.code) })}
                  className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border hover:bg-muted/70 text-muted-foreground"
                  }`}
                >
                  {st.code}
                </button>
              );
            })}
          </div>
        )}
        {filters.states.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {filters.states.map((code) => (
              <Badge
                key={code}
                variant="secondary"
                className="text-[10px] gap-1 cursor-pointer hover:bg-destructive/10"
                onClick={() => update({ states: filters.states.filter((s) => s !== code) })}
              >
                {code}
                <X className="h-2.5 w-2.5" />
              </Badge>
            ))}
          </div>
        )}
      </FilterSection>

      {/* Filter 5: Awarding Agency */}
      <FilterSection
        title="Awarding Agency"
        icon={<Building2 className="h-3.5 w-3.5" />}
        badge={filters.agencies.length || (filters.agencySearch ? 1 : 0)}
      >
        <p className="text-[10px] text-muted-foreground mb-2">
          Agency experience signals federal compliance knowledge
        </p>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {PRESET_AGENCIES.map((ag) => {
            const isActive = filters.agencies.includes(ag.value);
            return (
              <button
                key={ag.value}
                onClick={() => update({ agencies: toggleInArray(filters.agencies, ag.value) })}
                title={ag.description}
                className={`text-[11px] px-2 py-1 rounded-md border transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border hover:bg-muted/70 text-muted-foreground"
                }`}
              >
                {ag.shortLabel}
              </button>
            );
          })}
        </div>
        <Input
          placeholder="Search other agencies..."
          value={filters.agencySearch}
          onChange={(e) => update({ agencySearch: e.target.value })}
          className="h-7 text-[11px]"
        />
      </FilterSection>

      {/* Filter 6: Contract Value Range */}
      <FilterSection
        title="Contract Value Range"
        icon={<DollarSign className="h-3.5 w-3.5" />}
        badge={filters.valueRange.min != null || filters.valueRange.max != null ? 1 : 0}
      >
        <p className="text-[10px] text-muted-foreground mb-2">
          Match vendor scale to Subchapter N procurement tiers
        </p>
        <div className="space-y-1 mb-3">
          {PROCUREMENT_TIERS.map((tier) => (
            <button
              key={tier.label}
              onClick={() =>
                update({
                  valueRange: {
                    min: tier.min,
                    max: tier.max,
                  },
                })
              }
              className={`w-full text-left text-[10px] px-2.5 py-1.5 rounded-md border transition-colors ${
                filters.valueRange.min === tier.min && filters.valueRange.max === tier.max
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border hover:bg-muted/70 text-muted-foreground"
              }`}
            >
              {tier.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="Min $"
            value={filters.valueRange.min ?? ""}
            onChange={(e) =>
              update({
                valueRange: {
                  ...filters.valueRange,
                  min: e.target.value ? Number(e.target.value) : null,
                },
              })
            }
            className="h-7 text-[11px]"
          />
          <Input
            type="number"
            placeholder="Max $"
            value={filters.valueRange.max ?? ""}
            onChange={(e) =>
              update({
                valueRange: {
                  ...filters.valueRange,
                  max: e.target.value ? Number(e.target.value) : null,
                },
              })
            }
            className="h-7 text-[11px]"
          />
        </div>
      </FilterSection>

      {/* Filter 7: Date Range */}
      <FilterSection
        title="Date Range"
        icon={<Calendar className="h-3.5 w-3.5" />}
      >
        <p className="text-[10px] text-muted-foreground mb-2">
          Recent awards = active, registered, currently performing
        </p>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-[10px] text-muted-foreground block mb-1">From</label>
            <Input
              type="date"
              value={filters.dateRange.from}
              onChange={(e) =>
                update({ dateRange: { ...filters.dateRange, from: e.target.value } })
              }
              className="h-7 text-[11px]"
            />
          </div>
          <div className="flex-1">
            <label className="text-[10px] text-muted-foreground block mb-1">To</label>
            <Input
              type="date"
              value={filters.dateRange.to}
              onChange={(e) =>
                update({ dateRange: { ...filters.dateRange, to: e.target.value } })
              }
              className="h-7 text-[11px]"
            />
          </div>
        </div>
      </FilterSection>

      {/* Filter 8: PSC Codes */}
      <FilterSection
        title="Product Service Code (PSC)"
        icon={<Briefcase className="h-3.5 w-3.5" />}
        badge={filters.pscCodes.length}
      >
        <p className="text-[10px] text-muted-foreground mb-2">
          Sec. 60.404 — what was actually purchased (complements NAICS)
        </p>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {PORT_PSC_OPTIONS.map((psc) => {
            const isActive = filters.pscCodes.includes(psc.code);
            return (
              <button
                key={psc.code}
                onClick={() => update({ pscCodes: toggleInArray(filters.pscCodes, psc.code) })}
                className={`w-full text-left text-[10px] px-2 py-1.5 rounded-md border transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border hover:bg-muted/70 text-muted-foreground"
                }`}
              >
                <span className="font-mono">{psc.code}</span>
                <span className="ml-1.5">{psc.label}</span>
              </button>
            );
          })}
        </div>
      </FilterSection>
    </Card>
  );
}
