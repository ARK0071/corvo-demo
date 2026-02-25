import { NextRequest, NextResponse } from "next/server";
import { searchGrants, type GrantsSearchParams } from "@/lib/grants-gov";
import { searchUSDOTGrants, enhanceUSDOTGrant, buildUSDOTSearchQuery } from "@/lib/usdot-grants";
import { searchFederalRegister } from "@/lib/federal-register";
import { searchSamOpportunities } from "@/lib/sam-gov";
import { searchTexasGrants } from "@/lib/brave-search";
import { searchTexasGrantsTavily } from "@/lib/tavily-search";

/**
 * POST /api/grants-search-enhanced
 *
 * Enhanced grant search that combines:
 * 1. General Grants.gov search
 * 2. USDOT-specific program searches (PIDP, RAISE, INFRA, MEGA)
 * 3. Deduplication and enhancement
 *
 * Request body: Same as /api/grants-search plus:
 * {
 *   ...GrantsSearchParams,
 *   includeDOTPrograms?: boolean; // Default: true
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const includeDOTPrograms = body.includeDOTPrograms !== false; // Default true

    // Build search params
    const params: GrantsSearchParams = {};

    if (body.keyword && typeof body.keyword === "string") {
      params.keyword = body.keyword.trim().slice(0, 200);
    }

    if (body.agency && typeof body.agency === "string") {
      params.agency = body.agency.trim();
    }

    if (Array.isArray(body.oppStatuses)) {
      const validStatuses = ["posted", "forecasted", "closed", "archived"];
      params.oppStatuses = body.oppStatuses.filter((s: unknown) =>
        typeof s === "string" && validStatuses.includes(s)
      );
    }

    if (Array.isArray(body.fundingCategories)) {
      params.fundingCategories = body.fundingCategories.filter(
        (c: unknown) => typeof c === "string"
      );
    }

    if (typeof body.rows === "number" && body.rows > 0 && body.rows <= 200) {
      params.rows = body.rows;
    } else {
      params.rows = 50; // Default
    }

    if (typeof body.startRecordNum === "number" && body.startRecordNum >= 0) {
      params.startRecordNum = body.startRecordNum;
    }

    if (body.sortBy && typeof body.sortBy === "string") {
      params.sortBy = body.sortBy;
    }

    // Execute searches in parallel
    const searchPromises: Promise<any>[] = [];

    // 1. Main Grants.gov search (default keyword handled in searchGrants)
    searchPromises.push(
      searchGrants({
        ...params,
        keyword: params.keyword, // Will use default in searchGrants if not provided
      }).then((result) => ({ type: "grants_gov", result }))
    );

    // 2. DOT-specific search (if enabled and not already searching DOT specifically)
    if (includeDOTPrograms && (!params.agency || params.agency.includes("DOT"))) {
      searchPromises.push(
        searchGrants({
          ...params,
          keyword: buildUSDOTSearchQuery(),
          agency: "DOT",
        }).then((result) => ({ type: "grants_gov_dot", result }))
      );

      // 3. Also search by specific DOT program names
      searchPromises.push(
        searchUSDOTGrants({
          status: params.oppStatuses?.includes("posted")
            ? "posted"
            : params.oppStatuses?.includes("forecasted")
              ? "forecasted"
              : "all",
        }).then((grants) => ({ type: "usdot", result: { grants, totalCount: grants.length } }))
      );
    }

    // 4. Federal Register search (for early NOFO detection)
    // Always search Federal Register, even without keyword (uses default search)
    searchPromises.push(
      searchFederalRegister({
        query: params.keyword, // Will use default in searchFederalRegister if not provided
        agencies: ["DOT", "DHS", "EPA", "DOC", "DOE", "USDA", "DOD"],
        per_page: 50,
      })
        .then((grants) => {
          console.log(`Federal Register returned ${grants.length} grants`);
          return { type: "federal_register", result: { grants, totalCount: grants.length } };
        })
        .catch((err) => {
          console.error("Federal Register search error:", err);
          return { type: "federal_register", result: { grants: [], totalCount: 0 } };
        })
    );

    // 5. SAM.gov opportunities search (if API key is available)
    // Always search SAM.gov if API key exists (uses default keyword if needed)
    if (process.env.SAM_GOV_API_KEY) {
      searchPromises.push(
        searchSamOpportunities({
          keyword: params.keyword, // Will use default in searchSamOpportunities if not provided
          limit: 100, // Keep limit at 100 as requested
        })
          .then((opportunities) => {
            console.log(`SAM.gov returned ${opportunities.length} opportunities`);
            // Map SAM opportunities to DiscoveredGrant format
            const grants = opportunities
              .filter((opp) => opp.type === "solicitation" || opp.type === "presolicitation")
              .map((opp) => ({
                id: `sam-${opp.noticeId}`,
                opportunityNumber: opp.solicitationNumber || opp.noticeId,
                title: opp.title,
                agency: opp.department,
                agencyCode: opp.department.substring(0, 10).toUpperCase(),
                description: opp.description || opp.title,
                awardFloor: 0,
                awardCeiling: opp.award?.amount || 0,
                totalFunding: opp.award?.amount || 0,
                closeDate: opp.responseDeadLine || "",
                postDate: opp.postedDate,
                status: opp.type === "presolicitation" ? "forecasted" : "posted",
                applicationUrl: `https://sam.gov/opp/${opp.noticeId}/view`,
                eligibility: [],
                fundingCategories: [],
                fundingInstruments: [],
                costSharing: false,
                alnNumbers: [],
                source: "SAM.gov",
              }));
            console.log(`SAM.gov mapped to ${grants.length} grants`);
            return { type: "sam_gov", result: { grants, totalCount: grants.length } };
          })
          .catch((err) => {
            console.error("SAM.gov opportunities search error:", err);
            return { type: "sam_gov", result: { grants: [], totalCount: 0 } };
          })
      );
    }

    // 6. Brave Search for niche Texas grants (if API key is available)
    if (process.env.BRAVE_SEARCH_API_KEY) {
      const searchKeywords = params.keyword 
        ? params.keyword.split(/\s+/).filter(k => k.length > 2)
        : ["port", "maritime", "infrastructure"];
      
      searchPromises.push(
        searchTexasGrants(searchKeywords, {
          includeStateAgencies: true,
          includeRegional: true,
          includeFoundations: true,
          includeLocal: true,
          freshness: "pm", // Past month
        })
          .then((grants) => {
            console.log(`Brave Search returned ${grants.length} niche Texas grants`);
            return { type: "brave_search", result: { grants, totalCount: grants.length } };
          })
          .catch((err) => {
            console.error("Brave Search error:", err);
            return { type: "brave_search", result: { grants: [], totalCount: 0 } };
          })
      );
    }

    // 7. Tavily Search for deep research on Texas grants (if API key is available)
    if (process.env.TAVILY_API_KEY) {
      const searchKeywords = params.keyword 
        ? params.keyword.split(/\s+/).filter(k => k.length > 2)
        : ["port", "maritime", "infrastructure"];
      
      searchPromises.push(
        searchTexasGrantsTavily(searchKeywords, {
          maxResults: 15,
        })
          .then((grants) => {
            console.log(`Tavily Search returned ${grants.length} research-based grants`);
            return { type: "tavily_search", result: { grants, totalCount: grants.length } };
          })
          .catch((err) => {
            console.error("Tavily Search error:", err);
            return { type: "tavily_search", result: { grants: [], totalCount: 0 } };
          })
      );
    }

    const results = await Promise.allSettled(searchPromises);

    // Combine and deduplicate results
    const allGrants = new Map<string, any>();
    let totalCount = 0;
    const sourcesUsed = new Set<string>();

    for (const result of results) {
      if (result.status === "rejected") {
        console.error("Search promise rejected:", result.reason);
        continue;
      }

      const { type, result: searchResult } = result.value;
      sourcesUsed.add(type);

      if (searchResult?.totalCount) {
        totalCount = Math.max(totalCount, searchResult.totalCount);
      }

      for (const grant of searchResult?.grants || []) {
        // Use a combination of ID and source for deduplication
        // This allows same grant from different sources to be shown
        const dedupeKey = grant.source ? `${grant.id}-${grant.source}` : grant.id;
        
        if (!allGrants.has(dedupeKey)) {
          // Enhance DOT grants with typical funding amounts
          const enhanced = enhanceUSDOTGrant(grant);
          allGrants.set(dedupeKey, enhanced);
        }
      }
    }

    const grants = Array.from(allGrants.values());

    // Debug logging
    console.log(`Total grants from all sources: ${grants.length}`);
    const sourceBreakdown = grants.reduce((acc, g) => {
      const source = g.source || "unknown";
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    console.log("Grants by source:", sourceBreakdown);

    // Sort by relevance (DOT grants first if DOT-focused search)
    grants.sort((a, b) => {
      // Prioritize DOT grants
      const aIsDOT = a.agencyCode === "DOT";
      const bIsDOT = b.agencyCode === "DOT";
      if (aIsDOT && !bIsDOT) return -1;
      if (!aIsDOT && bIsDOT) return 1;

      // Then by funding amount
      return (b.awardCeiling || 0) - (a.awardCeiling || 0);
    });

    return NextResponse.json(
      {
        grants,
        totalCount: Math.max(totalCount, grants.length),
        sources: {
          grants_gov: sourcesUsed.has("grants_gov") || sourcesUsed.has("grants_gov_dot"),
          usdot_programs: sourcesUsed.has("usdot"),
          federal_register: sourcesUsed.has("federal_register"),
          sam_gov: sourcesUsed.has("sam_gov"),
          brave_search: sourcesUsed.has("brave_search"),
          tavily_search: sourcesUsed.has("tavily_search"),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in /api/grants-search-enhanced:", error);

    const message =
      error instanceof Error ? error.message : "Failed to search grants";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
