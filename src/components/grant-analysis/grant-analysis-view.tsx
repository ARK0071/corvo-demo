"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Sparkles,
  Search,
  Building2,
  DollarSign,
  Calendar,
  ExternalLink,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import { MarkdownRenderer } from "@/components/chat/markdown-renderer";
import { useProfile } from "@/components/profile-provider";
import type { DiscoveredGrant } from "@/lib/grants-gov";
import type { PipelineGrant } from "@/data/grant-pipeline";

interface GrantAnalysisViewProps {
  pipelineGrants: PipelineGrant[];
}

function pipelineToGrantData(grant: PipelineGrant): DiscoveredGrant {
  return {
    id: grant.id,
    opportunityNumber: grant.opportunityNumber || grant.id,
    title: grant.title,
    agency: grant.agency,
    agencyCode: grant.agencyCode || "",
    description: grant.description || "",
    awardFloor: grant.awardFloor || 0,
    awardCeiling: grant.awardCeiling || 0,
    totalFunding: grant.totalFunding || 0,
    closeDate: grant.closeDate || "",
    postDate: "",
    status: "posted",
    applicationUrl: grant.applicationUrl || "",
    eligibility: [],
    fundingCategories: grant.focusAreas || [],
    fundingInstruments: [],
    costSharing: false,
    alnNumbers: [],
  };
}

