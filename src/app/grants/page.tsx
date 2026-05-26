"use client";

import { useState, useEffect, useCallback, useMemo, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// Tabs UI removed - sidebar drives navigation via ?tab= param
import {
  Award,
  Search,
  Loader2,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
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
  RefreshCw,
  Database,
  MapPin,
  ExternalLink,
} from "lucide-react";
import type { DiscoveredGrant } from "@/lib/grants-gov";
import type { PipelineGrant, PipelineStage } from "@/data/grant-pipeline";
import {
  getAllPipelineGrants as getInMemoryPipelineGrants,
  addToPipeline as addToPipelineLocal,
  moveGrantToStage as moveGrantToStageLocal,
  updateGrantNotes as updateGrantNotesLocal,
  removeFromPipeline as removeFromPipelineLocal,
  getStageCount as getStageCountLocal,
  isInPipeline as isInPipelineLocal,
} from "@/data/grant-pipeline";
import { VendorSearch } from "@/components/vendor-search/vendor-search";
import {
  GrantDiscoveryFilters,
  getDefaultGrantDiscoveryFilters,
} from "@/components/grant-discovery/grant-discovery-filters";
import { buildAgenciesParam, type GrantDiscoveryFilterState } from "@/lib/grants-gov-filters";
import { getEmbeddingSimilarityForProject, type GrantScore } from "@/data/grant-scoring";
import { useProfile } from "@/components/profile-provider";
import { useTenant, useTenantHeaders } from "@/contexts/tenant-context";
import { GrantIntelligenceChatSidebar } from "@/components/grant-intelligence-chat";
import {
  getAllProjects as getInMemoryProjects,
  createProject as createProjectLocal,
  updateProject as updateProjectLocal,
  deleteProject as deleteProjectLocal,
  initializeProjectsForProfile,
  type Project,
} from "@/data/projects";
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
  const { profile: selectedProfile, profileId } = useProfile();

  // Tenant context for DB-first loading
  const tenant = useTenant();
  const tenantHeaders = useTenantHeaders();

  const tabParam = searchParams.get("tab");
  const activeTab = VALID_TABS.includes(tabParam as any) ? tabParam! : "discover";

  const setActiveTab = useCallback(
    (tab: string) => {
      router.push(`/grants?tab=${tab}`, { scroll: false });
    },
    [router]
  );

  // Federal / State-Local sub-tab within Discover
  const [discoverSource, setDiscoverSource] = useState<"federal" | "state-local">("federal");

  // Discover tab state (Grants.gov search2 + sidebar filters)
  const [discoveryFilters, setDiscoveryFilters] = useState<GrantDiscoveryFilterState>(() =>
    getDefaultGrantDiscoveryFilters()
  );
  const [showDiscoverFilters, setShowDiscoverFilters] = useState(true);
  const [discoveredGrants, setDiscoveredGrants] = useState<DiscoveredGrant[]>([]);
  const [grantScores, setGrantScores] = useState<Map<string, GrantScore>>(new Map());
  const [showOnlyEligible, setShowOnlyEligible] = useState(false);
  const [sortBy, setSortBy] = useState<"score" | "deadline" | "funding">("score");
  const [selectedProjectIds, setSelectedProjectIds] = useState<"all" | Set<string>>("all");
  const [selectedDomainIds, setSelectedDomainIds] = useState<"all" | Set<string>>("all");
  const [includeProfile, setIncludeProfile] = useState(true);
  const [includeEligibility, setIncludeEligibility] = useState(true);
  const [includeImpact, setIncludeImpact] = useState(true);
  const [sortingSectionOpen, setSortingSectionOpen] = useState(true);
  const [projectsSectionOpen, setProjectsSectionOpen] = useState(true);
  const [fundingDomainsSectionOpen, setFundingDomainsSectionOpen] = useState(true);

  // Client-side grant search cache (avoids redundant API calls for same query)
  const [searchCache] = useState(() => new Map<string, { grants: DiscoveredGrant[]; totalCount: number }>());
  const [totalCount, setTotalCount] = useState(0);
  const [searching, setSearching] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [expandedGrant, setExpandedGrant] = useState<string | null>(null);
  const [fetchingDetails, setFetchingDetails] = useState<Set<string>>(new Set());

  // Pipeline tab state - DB-first with in-memory fallback
  const [pipelineGrants, setPipelineGrants] = useState<PipelineGrant[]>([]);
  const [pipelineLoading, setPipelineLoading] = useState(true);
  const [pipelineDataSource, setPipelineDataSource] = useState<"db" | "memory">("memory");
  const [expandedPipeline, setExpandedPipeline] = useState<Set<string>>(new Set());
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesText, setNotesText] = useState("");

  // (Vendor search now handled by VendorSearch component)

  // Projects tab state - DB-first with in-memory fallback
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsDataSource, setProjectsDataSource] = useState<"db" | "memory">("memory");
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | undefined>(undefined);
  const prevProfileIdRef = useRef<string | null>(null);
  const discoveredGrantsRef = useRef<DiscoveredGrant[]>([]);
  discoveredGrantsRef.current = discoveredGrants;

  // State/Local discover state
  const [slGrants, setSlGrants] = useState<DiscoveredGrant[]>([]);
  const [slScores, setSlScores] = useState<Map<string, GrantScore>>(new Map());
  const [slLoading, setSlLoading] = useState(false);
  const [slScoring, setSlScoring] = useState(false);
  const [slError, setSlError] = useState<string | null>(null);
  const [slMissingFile, setSlMissingFile] = useState(false);
  const [slExpectedPath, setSlExpectedPath] = useState<string | null>(null);
  const [slSortBy, setSlSortBy] = useState<"score" | "deadline">("score");
  const [slSearch, setSlSearch] = useState("");
  const [slLoaded, setSlLoaded] = useState(false);

  // Fetch pipeline grants from API
  const fetchPipelineFromDB = useCallback(async () => {
    try {
      const res = await fetch("/api/pipeline", {
        headers: { ...tenantHeaders, "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to fetch pipeline");
      const data = await res.json();
      setPipelineGrants(data.grants || []);
      setPipelineDataSource("db");
      return true;
    } catch (error) {
      console.error("[Grants] Pipeline DB fetch error:", error);
      return false;
    }
  }, [tenantHeaders]);

  // Fetch projects from API
  const fetchProjectsFromDB = useCallback(async () => {
    try {
      const res = await fetch("/api/projects", {
        headers: { ...tenantHeaders, "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to fetch projects");
      const data = await res.json();
      if (data.projects && data.projects.length > 0) {
        setProjects(data.projects);
        setProjectsDataSource("db");
        return true;
      }
      return false;
    } catch (error) {
      console.error("[Grants] Projects DB fetch error:", error);
      return false;
    }
  }, [tenantHeaders]);

  // Load data on mount and when tenant changes
  useEffect(() => {
    if (tenant.isLoading) return;

    const loadData = async () => {
      setPipelineLoading(true);
      setProjectsLoading(true);

      // Load pipeline
      const pipelineSuccess = await fetchPipelineFromDB();
      if (!pipelineSuccess) {
        setPipelineGrants(getInMemoryPipelineGrants());
        setPipelineDataSource("memory");
      }
      setPipelineLoading(false);

      // Load projects
      const projectsSuccess = await fetchProjectsFromDB();
      if (!projectsSuccess) {
        initializeProjectsForProfile(profileId);
        setProjects(getInMemoryProjects());
        setProjectsDataSource("memory");
      }
      setProjectsLoading(false);
    };

    loadData();
  }, [tenant.isLoading, tenant.environment, tenant.portId, profileId, fetchPipelineFromDB, fetchProjectsFromDB]);

  // Helper functions that use the appropriate data source
  const isInPipeline = useCallback((grantId: string) => {
    if (pipelineDataSource === "db") {
      return pipelineGrants.some(g => g.id === grantId);
    }
    return isInPipelineLocal(grantId);
  }, [pipelineGrants, pipelineDataSource]);

  const getStageCount = useCallback((stage: PipelineStage) => {
    if (pipelineDataSource === "db") {
      return pipelineGrants.filter(g => g.stage === stage).length;
    }
    return getStageCountLocal(stage);
  }, [pipelineGrants, pipelineDataSource]);

  const getAllPipelineGrants = useCallback(() => {
    if (pipelineDataSource === "db") {
      return pipelineGrants;
    }
    return getInMemoryPipelineGrants();
  }, [pipelineGrants, pipelineDataSource]);

  const getAllProjects = useCallback(() => {
    if (projectsDataSource === "db") {
      return projects;
    }
    return getInMemoryProjects();
  }, [projects, projectsDataSource]);

  // Score grants (embedding + rules) for the active Client Profile
  const scoreGrants = useCallback(async (grants: DiscoveredGrant[]) => {
    setScanning(true);
    try {
      const res = await fetch("/api/score-grants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grants, profileId }),
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
  }, [profileId]);

  // State/Local: score and load helpers
  const scoreSlGrants = useCallback(async (toScore: DiscoveredGrant[]) => {
    if (toScore.length === 0) { setSlScores(new Map()); return; }
    setSlScoring(true);
    try {
      const res = await fetch("/api/score-grants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grants: toScore, profileId }),
      });
      if (!res.ok) throw new Error("Scoring failed");
      const { scores } = await res.json();
      const map = new Map<string, GrantScore>();
      for (const s of scores) map.set(s.grantId, s);
      setSlScores(map);
    } catch { setSlScores(new Map()); }
    finally { setSlScoring(false); }
  }, [profileId]);

  const loadSlGrants = useCallback(async () => {
    setSlLoading(true);
    setSlError(null);
    setSlMissingFile(false);
    try {
      const res = await fetch(`/api/state-local-grants?profileId=${encodeURIComponent(profileId)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setSlGrants(data.grants ?? []);
      setSlMissingFile(Boolean(data.missingFile));
      if (typeof data.expectedPath === "string") setSlExpectedPath(data.expectedPath);
      if ((data.grants ?? []).length > 0) await scoreSlGrants(data.grants);
      else setSlScores(new Map());
    } catch (e) {
      setSlError(e instanceof Error ? e.message : "Failed to load");
      setSlGrants([]);
    } finally {
      setSlLoading(false);
      setSlLoaded(true);
    }
  }, [profileId, scoreSlGrants]);

  useEffect(() => {
    if (discoverSource === "state-local" && !slLoaded) {
      void loadSlGrants();
    }
  }, [discoverSource, slLoaded, loadSlGrants]);

  const sortedSlGrants = useMemo(() => {
    const withScores = slGrants.filter(g => slScores.has(g.id));
    const q = slSearch.trim().toLowerCase();
    const filtered = q
      ? withScores.filter(g =>
          g.title.toLowerCase().includes(q) ||
          g.agency.toLowerCase().includes(q) ||
          g.description.toLowerCase().includes(q) ||
          g.fundingCategories.some(c => c.toLowerCase().includes(q)) ||
          g.eligibility.some(e => e.toLowerCase().includes(q))
        )
      : withScores;
    return [...filtered].sort((a, b) => {
      if (slSortBy === "deadline") return (a.closeDate || "9999").localeCompare(b.closeDate || "9999");
      return (slScores.get(b.id)?.overallScore ?? 0) - (slScores.get(a.id)?.overallScore ?? 0);
    });
  }, [slGrants, slScores, slSortBy, slSearch]);

  // Initialize projects for the active profile; on profile switch, clear scores and re-score current results
  useEffect(() => {
    initializeProjectsForProfile(profileId);
    setProjects([...getAllProjects()]);
    const switched = prevProfileIdRef.current !== null && prevProfileIdRef.current !== profileId;
    prevProfileIdRef.current = profileId;
    if (switched) {
      setGrantScores(new Map());
      const g = discoveredGrantsRef.current;
      if (g.length > 0) {
        void scoreGrants(g);
      }
    }
  }, [profileId, scoreGrants]); // scoreGrants updates when profileId updates (useCallback)

  const grantsListForMatching = useMemo(
    () => [
      ...pipelineGrants,
      ...discoveredGrants.filter((g) => !isInPipeline(g.id)),
    ],
    [pipelineGrants, discoveredGrants]
  );

  const { embeddingTopGrantsByProject, embeddingMatchCountByProject } = useMemo(() => {
    const topMap = new Map<
      string,
      { grant: DiscoveredGrant | PipelineGrant; similarity: number; embeddingOk: boolean }[]
    >();
    const countMap = new Map<string, number>();

    for (const project of projects) {
      const rows: {
        grant: DiscoveredGrant | PipelineGrant;
        similarity: number;
        embeddingOk: boolean;
      }[] = [];
      for (const grant of grantsListForMatching) {
        const gs = grantScores.get(grant.id);
        if (!gs) continue;
        const sim = getEmbeddingSimilarityForProject(project, gs);
        if (sim == null) continue;
        rows.push({
          grant,
          similarity: sim,
          embeddingOk: gs.embeddingScoresAvailable,
        });
      }
      rows.sort((a, b) => b.similarity - a.similarity);
      countMap.set(project.id, rows.length);
      topMap.set(project.id, rows.slice(0, 3));
    }

    return {
      embeddingTopGrantsByProject: topMap,
      embeddingMatchCountByProject: countMap,
    };
  }, [projects, grantsListForMatching, grantScores]);

  // Search grants from Grants.gov + USDOT programs
  async function handleSearch() {
    setSearching(true);
    setSearchError(null);

    try {
      const keyword = discoveryFilters.keyword.trim();
      const rows = discoveryFilters.rows;
      const statuses =
        discoveryFilters.oppStatuses.length > 0 ? discoveryFilters.oppStatuses : undefined;
      const agencies = buildAgenciesParam(discoveryFilters);
      const sortBy = discoveryFilters.sortBy.trim() || undefined;

      const requestPayload = {
        keyword: keyword || undefined,
        oppStatuses: statuses,
        rows,
        ...(agencies ? { agencies } : {}),
        ...(discoveryFilters.fundingCategories.length > 0
          ? { fundingCategories: discoveryFilters.fundingCategories }
          : {}),
        ...(discoveryFilters.fundingInstruments.length > 0
          ? { fundingInstruments: discoveryFilters.fundingInstruments }
          : {}),
        ...(discoveryFilters.eligibilities.length > 0
          ? { eligibilities: discoveryFilters.eligibilities }
          : {}),
        ...(discoveryFilters.oppNum.trim() ? { oppNum: discoveryFilters.oppNum.trim() } : {}),
        ...(discoveryFilters.aln.trim() ? { aln: discoveryFilters.aln.trim() } : {}),
        ...(sortBy ? { sortBy } : {}),
      };

      const cacheKey = JSON.stringify(requestPayload);

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
          headers: { ...tenantHeaders, "Content-Type": "application/json" },
          body: JSON.stringify(requestPayload),
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

  // Add grant to pipeline - persists to DB if available, falls back to in-memory
  async function handleAddToPipeline(grant: DiscoveredGrant) {
    // Create the pipeline grant object
    const newPipelineGrant: PipelineGrant = {
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
      stage: "eligible",
      addedAt: new Date().toISOString(),
      notes: "",
    };

    // Optimistic update - update state immediately based on data source
    if (pipelineDataSource === "db") {
      // Update React state directly for DB-sourced data
      setPipelineGrants(prev => [...prev, newPipelineGrant]);
    } else {
      // Update in-memory store for memory-sourced data
      addToPipelineLocal(newPipelineGrant);
      setPipelineGrants([...getInMemoryPipelineGrants()]);
    }
    setActiveTab("pipeline");

    // Persist to DB
    // Include full grant data so it gets stored in DemoDiscoveredGrant
    try {
      const res = await fetch("/api/pipeline", {
        method: "POST",
        headers: { ...tenantHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          grantId: grant.id,
          portProfileId: profileId,
          stage: "eligible",
          grant: {
            opportunityNumber: grant.opportunityNumber,
            title: grant.title,
            agency: grant.agency,
            agencyCode: grant.agencyCode,
            description: grant.description,
            awardFloor: grant.awardFloor,
            awardCeiling: grant.awardCeiling,
            totalFunding: grant.totalFunding,
            closeDate: grant.closeDate,
            postDate: grant.postDate,
            status: grant.status,
            applicationUrl: grant.applicationUrl,
            eligibility: grant.eligibility,
            fundingCategories: grant.fundingCategories,
            fundingInstruments: grant.fundingInstruments,
            costSharing: grant.costSharing,
            alnNumbers: grant.alnNumbers,
            contactName: grant.contactName,
            contactEmail: grant.contactEmail,
            contactPhone: grant.contactPhone,
          },
        }),
      });

      if (!res.ok) {
        console.error("[Pipeline] DB persist failed:", res.status, await res.text());
        // Revert optimistic update on failure
        setPipelineGrants(prev => prev.filter(g => g.id !== grant.id));
      }
    } catch (error) {
      console.error("[Pipeline] Failed to persist to DB:", error);
      // Revert optimistic update on network error
      setPipelineGrants(prev => prev.filter(g => g.id !== grant.id));
    }
  }

  // Move grant between pipeline stages
  async function handleMoveStage(grant: PipelineGrant, direction: "forward" | "backward") {
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

      // Optimistic update - update state immediately based on data source
      if (pipelineDataSource === "db") {
        // Update React state directly for DB-sourced data
        setPipelineGrants(prev => prev.map(g =>
          g.id === grant.id ? { ...g, stage: newStage } : g
        ));
      } else {
        // Update in-memory store for memory-sourced data
        moveGrantToStageLocal(grant.id, newStage);
        setPipelineGrants([...getInMemoryPipelineGrants()]);
      }

      // Persist to DB
      try {
        const res = await fetch("/api/pipeline", {
          method: "PUT",
          headers: { ...tenantHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({
            grantId: grant.id,
            action: "move",
            stage: newStage,
          }),
        });
        if (!res.ok) {
          console.error("[Pipeline] Stage move persist failed:", res.status);
          // Revert optimistic update
          setPipelineGrants(prev => prev.map(g =>
            g.id === grant.id ? { ...g, stage: grant.stage } : g
          ));
        }
      } catch (error) {
        console.error("[Pipeline] Failed to persist stage move:", error);
        setPipelineGrants(prev => prev.map(g =>
          g.id === grant.id ? { ...g, stage: grant.stage } : g
        ));
      }
    }
  }

  // Save notes for a grant
  async function handleSaveNotes(grantId: string) {
    const savedNotes = notesText;

    // Optimistic update - update state immediately based on data source
    if (pipelineDataSource === "db") {
      // Update React state directly for DB-sourced data
      setPipelineGrants(prev => prev.map(g =>
        g.id === grantId ? { ...g, notes: savedNotes } : g
      ));
    } else {
      // Update in-memory store for memory-sourced data
      updateGrantNotesLocal(grantId, savedNotes);
      setPipelineGrants([...getInMemoryPipelineGrants()]);
    }

    setEditingNotes(null);
    setNotesText("");

    // Persist to DB
    try {
      const res = await fetch("/api/pipeline", {
        method: "PUT",
        headers: { ...tenantHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          grantId,
          action: "notes",
          notes: savedNotes,
        }),
      });
      if (!res.ok) {
        console.error("[Pipeline] Notes persist failed:", res.status);
      }
    } catch (error) {
      console.error("[Pipeline] Failed to persist notes:", error);
    }
  }

  // Remove grant from pipeline
  async function handleRemoveFromPipeline(grantId: string) {
    // Optimistic update - update state immediately based on data source
    if (pipelineDataSource === "db") {
      // Update React state directly for DB-sourced data
      setPipelineGrants(prev => prev.filter(g => g.id !== grantId));
    } else {
      // Update in-memory store for memory-sourced data
      removeFromPipelineLocal(grantId);
      setPipelineGrants([...getInMemoryPipelineGrants()]);
    }

    // Persist to DB
    try {
      const res = await fetch(`/api/pipeline?grantId=${encodeURIComponent(grantId)}`, {
        method: "DELETE",
        headers: { ...tenantHeaders },
      });
      if (!res.ok) {
        console.error("[Pipeline] Removal persist failed:", res.status);
      }
    } catch (error) {
      console.error("[Pipeline] Failed to persist removal:", error);
    }
  }

  function handleDraftGrant(grant: { id: string; title: string }) {
    const params = new URLSearchParams({
      grantId: grant.id,
      grantTitle: grant.title,
    });
    router.push(`/drafting?${params.toString()}`);
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto">
        <div
          className={`mx-auto px-6 py-8 ${
            activeTab === "outreach" || activeTab === "discover" ? "max-w-[90rem]" : "max-w-6xl"
          }`}
        >
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
                {activeTab === "discover" && "Search and discover grant opportunities"}
                {activeTab === "pipeline" && "Track your grant applications through each stage"}
                {activeTab === "projects" && "Manage port projects and match them to grants"}
                {activeTab === "outreach" && "Search qualified federal contractors with Subchapter N compliance intelligence"}
              </p>
            </div>
          </div>
        </div>

        {/* Tab content - tab selection driven by URL ?tab= param, sidebar provides navigation */}
        <div className="w-full">
          {activeTab === "discover" && (
            <div className="mt-2 space-y-4">
              {/* Federal / State & Local sub-tabs */}
              <div className="flex items-center gap-1 border-b">
                <button
                  onClick={() => setDiscoverSource("federal")}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    discoverSource === "federal"
                      ? "border-[#3d8b8b] text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Federal
                </button>
                <button
                  onClick={() => setDiscoverSource("state-local")}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                    discoverSource === "state-local"
                      ? "border-[#3d8b8b] text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <MapPin className="h-3.5 w-3.5" />
                  State & Local
                </button>
              </div>

              {discoverSource === "federal" && (
              <div className="flex gap-4 items-start">
              {showDiscoverFilters && (
                <div className="w-80 shrink-0 sticky top-4 space-y-3">
                  <Button
                    onClick={handleSearch}
                    disabled={searching}
                    className="w-full gap-2"
                    size="sm"
                  >
                    {searching ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Searching Grants.gov…
                      </>
                    ) : (
                      <>
                        <Search className="h-3.5 w-3.5" />
                        Search Federal Grants
                      </>
                    )}
                  </Button>
                  <GrantDiscoveryFilters
                    filters={discoveryFilters}
                    onChange={setDiscoveryFilters}
                    onReset={() => setDiscoveryFilters(getDefaultGrantDiscoveryFilters())}
                  />
                </div>
              )}

              <div className="flex-1 min-w-0 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {!showDiscoverFilters && (
                      <>
                        <Button
                          onClick={handleSearch}
                          disabled={searching}
                          size="sm"
                          className="gap-1 h-7 text-[11px]"
                        >
                          {searching ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Search className="h-3 w-3" />
                          )}
                          Search
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowDiscoverFilters(true)}
                          className="gap-1 h-7 text-[11px]"
                        >
                          <SlidersHorizontal className="h-3 w-3" />
                          Filters
                        </Button>
                      </>
                    )}
                    {showDiscoverFilters && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowDiscoverFilters(false)}
                        className="gap-1 h-7 text-[11px]"
                      >
                        <ChevronLeft className="h-3 w-3" />
                        Hide filters
                      </Button>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      Grants.gov search2: agencies, CFDA, categories, instruments, eligibility, sort, and page size.
                    </p>
                  </div>
                  {discoveredGrants.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => scoreGrants(discoveredGrants)}
                      disabled={scanning}
                      className="gap-1.5 h-7 text-[11px]"
                    >
                      {scanning ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Analyzing…
                        </>
                      ) : (
                        <>
                          <Award className="h-3 w-3" />
                          Re-scan matches
                        </>
                      )}
                    </Button>
                  )}
                </div>

            {discoveredGrants.length > 0 && (
              <Card className="p-4 mb-4">
                <div className="space-y-3">
                  <div className="border-b border-border/50 pb-2 -mx-1 px-1">
                    <button
                      type="button"
                      onClick={() => setSortingSectionOpen((o) => !o)}
                      className="w-full flex items-center gap-2 text-left rounded-md py-1.5 -my-1 hover:bg-muted/60 transition-colors"
                    >
                      {sortingSectionOpen ? (
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      )}
                      <span className="text-xs font-semibold">Sorting</span>
                      {!sortingSectionOpen && (
                        <span className="text-[10px] text-muted-foreground font-normal truncate">
                          ·{" "}
                          {sortBy === "score"
                            ? "Match score"
                            : sortBy === "funding"
                              ? "Funding"
                              : "Deadline"}
                          {showOnlyEligible ? " · Eligible only" : ""}
                          {(!includeProfile || !includeEligibility || !includeImpact) &&
                            " · Custom score mix"}
                        </span>
                      )}
                    </button>
                  </div>

                  {sortingSectionOpen && (
                    <>
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
                          <span className="text-[10px] font-medium text-muted-foreground">
                            Include in score:
                          </span>
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
                    </>
                  )}

                  {projects.length > 0 && (
                    <div className="border-t pt-3">
                      <button
                        type="button"
                        onClick={() => setProjectsSectionOpen((o) => !o)}
                        className="w-full flex items-center gap-2 text-left rounded-md py-1.5 -mx-1 px-1 mb-1 hover:bg-muted/60 transition-colors"
                      >
                        {projectsSectionOpen ? (
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        )}
                        <SlidersHorizontal className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="text-xs font-semibold">Projects</span>
                        {!projectsSectionOpen && (
                          <span className="text-[10px] text-muted-foreground font-normal truncate">
                            ·{" "}
                            {selectedProjectIds === "all"
                              ? "All"
                              : selectedProjectIds.size === 0
                                ? "None"
                                : `${selectedProjectIds.size} selected`}
                          </span>
                        )}
                      </button>
                      {projectsSectionOpen && (
                        <>
                          <div className="flex items-center gap-2 mb-1.5 pl-6">
                            <span className="text-[10px] font-medium text-muted-foreground">Filter:</span>
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
                                selectedProjectIds !== "all" && selectedProjectIds.size === 0
                                  ? "text-primary font-medium"
                                  : "text-muted-foreground"
                              }`}
                            >
                              None
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1.5 pl-6">
                            {projects.map((project) => {
                              const isSelected =
                                selectedProjectIds === "all" || selectedProjectIds.has(project.id);
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
                        </>
                      )}
                    </div>
                  )}

                  <div className="border-t pt-3">
                    <button
                      type="button"
                      onClick={() => setFundingDomainsSectionOpen((o) => !o)}
                      className="w-full flex items-center gap-2 text-left rounded-md py-1.5 -mx-1 px-1 mb-1 hover:bg-muted/60 transition-colors"
                    >
                      {fundingDomainsSectionOpen ? (
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      )}
                      <SlidersHorizontal className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="text-xs font-semibold">Funding domains</span>
                      {!fundingDomainsSectionOpen && (
                        <span className="text-[10px] text-muted-foreground font-normal truncate">
                          ·{" "}
                          {selectedDomainIds === "all"
                            ? "All"
                            : selectedDomainIds.size === 0
                              ? "None"
                              : `${selectedDomainIds.size} selected`}
                        </span>
                      )}
                    </button>
                    {fundingDomainsSectionOpen && (
                      <>
                        <div className="flex items-center gap-2 mb-1.5 pl-6">
                          <span className="text-[10px] font-medium text-muted-foreground">Filter:</span>
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
                              selectedDomainIds !== "all" && selectedDomainIds.size === 0
                                ? "text-primary font-medium"
                                : "text-muted-foreground"
                            }`}
                          >
                            None
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5 pl-6">
                          {FUNDING_DOMAINS.map((domain) => {
                            const isSelected =
                              selectedDomainIds === "all" || selectedDomainIds.has(domain.id);
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
                      </>
                    )}
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

            {totalCount > 0 && !searching && !scanning && (
              <p className="text-xs text-muted-foreground mb-4">
                Found {totalCount.toLocaleString()} opportunities (showing {discoveredGrants.length})
              </p>
            )}

            {(searching || scanning) && (
              <div className="space-y-3 py-8">
                <div className="flex flex-col items-center gap-3 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <div>
                    <p className="text-sm font-medium">{searching ? "Searching federal grants..." : "Analyzing grant matches..."}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {searching ? "Querying Grants.gov and scoring results" : "Evaluating eligibility and alignment"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2" style={{ display: searching || scanning ? "none" : undefined }}>
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
                              handleDraftGrant(grant);
                            }}
                            className="gap-1.5"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            Draft Grant
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
            </div>
              )}

              {discoverSource === "state-local" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      State & local grants for <span className="font-medium text-foreground">{selectedProfile.name}</span>
                      {slLoaded && !slLoading && ` · ${sortedSlGrants.length} result${sortedSlGrants.length !== 1 ? "s" : ""}`}
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="flex rounded-md border bg-muted/40 p-0.5">
                        <Button variant={slSortBy === "score" ? "secondary" : "ghost"} size="sm" className="h-7 text-xs" onClick={() => setSlSortBy("score")}>Score</Button>
                        <Button variant={slSortBy === "deadline" ? "secondary" : "ghost"} size="sm" className="h-7 text-xs" onClick={() => setSlSortBy("deadline")}>Deadline</Button>
                      </div>
                      <Button variant="outline" size="sm" className="h-7" disabled={slLoading || slScoring} onClick={() => { setSlLoaded(false); void loadSlGrants(); }}>
                        {slLoading || slScoring ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search grants by keyword..."
                      value={slSearch}
                      onChange={(e) => setSlSearch(e.target.value)}
                      className="h-8 pl-9 text-sm"
                    />
                  </div>

                  {slError && (
                    <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2">
                      <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                      <p className="text-sm text-destructive">{slError}</p>
                    </div>
                  )}

                  {slLoading && (
                    <div className="flex items-center gap-2 text-muted-foreground text-sm py-8 justify-center">
                      <Loader2 className="h-5 w-5 animate-spin" /> Loading grants…
                    </div>
                  )}

                  {!slLoading && slMissingFile && (
                    <Card className="p-6">
                      <h2 className="text-sm font-medium mb-2">No state & local grants available for this profile</h2>
                      <p className="text-sm text-muted-foreground mb-3">
                        State and local grant data has not been configured for this profile yet.
                      </p>
                    </Card>
                  )}

                  {!slLoading && !slMissingFile && slGrants.length === 0 && slLoaded && (
                    <Card className="p-6 text-center text-sm text-muted-foreground">
                      No grants found for this profile.
                    </Card>
                  )}

                  {slScoring && slGrants.length > 0 && (
                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Ranking with embeddings…
                    </p>
                  )}

                  <div className="space-y-2">
                    {sortedSlGrants.map((grant) => {
                      const score = slScores.get(grant.id);
                      return (
                        <Card key={grant.id} className="overflow-hidden">
                          <div className="p-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0 flex-1 space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-sm font-medium leading-snug">{grant.title}</h2>
                                <Badge variant="outline" className={`text-[10px] ${statusColors[grant.status] ?? ""}`}>{grant.status}</Badge>
                                {grant.source && <Badge variant="outline" className="text-[9px] px-1.5 py-0">{grant.source}</Badge>}
                              </div>
                              <p className="text-xs text-muted-foreground">{grant.agency}</p>
                              {score && (
                                <div className="flex flex-wrap gap-2">
                                  <Badge variant="outline" className={`text-[10px] ${grantRecColors[score.recommendation] ?? ""}`}>
                                    {score.overallScore}/100 — {score.recommendation.replace(/_/g, " ")}
                                  </Badge>
                                  <Badge variant="outline" className={`text-[10px] ${eligibilityColors[score.eligibilityStatus] ?? ""}`}>
                                    {score.eligibilityStatus.replace(/_/g, " ")}
                                  </Badge>
                                </div>
                              )}
                              {grant.description && <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4">{grant.description}</p>}
                              {grant.applicationUrl && (
                                <a href={grant.applicationUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                                  Source link <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                            <div className="text-left sm:text-right shrink-0 space-y-1">
                              {score && <div className="text-2xl font-bold text-primary">{score.overallScore}</div>}
                              <p className="text-sm font-mono font-medium">
                                {grant.awardCeiling > 0 || grant.awardFloor > 0
                                  ? grant.awardFloor > 0 && grant.awardCeiling > 0
                                    ? `${formatCurrency(grant.awardFloor)} – ${formatCurrency(grant.awardCeiling)}`
                                    : grant.awardCeiling > 0 ? `Up to ${formatCurrency(grant.awardCeiling)}` : `From ${formatCurrency(grant.awardFloor)}`
                                  : "Amount TBD"}
                              </p>
                              <p className="text-[10px] text-muted-foreground">{grant.closeDate ? `Deadline: ${grant.closeDate}` : "No deadline"}</p>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PIPELINE */}
          {activeTab === "pipeline" && (
            <div className="mt-2">
            {pipelineLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading pipeline...</p>
              </div>
            ) : (
            <>
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
                                    onClick={() => handleDraftGrant(grant)}
                                    className="h-6 text-[10px] px-2 w-full gap-1"
                                  >
                                    <FileText className="h-3 w-3" />
                                    Draft Grant
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
            </>
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
                  const topEmbeddingMatches = embeddingTopGrantsByProject.get(project.id) ?? [];
                  const embeddingMatchTotal = embeddingMatchCountByProject.get(project.id) ?? 0;

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
                                  {embeddingMatchTotal > 0 && (
                                    <span className="flex items-center gap-1">
                                      <Award className="h-3 w-3" />
                                      {embeddingMatchTotal} semantic match
                                      {embeddingMatchTotal !== 1 ? "es" : ""}
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
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (confirm(`Delete project "${project.name}"?`)) {
                                  // Update local state immediately (filter from current state)
                                  deleteProjectLocal(project.id);
                                  setProjects((prev) => prev.filter((p) => p.id !== project.id));

                                  // Persist to DB in background
                                  try {
                                    await fetch(`/api/projects?id=${encodeURIComponent(project.id)}`, {
                                      method: "DELETE",
                                      headers: tenantHeaders,
                                    });
                                  } catch (error) {
                                    console.error("[Projects] Failed to persist deletion:", error);
                                  }
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

                            <div>
                              <h4 className="text-xs font-semibold mb-1">
                                Top matching grants
                              </h4>
                              {grantScores.size === 0 ? (
                                <p className="text-xs text-muted-foreground py-2">
                                  Run a search on the Discover tab to score opportunities; matches listed here use those cached scores.
                                </p>
                              ) : embeddingMatchTotal === 0 ? (
                                <p className="text-xs text-muted-foreground py-2">
                                  No scored grants list a semantic match for this project yet. This project may not be in the embedding catalog, or no overlapping grants were scored.
                                </p>
                              ) : (
                                <div className="space-y-2">
                                  {topEmbeddingMatches.map((row) => {
                                    const { grant, similarity, embeddingOk } = row;
                                    const tier =
                                      similarity >= 70
                                        ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
                                        : similarity >= 50
                                          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";

                                    return (
                                      <Card key={grant.id} className={`p-3 border ${tier}`}>
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                              <span className="text-xs font-medium line-clamp-2">
                                                {grant.title}
                                              </span>
                                              <Badge variant="outline" className="text-[9px] tabular-nums">
                                                Similarity {similarity}%
                                              </Badge>
                                              {!embeddingOk && (
                                                <Badge variant="secondary" className="text-[9px]">
                                                  Est.
                                                </Badge>
                                              )}
                                            </div>
                                            <p className="text-[10px] text-muted-foreground line-clamp-1">
                                              {grant.agency}
                                            </p>
                                          </div>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-xs h-7 shrink-0"
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
                              )}
                            </div>
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
                    // Update existing project in local state
                    updateProjectLocal(editingProject.id, projectData);
                    setProjects((prev) =>
                      prev.map((p) =>
                        p.id === editingProject.id ? { ...p, ...projectData } : p
                      )
                    );

                    // Persist to DB in background
                    try {
                      await fetch("/api/projects", {
                        method: "PUT",
                        headers: { ...tenantHeaders, "Content-Type": "application/json" },
                        body: JSON.stringify({ id: editingProject.id, ...projectData }),
                      });
                    } catch (error) {
                      console.error("[Projects] Failed to persist update:", error);
                    }
                  } else {
                    // Create new project
                    const created = createProjectLocal(projectData);

                    // Add to current projects state (preserving DB-loaded projects)
                    setProjects((prev) => [...prev, created]);

                    // Persist to DB and generate embedding in background
                    try {
                      // First create in DB
                      const res = await fetch("/api/projects", {
                        method: "POST",
                        headers: { ...tenantHeaders, "Content-Type": "application/json" },
                        body: JSON.stringify({ ...projectData, portProfileId: profileId }),
                      });

                      if (res.ok) {
                        const dbProject = await res.json();
                        // Update local state with DB-assigned ID if different
                        if (dbProject.id && dbProject.id !== created.id) {
                          setProjects((prev) =>
                            prev.map((p) => (p.id === created.id ? { ...p, id: dbProject.id } : p))
                          );
                        }

                        // Then generate embedding
                        await fetch("/api/embed-project", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ ...dbProject, profileId }),
                        });
                      }
                    } catch (error) {
                      console.error("[Projects] Failed to persist:", error);
                    }
                  }
                  setShowProjectForm(false);
                  setEditingProject(undefined);
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
  </>
  );
}
