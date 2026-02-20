import { NextRequest, NextResponse } from "next/server";
import { searchGrants, type GrantsSearchParams } from "@/lib/grants-gov";

/**
 * POST /api/grants-search
 *
 * Proxy endpoint for searching federal grant opportunities via Grants.gov API
 *
 * Request body:
 * {
 *   keyword?: string;
 *   agency?: string;
 *   oppStatuses?: string[];
 *   fundingCategories?: string[];
 *   rows?: number;
 *   startRecordNum?: number;
 *   sortBy?: string;
 * }
 *
 * Response:
 * {
 *   grants: DiscoveredGrant[];
 *   totalCount: number;
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate and sanitize params
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
    }

    if (typeof body.startRecordNum === "number" && body.startRecordNum >= 0) {
      params.startRecordNum = body.startRecordNum;
    }

    if (body.sortBy && typeof body.sortBy === "string") {
      params.sortBy = body.sortBy;
    }

    // Call Grants.gov API
    const result = await searchGrants(params);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error in /api/grants-search:", error);

    const message = error instanceof Error ? error.message : "Failed to search grants";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
