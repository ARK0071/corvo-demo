import { NextRequest, NextResponse } from "next/server";
import { setTenantConfigFromHeaders } from "@/lib/db/tenant-config";
import * as DemoGrantDrafts from "@/lib/db/repositories/demo-grant-drafts";

export async function GET(request: NextRequest) {
  try {
    setTenantConfigFromHeaders(request.headers);

    const stats = await DemoGrantDrafts.getDraftStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Grant drafts stats error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get stats" },
      { status: 500 }
    );
  }
}
