"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { GrantDraftView } from "@/components/grant-match/grant-draft-view";

function DraftingInner() {
  const searchParams = useSearchParams();
  const grantId = searchParams.get("grantId");
  const grantTitle = searchParams.get("grantTitle");

  return (
    <div className="flex-1 flex flex-col">
      <GrantDraftView
        initialGrantId={grantId || undefined}
        initialGrantTitle={grantTitle || undefined}
      />
    </div>
  );
}

export default function DraftingPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center">Loading...</div>}>
      <DraftingInner />
    </Suspense>
  );
}
