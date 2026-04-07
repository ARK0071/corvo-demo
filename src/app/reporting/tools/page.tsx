"use client";

import { useState, useEffect, useCallback } from "react";
import { BarChart3, ClipboardCheck, Sparkles, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTenantHeaders, useTenant } from "@/contexts/tenant-context";
import SEFAView from "../components/SEFAView";
import CloseoutView from "../components/CloseoutView";

interface Award {
  id: string;
  program: string;
  title: string;
  status: string;
}

export default function ToolsPage() {
  const headers = useTenantHeaders();
  const tenant = useTenant();
  const [awards, setAwards] = useState<Award[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSEFA, setShowSEFA] = useState(false);
  const [showCloseout, setShowCloseout] = useState<string | null>(null);
  const [, setRefresh] = useState(0);

  useEffect(() => {
    if (tenant.isLoading) return;
    (async () => {
      try {
        const res = await fetch("/api/awards", { headers: { ...headers, "Content-Type": "application/json" } });
        if (res.ok) {
          const data = await res.json();
          setAwards(data.awards || data || []);
        }
      } catch { /* */ }
      setLoading(false);
    })();
  }, [tenant.isLoading, tenant.portId]);

  if (showSEFA) {
    return <SEFAView onBack={() => setShowSEFA(false)} />;
  }

  if (showCloseout) {
    return <CloseoutView awardId={showCloseout} onBack={() => setShowCloseout(null)} onRefresh={() => setRefresh((n) => n + 1)} />;
  }

  if (loading) {
    return <div className="flex-1 flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  const closeoutAwards = awards.filter((a) => a.status === "closeout_pending");

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reporting Tools</h1>
        <p className="text-sm text-muted-foreground mt-1">SEFA generation, closeout workflows, and compliance review</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setShowSEFA(true)}>
          <CardContent className="pt-6 pb-6 text-center">
            <BarChart3 className="h-8 w-8 mx-auto text-[#3d8b8b] mb-2" />
            <h3 className="font-semibold">Generate SEFA</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Schedule of Expenditures of Federal Awards for audit purposes.
            </p>
          </CardContent>
        </Card>

        {closeoutAwards.map((award) => (
          <Card
            key={award.id}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setShowCloseout(award.id)}
          >
            <CardContent className="pt-6 pb-6 text-center">
              <ClipboardCheck className="h-8 w-8 mx-auto text-amber-500 mb-2" />
              <h3 className="font-semibold">Closeout: {award.program}</h3>
              <p className="text-sm text-muted-foreground mt-1 truncate">{award.title}</p>
            </CardContent>
          </Card>
        ))}

        <Card className="opacity-60">
          <CardContent className="pt-6 pb-6 text-center">
            <Sparkles className="h-8 w-8 mx-auto text-purple-400 mb-2" />
            <h3 className="font-semibold">AI Compliance Review</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Claude reviews reports for consistency and compliance before submission.
            </p>
            <Badge variant="outline" className="mt-2 text-[10px]">Coming Soon</Badge>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
