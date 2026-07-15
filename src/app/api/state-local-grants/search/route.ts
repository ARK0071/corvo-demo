import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { getProfile, ensureProfilesLoaded } from "@/data/profiles";
import { searchBrave } from "@/lib/brave-search";
import { prisma } from "@/lib/db/client";
import type { PortProfile } from "@/data/port-profile";
import type { DiscoveredGrant } from "@/lib/grants-gov";

export const dynamic = "force-dynamic";
export const maxDuration = 120; // Allow up to 2 minutes for thorough search

interface BraveResult {
  title: string;
  url: string;
  description: string;
  hostname: string;
}

/**
 * POST /api/state-local-grants/search
 *
 * Uses Claude + Brave Search to find 20-30 state/local grants for a port profile.
 * Two-pass approach:
 *   1. Generate targeted search queries from the profile
 *   2. Execute searches via Brave, collect results
 *   3. Use Claude to extract structured grant data from results
 */
export async function POST(req: NextRequest) {
  await ensureProfilesLoaded();

  const { profileId } = await req.json();
  if (!profileId) {
    return NextResponse.json({ error: "Missing profileId" }, { status: 400 });
  }

  const profile = getProfile(profileId);
  if (!profile) {
    return NextResponse.json({ error: `Unknown profile: ${profileId}` }, { status: 400 });
  }

  if (!process.env.BRAVE_SEARCH_API_KEY) {
    return NextResponse.json({ error: "BRAVE_SEARCH_API_KEY not configured" }, { status: 500 });
  }

  try {
    // Step 1: Generate search queries using Claude
    const queries = await generateSearchQueries(profile);

    // Step 2: Execute searches in parallel batches
    const allResults = await executeSearches(queries);

    if (allResults.length === 0) {
      return NextResponse.json({ grants: [], message: "No results found from web search" });
    }

    // Step 3: Use Claude to extract structured grants from search results
    const grants = await extractGrants(allResults, profile);

    // Step 4: Persist to database
    await persistGrants(grants, profileId);

    return NextResponse.json({ grants });
  } catch (error) {
    console.error("[state-local-search] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Search failed" },
      { status: 500 }
    );
  }
}

/**
 * Step 1: Use Claude to generate targeted search queries based on the profile
 */
async function generateSearchQueries(profile: PortProfile): Promise<string[]> {
  const profileSummary = [
    `Organization: ${profile.name}`,
    `Type: ${profile.entityType} — ${profile.classification}`,
    `Location: ${profile.location.city}, ${profile.location.state} (${profile.location.county}, ${profile.location.region})`,
    `Priorities: ${profile.priorities.join(", ")}`,
    `Needs: ${profile.needs.join(", ")}`,
    `Capabilities: ${profile.capabilities.join(", ")}`,
    `Environmental Goals: ${profile.environmentalGoals.join(", ")}`,
  ].join("\n");

  try {
    const { text } = await generateText({
      model: anthropic("claude-sonnet-4-6"),
      prompt: `You are a grant research specialist. Generate 15-20 search queries to find STATE and LOCAL grant opportunities (NOT federal) for this organization. Focus on finding smaller, niche grants from state agencies, regional development organizations, local government programs, state DOTs, economic development agencies, environmental agencies, and similar state/local sources.

ORGANIZATION PROFILE:
${profileSummary}

REQUIREMENTS:
- Target grants from ${profile.location.state} state agencies and ${profile.location.region} regional entities
- Include searches for: state DOT programs, economic development, environmental/resilience, infrastructure, workforce, maritime/port-specific state programs
- Include some broader searches for ${profile.location.state} grants matching the org's priorities
- Include searches targeting specific state agency websites (e.g., state DOT, environmental quality, water board, comptroller, governor's office)
- Use "site:" operators for known state agency domains where appropriate
- Each query should be specific enough to return relevant grant/funding results
- Do NOT include federal agencies like FEMA, DOT (federal), EPA (federal), etc.

Return ONLY a JSON array of search query strings, no other text. Example format:
["query 1", "query 2", ...]`,
    });

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("No JSON array found");
    const queries: string[] = JSON.parse(jsonMatch[0]);
    return queries.slice(0, 20);
  } catch {
    return generateFallbackQueries(profile);
  }
}

/**
 * Fallback query generation if Claude fails
 */
