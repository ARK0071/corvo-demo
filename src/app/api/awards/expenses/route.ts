import { NextRequest, NextResponse } from "next/server";
import { setTenantConfigFromHeaders } from "@/lib/db/tenant-config";
import * as DemoAwards from "@/lib/db/repositories/demo-awards";
import type { ExpenseStatus } from "@/data/awards";
import {
  assertExpenseTransition,
  transitionErrorResponse,
  type ExpenseStatus as TransitionExpenseStatus,
} from "@/lib/state-transitions";
import {
  readJsonBody,
  boundedString,
  apiLimitErrorResponse,
  ApiLimitError,
} from "@/lib/api-limits";

// GET: List expenses for an award
export async function GET(request: NextRequest) {
  try {
    setTenantConfigFromHeaders(request.headers);

    const searchParams = request.nextUrl.searchParams;
    const awardId = searchParams.get("awardId");

    if (awardId) {
      const expenses = await DemoAwards.getExpensesForAward(awardId);
      return NextResponse.json({ expenses, total: expenses.length });
    }

    // Return all expenses
    const expenses = await DemoAwards.getAllExpenses();
    return NextResponse.json({ expenses, total: expenses.length });
  } catch (error) {
    console.error("Expenses GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch expenses" },
      { status: 500 }
    );
  }
}

// POST: Log a new expense.
//
// Validates input shape, then delegates to logExpense which atomically
// creates the row and increments the budget category, blocking overspend
// at the database layer.
export async function POST(request: NextRequest) {
  try {
    setTenantConfigFromHeaders(request.headers);

    // Body cap is generous because allocations / attachments lists can
    // grow, but per-field caps below keep individual strings short.
    const body = await readJsonBody<Record<string, unknown>>(request, { maxBytes: 64 * 1024 });

    let awardId: string, categoryId: string, date: string, description: string, vendor: string;
    try {
      awardId = boundedString(body.awardId, "awardId", 64)!;
      categoryId = boundedString(body.categoryId, "categoryId", 64)!;
      date = boundedString(body.date, "date", 32)!;
      description = boundedString(body.description, "description", 1000)!;
      vendor = boundedString(body.vendor, "vendor", 300)!;
    } catch (e) {
      const resp = apiLimitErrorResponse(e);
      if (resp) return NextResponse.json(resp.body, { status: resp.status });
      throw e;
    }

    const amount = body.amount;
    if (amount === undefined || amount === null) {
      return NextResponse.json({ error: "amount is required" }, { status: 400 });
    }

    // Coerce + validate amount at the API boundary so we never trust the client.
    // Cap at 1e10 — well under JS Number's 15-significant-digit precision
    // limit, which prevents the Decimal-precision-loss class of bug.
    const amountNum = typeof amount === "number" ? amount : parseFloat(String(amount));
    if (!Number.isFinite(amountNum) || amountNum <= 0 || amountNum > 1e10) {
      return NextResponse.json(
        { error: "amount must be a positive number under 10 billion" },
        { status: 400 }
      );
    }

    try {
      const expense = await DemoAwards.logExpense({
        awardId,
        categoryId,
        date,
        description,
        vendor,
        amount: amountNum,
        status: body.status as ExpenseStatus | undefined,
        attachments: Array.isArray(body.attachments) ? (body.attachments as string[]) : undefined,
        flagReason: typeof body.flagReason === "string" ? body.flagReason.slice(0, 500) : undefined,
        overrideJustification: typeof body.overrideJustification === "string" ? body.overrideJustification.slice(0, 1000) : undefined,
        allocations: body.allocations,
      });
      return NextResponse.json(expense, { status: 201 });
    } catch (e) {
      if (e instanceof DemoAwards.ExpenseValidationError) {
        return NextResponse.json({ error: e.message, code: e.code }, { status: 400 });
      }
      throw e;
    }
  } catch (error) {
    if (error instanceof ApiLimitError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Expenses POST error:", error);
    return NextResponse.json(
      { error: "Failed to log expense" },
      { status: 500 }
    );
  }
}

// PUT: Update expense status with workflow enforcement.
//
// Drawn expenses are immutable per 2 CFR 200.305. All other transitions
// are governed by EXPENSE_TRANSITIONS in lib/state-transitions.ts.
//
// Note: this PUT used to load every expense in the tenant to find one by ID,
// which was slow and leaked data from other expenses. Now uses a tenant-
// scoped findFirst.
export async function PUT(request: NextRequest) {
  try {
    setTenantConfigFromHeaders(request.headers);
    const body = await readJsonBody<Record<string, unknown>>(request, { maxBytes: 8 * 1024 });

    const expenseId = typeof body.expenseId === "string" ? body.expenseId.slice(0, 64) : null;
    const status = typeof body.status === "string" ? body.status.slice(0, 32) : null;

    if (!expenseId || !status) {
      return NextResponse.json(
        { error: "expenseId and status are required" },
        { status: 400 }
      );
    }

    const current = await DemoAwards.getExpenseById(expenseId);
    if (!current) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    if (current.status === "drawn") {
      return NextResponse.json(
        { error: "Drawn expenses are immutable per 2 CFR 200.305" },
        { status: 400 }
      );
    }

    try {
      assertExpenseTransition(
        current.status as TransitionExpenseStatus,
        status as TransitionExpenseStatus
      );
    } catch (e) {
      const resp = transitionErrorResponse(e);
      if (resp) return NextResponse.json(resp.body, { status: resp.status });
      throw e;
    }

    // Pass the snapshot status into the repo so it can verify nothing
    // changed between the read above and the write inside the
    // transaction (TOCTOU guard).
    try {
      const expense = await DemoAwards.updateExpenseStatus(
        expenseId,
        status as ExpenseStatus,
        { expectedFromStatus: current.status as ExpenseStatus }
      );
      if (!expense) {
        return NextResponse.json({ error: "Expense not found" }, { status: 404 });
      }
      return NextResponse.json(expense);
    } catch (e) {
      if (e instanceof DemoAwards.ExpenseStatusUpdateError) {
        return NextResponse.json(
          { error: e.message, code: e.code },
          { status: e.code === "race" ? 409 : 400 }
        );
      }
      throw e;
    }
  } catch (error) {
    console.error("Expenses PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update expense" },
      { status: 500 }
    );
  }
}
