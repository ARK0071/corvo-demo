// Database configuration for switching between production and demo tables

export const dbConfig = {
  useDemoTables: process.env.USE_DEMO_TABLES === "true",
  embeddingModel: process.env.EMBEDDING_MODEL || "text-embedding-3-small",
  embeddingDimensions: parseInt(process.env.EMBEDDING_DIMENSIONS || "1536"),
};

// Table name mapping based on config
export const tableNames = {
  discoveredGrants: dbConfig.useDemoTables ? "demo_discovered_grants" : "discovered_grants",
  portVendors: dbConfig.useDemoTables ? "demo_port_vendors" : "port_vendors",
  portProfiles: dbConfig.useDemoTables ? "demo_port_profiles" : "port_profiles",
  pipelineGrants: dbConfig.useDemoTables ? "demo_pipeline_grants" : "pipeline_grants",
  grantVendorMatches: dbConfig.useDemoTables ? "demo_grant_vendor_matches" : "grant_vendor_matches",
};

// Log which mode we're in
if (typeof window === "undefined") {
  console.log(`[db-config] Using ${dbConfig.useDemoTables ? "DEMO" : "PRODUCTION"} tables`);
  console.log(`[db-config] Embedding model: ${dbConfig.embeddingModel} (${dbConfig.embeddingDimensions} dims)`);
}