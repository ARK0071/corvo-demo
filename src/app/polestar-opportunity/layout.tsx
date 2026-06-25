import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Partner path · Corvo",
  description: "Partner–port–grant intelligence for Pole Star Defense and Port Freeport.",
};

export default function PolestarOpportunityLayout({ children }: { children: ReactNode }) {
  return children;
}
