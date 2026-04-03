"use client";

import { useState, useEffect, useCallback } from "react";
import { useTenantHeaders, useTenant } from "@/contexts/tenant-context";

export interface UseDBDataOptions<T> {
  /** API endpoint path (e.g., "/api/awards") */
  endpoint: string;
  /** Initial data to use while loading */
  initialData?: T;
  /** Whether to fetch on mount */
  fetchOnMount?: boolean;
  /** Transform function for the response data */
  transform?: (data: any) => T;
}

export interface UseDBDataResult<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  lastSynced: Date | null;
  refresh: () => Promise<void>;
  mutate: (newData: T) => void;
}

/**
 * Hook for loading data from the database via API routes with tenant context.
 * Provides a "database-first" pattern where data is loaded from the DB on mount,
 * with the ability to refresh from external APIs.
 */
export function useDBData<T>({
  endpoint,
  initialData,
  fetchOnMount = true,
  transform,
}: UseDBDataOptions<T>): UseDBDataResult<T> {
  const [data, setData] = useState<T | null>(initialData ?? null);
  const [isLoading, setIsLoading] = useState(fetchOnMount);
  const [error, setError] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  const tenantHeaders = useTenantHeaders();
  const tenant = useTenant();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(endpoint, {
        headers: {
          ...tenantHeaders,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to fetch from ${endpoint}`);
      }

      const responseData = await res.json();
      const transformedData = transform ? transform(responseData) : responseData;
      setData(transformedData);
      setLastSynced(new Date());
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      console.error(`[useDBData] Error fetching ${endpoint}:`, message);
    } finally {
      setIsLoading(false);
    }
  }, [endpoint, tenantHeaders, transform]);

  // Re-fetch when tenant context changes
  useEffect(() => {
    if (fetchOnMount && !tenant.isLoading) {
      fetchData();
    }
  }, [fetchOnMount, tenant.isLoading, tenant.environment, tenant.portId]);

  const mutate = useCallback((newData: T) => {
    setData(newData);
  }, []);

  return {
    data,
    isLoading,
    error,
    lastSynced,
    refresh: fetchData,
    mutate,
  };
}

/**
 * Hook for making POST/PUT/DELETE requests with tenant context
 */
export function useDBMutation<TRequest, TResponse = any>() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tenantHeaders = useTenantHeaders();

  const mutate = useCallback(
    async (
      endpoint: string,
      method: "POST" | "PUT" | "DELETE",
      body?: TRequest
    ): Promise<TResponse | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch(endpoint, {
          method,
          headers: {
            ...tenantHeaders,
            "Content-Type": "application/json",
          },
          body: body ? JSON.stringify(body) : undefined,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Request failed`);
        }

        return await res.json();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        console.error(`[useDBMutation] Error:`, message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [tenantHeaders]
  );

  return {
    mutate,
    isLoading,
    error,
    clearError: () => setError(null),
  };
}

/**
 * Hook specifically for Awards data
 */
export function useAwards() {
  return useDBData<{
    awards: any[];
    total: number;
  }>({
    endpoint: "/api/awards",
    initialData: { awards: [], total: 0 },
    transform: (data) => ({
      awards: data.awards || [],
      total: data.total || 0,
    }),
  });
}

/**
 * Hook specifically for Projects data
 */
export function useProjects() {
  return useDBData<{
    projects: any[];
    total: number;
  }>({
    endpoint: "/api/projects",
    initialData: { projects: [], total: 0 },
    transform: (data) => ({
      projects: data.projects || [],
      total: data.total || 0,
    }),
  });
}

/**
 * Hook specifically for Pipeline Grants data
 */
export function usePipelineGrants() {
  return useDBData<{
    grants: any[];
    total: number;
  }>({
    endpoint: "/api/pipeline",
    initialData: { grants: [], total: 0 },
    transform: (data) => ({
      grants: data.grants || [],
      total: data.total || 0,
    }),
  });
}
