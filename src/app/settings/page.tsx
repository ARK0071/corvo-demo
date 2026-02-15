"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Settings, Key, Database, Bell, Shield } from "lucide-react";

export default function SettingsPage() {
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
