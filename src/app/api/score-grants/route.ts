/**
 * POST /api/score-grants
 *
 * Server-side grant scoring with embedding-based profile, project, and spend similarity.
 */

import { NextResponse } from "next/server";
import { scoreGrantsServer } from "@/lib/score-grants-server";
import { getProfile, DEFAULT_PROFILE_ID } from "@/data/profiles";
import { runWithProfileIdAsync } from "@/lib/profile-request-context";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const grants = Array.isArray(body.grants) ? body.grants : [];
    const rawId = body.profileId;
    const profileId =
      typeof rawId === "string" && getProfile(rawId) ? rawId : DEFAULT_PROFILE_ID;

    const scores = await runWithProfileIdAsync(profileId, () =>
      scoreGrantsServer(grants, profileId)
    );

    return NextResponse.json({ scores });
  } catch (err) {
    console.error("[score-grants] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Scoring failed" },
      { status: 500 }
    );
  }
}
