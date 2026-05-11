import { NextRequest, NextResponse } from "next/server";
import { resolveSecureTenant } from "@/lib/db/tenant-config.server";
import * as Awards from "@/lib/db/repositories/awards";

export async function GET(request: NextRequest) {
  try {
    await resolveSecureTenant(request.headers);

    const stats = await Awards.getAwardStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Awards stats error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get stats" },
      { status: 500 }
    );
  }
}
