"use client";

import { Anchor } from "lucide-react";
import { usePorterPanel } from "@/contexts/porter-context";

export function PorterFab() {
  const { toggle, isOpen } = usePorterPanel();

  if (isOpen) return null;

  return (
    <button
      onClick={toggle}
      className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-transform hover:scale-105 hover:shadow-xl active:scale-95"
      aria-label="Open Porter AI assistant"
    >
      <Anchor className="h-5 w-5" />
    </button>
  );
}
