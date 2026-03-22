import { NextResponse } from "next/server";
import { getRecentSyncLogs, getLastSuccessfulSync } from "@/lib/db/sync-service";

export async function GET() {
  try {
    const [recentLogs, lastGrantsSync, lastVendorsSync] = await Promise.all([
      getRecentSyncLogs(20),
      getLastSuccessfulSync("grants"),
      getLastSuccessfulSync("vendors"),
    ]);

    return NextResponse.json({
      grants: {
        lastSync: lastGrantsSync?.toISOString() || null,
      },
      vendors: {
        lastSync: lastVendorsSync?.toISOString() || null,
      },
      recentLogs: recentLogs.map((log) => ({
        id: log.id,
        entityType: log.entityType,
        apiSource: log.apiSource,
        status: log.status,
        recordsFetched: log.recordsFetched,
        recordsCreated: log.recordsCreated,
        recordsUpdated: log.recordsUpdated,
        startedAt: log.startedAt.toISOString(),
        completedAt: log.completedAt?.toISOString() || null,
        errorMessage: log.errorMessage,
      })),
    });
  } catch (error) {
    console.error("Error getting sync status:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get status" },
      { status: 500 }
    );
  }
}
