"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Loader2, CheckCircle2, Wrench } from "lucide-react";

const toolDisplayNames: Record<string, string> = {
  // Tier 0 — Read tools
  get_pipeline_overview: "Checking pipeline",
  get_pipeline_grant: "Loading grant details",
  search_grants: "Searching grants",
  get_grant_details: "Getting grant details",
  explain_grant_score: "Explaining fit score",
  compare_grants: "Comparing grants",
  financial_scenario_analysis: "Running financial analysis",
  semantic_grant_search: "Searching grants semantically",
  find_matching_projects: "Finding matching projects",
  find_qualified_vendors: "Finding qualified vendors",
  search_documents: "Searching documents",
  search_federal_grants: "Searching Grants.gov",
  search_state_local_grants: "Searching state/local grants",
  list_awards: "Looking up awards",
  get_award_details: "Loading award details",
  get_financial_summary: "Getting financial summary",
  get_match_summary: "Checking match position",
  get_tasks: "Loading tasks",
  get_overdue_items: "Checking overdue items",
  get_compliance_status: "Checking compliance",
  get_report_status: "Checking report status",
  get_deadline_calendar: "Loading deadlines",
  get_subrecipient_overview: "Loading subrecipients",
  get_team_assignments: "Loading team info",
  get_notifications: "Checking notifications",
  list_team_members: "Looking up team members",
  // Tier 1 — Write tools
  create_task: "Creating task",
  assign_task: "Assigning task",
  update_task_status: "Updating task status",
  add_comment: "Adding comment",
  send_notification: "Sending notification",
  add_to_pipeline: "Adding to pipeline",
};

interface PorterToolIndicatorProps {
  toolName: string;
  args: Record<string, unknown>;
  state: "call" | "result";
}

export function PorterToolIndicator({ toolName, args, state }: PorterToolIndicatorProps) {
  const [expanded, setExpanded] = useState(false);
  const displayName = toolDisplayNames[toolName] || toolName.replace(/_/g, " ");
  const isLoading = state === "call";

  return (
    <div className="my-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 rounded-md border bg-muted/50 px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted"
      >
        {isLoading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <CheckCircle2 className="h-3 w-3 text-green-600" />
        )}
        <Wrench className="h-3 w-3" />
        <span>
          {displayName}
          {isLoading ? "..." : ""}
        </span>
        {Object.keys(args).length > 0 &&
          (expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />)}
      </button>
      {expanded && Object.keys(args).length > 0 && (
        <div className="mt-1 ml-4 rounded-md bg-muted p-2 text-[10px] font-mono text-muted-foreground">
          {Object.entries(args).map(([key, value]) => (
            <div key={key}>
              <span className="font-medium text-foreground/60">{key}:</span>{" "}
              <span>{JSON.stringify(value)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
