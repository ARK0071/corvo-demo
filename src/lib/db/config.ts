/**
 * Database configuration that integrates with tenant configuration
 *
 * This file provides backward-compatible access while using the new tenant system.
 */

import {
  getTenantConfig,
  getEmbeddingDimensions,
  getEmbeddingService,
} from "./tenant-config";

// Re-export for backward compatibility
export { getTenantConfig, setTenantConfig, setTenantConfigFromHeaders } from "./tenant-config";
export type { TenantConfig, Environment, PortId } from "./tenant-config";
export { AVAILABLE_PORTS, EMBEDDING_DIMENSIONS, EMBEDDING_SERVICE } from "./tenant-config";

/**
 * Get database configuration based on current tenant settings
 */
export function getDbConfig() {
  const tenant = getTenantConfig();

  return {
    environment: tenant.environment,
    portId: tenant.portId,
    portSlug: tenant.portSlug,
    embeddingDimensions: getEmbeddingDimensions(),
    embeddingService: getEmbeddingService(),
    useOpenAI: getEmbeddingService() === "openai",
  };
}

/**
 * Legacy config object for backward compatibility
 * @deprecated Use getDbConfig() instead
 */
export const dbConfig = {
  get useDemoTables() {
    return getTenantConfig().environment === "demo";
  },
  get embeddingModel() {
    return getEmbeddingService() === "openai" ? "text-embedding-3-small" : "qwen3-4b-embedding";
  },
  get embeddingDimensions() {
    return getEmbeddingDimensions();
  },
};

/**
 * Get table name based on environment
 */
export function getTableName(baseName: string): string {
  const tenant = getTenantConfig();

  switch (tenant.environment) {
    case "test":
      return `test_${baseName}`;
    case "demo":
      return `demo_${baseName}`;
    case "production":
      // Production tables don't have prefix (they're the base tables)
      // Per-port production tables would be: {port}_{baseName}
      // For now, use base tables for production
      return baseName;
    default:
      return baseName;
  }
}

/**
 * Table names based on current environment
 */
export function getTableNames() {
  return {
    portProfiles: getTableName("port_profiles"),
    discoveredGrants: getTableName("discovered_grants"),
    portVendors: getTableName("port_vendors"),
    pipelineGrants: getTableName("pipeline_grants"),
    grantVendorMatches: getTableName("grant_vendor_matches"),
    projects: getTableName("projects"),
    awards: getTableName("awards"),
    budgetCategories: getTableName("budget_categories"),
    matchLedger: getTableName("match_ledger"),
    expenses: getTableName("expenses"),
    drawdownRequests: getTableName("drawdown_requests"),
    budgetModifications: getTableName("budget_modifications"),
    grantDrafts: getTableName("grant_drafts"),
  };
}

/**
 * Legacy tableNames for backward compatibility
 * @deprecated Use getTableNames() instead
 */
export const tableNames = {
  get discoveredGrants() {
    return getTableName("discovered_grants");
  },
  get portVendors() {
    return getTableName("port_vendors");
  },
  get portProfiles() {
    return getTableName("port_profiles");
  },
  get pipelineGrants() {
    return getTableName("pipeline_grants");
  },
  get grantVendorMatches() {
    return getTableName("grant_vendor_matches");
  },
};

// Log configuration on load (server-side only)
if (typeof window === "undefined") {
  const config = getDbConfig();
  console.log(`[db-config] Environment: ${config.environment}`);
  console.log(`[db-config] Port: ${config.portId}`);
  console.log(`[db-config] Embedding service: ${config.embeddingService} (${config.embeddingDimensions} dims)`);
}