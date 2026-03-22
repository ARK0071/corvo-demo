"use client";

import { useState, useCallback, useEffect } from "react";
import type { DiscoveredGrant } from "@/lib/grants-gov";

export interface UseGrantsDataResult {
  grants: DiscoveredGrant[];
  totalCount: number;
  loading: boolean;
  syncing: boolean;
  error: string | null;
  lastSyncTime: Date | null;
  searchGrants: (params: {
    keyword?: string;
    oppStatuses?: string[];
    rows?: number;
  }) => Promise<void>;
  syncFromApi: (params: {
    keyword?: string;
    oppStatuses?: string[];
    rows?: number;
    generateEmbeddings?: boolean;
  }) => Promise<{ success: boolean; recordsUpdated: number }>;
  refreshSyncStatus: () => Promise<void>;
}

export function useGrantsData(): UseGrantsDataResult {
  const [grants, setGrants] = useState<DiscoveredGrant[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Fetch last sync time on mount
  useEffect(() => {
    refreshSyncStatus();
  }, []);

  const refreshSyncStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/sync/grants");
      if (res.ok) {
        const data = await res.json();
        if (data.lastSync) {
          setLastSyncTime(new Date(data.lastSync));
        }
      }
    } catch {
      // Ignore errors for sync status
    }
  }, []);

  // Search grants - tries database first, falls back to API
  const searchGrants = useCallback(
    async (params: {
      keyword?: string;
      oppStatuses?: string[];
      rows?: number;
    }) => {
      setLoading(true);
      setError(null);

      try {
        // For now, use the existing API which will be updated to query DB
        const res = await fetch("/api/grants-search-enhanced", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            keyword: params.keyword?.trim(),
            oppStatuses:
              params.oppStatuses && params.oppStatuses.length > 0
                ? params.oppStatuses
                : undefined,
            rows: params.rows || 100,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to search grants");
        }

        const data = (await res.json()) as {
          grants: DiscoveredGrant[];
          totalCount: number;
        };
        setGrants(data.grants);
        setTotalCount(data.totalCount);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Sync grants from API to database
  const syncFromApi = useCallback(
    async (params: {
      keyword?: string;
      oppStatuses?: string[];
      rows?: number;
      generateEmbeddings?: boolean;
    }): Promise<{ success: boolean; recordsUpdated: number }> => {
      setSyncing(true);
      setError(null);

      try {
        const res = await fetch("/api/sync/grants", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            keyword: params.keyword?.trim(),
            oppStatuses: params.oppStatuses || ["posted", "forecasted"],
            rows: params.rows || 100,
            fetchDetails: true,
            generateEmbeddings: params.generateEmbeddings ?? false, // Default to false to avoid EC2 dependency
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Sync failed");
        }

        const data = await res.json();

        if (data.success) {
          setLastSyncTime(new Date());
          // Refresh the grants list after sync
          await searchGrants({
            keyword: params.keyword,
            oppStatuses: params.oppStatuses,
            rows: params.rows,
          });
        }

        return {
          success: data.success,
          recordsUpdated: data.recordsCreated + data.recordsUpdated,
        };
      } catch (err) {
        setError(err instanceof Error ? err.message : "Sync failed");
        return { success: false, recordsUpdated: 0 };
      } finally {
        setSyncing(false);
      }
    },
    [searchGrants]
  );

  return {
    grants,
    totalCount,
    loading,
    syncing,
    error,
    lastSyncTime,
    searchGrants,
    syncFromApi,
    refreshSyncStatus,
  };
}
