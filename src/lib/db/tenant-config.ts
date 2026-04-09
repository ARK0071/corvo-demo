/**
 * Tenant Configuration for Multi-Port, Multi-Environment Database Access
 *
 * Environments:
 * - test: Shared test tables, EC2 Qwen3 embeddings (2560 dims)
 * - demo: Shared demo tables with portId filter, OpenAI embeddings (1536 dims)
 * - production: Per-port tables, EC2 Qwen3 embeddings (2560 dims)
 *
 * IMPORTANT — Server-side request scoping
 * ----------------------------------------
 * On the server, tenant config is held in an AsyncLocalStorage so each
 * request gets its own isolated tenant context. Previously this module
 * stored the tenant config in a module-level variable, which under any
 * concurrent request load would let request A's port leak into request
 * B's database queries. AsyncLocalStorage propagates the value through
 * the async chain rooted in the route handler invocation, so concurrent
 * requests cannot stomp on each other.
 *
 * NOTE: this file is also imported by client components (just for the
 * `Environment` type, AVAILABLE_PORTS, etc.). We therefore cannot do a
 * static `import { AsyncLocalStorage } from "node:async_hooks"` — Turbopack
 * would try to bundle that into the client and fail. Instead we resolve
 * the module via `Function('return require')` at first use on the server,
 * which the bundler cannot statically analyze, so the symbol stays
 * server-only.
 */

// AsyncLocalStorage type — declared structurally so we don't have to
// import @types/node here (which would tag this file as server-only).
type AsyncLocalStorageLike<T> = {
  getStore(): T | undefined;
  enterWith(store: T): void;
  run<R>(store: T, fn: () => R): R;
};

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

// Per-request server-side tenant context. Each route handler invocation
// runs inside its own async chain — calling enterWith() at the start of
// the handler installs a tenant config that is visible to all downstream
// awaits in that same async chain only, never to other concurrent requests.
//
// Lazily initialized via Function-constructor require so the bundler does
// not pull node:async_hooks into client bundles. On the client this stays
// `null` and getTenantConfig() falls through to the localStorage path.
let serverConfigStorage: AsyncLocalStorageLike<TenantConfig> | null = null;
function getServerConfigStorage(): AsyncLocalStorageLike<TenantConfig> | null {
  if (typeof window !== "undefined") return null;
  if (serverConfigStorage) return serverConfigStorage;
  try {
    // Function-constructor require defeats Turbopack/Webpack static analysis
    // so the client bundle never sees `node:async_hooks`.
    const requireFn = new Function("mod", "return require(mod)") as (m: string) => unknown;
    const mod = requireFn("node:async_hooks") as {
      AsyncLocalStorage: new <T>() => AsyncLocalStorageLike<T>;
    };
    serverConfigStorage = new mod.AsyncLocalStorage<TenantConfig>();
    return serverConfigStorage;
  } catch {
    // Should never happen on the server, but if it does we degrade to
    // the (unsafe) module-default behavior rather than crashing requests.
    return null;
  }
}

/**
 * Get current tenant configuration
 * On client: reads from localStorage
 * On server: reads request-scoped AsyncLocalStorage (set by setTenantConfigFromHeaders)
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

  // Server-side: read request-scoped store (falls back to default for
  // non-request callers like one-shot scripts).
  const als = getServerConfigStorage();
  const store = als?.getStore();
  return store ? { ...store } : { ...DEFAULT_CONFIG };
}

/**
 * Set tenant configuration
 * On client: saves to localStorage
 * On server: scopes to the current async context (request)
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
    // Server-side: install into the current async context only
    getServerConfigStorage()?.enterWith(updated);
  }

  return updated;
}

/**
 * Set tenant config from request headers (for API routes).
 *
 * Must be called as the very first await-eligible operation inside a
 * route handler so that all downstream awaits inherit it via
 * AsyncLocalStorage. The previous implementation mutated module state,
 * which let two concurrent requests overwrite each other's tenant
 * context and serve cross-tenant data.
 */
export function setTenantConfigFromHeaders(headers: Headers): TenantConfig {
  const environment = (headers.get("x-corvo-environment") || DEFAULT_CONFIG.environment) as Environment;
  const portId = headers.get("x-corvo-port-id") || DEFAULT_CONFIG.portId;
  const portSlug = headers.get("x-corvo-port-slug") || DEFAULT_CONFIG.portSlug;

  const config: TenantConfig = { environment, portId, portSlug };
  getServerConfigStorage()?.enterWith(config);
  return config;
}

/**
 * Run a callback with an explicit tenant config installed into a fresh
 * async context. Use this for non-request callers (scripts, background
 * jobs, tests) that need to scope work to a specific tenant without
 * leaking the config back into shared state.
 */
export function runWithTenantConfig<T>(config: TenantConfig, fn: () => Promise<T> | T): Promise<T> | T {
  const als = getServerConfigStorage();
  if (!als) return fn();
  return als.run(config, fn);
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