"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Award,
  Search,
  Loader2,
  ChevronRight,
  ChevronDown,
  ArrowRight,
  ArrowLeft,
  X,
  Plus,
  Building2,
  Users,
  CheckCircle2,
  AlertCircle,
  Mail,
  Shield,
  Calendar,
  DollarSign,
} from "lucide-react";
import type { DiscoveredGrant } from "@/lib/grants-gov";
import type { PipelineGrant, PipelineStage } from "@/data/grant-pipeline";
import {
  getAllPipelineGrants,
  addToPipeline,
  moveGrantToStage,
  updateGrantNotes,
  removeFromPipeline,
  getStageCount,
  getAwardedGrants,
  isInPipeline,
} from "@/data/grant-pipeline";
import { scoreVendorsForGrant, type GrantVendorMatch } from "@/data/matches";
import type { PortVendor } from "@/data/port-vendors";
import { addPortVendors } from "@/data/port-vendors";
import { OutreachEmail } from "@/components/grant-match/outreach-email";
import { scoreGrantsForPort, type GrantScore } from "@/data/grant-scoring";
import { getAllProfiles, getProfile, DEFAULT_PROFILE_ID, type PortProfile, currentPortProfile } from "@/data/port-profile";
import { GrantIntelligenceChatSidebar } from "@/components/grant-intelligence-chat";

const statusColors: Record<string, string> = {
  posted: "bg-green-500/10 text-green-600 dark:text-green-400",
  forecasted: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  closed: "bg-red-500/10 text-red-600 dark:text-red-400",
  archived: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
};

const stageColors: Record<PipelineStage, string> = {
  eligible: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  applied: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  under_review: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  awarded: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  rejected: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
};

const stageLabels: Record<PipelineStage, string> = {
  eligible: "Eligible",
  applied: "Applied",
  under_review: "Under Review",
  awarded: "Awarded",
  rejected: "Rejected",
};

const sectorColors: Record<string, string> = {
  "Marine Construction": "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  "Heavy Civil/Infrastructure": "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  "Environmental/Remediation": "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  "Marine Equipment/Cranes": "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  "Electrical/Power": "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  "Engineering/Design": "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  "Security/IT": "bg-red-500/10 text-red-600 dark:text-red-400",
  "Sustainability/Clean Energy": "bg-green-500/10 text-green-600 dark:text-green-400",
};

