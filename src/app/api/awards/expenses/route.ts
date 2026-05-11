import { NextRequest, NextResponse } from "next/server";
import { resolveSecureTenant } from "@/lib/db/tenant-config.server";
import * as Awards from "@/lib/db/repositories/awards";
import type { ExpenseStatus } from "@/data/awards";

// GET: List expenses for an award
export async function GET(request: NextRequest) {
  try {
    await resolveSecureTenant(request.headers);

    const searchParams = request.nextUrl.searchParams;
    const awardId = searchParams.get("awardId");

    if (awardId) {
      const expenses = await Awards.getExpensesForAward(awardId);
      return NextResponse.json({ expenses, total: expenses.length });
    }

    // Return all expenses
    const expenses = await Awards.getAllExpenses();
    return NextResponse.json({ expenses, total: expenses.length });
  } catch (error) {
    console.error("Expenses GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch expenses" },
      { status: 500 }
    );
  }
}

// POST: Log a new expense
export async function POST(request: NextRequest) {
  try {
    await resolveSecureTenant(request.headers);
    const body = await request.json();

    const { awardId, categoryId, date, description, vendor, amount, ...rest } = body;

    if (!awardId || !categoryId || !date || !description || !vendor || amount === undefined) {
      return NextResponse.json(
        { error: "awardId, categoryId, date, description, vendor, and amount are required" },
        { status: 400 }
      );
    }

    const expense = await Awards.logExpense({
      awardId,
      categoryId,
      date,
      description,
      vendor,
      amount,
      ...rest,
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error("Expenses POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to log expense" },
      { status: 500 }
    );
  }
}

// PUT: Update expense status with workflow enforcement
// Valid transitions: logged → flagged, logged → approved, flagged → approved, approved → drawn
// Drawn expenses are immutable per 2 CFR 200.305
export async function PUT(request: NextRequest) {
  try {
    await resolveSecureTenant(request.headers);
    const body = await request.json();

    const { expenseId, status } = body;

    if (!expenseId || !status) {
      return NextResponse.json(
        { error: "expenseId and status are required" },
        { status: 400 }
      );
    }

    // Validate status transition
    const VALID_TRANSITIONS: Record<string, string[]> = {
      logged: ["flagged", "approved"],
      flagged: ["approved", "logged"],
      approved: ["drawn"],
      drawn: [], // immutable — no transitions allowed
    };

    // Get current expense to check transition
    const allExpenses = await Awards.getAllExpenses();
    const current = allExpenses.find((e) => e.id === expenseId);

    if (!current) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    if (current.status === "drawn") {
      return NextResponse.json(
        { error: "Drawn expenses are immutable — they cannot be modified (2 CFR 200.305)" },
        { status: 400 }
      );
    }

    const allowed = VALID_TRANSITIONS[current.status] || [];
    if (!allowed.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status transition: ${current.status} → ${status}. Allowed: ${allowed.join(", ") || "none"}` },
        { status: 400 }
      );
    }

    const expense = await Awards.updateExpenseStatus(expenseId, status as ExpenseStatus);
    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    return NextResponse.json(expense);
  } catch (error) {
    console.error("Expenses PUT error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update expense" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await resolveSecureTenant(request.headers);
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    const deleted = await Awards.deleteExpense(id);
    if (!deleted) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Expenses DELETE error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete expense" },
      { status: 500 }
    );
  }
}
