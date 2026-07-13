import { NextRequest, NextResponse } from "next/server";
import { resolveSecureTenant } from "@/lib/db/tenant-config.server";
import * as Projects from "@/lib/db/repositories/projects";

export async function GET(request: NextRequest) {
  try {
    await resolveSecureTenant(request.headers);

    const stats = await Projects.getProjectStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Projects stats error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get stats" },
      { status: 500 }
    );
  }
}
