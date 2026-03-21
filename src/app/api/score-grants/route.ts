/**
 * POST /api/score-grants
 *
 * Server-side grant scoring with embedding-based profile, project, and spend similarity.
 */

import { NextResponse } from "next/server";
import { scoreGrantsServer } from "@/lib/score-grants-server";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const grants = Array.isArray(body.grants) ? body.grants : [];
    const profileId = body.profileId ?? "port-freeport";

    const scores = await scoreGrantsServer(grants, profileId);

    return NextResponse.json({ scores });
  } catch (err) {
    console.error("[score-grants] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Scoring failed" },
      { status: 500 }
    );
  }
}
