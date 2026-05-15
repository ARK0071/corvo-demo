/**
 * Tenant Configuration for Multi-Port, Multi-Environment Database Access
 *
 * Environments:
 * - test: Shared test tables, EC2 Qwen3 embeddings (2560 dims)
 * - demo: Shared demo tables with portId filter, OpenAI embeddings (1536 dims)
 * - production: Per-port tables, EC2 Qwen3 embeddings (2560 dims)
 */

export type Environment = "test" | "demo" | "production";

export interface TenantConfig {
  environment: Environment;
  portId: string; // e.g., "freeport", "lawa", "louisiana-gateway"
  portSlug: string; // URL-safe version
}

// Available ports (will be expanded as needed)
export const AVAILABLE_PORTS = [
  { id: "freeport", name: "Port Freeport", slug: "port-freeport" },
  { id: "lawa", name: "Los Angeles World Airports", slug: "lawa" },
  { id: "louisiana-gateway", name: "Louisiana Gateway", slug: "louisiana-gateway" },
  { id: "polestar-defense", name: "Pole Star Defense", slug: "polestar-defense" },
  { id: "freeport-demo", name: "Port Freeport DEMO", slug: "freeport-demo" },
  { id: "freeport-mock", name: "Port Freeport Mock", slug: "freeport-mock" },
] as const;

export type PortId = typeof AVAILABLE_PORTS[number]["id"];

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

// Default configuration (can be overridden via localStorage/settings)
const DEFAULT_CONFIG: TenantConfig = {
  environment: "test", // Default to test
  portId: "freeport",
  portSlug: "port-freeport",
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
    // Client-side: read from localStorage
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

  // Server-side: use in-memory cache
  return { ...serverConfig };
}

/**
 * Set tenant configuration
 * On client: saves to localStorage
 * On server: updates in-memory cache
 */
export function setTenantConfig(config: Partial<TenantConfig>): TenantConfig {
  const current = getTenantConfig();
  const updated: TenantConfig = {
    environment: config.environment || current.environment,
    portId: config.portId || current.portId,
    portSlug: config.portSlug || current.portSlug,
  };

  if (typeof window !== "undefined") {
    // Client-side: save to localStorage
    localStorage.setItem("corvo_tenant_config", JSON.stringify(updated));
  } else {
    // Server-side: update in-memory cache
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
 * Get the port info by ID
 */
export function getPortInfo(portId: string) {
  return AVAILABLE_PORTS.find((p) => p.id === portId) || AVAILABLE_PORTS[0];
}

// Log configuration on load (server-side only)
if (typeof window === "undefined") {
  console.log("[tenant-config] Default environment:", DEFAULT_CONFIG.environment);
  console.log("[tenant-config] Default port:", DEFAULT_CONFIG.portId);
  console.log("[tenant-config] Embedding dimensions:", EMBEDDING_DIMENSIONS[DEFAULT_CONFIG.environment]);
}