function generateFallbackQueries(profile: PortProfile): string[] {
  const { state, stateCode, county, region, city } = profile.location;
  const type = profile.classification.toLowerCase();

  const queries: string[] = [
    `${state} state grant ${type} infrastructure funding opportunity 2025 2026`,
    `${state} department of transportation ${type} grant program`,
    `${state} economic development grant ${city} ${type}`,
    `${state} environmental grant ${type} resilience coastal`,
    `${state} port infrastructure funding program`,
    `${region} ${state} infrastructure grant funding opportunity`,
    `${county} ${state} grant funding economic development`,
    `${state} workforce development grant ${type}`,
    `${state} maritime infrastructure grant program`,
    `${stateCode} state grant application port authority 2025 2026`,
  ];

  for (const priority of profile.priorities.slice(0, 4)) {
    queries.push(`${state} grant ${priority} ${type}`);
  }

  return queries;
}

/**
 * Step 2: Execute Brave searches in parallel batches
 */
async function executeSearches(queries: string[]): Promise<BraveResult[]> {
  const allResults: BraveResult[] = [];
  const seenUrls = new Set<string>();

  // Execute in batches of 5 to respect rate limits
  const batchSize = 5;
  for (let i = 0; i < queries.length; i += batchSize) {
    const batch = queries.slice(i, i + batchSize);
    const batchPromises = batch.map(async (query) => {
      try {
        const response = await searchBrave(query, { count: 15 });
        return (response.web?.results || []).map((r) => ({
          title: r.title,
          url: r.url,
          description: r.description,
          hostname: r.meta_url?.hostname || new URL(r.url).hostname,
        }));
      } catch (err) {
        console.error(`[state-local-search] Brave error for "${query}":`, err);
        return [];
      }
    });

    const batchResults = await Promise.all(batchPromises);
    for (const results of batchResults) {
      for (const r of results) {
        if (!seenUrls.has(r.url)) {
          seenUrls.add(r.url);
          allResults.push(r);
        }
      }
    }
  }

  // Filter out obviously federal results
  const federalDomains = ["grants.gov", "sam.gov", "usaspending.gov", "federalregister.gov"];
  return allResults.filter((r) => {
    const host = r.hostname.toLowerCase();
    return !federalDomains.some((d) => host.includes(d));
  });
}

/**
 * Step 3: Use Claude to extract structured grant data from raw search results
 */
async function extractGrants(
  results: BraveResult[],
  profile: PortProfile
): Promise<DiscoveredGrant[]> {
  // Limit results to avoid token limits (send top ~150 results)
  const trimmed = results.slice(0, 150);

  const resultsText = trimmed
    .map(
      (r, i) =>
        `[${i + 1}] Title: ${r.title}\nURL: ${r.url}\nHost: ${r.hostname}\nSnippet: ${r.description}\n`
    )
    .join("\n");

  const { text } = await generateText({
    model: anthropic("claude-sonnet-4-6"),
    prompt: `You are a grant research analyst. From these web search results, identify ACTUAL grant/funding opportunities that are relevant to a ${profile.classification} in ${profile.location.city}, ${profile.location.state}.

IMPORTANT RULES:
- Only include results that are ACTUAL grant programs, funding opportunities, or NOFOs — not news articles, blog posts, or general info pages
- Only include STATE or LOCAL grants — exclude any federal programs (FEMA, federal DOT, EPA, etc.)
- Include grants from: state agencies, regional development orgs, state DOTs, economic development agencies, state environmental agencies, state energy offices, MPOs, councils of government, foundations, and similar
- For each grant, extract as much detail as possible from the title and snippet
- If a deadline is mentioned, include it. If no deadline, leave closeDate empty.
- If a funding amount is mentioned, parse it into numbers. If not mentioned, use 0.
- Aim for 20-30 high-quality grants. Quality over quantity.
- Do NOT fabricate details — only use information present in the search results

ORGANIZATION: ${profile.name} (${profile.classification}) in ${profile.location.city}, ${profile.location.state}
PRIORITIES: ${profile.priorities.slice(0, 6).join(", ")}

SEARCH RESULTS:
${resultsText}

Return a JSON array of grant objects. Each object must have these exact fields:
{
  "title": "Grant program name",
  "agency": "Issuing agency/organization",
  "description": "Summary from snippet",
  "awardFloor": 0,
  "awardCeiling": 0,
  "closeDate": "YYYY-MM-DD or empty string",
  "applicationUrl": "URL from search result",
  "eligibility": ["eligible entity types"],
  "fundingCategories": ["focus area tags"],
  "costSharing": false,
  "status": "posted or forecasted",
  "level": "state or local or regional"
}

Return ONLY the JSON array, no other text.`,
  });

  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const raw = JSON.parse(jsonMatch[0]) as Array<{
      title: string;
      agency: string;
      description: string;
      awardFloor: number;
      awardCeiling: number;
      closeDate: string;
      applicationUrl: string;
      eligibility: string[];
      fundingCategories: string[];
      costSharing: boolean;
      status: string;
      level: string;
    }>;

    // Convert to DiscoveredGrant format
    return raw
      .filter((g) => g.title && g.applicationUrl)
      .map((g, i) => ({
        id: `sl-search-${g.applicationUrl.replace(/[^a-zA-Z0-9]/g, "").substring(0, 40)}-${i}`,
        opportunityNumber: "",
        title: g.title,
        agency: g.agency || "Unknown Agency",
        agencyCode: "",
        description: g.description || "",
        awardFloor: typeof g.awardFloor === "number" ? g.awardFloor : 0,
        awardCeiling: typeof g.awardCeiling === "number" ? g.awardCeiling : 0,
        totalFunding: Math.max(
          typeof g.awardCeiling === "number" ? g.awardCeiling : 0,
          typeof g.awardFloor === "number" ? g.awardFloor : 0
        ),
        closeDate: g.closeDate || "",
        postDate: new Date().toISOString().split("T")[0],
        status: g.status === "forecasted" ? "forecasted" : "posted",
        applicationUrl: g.applicationUrl,
        eligibility: Array.isArray(g.eligibility) ? g.eligibility : [],
        fundingCategories: Array.isArray(g.fundingCategories) ? g.fundingCategories : [],
        fundingInstruments: [],
        costSharing: Boolean(g.costSharing),
        alnNumbers: [],
        source: `state-local (${g.level || "state"})`,
      }));
  } catch (err) {
    console.error("[state-local-search] Failed to parse Claude response:", err);
    return [];
  }
}

