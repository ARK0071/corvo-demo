"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  ChevronRight,
  DollarSign,
  MapPin,
  Building2,
  Award,
  Shield,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  FileText,
} from "lucide-react";
import type { EnrichedVendor, ComplianceSummary } from "@/lib/vendor-filters";

function formatCurrency(n: number) {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  if (n > 0) return `$${n.toLocaleString()}`;
  return "$0";
}

function formatDate(d: string) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return d;
  }
}

const tierColors: Record<ComplianceSummary["procurementTier"], string> = {
  routine: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20",
  delegated: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  competitive: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
};

const bondColors: Record<ComplianceSummary["bondCapacitySignal"], string> = {
  high: "text-green-600 dark:text-green-400",
  medium: "text-blue-600 dark:text-blue-400",
  low: "text-amber-600 dark:text-amber-400",
  unknown: "text-muted-foreground",
};

const agencyBadgeColors: Record<string, string> = {
  USACE: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  MARAD: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
  DOT: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  EPA: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  "DHS/USCG": "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  Navy: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
  NOAA: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
};

function relevancyColor(score: number): string {
  if (score >= 70) return "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20";
  if (score >= 45) return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
  if (score >= 25) return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
  return "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20";
}

interface VendorCardProps {
  vendor: EnrichedVendor;
  rank: number;
  relevancyScore?: number;
}

export function VendorCard({ vendor, rank, relevancyScore }: VendorCardProps) {
  const [expanded, setExpanded] = useState(false);
  const c = vendor.compliance;

  return (
    <Card className="overflow-hidden">
      {/* Header row */}
      <button
        className="w-full flex items-start justify-between p-3.5 hover:bg-muted/50 transition-colors text-left gap-3"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          )}

          <div className="min-w-0 flex-1">
            {/* Name + badges row */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono text-muted-foreground">#{rank}</span>
              <span className="text-sm font-medium truncate">{vendor.name}</span>

              {/* SAM status */}
              {c.samRegistrationActive && (
                <Badge variant="outline" className="text-[9px] bg-green-500/10 text-green-600 border-green-500/20 gap-0.5">
                  <CheckCircle2 className="h-2.5 w-2.5" />
                  SAM
                </Badge>
              )}

              {/* SBD qualification */}
              {c.sbdQualification && (
                <Badge variant="outline" className="text-[9px] bg-purple-500/10 text-purple-600 border-purple-500/20 gap-0.5">
                  <Shield className="h-2.5 w-2.5" />
                  {c.sbdQualification}
                </Badge>
              )}
            </div>

            {/* Location + stats row */}
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {(vendor.city || vendor.state) && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                  <MapPin className="h-2.5 w-2.5" />
                  {[vendor.city, vendor.state].filter(Boolean).join(", ")}
                </span>
              )}
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <FileText className="h-2.5 w-2.5" />
                {vendor.awardCount} award{vendor.awardCount !== 1 ? "s" : ""}
              </span>
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <DollarSign className="h-2.5 w-2.5" />
                {formatCurrency(vendor.totalAwardValue)} total
              </span>
            </div>

            {/* Agency badges */}
            {c.agencyBadges.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {c.agencyBadges.map((badge) => (
                  <Badge
                    key={badge}
                    variant="outline"
                    className={`text-[9px] ${agencyBadgeColors[badge] || "bg-muted/50 text-muted-foreground border-border"}`}
                  >
                    {badge}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Procurement tier badge + relevancy (right side) */}
        <div className="shrink-0 text-right space-y-1">
          {relevancyScore !== undefined && (
            <Badge variant="outline" className={`text-[9px] ${relevancyColor(relevancyScore)}`}>
              {relevancyScore}% relevant
            </Badge>
          )}
          <Badge variant="outline" className={`text-[9px] ${tierColors[c.procurementTier]}`}>
            {c.procurementTier === "competitive" ? "Full Competitive" : c.procurementTier === "delegated" ? "Delegated" : "Routine"}
          </Badge>
          <p className="text-[10px] text-muted-foreground mt-1">
            Max: {formatCurrency(vendor.maxSingleAward)}
          </p>
        </div>
      </button>

      {/* Expanded detail panel */}
      {expanded && (
        <div className="border-t px-4 pb-4 pt-3 space-y-4">
          {/* Compliance Summary */}
          <div>
            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Subchapter N Compliance Summary
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {/* Procurement Tier */}
              <div className="rounded-md border p-2.5">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                  Procurement Tier
                </span>
                <span className="text-xs font-medium mt-1 block">{c.procurementTierLabel}</span>
              </div>

              {/* Bond Capacity */}
              <div className="rounded-md border p-2.5">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                  Bond Capacity
                </span>
                <span className={`text-xs font-medium mt-1 block ${bondColors[c.bondCapacitySignal]}`}>
                  {c.bondCapacityLabel}
                </span>
              </div>

              {/* SBD Status */}
              <div className="rounded-md border p-2.5">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                  SBD Program
                </span>
                <span className="text-xs font-medium mt-1 block">
                  {c.sbdQualification || "Unrestricted"}
                </span>
              </div>

              {/* SAM Registration */}
              <div className="rounded-md border p-2.5">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                  SAM Registration
                </span>
                <span className={`text-xs font-medium mt-1 flex items-center gap-1 ${c.samRegistrationActive ? "text-green-600 dark:text-green-400" : "text-red-600"}`}>
                  {c.samRegistrationActive ? (
                    <><CheckCircle2 className="h-3 w-3" /> Active</>
                  ) : (
                    <><AlertTriangle className="h-3 w-3" /> Inactive</>
                  )}
                </span>
              </div>

              {/* Agency Experience */}
              <div className="rounded-md border p-2.5 sm:col-span-2">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                  Agency Experience
                </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {c.agencyBadges.length > 0 ? (
                    c.agencyBadges.map((badge) => (
                      <Badge
                        key={badge}
                        variant="outline"
                        className={`text-[10px] ${agencyBadgeColors[badge] || ""}`}
                      >
                        {badge}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">No strategic agency experience</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* NAICS Codes */}
          {vendor.naicsCodes.length > 0 && (
            <div>
              <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                NAICS Codes
              </h4>
              <div className="flex flex-wrap gap-1">
                {vendor.naicsCodes.map((code) => (
                  <Badge key={code} variant="secondary" className="text-[10px] font-mono">
                    {code}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Recent Awards */}
          {vendor.recentAwards.length > 0 && (
            <div>
              <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Recent Awards
              </h4>
              <div className="space-y-1.5">
                {vendor.recentAwards.map((award, i) => (
                  <div
                    key={`${award.solicitationNumber}-${i}`}
                    className="text-[11px] rounded-md border px-2.5 py-2 flex items-start justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{award.title}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-muted-foreground">
                        <span>{award.agency}</span>
                        {award.date && <span>• {formatDate(award.date)}</span>}
                      </div>
                    </div>
                    <span className="font-mono font-medium shrink-0">
                      {formatCurrency(award.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Set-Aside Types */}
          {vendor.setAsideTypes.length > 0 && (
            <div>
              <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Set-Aside History
              </h4>
              <div className="flex flex-wrap gap-1">
                {vendor.setAsideTypes.map((sa) => (
                  <Badge key={sa} variant="outline" className="text-[10px] bg-purple-500/10 text-purple-600 border-purple-500/20">
                    {sa}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
