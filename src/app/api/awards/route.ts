import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api-guard";
import { setTenantConfigFromHeaders } from "@/lib/db/tenant-config";
import * as DemoAwards from "@/lib/db/repositories/demo-awards";
import type { AwardStatus } from "@/data/awards";

// GET: List all awards or get by ID
export const GET = withAuth(async (request) => {
  try {
    setTenantConfigFromHeaders(request.headers);

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");
    const status = searchParams.get("status") as AwardStatus | null;

    if (id) {
      const award = await DemoAwards.getAwardById(id);
      if (!award) {
        return NextResponse.json({ error: "Award not found" }, { status: 404 });
      }
      return NextResponse.json(award);
    }

    if (status) {
      const awards = await DemoAwards.getAwardsByStatus(status);
      return NextResponse.json({ awards, total: awards.length });
    }

    const awards = await DemoAwards.getAllAwards();
    return NextResponse.json({ awards, total: awards.length });
  } catch (error) {
    console.error("Awards GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch awards" },
      { status: 500 }
    );
  }
});

// POST: Create a new award
export const POST = withAuth(async (request) => {
  try {
    setTenantConfigFromHeaders(request.headers);
    const body = await request.json();

    const { portProfileId, ...awardData } = body;

    if (!portProfileId) {
      return NextResponse.json(
        { error: "portProfileId is required" },
        { status: 400 }
      );
    }

    const award = await DemoAwards.createAward(awardData, portProfileId);
    return NextResponse.json(award, { status: 201 });
  } catch (error) {
    console.error("Awards POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create award" },
      { status: 500 }
    );
  }
});

// PUT: Update award status
export const PUT = withAuth(async (request) => {
  try {
    setTenantConfigFromHeaders(request.headers);
    const body = await request.json();

    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: "id and status are required" },
        { status: 400 }
      );
    }

    const award = await DemoAwards.updateAwardStatus(id, status);
    if (!award) {
      return NextResponse.json({ error: "Award not found" }, { status: 404 });
    }

    return NextResponse.json(award);
  } catch (error) {
    console.error("Awards PUT error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update award" },
      { status: 500 }
    );
  }
});

// DELETE: Delete an award
export const DELETE = withAuth(async (request) => {
  try {
    setTenantConfigFromHeaders(request.headers);
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const deleted = await DemoAwards.deleteAward(id);
    if (!deleted) {
      return NextResponse.json({ error: "Award not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Awards DELETE error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete award" },
      { status: 500 }
    );
  }
});
