"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, ChevronDown, ChevronRight, Calendar, DollarSign, Building2 } from "lucide-react";
import { grants } from "@/data/grants";

const statusColors: Record<string, string> = {
  open: "bg-green-500/10 text-green-600 dark:text-green-400",
  upcoming: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  closed: "bg-red-500/10 text-red-600 dark:text-red-400",
};

function formatCurrency(n: number) {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(0)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n}`;
}

export default function GrantsDashboardPage() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleGrant(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const totalFunding = grants.reduce((s, g) => s + g.totalFunding, 0);
  const openGrants = grants.filter((g) => g.status === "open");
  const upcomingGrants = grants.filter((g) => g.status === "upcoming");

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Award className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Grants Dashboard</h1>
            <p className="text-sm text-muted-foreground">{grants.length} federal programs -- {formatCurrency(totalFunding)} total funding available</p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Total Funding</span>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">{formatCurrency(totalFunding)}</p>
            <p className="text-xs text-muted-foreground mt-1">Across all programs</p>
          </Card>
          <Card className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Open Programs</span>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">{openGrants.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Accepting applications</p>
          </Card>
          <Card className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Agencies</span>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">{new Set(grants.map((g) => g.agency)).size}</p>
            <p className="text-xs text-muted-foreground mt-1">Federal agencies</p>
          </Card>
        </div>

        {/* Grant Program Cards */}
        <div className="space-y-3">
          {grants.map((grant) => {
            const isOpen = expanded.has(grant.id);

            return (
              <Card key={grant.id} className="overflow-hidden">
                <button
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left"
                  onClick={() => toggleGrant(grant.id)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold">{grant.shortName}</span>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${statusColors[grant.status]}`}>
                          {grant.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{grant.agency}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-sm font-mono font-medium">{formatCurrency(grant.totalFunding)}</p>
                    <p className="text-[10px] text-muted-foreground">Deadline: {grant.deadline}</p>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t px-4 pb-4 pt-3">
                    <p className="text-sm text-muted-foreground mb-3">{grant.description}</p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Award Range</span>
                        <p className="text-sm font-medium">{formatCurrency(grant.minAward)} - {formatCurrency(grant.maxAward)}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Match Requirement</span>
                        <p className="text-sm font-medium">{grant.matchRequirement > 0 ? `${(grant.matchRequirement * 100).toFixed(0)}% local match` : "No match required"}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Status</span>
                        <p className="text-sm font-medium capitalize">{grant.status}</p>
                      </div>
                    </div>

                    <div className="mb-3">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Focus Areas</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {grant.focusAreas.map((area) => (
                          <Badge key={area} variant="outline" className="text-[10px]">{area}</Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Eligible Activities</span>
                      <ul className="mt-1 space-y-0.5">
                        {grant.eligibleActivities.map((activity) => (
                          <li key={activity} className="text-xs text-muted-foreground flex items-start gap-1.5">
                            <span className="text-primary mt-1 shrink-0">-</span>
                            <span>{activity}</span>
                          </li>
                        ))}
                      </ul>
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
