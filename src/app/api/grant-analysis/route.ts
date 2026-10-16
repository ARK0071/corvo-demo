import { streamText, stepCountIs } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { fetchGrantDetails } from "@/lib/grants-gov";
import { searchBrave } from "@/lib/brave-search";
import { ensureProfilesLoaded, getProfile, getDefaultProfile } from "@/data/profiles";
import { initializeProjectsForProfile, getAllProjects } from "@/data/projects";
import { runWithProfileIdAsync, getRequestProfileId } from "@/lib/profile-request-context";
import type { PortProfile } from "@/data/port-profile";
import type { DiscoveredGrant } from "@/lib/grants-gov";
import type { Project } from "@/data/projects";

export const maxDuration = 120;

function buildSystemPrompt(
  grant: DiscoveredGrant,
  profile: PortProfile,
  projects: Project[]
) {
  const projectSummaries = projects
    .slice(0, 10)
    .map(
      (p) =>
        `- **${p.name}** (${p.status}, ${p.priority} priority, $${(p.budget / 1_000_000).toFixed(1)}M): ${p.description}. Focus areas: ${p.focusAreas.join(", ")}`
    )
    .join("\n");

  const fundingDomains = profile.fundingDomains
    ?.map((d) => d.name)
    .join(", ") || "Not specified";

  return `You are Corvo, an expert grant analyst for port authorities and public infrastructure entities. You are analyzing a specific federal grant opportunity for an entity to determine how it can best be used.

## Your Task
Produce a comprehensive, actionable analysis of the grant below for the entity described. Your analysis should be data-driven, specific, and immediately useful for decision-makers.

## Grant Opportunity
- **Title**: ${grant.title}
- **Agency**: ${grant.agency}
- **Opportunity Number**: ${grant.opportunityNumber}
- **Status**: ${grant.status}
- **Award Range**: $${grant.awardFloor?.toLocaleString() || "N/A"} – $${grant.awardCeiling?.toLocaleString() || "N/A"}
- **Total Funding**: $${grant.totalFunding?.toLocaleString() || "N/A"}
- **Close Date**: ${grant.closeDate || "N/A"}
- **Post Date**: ${grant.postDate || "N/A"}
- **Cost Sharing Required**: ${grant.costSharing ? "Yes" : "No"}
- **Eligible Applicants**: ${grant.eligibility?.join(", ") || "N/A"}
- **Funding Categories**: ${grant.fundingCategories?.join(", ") || "N/A"}
- **Funding Instruments**: ${grant.fundingInstruments?.join(", ") || "N/A"}
- **ALN/CFDA Numbers**: ${grant.alnNumbers?.join(", ") || "N/A"}
- **Description**: ${grant.description?.slice(0, 3000) || "N/A"}

## Entity Profile
- **Name**: ${profile.name}
- **Type**: ${profile.entityType} (${profile.classification})
- **Location**: ${profile.location.city}, ${profile.location.state} (${profile.location.region})
- **Cargo Types**: ${profile.characteristics.cargoTypes.join(", ") || "N/A"}
- **Annual Tonnage**: ${profile.characteristics.annualTonnage?.toLocaleString() || "N/A"}
- **Operating Budget**: $${profile.characteristics.operatingBudget?.toLocaleString() || "N/A"}
- **Employee Count**: ${profile.characteristics.employeeCount || "N/A"}
- **Strategic Priorities**: ${profile.priorities.join(", ") || "N/A"}
- **Current Capabilities**: ${profile.capabilities.join(", ") || "N/A"}
- **Current Needs**: ${profile.needs.join(", ") || "N/A"}
- **Certifications**: ${profile.certifications.join(", ") || "N/A"}
- **Environmental Goals**: ${profile.environmentalGoals.join(", ") || "N/A"}
- **Community Impact Areas**: ${profile.communityImpact.join(", ") || "N/A"}
- **Funding Domains**: ${fundingDomains}

## Entity Projects
${projectSummaries || "No projects defined yet."}

## Analysis Structure
Produce your analysis with these sections. Use markdown headers (##) for each section:

## Eligibility Assessment
Is the entity eligible? Analyze eligible applicant types vs entity type, geographic restrictions, any prerequisites. Give a clear ELIGIBLE / LIKELY ELIGIBLE / UNCLEAR / NOT ELIGIBLE determination.

## Grant Overview & Strategic Fit
Summarize the grant's purpose and explain at a high level how it aligns with the entity's mission, strategic priorities, and needs. What is the core opportunity?

## Project Alignment
Which of the entity's existing projects best match this grant? For each matching project, explain why it's a fit. If no existing projects match well, suggest what kind of project the entity could propose.

## Funding Domain Match
Which of the entity's funding domains does this grant serve? How does the grant's focus areas map to the entity's funding priorities?

## How the Entity Can Use This Grant
Specific, actionable recommendations on how the entity should structure a proposal. What activities/expenditures would be fundable? What outcomes should they commit to? What is the strongest narrative angle?

## Financial Analysis
Award range vs entity needs. Cost sharing/match analysis — can the entity afford the local match? What funding strategy makes sense (full ceiling vs conservative ask)?

## Competitive Positioning
What advantages does the entity have? What risks or weaknesses? How can they strengthen their application? Reference any relevant competitive factors (rural designation, disadvantaged communities, prior performance).

## Key Deadlines & Timeline
Application timeline analysis. Is there enough time? What milestones should the entity target?

## Recommended Next Steps
Numbered, actionable steps the entity should take to pursue this grant.

Be specific and reference the entity's actual data (projects, priorities, capabilities) throughout. Do NOT be generic — every insight should be tied to this specific entity and this specific grant.

If you use the web_search tool, integrate findings naturally into your analysis. Search for things like the grant program's past awards, success factors, the entity's recent news, or relevant regulatory context.`;
}

