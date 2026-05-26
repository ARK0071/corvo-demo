import { NextRequest, NextResponse } from "next/server";
import { resolveSecureTenant } from "@/lib/db/tenant-config.server";
import { auth } from "@/lib/auth/auth";
import * as DemoGrantDrafts from "@/lib/db/repositories/demo-grant-drafts";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    await resolveSecureTenant(request.headers);

    const stats = await DemoGrantDrafts.getDraftStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Grant drafts stats error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get stats" },
      { status: 500 },
    );
  }
}
