import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api-guard";
import { getTeamMembersByPortSlug } from "@/lib/db/repositories/grant-assignments";

// GET /api/team - Get team members for current user's port
export const GET = withAuth(async (_request, { user }) => {
  const members = await getTeamMembersByPortSlug(user.portId);
  return NextResponse.json({ members });
});
