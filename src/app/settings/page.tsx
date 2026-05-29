"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Settings, Key, Database, Bell, Shield, Building2, Server, Globe, Lock, Mail } from "lucide-react";
import { useProfile } from "@/components/profile-provider";
import { useTenant } from "@/contexts/tenant-context";
import { useSession } from "next-auth/react";
import type { Environment } from "@/lib/db/tenant-config";

const ENVIRONMENT_INFO: Record<Environment, { label: string; description: string; color: string }> = {
  test: {
    label: "Test",
    description: "Shared test environment for development. EC2 embeddings (2560 dims).",
    color: "bg-yellow-500/10 text-yellow-600",
  },
  demo: {
    label: "Demo",
    description:
      "Uses demo_* tables with OpenAI embeddings (1536 dims). Pick the active port under Demo session port.",
    color: "bg-blue-500/10 text-blue-600",
  },
  production: {
    label: "Production",
    description: "Live production environment. EC2 embeddings (2560 dims). Isolated tables per client.",
    color: "bg-green-500/10 text-green-600",
  },
};

export default function SettingsPage() {
  const { profile, profileId, setProfileId, allProfiles } = useProfile();
  const tenant = useTenant();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Settings className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
            <p className="text-sm text-muted-foreground">Configuration and integrations</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Client Profile Selector — admin only */}
          {isAdmin ? (
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Client Profile</h2>
                <Badge className="bg-amber-500/10 text-amber-600 text-[10px] ml-auto">Admin</Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Select the active entity profile. This controls grant eligibility scoring, alignment matching, and competitiveness analysis across the platform.
              </p>
              <div className="space-y-2">
                {allProfiles.map(({ id, profile: p }) => (
                  <button
                    key={id}
                    onClick={() => setProfileId(id)}
                    className={`w-full flex items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors ${
                      id === profileId
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground/30 hover:bg-muted/50"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{p.name}</span>
                        {id === profileId && (
                          <Badge className="bg-primary/10 text-primary text-[10px]">Active</Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {p.classification} &middot; {p.location.city}, {p.location.stateCode}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">{p.entityType}</span>
                  </button>
                ))}
              </div>
            </Card>
          ) : (
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Your Organization</h2>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">
                  You are assigned to <span className="font-medium text-foreground">{tenant.portName}</span>.
                  Contact an administrator to change your organization.
                </span>
              </div>
            </Card>
          )}

          {/* Environment Selector — admin only */}
          {isAdmin && (
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Server className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Environment</h2>
                <Badge className="bg-amber-500/10 text-amber-600 text-[10px] ml-auto">Admin</Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Select the database environment. Demo uses OpenAI embeddings for presentations. Test and production use EC2 Qwen3 embeddings.
              </p>
              <div className="space-y-2">
                {(["test", "demo", "production"] as Environment[]).map((env) => {
                  const info = ENVIRONMENT_INFO[env];
                  return (
                    <button
                      key={env}
                      onClick={() => tenant.setEnvironment(env)}
                      className={`w-full flex items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors ${
                        env === tenant.environment
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-muted-foreground/30 hover:bg-muted/50"
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{info.label}</span>
                          {env === tenant.environment && (
                            <Badge className="bg-primary/10 text-primary text-[10px]">Active</Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">{info.description}</span>
                      </div>
                      <Badge className={`${info.color} text-[10px]`}>{tenant.embeddingDimensions} dims</Badge>
                    </button>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Port selector — only when using Demo DB (demo_* tables). Production/Test resolve the same port list via API headers. */}
          {isAdmin && tenant.environment === "demo" && (
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Demo session port</h2>
                <Badge className="bg-amber-500/10 text-amber-600 text-[10px] ml-auto">Admin</Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Only applies when Environment is <span className="font-medium text-foreground">Demo</span>. This sets which port’s rows are loaded from the demo tables (filtered by port ID).{" "}
                <span className="font-medium text-foreground">Client Profile</span> above is separate—it drives static profile content for scoring and UI. For production-style data (shared{" "}
                <code className="text-[10px]">port_profiles</code> tables), switch Environment to Production and ensure your tenant port ID matches the profile (e.g.{" "}
                <code className="text-[10px]">freeport-mock</code>).
              </p>
              <div className="space-y-2">
                {tenant.availablePorts.map((port) => (
                  <button
                    key={port.id}
                    onClick={() => tenant.setPort(port.id)}
                    className={`w-full flex items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors ${
                      port.id === tenant.portId
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground/30 hover:bg-muted/50"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{port.name}</span>
                        {port.id === tenant.portId && (
                          <Badge className="bg-primary/10 text-primary text-[10px]">Active</Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">{port.slug}</span>
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          )}

          {/* Active Profile Details */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Active Profile Details</h2>
              <Badge variant="secondary" className="text-[10px] ml-auto">{profile.classification}</Badge>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Entity</span>
                <span className="text-sm text-muted-foreground">{profile.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Location</span>
                <span className="text-sm text-muted-foreground">{profile.location.city}, {profile.location.state}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Region</span>
                <span className="text-sm text-muted-foreground">{profile.location.region}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Operating Budget</span>
                <span className="text-sm text-muted-foreground">
                  {profile.characteristics.operatingBudget
                    ? `$${(profile.characteristics.operatingBudget / 1_000_000).toFixed(0)}M`
                    : "N/A"}
                </span>
              </div>
              <div className="mt-3">
                <span className="text-xs font-medium text-muted-foreground block mb-2">Priorities</span>
                <div className="flex flex-wrap gap-1.5">
                  {profile.priorities.slice(0, 6).map((p) => (
                    <Badge key={p} variant="secondary" className="text-[10px]">{p}</Badge>
                  ))}
                  {profile.priorities.length > 6 && (
                    <Badge variant="secondary" className="text-[10px]">+{profile.priorities.length - 6} more</Badge>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* API Keys — admin only */}
          {isAdmin && (
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Key className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">API Keys</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5">Anthropic API Key</label>
                  <div className="flex gap-2">
                    <Input type="password" value="sk-ant-api03-••••••••••••" readOnly className="text-sm font-mono" />
                    <Button variant="outline" size="sm">Update</Button>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5">Brave Search API Key</label>
                  <div className="flex gap-2">
                    <Input type="password" value="BSA••••••••••••" readOnly className="text-sm font-mono" />
                    <Button variant="outline" size="sm">Update</Button>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Data Source */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Database className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Data Source</h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Connection</span>
                <Badge className="bg-green-500/10 text-green-600">Connected</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Database</span>
                <span className="text-sm text-muted-foreground">AWS RDS PostgreSQL</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Environment</span>
                <Badge className={ENVIRONMENT_INFO[tenant.environment].color + " text-[10px]"}>
                  {ENVIRONMENT_INFO[tenant.environment].label}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Embedding Service</span>
                <span className="text-sm text-muted-foreground">
                  {tenant.embeddingService === "openai" ? "OpenAI text-embedding-3-small" : "EC2 Qwen3"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Embedding Dimensions</span>
                <span className="text-sm text-muted-foreground">{tenant.embeddingDimensions}</span>
              </div>
              {tenant.environment === "demo" && (
                <div className="flex items-center justify-between">
                  <span className="text-sm">Port ID</span>
                  <span className="text-sm text-muted-foreground">{tenant.portId}</span>
                </div>
              )}
            </div>
          </Card>

          {/* Email Alerts */}
          <EmailAlertsCard />

          {/* Security */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Security</h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Prompt injection protection</span>
                <Badge className="bg-green-500/10 text-green-600">Active</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Rate limiting</span>
                <span className="text-sm text-muted-foreground">20 req/min per IP</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Max message length</span>
                <span className="text-sm text-muted-foreground">4,000 characters</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

const EMAIL_ALERT_OPTIONS = [
  { key: "reportDeadlines", label: "Report deadline reminders", description: "Get notified 7 and 3 days before SF-425 and other report due dates" },
  { key: "grantDeadlines", label: "Grant application deadlines", description: "Alerts for upcoming grant submission deadlines in your pipeline" },
  { key: "budgetAlerts", label: "Budget threshold alerts", description: "Notify when a budget category exceeds 80% or 95% of its ceiling" },
  { key: "drawdownReminders", label: "Drawdown reminders", description: "Periodic reminders to submit drawdown requests for eligible expenses" },
  { key: "matchTracking", label: "Match requirement alerts", description: "Alerts when cost-share match falls behind pace" },
];

function EmailAlertsCard() {
  const [alerts, setAlerts] = useState<Record<string, boolean>>({
    reportDeadlines: true,
    grantDeadlines: true,
    budgetAlerts: true,
    drawdownReminders: false,
    matchTracking: false,
  });
  const [saved, setSaved] = useState(false);

  const toggle = (key: string) => {
    setAlerts((prev) => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  };

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-1">
        <Mail className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">Email Alerts</h2>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Configure which deadline and compliance notifications you receive via email.
      </p>
      <div className="space-y-3">
        {EMAIL_ALERT_OPTIONS.map((opt) => (
          <div key={opt.key} className="flex items-start justify-between gap-4">
            <div>
              <span className="text-sm">{opt.label}</span>
              <p className="text-xs text-muted-foreground">{opt.description}</p>
            </div>
            <button
              onClick={() => toggle(opt.key)}
              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${alerts[opt.key] ? "bg-[#3d8b8b]" : "bg-muted"}`}
            >
              <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${alerts[opt.key] ? "translate-x-4.5" : "translate-x-0.5"}`} />
            </button>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-3 border-t flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Alerts sent to your account email address.
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setSaved(true)}
          className="text-xs"
        >
          {saved ? "Saved" : "Save Preferences"}
        </Button>
      </div>
    </Card>
  );
}
