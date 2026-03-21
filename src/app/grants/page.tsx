"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
// Tabs UI removed — sidebar drives navigation via ?tab= param
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
  DollarSign,
  FileText,
  Copy,
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
  isInPipeline,
} from "@/data/grant-pipeline";
import { VendorSearch } from "@/components/vendor-search/vendor-search";
import type { GrantScore } from "@/data/grant-scoring";
import { currentPortProfile } from "@/data/port-profile";
import { GrantIntelligenceChatSidebar } from "@/components/grant-intelligence-chat";
import {
  getAllProjects,
  createProject,
  updateProject,
  deleteProject,
  initializePortFreeportProjects,
  type Project,
} from "@/data/projects";
import { matchGrantsToProject, matchGrantToProjects, type GrantProjectMatch } from "@/data/grant-project-matching";
import { ProjectForm } from "@/components/projects/project-form";
import { Edit, Trash2, SlidersHorizontal } from "lucide-react";
import { FUNDING_DOMAINS } from "@/data/funding-domains";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

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

const VALID_TABS = ["discover", "pipeline", "projects", "outreach"] as const;

export default function GrantsPage() {
  return (
    <Suspense>
      <UnifiedGrantsDashboard />
    </Suspense>
  );
}

function UnifiedGrantsDashboard() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabParam = searchParams.get("tab");
  const activeTab = VALID_TABS.includes(tabParam as any) ? tabParam! : "discover";

  const setActiveTab = useCallback(
    (tab: string) => {
      router.push(`/grants?tab=${tab}`, { scroll: false });
    },
    [router]
  );

  const selectedProfile = currentPortProfile;

  // Discover tab state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(["posted", "forecasted"]);
  const [discoveredGrants, setDiscoveredGrants] = useState<DiscoveredGrant[]>([]);
  const [grantScores, setGrantScores] = useState<Map<string, GrantScore>>(new Map());
  const [showOnlyEligible, setShowOnlyEligible] = useState(false);
  const [sortBy, setSortBy] = useState<"score" | "deadline" | "funding">("score");
  const [selectedProjectIds, setSelectedProjectIds] = useState<"all" | Set<string>>("all");
  const [selectedDomainIds, setSelectedDomainIds] = useState<"all" | Set<string>>("all");
  const [includeProfile, setIncludeProfile] = useState(true);
  const [includeEligibility, setIncludeEligibility] = useState(true);
  const [includeImpact, setIncludeImpact] = useState(true);

  // Client-side grant search cache (avoids redundant API calls for same query)
  const [searchCache] = useState(() => new Map<string, { grants: DiscoveredGrant[]; totalCount: number }>());
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

  // (Vendor search now handled by VendorSearch component)

  // Projects tab state
  const [projects, setProjects] = useState<Project[]>(getAllProjects());
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | undefined>(undefined);
  const [projectMatches, setProjectMatches] = useState<Map<string, GrantProjectMatch[]>>(new Map());

  // Initialize Port Freeport default projects on mount
  useEffect(() => {
    initializePortFreeportProjects();
    setProjects([...getAllProjects()]); // Refresh projects list
  }, []);

  // Apply for Grant (AI builder) state
  const [applyGrantOpen, setApplyGrantOpen] = useState(false);
  const [applyGrantLoading, setApplyGrantLoading] = useState(false);
  const [applyGrantContent, setApplyGrantContent] = useState<string | null>(null);
  const [applyGrantError, setApplyGrantError] = useState<string | null>(null);
  const [applyGrantTitle, setApplyGrantTitle] = useState("");

  // Search grants from Grants.gov + USDOT programs
  async function handleSearch() {
    setSearching(true);
    setSearchError(null);

    try {
      let keyword = searchQuery.trim();
      const rows = 100;
      const statuses = selectedStatuses.length > 0 ? selectedStatuses : undefined;

      const cacheKey = JSON.stringify({ keyword, statuses, rows });

      let grants: DiscoveredGrant[];
      let totalCountValue: number;

      const cached = searchCache.get(cacheKey);
      if (cached) {
        console.log("[Grant Search] Cache hit for:", cacheKey);
        grants = cached.grants;
        totalCountValue = cached.totalCount;
      } else {
        console.log("[Grant Search] Cache miss, fetching from API...");
        const res = await fetch("/api/grants-search-enhanced", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            keyword,
            oppStatuses: statuses,
            rows,
            includeDOTPrograms: true,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to search grants");
        }

        const data = await res.json() as { grants: DiscoveredGrant[]; totalCount: number };
        grants = data.grants;
        totalCountValue = data.totalCount;

        searchCache.set(cacheKey, { grants, totalCount: totalCountValue });
      }

      setDiscoveredGrants(grants);
      setTotalCount(totalCountValue);

      scoreGrants(grants);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSearching(false);
    }
  }

  // Score grants via API (embedding-based + eligibility + impact)
  async function scoreGrants(grants: DiscoveredGrant[]) {
    setScanning(true);
    try {
      const res = await fetch("/api/score-grants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grants }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Scoring failed");
      }
      const { scores } = (await res.json()) as { scores: GrantScore[] };
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

      // Merge detailed info with existing grant, preserving original values if detailed doesn't have them
      const merged: DiscoveredGrant = {
        ...grant,
        ...detailed,
        // Preserve original funding amounts if detailed version doesn't have them or has 0
        awardFloor: detailed.awardFloor > 0 ? detailed.awardFloor : grant.awardFloor,
        awardCeiling: detailed.awardCeiling > 0 ? detailed.awardCeiling : grant.awardCeiling,
        totalFunding: detailed.totalFunding > 0 ? detailed.totalFunding : grant.totalFunding,
        // Preserve source from original grant
        source: grant.source || detailed.source,
      };

      // Update the grant in the list with merged info
      setDiscoveredGrants((grants) =>
        grants.map((g) => (g.id === grant.id ? merged : g))
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

  // Apply for Grant - opens AI builder (streaming)
  async function handleApplyForGrant(grant: { id: string; title: string }) {
    setApplyGrantOpen(true);
    setApplyGrantTitle(grant.title);
    setApplyGrantContent(null);
    setApplyGrantError(null);
    setApplyGrantLoading(true);

    try {
      const res = await fetch("/api/build-grant-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grantId: grant.id,
          portName: selectedProfile.name,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to build application");
      }

      setApplyGrantContent("");
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) {
        setApplyGrantLoading(false);
        return;
      }
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setApplyGrantContent((prev) => prev + chunk);
      }
    } catch (err) {
      setApplyGrantError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setApplyGrantLoading(false);
    }
  }

  function toggleStatus(status: string) {
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto">
        <div className={`mx-auto px-6 py-8 ${activeTab === "outreach" ? "max-w-[90rem]" : "max-w-6xl"}`}>
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <Award className="h-6 w-6 text-muted-foreground" />
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {activeTab === "discover" && "Discover Grants"}
                {activeTab === "pipeline" && "Grant Pipeline"}
                {activeTab === "projects" && "Projects"}
                {activeTab === "outreach" && "Vendor Outreach"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {activeTab === "discover" && "Search and discover federal grant opportunities"}
                {activeTab === "pipeline" && "Track your grant applications through each stage"}
                {activeTab === "projects" && "Manage port projects and match them to grants"}
                {activeTab === "outreach" && "Search qualified federal contractors with Subchapter N compliance intelligence"}
              </p>
            </div>
          </div>
        </div>

        {/* Tab content — tab selection driven by URL ?tab= param, sidebar provides navigation */}
        <div className="w-full">
          {activeTab === "discover" && (
            <div className="mt-2">
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
                        Searching grants...
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
                <div className="space-y-3">
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

                  <div className="border-t pt-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-medium text-muted-foreground">Include in score:</span>
                      {([
                        ["Profile", includeProfile, setIncludeProfile] as const,
                        ["Eligibility", includeEligibility, setIncludeEligibility] as const,
                        ["Impact", includeImpact, setIncludeImpact] as const,
                      ]).map(([label, value, setter]) => (
                        <button
                          key={label}
                          onClick={() => setter(!value)}
                          className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors ${
                            value
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                              : "bg-muted text-muted-foreground hover:bg-muted/80 border border-transparent"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {projects.length > 0 && (
                    <div className="border-t pt-3">
                      <div className="flex items-center gap-2 mb-1.5">
                        <SlidersHorizontal className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[10px] font-medium text-muted-foreground">Projects:</span>
                        <button
                          onClick={() => setSelectedProjectIds("all")}
                          className={`text-[10px] hover:underline ${
                            selectedProjectIds === "all" ? "text-primary font-medium" : "text-muted-foreground"
                          }`}
                        >
                          All
                        </button>
                        <span className="text-[10px] text-muted-foreground/50">|</span>
                        <button
                          onClick={() => setSelectedProjectIds(new Set())}
                          className={`text-[10px] hover:underline ${
                            selectedProjectIds !== "all" && selectedProjectIds.size === 0 ? "text-primary font-medium" : "text-muted-foreground"
                          }`}
                        >
                          None
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {projects.map((project) => {
                          const isSelected = selectedProjectIds === "all" || selectedProjectIds.has(project.id);
                          return (
                            <button
                              key={project.id}
                              onClick={() => {
                                if (selectedProjectIds === "all") {
                                  const allExceptThis = new Set(projects.map((p) => p.id));
                                  allExceptThis.delete(project.id);
                                  setSelectedProjectIds(allExceptThis);
                                } else {
                                  const next = new Set(selectedProjectIds);
                                  if (next.has(project.id)) {
                                    next.delete(project.id);
                                  } else {
                                    next.add(project.id);
                                  }
                                  if (next.size === projects.length) setSelectedProjectIds("all");
                                  else setSelectedProjectIds(next);
                                }
                              }}
                              className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors ${
                                isSelected
                                  ? "bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30"
                                  : "bg-muted text-muted-foreground hover:bg-muted/80 border border-transparent"
                              }`}
                              title={project.description}
                            >
                              {project.name.length > 40 ? project.name.slice(0, 40) + "..." : project.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="border-t pt-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <SlidersHorizontal className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[10px] font-medium text-muted-foreground">Funding domains:</span>
                      <button
                        onClick={() => setSelectedDomainIds("all")}
                        className={`text-[10px] hover:underline ${
                          selectedDomainIds === "all" ? "text-primary font-medium" : "text-muted-foreground"
                        }`}
                      >
                        All
                      </button>
                      <span className="text-[10px] text-muted-foreground/50">|</span>
                      <button
                        onClick={() => setSelectedDomainIds(new Set())}
                        className={`text-[10px] hover:underline ${
                          selectedDomainIds !== "all" && selectedDomainIds.size === 0 ? "text-primary font-medium" : "text-muted-foreground"
                        }`}
                      >
                        None
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {FUNDING_DOMAINS.map((domain) => {
                        const isSelected = selectedDomainIds === "all" || selectedDomainIds.has(domain.id);
                        return (
                          <button
                            key={domain.id}
                            onClick={() => {
                              if (selectedDomainIds === "all") {
                                const allExceptThis = new Set(FUNDING_DOMAINS.map((d) => d.id));
                                allExceptThis.delete(domain.id);
                                setSelectedDomainIds(allExceptThis);
                              } else {
                                const next = new Set(selectedDomainIds);
                                if (next.has(domain.id)) {
                                  next.delete(domain.id);
                                } else {
                                  next.add(domain.id);
                                }
                                if (next.size === FUNDING_DOMAINS.length) setSelectedDomainIds("all");
                                else setSelectedDomainIds(next);
                              }
                            }}
                            className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors ${
                              isSelected
                                ? "bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30"
                                : "bg-muted text-muted-foreground hover:bg-muted/80 border border-transparent"
                            }`}
                          >
                            {domain.name}
                          </button>
                        );
                      })}
                    </div>
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

                // Filter out clearly irrelevant grants
                filtered = filtered.filter((grant) => {
                  const score = grantScores.get(grant.id);
                  // If we never scored it (e.g. hard-negative filtered out), don't show it
                  if (!score) return false;

                  // When embeddings are available, exclude grants with 0 profile alignment
                  if (score.embeddingScoresAvailable && score.profileAlignmentScore <= 0) {
                    return false;
                  }

                  // Only show grants with overall score >= 35 (or 25 when no embeddings yet)
                  const minScore = score.embeddingScoresAvailable ? 35 : 25;
                  return score.overallScore >= minScore;
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

                // Compute dynamic overall score. Each dimension can be toggled
                // on/off or filtered to specific items. Active weights are
                // normalized so the result stays on a 0-100 scale.
                function getDynamicScore(grantId: string): number {
                  const score = grantScores.get(grantId);
                  if (!score) return 0;

                  let projSim: number;
                  if (selectedProjectIds === "all") {
                    projSim = score.projectSimilarityScore;
                  } else if (selectedProjectIds.size === 0) {
                    projSim = 0;
                  } else {
                    const selected = score.topProjectMatches.filter((m) =>
                      (selectedProjectIds as Set<string>).has(m.projectId)
                    );
                    projSim = selected.length > 0 ? Math.max(...selected.map((m) => m.similarity)) : 0;
                  }

                  let domainSim: number;
                  if (selectedDomainIds === "all") {
                    domainSim = score.fundingDomainSimilarityScore;
                  } else if (selectedDomainIds.size === 0) {
                    domainSim = 0;
                  } else {
                    const selected = (score.topDomainMatches ?? []).filter((m) =>
                      (selectedDomainIds as Set<string>).has(m.domainId)
                    );
                    domainSim = selected.length > 0 ? Math.max(...selected.map((m) => m.similarity)) : 0;
                  }

                  const projActive = selectedProjectIds === "all" || selectedProjectIds.size > 0;
                  const domainActive = selectedDomainIds === "all" || selectedDomainIds.size > 0;

                  const components: [number, number][] = [];
                  if (includeEligibility) components.push([score.eligibilityScore, 0.25]);
                  if (includeProfile)     components.push([score.profileAlignmentScore, 0.25]);
                  if (projActive)         components.push([projSim, 0.20]);
                  if (domainActive)       components.push([domainSim, 0.15]);
                  if (includeImpact)      components.push([score.impactScore, 0.15]);

                  if (components.length === 0) return 0;

                  const totalWeight = components.reduce((s, [, w]) => s + w, 0);
                  const raw = components.reduce((s, [v, w]) => s + v * w, 0);
                  return Math.round(raw / totalWeight);
                }

                // Sort grants
                const sorted = [...filtered].sort((a, b) => {
                  if (sortBy === "funding") {
                    return (b.awardCeiling || 0) - (a.awardCeiling || 0);
                  } else if (sortBy === "deadline") {
                    return (a.closeDate || "").localeCompare(b.closeDate || "");
                  }
                  return getDynamicScore(b.id) - getDynamicScore(a.id);
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
                                  {getDynamicScore(grant.id)}/100
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
                          <div className="flex items-center gap-2">
                          <p className="text-xs text-muted-foreground truncate">{grant.agency}</p>
                            {grant.source && (
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                                {grant.source}
                              </Badge>
                            )}
                          </div>
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
                            {getDynamicScore(grant.id)}
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

                            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-3">
                              <div>
                                <span className="text-[9px] text-muted-foreground uppercase">Profile</span>
                                <p className="text-sm font-mono font-bold">{score.profileAlignmentScore}</p>
                              </div>
                              <div>
                                <span className="text-[9px] text-muted-foreground uppercase">Projects</span>
                                <p className="text-sm font-mono font-bold">{score.projectSimilarityScore}</p>
                              </div>
                              <div>
                                <span className="text-[9px] text-muted-foreground uppercase">Domains</span>
                                <p className="text-sm font-mono font-bold">{score.fundingDomainSimilarityScore ?? 0}</p>
                              </div>
                              <div>
                                <span className="text-[9px] text-muted-foreground uppercase">Eligibility</span>
                                <p className="text-sm font-mono font-bold">{score.eligibilityScore}</p>
                              </div>
                              <div>
                                <span className="text-[9px] text-muted-foreground uppercase">Impact</span>
                                <p className="text-sm font-mono font-bold">{score.impactScore}</p>
                              </div>
                            </div>

                            {score.topProjectMatches.length > 0 && (
                              <div className="mb-3">
                                <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Top Project Matches</span>
                                <ul className="mt-1 space-y-0.5">
                                  {score.topProjectMatches.slice(0, 5).map((m) => (
                                    <li key={m.projectId} className="text-xs font-medium flex items-center justify-between gap-2">
                                      <span className="truncate">{m.projectName}</span>
                                      <span className="text-muted-foreground shrink-0">{m.similarity}%</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {(score.topDomainMatches ?? []).length > 0 && (
                              <div className="mb-3">
                                <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Funding Domain Matches</span>
                                <ul className="mt-1 space-y-0.5">
                                  {(score.topDomainMatches ?? []).slice(0, 5).map((m) => (
                                    <li key={m.domainId} className="text-xs font-medium flex items-center justify-between gap-2">
                                      <span className="truncate">{m.domainName}</span>
                                      <span className="text-muted-foreground shrink-0">{m.similarity}%</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

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

                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApplyForGrant(grant);
                            }}
                            className="gap-1.5"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            Apply for Grant
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
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
                            View on {grant.source || "Grants.gov"}
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
                <p className="text-sm">Search for federal grant opportunities</p>
                <p className="text-xs mt-1">Results from Grants.gov, Federal Register, GovCon, and other sources</p>
              </div>
            )}
            </div>
          )}

          {/* TAB 2: PIPELINE */}
          {activeTab === "pipeline" && (
            <div className="mt-2">
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

                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleApplyForGrant(grant)}
                                    className="h-6 text-[10px] px-2 w-full gap-1"
                                  >
                                    <FileText className="h-3 w-3" />
                                    Apply for Grant
                                  </Button>

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
                                        onClick={() => setActiveTab("outreach")}
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
            </div>
          )}

          {/* TAB 3: PROJECTS */}
          {activeTab === "projects" && (
            <div className="mt-2">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold">Port Projects</h2>
                <p className="text-sm text-muted-foreground">
                  Manage your projects and find matching grants
                </p>
              </div>
              <Button
                onClick={() => {
                  setEditingProject(undefined);
                  setShowProjectForm(true);
                }}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Project
              </Button>
            </div>

            {projects.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="text-sm">No projects yet</p>
                <p className="text-xs mt-1">
                  Create a project to start matching it with relevant grants
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {projects.map((project) => {
                  const isExpanded = expandedProjects.has(project.id);
                  const matches = projectMatches.get(project.id) || [];

                  // Get all grants (from pipeline and discovered)
                  const allGrants = [
                    ...pipelineGrants,
                    ...discoveredGrants.filter((g) => !isInPipeline(g.id)),
                  ];

                  // Calculate matches if not already cached
                  if (allGrants.length > 0 && !projectMatches.has(project.id)) {
                    const newMatches = matchGrantsToProject(project, allGrants);
                    setProjectMatches(new Map(projectMatches.set(project.id, newMatches)));
                  }

                  const statusColors: Record<string, string> = {
                    planning: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
                    design: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
                    procurement: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                    construction: "bg-green-500/10 text-green-600 dark:text-green-400",
                    completed: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
                    on_hold: "bg-red-500/10 text-red-600 dark:text-red-400",
                  };

                  const priorityColors: Record<string, string> = {
                    critical: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
                    high: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
                    medium: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
                    low: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20",
                  };

                  return (
                    <Card key={project.id} className="overflow-hidden">
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <button
                            onClick={() => {
                              if (isExpanded) {
                                setExpandedProjects(
                                  new Set([...expandedProjects].filter((id) => id !== project.id))
                                );
                              } else {
                                setExpandedProjects(new Set([...expandedProjects, project.id]));
                              }
                            }}
                            className="flex-1 text-left"
                          >
                            <div className="flex items-start gap-2">
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <h3 className="text-sm font-semibold">{project.name}</h3>
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] ${statusColors[project.status]}`}
                                  >
                                    {project.status.replace(/_/g, " ")}
                                  </Badge>
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] ${priorityColors[project.priority]}`}
                                  >
                                    {project.priority}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {project.description}
                                </p>
                                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                  {project.budget > 0 && (
                                    <span className="flex items-center gap-1">
                                      <DollarSign className="h-3 w-3" />
                                      {formatCurrency(project.budget)}
                                    </span>
                                  )}
                                  {project.location && (
                                    <span className="flex items-center gap-1">
                                      <Building2 className="h-3 w-3" />
                                      {project.location}
                                    </span>
                                  )}
                                  {matches.length > 0 && (
                                    <span className="flex items-center gap-1">
                                      <Award className="h-3 w-3" />
                                      {matches.length} matching grant{matches.length !== 1 ? "s" : ""}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </button>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingProject(project);
                                setShowProjectForm(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Delete project "${project.name}"?`)) {
                                  deleteProject(project.id);
                                  setProjects([...getAllProjects()]);
                                  setProjectMatches(new Map());
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t space-y-4">
                            <div>
                              <h4 className="text-xs font-semibold mb-2">Project Details</h4>
                              <div className="space-y-2 text-xs">
                                <div>
                                  <span className="text-muted-foreground">Type: </span>
                                  <span>{project.projectType.replace(/_/g, " ")}</span>
                                </div>
                                {project.startDate && (
                                  <div>
                                    <span className="text-muted-foreground">Start: </span>
                                    <span>{new Date(project.startDate).toLocaleDateString()}</span>
                                  </div>
                                )}
                                {project.endDate && (
                                  <div>
                                    <span className="text-muted-foreground">End: </span>
                                    <span>{new Date(project.endDate).toLocaleDateString()}</span>
                                  </div>
                                )}
                                {project.focusAreas.length > 0 && (
                                  <div>
                                    <span className="text-muted-foreground">Focus Areas: </span>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {project.focusAreas.map((area) => (
                                        <Badge
                                          key={area}
                                          variant="outline"
                                          className="text-[10px]"
                                        >
                                          {area}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {project.notes && (
                                  <div>
                                    <span className="text-muted-foreground">Notes: </span>
                                    <span>{project.notes}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {matches.length > 0 && (
                              <div>
                                <h4 className="text-xs font-semibold mb-2">
                                  Matching Grants ({matches.length})
                                </h4>
                                <div className="space-y-2">
                                  {matches.slice(0, 5).map((match) => {
                                    const grant = allGrants.find((g) => g.id === match.grantId);
                                    if (!grant) return null;

                                    const matchColors: Record<string, string> = {
                                      strong_match: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
                                      good_match: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
                                      partial_match: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
                                      weak_match: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20",
                                    };

                                    return (
                                      <Card
                                        key={match.grantId}
                                        className={`p-3 ${matchColors[match.recommendation]}`}
                                      >
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                              <span className="text-xs font-medium line-clamp-1">
                                                {grant.title}
                                              </span>
                                              <Badge variant="outline" className="text-[9px]">
                                                {match.matchScore}/100
                                              </Badge>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground line-clamp-1">
                                              {grant.agency}
                                            </p>
                                            {match.reasons.length > 0 && (
                                              <ul className="mt-1 space-y-0.5">
                                                {match.reasons.slice(0, 2).map((reason, i) => (
                                                  <li key={i} className="text-[10px] text-muted-foreground">
                                                    • {reason}
                                                  </li>
                                                ))}
                                              </ul>
                                            )}
                                          </div>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-xs h-7"
                                            onClick={() => {
                                              if (!isInPipeline(grant.id)) {
                                                handleAddToPipeline(grant as DiscoveredGrant);
                                              }
                                              setActiveTab("pipeline");
                                            }}
                                          >
                                            {isInPipeline(grant.id) ? "In Pipeline" : "Add to Pipeline"}
                                          </Button>
                                        </div>
                                      </Card>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}

            {showProjectForm && (
              <ProjectForm
                project={editingProject}
                onSave={async (projectData) => {
                  if (editingProject) {
                    updateProject(editingProject.id, projectData);
                  } else {
                    const created = createProject(projectData);
                    try {
                      await fetch("/api/embed-project", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(created),
                      });
                    } catch {
                      // Non-blocking: embed failed, scoring will use project without embedding
                    }
                  }
                  setProjects([...getAllProjects()]);
                  setShowProjectForm(false);
                  setEditingProject(undefined);
                  setProjectMatches(new Map()); // Clear matches to recalculate
                }}
                onCancel={() => {
                  setShowProjectForm(false);
                  setEditingProject(undefined);
                }}
              />
            )}
            </div>
          )}

          {/* TAB 4: VENDOR OUTREACH — Subchapter N Vendor Search */}
          {activeTab === "outreach" && (
            <div className="mt-2">
              <VendorSearch projects={projects} />
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Corvo Grant Intelligence Chat Sidebar */}
    <GrantIntelligenceChatSidebar />

    {/* Apply for Grant - AI-generated application content */}
    <Sheet open={applyGrantOpen} onOpenChange={setApplyGrantOpen}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl overflow-y-auto"
        showCloseButton={true}
      >
        <SheetHeader>
          <SheetTitle>Apply for Grant</SheetTitle>
          <SheetDescription>
            {applyGrantTitle}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-4 flex-1">
          {applyGrantError && (
            <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
              {applyGrantError}
            </div>
          )}
          {applyGrantContent !== null && (
            <div className="space-y-4">
              {!applyGrantLoading && (applyGrantContent.trimStart().toLowerCase().startsWith("<!doctype") || applyGrantContent.trimStart().toLowerCase().startsWith("<html")) ? (
                <div className="rounded-md border bg-muted/30 overflow-hidden min-h-[24rem]">
                  <iframe
                    title="Grant application guide"
                    srcDoc={applyGrantContent}
                    className="w-full min-h-[24rem] border-0 bg-white"
                    sandbox="allow-same-origin allow-scripts"
                  />
                </div>
              ) : (
                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap rounded-md border bg-muted/30 p-4 text-sm min-h-[8rem]">
                  {applyGrantContent}
                  {applyGrantLoading && (
                    <span className="inline-block w-2 h-4 ml-0.5 bg-primary animate-pulse" aria-hidden />
                  )}
                </div>
              )}
              {!applyGrantLoading && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigator.clipboard.writeText(applyGrantContent ?? "")}
                  className="gap-1.5"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy to Clipboard
                </Button>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  </>
  );
}
