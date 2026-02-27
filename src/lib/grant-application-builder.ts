import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { fetchGrantDetails } from "@/lib/grants-gov";
import type { DiscoveredGrant } from "@/lib/grants-gov";
import { GRANT_APPLICATION_SYSTEM_PROMPT } from "@/lib/grant-application-prompt";

export interface BuildGrantApplicationParams {
  grantId: string;
  portName?: string;
  customPrompt?: string;
}

/**
 * Build grant application content using Anthropic.
 * Fetches grant details from Grants.gov, then generates application narrative
 * using the configured system prompt.
 */
export async function buildGrantApplication(params: BuildGrantApplicationParams): Promise<string> {
  const { grantId, portName = "the port authority", customPrompt } = params;

  const grant = await fetchGrantDetails(grantId);

  const userPrompt = buildUserPrompt(grant, portName);
  const systemPrompt = customPrompt ?? GRANT_APPLICATION_SYSTEM_PROMPT;

  const { text } = await generateText({
    model: anthropic("claude-sonnet-4-5-20250929"),
    system: systemPrompt,
    prompt: userPrompt,
  });

  return text;
}

export function buildUserPrompt(grant: DiscoveredGrant, portName: string): string {
  const sections: string[] = [
    `# Grant Opportunity`,
    `**Title:** ${grant.title}`,
    `**Agency:** ${grant.agency}`,
    `**Opportunity Number:** ${grant.opportunityNumber}`,
    `**Award Range:** ${grant.awardFloor > 0 ? `$${grant.awardFloor.toLocaleString()} - ` : ""}${grant.awardCeiling > 0 ? `$${grant.awardCeiling.toLocaleString()}` : "TBD"}`,
    `**Close Date:** ${grant.closeDate || "TBD"}`,
    `**Cost Sharing:** ${grant.costSharing ? "Required" : "Not required"}`,
    "",
    `# Synopsis`,
    grant.description
      ? grant.description.replace(/<[^>]*>/g, "").slice(0, 3000)
      : "No description available.",
    "",
  ];

  if (grant.eligibility.length > 0) {
    sections.push(`# Eligible Applicants`, grant.eligibility.join("; "), "");
  }

  if (grant.fundingCategories.length > 0) {
    sections.push(`# Funding Categories`, grant.fundingCategories.join(", "), "");
  }

  sections.push(
    "",
    `# Your Task`,
    `Draft a grant application narrative for ${portName} for this opportunity. Structure your response with clear section headers. Be specific and persuasive.`
  );

  return sections.join("\n");
}
