"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Copy, Trash2, Download, FileText } from "lucide-react";

interface GrantDraft {
  id: string;
  grantId: string;
  grantTitle: string;
  content: string;
  createdAt: string;
}

interface GrantDraftViewProps {
  initialGrantId?: string;
  initialGrantTitle?: string;
}

export function GrantDraftView({ initialGrantId, initialGrantTitle }: GrantDraftViewProps) {
  const [drafts, setDrafts] = useState<GrantDraft[]>([]);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const contentRef = useRef<HTMLDivElement>(null);

  // Load drafts from session storage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem("grantDrafts");
    if (stored) {
      try {
        const parsedDrafts = JSON.parse(stored);
        setDrafts(parsedDrafts);
      } catch (e) {
        console.error("Failed to parse stored drafts:", e);
      }
    }
  }, []);

  // Auto-generate if coming from Draft Grant button
  useEffect(() => {
    if (initialGrantId && initialGrantTitle && !isGenerating) {
      // Check if draft already exists for this grant
      const existing = drafts.find(d => d.grantId === initialGrantId);
      if (existing) {
        setSelectedDraftId(existing.id);
      } else {
        handleGenerateDraft(initialGrantId, initialGrantTitle);
      }
    }
  }, [initialGrantId, initialGrantTitle]);

  // Save drafts to session storage whenever they change
  useEffect(() => {
    if (drafts.length > 0) {
      sessionStorage.setItem("grantDrafts", JSON.stringify(drafts));
    }
  }, [drafts]);

  async function handleGenerateDraft(grantId: string, grantTitle: string) {
    setIsGenerating(true);
    setStreamingContent("");

    const newDraft: GrantDraft = {
      id: `draft-${Date.now()}`,
      grantId,
      grantTitle,
      content: "",
      createdAt: new Date().toISOString(),
    };

    try {
      const res = await fetch("/api/build-grant-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grantId,
          portName: "Port Freeport"
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to generate draft");
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let lastUpdateTime = 0;
      const UPDATE_INTERVAL = 100; // Update every 100ms max

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          accumulated += chunk;

          // Throttle updates to avoid overwhelming the DOM
          const now = performance.now();
          if (now - lastUpdateTime >= UPDATE_INTERVAL) {
            if (contentRef.current) {
              contentRef.current.innerHTML = accumulated;
            }
            lastUpdateTime = now;
          }
        }
      }

      // Final update to ensure all content is displayed
      if (contentRef.current) {
        contentRef.current.innerHTML = accumulated;
      }

      // Save completed draft
      newDraft.content = accumulated;
      setDrafts(prev => [newDraft, ...prev]);
      setSelectedDraftId(newDraft.id);
      setStreamingContent("");

      // Draft generated successfully
    } catch (error) {
      alert(`Error generating draft: ${error instanceof Error ? error.message : "An error occurred"}`);
    } finally {
      setIsGenerating(false);
    }
  }

  function handleCopyDraft(content: string) {
    navigator.clipboard.writeText(content);
    // Copied to clipboard
  }

  function handleDeleteDraft(draftId: string) {
    if (!confirm("Are you sure you want to delete this draft?")) return;

    const newDrafts = drafts.filter(d => d.id !== draftId);
    setDrafts(newDrafts);
    if (selectedDraftId === draftId) {
      setSelectedDraftId(null);
    }
    sessionStorage.setItem("grantDrafts", JSON.stringify(newDrafts));
  }

  function handleDownloadDraft(draft: GrantDraft) {
    const blob = new Blob([draft.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `grant-application-${draft.grantTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const selectedDraft = drafts.find(d => d.id === selectedDraftId);
  const displayContent = isGenerating ? streamingContent : selectedDraft?.content || "";

  return (
    <div className="flex-1 flex">
      {/* Sidebar - Draft List */}
      <div className="w-80 border-r flex flex-col bg-background">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-lg">Your Drafts</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Saved in this session
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {drafts.length === 0 && !isGenerating && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No drafts yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Click "Draft Grant" on any grant to create one
              </p>
            </div>
          )}

          {drafts.map(draft => (
            <Card
              key={draft.id}
              className={`p-3 cursor-pointer transition-colors ${
                selectedDraftId === draft.id ? "border-primary bg-muted/50" : "hover:bg-muted/30"
              }`}
              onClick={() => setSelectedDraftId(draft.id)}
            >
              <div className="font-medium text-sm line-clamp-2">{draft.grantTitle}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {new Date(draft.createdAt).toLocaleString()}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col bg-background">
        {isGenerating || selectedDraft ? (
          <>
            {/* Header */}
            <div className="p-6 border-b">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h1 className="text-2xl font-bold">
                    {selectedDraft?.grantTitle || "Generating Draft..."}
                  </h1>
                  {selectedDraft && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Created: {new Date(selectedDraft.createdAt).toLocaleString()}
                    </p>
                  )}
                </div>

                {selectedDraft && !isGenerating && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopyDraft(selectedDraft.content)}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownloadDraft(selectedDraft)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteDraft(selectedDraft.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Content Display */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-4xl mx-auto">
                {isGenerating && (
                  <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating grant application draft...
                  </div>
                )}

                <div className="relative">
                  <div
                    ref={isGenerating ? contentRef : null}
                    className={`grant-draft-content ${isGenerating ? 'streaming-cursor' : ''}`}
                    dangerouslySetInnerHTML={!isGenerating ? { __html: displayContent } : undefined}
                  />
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md">
              <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Draft Selected</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Select a draft from the sidebar or create a new one by clicking "Draft Grant" on any grant in the discovery or pipeline tabs.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
