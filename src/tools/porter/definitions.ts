/**
 * Porter AI — Tool Definitions
 *
 * All tools available to the Porter agent, organized by tier:
 * - Tier 0 (autonomous): Read/query tools — no confirmation needed
 * - Tier 1 (lightweight write): Reversible mutations — user confirms before execution
 *
 * Tier 2 (hard gate) tools are deferred to Phase 2.
 */

import { z } from "zod";
import {
  getPipelineOverview,
  getPipelineGrant,
  searchGrants,
  getGrantDetails,
  listAwards,
  getAwardDetails,
  getFinancialSummary,
  getMatchSummary,
  getTasks,
  getOverdueItems,
  getComplianceStatus,
  getReportStatus,
  getDeadlineCalendar,
  getSubrecipientOverview,
  getTeamAssignments,
  getNotifications,
  listTeamMembers,
  explainGrantScore,
  compareGrants,
  financialScenarioAnalysis,
  searchFederalGrants,
  searchStateLocalGrants,
} from "./read-tools";
import {
  createTask,
  assignTask,
  updateTaskStatus,
  addComment,
  sendNotification,
  addToPipeline,
} from "./write-tools";
import {
  semanticGrantSearch,
  findMatchingProjects,
  findQualifiedVendors,
} from "./semantic-search-tools";
import { searchDocumentsTool } from "./document-search-tool";

