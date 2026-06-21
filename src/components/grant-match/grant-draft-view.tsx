"use client";

import { useState, useEffect, useCallback, useMemo, Fragment, useRef } from "react";
import { useTenant, useTenantHeaders } from "@/contexts/tenant-context";
import { getProfile } from "@/data/profiles";
import { FEDERAL_FORMS } from "@/data/federal-forms";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Copy,
  Trash2,
  Download,
  FileText,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Paperclip,
  Edit,
  Eye,
  FileDown,
  Upload,
  Building2,
  ScrollText,
  X,
  Search,
  Globe,
  Database,
  ExternalLink,
  Zap,
  RefreshCw,
  FileCheck,
  ArrowRight,
  History,
  RotateCw,
  Save,
  User,
  Clock,
  Plus,
} from "lucide-react";
import type {
  DraftSection,
  AttachmentStatus,
  DraftResponse,
  DraftStreamEvent,
  ResearchData,
  ResearchEntityProfile,
  GrantApplicationSection,
  EnrichedForm,
  UserGuidance,
  DraftVersion,
  SavedDraft,
  EditedBy,
  SectionConfidenceDetail,
} from "@/lib/grant-drafting/types";
import { EMPTY_USER_GUIDANCE, mergeValue, mergeArray } from "@/lib/grant-drafting/types";

// ─── Local UI Types ───

type Phase = "idle" | "researching" | "review" | "generating" | "draft";

interface GrantDraftViewProps {
  initialGrantId?: string;
  initialGrantTitle?: string;
}

// ─── Helpers ───

