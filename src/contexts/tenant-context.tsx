"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import type { Environment } from "@/lib/db/tenant-config";
import { AVAILABLE_PORTS, EMBEDDING_DIMENSIONS, EMBEDDING_SERVICE } from "@/lib/db/tenant-config";

export interface TenantContextValue {
  environment: Environment;
  portId: string;
  portSlug: string;
  portName: string;
  embeddingDimensions: number;
  embeddingService: "openai" | "ec2";
  setEnvironment: (env: Environment) => void;
  setPort: (portId: string) => void;
  availablePorts: typeof AVAILABLE_PORTS;
  isLoading: boolean;
}

const TenantContext = createContext<TenantContextValue | null>(null);

const STORAGE_KEY = "corvo_tenant_config";

interface StoredConfig {
  environment: Environment;
  portId: string;
  portSlug: string;
}

const DEFAULT_CONFIG: StoredConfig = {
  environment: "test",
  portId: "freeport",
  portSlug: "port-freeport",
};

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<StoredConfig>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);

  // Load config from localStorage on mount
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
  }, []);

  // Save config to localStorage when it changes
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    }
  }, [config, isLoading]);

  const setEnvironment = useCallback((env: Environment) => {
    setConfig((prev) => ({ ...prev, environment: env }));
  }, []);

  const setPort = useCallback((portId: string) => {
    const port = AVAILABLE_PORTS.find((p) => p.id === portId);
    if (port) {
      setConfig((prev) => ({
        ...prev,
        portId: port.id,
        portSlug: port.slug,
      }));
    }
  }, []);

  const portInfo = AVAILABLE_PORTS.find((p) => p.id === config.portId) || AVAILABLE_PORTS[0];

  const value: TenantContextValue = {
    environment: config.environment,
    portId: config.portId,
    portSlug: config.portSlug,
    portName: portInfo.name,
    embeddingDimensions: EMBEDDING_DIMENSIONS[config.environment],
    embeddingService: EMBEDDING_SERVICE[config.environment],
    setEnvironment,
    setPort,
    availablePorts: AVAILABLE_PORTS,
    isLoading,
  };

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
 * Hook to get headers for API requests with tenant info
 * Memoized to prevent infinite re-renders when used in useEffect/useCallback dependencies
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