export function GrantAnalysisView({ pipelineGrants }: GrantAnalysisViewProps) {
  const { profileId, profile } = useProfile();
  const [grantId, setGrantId] = useState("");
  const [selectedGrant, setSelectedGrant] = useState<DiscoveredGrant | null>(null);
  const [fetchingGrant, setFetchingGrant] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showPipelineSelector, setShowPipelineSelector] = useState(false);
  const [activeGrantData, setActiveGrantData] = useState<DiscoveredGrant | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Create transport with grant data in the body
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/grant-analysis",
        body: {
          profileId,
          grantId: activeGrantData?.id || "",
          grantData: activeGrantData,
        },
      }),
    [profileId, activeGrantData]
  );

  const { messages, sendMessage, status, setMessages, error } = useChat({
    transport,
  });

  const isLoading = status === "streaming" || status === "submitted";

  // Extract all assistant text from messages
  const analysisText = useMemo(() => {
    const assistantMessages = messages.filter((m) => m.role === "assistant");
    if (assistantMessages.length === 0) return "";
    // Combine all text parts from the last assistant message
    const lastMsg = assistantMessages[assistantMessages.length - 1];
    return lastMsg.parts
      ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("") || "";
  }, [messages]);

  // Auto-scroll as content streams in
  useEffect(() => {
    if (isLoading && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [analysisText, isLoading]);

  const fetchGrantDetails = useCallback(
    async (id: string): Promise<DiscoveredGrant | null> => {
      setFetchingGrant(true);
      setFetchError(null);
      try {
        const res = await fetch("/api/grant-details", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ opportunityId: id }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to fetch grant details");
        }
        const grant = await res.json();
        setSelectedGrant(grant);
        return grant;
      } catch (err) {
        setFetchError(err instanceof Error ? err.message : "Failed to fetch grant");
        return null;
      } finally {
        setFetchingGrant(false);
      }
    },
    []
  );

  const startAnalysis = useCallback(
    async (targetGrantId: string, grantData?: DiscoveredGrant | null) => {
      if (!targetGrantId.trim()) return;

      setFetchError(null);

      // Get grant data: use provided, or fetch from Grants.gov
      let grant = grantData ?? null;
      if (!grant) {
        grant = await fetchGrantDetails(targetGrantId);
        if (!grant) return;
      }

      // Reset chat and set the active grant data for the transport
      setMessages([]);
      setActiveGrantData(grant);
      setSelectedGrant(grant);
    },
    [fetchGrantDetails, setMessages]
  );

  // When activeGrantData changes, send the analysis request
  const sentForGrantRef = useRef<string | null>(null);
  useEffect(() => {
    if (activeGrantData && activeGrantData.id !== sentForGrantRef.current && messages.length === 0) {
      sentForGrantRef.current = activeGrantData.id;
      sendMessage({ text: "Analyze this grant opportunity." });
    }
  }, [activeGrantData, messages.length, sendMessage]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const id = grantId.trim();
      if (!id) return;
      sentForGrantRef.current = null;
      startAnalysis(id);
    },
    [grantId, startAnalysis]
  );

  const selectPipelineGrant = useCallback(
    (grant: PipelineGrant) => {
      setGrantId(grant.id);
      setShowPipelineSelector(false);
      sentForGrantRef.current = null;
      startAnalysis(grant.id, pipelineToGrantData(grant));
    },
    [startAnalysis]
  );

  const handleReanalyze = useCallback(() => {
    if (!selectedGrant) return;
    sentForGrantRef.current = null;
    setMessages([]);
    // Re-trigger by clearing and re-setting activeGrantData
    setActiveGrantData(null);
    setTimeout(() => setActiveGrantData(selectedGrant), 0);
  }, [selectedGrant, setMessages]);

  const displayError = fetchError || (error ? error.message : null);

  return (
    <div className="mt-2 max-w-5xl mx-auto px-6">
      {/* Grant selector */}
      <Card className="p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">AI Grant Analysis</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Enter a Grants.gov opportunity ID or select a grant from your pipeline to generate a
          comprehensive analysis of how {profile.name || "your entity"} can best use this grant.
        </p>

        <form onSubmit={handleSubmit} className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-sm font-medium mb-1.5 block">
              Grant Opportunity ID
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. 352484"
                value={grantId}
                onChange={(e) => setGrantId(e.target.value)}
                disabled={isLoading}
                className="font-mono"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 h-9"
                onClick={() => setShowPipelineSelector(!showPipelineSelector)}
                disabled={isLoading || pipelineGrants.length === 0}
              >
                <ChevronDown className="h-4 w-4 mr-1" />
                Pipeline
              </Button>
            </div>
          </div>
          <Button type="submit" disabled={isLoading || !grantId.trim()}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Analyze Grant
              </>
            )}
          </Button>
        </form>

        {/* Pipeline grant selector dropdown */}
        {showPipelineSelector && pipelineGrants.length > 0 && (
          <div className="mt-3 border rounded-lg max-h-60 overflow-y-auto">
            {pipelineGrants.map((g) => (
              <button
                key={g.id}
                type="button"
                className="w-full text-left px-4 py-3 hover:bg-muted/50 border-b last:border-b-0 transition-colors"
                onClick={() => selectPipelineGrant(g)}
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{g.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {g.agency} &middot; ID: {g.id}
                    </p>
                  </div>
                  <Badge variant="outline" className="ml-3 shrink-0 text-xs">
                    {g.stage}
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* Error */}
      {displayError && (
        <Card className="p-4 mb-6 border-destructive/50 bg-destructive/5">
          <p className="text-sm text-destructive">{displayError}</p>
        </Card>
      )}

      {/* Loading grant details */}
      {fetchingGrant && (
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Fetching grant details...</span>
          </div>
        </Card>
      )}

      {/* Grant info header */}
      {selectedGrant && !fetchingGrant && (
        <Card className="p-5 mb-6 bg-muted/30">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-base mb-1">
                {selectedGrant.title}
              </h3>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" />
                  {selectedGrant.agency}
                </span>
                {selectedGrant.awardCeiling > 0 && (
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3.5 w-3.5" />
                    Up to ${(selectedGrant.awardCeiling / 1_000_000).toFixed(1)}M
                  </span>
                )}
                {selectedGrant.closeDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    Closes{" "}
                    {new Date(selectedGrant.closeDate).toLocaleDateString()}
                  </span>
                )}
                {selectedGrant.applicationUrl && (
                  <a
                    href={selectedGrant.applicationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    View on Grants.gov
                  </a>
                )}
              </div>
            </div>
            {!isLoading && analysisText && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleReanalyze}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Re-analyze
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Analysis content */}
      {(isLoading || analysisText) && (
        <Card className="mb-6">
          <div
            ref={contentRef}
            className="p-6 max-h-[70vh] overflow-y-auto prose prose-sm dark:prose-invert max-w-none"
          >
            {analysisText ? (
              <MarkdownRenderer content={analysisText} />
            ) : (
              <div className="flex items-center gap-3 text-muted-foreground py-8 justify-center">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">
                  Researching and generating analysis...
                </span>
              </div>
            )}
          </div>
          {isLoading && analysisText && (
            <div className="px-6 pb-4 flex items-center gap-2 text-muted-foreground border-t pt-3">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-xs">Still generating...</span>
            </div>
          )}
        </Card>
      )}

      {/* Empty state */}
      {!isLoading && !analysisText && !displayError && !selectedGrant && (
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            <Sparkles className="h-10 w-10 mx-auto mb-4 opacity-40" />
            <h3 className="font-medium text-foreground mb-2">
              Select a Grant to Analyze
            </h3>
            <p className="text-sm max-w-md mx-auto">
              Enter a Grants.gov opportunity ID or choose from your pipeline
              grants above. The AI will analyze the grant&apos;s fit with{" "}
              {profile.name || "your entity"}&apos;s profile, projects, and
              strategic priorities.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
