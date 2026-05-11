import { dbConfig } from "../config";

// Conditionally export based on USE_DEMO_TABLES config
// This allows switching between production and demo tables via environment variable

// Production repositories (EC2 Qwen3 embeddings - 2560 dims)
export * as Grants from "./grants";
export * as Vendors from "./vendors";
export * as Pipeline from "./pipeline";
export * as Matches from "./matches";
export * as Reports from "./reports";
export * as Awards from "./awards";

// Demo-specific exports (OpenAI embeddings - 1536 dims, with portId filter)
export * as DemoGrants from "./demo-grants";
export * as DemoVendors from "./demo-vendors";
export * as DemoPipeline from "./demo-pipeline";
export * as DemoMatches from "./demo-matches";
export * as DemoProjects from "./demo-projects";
export * as DemoAwards from "./demo-awards";
export * as DemoGrantDrafts from "./demo-grant-drafts";
export * as DemoReports from "./demo-reports";

// Re-export the active repositories based on config
// Use these for automatic table selection
export const ActiveGrants = dbConfig.useDemoTables
  ? require("./demo-grants")
  : require("./grants");

export const ActiveVendors = dbConfig.useDemoTables
  ? require("./demo-vendors")
  : require("./vendors");

export const ActivePipeline = dbConfig.useDemoTables
  ? require("./demo-pipeline")
  : require("./pipeline");

export const ActiveMatches = dbConfig.useDemoTables
  ? require("./demo-matches")
  : require("./matches");

export const ActiveReports = dbConfig.useDemoTables
  ? require("./demo-reports")
  : require("./reports");
