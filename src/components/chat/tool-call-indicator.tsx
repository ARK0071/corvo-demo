"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Loader2, CheckCircle2, Wrench } from "lucide-react";

const toolDisplayNames: Record<string, string> = {
  get_spend_insights: "Analyzing spend data",
  analyze_tail_spend: "Analyzing tail spend",
  detect_duplicate_vendors: "Detecting duplicate vendors",
  analyze_ppv: "Analyzing price variance",
  detect_spending_anomalies: "Detecting anomalies",
  analyze_contract_risk: "Analyzing contract risk",
  analyze_maverick_spend: "Analyzing off-contract spend",
  analyze_supplier_concentration: "Analyzing supplier concentration",
  get_benchmark_comparison: "Benchmarking prices",
  compare_portfolio_pricing: "Comparing portfolio pricing",
  get_market_price_trends: "Getting market trends",
  analyze_should_cost: "Building cost model",
  generate_negotiation_brief: "Generating negotiation brief",
  generate_vendor_recommendations: "Generating vendor recommendations",
  assess_commodity_buy_timing: "Assessing buy timing",
  create_action_plan: "Creating action plan",
  identify_alternative_suppliers: "Finding alternative suppliers",
  generate_business_case: "Building business case",
  generate_savings_report: "Generating savings report",
  optimize_payment_terms: "Analyzing payment terms",
};

interface ToolCallIndicatorProps {
  toolName: string;
  args: Record<string, unknown>;
  state: "call" | "result";
}

export function ToolCallIndicator({ toolName, args, state }: ToolCallIndicatorProps) {
  const [expanded, setExpanded] = useState(false);
  const displayName = toolDisplayNames[toolName] || toolName;
  const isLoading = state === "call";

  return (
    <div className="my-1.5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted"
      >
        {isLoading ? (
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
        ) : (
          <CheckCircle2 className="h-3 w-3 text-green-600" />
        )}
        <Wrench className="h-3 w-3" />
        <span>{displayName}{isLoading ? "..." : ""}</span>
        {Object.keys(args).length > 0 && (
          expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />
        )}
      </button>
      {expanded && Object.keys(args).length > 0 && (
        <div className="mt-1 ml-5 rounded-md bg-muted p-3 text-xs font-mono text-muted-foreground">
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

export function ToolCallGroup({ toolCalls }: { toolCalls: Array<{ toolName: string; args: Record<string, unknown>; state: "call" | "result" }> }) {
  if (toolCalls.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {toolCalls.map((tc, i) => (
        <ToolCallIndicator key={i} {...tc} />
      ))}
    </div>
  );
}