export const porterTools = {
  // ===================================================================
  // TIER 0 — READ / QUERY (autonomous, no confirmation)
  // ===================================================================

  // --- Pipeline & Grant Discovery ---

  get_pipeline_overview: {
    description:
      "Get the current grant pipeline with counts per stage and grant details. Optionally filter by stage.",
    inputSchema: z.object({
      stage: z
        .enum([
          "eligible",
          "drafting",
          "applied",
          "under_review",
          "awarded",
          "reporting",
          "closeout",
          "rejected",
        ])
        .optional()
        .describe("Filter by a specific pipeline stage"),
    }),
    execute: async (params: { stage?: string }) =>
      getPipelineOverview(params),
  },

  get_pipeline_grant: {
    description:
      "Get detailed information about a specific pipeline grant including scores, tasks, and notes.",
    inputSchema: z.object({
      pipelineGrantId: z
        .string()
        .describe("The pipeline grant UUID"),
    }),
    execute: async (params: { pipelineGrantId: string }) =>
      getPipelineGrant(params),
  },

  search_grants: {
    description:
      "Search discovered grants in the database by keyword, agency, status, or award range. Returns matching federal grant opportunities.",
    inputSchema: z.object({
      keyword: z
        .string()
        .optional()
        .describe("Search term for grant title or description"),
      agency: z
        .string()
        .optional()
        .describe("Filter by federal agency name (partial match)"),
      status: z
        .enum(["posted", "forecasted", "closed", "archived"])
        .optional()
        .describe("Filter by grant status"),
      minAward: z
        .number()
        .optional()
        .describe("Minimum award ceiling in dollars"),
      maxAward: z
        .number()
        .optional()
        .describe("Maximum award floor in dollars"),
      limit: z
        .number()
        .optional()
        .describe("Max results to return (default 20)"),
    }),
    execute: async (params: {
      keyword?: string;
      agency?: string;
      status?: string;
      minAward?: number;
      maxAward?: number;
      limit?: number;
    }) => searchGrants(params),
  },

  get_grant_details: {
    description:
      "Get full details for a specific grant including eligibility, funding categories, contacts, and requirements.",
    inputSchema: z.object({
      grantId: z
        .string()
        .describe("Grant ID (Grants.gov opportunity ID)"),
    }),
    execute: async (params: { grantId: string }) =>
      getGrantDetails(params),
  },

  explain_grant_score: {
    description:
      "Explain why a pipeline grant received its fit score (0-100). Shows breakdown of eligibility, alignment, impact, competitiveness, and recommendation.",
    inputSchema: z.object({
      grantId: z
        .string()
        .describe("Grant opportunity ID (must be in pipeline)"),
    }),
    execute: async (params: { grantId: string }) =>
      explainGrantScore(params),
  },

  compare_grants: {
    description:
      "Compare two grants side-by-side on details, scores, funding, deadlines, and fit.",
    inputSchema: z.object({
      grantIdA: z.string().describe("First grant opportunity ID"),
      grantIdB: z.string().describe("Second grant opportunity ID"),
    }),
    execute: async (params: { grantIdA: string; grantIdB: string }) =>
      compareGrants(params),
  },

  financial_scenario_analysis: {
    description:
      "Compare grant funding vs bond financing for a grant. Calculates local match, net cost, bond alternative (20-year at 5%), and savings.",
    inputSchema: z.object({
      grantId: z.string().describe("Grant opportunity ID"),
      projectBudget: z
        .number()
        .optional()
        .describe("Total project budget (defaults to grant ceiling)"),
    }),
    execute: async (params: { grantId: string; projectBudget?: number }) =>
      financialScenarioAnalysis(params),
  },

  // --- Live Grant Discovery ---

  search_federal_grants: {
    description:
      "Search Grants.gov and the Federal Register for federal grant opportunities. This performs a LIVE search of external APIs — use this when the user wants to discover NEW federal grants, not just search the local database.",
    inputSchema: z.object({
      keyword: z
        .string()
        .describe("Search term (e.g., 'port infrastructure', 'zero emission equipment')"),
      agency: z
        .string()
        .optional()
        .describe("Filter by agency (e.g., 'DOT', 'EPA', 'DHS')"),
      limit: z
        .number()
        .optional()
        .describe("Max results (default 20)"),
    }),
    execute: async (params: { keyword: string; agency?: string; limit?: number }) =>
      searchFederalGrants(params),
  },

  search_state_local_grants: {
    description:
      "Search for state and local grant opportunities. Queries previously discovered grants from the database. If no results exist, directs user to the Discover page to run a fresh web search.",
    inputSchema: z.object({
      keyword: z
        .string()
        .optional()
        .describe("Search term for title, description, or agency"),
    }),
    execute: async (params: { keyword?: string }) =>
      searchStateLocalGrants(params),
  },

  // --- Entity Semantic Search ---

  semantic_grant_search: {
    description:
      "Search for grants using natural language. Embeds the query and finds semantically similar grants via vector search. Use this when the user describes a need in their own words rather than searching by keyword.",
    inputSchema: z.object({
      query: z
        .string()
        .describe(
          "Natural language description of what the user is looking for (e.g., 'zero-emission port equipment funding')"
        ),
      limit: z
        .number()
        .optional()
        .describe("Max results (default 10)"),
    }),
    execute: async (params: { query: string; limit?: number }) =>
      semanticGrantSearch(params),
  },

  find_matching_projects: {
    description:
      "Find how well a specific grant matches the port profile and see top profile-matching grants. Uses embedding similarity between the port profile and grants.",
    inputSchema: z.object({
      grantId: z
        .string()
        .describe("Grant opportunity ID to check for profile match"),
    }),
    execute: async (params: { grantId: string }) =>
      findMatchingProjects(params),
  },

  find_qualified_vendors: {
    description:
      "Find vendors whose capabilities match a specific grant's requirements via embedding similarity.",
    inputSchema: z.object({
      grantId: z
        .string()
        .describe("Grant opportunity ID to find matching vendors for"),
      limit: z
        .number()
        .optional()
        .describe("Max results (default 10)"),
    }),
    execute: async (params: { grantId: string; limit?: number }) =>
      findQualifiedVendors(params),
  },

  // --- Document Retrieval (RAG) ---

  search_documents: {
    description:
      "Search ingested documents (NOFOs, 2 CFR 200, award terms, agency GT&Cs) for specific passages. Use this to answer regulatory questions, find NOFO requirements, or cite compliance rules. Returns passages with source citations.",
    inputSchema: z.object({
      query: z
        .string()
        .describe(
          "Search query — can be a question, clause number (e.g., '200.403'), or topic description"
        ),
      grantId: z
        .string()
        .optional()
        .describe("Scope results to a specific grant's documents"),
      awardId: z
        .string()
        .optional()
        .describe("Scope results to a specific award's documents"),
      docType: z
        .enum(["nofo", "2cfr200", "agency_gtc", "award_terms", "special_conditions"])
        .optional()
        .describe("Filter by document type"),
      limit: z
        .number()
        .optional()
        .describe("Max passages to return (default 8)"),
    }),
    execute: async (params: {
      query: string;
      grantId?: string;
      awardId?: string;
      docType?: string;
      limit?: number;
    }) => searchDocumentsTool(params),
  },

  // --- Awards & Finance ---

  list_awards: {
    description:
      "List all post-award grants for this port. Optionally filter by keyword (matches title, program, or FAIN) or status. Use this to find award IDs before calling get_award_details or get_financial_summary.",
    inputSchema: z.object({
      keyword: z
        .string()
        .optional()
        .describe("Search by award title, program name, or FAIN"),
      status: z
        .string()
        .optional()
        .describe("Filter by status (e.g. 'active', 'closeout')"),
    }),
    execute: async (params: { keyword?: string; status?: string }) =>
      listAwards(params),
  },

  get_award_details: {
    description:
      "Get full details for a post-award grant including budget categories, match status, subrecipients, and recent match entries.",
    inputSchema: z.object({
      awardId: z.string().describe("Award UUID"),
    }),
    execute: async (params: { awardId: string }) =>
      getAwardDetails(params),
  },

  get_financial_summary: {
    description:
      "Get financial summary for an award: budget utilization, burn rate, drawdown status, match gap, and projected spend.",
    inputSchema: z.object({
      awardId: z.string().describe("Award UUID"),
    }),
    execute: async (params: { awardId: string }) =>
      getFinancialSummary(params),
  },

  get_match_summary: {
    description:
      "Get match (cost sharing) position across ALL awards: required, contributed, gap, and progress percentage per award plus an aggregate total. Use this for cross-award match questions.",
    inputSchema: z.object({}),
    execute: async () => getMatchSummary(),
  },

  // --- Tasks & Compliance ---

  get_tasks: {
    description:
      "Query tasks with filters. Can find tasks by keyword (searches title and description), award, assignee, status, compliance area, or overdue status.",
    inputSchema: z.object({
      keyword: z
        .string()
        .optional()
        .describe("Search by task title or description (partial match)"),
      awardId: z
        .string()
        .optional()
        .describe("Filter by award UUID"),
      pipelineGrantId: z
        .string()
        .optional()
        .describe("Filter by pipeline grant UUID"),
      assigneeId: z
        .string()
        .optional()
        .describe("Filter by assigned user UUID"),
      status: z
        .enum([
          "not_started",
          "in_progress",
          "blocked",
          "in_review",
          "submitted",
          "done",
        ])
        .optional()
        .describe("Filter by task status"),
      area: z
        .string()
        .optional()
        .describe(
          "Filter by compliance area (e.g., financial_reporting, buy_america, dbe, environmental, davis_bacon)"
        ),
      overdue: z
        .boolean()
        .optional()
        .describe("Only show overdue tasks (past due date, not done)"),
      limit: z
        .number()
        .optional()
        .describe("Max results (default 50)"),
    }),
    execute: async (params: {
      keyword?: string;
      awardId?: string;
      pipelineGrantId?: string;
      assigneeId?: string;
      status?: string;
      area?: string;
      overdue?: boolean;
      limit?: number;
    }) => getTasks(params),
  },

  get_overdue_items: {
    description:
      "Get all overdue items across the platform: tasks past due and reports past due. Returns priority-sorted list with days overdue.",
    inputSchema: z.object({}),
    execute: async () => getOverdueItems(),
  },

  get_compliance_status: {
    description:
      "Get compliance checklist completion status and open audit findings for an award. Shows Buy America, Davis-Bacon, NEPA, Title VI/DBE, and other compliance areas.",
    inputSchema: z.object({
      awardId: z.string().describe("Award UUID"),
    }),
    execute: async (params: { awardId: string }) =>
      getComplianceStatus(params),
  },

  // --- Reporting & Deadlines ---

  get_report_status: {
    description:
      "Get upcoming and overdue reports (SF-425, PPR, Closeout) for one or all awards.",
    inputSchema: z.object({
      awardId: z
        .string()
        .optional()
        .describe("Filter by award UUID (omit for all awards)"),
    }),
    execute: async (params: { awardId?: string }) =>
      getReportStatus(params),
  },

  get_deadline_calendar: {
    description:
      "Get all upcoming deadlines across the platform: tasks, reports, and grant close dates. Returns chronologically sorted list.",
    inputSchema: z.object({
      daysAhead: z
        .number()
        .optional()
        .describe(
          "How many days ahead to look (default 60)"
        ),
    }),
    execute: async (params: { daysAhead?: number }) =>
      getDeadlineCalendar(params),
  },

  // --- Subrecipients & Team ---

  get_subrecipient_overview: {
    description:
      "Get subrecipient status for an award: risk levels, monitoring intensity, pending documents/expenses, and last monitoring visit.",
    inputSchema: z.object({
      awardId: z.string().describe("Award UUID"),
    }),
    execute: async (params: { awardId: string }) =>
      getSubrecipientOverview(params),
  },

  get_team_assignments: {
    description:
      "Get team member assignments and roles for one or all awards.",
    inputSchema: z.object({
      awardId: z
        .string()
        .optional()
        .describe("Filter by award UUID (omit for all awards)"),
    }),
    execute: async (params: { awardId?: string }) =>
      getTeamAssignments(params),
  },

  get_notifications: {
    description:
      "Get the current user's unread notifications.",
    inputSchema: z.object({}),
    execute: async () => getNotifications(),
  },

  list_team_members: {
    description:
      "List team members for this port. Optionally search by name, email, or title. Use this to find user IDs before calling assign_task or send_notification.",
    inputSchema: z.object({
      keyword: z
        .string()
        .optional()
        .describe("Search by name, email, or job title"),
    }),
    execute: async (params: { keyword?: string }) =>
      listTeamMembers(params),
  },

  // ===================================================================
  // TIER 1 — LIGHTWEIGHT WRITES (user confirms before execution)
  // ===================================================================

  create_task: {
    description:
      "Create a new task. IMPORTANT: Always state the full task details and ask the user to confirm before calling this tool.",
    inputSchema: z.object({
      title: z.string().describe("Task title"),
      description: z
        .string()
        .optional()
        .describe("Detailed task description"),
      awardId: z
        .string()
        .optional()
        .describe("Link to award UUID (post-award task)"),
      pipelineGrantId: z
        .string()
        .optional()
        .describe("Link to pipeline grant UUID (pre-award task)"),
      assigneeId: z
        .string()
        .optional()
        .describe("Assign to user UUID"),
      dueDate: z
        .string()
        .optional()
        .describe("Due date (YYYY-MM-DD)"),
      priority: z
        .enum(["low", "medium", "high", "critical"])
        .optional()
        .describe("Task priority (default: medium)"),
      area: z
        .string()
        .optional()
        .describe(
          "Compliance area (e.g., financial_reporting, buy_america, environmental)"
        ),
    }),
    execute: async (params: {
      title: string;
      description?: string;
      awardId?: string;
      pipelineGrantId?: string;
      assigneeId?: string;
      dueDate?: string;
      priority?: string;
      area?: string;
    }) => createTask(params),
  },

  assign_task: {
    description:
      "Reassign a task to a different user. IMPORTANT: Confirm the assignment with the user before calling.",
    inputSchema: z.object({
      taskId: z.string().describe("Task UUID"),
      assigneeId: z.string().describe("New assignee user UUID"),
    }),
    execute: async (params: { taskId: string; assigneeId: string }) =>
      assignTask(params),
  },

  update_task_status: {
    description:
      "Change a task's status. IMPORTANT: Confirm the status change with the user before calling.",
    inputSchema: z.object({
      taskId: z.string().describe("Task UUID"),
      status: z
        .enum([
          "not_started",
          "in_progress",
          "blocked",
          "in_review",
          "submitted",
          "done",
        ])
        .describe("New status"),
    }),
    execute: async (params: { taskId: string; status: string }) =>
      updateTaskStatus(params),
  },

  add_comment: {
    description:
      "Add a comment to a task. IMPORTANT: Confirm the comment text with the user before posting.",
    inputSchema: z.object({
      taskId: z.string().describe("Task UUID"),
      text: z.string().describe("Comment text"),
    }),
    execute: async (params: { taskId: string; text: string }) =>
      addComment(params),
  },

  send_notification: {
    description:
      "Send a notification to a team member. IMPORTANT: Confirm the message with the user before sending.",
    inputSchema: z.object({
      userId: z.string().describe("Recipient user UUID"),
      message: z.string().describe("Notification message"),
      link: z
        .string()
        .optional()
        .describe("Optional link to include in the notification"),
    }),
    execute: async (params: {
      userId: string;
      message: string;
      link?: string;
    }) => sendNotification(params),
  },

  add_to_pipeline: {
    description:
      "Add a discovered grant to the pipeline (starts in 'eligible' stage). IMPORTANT: Confirm with the user before adding.",
    inputSchema: z.object({
      grantId: z
        .string()
        .describe("Grant opportunity ID to add to pipeline"),
      notes: z
        .string()
        .optional()
        .describe("Initial notes for the pipeline entry"),
    }),
    execute: async (params: { grantId: string; notes?: string }) =>
      addToPipeline(params),
  },
};
