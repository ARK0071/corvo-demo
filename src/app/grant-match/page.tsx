"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GrantMatchChat } from "@/components/grant-match/grant-match-chat";
import { GrantDraftView } from "@/components/grant-match/grant-draft-view";
import { MessageSquare, FileText } from "lucide-react";

function GrantIntelligenceInner() {
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  const grantId = searchParams.get("grantId");
  const grantTitle = searchParams.get("grantTitle");

  // Default to 'draft' tab if mode=draft in URL
  const [activeTab, setActiveTab] = useState(mode === "draft" ? "draft" : "chat");

  // Auto-switch to draft tab when navigating from Draft Grant button
  useEffect(() => {
    if (mode === "draft" && grantId) {
      setActiveTab("draft");
    }
  }, [mode, grantId]);

  return (
    <div className="flex-1 flex flex-col">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="border-b px-6 pt-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="chat" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Porter Chat
            </TabsTrigger>
            <TabsTrigger value="draft" className="gap-2">
              <FileText className="h-4 w-4" />
              Grant Drafts
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="chat" className="flex-1 mt-0">
          <GrantMatchChat />
        </TabsContent>

        <TabsContent value="draft" className="flex-1 mt-0">
          <GrantDraftView
            initialGrantId={grantId || undefined}
            initialGrantTitle={grantTitle || undefined}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function GrantMatchPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center">Loading...</div>}>
      <GrantIntelligenceInner />
    </Suspense>
  );
}
