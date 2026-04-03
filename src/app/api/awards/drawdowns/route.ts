import { NextRequest, NextResponse } from "next/server";
import { setTenantConfigFromHeaders } from "@/lib/db/tenant-config";
import * as DemoAwards from "@/lib/db/repositories/demo-awards";
import type { DrawdownStatus } from "@/data/awards";

// GET: List drawdowns
export async function GET(request: NextRequest) {
  try {
    setTenantConfigFromHeaders(request.headers);

    const searchParams = request.nextUrl.searchParams;
    const awardId = searchParams.get("awardId");

    if (awardId) {
      const drawdowns = await DemoAwards.getDrawdownsForAward(awardId);
      return NextResponse.json({ drawdowns, total: drawdowns.length });
    }

    const drawdowns = await DemoAwards.getAllDrawdowns();
    return NextResponse.json({ drawdowns, total: drawdowns.length });
  } catch (error) {
    console.error("Drawdowns GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch drawdowns" },
      { status: 500 }
    );
  }
}

// POST: Create a new drawdown
export async function POST(request: NextRequest) {
  try {
    setTenantConfigFromHeaders(request.headers);
    const body = await request.json();

    const { awardId, expenseIds, notes } = body;

    if (!awardId || !expenseIds || !Array.isArray(expenseIds)) {
      return NextResponse.json(
        { error: "awardId and expenseIds array are required" },
        { status: 400 }
      );
    }

    const drawdown = await DemoAwards.createDrawdown({
      awardId,
      expenseIds,
      notes: notes || "",
    });

    return NextResponse.json(drawdown, { status: 201 });
  } catch (error) {
    console.error("Drawdowns POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create drawdown" },
      { status: 500 }
    );
  }
}

// PUT: Update drawdown status
export async function PUT(request: NextRequest) {
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

    const drawdown = await DemoAwards.updateDrawdownStatus(id, status as DrawdownStatus);
    if (!drawdown) {
      return NextResponse.json({ error: "Drawdown not found" }, { status: 404 });
    }

    return NextResponse.json(drawdown);
  } catch (error) {
    console.error("Drawdowns PUT error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update drawdown" },
      { status: 500 }
    );
  }
}
