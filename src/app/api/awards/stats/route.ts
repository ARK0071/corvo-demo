import { NextRequest, NextResponse } from "next/server";
import { setTenantConfigFromHeaders } from "@/lib/db/tenant-config";
import * as DemoAwards from "@/lib/db/repositories/demo-awards";

export async function GET(request: NextRequest) {
  try {
    setTenantConfigFromHeaders(request.headers);

    const stats = await DemoAwards.getAwardStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Awards stats error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get stats" },
      { status: 500 }
    );
  }
}
