"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePorterPanel } from "@/contexts/porter-context";

/**
 * Legacy /grant-match page — redirects to dashboard and opens Porter panel.
 * The Porter AI chat is now a global slide-out panel accessible from any page.
 */
export default function PorterAIPage() {
  const router = useRouter();
  const { open } = usePorterPanel();

  useEffect(() => {
    open();
    router.replace("/porter-dashboard");
  }, [open, router]);

  return null;
}
