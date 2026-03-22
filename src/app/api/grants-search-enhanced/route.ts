import { NextRequest, NextResponse } from "next/server";
import { searchGrants, type GrantsSearchParams } from "@/lib/grants-gov";
import { enhanceUSDOTGrant } from "@/lib/usdot-grants";

/**
 * POST /api/grants-search-enhanced
 *
 * Grant search via Grants.gov only (single query — no extra USDOT-specific parallel searches).
 * DOT-related opportunities still appear when they match your keyword; `enhanceUSDOTGrant`
 * enriches known program titles with typical funding metadata when applicable.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const params: GrantsSearchParams = {};

    if (body.keyword && typeof body.keyword === "string") {
      params.keyword = body.keyword.trim().slice(0, 200);
    }

    if (body.agency && typeof body.agency === "string") {
      params.agency = body.agency.trim();
    }

    if (Array.isArray(body.oppStatuses)) {
      const validStatuses = ["posted", "forecasted", "closed", "archived"];
      params.oppStatuses = body.oppStatuses.filter(
        (s: unknown) => typeof s === "string" && validStatuses.includes(s)
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
      params.rows = 50;
    }

    if (typeof body.startRecordNum === "number" && body.startRecordNum >= 0) {
      params.startRecordNum = body.startRecordNum;
    }

    if (body.sortBy && typeof body.sortBy === "string") {
      params.sortBy = body.sortBy;
    }

    const mainKeyword =
      params.keyword || "port OR maritime OR transportation OR infrastructure OR seaport";

    const { grants: rawGrants, totalCount } = await searchGrants({
      ...params,
      keyword: mainKeyword,
    });

    const grants = rawGrants.map((g) => enhanceUSDOTGrant(g));

    if (grants.length > 0 && process.env.RDS_HOST) {
      import("@/lib/db/repositories")
        .then(async ({ ActiveGrants }) => {
          const { embedAndStoreGrants } = await import("@/lib/db/embedding-service");
          const result = await ActiveGrants.upsertGrants(grants);
          console.log(
            `[grants-search-enhanced] Persisted ${result.created} new, ${result.updated} updated grants`
          );
          if (result.created > 0 || result.updated > 0) {
            await embedAndStoreGrants(grants);
          }
        })
        .catch((err: unknown) => {
          console.error("Failed to persist grants to database:", err);
        });
    }

    grants.sort((a, b) => {
      const aIsDOT = a.agencyCode === "DOT";
      const bIsDOT = b.agencyCode === "DOT";
      if (aIsDOT && !bIsDOT) return -1;
      if (!aIsDOT && bIsDOT) return 1;
      return (b.awardCeiling || 0) - (a.awardCeiling || 0);
    });

    return NextResponse.json(
      {
        grants,
        totalCount: Math.max(totalCount, grants.length),
        sources: {
          grants_gov: true,
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
