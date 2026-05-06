"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function SystemConfigPage() {
  const [config, setConfig] = useState({
    sessionMaxAge: 28800,
    sessionUpdateAge: 3600,
    googleConfigured: false,
    microsoftConfigured: false,
    databaseConnected: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/system");
        if (res.ok) setConfig(await res.json());
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-xl font-semibold">System Configuration</h2>

      <section className="space-y-3">
        <h3 className="text-sm font-medium">OAuth Providers</h3>
        <div className="border rounded-lg divide-y">
          <ProviderRow name="Google" configured={config.googleConfigured} />
          <ProviderRow name="Microsoft" configured={config.microsoftConfigured} />
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium">Session Settings</h3>
        <div className="border rounded-lg p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Max session duration</span>
            <span className="font-mono">{Math.round(config.sessionMaxAge / 3600)}h</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Session refresh interval</span>
            <span className="font-mono">{Math.round(config.sessionUpdateAge / 60)}min</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Session settings are configured via environment variables (NEXTAUTH_SESSION_MAX_AGE).
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium">Database</h3>
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Badge variant={config.databaseConnected ? "default" : "destructive"}>
              {config.databaseConnected ? "Connected" : "Disconnected"}
            </Badge>
            <span className="text-sm">PostgreSQL</span>
          </div>
        </div>
      </section>
    </div>
  );
}

function ProviderRow({ name, configured }: { name: string; configured: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm">{name}</span>
      <Badge variant={configured ? "default" : "outline"}>
        {configured ? "Configured" : "Not Configured"}
      </Badge>
    </div>
  );
}
