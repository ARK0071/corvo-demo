import { NextRequest, NextResponse } from "next/server";
import { getProfile } from "@/data/profiles";
import { loadStateLocalGrantsFromDisk, getStateLocalGrantsFilePath } from "@/lib/state-local-grants/load-from-disk";

export const dynamic = "force-dynamic";

/**
 * GET /api/state-local-grants?profileId=port-freeport
 * Loads `data/state-local-grants/<profileId>.csv` from the filesystem (demo only).
 */
export async function GET(req: NextRequest) {
  const profileId = req.nextUrl.searchParams.get("profileId")?.trim() ?? "";
  if (!profileId) {
    return NextResponse.json(
      { error: "Missing profileId query parameter", grants: [] },
      { status: 400 }
    );
  }

  if (!getProfile(profileId)) {
    return NextResponse.json(
      { error: `Unknown profileId: ${profileId}`, grants: [] },
      { status: 400 }
    );
  }

  const result = loadStateLocalGrantsFromDisk(profileId);

  return NextResponse.json({
    grants: result.grants,
    missingFile: result.missingFile,
    expectedPath: getStateLocalGrantsFilePath(profileId),
    rowCount: result.rowCount,
    parseWarnings: result.errors.length > 0 ? result.errors : undefined,
  });
}