const confidenceConfig = {
  high: { color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20", icon: CheckCircle2, label: "High Confidence" },
  medium: { color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20", icon: AlertTriangle, label: "Medium Confidence" },
  low: { color: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20", icon: AlertCircle, label: "Low Confidence" },
};

const attachmentStatusConfig = {
  on_file: { color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", label: "On File" },
  needs_preparation: { color: "bg-amber-500/10 text-amber-600 dark:text-amber-400", label: "Needs Prep" },
  missing: { color: "bg-red-500/10 text-red-600 dark:text-red-400", label: "Missing" },
};

const qualityColors = {
  high: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
  medium: "text-amber-600 bg-amber-500/10 border-amber-500/20",
  low: "text-red-600 bg-red-500/10 border-red-500/20",
};

function looksLikeHtml(content: string): boolean {
  return /<(h[1-6]|p|ul|ol|table|strong|em)\b/i.test(content);
}

const GAP_HTML_STYLES = {
  needs:
    "display:inline-block;background:rgba(251,191,36,0.35);color:rgb(146,64,14);padding:0.125rem 0.375rem;border-radius:0.25rem;font-size:0.875rem;font-weight:500;margin:0 0.125rem",
  source:
    "display:inline-block;background:rgba(219,234,254,0.6);color:rgb(29,78,216);padding:0.125rem 0.25rem;border-radius:0.25rem;font-size:0.75rem;font-weight:500;margin:0 0.125rem",
  tbp:
    "display:inline-block;background:rgba(254,226,226,0.6);color:rgb(185,28,28);padding:0.125rem 0.375rem;border-radius:0.25rem;font-size:0.875rem;font-weight:500;margin:0 0.125rem",
  citation:
    "color:rgb(29,78,216);font-size:0.7rem;font-weight:500;text-decoration:none;vertical-align:super;margin:0 0.125rem;border-bottom:1px dotted rgb(29,78,216)",
  citationInternal:
    "display:inline;color:rgb(100,116,139);font-size:0.7rem;font-weight:500;vertical-align:super;margin:0 0.125rem",
};

function annotateHtmlGaps(html: string, previewMode = false): string {
  let result = html;

  // Style citation links (<a class="citation">)
  if (previewMode) {
    // In preview mode: remove citation links entirely (keep surrounding text clean)
    result = result.replace(/<a\s+[^>]*class="citation"[^>]*>.*?<\/a>/gi, "");
    // Remove internal citations too
    result = result.replace(/<span\s+[^>]*class="citation-internal"[^>]*>.*?<\/span>/gi, "");
    // Remove legacy [Source: X] tags
    result = result.replace(/\[Source:[^\]]+\]/g, "");
  } else {
    // In edit mode: style citation links as superscript references
    result = result.replace(
      /<a\s+([^>]*class="citation"[^>]*)>/gi,
      `<a $1 style="${GAP_HTML_STYLES.citation}">`,
    );
    // Style internal citations
    result = result.replace(
      /<span\s+([^>]*class="citation-internal"[^>]*)>/gi,
      `<span $1 style="${GAP_HTML_STYLES.citationInternal}">`,
    );
    // Legacy [Source: X] tags (from older drafts)
    result = result.replace(
      /\[Source:([^\]]+)\]/g,
      `<span style="${GAP_HTML_STYLES.source}">[Source:$1]</span>`,
    );
  }

  // Gap annotations (always shown)
  result = result.replace(
    /\[NEEDS:([^\]]+)\]/g,
    `<span style="${GAP_HTML_STYLES.needs}">[NEEDS:$1]</span>`,
  );
  result = result.replace(
    /\[To be provided by applicant\]/g,
    `<span style="${GAP_HTML_STYLES.tbp}">[To be provided by applicant]</span>`,
  );

  return result;
}

function SectionContent({
  content,
  className = "",
  previewMode = false,
}: {
  content: string;
  className?: string;
  previewMode?: boolean;
}) {
  const fontStyle = { fontFamily: "Georgia, 'Times New Roman', serif" };
  if (looksLikeHtml(content)) {
    return (
      <div
        className={`text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none [&_p]:mb-4 [&_p]:mt-0 ${className}`}
        style={fontStyle}
        dangerouslySetInnerHTML={{ __html: annotateHtmlGaps(content, previewMode) }}
      />
    );
  }

  // For preview mode, split on double newlines to create properly spaced paragraphs
  if (previewMode) {
    const paragraphs = content.split(/\n{2,}/);
    return (
      <div className={`text-sm leading-relaxed space-y-4 ${className}`} style={fontStyle}>
        {paragraphs.map((para, i) => (
          <p key={i} className="whitespace-pre-wrap">
            {highlightGapAnnotations(para.trim(), previewMode)}
          </p>
        ))}
      </div>
    );
  }

  return (
    <div
      className={`text-sm leading-relaxed whitespace-pre-wrap ${className}`}
      style={fontStyle}
    >
      {highlightGapAnnotations(content, previewMode)}
    </div>
  );
}

function highlightGapAnnotations(text: string, previewMode = false): React.ReactNode[] {
  const parts = text.split(/(\[NEEDS:[^\]]+\]|\[Source:[^\]]+\]|\[To be provided by applicant\])/g);
  return parts.map((part, i) => {
    if (part.startsWith("[NEEDS:")) {
      return (
        <span
          key={i}
          className="inline-block bg-amber-200/60 dark:bg-amber-800/40 text-amber-800 dark:text-amber-200 px-1.5 py-0.5 rounded text-sm font-medium mx-0.5"
        >
          {part}
        </span>
      );
    }
    if (part.startsWith("[Source:")) {
      // In preview mode, hide legacy [Source: X] citations
      if (previewMode) return null;
      return (
        <span
          key={i}
          className="inline-block bg-blue-100/60 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-1 py-0.5 rounded text-xs font-medium mx-0.5"
        >
          {part}
        </span>
      );
    }
    if (part === "[To be provided by applicant]") {
      return (
        <span
          key={i}
          className="inline-block bg-red-100/60 dark:bg-red-900/40 text-red-700 dark:text-red-300 px-1.5 py-0.5 rounded text-sm font-medium mx-0.5"
        >
          {part}
        </span>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

function formatDollars(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return n > 0 ? `$${n}` : "-";
}

/** Convert DB draft shape → local component shape */
function dbDraftToLocal(d: SavedDraft, profileName: string): LocalDraft {
  return {
    id: d.id,
    grantId: d.grantId,
    grantTitle: d.grantProgram,
    grantProgram: d.grantProgram,
    applicantName: profileName,
    status: d.status,
    researchData: d.researchData,
    userGuidance: d.userGuidance,
    sections: (d.sections || []).map((s) => ({
      sectionId: s.sectionId,
      title: s.title,
      content: s.content || "",
      confidence: s.confidence || "low",
      confidenceReason: s.confidenceReason || "",
      confidenceDetails: s.confidenceDetails,
      gapAnnotations: s.gapAnnotations || [],
      wordCount: s.wordCount || (s.content || "").split(/\s+/).filter(Boolean).length,
      maxWords: s.maxWords || 5000,
      weight: s.weight || 0,
      lastEditedAt: s.lastEditedAt,
      lastEditedBy: s.lastEditedBy,
      aiGenerated: s.aiGenerated,
    })),
    overallCompleteness: d.overallCompleteness || 0,
    attachmentsChecklist: (d.attachmentsChecklist || []).map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description || "",
      required: a.required,
      status: a.status || "missing",
      notes: a.notes || "",
    })),
    generatedAt: d.generatedAt || d.createdAt,
    lastEditedAt: d.lastEditedAt,
    lastEditedBy: d.lastEditedBy,
    createdBy: d.createdBy,
  };
}

/** Local draft shape used within the component (extends DraftResponse with extra fields) */
interface LocalDraft extends DraftResponse {
  id: string;
  grantId: string;
  grantTitle: string;
  status?: "researching" | "drafting" | "reviewing" | "ready" | "submitted";
  researchData?: ResearchData;
  userGuidance?: UserGuidance;
  lastEditedAt?: string;
  lastEditedBy?: EditedBy;
  createdBy?: EditedBy;
}

// ─── Component ───

export function GrantDraftView({ initialGrantId, initialGrantTitle }: GrantDraftViewProps) {
  const tenant = useTenant();
  const tenantHeaders = useTenantHeaders();
  const profile = getProfile(tenant.portSlug) ?? { name: tenant.portName };

  // Phase state
  const [phase, setPhase] = useState<Phase>("idle");
  const [researchData, setResearchData] = useState<ResearchData | null>(null);
  const [researchError, setResearchError] = useState<string | null>(null);
  const [researchProgress, setResearchProgress] = useState("");

  // Draft state
  const [drafts, setDrafts] = useState<LocalDraft[]>([]);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingProgress, setGeneratingProgress] = useState("");
  const [streamingSections, setStreamingSections] = useState<DraftSection[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [editingSections, setEditingSections] = useState<Map<string, string>>(new Map());
  const [showAttachments, setShowAttachments] = useState(false);
  const [activeView, setActiveView] = useState<"sections" | "preview">("sections");
  const [draftsLoaded, setDraftsLoaded] = useState(false);

  // User guidance state
  const [userGuidance, setUserGuidance] = useState<UserGuidance>(EMPTY_USER_GUIDANCE);

  // Version history state
  const [versionHistory, setVersionHistory] = useState<DraftVersion[]>([]);
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  // Regenerating sections
  const [regeneratingSection, setRegeneratingSection] = useState<string | null>(null);

  // Current grant context
  const [currentGrantId, setCurrentGrantId] = useState<string | null>(null);
  const [currentGrantTitle, setCurrentGrantTitle] = useState<string | null>(null);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);

  // ACFR upload state
  const [acfrLoading, setAcfrLoading] = useState(false);
  const [acfrFileName, setAcfrFileName] = useState<string | null>(null);
  const [acfrError, setAcfrError] = useState<string | null>(null);

  // NOFO upload state
  const [nofoLoading, setNofoLoading] = useState(false);
  const [nofoFileName, setNofoFileName] = useState<string | null>(null);
  const [nofoError, setNofoError] = useState<string | null>(null);
  const [nofoUploaded, setNofoUploaded] = useState(false);

  // Grant picker state
  const [showGrantPicker, setShowGrantPicker] = useState(false);

  // Autosave state
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved" | "error">("saved");
  const pendingSaveRef = useRef<AbortController | null>(null);

  // Load drafts from database on mount
  useEffect(() => {
    async function loadDrafts() {
      try {
        const res = await fetch("/api/grant-drafts", {
          headers: { ...tenantHeaders, "Content-Type": "application/json" },
        });
        if (res.ok) {
          const data = await res.json();
          const loadedDrafts: LocalDraft[] = (data.drafts || []).map((d: SavedDraft) =>
            dbDraftToLocal(d, profile.name)
          );
          setDrafts(loadedDrafts);
        }
      } catch (error) {
        console.error("Failed to load drafts from database:", error);
      } finally {
        setDraftsLoaded(true);
      }
    }
    loadDrafts();
  }, [tenantHeaders, profile.name]);

  // Auto-start research when coming from Draft Grant button
  useEffect(() => {
    if (!draftsLoaded) return;

    async function initializeFromGrant() {
      if (!initialGrantId || !initialGrantTitle || phase !== "idle") return;

      try {
        const res = await fetch(`/api/grant-drafts?grantId=${initialGrantId}`, {
          headers: tenantHeaders,
        });

        if (res.ok) {
          const dbDraft = await res.json();
          const status = dbDraft.status as string;
          const hasSections = Array.isArray(dbDraft.sections) && dbDraft.sections.length > 0 &&
                             dbDraft.sections.some((s: DraftSection) => s.content && s.content.trim().length > 0);

          if (status === "researching" || (status === "drafting" && !hasSections)) {
            if (dbDraft.researchData) {
              setResearchData(dbDraft.researchData);
              setCurrentGrantId(initialGrantId);
              setCurrentGrantTitle(initialGrantTitle);
              setCurrentDraftId(dbDraft.id);
              if (dbDraft.userGuidance) setUserGuidance(dbDraft.userGuidance);
              sessionStorage.setItem(`research_${initialGrantId}`, JSON.stringify(dbDraft.researchData));
              setPhase("review");
              return;
            }
          } else if (hasSections) {
            const localDraft = drafts.find((d) => d.id === dbDraft.id || d.grantId === initialGrantId);
            if (localDraft && localDraft.sections.length > 0) {
              setSelectedDraftId(localDraft.id);
              setExpandedSections(new Set(localDraft.sections.map((s) => s.sectionId)));
              setPhase("draft");
              return;
            }
          }
        }
      } catch (e) {
        console.error("Failed to check database for existing draft:", e);
      }

      const cachedResearch = sessionStorage.getItem(`research_${initialGrantId}`);
      if (cachedResearch) {
        try {
          setResearchData(JSON.parse(cachedResearch));
          setCurrentGrantId(initialGrantId);
          setCurrentGrantTitle(initialGrantTitle);
          setPhase("review");
          return;
        } catch { /* ignore */ }
      }

      handleStartResearch(initialGrantId, initialGrantTitle);
    }

    initializeFromGrant();
  }, [initialGrantId, initialGrantTitle, draftsLoaded, drafts, tenantHeaders]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedDraft = useMemo(() => drafts.find((d) => d.id === selectedDraftId), [drafts, selectedDraftId]);

  // ─── Phase 1: Research ───

  async function handleStartResearch(grantId: string, grantTitle: string) {
    setPhase("researching");
    setResearchError(null);
    setCurrentGrantId(grantId);
    setCurrentGrantTitle(grantTitle);

    try {
      setResearchProgress("Fetching grant details from Grants.gov...");
      await new Promise((r) => setTimeout(r, 300));

      setResearchProgress("Searching web & auto-fetching NOFO/ACFR PDFs...");

      const res = await fetch("/api/research-grant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grantId, grantTitle, entityName: profile.name }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Research failed");
      }

      const data: ResearchData = await res.json();
      setResearchData(data);

      if (data.metadata?.nofoAutoFetched) {
        setNofoUploaded(true);
      }
      if (data.metadata?.acfrAutoFetched && data.metadata?.acfrPdfUrl) {
        setAcfrFileName("Auto-fetched from web");
      }

      sessionStorage.setItem(`research_${grantId}`, JSON.stringify(data));

      try {
        const existingRes = await fetch(`/api/grant-drafts?grantId=${grantId}`, {
          headers: tenantHeaders,
        });

        if (existingRes.ok) {
          const existing = await existingRes.json();
          await fetch("/api/grant-drafts", {
            method: "PUT",
            headers: { ...tenantHeaders, "Content-Type": "application/json" },
            body: JSON.stringify({
              id: existing.id,
              action: "updateResearch",
              researchData: data,
            }),
          });
          setCurrentDraftId(existing.id);
        } else if (existingRes.status === 404) {
          const createRes = await fetch("/api/grant-drafts", {
            method: "POST",
            headers: { ...tenantHeaders, "Content-Type": "application/json" },
            body: JSON.stringify({
              portProfileId: profile.name,
              grantId: grantId,
              grantProgram: grantTitle,
              status: "researching",
              researchData: data,
            }),
          });
          if (createRes.ok) {
            const created = await createRes.json();
            setCurrentDraftId(created.id);
          }
        }
      } catch (dbError) {
        console.error("Failed to save research to database:", dbError);
      }

      setPhase("review");
    } catch (error) {
      setResearchError(error instanceof Error ? error.message : "Research failed");
      setPhase("idle");
    } finally {
      setResearchProgress("");
    }
  }

  // ─── Phase 3: Generate Draft (with SSE streaming) ───

  async function handleGenerateDraft() {
    if (!researchData || !currentGrantId || !currentGrantTitle) return;

    setPhase("generating");
    setIsGenerating(true);
    setGeneratingProgress("Starting generation...");
    setStreamingSections([]);

    // Save user guidance to DB if we have a draft
    if (currentDraftId && hasNonEmptyGuidance(userGuidance)) {
      try {
        await fetch("/api/grant-drafts", {
          method: "PUT",
          headers: { ...tenantHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({
            id: currentDraftId,
            action: "updateUserGuidance",
            userGuidance,
          }),
        });
      } catch { /* continue anyway */ }
    }

    try {
      const gr = researchData.grantRequirements;
      const requestBody = {
        grantId: currentGrantId,
        grantTitle: currentGrantTitle,
        portName: researchData.entityProfile?.name || profile.name,
        entityProfile: researchData.entityProfile,
        grantRequirements: {
          programName: currentGrantTitle,
          agency: researchData.grantDetails?.agency || "",
          maxAward: gr?.maxAward || researchData.grantDetails?.awardCeiling || 0,
          costShareRequired: gr?.costShareRequired ?? false,
          costShareMinimum: gr?.costSharePercentage || 0,
          costSharePercentage: gr?.costSharePercentage || 0,
          submissionDeadline: gr?.submissionDeadline || researchData.grantDetails?.closeDate || "",
          sections: (gr?.applicationSections || []).map((s: GrantApplicationSection, i: number) => ({
            id: `section-${i}`,
            title: s.title,
            description: s.description,
            maxWords: s.maxWords || 5000,
            weight: s.weight || Math.round(100 / (gr?.applicationSections?.length || 1)),
            evaluationCriteria: s.evaluationCriteria || [],
            requiredElements: s.requiredElements || [],
          })),
          requiredAttachments: (researchData.forms || []).map((f: EnrichedForm) => ({
            id: f.id || f.number.toLowerCase().replace(/[^a-z0-9]/g, "-"),
            name: `${f.number}: ${f.name}`,
            description: f.notes || f.description || "",
            required: f.required !== false,
          })),
        },
        grantDetails: researchData.grantDetails || null,
        userGuidance: hasNonEmptyGuidance(userGuidance) ? userGuidance : undefined,
        webSources: [
          ...(researchData.webSources?.entitySources || []),
          ...(researchData.webSources?.grantSources || []),
        ],
      };

      // Try SSE streaming first
      const res = await fetch("/api/build-grant-application", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to generate draft");
      }

      let finalResponse: DraftResponse | null = null;

      if (res.headers.get("content-type")?.includes("text/event-stream") && res.body) {
        // Stream SSE events
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const event: DraftStreamEvent = JSON.parse(line.slice(6));

              switch (event.type) {
                case "section_start":
                  setGeneratingProgress(`Generating section ${event.index + 1}/${event.total}: ${event.title}...`);
                  break;
                case "section_complete":
                  setStreamingSections((prev) => [...prev, event.section]);
                  break;
                case "scoring_start":
                  setGeneratingProgress("Scoring sections with Claude...");
                  break;
                case "scoring_complete":
                  setStreamingSections(event.sections);
                  break;
                case "attachments":
                  // Attachments processed
                  break;
                case "complete":
                  finalResponse = event.response;
                  break;
                case "error":
                  throw new Error(event.message);
              }
            } catch (parseErr) {
              if (parseErr instanceof Error && parseErr.message !== "Unexpected end of JSON input") {
                throw parseErr;
              }
            }
          }
        }
      } else {
        // Fallback: non-streaming JSON response
        finalResponse = await res.json();
      }

      if (!finalResponse) {
        throw new Error("No response received from generation");
      }

      // Save to database
      let draftId = currentDraftId || `draft-${Date.now()}`;
      let savedToDb = false;

      if (currentDraftId) {
        const updateRes = await fetch("/api/grant-drafts", {
          method: "PUT",
          headers: { ...tenantHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({
            id: currentDraftId,
            action: "setSectionsFromAI",
            sections: finalResponse.sections,
          }),
        });

        if (updateRes.ok) {
          savedToDb = true;
          await fetch("/api/grant-drafts", {
            method: "PUT",
            headers: { ...tenantHeaders, "Content-Type": "application/json" },
            body: JSON.stringify({
              id: currentDraftId,
              action: "updateStatus",
              status: "drafting",
            }),
          });
          await fetch("/api/grant-drafts", {
            method: "PUT",
            headers: { ...tenantHeaders, "Content-Type": "application/json" },
            body: JSON.stringify({
              id: currentDraftId,
              action: "updateAttachments",
              attachmentsChecklist: finalResponse.attachmentsChecklist,
            }),
          });
        }
      } else {
        const createRes = await fetch("/api/grant-drafts", {
          method: "POST",
          headers: { ...tenantHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({
            portProfileId: profile.name,
            grantId: currentGrantId,
            grantProgram: currentGrantTitle,
            status: "drafting",
            researchData: researchData,
            sections: finalResponse.sections,
            overallCompleteness: finalResponse.overallCompleteness,
            attachmentsChecklist: finalResponse.attachmentsChecklist,
            userGuidance: hasNonEmptyGuidance(userGuidance) ? userGuidance : undefined,
          }),
        });

        if (createRes.ok) {
          const created = await createRes.json();
          draftId = created.id;
          savedToDb = true;
        }
      }

      if (!savedToDb) {
        alert("Warning: Draft generated but could not be saved to database. Changes may not persist across sessions.");
      }

      const newDraft: LocalDraft = {
        ...finalResponse,
        id: draftId,
        grantId: currentGrantId,
        grantTitle: currentGrantTitle,
        researchData,
        userGuidance: hasNonEmptyGuidance(userGuidance) ? userGuidance : undefined,
      };

      setDrafts((prev) => {
        const existingIndex = prev.findIndex((d) => d.id === draftId || d.grantId === currentGrantId);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = newDraft;
          return updated;
        }
        return [newDraft, ...prev];
      });
      setSelectedDraftId(newDraft.id);
      setExpandedSections(new Set(finalResponse.sections.map((s) => s.sectionId)));
      setStreamingSections([]);
      setPhase("draft");
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : "Failed to generate draft"}`);
      setPhase("review");
    } finally {
      setIsGenerating(false);
      setGeneratingProgress("");
    }
  }

  // ─── ACFR Upload (using mergeValue/mergeArray) ───

  async function handleAcfrUpload(file: File) {
    setAcfrLoading(true);
    setAcfrError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/extract-acfr", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to extract ACFR");
      }
      const data = await res.json();
      setAcfrFileName(file.name);

      if (researchData) {
        const acfr = data.profile as Partial<ResearchEntityProfile>;
        const ep = researchData.entityProfile;

        const merged: ResearchData = {
          ...researchData,
          entityProfile: {
            ...ep,
            name: mergeValue(acfr.name, ep.name),
            legalName: mergeValue(acfr.legalName, ep.legalName),
            entityType: mergeValue(acfr.entityType, ep.entityType),
            classification: mergeValue(acfr.classification, ep.classification),
            location: { ...ep.location, ...(acfr.location || {}) },
            financials: {
              annualRevenue: mergeValue(acfr.financials?.annualRevenue, ep.financials?.annualRevenue || 0),
              operatingBudget: mergeValue(acfr.financials?.operatingBudget, ep.financials?.operatingBudget || 0),
              capitalBudget: mergeValue(acfr.financials?.capitalBudget, ep.financials?.capitalBudget || 0),
              bondRating: mergeValue(acfr.financials?.bondRating, ep.financials?.bondRating || ""),
              totalAssets: mergeValue(acfr.financials?.totalAssets, ep.financials?.totalAssets || 0),
            },
            operations: {
              annualTonnage: mergeValue(acfr.operations?.annualTonnage, ep.operations?.annualTonnage || 0),
              annualTEUs: mergeValue(acfr.operations?.annualTEUs, ep.operations?.annualTEUs || 0),
              vesselCalls: mergeValue(acfr.operations?.vesselCalls, ep.operations?.vesselCalls || 0),
              employeeCount: mergeValue(acfr.operations?.employeeCount, ep.operations?.employeeCount || 0),
              directJobs: mergeValue(acfr.operations?.directJobs, ep.operations?.directJobs || 0),
              cargoTypes: mergeArray(acfr.operations?.cargoTypes, ep.operations?.cargoTypes || []),
            },
            infrastructure: {
              keyFacilities: mergeArray(acfr.infrastructure?.keyFacilities, ep.infrastructure?.keyFacilities || []),
              acreage: mergeValue(acfr.infrastructure?.acreage, ep.infrastructure?.acreage || 0),
            },
            economicImpact: {
              regionalEconomicImpact: mergeValue(acfr.economicImpact?.regionalEconomicImpact, ep.economicImpact?.regionalEconomicImpact || 0),
              totalJobs: mergeValue(acfr.economicImpact?.totalJobs, ep.economicImpact?.totalJobs || 0),
              tradeValue: mergeValue(acfr.economicImpact?.tradeValue, ep.economicImpact?.tradeValue || 0),
            },
            currentProjects: mergeArray(acfr.currentProjects, ep.currentProjects || []),
            pastGrantAwards: mergeArray(acfr.pastGrantAwards, ep.pastGrantAwards || []),
            certifications: mergeArray(acfr.certifications, ep.certifications || []),
            strategicPriorities: mergeArray(acfr.strategicPriorities, ep.strategicPriorities || []),
            environmentalGoals: mergeArray(acfr.environmentalGoals, ep.environmentalGoals || []),
          },
          researchSummary: {
            ...researchData.researchSummary,
            entityDataQuality: "high" as const,
            dataGaps: researchData.researchSummary.dataGaps.filter(
              (g) => !["annualRevenue", "operatingBudget", "capitalBudget", "totalAssets", "bondRating", "employeeCount"]
                .some((k) => g.toLowerCase().includes(k.toLowerCase()))
            ),
          },
        };
        setResearchData(merged);
        if (currentGrantId) {
          sessionStorage.setItem(`research_${currentGrantId}`, JSON.stringify(merged));
        }
      }

      sessionStorage.setItem("acfrProfile", JSON.stringify({ profile: data.profile, fileName: file.name }));
    } catch (error) {
      setAcfrError(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setAcfrLoading(false);
    }
  }

  // ─── NOFO Upload ───

  async function handleNofoUpload(file: File) {
    setNofoLoading(true);
    setNofoError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/extract-nofo-forms", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to extract NOFO");
      }
      const data = await res.json();
      setNofoFileName(file.name);
      setNofoUploaded(true);

      if (researchData) {
        const merged: ResearchData = {
          ...researchData,
          grantRequirements: {
            ...researchData.grantRequirements,
            applicationSections: data.sections,
            costShareRequired: data.requirements.costShareRequired,
            costSharePercentage: data.requirements.costSharePercentage,
            maxAward: data.requirements.maxAward,
            submissionDeadline: data.requirements.submissionDeadline,
            eligibleApplicants: data.requirements.eligibleApplicants,
            source: "nofo-extracted" as const,
          },
          forms: data.forms,
          researchSummary: {
            ...researchData.researchSummary,
            grantDataQuality: "high" as const,
          },
        };
        setResearchData(merged);
        if (currentGrantId) {
          sessionStorage.setItem(`research_${currentGrantId}`, JSON.stringify(merged));
        }
      }
    } catch (error) {
      setNofoError(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setNofoLoading(false);
    }
  }

  // ─── Clear NOFO (revert to AI-estimated requirements) ───

  function handleClearNofo() {
    setNofoFileName(null);
    setNofoUploaded(false);
    setNofoError(null);

    if (researchData) {
      const merged: ResearchData = {
        ...researchData,
        metadata: {
          ...researchData.metadata,
          nofoAutoFetched: false,
          nofoPdfUrl: null,
          nofoPdfPages: 0,
          nofoValidation: null,
        },
        grantRequirements: {
          ...researchData.grantRequirements,
          source: "ai-estimated" as const,
        },
        researchSummary: {
          ...researchData.researchSummary,
          grantDataQuality: "medium" as const,
        },
      };
      setResearchData(merged);
      if (currentGrantId) {
        sessionStorage.setItem(`research_${currentGrantId}`, JSON.stringify(merged));
      }
    }
  }

  // ─── Forms management ───

  function handleUpdateForms(updatedForms: EnrichedForm[]) {
    if (!researchData) return;
    const merged = { ...researchData, forms: updatedForms };
    setResearchData(merged);
    if (currentGrantId) {
      sessionStorage.setItem(`research_${currentGrantId}`, JSON.stringify(merged));
    }
  }

  // ─── Draft management ───

  async function handleDeleteDraft(draftId: string) {
    if (!confirm("Delete this draft?")) return;

    try {
      await fetch(`/api/grant-drafts?id=${draftId}`, {
        method: "DELETE",
        headers: tenantHeaders,
      });
    } catch (error) {
      console.error("Failed to delete draft from database:", error);
    }

    const newDrafts = drafts.filter((d) => d.id !== draftId);
    setDrafts(newDrafts);
    if (selectedDraftId === draftId) setSelectedDraftId(null);
  }

  async function handleSaveSectionEdit(sectionId: string) {
    const newContent = editingSections.get(sectionId);
    if (!selectedDraft || newContent === undefined) return;

    const updatedSections = selectedDraft.sections.map((s) => {
      if (s.sectionId !== sectionId) return s;
      const wordCount = newContent.split(/\s+/).filter(Boolean).length;
      const gapAnnotations = (newContent.match(/\[NEEDS:[^\]]+\]/g) || []).map((g) =>
        g.replace(/^\[NEEDS:\s*/, "").replace(/\]$/, "")
      );
      const gaps = gapAnnotations.length;
      const wordRatio = wordCount / s.maxWords;
      const confidence: "high" | "medium" | "low" =
        gaps === 0 && wordRatio >= 0.6 ? "high" : gaps <= 2 && wordRatio >= 0.5 ? "medium" : "low";
      return {
        ...s,
        content: newContent,
        wordCount,
        gapAnnotations,
        confidence,
        lastEditedAt: new Date().toISOString(),
        lastEditedBy: { userId: "current-user", userName: profile.name },
      };
    });

    const totalWeight = updatedSections.reduce((sum, s) => sum + s.weight, 0);
    const weighted = updatedSections.reduce((sum, s) => {
      const c = s.confidence === "high" ? 1.0 : s.confidence === "medium" ? 0.7 : 0.4;
      return sum + c * s.weight;
    }, 0);
    const overallCompleteness = Math.round((weighted / totalWeight) * 100);

    const updatedDraft: LocalDraft = {
      ...selectedDraft,
      sections: updatedSections,
      overallCompleteness,
      lastEditedAt: new Date().toISOString(),
      lastEditedBy: { userId: "current-user", userName: profile.name },
    };

    setDrafts((prev) => prev.map((d) => (d.id === updatedDraft.id ? updatedDraft : d)));
    setEditingSections((prev) => {
      const next = new Map(prev);
      next.delete(sectionId);
      return next;
    });

    // Sync to database
    setSaveStatus("saving");
    try {
      const section = updatedSections.find((s) => s.sectionId === sectionId);
      if (section) {
        await fetch("/api/grant-drafts", {
          method: "PUT",
          headers: { ...tenantHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({
            id: selectedDraft.id,
            action: "updateSection",
            sectionId: sectionId,
            updates: {
              content: section.content,
              confidence: section.confidence,
              confidenceReason: section.confidenceReason,
              wordCount: section.wordCount,
              gapAnnotations: section.gapAnnotations,
            },
          }),
        });
        setSaveStatus("saved");
      }
    } catch (error) {
      console.error("Failed to save section to database:", error);
      setSaveStatus("error");
    }
  }

  // ─── Section Regeneration ───

  async function handleRegenerateSection(sectionId: string, additionalInstructions?: string) {
    if (!selectedDraft || !selectedDraft.researchData) return;

    const rd = selectedDraft.researchData;
    const section = selectedDraft.sections.find((s) => s.sectionId === sectionId);
    if (!section) return;

    setRegeneratingSection(sectionId);
    try {
      const res = await fetch("/api/regenerate-section", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftId: selectedDraft.id,
          sectionId,
          entityProfile: rd.entityProfile,
          grantRequirements: rd.grantRequirements,
          grantDetails: rd.grantDetails,
          userGuidance: selectedDraft.userGuidance,
          otherSections: selectedDraft.sections.filter((s) => s.sectionId !== sectionId),
          portName: rd.entityProfile.name,
          additionalInstructions,
          webSources: [
            ...(rd.webSources?.entitySources || []),
            ...(rd.webSources?.grantSources || []),
          ],
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to regenerate section");
      }

      const { section: newSection } = await res.json();

      // Update local state
      const updatedSections = selectedDraft.sections.map((s) =>
        s.sectionId === sectionId ? { ...newSection, sectionId } : s
      );
      const totalWeight = updatedSections.reduce((sum, s) => sum + s.weight, 0);
      const weighted = updatedSections.reduce((sum, s) => {
        const c = s.confidence === "high" ? 1.0 : s.confidence === "medium" ? 0.7 : 0.4;
        return sum + c * s.weight;
      }, 0);
      const overallCompleteness = Math.round((weighted / totalWeight) * 100);

      const updatedDraft: LocalDraft = { ...selectedDraft, sections: updatedSections, overallCompleteness };
      setDrafts((prev) => prev.map((d) => (d.id === updatedDraft.id ? updatedDraft : d)));

      // Save to DB
      await fetch("/api/grant-drafts", {
        method: "PUT",
        headers: { ...tenantHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedDraft.id,
          action: "updateSection",
          sectionId,
          updates: newSection,
        }),
      });
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : "Regeneration failed"}`);
    } finally {
      setRegeneratingSection(null);
    }
  }

  // ─── Version History ───

  async function loadVersionHistory(draftId: string) {
    try {
      const res = await fetch(`/api/grant-drafts?id=${draftId}&versions=true`, {
        headers: tenantHeaders,
      });
      if (res.ok) {
        const data = await res.json();
        setVersionHistory(data.versions || []);
      }
    } catch (error) {
      console.error("Failed to load version history:", error);
    }
  }

  async function handleRestoreVersion(draftId: string, versionNumber: number) {
    if (!confirm(`Restore to version ${versionNumber}? Current sections will be saved as a new version first.`)) return;

    try {
      const res = await fetch(`/api/grant-drafts?id=${draftId}&versionNumber=${versionNumber}`, {
        headers: tenantHeaders,
      });
      if (!res.ok) throw new Error("Failed to fetch version");

      const version: DraftVersion = await res.json();

      // Update sections from version
      await fetch("/api/grant-drafts", {
        method: "PUT",
        headers: { ...tenantHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          id: draftId,
          action: "updateSections",
          sections: version.sections,
          editSummary: `Restored from version ${versionNumber}`,
        }),
      });

      // Refresh local state
      const updatedDraft = drafts.find((d) => d.id === draftId);
      if (updatedDraft) {
        const restored: LocalDraft = {
          ...updatedDraft,
          sections: version.sections,
          overallCompleteness: version.overallCompleteness,
        };
        setDrafts((prev) => prev.map((d) => (d.id === draftId ? restored : d)));
      }

      // Reload version history
      await loadVersionHistory(draftId);
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : "Failed to restore version"}`);
    }
  }

  // ─── PDF/DOCX Export ───

  async function handleExportFile(format: "pdf" | "docx") {
    if (!selectedDraft) return;

    try {
      const res = await fetch("/api/export-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format,
          grantProgram: selectedDraft.grantProgram,
          applicantName: selectedDraft.applicantName,
          sections: selectedDraft.sections,
          generatedAt: selectedDraft.generatedAt,
          overallCompleteness: selectedDraft.overallCompleteness,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Export failed");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeName = selectedDraft.grantProgram.replace(/[^a-z0-9]/gi, "-").toLowerCase();
      a.download = `${safeName}-draft.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      alert(`Export error: ${error instanceof Error ? error.message : "Failed to export"}`);
    }
  }

  const toggleSection = useCallback((id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ─── Phase Navigation (go back to earlier phases) ───

  function handleNavigateToPhase(targetPhase: "research" | "review" | "draft") {
    if (targetPhase === "research") {
      // Re-run research for current grant
      if (currentGrantId && currentGrantTitle) {
        handleStartResearch(currentGrantId, currentGrantTitle);
      } else if (selectedDraft) {
        handleStartResearch(selectedDraft.grantId, selectedDraft.grantTitle);
      }
      return;
    }

    if (targetPhase === "review") {
      // Go back to review phase — restore research data from draft or current state
      let rd = researchData;
      let gId = currentGrantId;
      let gTitle = currentGrantTitle;
      let dId = currentDraftId;
      let ug = userGuidance;

      if (phase === "draft" && selectedDraft) {
        rd = selectedDraft.researchData || researchData;
        gId = selectedDraft.grantId;
        gTitle = selectedDraft.grantTitle;
        dId = selectedDraft.id;
        ug = selectedDraft.userGuidance || userGuidance;
      }

      if (!rd) return;

      setResearchData(rd);
      setCurrentGrantId(gId);
      setCurrentGrantTitle(gTitle);
      setCurrentDraftId(dId);
      setUserGuidance(ug);

      if (rd.metadata?.nofoAutoFetched) setNofoUploaded(true);
      if (rd.metadata?.acfrAutoFetched && rd.metadata?.acfrPdfUrl) setAcfrFileName("Auto-fetched from web");

      setPhase("review");
      return;
    }

    if (targetPhase === "draft") {
      // Go forward to draft view — find draft with sections
      const draftToShow = selectedDraft
        || drafts.find(d => d.id === currentDraftId)
        || (currentGrantId ? drafts.find(d => d.grantId === currentGrantId) : null);

      if (draftToShow && draftToShow.sections.length > 0 && draftToShow.sections.some(s => s.content?.trim())) {
        setSelectedDraftId(draftToShow.id);
        setExpandedSections(new Set(draftToShow.sections.map((s) => s.sectionId)));
        setPhase("draft");
      }
    }
  }

  // ─── Legacy Export Functions (kept for HTML/TXT) ───

  function exportToHTML() {
    if (!selectedDraft) return;
    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${selectedDraft.grantTitle}: Draft Application</title>
<style>
  body { font-family: Georgia, 'Times New Roman', serif; max-width: 800px; margin: 40px auto; padding: 0 20px; line-height: 1.7; color: #1a1a1a; }
  h1 { font-size: 24px; border-bottom: 2px solid #1a1a1a; padding-bottom: 10px; }
  h2 { font-size: 18px; margin-top: 36px; color: #2c5282; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
  .meta { color: #666; font-size: 14px; margin-bottom: 30px; }
  .section { margin-bottom: 30px; }
  .confidence { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-family: sans-serif; }
  .conf-high { background: #c6f6d5; color: #276749; }
  .conf-medium { background: #fefcbf; color: #975a16; }
  .conf-low { background: #fed7d7; color: #9b2c2c; }
  .gap { background: #fef3c7; padding: 2px 6px; border-radius: 3px; font-weight: 600; color: #92400e; }
  .citation { background: #dbeafe; padding: 1px 5px; border-radius: 3px; font-size: 11px; font-weight: 500; color: #1e40af; font-family: sans-serif; }
  .tbp { background: #fee2e2; padding: 2px 6px; border-radius: 3px; font-weight: 600; color: #991b1b; }
  .words { font-size: 12px; color: #999; font-family: sans-serif; }
  p { margin: 10px 0; }
  @media print { body { margin: 0; font-size: 11pt; } }
</style>
</head>
<body>
<h1>${selectedDraft.grantProgram}</h1>
<div class="meta">
  <p>Applicant: ${selectedDraft.applicantName}</p>
  <p>Generated: ${new Date(selectedDraft.generatedAt).toLocaleDateString()}</p>
  <p>Completeness: ${selectedDraft.overallCompleteness}%</p>
</div>
${selectedDraft.sections
  .map(
    (s) => `<div class="section">
<h2>${s.title} <span class="confidence conf-${s.confidence}">${s.confidence}</span> <span class="words">${s.wordCount}/${s.maxWords} words (${s.weight}%)</span></h2>
${s.content
  .split("\n\n")
  .map((p) => `<p>${p.replace(/\[NEEDS:[^\]]+\]/g, (m) => `<span class="gap">${m}</span>`).replace(/\[Source:[^\]]+\]/g, (m) => `<span class="citation">${m}</span>`).replace(/\[To be provided by applicant\]/g, (m) => `<span class="tbp">${m}</span>`)}</p>`)
  .join("\n")}
</div>`
  )
  .join("\n")}
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedDraft.grantTitle.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-draft.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function exportToText() {
    if (!selectedDraft) return;
    const text = [
      `${selectedDraft.grantProgram}`,
      `Applicant: ${selectedDraft.applicantName}`,
      `Generated: ${new Date(selectedDraft.generatedAt).toLocaleDateString()}`,
      `Completeness: ${selectedDraft.overallCompleteness}%`,
      "",
      "\u2550".repeat(72),
      "",
      ...selectedDraft.sections.flatMap((s) => [
        `${s.title}`,
        `Confidence: ${s.confidence} | Words: ${s.wordCount}/${s.maxWords} | Weight: ${s.weight}%`,
        "\u2500".repeat(72),
        s.content,
        "",
        ...(s.gapAnnotations.length > 0
          ? [`Data Gaps:`, ...s.gapAnnotations.map((g) => `  \u2022 ${g}`), ""]
          : []),
        "\u2550".repeat(72),
        "",
      ]),
    ].join("\n");

    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedDraft.grantTitle.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-draft.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleCopy() {
    if (!selectedDraft) return;
    const text = selectedDraft.sections.map((s) => `${s.title}\n\n${s.content}`).join("\n\n---\n\n");
    navigator.clipboard.writeText(text);
  }

  // ─── Render: Phase Router ───

  return (
    <div className="flex-1 flex">
      {/* Sidebar */}
      <div className="w-80 border-r flex flex-col bg-background">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-lg">Grant Drafts</h2>
              <p className="text-sm text-muted-foreground mt-1">AI-powered application drafting</p>
            </div>
            <Button
              size="sm"
              className="gap-1.5 shrink-0"
              onClick={() => setShowGrantPicker(true)}
            >
              <Plus className="h-3.5 w-3.5" /> New
            </Button>
          </div>
        </div>

        {/* Pipeline Status */}
        <div className="p-4 border-b">
          <div className="space-y-2">
            {[
              { key: "research" as const, label: "Research", icon: Search, phases: ["researching", "review", "generating", "draft"] },
              { key: "review" as const, label: "Review & Forms", icon: FileCheck, phases: ["review", "generating", "draft"] },
              { key: "draft" as const, label: "Generate Draft", icon: FileText, phases: ["generating", "draft"] },
            ].map((step, i) => {
              // A draft with real content exists (for forward-navigation to draft phase)
              const draftCandidate = selectedDraft
                || drafts.find(d => d.id === currentDraftId)
                || (currentGrantId ? drafts.find(d => d.grantId === currentGrantId) : undefined);
              const hasDraftWithSections = draftCandidate
                ? draftCandidate.sections.length > 0 && draftCandidate.sections.some(s => s.content?.trim())
                : false;
              // Research is done if we have research data (even when navigating away from review/draft)
              const researchDone = !!researchData || ["review", "generating", "draft"].includes(phase);
              const isDone = step.key === "research" && researchDone;
              const isDone2 = step.key === "review" && (["generating", "draft"].includes(phase) || (researchDone && phase !== "researching" && phase !== "review"));
              const isDone3 = step.key === "draft" && (phase === "draft" || hasDraftWithSections);
              const stepDone = isDone || isDone2 || isDone3;
              const isActive = (step.key === "research" && phase === "researching") ||
                               (step.key === "review" && phase === "review") ||
                               (step.key === "draft" && phase === "generating");
              const isProcessing = phase === "researching" || phase === "generating";
              // Clickable if step is done and not already the active/current phase
              const canClick = stepDone && !isActive && !isProcessing && !(step.key === "draft" && phase === "draft");

              return (
                <button
                  key={step.key}
                  className={`flex items-center gap-3 w-full text-left rounded-md px-2 py-1 -mx-2 transition-colors ${
                    canClick ? "hover:bg-muted/60 cursor-pointer" : isProcessing ? "cursor-wait" : "cursor-default"
                  }`}
                  disabled={!canClick}
                  onClick={() => canClick && handleNavigateToPhase(step.key)}
                  title={canClick ? `Go to ${step.label}` : undefined}
                >
                  <div className={`flex items-center justify-center w-7 h-7 rounded-full border-2 shrink-0 ${
                    stepDone
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : isActive
                      ? "border-[#3d8b8b] text-[#3d8b8b] bg-[#3d8b8b]/10"
                      : "border-muted-foreground/30 text-muted-foreground/30"
                  }`}>
                    {stepDone ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : isActive ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <span className="text-xs font-bold">{i + 1}</span>
                    )}
                  </div>
                  <span className={`text-sm ${
                    stepDone
                      ? "text-emerald-600 font-medium"
                      : isActive
                      ? "text-foreground font-medium"
                      : "text-muted-foreground"
                  }`}>
                    {step.label}
                  </span>
                  {canClick && (
                    <RotateCw className="h-3 w-3 ml-auto text-muted-foreground/50" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Draft list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {!draftsLoaded && drafts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading drafts...</p>
            </div>
          )}
          {draftsLoaded && drafts.length === 0 && phase === "idle" && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No drafts yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Click <strong>New</strong> to pick a grant from your pipeline
              </p>
            </div>
          )}
          {drafts.map((draft) => {
            const isResearching = draft.status === "researching" ||
              (draft.sections.length === 0 || !draft.sections.some(s => s.content?.trim()));
            return (
              <Card
                key={draft.id}
                className={`p-3 cursor-pointer transition-colors ${
                  selectedDraftId === draft.id || currentDraftId === draft.id ? "border-primary bg-muted/50" : "hover:bg-muted/30"
                }`}
                onClick={() => {
                  if (isResearching && draft.researchData) {
                    setResearchData(draft.researchData);
                    setCurrentGrantId(draft.grantId);
                    setCurrentGrantTitle(draft.grantTitle);
                    setCurrentDraftId(draft.id);
                    setSelectedDraftId(null);
                    if (draft.userGuidance) setUserGuidance(draft.userGuidance);
                    setPhase("review");
                  } else if (draft.sections.length > 0 && draft.sections.some(s => s.content?.trim())) {
                    setSelectedDraftId(draft.id);
                    setCurrentDraftId(null);
                    setExpandedSections(new Set(draft.sections.map((s) => s.sectionId)));
                    setPhase("draft");
                  }
                }}
              >
                <div className="font-medium text-sm line-clamp-2">{draft.grantTitle}</div>
                <div className="flex items-center gap-2 mt-2">
                  {isResearching ? (
                    <>
                      <Search className="h-4 w-4 text-amber-500" />
                      <span className="text-xs text-amber-600">Ready for review</span>
                    </>
                  ) : (
                    <>
                      <CompletenessRing value={draft.overallCompleteness} size={24} />
                      <span className="text-xs text-muted-foreground">{draft.overallCompleteness}% complete</span>
                    </>
                  )}
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  {draft.generatedAt ? new Date(draft.generatedAt).toLocaleString() : "Not yet generated"}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Main Content - Phase Router */}
      <div className="flex-1 flex flex-col bg-background overflow-hidden">
        {phase === "idle" && (
          <IdleView onNewDraft={() => setShowGrantPicker(true)} />
        )}
        {phase === "researching" && (
          <ResearchingView progress={researchProgress} grantTitle={currentGrantTitle || ""} />
        )}
        {phase === "review" && researchData && (
          <ReviewView
            research={researchData}
            grantTitle={currentGrantTitle || ""}
            userGuidance={userGuidance}
            onUserGuidanceChange={setUserGuidance}
            onGenerateDraft={handleGenerateDraft}
            onRerunResearch={() => currentGrantId && currentGrantTitle && handleStartResearch(currentGrantId, currentGrantTitle)}
            onAcfrUpload={handleAcfrUpload}
            acfrLoading={acfrLoading}
            acfrFileName={acfrFileName}
            acfrError={acfrError}
            onNofoUpload={handleNofoUpload}
            onNofoClear={handleClearNofo}
            nofoLoading={nofoLoading}
            nofoFileName={nofoFileName}
            nofoError={nofoError}
            nofoUploaded={nofoUploaded}
            onUpdateForms={handleUpdateForms}
          />
        )}
        {phase === "generating" && (
          <GeneratingView progress={generatingProgress} streamingSections={streamingSections} />
        )}
        {phase === "draft" && selectedDraft && (
          <DraftView
            draft={selectedDraft}
            expandedSections={expandedSections}
            editingSections={editingSections}
            showAttachments={showAttachments}
            activeView={activeView}
            saveStatus={saveStatus}
            regeneratingSection={regeneratingSection}
            versionHistory={versionHistory}
            showVersionHistory={showVersionHistory}
            onToggleSection={toggleSection}
            onSetEditingSections={setEditingSections}
            onSaveSectionEdit={handleSaveSectionEdit}
            onSetShowAttachments={setShowAttachments}
            onSetActiveView={setActiveView}
            onDeleteDraft={handleDeleteDraft}
            onCopy={handleCopy}
            onExportHTML={exportToHTML}
            onExportText={exportToText}
            onExportPdf={() => handleExportFile("pdf")}
            onExportDocx={() => handleExportFile("docx")}
            onRegenerateSection={handleRegenerateSection}
            onToggleVersionHistory={() => {
              if (!showVersionHistory) loadVersionHistory(selectedDraft.id);
              setShowVersionHistory(!showVersionHistory);
            }}
            onRestoreVersion={(vn) => handleRestoreVersion(selectedDraft.id, vn)}
            onBackToReview={() => handleNavigateToPhase("review")}
          />
        )}
        {phase === "draft" && !selectedDraft && (
          <IdleView onNewDraft={() => setShowGrantPicker(true)} />
        )}
      </div>

      {/* Grant Picker Modal */}
      {showGrantPicker && (
        <GrantPickerModal
          tenantHeaders={tenantHeaders}
          existingGrantIds={new Set(drafts.map(d => d.grantId))}
          onSelect={(grantId, grantTitle) => {
            setShowGrantPicker(false);
            handleStartResearch(grantId, grantTitle);
          }}
          onClose={() => setShowGrantPicker(false)}
        />
      )}
    </div>
  );
}

// ─── Helper: check if guidance has any non-empty fields ───

function hasNonEmptyGuidance(g: UserGuidance): boolean {
  return !!(
    g.coreFundingNeed.trim() ||
    g.internalJustification.trim() ||
    g.impactJustification.trim() ||
    g.budgetPriorities.trim() ||
    g.strategicEmphasis.trim() ||
    g.additionalNotes.trim()
  );
}

// ─── Phase Views ───

function IdleView({ onNewDraft }: { onNewDraft: () => void }) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center max-w-md">
        <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Grant Application Drafting</h3>
        <p className="text-sm text-muted-foreground mb-2">
          Select a grant from your pipeline to start the automated research and drafting process.
        </p>
        <Button className="mt-4 gap-2" onClick={onNewDraft}>
          <Plus className="h-4 w-4" /> New Draft
        </Button>
        <div className="flex items-center justify-center gap-6 mt-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5"><Search className="h-3.5 w-3.5" /> Auto-research</div>
          <ArrowRight className="h-3 w-3" />
          <div className="flex items-center gap-1.5"><FileCheck className="h-3.5 w-3.5" /> Review</div>
          <ArrowRight className="h-3 w-3" />
          <div className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> Draft</div>
        </div>
      </div>
    </div>
  );
}

function GrantPickerModal({
  tenantHeaders,
  existingGrantIds,
  onSelect,
  onClose,
}: {
  tenantHeaders: Record<string, string>;
  existingGrantIds: Set<string>;
  onSelect: (grantId: string, grantTitle: string) => void;
  onClose: () => void;
}) {
  const [grants, setGrants] = useState<Array<{ id: string; title: string; agency: string; closeDate: string; awardCeiling: number; stage: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    async function loadPipeline() {
      try {
        const res = await fetch("/api/pipeline", { headers: tenantHeaders });
        if (!res.ok) throw new Error("Failed to fetch pipeline");
        const data = await res.json();
        setGrants(
          (data.grants || []).map((g: { id: string; title: string; agency: string; closeDate: string; awardCeiling: number; stage: string }) => ({
            id: g.id,
            title: g.title,
            agency: g.agency,
            closeDate: g.closeDate,
            awardCeiling: g.awardCeiling,
            stage: g.stage,
          }))
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load grants");
      } finally {
        setLoading(false);
      }
    }
    loadPipeline();
  }, [tenantHeaders]);

  const filtered = grants.filter(
    (g) =>
      g.title.toLowerCase().includes(filter.toLowerCase()) ||
      g.agency.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-background border rounded-lg shadow-xl w-full max-w-2xl max-h-[70vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="font-semibold text-lg">Select Grant from Pipeline</h3>
            <p className="text-sm text-muted-foreground">Choose a grant to start drafting an application</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4 border-b">
          <input
            type="text"
            placeholder="Search grants..."
            className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {error && (
            <div className="text-center py-12 text-sm text-red-500">{error}</div>
          )}
          {!loading && !error && filtered.length === 0 && (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground">
                {grants.length === 0
                  ? "No grants in your pipeline. Add grants from the Discover tab first."
                  : "No grants match your search."}
              </p>
            </div>
          )}
          {filtered.map((g) => {
            const hasDraft = existingGrantIds.has(g.id);
            return (
              <button
                key={g.id}
                className="w-full text-left p-3 rounded-md hover:bg-muted/50 transition-colors flex items-start gap-3"
                onClick={() => onSelect(g.id, g.title)}
              >
                <FileText className="h-5 w-5 text-[#3d8b8b] shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm line-clamp-2">{g.title}</div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>{g.agency}</span>
                    {g.awardCeiling > 0 && (
                      <span>Up to ${(g.awardCeiling / 1_000_000).toFixed(1)}M</span>
                    )}
                    {g.closeDate && (
                      <span>Due {g.closeDate}</span>
                    )}
                  </div>
                </div>
                {hasDraft && (
                  <Badge variant="outline" className="text-[10px] shrink-0">Has Draft</Badge>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ResearchingView({ progress, grantTitle }: { progress: string; grantTitle: string }) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center max-w-lg">
        <div className="relative mx-auto mb-6 w-20 h-20">
          <Loader2 className="h-20 w-20 animate-spin text-[#3d8b8b]" />
          <Search className="h-8 w-8 absolute top-6 left-6 text-[#3d8b8b]" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Researching Grant</h3>
        <p className="text-sm text-muted-foreground font-medium mb-1 line-clamp-2">{grantTitle}</p>
        <p className="text-sm text-muted-foreground">{progress}</p>
        <div className="mt-6 space-y-2 text-xs text-muted-foreground max-w-sm mx-auto">
          <div className="flex items-center gap-2"><Globe className="h-3.5 w-3.5 shrink-0" /> Fetching grant details from Grants.gov</div>
          <div className="flex items-center gap-2"><Search className="h-3.5 w-3.5 shrink-0" /> Searching web for entity data &amp; grant info</div>
          <div className="flex items-center gap-2"><FileDown className="h-3.5 w-3.5 shrink-0" /> Auto-fetching NOFO &amp; ACFR PDFs from web</div>
          <div className="flex items-center gap-2"><Database className="h-3.5 w-3.5 shrink-0" /> Matching required forms from registry</div>
          <div className="flex items-center gap-2"><Zap className="h-3.5 w-3.5 shrink-0" /> Extracting requirements &amp; entity profile with AI</div>
        </div>
      </div>
    </div>
  );
}

// ─── User Guidance Form ───

function UserGuidanceForm({
  guidance,
  onChange,
}: {
  guidance: UserGuidance;
  onChange: (g: UserGuidance) => void;
}) {
  const fields: { key: keyof UserGuidance; label: string; placeholder: string }[] = [
    { key: "coreFundingNeed", label: "Core Funding Need", placeholder: "What specific need does this grant address? e.g., Channel deepening to accommodate larger vessels..." },
    { key: "internalJustification", label: "Internal Justification", placeholder: "Why is this project important internally? Board priorities, strategic plan alignment..." },
    { key: "impactJustification", label: "Investment / Impact Justification", placeholder: "What impact will this investment create? Jobs, economic output, safety improvements..." },
    { key: "budgetPriorities", label: "Budget Priorities", placeholder: "Key budget items or cost allocations to emphasize..." },
    { key: "strategicEmphasis", label: "Strategic Emphasis", placeholder: "Key themes to weave through the narrative: equity, climate resilience, supply chain..." },
    { key: "additionalNotes", label: "Additional Notes", placeholder: "Any other points, talking points, or instructions for the AI..." },
  ];

  return (
    <div className="space-y-3">
      {fields.map(({ key, label, placeholder }) => (
        <div key={key}>
          <label className="text-xs font-medium text-muted-foreground block mb-1">{label}</label>
          <textarea
            className="w-full text-sm border rounded-md px-3 py-2 bg-background resize-y focus:outline-none focus:ring-2 focus:ring-ring min-h-[60px]"
            placeholder={placeholder}
            value={guidance[key]}
            onChange={(e) => onChange({ ...guidance, [key]: e.target.value })}
            rows={2}
          />
        </div>
      ))}
    </div>
  );
}

// ─── Review View ───

function ReviewView({
  research,
  grantTitle,
  userGuidance,
  onUserGuidanceChange,
  onGenerateDraft,
  onRerunResearch,
  onAcfrUpload,
  acfrLoading,
  acfrFileName,
  acfrError,
  onNofoUpload,
  onNofoClear,
  nofoLoading,
  nofoFileName,
  nofoError,
  nofoUploaded,
  onUpdateForms,
}: {
  research: ResearchData;
  grantTitle: string;
  userGuidance: UserGuidance;
  onUserGuidanceChange: (g: UserGuidance) => void;
  onGenerateDraft: () => void;
  onRerunResearch: () => void;
  onAcfrUpload: (file: File) => void;
  acfrLoading: boolean;
  acfrFileName: string | null;
  acfrError: string | null;
  onNofoUpload: (file: File) => void;
  onNofoClear: () => void;
  nofoLoading: boolean;
  nofoFileName: string | null;
  nofoError: string | null;
  nofoUploaded: boolean;
  onUpdateForms: (forms: EnrichedForm[]) => void;
}) {
  const [expandedPanel, setExpandedPanel] = useState<string | null>("summary");
  const ep = research.entityProfile;
  const gr = research.grantRequirements;
  const summary = research.researchSummary;
  const hasRealRequirements = true; // Always allow generation

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <span className="text-sm font-medium text-emerald-600">Research Complete</span>
            </div>
            <h1 className="text-xl font-bold line-clamp-2">{grantTitle}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Review the gathered data below, then generate your draft application.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={onRerunResearch}>
              <RefreshCw className="h-3.5 w-3.5" /> Re-research
            </Button>
            <Button
              size="sm"
              className={`gap-1.5 text-white ${hasRealRequirements ? "bg-[#3d8b8b] hover:bg-[#2d7a7a]" : "bg-muted-foreground/50 cursor-not-allowed"}`}
              onClick={onGenerateDraft}
              disabled={!hasRealRequirements}
            >
              <Zap className="h-3.5 w-3.5" /> Generate Draft Application
            </Button>
          </div>
        </div>

        {/* Data quality badges */}
        <div className="flex items-center gap-3 mt-4">
          <Badge variant="outline" className={`text-xs ${qualityColors[summary.entityDataQuality]}`}>
            Entity Data: {summary.entityDataQuality}
          </Badge>
          <Badge variant="outline" className={`text-xs ${qualityColors[summary.grantDataQuality]}`}>
            Grant Data: {summary.grantDataQuality}
          </Badge>
          {research.metadata.grantsGovAvailable && (
            <Badge variant="outline" className="text-xs text-blue-600 bg-blue-500/10 border-blue-500/20">
              <Globe className="h-3 w-3 mr-1" /> Grants.gov
            </Badge>
          )}
          {research.metadata.claudeWebSearchUsed && (
            <Badge variant="outline" className="text-xs text-purple-600 bg-purple-500/10 border-purple-500/20">
              <Search className="h-3 w-3 mr-1" /> Web Research ({research.metadata.webResultsFound} sources)
            </Badge>
          )}
        </div>
      </div>

      {/* Scrollable panels */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 max-w-5xl mx-auto w-full">
        {/* Key Findings */}
        <Card className="overflow-hidden">
          <button
            className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors text-left"
            onClick={() => setExpandedPanel(expandedPanel === "summary" ? null : "summary")}
          >
            {expandedPanel === "summary" ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
            <Zap className="h-4 w-4 text-[#3d8b8b] shrink-0" />
            <span className="font-semibold text-sm flex-1">Key Findings &amp; Data Gaps</span>
            {summary.dataGaps.length > 0 && (
              <Badge variant="outline" className="text-[10px] text-amber-600 bg-amber-500/10 border-amber-500/20">
                {summary.dataGaps.length} gaps
              </Badge>
            )}
          </button>
          {expandedPanel === "summary" && (
            <div className="border-t px-4 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3">
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Key Findings</h4>
                  <ul className="space-y-1.5">
                    {summary.keyFindings.map((f, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Data Gaps (may need manual input)</h4>
                  {summary.dataGaps.length > 0 ? (
                    <ul className="space-y-1.5">
                      {summary.dataGaps.map((g, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                          {g}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No gaps identified</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Entity Profile */}
        <Card className="overflow-hidden">
          <button
            className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors text-left"
            onClick={() => setExpandedPanel(expandedPanel === "entity" ? null : "entity")}
          >
            {expandedPanel === "entity" ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
            <Building2 className="h-4 w-4 text-[#3d8b8b] shrink-0" />
            <span className="font-semibold text-sm flex-1">Entity Profile: {ep.name}</span>
            <Badge variant="outline" className={`text-[10px] ${qualityColors[summary.entityDataQuality]}`}>
              {summary.entityDataQuality} quality
            </Badge>
          </button>
          {expandedPanel === "entity" && (
            <div className="border-t px-4 pb-4 pt-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {[
                  { label: "Revenue", value: formatDollars(ep.financials?.annualRevenue || 0) },
                  { label: "Operating Budget", value: formatDollars(ep.financials?.operatingBudget || 0) },
                  { label: "Capital Budget", value: formatDollars(ep.financials?.capitalBudget || 0) },
                  { label: "Total Assets", value: formatDollars(ep.financials?.totalAssets || 0) },
                  { label: "Employees", value: ep.operations?.employeeCount?.toLocaleString() || "-" },
                  { label: "Annual Tonnage", value: ep.operations?.annualTonnage ? `${(ep.operations.annualTonnage / 1_000_000).toFixed(1)}M tons` : "-" },
                  { label: "TEUs", value: ep.operations?.annualTEUs?.toLocaleString() || "-" },
                  { label: "Bond Rating", value: ep.financials?.bondRating || "-" },
                ].map((item) => (
                  <div key={item.label} className="bg-muted/30 rounded p-2.5">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.label}</div>
                    <div className="text-sm font-semibold mt-0.5">{item.value}</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Location</h4>
                  <p>{ep.location?.city}, {ep.location?.state} ({ep.location?.congressionalDistrict || "-"})</p>
                  <p className="text-muted-foreground text-xs">{ep.entityType}, {ep.classification}</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Key Facilities</h4>
                  <ul className="text-xs space-y-0.5">
                    {(ep.infrastructure?.keyFacilities || []).slice(0, 4).map((f, i) => (
                      <li key={i} className="truncate">&bull; {f}</li>
                    ))}
                  </ul>
                </div>
              </div>
              {(ep.currentProjects || []).length > 0 && (
                <div className="mt-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Current Projects</h4>
                  <div className="space-y-1">
                    {ep.currentProjects.map((p, i) => (
                      <div key={i} className="text-xs flex items-center gap-2">
                        <span className="font-medium">{p.name}</span>
                        <span className="text-muted-foreground">{formatDollars(p.totalCost)}</span>
                        <Badge variant="outline" className="text-[9px]">{p.status}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* ACFR Upload */}
        <Card className="overflow-hidden border-dashed">
          <div className="p-4">
            <div className="flex items-center gap-3">
              <Upload className="h-4 w-4 text-[#3d8b8b] shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-sm">{acfrFileName ? "ACFR Data" : "Upload ACFR"}</span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {acfrFileName
                    ? "Entity profile enriched with real financial data from ACFR"
                    : "Upload an Annual Comprehensive Financial Report to enrich entity data with real financials"}
                </p>
              </div>
              {acfrFileName ? (
                <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-500/10 border-emerald-500/20 shrink-0">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> {acfrFileName}
                </Badge>
              ) : (
                <label className={`shrink-0 ${acfrLoading ? "pointer-events-none" : ""}`}>
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs" asChild disabled={acfrLoading}>
                    <span>
                      {acfrLoading ? (
                        <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Extracting...</>
                      ) : (
                        <><Upload className="h-3.5 w-3.5" /> Upload PDF</>
                      )}
                    </span>
                  </Button>
                  <input
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) onAcfrUpload(f);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>
            {acfrError && (
              <div className="mt-2 text-xs text-destructive bg-destructive/10 rounded p-2">
                {acfrError}
              </div>
            )}
          </div>
        </Card>

        {/* NOFO Document */}
        <Card className={`overflow-hidden ${gr?.source !== "nofo-extracted" ? "border-dashed border-amber-500/50 bg-amber-500/5" : ""}`}>
          <div className="p-4">
            <div className="flex items-center gap-3">
              <ScrollText className="h-4 w-4 text-[#3d8b8b] shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-sm">NOFO Document</span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {nofoFileName
                    ? "Uploaded NOFO — sections, forms, and scoring criteria extracted"
                    : research.metadata?.nofoAutoFetched
                    ? "Auto-fetched from web — sections, forms, and scoring criteria extracted"
                    : research.metadata?.nofoValidation && !research.metadata.nofoValidation.isMatch
                    ? `Auto-fetched NOFO did not match (found: ${research.metadata.nofoValidation.detectedProgram}). Upload the correct NOFO`
                    : "Upload the NOFO PDF to extract exact requirements (otherwise AI-estimated)"
                  }
                </p>
              </div>
            </div>

            {/* Status + actions row */}
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              {/* Current status badge */}
              {nofoFileName ? (
                <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-500/10 border-emerald-500/20">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> {nofoFileName}
                </Badge>
              ) : research.metadata?.nofoAutoFetched ? (
                <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-500/10 border-emerald-500/20">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Auto-fetched ({research.metadata.nofoPdfPages} pages)
                </Badge>
              ) : gr?.source === "nofo-extracted" ? (
                <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-500/10 border-emerald-500/20">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> NOFO extracted
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] text-amber-600 bg-amber-500/10 border-amber-500/20">
                  <AlertTriangle className="h-3 w-3 mr-1" /> AI-estimated
                </Badge>
              )}

              {/* View PDF link (when auto-fetched) */}
              {research.metadata?.nofoAutoFetched && research.metadata?.nofoPdfUrl && !nofoFileName && (
                <a
                  href={research.metadata.nofoPdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-[#3d8b8b] hover:underline"
                >
                  <ExternalLink className="h-3 w-3" /> View PDF
                </a>
              )}

              {/* Remove / Replace button (when NOFO is active) */}
              {(nofoFileName || research.metadata?.nofoAutoFetched || gr?.source === "nofo-extracted") && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-[11px] text-muted-foreground hover:text-destructive"
                  onClick={onNofoClear}
                >
                  <X className="h-3 w-3 mr-1" /> Remove
                </Button>
              )}

              {/* Upload / Replace button */}
              <label className={`shrink-0 ${nofoLoading ? "pointer-events-none" : ""}`}>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs h-6" asChild disabled={nofoLoading}>
                  <span>
                    {nofoLoading ? (
                      <><Loader2 className="h-3 w-3 animate-spin" /> Extracting...</>
                    ) : nofoFileName || research.metadata?.nofoAutoFetched || gr?.source === "nofo-extracted" ? (
                      <><Upload className="h-3 w-3" /> Replace</>
                    ) : (
                      <><Upload className="h-3 w-3" /> Upload NOFO</>
                    )}
                  </span>
                </Button>
                <input
                  type="file"
                  accept=".pdf,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onNofoUpload(f);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>

            {/* Validation warning */}
            {research.metadata?.nofoValidation && !research.metadata.nofoValidation.isMatch && !nofoFileName && !research.metadata.nofoAutoFetched && (
              <div className="mt-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-500/10 rounded p-2 flex items-start gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                The auto-fetched NOFO was for &ldquo;{research.metadata.nofoValidation.detectedProgram}&rdquo; ({research.metadata.nofoValidation.detectedFiscalYear}) and was discarded. Upload the correct NOFO.
              </div>
            )}

            {/* AI-estimated hint */}
            {gr?.source !== "nofo-extracted" && !nofoLoading && !research.metadata?.nofoAutoFetched && !nofoFileName && (
              <div className="mt-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-500/10 rounded p-2 flex items-start gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                Uploading the NOFO improves accuracy of application sections, scoring criteria, and form requirements.
              </div>
            )}

            {nofoError && (
              <div className="mt-2 text-xs text-destructive bg-destructive/10 rounded p-2">
                {nofoError}
              </div>
            )}
          </div>
        </Card>

        {/* Optional Supporting Document */}
        <Card className="overflow-hidden">
          <button
            className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors text-left"
            onClick={() => setExpandedPanel(expandedPanel === "extra" ? null : "extra")}
          >
            {expandedPanel === "extra" ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
            <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="font-semibold text-sm flex-1">Additional Supporting Document</span>
            <Badge variant="outline" className="text-[10px] text-muted-foreground">Optional</Badge>
          </button>
          {expandedPanel === "extra" && (
            <div className="border-t px-4 pb-4 pt-3">
              <p className="text-xs text-muted-foreground mb-3">
                Upload any additional document (e.g., strategic plan, needs assessment, letters of support) to provide extra context for the draft.
              </p>
              <ExtraFileUpload />
            </div>
          )}
        </Card>

        {/* Grant Requirements */}
        <Card className="overflow-hidden">
          <button
            className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors text-left"
            onClick={() => setExpandedPanel(expandedPanel === "grant" ? null : "grant")}
          >
            {expandedPanel === "grant" ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
            <ScrollText className="h-4 w-4 text-[#3d8b8b] shrink-0" />
            <span className="font-semibold text-sm flex-1">Grant Requirements</span>
            {gr?.source === "nofo-extracted" ? (
              <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-500/10 border-emerald-500/20">
                NOFO-extracted: {gr?.applicationSections?.length || 0} sections
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] text-amber-600 bg-amber-500/10 border-amber-500/20">
                AI-estimated: {gr?.applicationSections?.length || 0} sections
              </Badge>
            )}
          </button>
          {expandedPanel === "grant" && (
            <div className="border-t px-4 pb-4 pt-3">
              {research.grantDetails && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  {[
                    { label: "Max Award", value: formatDollars(research.grantDetails.awardCeiling || gr?.maxAward || 0) },
                    { label: "Total Funding", value: formatDollars(research.grantDetails.totalFunding || 0) },
                    { label: "Cost Share", value: gr?.costShareRequired ? `${gr.costSharePercentage}%` : "None" },
                    { label: "Deadline", value: research.grantDetails.closeDate || gr?.submissionDeadline || "-" },
                  ].map((item) => (
                    <div key={item.label} className="bg-muted/30 rounded p-2.5">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.label}</div>
                      <div className="text-sm font-semibold mt-0.5">{item.value}</div>
                    </div>
                  ))}
                </div>
              )}
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Application Sections</h4>
              <div className="space-y-2">
                {(gr?.applicationSections || []).map((s, i) => (
                  <div key={i} className="border rounded p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{s.title}</span>
                      <div className="flex items-center gap-2">
                        {s.weight > 0 && (
                          <Badge variant="outline" className="text-[10px]">{s.weight}% weight</Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground">{s.maxWords} words max</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.description}</p>
                    {s.evaluationCriteria?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {s.evaluationCriteria.slice(0, 3).map((c, j) => (
                          <span key={j} className="text-[10px] bg-muted rounded px-1.5 py-0.5">{c}</span>
                        ))}
                        {s.evaluationCriteria.length > 3 && (
                          <span className="text-[10px] text-muted-foreground">+{s.evaluationCriteria.length - 3} more</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Required Forms */}
        <Card className="overflow-hidden">
          <button
            className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors text-left"
            onClick={() => setExpandedPanel(expandedPanel === "forms" ? null : "forms")}
          >
            {expandedPanel === "forms" ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
            <Paperclip className="h-4 w-4 text-[#3d8b8b] shrink-0" />
            <span className="font-semibold text-sm flex-1">Required Forms</span>
            <Badge variant="outline" className="text-[10px]">
              {research.forms.length} forms
            </Badge>
          </button>
          {expandedPanel === "forms" && (
            <div className="border-t px-4 pb-4 pt-3">
              <div className="space-y-2">
                {research.forms.map((form, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm border rounded p-3 group">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold">{form.number}</span>
                        <span className="font-medium truncate">{form.name}</span>
                        <Badge
                          variant="outline"
                          className={`text-[9px] cursor-pointer select-none ${
                            form.required !== false
                              ? "text-emerald-600 bg-emerald-500/10 border-emerald-500/20"
                              : "text-muted-foreground bg-muted/30"
                          }`}
                          onClick={() => {
                            const updated = [...research.forms];
                            updated[i] = { ...updated[i], required: form.required === false };
                            onUpdateForms(updated);
                          }}
                        >
                          {form.required !== false ? "Required" : "If applicable"}
                        </Badge>
                      </div>
                      {form.notes && <p className="text-xs text-muted-foreground mt-0.5">{form.notes}</p>}
                    </div>
                    {form.url && (
                      <a
                        href={form.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[#3d8b8b] hover:underline flex items-center gap-1 shrink-0"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {form.url.includes("forms-repository") ? "View Form" : "Download"}
                      </a>
                    )}
                    <button
                      className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      onClick={() => {
                        const updated = research.forms.filter((_, idx) => idx !== i);
                        onUpdateForms(updated);
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-3">
                <select
                  className="w-full text-xs border rounded px-2 py-1.5 bg-background text-muted-foreground"
                  value=""
                  onChange={(e) => {
                    const formToAdd = FEDERAL_FORMS.find(f => f.id === e.target.value);
                    if (formToAdd) {
                      onUpdateForms([...research.forms, {
                        ...formToAdd,
                        notes: "Manually added",
                        required: formToAdd.requiredLevel === "required",
                      } as EnrichedForm]);
                    }
                  }}
                >
                  <option value="">+ Add a form from registry...</option>
                  {FEDERAL_FORMS
                    .filter(f => f.requiredLevel !== "post-award")
                    .filter(f => !research.forms.some((ef) => ef.number === f.number))
                    .map(f => (
                      <option key={f.id} value={f.id}>{f.number}: {f.name}</option>
                    ))}
                </select>
              </div>
            </div>
          )}
        </Card>

        {/* Web Sources */}
        {(research.webSources.entitySources.length > 0 || research.webSources.grantSources.length > 0) && (
          <Card className="overflow-hidden">
            <button
              className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors text-left"
              onClick={() => setExpandedPanel(expandedPanel === "sources" ? null : "sources")}
            >
              {expandedPanel === "sources" ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
              <Globe className="h-4 w-4 text-[#3d8b8b] shrink-0" />
              <span className="font-semibold text-sm flex-1">Web Sources</span>
              <span className="text-[10px] text-muted-foreground">
                {research.webSources.entitySources.length + research.webSources.grantSources.length} sources
              </span>
            </button>
            {expandedPanel === "sources" && (
              <div className="border-t px-4 pb-4 pt-3 space-y-3">
                {research.webSources.entitySources.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Entity Sources</h4>
                    {research.webSources.entitySources.map((s, i) => (
                      <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="block text-xs text-[#3d8b8b] hover:underline truncate mb-0.5">
                        {s.title}
                      </a>
                    ))}
                  </div>
                )}
                {research.webSources.grantSources.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Grant Sources</h4>
                    {research.webSources.grantSources.map((s, i) => (
                      <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="block text-xs text-[#3d8b8b] hover:underline truncate mb-0.5">
                        {s.title}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>
        )}

        {/* User Guidance / Outline */}
        <Card className="overflow-hidden border-[#3d8b8b]/30 bg-[#3d8b8b]/5">
          <button
            className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors text-left"
            onClick={() => setExpandedPanel(expandedPanel === "guidance" ? null : "guidance")}
          >
            {expandedPanel === "guidance" ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
            <Edit className="h-4 w-4 text-[#3d8b8b] shrink-0" />
            <span className="font-semibold text-sm flex-1">Your Narrative Outline</span>
            {hasNonEmptyGuidance(userGuidance) ? (
              <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-500/10 border-emerald-500/20">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Guidance provided
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                Optional
              </Badge>
            )}
          </button>
          {expandedPanel === "guidance" && (
            <div className="border-t px-4 pb-4 pt-3">
              <p className="text-xs text-muted-foreground mb-3">
                Provide key talking points and priorities. The AI will weave these into the narrative as its guiding outline.
              </p>
              <UserGuidanceForm guidance={userGuidance} onChange={onUserGuidanceChange} />
            </div>
          )}
        </Card>

        {/* Generate CTA */}
        <div className="py-4 flex flex-col items-center gap-2">
          <Button
            size="lg"
            className={`gap-2 text-white px-8 ${hasRealRequirements ? "bg-[#3d8b8b] hover:bg-[#2d7a7a]" : "bg-muted-foreground/50 cursor-not-allowed"}`}
            onClick={onGenerateDraft}
            disabled={!hasRealRequirements}
          >
            <Zap className="h-5 w-5" />
            Generate Draft Application
            <ArrowRight className="h-4 w-4" />
          </Button>
          {!nofoUploaded && gr?.source !== "nofo-extracted" && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              Tip: Upload the NOFO for more accurate sections and scoring criteria
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Generating View (with streaming progress) ───

function GeneratingView({ progress, streamingSections }: { progress: string; streamingSections: DraftSection[] }) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="relative mx-auto mb-6 w-20 h-20">
          <Loader2 className="h-20 w-20 animate-spin text-[#3d8b8b]" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Generating Application Draft</h3>
        <p className="text-sm text-muted-foreground">{progress}</p>
        <p className="text-xs text-muted-foreground mt-2">
          Drafting all sections in parallel with Claude Sonnet. Typically takes 15-30 seconds
        </p>

        {/* Live streaming progress */}
        {streamingSections.length > 0 && (
          <div className="mt-6 text-left max-w-sm mx-auto space-y-2">
            {streamingSections.map((s) => (
              <div key={s.sectionId} className="flex items-center gap-2 text-xs">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span className="text-foreground font-medium truncate">{s.title}</span>
                <Badge variant="outline" className={`text-[9px] ml-auto shrink-0 ${confidenceConfig[s.confidence].color}`}>
                  {s.confidence}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Draft View ───

function DraftView({
  draft,
  expandedSections,
  editingSections,
  showAttachments,
  activeView,
  saveStatus,
  regeneratingSection,
  versionHistory,
  showVersionHistory,
  onToggleSection,
  onSetEditingSections,
  onSaveSectionEdit,
  onSetShowAttachments,
  onSetActiveView,
  onDeleteDraft,
  onCopy,
  onExportHTML,
  onExportText,
  onExportPdf,
  onExportDocx,
  onRegenerateSection,
  onToggleVersionHistory,
  onRestoreVersion,
  onBackToReview,
}: {
  draft: LocalDraft;
  expandedSections: Set<string>;
  editingSections: Map<string, string>;
  showAttachments: boolean;
  activeView: "sections" | "preview";
  saveStatus: "saved" | "saving" | "unsaved" | "error";
  regeneratingSection: string | null;
  versionHistory: DraftVersion[];
  showVersionHistory: boolean;
  onToggleSection: (id: string) => void;
  onSetEditingSections: React.Dispatch<React.SetStateAction<Map<string, string>>>;
  onSaveSectionEdit: (id: string) => void;
  onSetShowAttachments: (v: boolean) => void;
  onSetActiveView: (v: "sections" | "preview") => void;
  onDeleteDraft: (id: string) => void;
  onCopy: () => void;
  onExportHTML: () => void;
  onExportText: () => void;
  onExportPdf: () => void;
  onExportDocx: () => void;
  onRegenerateSection: (sectionId: string, additionalInstructions?: string) => void;
  onToggleVersionHistory: () => void;
  onRestoreVersion: (versionNumber: number) => void;
  onBackToReview: () => void;
}) {
  return (
    <>
      {/* Header */}
      <div className="p-6 border-b shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">{draft.grantTitle}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {draft.applicantName}{draft.generatedAt ? `, Generated ${new Date(draft.generatedAt).toLocaleDateString()}` : ""}
            </p>
            {/* Save status & last edited info */}
            <div className="flex items-center gap-3 mt-1.5">
              <span className={`text-[10px] flex items-center gap-1 ${
                saveStatus === "saved" ? "text-emerald-600" :
                saveStatus === "saving" ? "text-amber-600" :
                saveStatus === "error" ? "text-red-600" : "text-muted-foreground"
              }`}>
                {saveStatus === "saved" && <><CheckCircle2 className="h-3 w-3" /> Saved</>}
                {saveStatus === "saving" && <><Loader2 className="h-3 w-3 animate-spin" /> Saving...</>}
                {saveStatus === "error" && <><AlertCircle className="h-3 w-3" /> Save failed</>}
                {saveStatus === "unsaved" && <><Clock className="h-3 w-3" /> Unsaved changes</>}
              </span>
              {draft.lastEditedBy && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <User className="h-3 w-3" />
                  Last edited by {draft.lastEditedBy.userName}
                  {draft.lastEditedAt && ` at ${new Date(draft.lastEditedAt).toLocaleString()}`}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <CompletenessRing value={draft.overallCompleteness} size={48} />
            <div>
              <div className="text-2xl font-bold">{draft.overallCompleteness}%</div>
              <div className="text-[10px] text-muted-foreground">Complete</div>
            </div>
          </div>
        </div>

        {/* Action bar */}
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          <div className="flex items-center bg-muted rounded-md p-0.5">
            <button
              className={`px-3 py-1 text-xs rounded ${
                activeView === "sections" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"
              }`}
              onClick={() => onSetActiveView("sections")}
            >
              <Edit className="h-3 w-3 inline mr-1" /> Sections
            </button>
            <button
              className={`px-3 py-1 text-xs rounded ${
                activeView === "preview" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"
              }`}
              onClick={() => onSetActiveView("preview")}
            >
              <Eye className="h-3 w-3 inline mr-1" /> Preview
            </button>
          </div>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={onBackToReview}>
            <RefreshCw className="h-3.5 w-3.5" /> Edit Research & Regenerate
          </Button>
          <div className="flex-1" />
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => onSetShowAttachments(!showAttachments)}>
            <Paperclip className="h-3.5 w-3.5" />
            Attachments
            <Badge variant="secondary" className="text-[9px] ml-1 px-1.5">
              {draft.attachmentsChecklist.filter((a) => a.status === "on_file").length}/{draft.attachmentsChecklist.length}
            </Badge>
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={onToggleVersionHistory}>
            <History className="h-3.5 w-3.5" /> History
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={onCopy}>
            <Copy className="h-3.5 w-3.5" /> Copy
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={onExportPdf}>
            <FileDown className="h-3.5 w-3.5" /> PDF
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={onExportDocx}>
            <FileText className="h-3.5 w-3.5" /> DOCX
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={onExportHTML}>
            <FileDown className="h-3.5 w-3.5" /> HTML
          </Button>
          <Button size="sm" variant="destructive" className="gap-1.5 text-xs" onClick={() => onDeleteDraft(draft.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Version History panel */}
      {showVersionHistory && (
        <div className="border-b p-4 bg-muted/30 shrink-0 max-h-60 overflow-y-auto">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <History className="h-4 w-4" /> Version History
          </h3>
          {versionHistory.length === 0 ? (
            <p className="text-xs text-muted-foreground">No previous versions yet. Versions are created when sections are updated.</p>
          ) : (
            <div className="space-y-2">
              {versionHistory.map((v) => (
                <div key={v.id} className="flex items-center gap-3 text-xs border rounded p-2 bg-background">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted font-bold text-[10px]">
                    v{v.versionNumber}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{v.editSummary || "Sections updated"}</div>
                    <div className="text-muted-foreground flex items-center gap-2">
                      <span>{new Date(v.createdAt).toLocaleString()}</span>
                      {v.editedBy?.userName && (
                        <span className="flex items-center gap-1"><User className="h-3 w-3" /> {v.editedBy.userName}</span>
                      )}
                      <span>{v.overallCompleteness}% complete</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-[10px] h-6 px-2"
                    onClick={() => onRestoreVersion(v.versionNumber)}
                  >
                    Restore
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Attachments panel */}
      {showAttachments && (
        <div className="border-b p-4 bg-muted/30 shrink-0">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Paperclip className="h-4 w-4" /> Required Attachments Checklist
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {draft.attachmentsChecklist.map((att) => {
              const cfg = attachmentStatusConfig[att.status];
              return (
                <div key={att.id} className="flex items-start gap-2 text-xs p-2 rounded border bg-background">
                  <Badge variant="outline" className={`text-[9px] shrink-0 ${cfg.color}`}>{cfg.label}</Badge>
                  <div className="min-w-0">
                    <div className="font-medium">
                      {att.name}
                      {att.required && <span className="text-destructive ml-1">*</span>}
                    </div>
                    <div className="text-muted-foreground mt-0.5">{att.notes}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sections / Preview */}
      <div className="flex-1 overflow-y-auto">
        {activeView === "sections" ? (
          <div className="p-6 space-y-4 max-w-5xl mx-auto">
            {draft.sections.map((section) => {
              const isExpanded = expandedSections.has(section.sectionId);
              const isEditing = editingSections.has(section.sectionId);
              const isRegenerating = regeneratingSection === section.sectionId;
              const conf = confidenceConfig[section.confidence];
              const ConfIcon = conf.icon;
              const wordPct = Math.min(100, Math.round((section.wordCount / section.maxWords) * 100));
              const overLimit = section.wordCount > section.maxWords;

              return (
                <Card key={section.sectionId} className="overflow-hidden">
                  <button
                    className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors text-left"
                    onClick={() => onToggleSection(section.sectionId)}
                  >
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{section.title}</span>
                        <Badge variant="outline" className={`text-[10px] ${conf.color}`}>
                          <ConfIcon className="h-3 w-3 mr-1" /> {conf.label}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">{section.weight}% of score</span>
                        {section.aiGenerated && (
                          <Badge variant="outline" className="text-[9px] text-blue-600 bg-blue-500/10 border-blue-500/20">AI</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5">
                        <div className="flex items-center gap-2 flex-1 max-w-[200px]">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                overLimit ? "bg-red-500" : wordPct >= 60 ? "bg-emerald-500" : "bg-amber-500"
                              }`}
                              style={{ width: `${Math.min(wordPct, 100)}%` }}
                            />
                          </div>
                          <span className={`text-[10px] tabular-nums ${overLimit ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                            {section.wordCount.toLocaleString()}/{section.maxWords.toLocaleString()}
                          </span>
                        </div>
                        {section.gapAnnotations.length > 0 && (
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {section.gapAnnotations.length} gap{section.gapAnnotations.length !== 1 ? "s" : ""}
                          </span>
                        )}
                        {section.lastEditedBy && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <User className="h-3 w-3" /> {section.lastEditedBy.userName}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t">
                      {section.gapAnnotations.length > 0 && (
                        <div className="px-4 py-3 bg-amber-50/50 dark:bg-amber-950/20 border-b">
                          <div className="text-xs font-medium text-amber-800 dark:text-amber-200 mb-1.5">Data Gaps Requiring Attention</div>
                          <ul className="space-y-1">
                            {section.gapAnnotations.map((gap, i) => (
                              <li key={i} className="text-xs text-amber-700 dark:text-amber-300 flex items-start gap-1.5">
                                <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" /> {gap}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Confidence details (from Claude scoring) */}
                      {section.confidenceDetails && section.confidenceDetails.length > 0 && (
                        <div className="px-4 py-3 bg-muted/20 border-b">
                          <div className="text-xs font-medium text-muted-foreground mb-2">Scoring Breakdown</div>
                          <div className="space-y-1.5">
                            {section.confidenceDetails.map((d, i) => (
                              <div key={i} className="flex items-center gap-2 text-xs">
                                <div className="w-28 truncate font-medium">{d.criterionName}</div>
                                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      d.score >= 80 ? "bg-emerald-500" : d.score >= 50 ? "bg-amber-500" : "bg-red-500"
                                    }`}
                                    style={{ width: `${d.score}%` }}
                                  />
                                </div>
                                <span className="text-[10px] tabular-nums w-8 text-right">{d.score}%</span>
                                <span className="text-muted-foreground truncate max-w-[200px]">{d.feedback}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="px-4 pt-3 flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">{section.confidenceReason}</span>
                        <div className="flex items-center gap-1.5">
                          {/* Regenerate button */}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs h-7 gap-1"
                            disabled={isRegenerating}
                            onClick={() => onRegenerateSection(section.sectionId)}
                          >
                            {isRegenerating ? (
                              <><Loader2 className="h-3 w-3 animate-spin" /> Regenerating...</>
                            ) : (
                              <><RotateCw className="h-3 w-3" /> Regenerate</>
                            )}
                          </Button>
                          {/* Edit/Save button */}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs h-7 gap-1"
                            onClick={() => {
                              if (isEditing) {
                                onSaveSectionEdit(section.sectionId);
                              } else {
                                onSetEditingSections((prev) => new Map(prev).set(section.sectionId, section.content));
                              }
                            }}
                          >
                            {isEditing ? (
                              <><Save className="h-3 w-3" /> Save</>
                            ) : (
                              <><Edit className="h-3 w-3" /> Edit</>
                            )}
                          </Button>
                        </div>
                      </div>

                      <div className="p-4">
                        {isEditing ? (
                          <textarea
                            className="w-full min-h-[300px] text-sm leading-relaxed border rounded-md p-3 bg-background resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                            value={editingSections.get(section.sectionId) ?? section.content}
                            onChange={(e) =>
                              onSetEditingSections((prev) => new Map(prev).set(section.sectionId, e.target.value))
                            }
                          />
                        ) : (
                          <SectionContent content={section.content} />
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="p-6 max-w-3xl mx-auto">
            <div className="mb-8">
              <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
                {draft.grantProgram}
              </h1>
              <p className="text-sm text-muted-foreground">Applicant: {draft.applicantName}</p>
            </div>
            {draft.sections.map((section) => (
              <div key={section.sectionId} className="mb-10">
                <h2 className="text-lg font-semibold mb-4 pb-2 border-b" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
                  {section.title}
                </h2>
                <SectionContent content={section.content} className="leading-[1.8]" previewMode />
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ─── Extra File Upload ───

function ExtraFileUpload() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  return (
    <div className="flex items-center gap-3">
      <label className="cursor-pointer inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm hover:bg-muted/50 transition-colors">
        <Upload className="h-4 w-4" />
        {uploading ? "Uploading..." : "Choose File"}
        <input
          type="file"
          accept=".pdf,.doc,.docx,.txt"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) {
              setUploading(true);
              // Store file name for display; actual processing can be added later
              setTimeout(() => {
                setFileName(f.name);
                setUploading(false);
              }, 500);
            }
          }}
          disabled={uploading}
        />
      </label>
      {uploading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      {fileName && !uploading && (
        <div className="flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground truncate max-w-[200px]">{fileName}</span>
          <button
            onClick={() => setFileName(null)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Completeness Ring ───

function CompletenessRing({ value, size }: { value: number; size: number }) {
  const strokeWidth = size > 30 ? 4 : 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const color = value >= 80 ? "#22c55e" : value >= 50 ? "#eab308" : "#ef4444";

  return (
    <svg width={size} height={size} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-muted/30" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="transition-all duration-500"
      />
    </svg>
  );
}
