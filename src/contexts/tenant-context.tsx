"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import type { Environment } from "@/lib/db/tenant-config";
import { EMBEDDING_DIMENSIONS, EMBEDDING_SERVICE } from "@/lib/db/tenant-config";

type PortEntry = { id: string; name: string; slug: string };

export interface TenantContextValue {
  environment: Environment;
  portId: string;
  portSlug: string;
  portName: string;
  embeddingDimensions: number;
  embeddingService: "openai" | "ec2";
  setEnvironment: (env: Environment) => void;
  setPort: (portId: string) => void;
  availablePorts: PortEntry[];
  isLoading: boolean;
  refreshPorts: () => void;
}

const TenantContext = createContext<TenantContextValue | null>(null);

const STORAGE_KEY = "corvo_tenant_config";

interface StoredConfig {
  environment: Environment;
  portId: string;
  portSlug: string;
}

const DEFAULT_CONFIG: StoredConfig = {
  environment: "demo",
  portId: "freeport",
  portSlug: "port-freeport",
};

function syncTenantCookies(config: StoredConfig) {
  const maxAge = 60 * 60 * 24 * 365;
  const opts = `path=/; max-age=${maxAge}; SameSite=Lax`;
  document.cookie = `corvo-port-id=${encodeURIComponent(config.portId)}; ${opts}`;
  document.cookie = `corvo-port-slug=${encodeURIComponent(config.portSlug)}; ${opts}`;
  document.cookie = `corvo-environment=${encodeURIComponent(config.environment)}; ${opts}`;
}

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [config, setConfig] = useState<StoredConfig>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [ports, setPorts] = useState<PortEntry[]>([]);

  const isAdmin = session?.user?.role === "admin";
  const userPortId = session?.user?.portId;

  // Fetch ports from API (includes DB-persisted dynamic entities)
  const refreshPorts = useCallback(async () => {
    try {
      const res = await fetch("/api/ports");
      if (res.ok) {
        const data = await res.json();
        if (data.ports?.length) setPorts(data.ports);
      }
    } catch {
      // Fall back to static ports
    }
  }, []);

  // Load config from localStorage on mount (for admin env preference)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<StoredConfig>;
        setConfig({
          environment: parsed.environment || DEFAULT_CONFIG.environment,
          portId: parsed.portId || DEFAULT_CONFIG.portId,
          portSlug: parsed.portSlug || DEFAULT_CONFIG.portSlug,
        });
      }
    } catch {
      // Ignore parse errors, use defaults
    }
    setIsLoading(false);
    refreshPorts();
  }, [refreshPorts]);

  // Non-admin users: force port from session assignment
  useEffect(() => {
    if (userPortId && !isAdmin) {
      const port = ports.find((p) => p.id === userPortId);
      if (port) {
        setConfig((prev) => ({
          ...prev,
          portId: port.id,
          portSlug: port.slug,
        }));
      } else {
        // Port might be a dynamic one not yet in the static list — use portId directly
        setConfig((prev) => ({
          ...prev,
          portId: userPortId,
          portSlug: userPortId,
        }));
      }
    }
  }, [userPortId, isAdmin, ports]);

  // Save config to localStorage and cookies when it changes
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      syncTenantCookies(config);
    }
  }, [config, isLoading]);

  const setEnvironment = useCallback((env: Environment) => {
    if (!isAdmin) return; // Only admins can change environment
    setConfig((prev) => ({ ...prev, environment: env }));
  }, [isAdmin]);

  const setPort = useCallback((portId: string) => {
    if (!isAdmin) return; // Only admins can switch ports
    const port = ports.find((p) => p.id === portId);
    if (port) {
      setConfig((prev) => ({
        ...prev,
        portId: port.id,
        portSlug: port.slug,
      }));
    }
  }, [isAdmin, ports]);

  const portInfo = ports.find((p) => p.id === config.portId) || ports[0];

  const value: TenantContextValue = useMemo(() => ({
    environment: config.environment,
    portId: config.portId,
    portSlug: config.portSlug,
    portName: portInfo?.name || config.portId,
    embeddingDimensions: EMBEDDING_DIMENSIONS[config.environment],
    embeddingService: EMBEDDING_SERVICE[config.environment],
    setEnvironment,
    setPort,
    availablePorts: ports,
    isLoading,
    refreshPorts,
  }), [config, portInfo, setEnvironment, setPort, ports, isLoading, refreshPorts]);

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant(): TenantContextValue {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error("useTenant must be used within a TenantProvider");
  }
  return context;
}

/**
 * Hook to get headers for API requests with tenant info.
 * Auth is now handled via session cookies automatically.
 */
export function useTenantHeaders(): Record<string, string> {
  const tenant = useTenant();
  return useMemo(
    () => ({
      "x-corvo-environment": tenant.environment,
      "x-corvo-port-id": tenant.portId,
      "x-corvo-port-slug": tenant.portSlug,
    }),
    [tenant.environment, tenant.portId, tenant.portSlug]
  );
}
