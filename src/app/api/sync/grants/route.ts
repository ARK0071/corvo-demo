import { NextRequest, NextResponse } from "next/server";
import { syncGrants, getLastSuccessfulSync } from "@/lib/db/sync-service";

export const maxDuration = 60; // Allow up to 60 seconds for sync operations

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const result = await syncGrants({
      keyword: body.keyword,
      oppStatuses: body.oppStatuses || ["posted", "forecasted"],
      rows: body.rows || 100,
      fetchDetails: body.fetchDetails ?? true,
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
    console.error("Grant sync error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sync failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const lastSync = await getLastSuccessfulSync("grants");
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
