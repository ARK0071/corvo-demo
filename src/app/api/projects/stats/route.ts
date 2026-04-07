import { NextRequest, NextResponse } from "next/server";
import { setTenantConfigFromHeaders } from "@/lib/db/tenant-config";
import * as DemoProjects from "@/lib/db/repositories/demo-projects";

export async function GET(request: NextRequest) {
  try {
    setTenantConfigFromHeaders(request.headers);

    const stats = await DemoProjects.getProjectStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Projects stats error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get stats" },
      { status: 500 }
    );
  }
}
