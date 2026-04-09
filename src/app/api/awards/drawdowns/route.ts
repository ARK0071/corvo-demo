import { NextRequest, NextResponse } from "next/server";
import { setTenantConfigFromHeaders } from "@/lib/db/tenant-config";
import * as DemoAwards from "@/lib/db/repositories/demo-awards";
import type { DrawdownStatus } from "@/data/awards";
import {
  assertDrawdownTransition,
  transitionErrorResponse,
  type DrawdownStatus as TransitionDrawdownStatus,
} from "@/lib/state-transitions";
import {
  readJsonBody,
  boundedString,
  ApiLimitError,
} from "@/lib/api-limits";

// Cap drawdown bundle size — UI flow bundles a few dozen expenses at most.
const MAX_EXPENSES_PER_DRAWDOWN = 500;

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

// POST: Create a new drawdown.
//
// Bundling validation (expense ownership, award match, approved status) is
// enforced atomically inside DemoAwards.createDrawdown. Validation errors
// surface as 400; everything else as 500.
export async function POST(request: NextRequest) {
  try {
    setTenantConfigFromHeaders(request.headers);
    const body = await readJsonBody<Record<string, unknown>>(request, { maxBytes: 64 * 1024 });

    const { awardId: rawAwardId, expenseIds, notes } = body;

    let awardId: string;
    try {
      awardId = boundedString(rawAwardId, "awardId", 64)!;
    } catch (e) {
      if (e instanceof ApiLimitError) {
        return NextResponse.json({ error: e.message }, { status: e.status });
      }
      throw e;
    }

    if (!Array.isArray(expenseIds)) {
      return NextResponse.json(
        { error: "expenseIds must be an array" },
        { status: 400 }
      );
    }
    if (expenseIds.length === 0) {
      return NextResponse.json(
        { error: "expenseIds must not be empty" },
        { status: 400 }
      );
    }
    if (expenseIds.length > MAX_EXPENSES_PER_DRAWDOWN) {
      return NextResponse.json(
        { error: `Too many expenses in one drawdown (max ${MAX_EXPENSES_PER_DRAWDOWN})` },
        { status: 413 }
      );
    }

    // Validate each expense ID is a reasonable string. We do not check
    // UUID format here — Postgres will reject any malformed casts inside
    // the transaction. We just need to keep the array tight.
    const cleanExpenseIds: string[] = [];
    for (const id of expenseIds) {
      if (typeof id !== "string" || id.length === 0 || id.length > 64) {
        return NextResponse.json(
          { error: "expenseIds must be non-empty strings under 64 characters" },
          { status: 400 }
        );
      }
      cleanExpenseIds.push(id);
    }

    const cleanNotes = typeof notes === "string" ? notes.slice(0, 2000) : "";

    try {
      const drawdown = await DemoAwards.createDrawdown({
        awardId,
        expenseIds: cleanExpenseIds,
        notes: cleanNotes,
      });
      return NextResponse.json(drawdown, { status: 201 });
    } catch (e) {
      if (e instanceof DemoAwards.DrawdownValidationError) {
        return NextResponse.json({ error: e.message, code: e.code }, { status: 400 });
      }
      throw e;
    }
  } catch (error) {
    if (error instanceof ApiLimitError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Drawdowns POST error:", error);
    return NextResponse.json(
      { error: "Failed to create drawdown" },
      { status: 500 }
    );
  }
}

// PUT: Update drawdown status — server-side validates the transition graph
//      so a client cannot skip workflow stages by POSTing directly.
export async function PUT(request: NextRequest) {
  try {
    setTenantConfigFromHeaders(request.headers);
    const body = await readJsonBody<Record<string, unknown>>(request, { maxBytes: 8 * 1024 });

    const id = typeof body.id === "string" ? body.id.slice(0, 64) : null;
    const status = typeof body.status === "string" ? body.status.slice(0, 32) : null;

    if (!id || !status) {
      return NextResponse.json(
        { error: "id and status are required" },
        { status: 400 }
      );
    }

    // Fetch the drawdown by id (tenant-scoped) so we know what status we're
    // transitioning FROM. The previous implementation pulled every drawdown
    // for the tenant and filtered in JS — slow on big tenants and a needless
    // data exposure if logging ever surfaces the list.
    const existing = await DemoAwards.getDrawdownById(id);
    if (!existing) {
      return NextResponse.json({ error: "Drawdown not found" }, { status: 404 });
    }

    try {
      assertDrawdownTransition(
        existing.status as TransitionDrawdownStatus,
        status as TransitionDrawdownStatus
      );
    } catch (e) {
      const resp = transitionErrorResponse(e);
      if (resp) return NextResponse.json(resp.body, { status: resp.status });
      throw e;
    }

    try {
      const drawdown = await DemoAwards.updateDrawdownStatus(
        id,
        status as DrawdownStatus,
        { expectedFromStatus: existing.status as DrawdownStatus }
      );
      if (!drawdown) {
        return NextResponse.json({ error: "Drawdown not found" }, { status: 404 });
      }
      return NextResponse.json(drawdown);
    } catch (e) {
      if (e instanceof DemoAwards.DrawdownStatusUpdateError) {
        return NextResponse.json({ error: e.message, code: e.code }, { status: 409 });
      }
      throw e;
    }
  } catch (error) {
    if (error instanceof ApiLimitError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Drawdowns PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update drawdown" },
      { status: 500 }
    );
  }
}
