import { NextRequest, NextResponse } from "next/server";
import { fetchGrantDetails } from "@/lib/grants-gov";

/**
 * POST /api/grant-details
 *
 * Fetch detailed grant information via Grants.gov fetchOpportunity API
 *
 * Request body:
 * {
 *   opportunityId: number | string
 * }
 *
 * Response:
 * DiscoveredGrant (detailed grant information)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.opportunityId) {
      return NextResponse.json(
        { error: "opportunityId is required" },
        { status: 400 }
      );
    }

    const opportunityId = String(body.opportunityId);

    // Validate opportunityId is a number
    if (!/^\d+$/.test(opportunityId)) {
      return NextResponse.json(
        { error: "opportunityId must be a valid number" },
        { status: 400 }
      );
    }

    // Fetch grant details from Grants.gov
    const grant = await fetchGrantDetails(opportunityId);

    return NextResponse.json(grant, { status: 200 });
  } catch (error) {
    console.error("Error in /api/grant-details:", error);

    const message = error instanceof Error ? error.message : "Failed to fetch grant details";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
