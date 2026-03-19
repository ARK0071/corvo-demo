"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Settings, Key, Database, Bell, Shield, Building2 } from "lucide-react";
import { useProfile } from "@/components/profile-provider";

export default function SettingsPage() {
  const { profile, profileId, setProfileId, allProfiles } = useProfile();

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
          {/* Client Profile Selector */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Client Profile</h2>
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

          {/* API Keys */}
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
                <span className="text-sm text-muted-foreground">Sample Dataset (in-memory)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Last Sync</span>
                <span className="text-sm text-muted-foreground">Real-time</span>
              </div>
            </div>
          </Card>

          {/* Notifications */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Notifications</h2>
            </div>
            <div className="space-y-3">
              {["Contract expiration alerts", "Spending anomaly detection", "Price benchmark updates", "HITL queue assignments"].map((item) => (
                <div key={item} className="flex items-center justify-between">
                  <span className="text-sm">{item}</span>
                  <Badge variant="secondary" className="text-[10px]">Enabled</Badge>
                </div>
              ))}
            </div>
          </Card>

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