const tools = {
  web_search: {
    description:
      "Search the web for additional context about the grant program, entity, past awards, competitive landscape, or regulatory requirements. Use this to enrich the analysis with current, factual information.",
    inputSchema: z.object({
      query: z.string().describe("Search query"),
    }),
    execute: async ({ query }: { query: string }) => {
      try {
        const results = await searchBrave(query, { count: 5 });
        return {
          results: results.web.results.map((r) => ({
            title: r.title,
            url: r.url,
            description: r.description,
          })),
        };
      } catch {
        return { results: [], error: "Web search unavailable" };
      }
    },
  },
};

function buildFallbackGrant(grantId: string): DiscoveredGrant {
  return {
    id: grantId,
    opportunityNumber: grantId,
    title: "",
    agency: "",
    agencyCode: "",
    description: "",
    awardFloor: 0,
    awardCeiling: 0,
    totalFunding: 0,
    closeDate: "",
    postDate: "",
    status: "",
    applicationUrl: "",
    eligibility: [],
    fundingCategories: [],
    fundingInstruments: [],
    costSharing: false,
    alnNumbers: [],
  };
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY is not configured." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json();
    const { grantId, profileId: requestedProfileId, grantData } = body;

    if (!grantId) {
      return new Response(
        JSON.stringify({ error: "grantId is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    await ensureProfilesLoaded();

    const profileId =
      typeof requestedProfileId === "string" && getProfile(requestedProfileId)
        ? requestedProfileId
        : "freeport-mock";

    return runWithProfileIdAsync(profileId, async () => {
      initializeProjectsForProfile(profileId);

      const profile =
        getProfile(getRequestProfileId()) ?? getDefaultProfile();

      if (!profile) {
        return new Response(
          JSON.stringify({ error: "No entity profile found." }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Try fetching from Grants.gov for numeric IDs, fall back to client-provided data
      let grant: DiscoveredGrant;
      const isNumericId = /^\d+$/.test(String(grantId));
      if (isNumericId) {
        try {
          grant = await fetchGrantDetails(grantId);
        } catch {
          // Grants.gov fetch failed — use client-provided metadata
          grant = grantData ?? buildFallbackGrant(grantId);
        }
      } else if (grantData && grantData.title) {
        // Non-numeric ID (state/local grant) — use client-provided metadata
        grant = grantData;
      } else {
        grant = buildFallbackGrant(grantId);
      }

      const projects = getAllProjects();
      const systemPrompt = buildSystemPrompt(grant, profile, projects);

      const result = streamText({
        model: anthropic("claude-sonnet-4-6"),
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: `Analyze this grant opportunity for ${profile.name}. Search the web for additional context about the "${grant.title}" grant program and about ${profile.name} to support your analysis with real-world facts. Then produce a comprehensive analysis.`,
          },
        ],
        tools,
        stopWhen: stepCountIs(6),
      });

      return result.toUIMessageStreamResponse();
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
