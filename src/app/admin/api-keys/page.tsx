"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ApiKeyEntry {
  id: string;
  name: string;
  keyPrefix: string;
  active: boolean;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  user: { name: string; email: string };
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/api-keys");
      if (res.ok) {
        const data = await res.json();
        setKeys(data.keys || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  const revokeKey = async (id: string) => {
    if (!confirm("Revoke this API key? This cannot be undone.")) return;
    const res = await fetch(`/api/admin/api-keys/${id}`, { method: "DELETE" });
    if (res.ok) fetchKeys();
  };

  const createKey = async (name: string) => {
    const res = await fetch("/api/admin/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const data = await res.json();
      setNewKey(data.key); // Show the raw key once
      fetchKeys();
      setShowCreate(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">API Keys</h2>
        <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? "Cancel" : "Create Key"}
        </Button>
      </div>

      {newKey && (
        <div className="border border-green-300 bg-green-50 dark:bg-green-950 dark:border-green-800 rounded-lg p-4">
          <p className="text-sm font-medium mb-1">New API Key (copy now — it won&apos;t be shown again):</p>
          <code className="text-xs bg-background border px-2 py-1 rounded block break-all">{newKey}</code>
          <Button size="sm" variant="outline" className="mt-2" onClick={() => setNewKey(null)}>
            Dismiss
          </Button>
        </div>
      )}

      {showCreate && (
        <CreateKeyForm onCreated={createKey} />
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Name</th>
                <th className="text-left px-4 py-2 font-medium">Key</th>
                <th className="text-left px-4 py-2 font-medium">Owner</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
                <th className="text-left px-4 py-2 font-medium">Last Used</th>
                <th className="text-right px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id} className="border-t">
                  <td className="px-4 py-2 font-medium">{k.name}</td>
                  <td className="px-4 py-2 font-mono text-xs">{k.keyPrefix}...</td>
                  <td className="px-4 py-2 text-xs">{k.user.name}</td>
                  <td className="px-4 py-2">
                    <Badge variant={k.active ? "default" : "destructive"} className="text-[10px]">
                      {k.active ? "Active" : "Revoked"}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : "Never"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {k.active && (
                      <Button variant="ghost" size="sm" className="text-xs text-destructive" onClick={() => revokeKey(k.id)}>
                        Revoke
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {keys.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">No API keys</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CreateKeyForm({ onCreated }: { onCreated: (name: string) => void }) {
  const [name, setName] = useState("");

  return (
    <div className="border rounded-lg p-4 max-w-sm space-y-3">
      <div>
        <label className="text-xs font-medium">Key Name *</label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. CI/CD Pipeline"
          className="mt-1 w-full px-3 py-1.5 border rounded-md text-sm"
        />
      </div>
      <Button size="sm" disabled={!name.trim()} onClick={() => onCreated(name.trim())}>
        Generate Key
      </Button>
    </div>
  );
}