const recColors: Record<string, string> = {
  strong_match: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  good_match: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  partial_match: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  weak_match: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
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

function formatCurrency(n: number) {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(0)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n}`;
}

export default function UnifiedGrantsDashboard() {
  const [activeTab, setActiveTab] = useState("discover");

  // Multi-tenant profile selection
  const [selectedProfileId, setSelectedProfileId] = useState(DEFAULT_PROFILE_ID);
  const selectedProfile = getProfile(selectedProfileId) || currentPortProfile;

  // Discover tab state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(["posted", "forecasted"]);
  const [discoveredGrants, setDiscoveredGrants] = useState<DiscoveredGrant[]>([]);
  const [grantScores, setGrantScores] = useState<Map<string, GrantScore>>(new Map());
  const [showOnlyEligible, setShowOnlyEligible] = useState(false);
  const [sortBy, setSortBy] = useState<"relevance" | "score" | "deadline" | "funding">("relevance");
  const [totalCount, setTotalCount] = useState(0);
  const [searching, setSearching] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [expandedGrant, setExpandedGrant] = useState<string | null>(null);
  const [fetchingDetails, setFetchingDetails] = useState<Set<string>>(new Set());

  // Pipeline tab state
  const [pipelineGrants, setPipelineGrants] = useState<PipelineGrant[]>(getAllPipelineGrants());
  const [expandedPipeline, setExpandedPipeline] = useState<Set<string>>(new Set());
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesText, setNotesText] = useState("");

  // Vendor Outreach tab state
  const [selectedAwardedGrant, setSelectedAwardedGrant] = useState<string | null>(null);
  const [vendors, setVendors] = useState<PortVendor[]>([]);
  const [matches, setMatches] = useState<GrantVendorMatch[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [vendorError, setVendorError] = useState<string | null>(null);
  const [expandedVendors, setExpandedVendors] = useState<Set<string>>(new Set());
  const [expandedEmails, setExpandedEmails] = useState<Set<string>>(new Set());

  // Search grants from Grants.gov + USDOT programs
  async function handleSearch() {
    setSearching(true);
    setSearchError(null);

    try {
      // Use enhanced search that includes USDOT-specific programs
      const keyword = searchQuery.trim();

      const res = await fetch("/api/grants-search-enhanced", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword,
          oppStatuses: selectedStatuses.length > 0 ? selectedStatuses : undefined,
          rows: 100, // Increased to get more results
          includeDOTPrograms: true, // Enable USDOT-specific searches
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to search grants");
      }

      const data = await res.json() as { grants: DiscoveredGrant[]; totalCount: number };
      setDiscoveredGrants(data.grants);
      setTotalCount(data.totalCount);

      // Automatically score grants for selected port profile
      scoreGrants(data.grants);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSearching(false);
    }
  }

  // Score grants for selected port profile eligibility and fit
  function scoreGrants(grants: DiscoveredGrant[]) {
    setScanning(true);

    try {
      const scores = scoreGrantsForPort(grants, selectedProfile);
      const scoreMap = new Map<string, GrantScore>();

      for (const score of scores) {
        scoreMap.set(score.grantId, score);
      }

      setGrantScores(scoreMap);
    } catch (err) {
      console.error("Error scoring grants:", err);
    } finally {
      setScanning(false);
    }
  }

  // Fetch detailed grant information
  async function fetchGrantDetails(grant: DiscoveredGrant) {
    if (expandedGrant === grant.id) {
      setExpandedGrant(null);
      return;
    }

    // If already has description, just expand
    if (grant.description) {
      setExpandedGrant(grant.id);
      return;
    }

    setFetchingDetails(new Set([...fetchingDetails, grant.id]));

    try {
      const res = await fetch("/api/grant-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opportunityId: grant.id }),
      });

      if (!res.ok) {
        throw new Error("Failed to fetch grant details");
      }

      const detailed: DiscoveredGrant = await res.json();

      // Update the grant in the list with detailed info
      setDiscoveredGrants((grants) =>
        grants.map((g) => (g.id === grant.id ? detailed : g))
      );

      setExpandedGrant(grant.id);
    } catch (err) {
      console.error("Error fetching grant details:", err);
    } finally {
      setFetchingDetails((prev) => {
        const next = new Set(prev);
        next.delete(grant.id);
        return next;
      });
    }
  }

  // Add grant to pipeline
  function handleAddToPipeline(grant: DiscoveredGrant) {
    const pipelineGrant = addToPipeline({
      id: grant.id,
      opportunityNumber: grant.opportunityNumber,
      title: grant.title,
      agency: grant.agency,
      agencyCode: grant.agencyCode,
      awardFloor: grant.awardFloor,
      awardCeiling: grant.awardCeiling,
      totalFunding: grant.totalFunding,
      closeDate: grant.closeDate,
      description: grant.description,
      applicationUrl: grant.applicationUrl,
      focusAreas: grant.fundingCategories,
      eligibleActivities: grant.eligibility,
      contactName: grant.contactName,
      contactEmail: grant.contactEmail,
      contactPhone: grant.contactPhone,
    });

    setPipelineGrants([...getAllPipelineGrants()]);
    setActiveTab("pipeline");
  }

  // Move grant between pipeline stages
  function handleMoveStage(grant: PipelineGrant, direction: "forward" | "backward") {
    const stages: PipelineStage[] = ["eligible", "applied", "under_review", "awarded", "rejected"];
    const currentIndex = stages.indexOf(grant.stage);

    let newIndex: number;
    if (direction === "forward") {
      newIndex = currentIndex + 1;
    } else {
      newIndex = currentIndex - 1;
    }

    if (newIndex >= 0 && newIndex < stages.length) {
      const newStage = stages[newIndex];
      moveGrantToStage(grant.id, newStage);
      // Force re-render with a new array reference
      setPipelineGrants([...getAllPipelineGrants()]);
    }
  }

  // Save notes for a grant
  function handleSaveNotes(grantId: string) {
    updateGrantNotes(grantId, notesText);
    setPipelineGrants([...getAllPipelineGrants()]);
    setEditingNotes(null);
    setNotesText("");
  }

  // Remove grant from pipeline
  function handleRemoveFromPipeline(grantId: string) {
    removeFromPipeline(grantId);
    setPipelineGrants([...getAllPipelineGrants()]);
  }

  // Load vendors for awarded grant
  async function handleLoadVendors(grantId: string) {
    const grant = pipelineGrants.find((g) => g.id === grantId);
    if (!grant) return;

    setSelectedAwardedGrant(grantId);
    setLoadingVendors(true);
    setVendorError(null);

    try {
      const res = await fetch("/api/sam-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          focusAreas: grant.focusAreas,
          eligibleActivities: grant.eligibleActivities,
          maxPages: 5,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to search federal vendors");
      }

      const { vendors: samVendors } = await res.json() as { vendors: PortVendor[]; totalRecords: number };

      if (samVendors.length === 0) {
        throw new Error("No federal vendors found for this grant's focus areas.");
      }

      addPortVendors(samVendors);
      setVendors(samVendors);

      // Convert PipelineGrant to GrantProgram format for scoring
      const grantForScoring = {
        id: grant.id,
        name: grant.title,
        shortName: grant.opportunityNumber,
        agency: grant.agency,
        description: grant.description,
        totalFunding: grant.totalFunding,
        minAward: grant.awardFloor,
        maxAward: grant.awardCeiling,
        matchRequirement: 0,
        eligibleActivities: grant.eligibleActivities,
        deadline: grant.closeDate,
        status: "open" as const,
        applicationUrl: grant.applicationUrl,
        focusAreas: grant.focusAreas,
      };

      const newMatches = scoreVendorsForGrant(samVendors, grantForScoring);
      newMatches.sort((a, b) => b.overallScore - a.overallScore);
      setMatches(newMatches.slice(0, 20));
    } catch (err) {
      setVendorError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoadingVendors(false);
    }
  }

  function toggleStatus(status: string) {
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  }

  const awardedGrants = getAwardedGrants();

  return (
    <>
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Award className="h-6 w-6 text-muted-foreground" />
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Grants Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Discover federal grants, track applications, and match vendors
              </p>
            </div>
          </div>

          {/* Profile Selector */}
          <div className="flex items-center gap-2">
            <label htmlFor="profile-selector" className="text-sm text-muted-foreground whitespace-nowrap">
              Port Authority:
            </label>
            <select
              id="profile-selector"
              value={selectedProfileId}
              onChange={(e) => {
                setSelectedProfileId(e.target.value);
                // Re-score grants if any exist
                if (discoveredGrants.length > 0) {
                  scoreGrants(discoveredGrants);
                }
              }}
              className="rounded-md border border-input bg-background text-foreground px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {getAllProfiles().map(({ id, profile }) => (
                <option key={id} value={id} className="bg-background text-foreground">
                  {profile.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Three Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="discover">Discover</TabsTrigger>
            <TabsTrigger value="pipeline">
              Pipeline
              {pipelineGrants.length > 0 && (
                <Badge variant="secondary" className="ml-2 text-[10px]">
                  {pipelineGrants.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="outreach">
              Vendor Outreach
              {awardedGrants.length > 0 && (
                <Badge variant="secondary" className="ml-2 text-[10px]">
                  {awardedGrants.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: DISCOVER */}
          <TabsContent value="discover" className="mt-6">
            <Card className="p-5 mb-6">
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    placeholder="Search grants (automatically includes USDOT programs: PIDP, RAISE, INFRA, MEGA)"
                    className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-2">Filter by status:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {["posted", "forecasted", "closed", "archived"].map((status) => (
                      <button
                        key={status}
                        onClick={() => toggleStatus(status)}
                        className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors ${
                          selectedStatuses.includes(status)
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSearch} disabled={searching} className="gap-2">
                    {searching ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Searching Grants.gov...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4" />
                        Search Federal Grants
                      </>
                    )}
                  </Button>

                  {discoveredGrants.length > 0 && (
                    <Button
                      variant="outline"
                      onClick={() => scoreGrants(discoveredGrants)}
                      disabled={scanning}
                      className="gap-2"
                    >
                      {scanning ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Award className="h-4 w-4" />
                          Re-scan Matches
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </Card>

            {discoveredGrants.length > 0 && (
              <Card className="p-4 mb-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">Show:</span>
                    <button
                      onClick={() => setShowOnlyEligible(!showOnlyEligible)}
                      className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors ${
                        showOnlyEligible
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      Eligible for {selectedProfile.name} Only
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">Sort by:</span>
                    {(
                      [
                        ["score", "Match Score"],
                        ["relevance", "Relevance"],
                        ["funding", "Funding"],
                        ["deadline", "Deadline"],
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        onClick={() => setSortBy(value)}
                        className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors ${
                          sortBy === value
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </Card>
            )}

            {searchError && (
              <div className="mb-4 flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <p className="text-sm text-destructive">{searchError}</p>
              </div>
            )}

            {totalCount > 0 && (
              <p className="text-xs text-muted-foreground mb-4">
                Found {totalCount.toLocaleString()} opportunities (showing {discoveredGrants.length})
              </p>
            )}

            <div className="space-y-2">
              {(() => {
                // Filter grants
                let filtered = discoveredGrants;

                // Filter out very low-scoring grants (completely irrelevant)
                filtered = filtered.filter((grant) => {
                  const score = grantScores.get(grant.id);
                  // Only show grants with score >= 35 (excludes health/education grants)
                  // Score 35+ means at least some alignment with port priorities
                  return !score || score.overallScore >= 35;
                });

                if (showOnlyEligible) {
                  filtered = filtered.filter((grant) => {
                    const score = grantScores.get(grant.id);
                    return (
                      score?.eligibilityStatus === "eligible" ||
                      score?.eligibilityStatus === "likely_eligible"
                    );
                  });
                }

                // Sort grants
                const sorted = [...filtered].sort((a, b) => {
                  if (sortBy === "score") {
                    const scoreA = grantScores.get(a.id)?.overallScore || 0;
                    const scoreB = grantScores.get(b.id)?.overallScore || 0;
                    return scoreB - scoreA;
                  } else if (sortBy === "funding") {
                    return (b.awardCeiling || 0) - (a.awardCeiling || 0);
                  } else if (sortBy === "deadline") {
                    return (a.closeDate || "").localeCompare(b.closeDate || "");
                  }
                  return 0; // relevance (default API order)
                });

                // Show message if filter produces no results
                if (sorted.length === 0 && discoveredGrants.length > 0) {
                  return (
                    <Card className="p-8 text-center">
                      <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                      <h3 className="text-lg font-medium mb-2">No grants match the current filter</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {showOnlyEligible
                          ? `None of the ${discoveredGrants.length} grants are marked as eligible or likely eligible for ${selectedProfile.name}.`
                          : "Try adjusting your filters to see more results."}
                      </p>
                      {showOnlyEligible && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowOnlyEligible(false)}
                        >
                          Clear Filter
                        </Button>
                      )}
                    </Card>
                  );
                }

                return sorted.map((grant) => {
                  const isExpanded = expandedGrant === grant.id;
                  const isFetching = fetchingDetails.has(grant.id);
                  const inPipeline = isInPipeline(grant.id);
                  const score = grantScores.get(grant.id);

                return (
                  <Card key={grant.id} className="overflow-hidden">
                    <button
                      className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors text-left"
                      onClick={() => fetchGrantDetails(grant)}
                      disabled={isFetching}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {isFetching ? (
                          <Loader2 className="h-4 w-4 text-muted-foreground shrink-0 animate-spin" />
                        ) : isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium">{grant.title}</span>
                            <Badge variant="outline" className={`text-[10px] ${statusColors[grant.status] || ""}`}>
                              {grant.status}
                            </Badge>
                            {score && (
                              <>
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] ${grantRecColors[score.recommendation]}`}
                                >
                                  {score.overallScore}/100
                                </Badge>
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] ${eligibilityColors[score.eligibilityStatus]}`}
                                >
                                  {score.eligibilityStatus.replace("_", " ")}
                                </Badge>
                              </>
                            )}
                            {inPipeline && (
                              <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/20">
                                In Pipeline
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{grant.agency}</p>
                          {score && score.recommendation === "highly_recommended" && (
                            <p className="text-xs text-green-600 dark:text-green-400 font-medium mt-0.5">
                              Highly Recommended for {selectedProfile.name}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        {score && (
                          <div className="text-lg font-bold mb-1 text-primary">
                            {score.overallScore}
                          </div>
                        )}
                        <p className="text-sm font-mono font-medium">
                          {grant.awardCeiling > 0 ? formatCurrency(grant.awardCeiling) : "TBD"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {grant.closeDate || "No deadline"}
                        </p>
                      </div>
                    </button>

                    {isExpanded && grant.description && (
                      <div className="border-t px-4 pb-4 pt-3">
                        <div
                          className="text-sm text-muted-foreground mb-3 prose prose-sm dark:prose-invert max-w-none"
                          dangerouslySetInnerHTML={{ __html: grant.description.slice(0, 500) }}
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                          <div>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Award Range</span>
                            <p className="text-sm font-medium">
                              {grant.awardFloor > 0 || grant.awardCeiling > 0
                                ? grant.awardFloor > 0 && grant.awardCeiling > 0
                                  ? `${formatCurrency(grant.awardFloor)} - ${formatCurrency(grant.awardCeiling)}`
                                  : grant.awardCeiling > 0
                                    ? `Up to ${formatCurrency(grant.awardCeiling)}`
                                    : `From ${formatCurrency(grant.awardFloor)}`
                                : "TBD"}
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Funding</span>
                            <p className="text-sm font-medium">
                              {grant.totalFunding && grant.totalFunding > 0 ? formatCurrency(grant.totalFunding) : "TBD"}
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Cost Sharing</span>
                            <p className="text-sm font-medium">{grant.costSharing ? "Required" : "Not required"}</p>
                          </div>
                        </div>

                        {grant.fundingCategories.length > 0 && (
                          <div className="mb-3">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Focus Areas</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {grant.fundingCategories.map((cat) => (
                                <Badge key={cat} variant="secondary" className="text-[10px]">{cat}</Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {grant.eligibility.length > 0 && (
                          <div className="mb-3">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Eligible Applicants</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {grant.eligibility.slice(0, 5).map((e) => (
                                <Badge key={e} variant="outline" className="text-[10px]">{e}</Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {score && (
                          <div className="mb-4 p-3 rounded-md bg-muted/30 border">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-xs font-semibold">{selectedProfile.name} Match Analysis</span>
                              <Badge className={`text-[10px] ${grantRecColors[score.recommendation]}`}>
                                {score.recommendation.replace(/_/g, " ").toUpperCase()}
                              </Badge>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                              <div>
                                <span className="text-[9px] text-muted-foreground uppercase">Eligibility</span>
                                <p className="text-sm font-mono font-bold">{score.eligibilityScore}</p>
                              </div>
                              <div>
                                <span className="text-[9px] text-muted-foreground uppercase">Alignment</span>
                                <p className="text-sm font-mono font-bold">{score.alignmentScore}</p>
                              </div>
                              <div>
                                <span className="text-[9px] text-muted-foreground uppercase">Impact</span>
                                <p className="text-sm font-mono font-bold">{score.impactScore}</p>
                              </div>
                              <div>
                                <span className="text-[9px] text-muted-foreground uppercase">Competitive</span>
                                <p className="text-sm font-mono font-bold">{score.competitivenessScore}</p>
                              </div>
                            </div>

                            {score.strengths.length > 0 && (
                              <div className="mb-2">
                                <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Strengths</span>
                                <ul className="mt-1 space-y-0.5">
                                  {score.strengths.map((s, i) => (
                                    <li key={i} className="text-xs text-green-600 dark:text-green-400 flex items-start gap-1.5">
                                      <CheckCircle2 className="h-3 w-3 mt-0.5 shrink-0" />
                                      {s}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {score.concerns.length > 0 && (
                              <div>
                                <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Considerations</span>
                                <ul className="mt-1 space-y-0.5">
                                  {score.concerns.map((c, i) => (
                                    <li key={i} className="text-xs text-amber-600 dark:text-amber-400 flex items-start gap-1.5">
                                      <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                                      {c}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddToPipeline(grant);
                            }}
                            disabled={inPipeline}
                            className="gap-1.5"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            {inPipeline ? "Already in Pipeline" : "Add to Pipeline"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(grant.applicationUrl, "_blank");
                            }}
                            className="gap-1.5"
                          >
                            View on Grants.gov
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              });
              })()}
            </div>

            {discoveredGrants.length === 0 && !searching && (
              <div className="text-center py-16 text-muted-foreground">
                <Award className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="text-sm">Search for federal grant opportunities from Grants.gov</p>
                <p className="text-xs mt-1">Results update in real-time from the federal database</p>
              </div>
            )}
          </TabsContent>

          {/* TAB 2: PIPELINE */}
          <TabsContent value="pipeline" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {(["eligible", "applied", "under_review", "awarded", "rejected"] as PipelineStage[]).map((stage) => {
                const stageGrants = pipelineGrants.filter((g) => g.stage === stage);
                const count = getStageCount(stage);

                return (
                  <div key={stage} className="flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold">{stageLabels[stage]}</h3>
                      <Badge variant="secondary" className="text-[10px]">{count}</Badge>
                    </div>

                    <div className="space-y-2 flex-1">
                      {stageGrants.map((grant) => {
                        const isExpanded = expandedPipeline.has(grant.id);
                        const isEditingThis = editingNotes === grant.id;

                        return (
                          <Card key={grant.id} className={`overflow-hidden ${stageColors[stage]}`}>
                            <div className="p-3">
                              <button
                                onClick={() => {
                                  if (isExpanded) {
                                    setExpandedPipeline(new Set([...expandedPipeline].filter((id) => id !== grant.id)));
                                  } else {
                                    setExpandedPipeline(new Set([...expandedPipeline, grant.id]));
                                  }
                                }}
                                className="w-full text-left"
                              >
                                <div className="flex items-start gap-2">
                                  {isExpanded ? (
                                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                                  ) : (
                                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium line-clamp-2">{grant.title}</p>
                                    <p className="text-[10px] text-muted-foreground truncate">{grant.agency}</p>
                                    <p className="text-[10px] font-mono mt-1">
                                      {grant.awardCeiling > 0 ? formatCurrency(grant.awardCeiling) : "TBD"}
                                    </p>
                                  </div>
                                </div>
                              </button>

                              {isExpanded && (
                                <div className="mt-3 pt-3 border-t space-y-2">
                                  <div>
                                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Deadline</p>
                                    <p className="text-[11px]">{grant.closeDate || "No deadline"}</p>
                                  </div>

                                  {grant.notes && !isEditingThis && (
                                    <div>
                                      <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Notes</p>
                                      <p className="text-[11px] whitespace-pre-wrap">{grant.notes}</p>
                                    </div>
                                  )}

                                  {isEditingThis && (
                                    <div>
                                      <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">Notes</p>
                                      <textarea
                                        value={notesText}
                                        onChange={(e) => setNotesText(e.target.value)}
                                        rows={3}
                                        className="w-full text-[11px] rounded border border-input bg-background px-2 py-1 resize-none"
                                        placeholder="Add notes..."
                                      />
                                      <div className="flex gap-1 mt-1">
                                        <Button
                                          size="sm"
                                          onClick={() => handleSaveNotes(grant.id)}
                                          className="h-6 text-[10px] px-2"
                                        >
                                          Save
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => {
                                            setEditingNotes(null);
                                            setNotesText("");
                                          }}
                                          className="h-6 text-[10px] px-2"
                                        >
                                          Cancel
                                        </Button>
                                      </div>
                                    </div>
                                  )}

                                  {!isEditingThis && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setEditingNotes(grant.id);
                                        setNotesText(grant.notes || "");
                                      }}
                                      className="h-6 text-[10px] px-2 w-full"
                                    >
                                      {grant.notes ? "Edit Notes" : "Add Notes"}
                                    </Button>
                                  )}

                                  <div className="flex gap-1 pt-2 border-t">
                                    {stage !== "eligible" && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleMoveStage(grant, "backward")}
                                        className="h-6 text-[10px] px-2 flex-1"
                                      >
                                        <ArrowLeft className="h-3 w-3" />
                                      </Button>
                                    )}
                                    {stage !== "rejected" && stage !== "awarded" && (
                                      <Button
                                        size="sm"
                                        onClick={() => handleMoveStage(grant, "forward")}
                                        className="h-6 text-[10px] px-2 flex-1"
                                      >
                                        <ArrowRight className="h-3 w-3" />
                                      </Button>
                                    )}
                                    {stage === "awarded" && (
                                      <Button
                                        size="sm"
                                        onClick={() => {
                                          setActiveTab("outreach");
                                          handleLoadVendors(grant.id);
                                        }}
                                        className="h-6 text-[10px] px-2 flex-1 gap-1"
                                      >
                                        <Users className="h-3 w-3" />
                                        Find Vendors
                                      </Button>
                                    )}
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleRemoveFromPipeline(grant.id)}
                                      className="h-6 text-[10px] px-2"
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </Card>
                        );
                      })}

                      {stageGrants.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          <p className="text-xs">No grants</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {pipelineGrants.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <Award className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="text-sm">No grants in the pipeline yet</p>
                <p className="text-xs mt-1">
                  Search for grants in the Discover tab and add them to your pipeline
                </p>
              </div>
            )}
          </TabsContent>

          {/* TAB 3: VENDOR OUTREACH */}
          <TabsContent value="outreach" className="mt-6">
            {awardedGrants.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="text-sm">No awarded grants yet</p>
                <p className="text-xs mt-1">
                  Move grants to "Awarded" status in the Pipeline tab to match vendors
                </p>
              </div>
            ) : (
              <div>
                <Card className="p-5 mb-6">
                  <label className="text-sm font-medium mb-2 block">Select Awarded Grant</label>
                  <select
                    value={selectedAwardedGrant || ""}
                    onChange={(e) => {
                      const grantId = e.target.value;
                      if (grantId) {
                        handleLoadVendors(grantId);
                      }
                    }}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Choose a grant...</option>
                    {awardedGrants.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.title} - {formatCurrency(g.awardCeiling)}
                      </option>
                    ))}
                  </select>

                  {loadingVendors && (
                    <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Searching federal contractors and scoring matches...
                    </div>
                  )}

                  {vendorError && (
                    <div className="mt-4 flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2">
                      <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                      <p className="text-sm text-destructive">{vendorError}</p>
                    </div>
                  )}
                </Card>

                {matches.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-3">
                      Top {matches.length} Vendor Matches
                    </h3>
                    <div className="space-y-2">
                      {matches.map((match) => {
                        const vendor = vendors.find((v) => v.id === match.vendorId);
                        if (!vendor) return null;

                        const isOpen = expandedVendors.has(vendor.id);
                        const emailOpen = expandedEmails.has(vendor.id);
                        const selectedGrant = pipelineGrants.find((g) => g.id === selectedAwardedGrant);

                        return (
                          <Card key={vendor.id} className="overflow-hidden">
                            <button
                              className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors text-left"
                              onClick={() => {
                                if (isOpen) {
                                  setExpandedVendors(new Set([...expandedVendors].filter((id) => id !== vendor.id)));
                                } else {
                                  setExpandedVendors(new Set([...expandedVendors, vendor.id]));
                                }
                              }}
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                {isOpen ? (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-medium">{vendor.name}</span>
                                    <Badge variant="outline" className={`text-[10px] ${recColors[match.recommendation]}`}>
                                      {match.recommendation.replace("_", " ")}
                                    </Badge>
                                    {vendor.disadvantagedBusiness && (
                                      <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-600 border-green-500/20">
                                        <Shield className="h-2.5 w-2.5 mr-0.5" />
                                        {vendor.disadvantagedBusiness}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${sectorColors[vendor.sector] || ""}`}>
                                      {vendor.sector}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">{vendor.headquarters}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right shrink-0 ml-4">
                                <p className="text-lg font-mono font-bold">{match.overallScore}</p>
                                <p className="text-[10px] text-muted-foreground">/ 100</p>
                              </div>
                            </button>

                            {isOpen && (
                              <div className="border-t px-4 pb-4 pt-3">
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                                  {(Object.entries(match.dimensions) as [string, number][]).map(([key, value]) => (
                                    <div key={key}>
                                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                        {key.replace(/([A-Z])/g, " $1").trim()}
                                      </span>
                                      <div className="flex items-center gap-2 mt-1">
                                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                          <div
                                            className={`h-full rounded-full ${
                                              value >= 70
                                                ? "bg-green-500"
                                                : value >= 50
                                                  ? "bg-blue-500"
                                                  : value >= 30
                                                    ? "bg-amber-500"
                                                    : "bg-red-500"
                                            }`}
                                            style={{ width: `${value}%` }}
                                          />
                                        </div>
                                        <span className="text-xs font-mono w-6 text-right">{value}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                {match.strengths.length > 0 && (
                                  <div className="mb-3">
                                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Strengths</span>
                                    <ul className="mt-1 space-y-0.5">
                                      {match.strengths.map((s) => (
                                        <li key={s} className="text-xs text-green-600 dark:text-green-400 flex items-start gap-1.5">
                                          <CheckCircle2 className="h-3 w-3 mt-0.5 shrink-0" />
                                          {s}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {match.gaps.length > 0 && (
                                  <div className="mb-4">
                                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Gaps</span>
                                    <ul className="mt-1 space-y-0.5">
                                      {match.gaps.map((g) => (
                                        <li key={g} className="text-xs text-amber-600 dark:text-amber-400 flex items-start gap-1.5">
                                          <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                                          {g}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (emailOpen) {
                                      setExpandedEmails(new Set([...expandedEmails].filter((id) => id !== vendor.id)));
                                    } else {
                                      setExpandedEmails(new Set([...expandedEmails, vendor.id]));
                                    }
                                  }}
                                  className="gap-1.5 text-xs"
                                >
                                  <Mail className="h-3.5 w-3.5" />
                                  {emailOpen ? "Hide" : "Show"} Outreach Email
                                </Button>

                                {emailOpen && selectedGrant && (
                                  <div className="mt-3">
                                    <OutreachEmail
                                      match={match}
                                      grant={{
                                        id: selectedGrant.id,
                                        name: selectedGrant.title,
                                        shortName: selectedGrant.opportunityNumber,
                                        agency: selectedGrant.agency,
                                        description: selectedGrant.description,
                                        totalFunding: selectedGrant.totalFunding,
                                        minAward: selectedGrant.awardFloor,
                                        maxAward: selectedGrant.awardCeiling,
                                        matchRequirement: 0,
                                        eligibleActivities: selectedGrant.eligibleActivities,
                                        deadline: selectedGrant.closeDate,
                                        status: "open",
                                        applicationUrl: selectedGrant.applicationUrl,
                                        focusAreas: selectedGrant.focusAreas,
                                      }}
                                      vendor={vendor}
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>

    {/* Corvo Grant Intelligence Chat Sidebar */}
    <GrantIntelligenceChatSidebar />
  </>
  );
}
