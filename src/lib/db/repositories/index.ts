import { dbConfig } from "../config";

// Conditionally export based on USE_DEMO_TABLES config
// This allows switching between production and demo tables via environment variable

export * as Grants from "./grants";
export * as Vendors from "./vendors";
export * as Pipeline from "./pipeline";
export * as Matches from "./matches";

// Demo-specific exports
export * as DemoGrants from "./demo-grants";
export * as DemoVendors from "./demo-vendors";

// Re-export the active repositories based on config
// Use these for automatic table selection
export const ActiveGrants = dbConfig.useDemoTables
  ? require("./demo-grants")
  : require("./grants");

export const ActiveVendors = dbConfig.useDemoTables
  ? require("./demo-vendors")
  : require("./vendors");
