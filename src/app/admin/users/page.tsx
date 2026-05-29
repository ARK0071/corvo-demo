"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCurrentUser } from "@/contexts/user-context";

interface AdminUser {
  id: string;
  email: string;
  name: string;
  title: string;
  portId: string;
  role: string;
  active: boolean;
  lastLoginAt: string | null;
  loginCount: number;
  createdAt: string;
}

const ROLES = ["drafter", "reviewer", "certifying_official", "moderator", "admin"];
const PORTS = [
  { id: "freeport", name: "Port Freeport" },
  { id: "lawa", name: "Los Angeles World Airports" },
  { id: "louisiana-gateway", name: "Louisiana Gateway" },
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const toggleActive = async (userId: string, active: boolean) => {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active }),
    });
    if (res.ok) fetchUsers();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">User Management</h2>
        <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? "Cancel" : "Create User"}
        </Button>
      </div>

      {showCreate && (
        <CreateUserForm onCreated={() => { setShowCreate(false); fetchUsers(); }} />
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Name</th>
                <th className="text-left px-4 py-2 font-medium">Email</th>
                <th className="text-left px-4 py-2 font-medium">Port</th>
                <th className="text-left px-4 py-2 font-medium">Role</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
                <th className="text-left px-4 py-2 font-medium">Last Login</th>
                <th className="text-right px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="px-4 py-2 font-medium">{u.name}</td>
                  <td className="px-4 py-2 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-2">{u.portId}</td>
                  <td className="px-4 py-2">
                    <Badge variant="outline" className="text-[10px]">{u.role}</Badge>
                  </td>
                  <td className="px-4 py-2">
                    <Badge variant={u.active ? "default" : "destructive"} className="text-[10px]">
                      {u.active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground text-xs">
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : "Never"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => toggleActive(u.id, u.active)}
                    >
                      {u.active ? "Deactivate" : "Activate"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CreateUserForm({ onCreated }: { onCreated: () => void }) {
  const { user, isModerator } = useCurrentUser();
  const [form, setForm] = useState({
    email: "",
    name: "",
    title: "",
    portId: isModerator && user ? user.portId : "freeport",
    role: "drafter",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Moderators can only assign non-privileged roles
  const availableRoles = isModerator
    ? ROLES.filter((r) => r !== "admin" && r !== "moderator")
    : ROLES;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      onCreated();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to create user");
    }
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="border rounded-lg p-4 space-y-3 max-w-md">
      <div>
        <label className="text-xs font-medium">Email *</label>
        <input
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          className="mt-1 w-full px-3 py-1.5 border rounded-md text-sm"
        />
      </div>
      <div>
        <label className="text-xs font-medium">Name *</label>
        <input
          type="text"
          required
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="mt-1 w-full px-3 py-1.5 border rounded-md text-sm"
        />
      </div>
      <div>
        <label className="text-xs font-medium">Title</label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          className="mt-1 w-full px-3 py-1.5 border rounded-md text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {isModerator ? (
          <div>
            <label className="text-xs font-medium">Entity</label>
            <p className="mt-1 px-3 py-1.5 border rounded-md text-sm bg-muted text-muted-foreground">
              {user?.portId || "—"}
            </p>
          </div>
        ) : (
          <div>
            <label className="text-xs font-medium">Port *</label>
            <select
              value={form.portId}
              onChange={(e) => setForm((f) => ({ ...f, portId: e.target.value }))}
              className="mt-1 w-full px-3 py-1.5 border rounded-md text-sm"
            >
              {PORTS.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="text-xs font-medium">Role *</label>
          <select
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
            className="mt-1 w-full px-3 py-1.5 border rounded-md text-sm"
          >
            {availableRoles.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button type="submit" size="sm" disabled={saving}>
        {saving ? "Creating..." : "Create User"}
      </Button>
    </form>
  );
}
