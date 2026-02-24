/**
 * Corvo Grant Intelligence Tools
 *
 * Tools for grant scoring, financial analysis, and pipeline management.
 * Works with live Grants.gov data and the port's grant pipeline.
 */

import { z } from "zod";
import {
  getPipelineGrants,
  explainGrantScore,
  calculateFinancialScenario,
  getDeadlineUrgency,
  recommendNextActions,
  compareTwoGrants,
  matchGrantsToProjectTool,
  getProjectGrantMatches,
  getCompetitiveIntelligence,
} from "./tools";

export const grantIntelligenceTools = {
  // ===== PIPELINE & GRANT ANALYSIS =====
  get_pipeline_status: {
    description:
      "Get the current grant pipeline status across all stages (Eligible → Applied → Under Review → Awarded → Rejected). Shows grants, deadlines, amounts, and stages.",
    inputSchema: z.object({
      stage: z
        .enum(["eligible", "applied", "under_review", "awarded", "rejected"])
        .optional()
        .describe("Filter by specific pipeline stage"),
      urgent: z
        .boolean()
        .optional()
        .describe("Only show grants with critical/urgent deadlines (≤14 days)"),
    }),
    execute: async (params: {
      stage?: "eligible" | "applied" | "under_review" | "awarded" | "rejected";
      urgent?: boolean;
    }) => getPipelineGrants(params),
  },

  explain_grant_score: {
    description:
      "Explain why a grant received its fit score (0-100). Breaks down eligibility, alignment, financial fit, deadline viability, competitive position, and strategic value scores with reasoning.",
    inputSchema: z.object({
      grantId: z
        .string()
        .describe(
          "Grant opportunity ID from Grants.gov (visible in the dashboard grant cards)"
        ),
    }),
    execute: async (params: { grantId: string }) => explainGrantScore(params),
  },

  calculate_financial_scenario: {
    description:
      "Calculate financial scenarios for a grant: grant funding vs bond financing, local match requirements and affordability from operating budget.",
    inputSchema: z.object({
      grantId: z.string().describe("Grant opportunity ID"),
      requestAmount: z
        .number()
        .optional()
        .describe(
          "Amount to request (defaults to grant ceiling if not specified)"
        ),
    }),
    execute: async (params: { grantId: string; requestAmount?: number }) =>
      calculateFinancialScenario(params),
  },

  get_deadline_urgency: {
    description:
      "Analyze grant deadlines and categorize them by urgency: CRITICAL (≤7 days), URGENT (8-14 days), UPCOMING (15-30 days), FUTURE (>30 days). Returns prioritized action list.",
    inputSchema: z.object({
      includeApplied: z
        .boolean()
        .optional()
        .describe(
          "Include grants already in Applied/Under Review stages (default: false)"
        ),
    }),
    execute: async (params: { includeApplied?: boolean }) =>
      getDeadlineUrgency(params),
  },

  recommend_next_actions: {
    description:
      'Recommend what the port should do next based on pipeline status, deadlines, and grant fit scores. Answers "What should I do?" questions.',
    inputSchema: z.object({}),
    execute: async () => recommendNextActions(),
  },

  compare_two_grants: {
    description:
      "Side-by-side comparison of two grants on fit scores, deadlines, funding amounts, match requirements, and strategic alignment. Use when user asks to compare grants.",
    inputSchema: z.object({
      grantId1: z.string().describe("First grant opportunity ID"),
      grantId2: z.string().describe("Second grant opportunity ID"),
    }),
    execute: async (params: { grantId1: string; grantId2: string }) =>
      compareTwoGrants(params),
  },

  match_grants_to_project: {
    description:
      "Find grants that match a specific project based on focus areas, budget, timeline, and description relevance. Returns scored matches sorted by relevance.",
    inputSchema: z.object({
      projectId: z.string().describe("Project ID to match grants against"),
    }),
    execute: async (params: { projectId: string }) =>
      matchGrantsToProjectTool(params),
  },

  get_project_grant_matches: {
    description:
      "Find projects that match a specific grant. Returns projects sorted by match score.",
    inputSchema: z.object({
      grantId: z.string().describe("Grant opportunity ID to match projects against"),
    }),
    execute: async (params: { grantId: string }) =>
      getProjectGrantMatches(params),
  },

  // ===== COMPETITIVE INTELLIGENCE =====
  get_competitive_intelligence: {
    description:
      "Get competitive intelligence for a grant: historical award patterns, similar projects that won, geographic patterns, project type success rates, and competitive positioning advice. Uses data from MARAD PIDP, USDOT programs, and other historical award databases.",
    inputSchema: z.object({
      grantId: z.string().describe("Grant opportunity ID to analyze"),
    }),
    execute: async (params: { grantId: string }) =>
      getCompetitiveIntelligence(params),
  },
};
