import { NextRequest, NextResponse } from "next/server";
import { setTenantConfigFromHeaders, getTenantConfig } from "@/lib/db/tenant-config";
import * as DemoReports from "@/lib/db/repositories/demo-reports";
import * as Reports from "@/lib/db/repositories/reports";

// Helper to get the appropriate repository based on environment
function getReportsRepo() {
  const { environment } = getTenantConfig();
  return environment === "demo" ? DemoReports : Reports;
}

// GET: Get closeout checklist for an award
export async function GET(request: NextRequest) {
  try {
    setTenantConfigFromHeaders(request.headers);
    const repo = getReportsRepo();

    const searchParams = request.nextUrl.searchParams;
    const awardId = searchParams.get("awardId");

    if (!awardId) {
      // Return all closeout checklists
      const checklists = await repo.getAllCloseoutChecklists();
      return NextResponse.json({ checklists });
    }

    const checklist = await repo.getCloseoutChecklist(awardId);
    return NextResponse.json(checklist);
  } catch (error) {
    console.error("Closeout GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch closeout checklist" },
      { status: 500 }
    );
  }
}

// PUT: Update a closeout item
export async function PUT(request: NextRequest) {
  try {
    setTenantConfigFromHeaders(request.headers);
    const repo = getReportsRepo();
    const body = await request.json();

    const { awardId, itemId, completed } = body;

    if (!awardId || !itemId || completed === undefined) {
      return NextResponse.json(
        { error: "awardId, itemId, and completed are required" },
        { status: 400 }
      );
    }

    const item = await repo.updateCloseoutItem(awardId, itemId, completed);
    if (!item) {
      return NextResponse.json({ error: "Closeout item not found" }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error("Closeout PUT error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update closeout item" },
      { status: 500 }
    );
  }
}