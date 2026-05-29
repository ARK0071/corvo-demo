"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/contexts/user-context";

interface AuditEntry {
  id: string;
  action: string;
  userId: string | null;
  userName?: string;
  portId: string;
  ipAddress: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [filter, setFilter] = useState("");
  const { isModerator } = useCurrentUser();

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(page), limit: "50" });
        if (filter) params.set("action", filter);
        const res = await fetch(`/api/admin/audit-logs?${params}`);
        if (res.ok) {
          const data = await res.json();
          setLogs(data.logs || []);
          setHasMore(data.hasMore || false);
        }
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, [page, filter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Audit Logs</h2>
        <input
          type="text"
          placeholder="Filter by action..."
          value={filter}
          onChange={(e) => { setFilter(e.target.value); setPage(1); }}
          className="px-3 py-1.5 border rounded-md text-sm w-60"
        />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : (
        <>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Timestamp</th>
                  <th className="text-left px-4 py-2 font-medium">Action</th>
                  <th className="text-left px-4 py-2 font-medium">User</th>
                  {!isModerator && <th className="text-left px-4 py-2 font-medium">Port</th>}
                  <th className="text-left px-4 py-2 font-medium">IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-t">
                    <td className="px-4 py-2 text-xs text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-2">
                      <Badge variant="outline" className="text-[10px]">{log.action}</Badge>
                    </td>
                    <td className="px-4 py-2 text-xs">{log.userName || log.userId || "—"}</td>
                    {!isModerator && <td className="px-4 py-2 text-xs">{log.portId}</td>}
                    <td className="px-4 py-2 text-xs text-muted-foreground">{log.ipAddress || "—"}</td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr><td colSpan={isModerator ? 4 : 5} className="px-4 py-6 text-center text-muted-foreground">No audit logs found</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            <Button size="sm" variant="outline" disabled={!hasMore} onClick={() => setPage(page + 1)}>
              Next
            </Button>
            <span className="text-xs text-muted-foreground self-center">Page {page}</span>
          </div>
        </>
      )}
    </div>
  );
}