/**
 * Step 4: Persist grants to the database, upserting by applicationUrl per profile.
 */
async function persistGrants(grants: DiscoveredGrant[], profileSlug: string): Promise<void> {
  try {
    const profile = await prisma.portProfile.findFirst({
      where: { slug: profileSlug },
      select: { id: true },
    });
    if (!profile) return;

    const now = new Date();

    for (const grant of grants) {
      // Create a stable key from the applicationUrl
      const grantKey = grant.applicationUrl
        ? grant.applicationUrl.replace(/[^a-zA-Z0-9]/g, "").substring(0, 250)
        : grant.title.replace(/[^a-zA-Z0-9]/g, "").substring(0, 250);

      await prisma.stateLocalGrant.upsert({
        where: {
          portProfileId_grantKey: {
            portProfileId: profile.id,
            grantKey,
          },
        },
        update: {
          title: grant.title,
          agency: grant.agency,
          description: grant.description || null,
          awardFloor: grant.awardFloor,
          awardCeiling: grant.awardCeiling,
          totalFunding: grant.totalFunding,
          closeDate: grant.closeDate ? new Date(grant.closeDate) : null,
          postDate: grant.postDate ? new Date(grant.postDate) : null,
          status: grant.status,
          applicationUrl: grant.applicationUrl || null,
          costSharing: grant.costSharing,
          eligibility: grant.eligibility,
          fundingCategories: grant.fundingCategories,
          source: grant.source || "state-local",
          searchedAt: now,
        },
        create: {
          portProfileId: profile.id,
          grantKey,
          title: grant.title,
          agency: grant.agency,
          description: grant.description || null,
          awardFloor: grant.awardFloor,
          awardCeiling: grant.awardCeiling,
          totalFunding: grant.totalFunding,
          closeDate: grant.closeDate ? new Date(grant.closeDate) : null,
          postDate: grant.postDate ? new Date(grant.postDate) : null,
          status: grant.status,
          applicationUrl: grant.applicationUrl || null,
          costSharing: grant.costSharing,
          eligibility: grant.eligibility,
          fundingCategories: grant.fundingCategories,
          source: grant.source || "state-local",
          searchedAt: now,
        },
      });
    }
  } catch (err) {
    // Don't fail the search if persistence fails
    console.error("[state-local-search] Failed to persist grants:", err);
  }
}
