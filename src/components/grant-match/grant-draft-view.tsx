"use client";

import { useState, useEffect, useCallback, useMemo, Fragment } from "react";
import { useProfile } from "@/components/profile-provider";
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
} from "lucide-react";

// ─── Types ───

interface SectionDraft {
  sectionId: string;
  title: string;
  content: string;
  confidence: "high" | "medium" | "low";
  confidenceReason: string;
  gapAnnotations: string[];
  wordCount: number;
  maxWords: number;
  weight: number;
}

interface AttachmentStatus {
  id: string;
  name: string;
  description: string;
  required: boolean;
  status: "on_file" | "needs_preparation" | "missing";
  notes: string;
}

interface DraftResponse {
  sections: SectionDraft[];
  overallCompleteness: number;
  attachmentsChecklist: AttachmentStatus[];
  generatedAt: string;
  grantProgram: string;
  applicantName: string;
}

interface SavedDraft extends DraftResponse {
  id: string;
  grantId: string;
  grantTitle: string;
}

interface ResearchData {
  entityProfile: any;
  grantRequirements: any;
  forms: any[];
  researchSummary: {
    entityDataQuality: "high" | "medium" | "low";
    grantDataQuality: "high" | "medium" | "low";
    keyFindings: string[];
    dataGaps: string[];
  };
  grantDetails: any;
  webSources: {
    entitySources: { title: string; url: string }[];
    grantSources: { title: string; url: string }[];
  };
  metadata: {
    researchedAt: string;
    grantsGovAvailable: boolean;
    braveSearchAvailable: boolean;
    webResultsFound: number;
    nofoAutoFetched?: boolean;
    nofoPdfUrl?: string | null;
    nofoPdfPages?: number;
    nofoValidation?: {
      isMatch: boolean;
      confidence: string;
      detectedProgram: string;
      detectedFiscalYear: string;
      reason: string;
    } | null;
    acfrAutoFetched?: boolean;
    acfrPdfUrl?: string | null;
    acfrPdfPages?: number;
  };
}

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

function highlightGapAnnotations(text: string): React.ReactNode[] {
  const parts = text.split(/(\[NEEDS:[^\]]+\])/g);
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
    return <Fragment key={i}>{part}</Fragment>;
  });
}

function formatDollars(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return n > 0 ? `$${n}` : "-";
}

// ─── Component ───

