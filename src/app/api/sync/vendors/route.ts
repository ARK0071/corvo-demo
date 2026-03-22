import { NextRequest, NextResponse } from "next/server";
import { syncVendors, getLastSuccessfulSync } from "@/lib/db/sync-service";
import { PortVendor } from "@/data/port-vendors";

export const maxDuration = 60; // Allow up to 60 seconds for sync operations

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Vendors must be provided in the request body
    // They should already be fetched from USASpending/SAM.gov
    if (!body.vendors || !Array.isArray(body.vendors)) {
      return NextResponse.json(
        { error: "vendors array is required in request body" },
        { status: 400 }
      );
    }

    const vendors: PortVendor[] = body.vendors;

    const result = await syncVendors({
      vendors,
      generateEmbeddings: body.generateEmbeddings ?? true,
    });

    return NextResponse.json({
      success: result.success,
      recordsFetched: result.recordsFetched,
      recordsCreated: result.recordsCreated,
      recordsUpdated: result.recordsUpdated,
      embeddingsGenerated: result.embeddingsGenerated,
      errors: result.errors,
      duration: result.duration,
    });
  } catch (error) {
    console.error("Vendor sync error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sync failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const lastSync = await getLastSuccessfulSync("vendors");
    return NextResponse.json({
      lastSync: lastSync?.toISOString() || null,
    });
  } catch (error) {
    console.error("Error getting sync status:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get status" },
      { status: 500 }
    );
  }
}
