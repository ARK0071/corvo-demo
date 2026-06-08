import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api-guard";
import { resolvePortProfileId } from "@/lib/db/tenant-config.server";
import * as Assignments from "@/lib/db/repositories/grant-assignments";

// GET /api/grant-assignments?awardId=
export const GET = withAuth(async (request, { user }) => {
  const portProfileId = await resolvePortProfileId(request.headers);
  if (!portProfileId) {
    return NextResponse.json({ error: "Port profile not found" }, { status: 404 });
  }

  const params = request.nextUrl.searchParams;
  const awardId = params.get("awardId");

  if (awardId) {
    const assignments = await Assignments.getAssignmentsForAward(awardId);
    return NextResponse.json({ assignments });
  }

  // Return assignments for current user
  const assignments = await Assignments.getAssignmentsForUser(user.id, portProfileId);
  return NextResponse.json({ assignments });
});

// POST /api/grant-assignments
export const POST = withAuth(async (request, { user }) => {
  const portProfileId = await resolvePortProfileId(request.headers);
  if (!portProfileId) {
    return NextResponse.json({ error: "Port profile not found" }, { status: 404 });
  }

  const { awardId, userId, role, area } = await request.json();

  if (!awardId || !userId || !role) {
    return NextResponse.json(
      { error: "awardId, userId, and role are required" },
      { status: 400 }
    );
  }

  if (role === "area_owner" && !area) {
    return NextResponse.json(
      { error: "area is required for area_owner role" },
      { status: 400 }
    );
  }

  const assignment = await Assignments.assignUser(
    portProfileId,
    awardId,
    userId,
    role,
    area
  );

  return NextResponse.json(assignment, { status: 201 });
});

// DELETE /api/grant-assignments?id=
export const DELETE = withAuth(async (request) => {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Assignment ID required" }, { status: 400 });
  }

  await Assignments.removeAssignment(id);
  return NextResponse.json({ success: true });
});
