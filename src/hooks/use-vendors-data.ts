"use client";

import { useState, useCallback, useEffect } from "react";
import type { PortVendor } from "@/data/port-vendors";

export interface UseVendorsDataResult {
  vendors: PortVendor[];
  loading: boolean;
  syncing: boolean;
  error: string | null;
  lastSyncTime: Date | null;
  searchVendors: (params: {
    focusAreas?: string[];
    eligibleActivities?: string[];
    maxPages?: number;
  }) => Promise<PortVendor[]>;
  syncVendors: (
    vendors: PortVendor[],
    generateEmbeddings?: boolean
  ) => Promise<{ success: boolean; recordsUpdated: number }>;
  refreshSyncStatus: () => Promise<void>;
}

export function useVendorsData(): UseVendorsDataResult {
  const [vendors, setVendors] = useState<PortVendor[]>([]);
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
      const res = await fetch("/api/sync/vendors");
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

  // Search vendors from SAM.gov API
  const searchVendors = useCallback(
    async (params: {
      focusAreas?: string[];
      eligibleActivities?: string[];
      maxPages?: number;
    }): Promise<PortVendor[]> => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/sam-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            focusAreas: params.focusAreas,
            eligibleActivities: params.eligibleActivities,
            maxPages: params.maxPages || 5,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to search vendors");
        }

        const data = (await res.json()) as {
          vendors: PortVendor[];
          totalRecords: number;
        };
        setVendors(data.vendors);
        return data.vendors;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
        return [];
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Sync vendors to database
  const syncVendors = useCallback(
    async (
      vendorsToSync: PortVendor[],
      generateEmbeddings: boolean = false
    ): Promise<{ success: boolean; recordsUpdated: number }> => {
      setSyncing(true);
      setError(null);

      try {
        const res = await fetch("/api/sync/vendors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vendors: vendorsToSync,
            generateEmbeddings,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Sync failed");
        }

        const data = await res.json();

        if (data.success) {
          setLastSyncTime(new Date());
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
    []
  );

  return {
    vendors,
    loading,
    syncing,
    error,
    lastSyncTime,
    searchVendors,
    syncVendors,
    refreshSyncStatus,
  };
}