export function GrantDraftView({ initialGrantId, initialGrantTitle }: GrantDraftViewProps) {
  const { profile } = useProfile();

  // Phase state
  const [phase, setPhase] = useState<Phase>("idle");
  const [researchData, setResearchData] = useState<ResearchData | null>(null);
  const [researchError, setResearchError] = useState<string | null>(null);
  const [researchProgress, setResearchProgress] = useState("");

  // Draft state
  const [drafts, setDrafts] = useState<SavedDraft[]>([]);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingProgress, setGeneratingProgress] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [editingSections, setEditingSections] = useState<Map<string, string>>(new Map());
  const [showAttachments, setShowAttachments] = useState(false);
  const [activeView, setActiveView] = useState<"sections" | "preview">("sections");

  // Current grant context
  const [currentGrantId, setCurrentGrantId] = useState<string | null>(null);
  const [currentGrantTitle, setCurrentGrantTitle] = useState<string | null>(null);

  // ACFR upload state
  const [acfrLoading, setAcfrLoading] = useState(false);
  const [acfrFileName, setAcfrFileName] = useState<string | null>(null);
  const [acfrError, setAcfrError] = useState<string | null>(null);

  // NOFO upload state
  const [nofoLoading, setNofoLoading] = useState(false);
  const [nofoFileName, setNofoFileName] = useState<string | null>(null);
  const [nofoError, setNofoError] = useState<string | null>(null);
  const [nofoUploaded, setNofoUploaded] = useState(false);

  // Load drafts from session storage
  useEffect(() => {
    const stored = sessionStorage.getItem("grantDrafts_v2");
    if (stored) {
      try { setDrafts(JSON.parse(stored)); } catch {}
    }
  }, []);

  // Auto-start research when coming from Draft Grant button
  useEffect(() => {
    if (initialGrantId && initialGrantTitle && phase === "idle") {
      // Check if we already have a draft for this grant
      const stored = sessionStorage.getItem("grantDrafts_v2");
      if (stored) {
        try {
          const existing = JSON.parse(stored) as SavedDraft[];
          const match = existing.find((d) => d.grantId === initialGrantId);
          if (match) {
            setDrafts(existing);
            setSelectedDraftId(match.id);
            setExpandedSections(new Set(match.sections.map((s) => s.sectionId)));
            setPhase("draft");
            return;
          }
        } catch {}
      }
      // Check for cached research
      const cachedResearch = sessionStorage.getItem(`research_${initialGrantId}`);
      if (cachedResearch) {
        try {
          setResearchData(JSON.parse(cachedResearch));
          setCurrentGrantId(initialGrantId);
          setCurrentGrantTitle(initialGrantTitle);
          setPhase("review");
          return;
        } catch {}
      }
      // Start fresh research
      handleStartResearch(initialGrantId, initialGrantTitle);
    }
  }, [initialGrantId, initialGrantTitle]); // eslint-disable-line react-hooks/exhaustive-deps

  // Save drafts
  useEffect(() => {
    if (drafts.length > 0) {
      sessionStorage.setItem("grantDrafts_v2", JSON.stringify(drafts));
    }
  }, [drafts]);

  const selectedDraft = useMemo(() => drafts.find((d) => d.id === selectedDraftId), [drafts, selectedDraftId]);

  // ─── Phase 1: Research ───

  async function handleStartResearch(grantId: string, grantTitle: string) {
    setPhase("researching");
    setResearchError(null);
    setCurrentGrantId(grantId);
    setCurrentGrantTitle(grantTitle);

    try {
      setResearchProgress("Fetching grant details from Grants.gov...");
      await new Promise((r) => setTimeout(r, 300)); // UI feedback

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

      // If NOFO was auto-fetched during research, mark as uploaded
      if (data.metadata?.nofoAutoFetched) {
        setNofoUploaded(true);
      }
      // If ACFR was auto-fetched, mark with filename
      if (data.metadata?.acfrAutoFetched && data.metadata?.acfrPdfUrl) {
        setAcfrFileName("Auto-fetched from web");
      }

      // Cache research
      sessionStorage.setItem(`research_${grantId}`, JSON.stringify(data));

      setPhase("review");
    } catch (error) {
      setResearchError(error instanceof Error ? error.message : "Research failed");
      setPhase("idle");
    } finally {
      setResearchProgress("");
    }
  }

  // ─── Phase 3: Generate Draft ───

  async function handleGenerateDraft() {
    if (!researchData || !currentGrantId || !currentGrantTitle) return;

    setPhase("generating");
    setIsGenerating(true);
    setGeneratingProgress("Generating all sections in parallel with Claude Sonnet...");

    try {
      const gr = researchData.grantRequirements;
      const requestBody: any = {
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
          sections: (gr?.applicationSections || []).map((s: any, i: number) => ({
            id: `section-${i}`,
            title: s.title,
            description: s.description,
            maxWords: s.maxWords || 5000,
            weight: s.weight || Math.round(100 / (gr?.applicationSections?.length || 1)),
            evaluationCriteria: s.evaluationCriteria || [],
            requiredElements: [],
          })),
          requiredAttachments: (researchData.forms || []).map((f: any) => ({
            id: f.id || f.number.toLowerCase().replace(/[^a-z0-9]/g, "-"),
            name: `${f.number}: ${f.name}`,
            description: f.notes || f.description || "",
            required: f.required !== false,
          })),
        },
      };

      const res = await fetch("/api/build-grant-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to generate draft");
      }

      const response: DraftResponse = await res.json();

      const newDraft: SavedDraft = {
        ...response,
        id: `draft-${Date.now()}`,
        grantId: currentGrantId,
        grantTitle: currentGrantTitle,
      };

      setDrafts((prev) => [newDraft, ...prev]);
      setSelectedDraftId(newDraft.id);
      setExpandedSections(new Set(response.sections.map((s) => s.sectionId)));
      setPhase("draft");
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : "Failed to generate draft"}`);
      setPhase("review");
    } finally {
      setIsGenerating(false);
      setGeneratingProgress("");
    }
  }

  // ─── ACFR Upload ───

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

      // Merge ACFR-extracted profile into research data (ACFR overrides web research)
      if (researchData) {
        const acfr = data.profile;
        const merged = {
          ...researchData,
          entityProfile: {
            ...researchData.entityProfile,
            name: acfr.name || researchData.entityProfile.name,
            legalName: acfr.legalName || researchData.entityProfile.legalName,
            entityType: acfr.entityType || researchData.entityProfile.entityType,
            classification: acfr.classification || researchData.entityProfile.classification,
            location: {
              ...researchData.entityProfile.location,
              ...(acfr.location || {}),
            },
            financials: {
              annualRevenue: acfr.financials?.annualRevenue || researchData.entityProfile.financials?.annualRevenue || 0,
              operatingBudget: acfr.financials?.operatingBudget || researchData.entityProfile.financials?.operatingBudget || 0,
              capitalBudget: acfr.financials?.capitalBudget || researchData.entityProfile.financials?.capitalBudget || 0,
              bondRating: acfr.financials?.bondRating || researchData.entityProfile.financials?.bondRating || "",
              totalAssets: acfr.financials?.totalAssets || researchData.entityProfile.financials?.totalAssets || 0,
            },
            operations: {
              annualTonnage: acfr.operations?.annualTonnage || researchData.entityProfile.operations?.annualTonnage || 0,
              annualTEUs: acfr.operations?.annualTEUs || researchData.entityProfile.operations?.annualTEUs || 0,
              vesselCalls: acfr.operations?.vesselCalls || researchData.entityProfile.operations?.vesselCalls || 0,
              employeeCount: acfr.operations?.employeeCount || researchData.entityProfile.operations?.employeeCount || 0,
              directJobs: acfr.operations?.directJobs || researchData.entityProfile.operations?.directJobs || 0,
              cargoTypes: acfr.operations?.cargoTypes?.length > 0 ? acfr.operations.cargoTypes : researchData.entityProfile.operations?.cargoTypes || [],
            },
            infrastructure: {
              keyFacilities: acfr.infrastructure?.keyFacilities?.length > 0 ? acfr.infrastructure.keyFacilities : researchData.entityProfile.infrastructure?.keyFacilities || [],
              acreage: acfr.infrastructure?.acreage || researchData.entityProfile.infrastructure?.acreage || 0,
            },
            economicImpact: {
              regionalEconomicImpact: acfr.economicImpact?.regionalEconomicImpact || researchData.entityProfile.economicImpact?.regionalEconomicImpact || 0,
              totalJobs: acfr.economicImpact?.totalJobs || researchData.entityProfile.economicImpact?.totalJobs || 0,
              tradeValue: acfr.economicImpact?.tradeValue || researchData.entityProfile.economicImpact?.tradeValue || 0,
            },
            currentProjects: acfr.currentProjects?.length > 0 ? acfr.currentProjects : researchData.entityProfile.currentProjects || [],
            pastGrantAwards: acfr.pastGrantAwards?.length > 0 ? acfr.pastGrantAwards : researchData.entityProfile.pastGrantAwards || [],
            certifications: acfr.certifications?.length > 0 ? acfr.certifications : researchData.entityProfile.certifications || [],
            strategicPriorities: acfr.strategicPriorities?.length > 0 ? acfr.strategicPriorities : researchData.entityProfile.strategicPriorities || [],
            environmentalGoals: acfr.environmentalGoals?.length > 0 ? acfr.environmentalGoals : researchData.entityProfile.environmentalGoals || [],
          },
          researchSummary: {
            ...researchData.researchSummary,
            entityDataQuality: "high" as const,
            dataGaps: researchData.researchSummary.dataGaps.filter(
              (g) => !["annualRevenue", "operatingBudget", "capitalBudget", "totalAssets", "bondRating", "employeeCount"].some((k) => g.toLowerCase().includes(k.toLowerCase()))
            ),
          },
        };
        setResearchData(merged);
        // Update cache
        if (currentGrantId) {
          sessionStorage.setItem(`research_${currentGrantId}`, JSON.stringify(merged));
        }
      }

      // Also cache standalone
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

      // Merge NOFO-extracted requirements into research data
      if (researchData) {
        const merged = {
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

  // ─── Forms management ───

  function handleUpdateForms(updatedForms: any[]) {
    if (!researchData) return;
    const merged = { ...researchData, forms: updatedForms };
    setResearchData(merged);
    if (currentGrantId) {
      sessionStorage.setItem(`research_${currentGrantId}`, JSON.stringify(merged));
    }
  }

  // ─── Draft management ───

  function handleDeleteDraft(draftId: string) {
    if (!confirm("Delete this draft?")) return;
    const newDrafts = drafts.filter((d) => d.id !== draftId);
    setDrafts(newDrafts);
    if (selectedDraftId === draftId) setSelectedDraftId(null);
    sessionStorage.setItem("grantDrafts_v2", JSON.stringify(newDrafts));
  }

  function handleSaveSectionEdit(sectionId: string) {
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
      return { ...s, content: newContent, wordCount, gapAnnotations, confidence };
    });

    const totalWeight = updatedSections.reduce((sum, s) => sum + s.weight, 0);
    const weighted = updatedSections.reduce((sum, s) => {
      const c = s.confidence === "high" ? 1.0 : s.confidence === "medium" ? 0.7 : 0.4;
      return sum + c * s.weight;
    }, 0);
    const overallCompleteness = Math.round((weighted / totalWeight) * 100);

    const updatedDraft = { ...selectedDraft, sections: updatedSections, overallCompleteness };
    setDrafts((prev) => prev.map((d) => (d.id === updatedDraft.id ? updatedDraft : d)));
    setEditingSections((prev) => {
      const next = new Map(prev);
      next.delete(sectionId);
      return next;
    });
  }

  const toggleSection = useCallback((id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ─── Export Functions ───

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
  .map((p) => `<p>${p.replace(/\[NEEDS:[^\]]+\]/g, (m) => `<span class="gap">${m}</span>`)}</p>`)
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
      "═".repeat(72),
      "",
      ...selectedDraft.sections.flatMap((s) => [
        `${s.title}`,
        `Confidence: ${s.confidence} | Words: ${s.wordCount}/${s.maxWords} | Weight: ${s.weight}%`,
        "─".repeat(72),
        s.content,
        "",
        ...(s.gapAnnotations.length > 0
          ? [`Data Gaps:`, ...s.gapAnnotations.map((g) => `  • ${g}`), ""]
          : []),
        "═".repeat(72),
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
          <h2 className="font-semibold text-lg">Grant Drafts</h2>
          <p className="text-sm text-muted-foreground mt-1">AI-powered application drafting</p>
        </div>

        {/* Pipeline Status */}
        <div className="p-4 border-b">
          <div className="space-y-2">
            {[
              { key: "research", label: "Research", icon: Search, phases: ["researching", "review", "generating", "draft"] },
              { key: "review", label: "Review & Forms", icon: FileCheck, phases: ["review", "generating", "draft"] },
              { key: "draft", label: "Generate Draft", icon: FileText, phases: ["generating", "draft"] },
            ].map((step, i) => {
              const isActive = phase === step.phases[0] || (step.key === "review" && phase === "review");
              const isComplete = step.phases.includes(phase) && phase !== step.phases[0];
              const isDone = step.key === "research" && ["review", "generating", "draft"].includes(phase);
              const isDone2 = step.key === "review" && ["generating", "draft"].includes(phase);
              const isDone3 = step.key === "draft" && phase === "draft";

              return (
                <div key={step.key} className="flex items-center gap-3">
                  <div className={`flex items-center justify-center w-7 h-7 rounded-full border-2 shrink-0 ${
                    isDone || isDone2 || isDone3
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : isActive
                      ? "border-[#3d8b8b] text-[#3d8b8b] bg-[#3d8b8b]/10"
                      : "border-muted-foreground/30 text-muted-foreground/30"
                  }`}>
                    {isDone || isDone2 || isDone3 ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : isActive && (phase === "researching" || phase === "generating") ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <span className="text-xs font-bold">{i + 1}</span>
                    )}
                  </div>
                  <span className={`text-sm ${
                    isDone || isDone2 || isDone3
                      ? "text-emerald-600 font-medium"
                      : isActive
                      ? "text-foreground font-medium"
                      : "text-muted-foreground"
                  }`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Draft list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {drafts.length === 0 && phase === "idle" && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No drafts yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Click &ldquo;Draft Grant&rdquo; on any grant to start
              </p>
            </div>
          )}
          {drafts.map((draft) => (
            <Card
              key={draft.id}
              className={`p-3 cursor-pointer transition-colors ${
                selectedDraftId === draft.id ? "border-primary bg-muted/50" : "hover:bg-muted/30"
              }`}
              onClick={() => {
                setSelectedDraftId(draft.id);
                setExpandedSections(new Set(draft.sections.map((s) => s.sectionId)));
                setPhase("draft");
              }}
            >
              <div className="font-medium text-sm line-clamp-2">{draft.grantTitle}</div>
              <div className="flex items-center gap-2 mt-2">
                <CompletenessRing value={draft.overallCompleteness} size={24} />
                <span className="text-xs text-muted-foreground">{draft.overallCompleteness}% complete</span>
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">
                {new Date(draft.generatedAt).toLocaleString()}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Main Content - Phase Router */}
      <div className="flex-1 flex flex-col bg-background overflow-hidden">
        {phase === "idle" && (
          <IdleView />
        )}
        {phase === "researching" && (
          <ResearchingView progress={researchProgress} grantTitle={currentGrantTitle || ""} />
        )}
        {phase === "review" && researchData && (
          <ReviewView
            research={researchData}
            grantTitle={currentGrantTitle || ""}
            onGenerateDraft={handleGenerateDraft}
            onRerunResearch={() => currentGrantId && currentGrantTitle && handleStartResearch(currentGrantId, currentGrantTitle)}
            onAcfrUpload={handleAcfrUpload}
            acfrLoading={acfrLoading}
            acfrFileName={acfrFileName}
            acfrError={acfrError}
            onNofoUpload={handleNofoUpload}
            nofoLoading={nofoLoading}
            nofoFileName={nofoFileName}
            nofoError={nofoError}
            nofoUploaded={nofoUploaded}
            onUpdateForms={handleUpdateForms}
          />
        )}
        {phase === "generating" && (
          <GeneratingView progress={generatingProgress} />
        )}
        {phase === "draft" && selectedDraft && (
          <DraftView
            draft={selectedDraft}
            expandedSections={expandedSections}
            editingSections={editingSections}
            showAttachments={showAttachments}
            activeView={activeView}
            onToggleSection={toggleSection}
            onSetEditingSections={setEditingSections}
            onSaveSectionEdit={handleSaveSectionEdit}
            onSetShowAttachments={setShowAttachments}
            onSetActiveView={setActiveView}
            onDeleteDraft={handleDeleteDraft}
            onCopy={handleCopy}
            onExportHTML={exportToHTML}
            onExportText={exportToText}
          />
        )}
        {phase === "draft" && !selectedDraft && (
          <IdleView />
        )}
      </div>
    </div>
  );
}

// ─── Phase Views ───

function IdleView() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center max-w-md">
        <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Grant Application Drafting</h3>
        <p className="text-sm text-muted-foreground mb-2">
          Click &ldquo;Draft Grant&rdquo; on any grant in the discovery or pipeline tabs to start the automated research and drafting pipeline.
        </p>
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

function ReviewView({
  research,
  grantTitle,
  onGenerateDraft,
  onRerunResearch,
  onAcfrUpload,
  acfrLoading,
  acfrFileName,
  acfrError,
  onNofoUpload,
  nofoLoading,
  nofoFileName,
  nofoError,
  nofoUploaded,
  onUpdateForms,
}: {
  research: ResearchData;
  grantTitle: string;
  onGenerateDraft: () => void;
  onRerunResearch: () => void;
  onAcfrUpload: (file: File) => void;
  acfrLoading: boolean;
  acfrFileName: string | null;
  acfrError: string | null;
  onNofoUpload: (file: File) => void;
  nofoLoading: boolean;
  nofoFileName: string | null;
  nofoError: string | null;
  nofoUploaded: boolean;
  onUpdateForms: (forms: any[]) => void;
}) {
  const [expandedPanel, setExpandedPanel] = useState<string | null>("summary");
  const ep = research.entityProfile;
  const gr = research.grantRequirements;
  const summary = research.researchSummary;
  const hasRealRequirements = nofoUploaded || gr?.source === "nofo-extracted";

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
          {research.metadata.braveSearchAvailable && (
            <Badge variant="outline" className="text-xs text-purple-600 bg-purple-500/10 border-purple-500/20">
              <Search className="h-3 w-3 mr-1" /> Web Search ({research.metadata.webResultsFound} results)
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
                    {(ep.infrastructure?.keyFacilities || []).slice(0, 4).map((f: string, i: number) => (
                      <li key={i} className="truncate">• {f}</li>
                    ))}
                  </ul>
                </div>
              </div>
              {(ep.currentProjects || []).length > 0 && (
                <div className="mt-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Current Projects</h4>
                  <div className="space-y-1">
                    {ep.currentProjects.map((p: any, i: number) => (
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

        {/* ACFR Upload - Enrich Entity Profile */}
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

        {/* NOFO Upload - Extract Real Grant Requirements */}
        <Card className={`overflow-hidden border-dashed ${!hasRealRequirements ? "border-amber-500/50 bg-amber-500/5" : ""}`}>
          <div className="p-4">
            <div className="flex items-center gap-3">
              <ScrollText className="h-4 w-4 text-[#3d8b8b] shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-sm">Upload NOFO Document</span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {hasRealRequirements
                    ? "NOFO requirements extracted. Sections, forms, and scoring criteria are ready"
                    : research.metadata?.nofoValidation && !research.metadata.nofoValidation.isMatch
                    ? `Auto-fetched NOFO did not match (found: ${research.metadata.nofoValidation.detectedProgram}). Upload the correct NOFO`
                    : "Upload the Notice of Funding Opportunity (NOFO) PDF to extract real application requirements"
                  }
                </p>
              </div>
              {nofoFileName ? (
                <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-500/10 border-emerald-500/20 shrink-0">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> {nofoFileName}
                </Badge>
              ) : hasRealRequirements ? (
                <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-500/10 border-emerald-500/20 shrink-0">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Auto-fetched from web
                </Badge>
              ) : (
                <label className={`shrink-0 ${nofoLoading ? "pointer-events-none" : ""}`}>
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs" asChild disabled={nofoLoading}>
                    <span>
                      {nofoLoading ? (
                        <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Extracting...</>
                      ) : (
                        <><Upload className="h-3.5 w-3.5" /> Upload NOFO</>
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
              )}
            </div>
            {!hasRealRequirements && !nofoLoading && (
              <div className="mt-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-500/10 rounded p-2 flex items-start gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                {research.metadata?.nofoValidation && !research.metadata.nofoValidation.isMatch
                  ? `The auto-fetched NOFO was for "${research.metadata.nofoValidation.detectedProgram}" (${research.metadata.nofoValidation.detectedFiscalYear}) and was discarded. Please upload the correct NOFO for this grant.`
                  : "Required before generating a draft. The NOFO contains the real application sections, scoring criteria, and form requirements."
                }
              </div>
            )}
            {nofoError && (
              <div className="mt-2 text-xs text-destructive bg-destructive/10 rounded p-2">
                {nofoError}
              </div>
            )}
          </div>
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
            {hasRealRequirements ? (
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
                {(gr?.applicationSections || []).map((s: any, i: number) => (
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
                        {s.evaluationCriteria.slice(0, 3).map((c: string, j: number) => (
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

        {/* Required Forms - Editable */}
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
                {research.forms.map((form: any, i: number) => (
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
                        const updated = research.forms.filter((_: any, idx: number) => idx !== i);
                        onUpdateForms(updated);
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              {/* Add form from registry */}
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
                      }]);
                    }
                  }}
                >
                  <option value="">+ Add a form from registry...</option>
                  {FEDERAL_FORMS
                    .filter(f => f.requiredLevel !== "post-award")
                    .filter(f => !research.forms.some((ef: any) => ef.number === f.number))
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
          {!hasRealRequirements && (
            <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Upload the NOFO document above to enable draft generation
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function GeneratingView({ progress }: { progress: string }) {
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
      </div>
    </div>
  );
}

// ─── Draft View (existing section editor) ───

function DraftView({
  draft,
  expandedSections,
  editingSections,
  showAttachments,
  activeView,
  onToggleSection,
  onSetEditingSections,
  onSaveSectionEdit,
  onSetShowAttachments,
  onSetActiveView,
  onDeleteDraft,
  onCopy,
  onExportHTML,
  onExportText,
}: {
  draft: SavedDraft;
  expandedSections: Set<string>;
  editingSections: Map<string, string>;
  showAttachments: boolean;
  activeView: "sections" | "preview";
  onToggleSection: (id: string) => void;
  onSetEditingSections: React.Dispatch<React.SetStateAction<Map<string, string>>>;
  onSaveSectionEdit: (id: string) => void;
  onSetShowAttachments: (v: boolean) => void;
  onSetActiveView: (v: "sections" | "preview") => void;
  onDeleteDraft: (id: string) => void;
  onCopy: () => void;
  onExportHTML: () => void;
  onExportText: () => void;
}) {
  return (
    <>
      {/* Header */}
      <div className="p-6 border-b shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">{draft.grantTitle}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {draft.applicantName}, Generated {new Date(draft.generatedAt).toLocaleDateString()}
            </p>
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
        <div className="flex items-center gap-2 mt-4">
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
          <div className="flex-1" />
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => onSetShowAttachments(!showAttachments)}>
            <Paperclip className="h-3.5 w-3.5" />
            Attachments
            <Badge variant="secondary" className="text-[9px] ml-1 px-1.5">
              {draft.attachmentsChecklist.filter((a) => a.status === "on_file").length}/{draft.attachmentsChecklist.length}
            </Badge>
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={onCopy}>
            <Copy className="h-3.5 w-3.5" /> Copy
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={onExportHTML}>
            <FileDown className="h-3.5 w-3.5" /> HTML
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={onExportText}>
            <Download className="h-3.5 w-3.5" /> TXT
          </Button>
          <Button size="sm" variant="destructive" className="gap-1.5 text-xs" onClick={() => onDeleteDraft(draft.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

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

                      <div className="px-4 pt-3 flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">{section.confidenceReason}</span>
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
                            <><CheckCircle2 className="h-3 w-3" /> Save</>
                          ) : (
                            <><Edit className="h-3 w-3" /> Edit</>
                          )}
                        </Button>
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
                          <div
                            className="text-sm leading-relaxed whitespace-pre-wrap"
                            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                          >
                            {highlightGapAnnotations(section.content)}
                          </div>
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
                <div className="text-sm leading-[1.8] whitespace-pre-wrap" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
                  {highlightGapAnnotations(section.content)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
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
