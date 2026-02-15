import { z } from "zod";
import { searchGrantPrograms, getGrantProgramDetails, analyzeGrantRequirements, compareGrantPrograms } from "./grant-tools";
import { searchVendorProfiles, getVendorFullProfile, analyzeVendorCapabilityGaps, findSimilarVendorProfiles } from "./vendor-tools";
import { matchVendorsToGrantProgram, matchGrantsToVendorProfile, getDetailedScorecard } from "./matching-tools";
import { generateCompetitiveLandscapeReport } from "./analysis-tools";

export const grantMatchTools = {
  // ===== GRANT SEARCH & ANALYSIS =====
  search_grants: {
    description: "Search and filter federal grant programs by agency, focus area, funding range, or status. Use this for questions about available grants, funding opportunities, and program details.",
    inputSchema: z.object({
      query: z.string().optional().describe("Search query (e.g., 'port infrastructure', 'clean energy', 'dredging')"),
      agency: z.string().optional().describe("Filter by agency (e.g., 'USDOT', 'EPA', 'FEMA')"),
      focusArea: z.string().optional().describe("Filter by focus area (e.g., 'electrification', 'security', 'resilience')"),
      minFunding: z.number().optional().describe("Minimum award amount in dollars"),
      maxFunding: z.number().optional().describe("Maximum award amount in dollars"),
      status: z.string().optional().describe("Filter by status: 'open', 'upcoming', or 'closed'"),
    }),
    execute: async (params: { query?: string; agency?: string; focusArea?: string; minFunding?: number; maxFunding?: number; status?: string }) =>
      searchGrantPrograms(params),
  },

  get_grant_details: {
    description: "Get comprehensive details for a specific federal grant program including funding, eligibility, eligible activities, and deadlines.",
    inputSchema: z.object({
      grantId: z.string().describe("Grant program ID (e.g., 'grant-01' for PIDP, 'grant-02' for EPA Clean Ports)"),
    }),
    execute: async (params: { grantId: string }) => getGrantProgramDetails(params),
  },

  analyze_grant_requirements: {
    description: "Break down a grant program's eligibility requirements, compliance needs, scoring criteria, and vendor implications.",
    inputSchema: z.object({
      grantId: z.string().describe("Grant program ID to analyze"),
    }),
    execute: async (params: { grantId: string }) => analyzeGrantRequirements(params),
  },

  compare_grants: {
    description: "Side-by-side comparison of 2-3 grant programs on funding, requirements, deadlines, and focus areas.",
    inputSchema: z.object({
      grantIds: z.array(z.string()).describe("Array of 2-3 grant IDs to compare (e.g., ['grant-01', 'grant-02'])"),
    }),
    execute: async (params: { grantIds: string[] }) => compareGrantPrograms(params),
  },

  // ===== VENDOR SEARCH & ANALYSIS =====
  search_vendors: {
    description: "Search port industry vendors by name, sector, capability, certification, revenue range, or DBE status.",
    inputSchema: z.object({
      query: z.string().optional().describe("Search query (vendor name, capability, or keyword)"),
      sector: z.string().optional().describe("Filter by sector (e.g., 'Marine Construction', 'Heavy Civil', 'Security/IT')"),
      capability: z.string().optional().describe("Filter by capability (e.g., 'dredging', 'cybersecurity', 'solar')"),
      certification: z.string().optional().describe("Filter by certification (e.g., 'ISO 9001', 'USACE Qualified', 'DBE')"),
      minRevenue: z.number().optional().describe("Minimum annual revenue in dollars"),
      maxRevenue: z.number().optional().describe("Maximum annual revenue in dollars"),
      dbeOnly: z.boolean().optional().describe("Only show DBE/MBE/WBE/SDVOSB certified vendors"),
      limit: z.number().optional().describe("Max results to return (default 15)"),
    }),
    execute: async (params: { query?: string; sector?: string; capability?: string; certification?: string; minRevenue?: number; maxRevenue?: number; dbeOnly?: boolean; limit?: number }) =>
      searchVendorProfiles(params),
  },

  get_vendor_profile: {
    description: "Get a full vendor profile including financials, capabilities, certifications, past port projects, and key personnel.",
    inputSchema: z.object({
      vendorId: z.string().describe("Vendor ID (e.g., 'pv-01' for Great Lakes Dredge & Dock, 'pv-09' for Bechtel)"),
    }),
    execute: async (params: { vendorId: string }) => getVendorFullProfile(params),
  },

  analyze_vendor_capabilities: {
    description: "Gap analysis of a vendor's capabilities vs. a list of required capabilities. Identifies gaps and suggests teaming partners.",
    inputSchema: z.object({
      vendorId: z.string().describe("Vendor ID to analyze"),
      requiredCapabilities: z.array(z.string()).describe("List of required capabilities to check against (e.g., ['dredging', 'environmental remediation', 'pile driving'])"),
    }),
    execute: async (params: { vendorId: string; requiredCapabilities: string[] }) =>
      analyzeVendorCapabilityGaps(params),
  },

  find_similar_vendors: {
    description: "Find vendors similar to a given vendor based on sector, capabilities, revenue, and certifications. Useful for identifying competitors or teaming partners.",
    inputSchema: z.object({
      vendorId: z.string().describe("Reference vendor ID to find similar vendors for"),
      limit: z.number().optional().describe("Max similar vendors to return (default 5)"),
    }),
    execute: async (params: { vendorId: string; limit?: number }) => findSimilarVendorProfiles(params),
  },

  // ===== MATCHING & SCORING =====
  match_vendors_to_grant: {
    description: "Find and rank the top vendors qualified for a specific grant program. Returns match scores, strengths, gaps, and recommendations.",
    inputSchema: z.object({
      grantId: z.string().describe("Grant program ID to find vendors for"),
      limit: z.number().optional().describe("Max vendors to return (default 10)"),
      minScore: z.number().optional().describe("Minimum overall match score (0-100)"),
      sector: z.string().optional().describe("Filter to specific vendor sector"),
    }),
    execute: async (params: { grantId: string; limit?: number; minScore?: number; sector?: string }) =>
      matchVendorsToGrantProgram(params),
  },

  match_grants_to_vendor: {
    description: "Find the best grant programs for a specific vendor based on their capabilities, experience, and qualifications.",
    inputSchema: z.object({
      vendorId: z.string().describe("Vendor ID to find grants for"),
      limit: z.number().optional().describe("Max grants to return (default 5)"),
    }),
    execute: async (params: { vendorId: string; limit?: number }) => matchGrantsToVendorProfile(params),
  },

  get_match_scorecard: {
    description: "Detailed scorecard for a specific vendor-grant pair showing all 6 scoring dimensions, strengths, gaps, and recommendations.",
    inputSchema: z.object({
      grantId: z.string().describe("Grant program ID"),
      vendorId: z.string().describe("Vendor ID"),
    }),
    execute: async (params: { grantId: string; vendorId: string }) => getDetailedScorecard(params),
  },

  // ===== COMPETITIVE ANALYSIS =====
  generate_competitive_landscape: {
    description: "Generate a competitive landscape analysis showing which vendors compete in which grant areas, market concentration, sector breakdown, and teaming opportunities.",
    inputSchema: z.object({
      grantId: z.string().optional().describe("Specific grant ID for grant-focused analysis"),
      sector: z.string().optional().describe("Specific sector for sector-focused analysis"),
      focusArea: z.string().optional().describe("Focus area to analyze (e.g., 'dredging', 'electrification')"),
    }),
    execute: async (params: { grantId?: string; sector?: string; focusArea?: string }) =>
      generateCompetitiveLandscapeReport(params),
  },
};
