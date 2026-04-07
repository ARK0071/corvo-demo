"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  AlertCircle,
  MapPin,
  ExternalLink,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";
import type { DiscoveredGrant } from "@/lib/grants-gov";
import type { GrantScore } from "@/data/grant-scoring";
import { useProfile } from "@/components/profile-provider";
import { initializeProjectsForProfile } from "@/data/projects";

function formatCurrency(n: number) {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(0)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n}`;
}

const statusColors: Record<string, string> = {
  posted: "bg-green-500/10 text-green-600 dark:text-green-400",
  open: "bg-green-500/10 text-green-600 dark:text-green-400",
  forecasted: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  closed: "bg-red-500/10 text-red-600 dark:text-red-400",
  archived: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
};

const grantRecColors: Record<string, string> = {
  highly_recommended: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  recommended: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  consider: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  not_recommended: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20",
};

const eligibilityColors: Record<string, string> = {
  eligible: "bg-green-500/10 text-green-600 dark:text-green-400",
  likely_eligible: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  unclear: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  not_eligible: "bg-red-500/10 text-red-600 dark:text-red-400",
};

export default function StateLocalGrantsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-muted-foreground">Loading…</div>}>
      <StateLocalGrantsInner />
    </Suspense>
  );
}

function StateLocalGrantsInner() {
  const { profile: selectedProfile, profileId } = useProfile();
  const [grants, setGrants] = useState<DiscoveredGrant[]>([]);
  const [grantScores, setGrantScores] = useState<Map<string, GrantScore>>(new Map());
  const [loading, setLoading] = useState(true);
  const [scoring, setScoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missingFile, setMissingFile] = useState(false);
  const [expectedPath, setExpectedPath] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"score" | "deadline">("score");

  const scoreGrants = useCallback(
    async (toScore: DiscoveredGrant[]) => {
      if (toScore.length === 0) {
        setGrantScores(new Map());
        return;
      }
      setScoring(true);
      try {
        const res = await fetch("/api/score-grants", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ grants: toScore, profileId }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Scoring failed");
        }
        const { scores } = (await res.json()) as { scores: GrantScore[] };
        const scoreMap = new Map<string, GrantScore>();
        for (const s of scores) {
          scoreMap.set(s.grantId, s);
        }
        setGrantScores(scoreMap);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Scoring failed");
        setGrantScores(new Map());
      } finally {
        setScoring(false);
      }
    },
    [profileId]
  );

  const loadGrants = useCallback(async () => {
    setLoading(true);
    setError(null);
    setMissingFile(false);
    setExpectedPath(null);
    initializeProjectsForProfile(profileId);
    try {
      const res = await fetch(`/api/state-local-grants?profileId=${encodeURIComponent(profileId)}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load grants");
      }
      setGrants(data.grants ?? []);
      setMissingFile(Boolean(data.missingFile));
      if (typeof data.expectedPath === "string") {
        setExpectedPath(data.expectedPath);
      }
      const list = (data.grants ?? []) as DiscoveredGrant[];
      if (list.length > 0) {
        await scoreGrants(list);
      } else {
        setGrantScores(new Map());
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setGrants([]);
      setGrantScores(new Map());
    } finally {
      setLoading(false);
    }
  }, [profileId, scoreGrants]);

  useEffect(() => {
    void loadGrants();
  }, [loadGrants]);

  const sortedGrants = useMemo(() => {
    const withScores = grants.filter((g) => grantScores.has(g.id));
    const list = [...withScores].sort((a, b) => {
      if (sortBy === "deadline") {
        return (a.closeDate || "9999").localeCompare(b.closeDate || "9999");
      }
      const sa = grantScores.get(a.id)?.overallScore ?? 0;
      const sb = grantScores.get(b.id)?.overallScore ?? 0;
      return sb - sa;
    });
    return list;
  }, [grants, grantScores, sortBy]);

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="max-w-4xl mx-auto px-4 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild className="shrink-0">
              <Link href="/grants?tab=discover" aria-label="Back to federal Discover">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-[#3d8b8b]" />
                <h1 className="text-lg font-semibold">Discover (State / Local)</h1>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Grants from CSV for <span className="font-medium text-foreground">{selectedProfile.name}</span>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-md border bg-muted/40 p-0.5">
              <Button
                type="button"
                variant={sortBy === "score" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 text-xs"
                onClick={() => setSortBy("score")}
              >
                Sort: Score
              </Button>
              <Button
                type="button"
                variant={sortBy === "deadline" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 text-xs"
                onClick={() => setSortBy("deadline")}
              >
                Sort: Deadline
              </Button>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              disabled={loading || scoring}
              onClick={() => void loadGrants()}
            >
              {loading || scoring ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="ml-2 hidden sm:inline">Reload</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {error && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm py-8 justify-center">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading CSV…
          </div>
        )}

        {!loading && missingFile && (
          <Card className="p-6">
            <h2 className="text-sm font-medium mb-2">No CSV for this profile</h2>
            <p className="text-sm text-muted-foreground mb-3">
              Add a file named <code className="text-xs bg-muted px-1 py-0.5 rounded">{profileId}.csv</code> under{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">data/state-local-grants/</code> at the project
              root, then reload.
            </p>
            {expectedPath && (
              <p className="text-xs font-mono text-muted-foreground break-all border rounded p-2 bg-muted/30">
                {expectedPath}
              </p>
            )}
          </Card>
        )}

        {!loading && !missingFile && grants.length === 0 && (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            The CSV loaded but contained no valid rows (each row needs a title).
          </Card>
        )}

        {!loading && grants.length > 0 && sortedGrants.length === 0 && !scoring && (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            No scored grants to show (all rows may have been filtered as hard negatives).
          </Card>
        )}

        {scoring && grants.length > 0 && (
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Ranking with embeddings…
          </p>
        )}

        <div className="space-y-2">
          {sortedGrants.map((grant) => {
            const score = grantScores.get(grant.id);
            return (
              <Card key={grant.id} className="overflow-hidden">
                <div className="p-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-medium leading-snug">{grant.title}</h2>
                      <Badge variant="outline" className={`text-[10px] ${statusColors[grant.status] ?? ""}`}>
                        {grant.status}
                      </Badge>
                      {grant.source && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                          {grant.source}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{grant.agency}</p>
                    {score && (
                      <div className="flex flex-wrap gap-2">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${grantRecColors[score.recommendation] ?? ""}`}
                        >
                          {score.overallScore}/100 — {score.recommendation.replace(/_/g, " ")}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${eligibilityColors[score.eligibilityStatus] ?? ""}`}
                        >
                          {score.eligibilityStatus.replace(/_/g, " ")}
                        </Badge>
                      </div>
                    )}
                    {grant.description && (
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4">
                        {grant.description}
                      </p>
                    )}
                    {grant.applicationUrl && (
                      <a
                        href={grant.applicationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        Source link
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  <div className="text-left sm:text-right shrink-0 space-y-1">
                    {score && (
                      <div className="text-2xl font-bold text-primary">{score.overallScore}</div>
                    )}
                    <p className="text-sm font-mono font-medium">
                      {grant.awardCeiling > 0 || grant.awardFloor > 0
                        ? grant.awardFloor > 0 && grant.awardCeiling > 0
                          ? `${formatCurrency(grant.awardFloor)} – ${formatCurrency(grant.awardCeiling)}`
                          : grant.awardCeiling > 0
                            ? `Up to ${formatCurrency(grant.awardCeiling)}`
                            : `From ${formatCurrency(grant.awardFloor)}`
                        : "Amount TBD"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {grant.closeDate ? `Deadline: ${grant.closeDate}` : "No deadline"}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
