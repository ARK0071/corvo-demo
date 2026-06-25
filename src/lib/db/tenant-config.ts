/**
 * Tenant Configuration for Multi-Port, Multi-Environment Database Access
 *
 * Environments:
 * - test: Shared test tables, EC2 Qwen3 embeddings (2560 dims)
 * - demo: Shared demo tables with portId filter, OpenAI embeddings (1536 dims)
 * - production: Per-port tables, EC2 Qwen3 embeddings (2560 dims)
 *
 * All port data comes from the database. No static/hardcoded port list.
 */

export type Environment = "test" | "demo" | "production";

export interface TenantConfig {
  environment: Environment;
  portId: string;
  portSlug: string;
}

// Ports registered at runtime (from DB via API routes or admin)
const registeredPorts: { id: string; name: string; slug: string }[] = [];

// Expose registered ports for server-side code that needs them
export const AVAILABLE_PORTS: readonly { id: string; name: string; slug: string }[] = registeredPorts;

// Add a port at runtime (called by admin entities route, etc.)
export function registerPort(port: { id: string; name: string; slug: string }): void {
  if (!registeredPorts.some((p) => p.id === port.id)) {
    registeredPorts.push(port);
  }
}

// Remove a port
export function unregisterPort(id: string): boolean {
  const idx = registeredPorts.findIndex((p) => p.id === id);
  if (idx !== -1) {
    registeredPorts.splice(idx, 1);
    return true;
  }
  return false;
}

export type PortId = string;

// Embedding dimensions by environment
export const EMBEDDING_DIMENSIONS: Record<Environment, number> = {
  test: 2560, // EC2 Qwen3
  demo: 1536, // OpenAI text-embedding-3-small
  production: 2560, // EC2 Qwen3
};

// Embedding service by environment
export const EMBEDDING_SERVICE: Record<Environment, "openai" | "ec2"> = {
  test: "ec2",
  demo: "openai",
  production: "ec2",
};

// Default configuration
const DEFAULT_CONFIG: TenantConfig = {
  environment: "demo",
  portId: "freeport-mock",
  portSlug: "freeport-mock",
};

// In-memory cache for server-side
let serverConfig: TenantConfig = { ...DEFAULT_CONFIG };

/**
 * Get current tenant configuration
 * On client: reads from localStorage
 * On server: uses in-memory cache or headers
 */
export function getTenantConfig(): TenantConfig {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("corvo_tenant_config");
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<TenantConfig>;
        return {
          environment: parsed.environment || DEFAULT_CONFIG.environment,
          portId: parsed.portId || DEFAULT_CONFIG.portId,
          portSlug: parsed.portSlug || DEFAULT_CONFIG.portSlug,
        };
      }
    } catch {
      // Ignore parse errors
    }
    return { ...DEFAULT_CONFIG };
  }

  return { ...serverConfig };
}

/**
 * Set tenant configuration
 */
export function setTenantConfig(config: Partial<TenantConfig>): TenantConfig {
  const current = getTenantConfig();
  const updated: TenantConfig = {
    environment: config.environment || current.environment,
    portId: config.portId || current.portId,
    portSlug: config.portSlug || current.portSlug,
  };

  if (typeof window !== "undefined") {
    localStorage.setItem("corvo_tenant_config", JSON.stringify(updated));
  } else {
    serverConfig = updated;
  }

  return updated;
}

/**
 * Set tenant config from request headers (for API routes)
 */
export function setTenantConfigFromHeaders(headers: Headers): TenantConfig {
  const environment = (headers.get("x-corvo-environment") || DEFAULT_CONFIG.environment) as Environment;
  const portId = headers.get("x-corvo-port-id") || DEFAULT_CONFIG.portId;
  const portSlug = headers.get("x-corvo-port-slug") || DEFAULT_CONFIG.portSlug;

  serverConfig = { environment, portId, portSlug };
  return serverConfig;
}

/**
 * Get embedding dimensions for current environment
 */
export function getEmbeddingDimensions(): number {
  const config = getTenantConfig();
  return EMBEDDING_DIMENSIONS[config.environment];
}

/**
 * Get embedding service type for current environment
 */
export function getEmbeddingService(): "openai" | "ec2" {
  const config = getTenantConfig();
  return EMBEDDING_SERVICE[config.environment];
}

/**
 * Check if we should use OpenAI embeddings
 */
export function useOpenAIEmbeddings(): boolean {
  return getEmbeddingService() === "openai";
}

/**
 * Get the port info by ID from registered ports.
 * Returns a basic object with id=slug if not found in registered list.
 */
export function getPortInfo(portId: string): { id: string; name: string; slug: string } {
  return registeredPorts.find((p) => p.id === portId) || { id: portId, name: portId, slug: portId };
}
