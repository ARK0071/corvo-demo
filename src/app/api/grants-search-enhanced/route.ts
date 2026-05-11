import { NextRequest, NextResponse } from "next/server";
import { searchGrants as searchGrantsGov, type GrantsSearchParams } from "@/lib/grants-gov";
import { enhanceUSDOTGrant } from "@/lib/usdot-grants";
import { resolveSecureTenant } from "@/lib/db/tenant-config.server";
import * as DemoGrants from "@/lib/db/repositories/demo-grants";

/**
 * POST /api/grants-search-enhanced
 *
 * DB-first grant search with Grants.gov fallback.
 * 1. First queries the database for cached grants
 * 2. If DB has results, returns those
 * 3. Otherwise falls back to Grants.gov API and persists results
 */
export async function POST(request: NextRequest) {
  try {
    const tenantConfig = await resolveSecureTenant(request.headers);

    const body = await request.json();

    const params: GrantsSearchParams = {};

    if (body.keyword && typeof body.keyword === "string") {
      const kw = body.keyword.trim().slice(0, 200);
      if (kw) params.keyword = kw;
    }

    if (typeof body.agencies === "string" && body.agencies.trim()) {
      params.agencies = body.agencies.trim().slice(0, 500);
    } else if (body.agency && typeof body.agency === "string" && body.agency.trim()) {
      params.agency = body.agency.trim().slice(0, 200);
    }

    if (Array.isArray(body.oppStatuses)) {
      const validStatuses = ["posted", "forecasted", "closed", "archived"];
      params.oppStatuses = body.oppStatuses.filter(
        (s: unknown) => typeof s === "string" && validStatuses.includes(s)
      );
    }

    if (Array.isArray(body.fundingCategories)) {
      params.fundingCategories = body.fundingCategories.filter(
        (c: unknown) => typeof c === "string" && /^[A-Z0-9]{1,6}$/i.test(c)
      );
    }

    if (Array.isArray(body.fundingInstruments)) {
      params.fundingInstruments = body.fundingInstruments.filter(
        (c: unknown) => typeof c === "string" && /^[A-Z]{1,3}$/i.test(c)
      );
    }

    if (Array.isArray(body.eligibilities)) {
      params.eligibilities = body.eligibilities.filter(
        (c: unknown) => typeof c === "string" && /^\d{2}$/.test(c)
      );
    }

    if (body.oppNum && typeof body.oppNum === "string") {
      const o = body.oppNum.trim().slice(0, 120);
      if (o) params.oppNum = o;
    }

    if (body.aln && typeof body.aln === "string") {
      const a = body.aln.trim().slice(0, 40);
      if (a) params.aln = a;
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
      const s = body.sortBy.trim().slice(0, 80);
      if (/^[a-zA-Z0-9_|.-]+$/.test(s)) {
        params.sortBy = s;
      }
    }

    // Try DB-first for demo environment
    if (tenantConfig.environment === "demo" && process.env.DATABASE_URL) {
      try {
        const dbResult = await DemoGrants.searchGrants({
          keyword: params.keyword,
          status: params.oppStatuses,
          agency: params.agency || (params.agencies?.split("|")[0]),
          limit: params.rows,
          offset: params.startRecordNum,
        });

        // If DB has results, return them
        if (dbResult.grants.length > 0) {
          console.log(`[grants-search-enhanced] Returning ${dbResult.grants.length} grants from DB`);

          // Enhance grants and sort
          const grants = dbResult.grants.map((g) => enhanceUSDOTGrant(g));
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
              totalCount: dbResult.total,
              sources: {
                database: true,
                grants_gov: false,
              },
            },
            { status: 200 }
          );
        }
      } catch (dbError) {
        console.error("[grants-search-enhanced] DB query failed, falling back to Grants.gov:", dbError);
      }
    }

    // Fall back to Grants.gov API
    const hasStructuredFilters = Boolean(
      params.oppNum ||
        params.aln ||
        params.agencies ||
        params.agency ||
        (params.fundingCategories?.length ?? 0) > 0 ||
        (params.fundingInstruments?.length ?? 0) > 0 ||
        (params.eligibilities?.length ?? 0) > 0
    );

    const keywordForSearch =
      params.keyword ||
      (hasStructuredFilters
        ? undefined
        : "port OR maritime OR transportation OR infrastructure OR seaport");

    const { grants: rawGrants, totalCount } = await searchGrantsGov({
      ...params,
      keyword: keywordForSearch,
    });

    const grants = rawGrants.map((g) => enhanceUSDOTGrant(g));

    // Persist to DB in background (non-blocking)
    if (grants.length > 0 && process.env.DATABASE_URL) {
      // Use demo grants for demo environment
      if (tenantConfig.environment === "demo") {
        DemoGrants.upsertGrants(grants)
          .then((result) => {
            console.log(
              `[grants-search-enhanced] Persisted ${result.created} new, ${result.updated} updated grants to demo DB`
            );
          })
          .catch((err: unknown) => {
            console.error("Failed to persist grants to demo database:", err);
          });
      } else if (process.env.RDS_HOST) {
        // Use production tables for non-demo environments
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
          database: false,
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
