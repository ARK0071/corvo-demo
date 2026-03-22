import { NextRequest, NextResponse } from "next/server";
import { searchGrants, type GrantsSearchParams } from "@/lib/grants-gov";
import { searchUSDOTGrants, enhanceUSDOTGrant, buildUSDOTSearchQuery } from "@/lib/usdot-grants";
import { ActiveGrants } from "@/lib/db/repositories";
import { embedAndStoreGrants } from "@/lib/db/embedding-service";

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
    const searchPromises = [];

    // 1. Main Grants.gov search
    const mainKeyword = params.keyword || "port OR maritime OR transportation OR infrastructure OR seaport";
    searchPromises.push(
      searchGrants({
        ...params,
        keyword: mainKeyword,
      })
    );

    // 2. DOT-specific search (if enabled and not already searching DOT specifically)
    if (includeDOTPrograms && (!params.agency || params.agency.includes("DOT"))) {
      searchPromises.push(
        searchGrants({
          ...params,
          keyword: buildUSDOTSearchQuery(),
          agency: "DOT",
        })
      );

      // 3. Also search by specific DOT program names
      searchPromises.push(
        searchUSDOTGrants({
          status: params.oppStatuses?.includes("posted")
            ? "posted"
            : params.oppStatuses?.includes("forecasted")
              ? "forecasted"
              : "all",
        })
      );
    }

    const results = await Promise.all(searchPromises);

    // Combine and deduplicate results
    const allGrants = new Map<string, any>();
    let totalCount = 0;

    for (const result of results) {
      // Handle both { grants, totalCount } and plain DiscoveredGrant[] returns
      const isArrayResult = Array.isArray(result);
      const grantsFromResult = isArrayResult ? result : (result as { grants: any[]; totalCount: number }).grants;
      const resultCount = isArrayResult ? result.length : (result as { grants: any[]; totalCount: number }).totalCount || 0;

      totalCount = Math.max(totalCount, resultCount);

      for (const grant of grantsFromResult || []) {
        if (!allGrants.has(grant.id)) {
          // Enhance DOT grants with typical funding amounts
          const enhanced = enhanceUSDOTGrant(grant);
          allGrants.set(grant.id, enhanced);
        }
      }
    }

    const grants = Array.from(allGrants.values());

    // Store grants in database and generate embeddings (non-blocking)
    if (grants.length > 0) {
      ActiveGrants.upsertGrants(grants)
        .then(async (result: { created: number; updated: number }) => {
          console.log(`[grants-search-enhanced] Persisted ${result.created} new, ${result.updated} updated grants`);
          // Generate embeddings for newly stored grants
          if (result.created > 0 || result.updated > 0) {
            try {
              await embedAndStoreGrants(grants);
            } catch (embErr) {
              console.error("Failed to generate grant embeddings:", embErr);
            }
          }
        })
        .catch((err: unknown) => {
          console.error("Failed to persist grants to database:", err);
        });
    }

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
          grants_gov: true,
          usdot_programs: includeDOTPrograms,
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
