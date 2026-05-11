import { NextRequest, NextResponse } from "next/server";
import { resolveSecureTenant } from "@/lib/db/tenant-config.server";
import * as Awards from "@/lib/db/repositories/awards";
import type { MatchType } from "@/data/awards";

// GET: Get match ledger for an award
export async function GET(request: NextRequest) {
  try {
    await resolveSecureTenant(request.headers);

    const searchParams = request.nextUrl.searchParams;
    const awardId = searchParams.get("awardId");

    if (!awardId) {
      return NextResponse.json({ error: "awardId is required" }, { status: 400 });
    }

    const entries = await Awards.getMatchLedgerForAward(awardId);
    return NextResponse.json({ entries, total: entries.length });
  } catch (error) {
    console.error("Match ledger GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch match ledger" },
      { status: 500 }
    );
  }
}

// POST: Add a match entry
export async function POST(request: NextRequest) {
  try {
    await resolveSecureTenant(request.headers);
    const body = await request.json();

    const { awardId, date, description, amount, type, documentation } = body;

    if (!awardId || !date || !description || amount === undefined || !type) {
      return NextResponse.json(
        { error: "awardId, date, description, amount, and type are required" },
        { status: 400 }
      );
    }

    const entry = await Awards.addMatchEntry({
      awardId,
      date,
      description,
      amount,
      type: type as MatchType,
      documentation,
    });

    if (!entry) {
      return NextResponse.json({ error: "Award not found" }, { status: 404 });
    }

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error("Match ledger POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to add match entry" },
      { status: 500 }
    );
  }
}
