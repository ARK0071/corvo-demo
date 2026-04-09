import { prisma } from "../client";
import {
  DemoAward as PrismaAward,
  DemoBudgetCategory as PrismaBudgetCategory,
  DemoMatchLedgerEntry as PrismaMatchLedger,
  DemoExpense as PrismaExpense,
  DemoDrawdownRequest as PrismaDrawdown,
  DemoBudgetModification as PrismaBudgetMod,
  Prisma,
} from "@/generated/prisma";
import { getTenantConfig } from "../tenant-config";
import { parseDateRequired } from "../date-utils";
import type {
  Award,
  BudgetCategory,
  MatchLedgerEntry,
  Expense,
  DrawdownRequest,
  BudgetModification,
  AwardStatus,
  MatchType,
  DrawdownStatus,
  BudgetModStatus,
  ExpenseStatus,
  ComplianceBrief,
} from "@/data/awards";

// Get current port ID from tenant config
function getPortId(): string {
  return getTenantConfig().portId;
}

// Helper to resolve portProfileId from UUID or slug
async function resolvePortProfileId(portProfileIdOrSlug: string): Promise<string | null> {
  const portId = getPortId();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (uuidRegex.test(portProfileIdOrSlug)) {
    return portProfileIdOrSlug;
  }

  // Look up the port profile by portId
  const portProfile = await prisma.demoPortProfile.findFirst({
    where: { portId },
    select: { id: true },
  });

  if (!portProfile) {
    console.error(`[demo-awards] No port profile found for portId: ${portId}`);
    return null;
  }

  return portProfile.id;
}

// Type for award with relations
type AwardWithRelations = PrismaAward & {
  budgetCategories: PrismaBudgetCategory[];
  matchLedger: PrismaMatchLedger[];
};

// Convert Prisma budget category to application type
function toBudgetCategory(cat: PrismaBudgetCategory): BudgetCategory {
  return {
    id: cat.id,
    name: cat.name,
    ceiling: Number(cat.ceiling),
    spent: Number(cat.spent),
  };
}

// Convert Prisma match ledger entry to application type
function toMatchLedgerEntry(entry: PrismaMatchLedger): MatchLedgerEntry {
  return {
    id: entry.id,
    date: entry.date.toISOString().split("T")[0],
    description: entry.description,
    amount: Number(entry.amount),
    type: entry.type as MatchType,
    documentation: entry.documentation || undefined,
  };
}

// Convert Prisma expense to application type
function toExpense(exp: PrismaExpense): Expense {
  return {
    id: exp.id,
    awardId: exp.awardId,
    categoryId: exp.categoryId,
    date: exp.date.toISOString().split("T")[0],
    description: exp.description,
    vendor: exp.vendor,
    amount: Number(exp.amount),
    status: exp.status as ExpenseStatus,
    attachments: (exp.attachments as string[]) || [],
    flagReason: exp.flagReason || undefined,
    overrideJustification: exp.overrideJustification || undefined,
    allocations: exp.allocations as any,
    createdAt: exp.createdAt.toISOString(),
  };
}

// Convert Prisma drawdown to application type
function toDrawdownRequest(dr: PrismaDrawdown): DrawdownRequest {
  return {
    id: dr.id,
    awardId: dr.awardId,
    expenseIds: (dr.expenseIds as string[]) || [],
    totalAmount: Number(dr.totalAmount),
    status: dr.status as DrawdownStatus,
    submittedDate: dr.submittedDate?.toISOString().split("T")[0],
    approvedDate: dr.approvedDate?.toISOString().split("T")[0],
    paymentDate: dr.paymentDate?.toISOString().split("T")[0],
    notes: dr.notes,
    createdAt: dr.createdAt.toISOString(),
  };
}

// Convert Prisma budget modification to application type
function toBudgetModification(mod: PrismaBudgetMod): BudgetModification {
  return {
    id: mod.id,
    awardId: mod.awardId,
    fromCategoryId: mod.fromCategoryId,
    toCategoryId: mod.toCategoryId,
    amount: Number(mod.amount),
    justification: mod.justification,
    status: mod.status as BudgetModStatus,
    requestedDate: mod.requestedDate.toISOString().split("T")[0],
    approvedDate: mod.approvedDate?.toISOString().split("T")[0],
  };
}

// Convert Prisma award to application type
function toAward(award: AwardWithRelations): Award {
  const matchLedger = award.matchLedger.map(toMatchLedgerEntry);
  const committed = matchLedger.reduce((s, e) => s + e.amount, 0);
  const matchPercentage = award.matchPercentage;
  const required = Number(award.totalAmount) * (matchPercentage / (100 - matchPercentage));

  // complianceBrief column may not exist on older DB clients yet — read defensively
  const briefRaw = (award as unknown as { complianceBrief?: unknown }).complianceBrief;
  const briefAt = (award as unknown as { complianceBriefAt?: Date | null }).complianceBriefAt;

  return {
    id: award.id,
    fain: award.fain,
    cfda: award.cfda,
    awardingAgency: award.awardingAgency,
    program: award.program,
    title: award.title,
    description: award.description,
    totalAmount: Number(award.totalAmount),
    budgetCategories: award.budgetCategories.map(toBudgetCategory),
    performancePeriod: {
      start: award.performancePeriodStart.toISOString().split("T")[0],
      end: award.performancePeriodEnd.toISOString().split("T")[0],
    },
    matchRequirement: {
      percentage: matchPercentage,
      types: (award.matchTypes as MatchType[]) || [],
      committed,
      required,
    },
    matchLedger,
    status: award.status as AwardStatus,
    pipelineGrantId: award.pipelineGrantId || undefined,
    projectIds: (award.projectIds as string[]) || [],
    complianceBrief: briefRaw ? (briefRaw as ComplianceBrief) : undefined,
    complianceBriefAt: briefAt ? briefAt.toISOString() : undefined,
    createdAt: award.createdAt.toISOString(),
  };
}

// ─── Award CRUD ───

export async function getAllAwards(): Promise<Award[]> {
  const portId = getPortId();
  const awards = await prisma.demoAward.findMany({
    where: { portId },
    include: {
      budgetCategories: true,
      matchLedger: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return awards.map(toAward);
}

export async function getAwardById(id: string): Promise<Award | undefined> {
  const portId = getPortId();
  const award = await prisma.demoAward.findFirst({
    where: { id, portId },
    include: {
      budgetCategories: true,
      matchLedger: true,
    },
  });
  return award ? toAward(award) : undefined;
}

export async function getAwardsByStatus(status: AwardStatus): Promise<Award[]> {
  const portId = getPortId();
  const awards = await prisma.demoAward.findMany({
    where: { portId, status },
    include: {
      budgetCategories: true,
      matchLedger: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return awards.map(toAward);
}

export async function createAward(
  data: {
    fain: string;
    cfda: string;
    awardingAgency: string;
    program: string;
    title: string;
    description?: string;
    totalAmount: number;
    performancePeriod: { start: string; end: string };
    matchPercentage: number;
    matchTypes?: MatchType[];
    status?: AwardStatus;
    pipelineGrantId?: string;
    projectIds?: string[];
    budgetCategories?: { name: string; ceiling: number }[];
  },
  portProfileIdOrSlug: string
): Promise<Award> {
  const portId = getPortId();

  // Resolve portProfileId from slug if needed
  const portProfileId = await resolvePortProfileId(portProfileIdOrSlug);
  if (!portProfileId) {
    throw new Error(`Could not resolve port profile for: ${portProfileIdOrSlug}`);
  }

  const award = await prisma.demoAward.create({
    data: {
      portId,
      portProfile: { connect: { id: portProfileId } },
      fain: data.fain,
      cfda: data.cfda,
      awardingAgency: data.awardingAgency,
      program: data.program,
      title: data.title,
      description: data.description || "",
      totalAmount: data.totalAmount,
      performancePeriodStart: parseDateRequired(data.performancePeriod.start, "performancePeriod.start"),
      performancePeriodEnd: parseDateRequired(data.performancePeriod.end, "performancePeriod.end"),
      matchPercentage: data.matchPercentage,
      matchTypes: data.matchTypes || [],
      matchCommitted: 0,
      matchRequired: data.totalAmount * (data.matchPercentage / (100 - data.matchPercentage)),
      status: data.status || "active",
      pipelineGrantId: data.pipelineGrantId || null,
      projectIds: data.projectIds || [],
      budgetCategories: {
        create: (data.budgetCategories || []).map((c) => ({
          portId,
          name: c.name,
          ceiling: c.ceiling,
          spent: 0,
        })),
      },
    },
    include: {
      budgetCategories: true,
      matchLedger: true,
    },
  });

  return toAward(award);
}

export async function updateAwardStatus(
  id: string,
  status: AwardStatus
): Promise<Award | null> {
  const portId = getPortId();
  const existing = await prisma.demoAward.findFirst({
    where: { id, portId },
  });
  if (!existing) return null;

  const award = await prisma.demoAward.update({
    where: { id },
    data: { status },
    include: {
      budgetCategories: true,
      matchLedger: true,
    },
  });
  return toAward(award);
}

// ─── Compliance Brief Operations ───

export async function getComplianceBrief(
  awardId: string
): Promise<ComplianceBrief | null> {
  const portId = getPortId();
  const award = await prisma.demoAward.findFirst({
    where: { id: awardId, portId },
    select: {
      // Cast through unknown — column may not be in generated client until prisma generate is rerun
      complianceBrief: true,
    } as unknown as Record<string, true>,
  });
  if (!award) return null;
  const brief = (award as unknown as { complianceBrief?: unknown }).complianceBrief;
  return brief ? (brief as ComplianceBrief) : null;
}

export async function saveComplianceBrief(
  awardId: string,
  brief: ComplianceBrief
): Promise<Award | null> {
  const portId = getPortId();
  const existing = await prisma.demoAward.findFirst({
    where: { id: awardId, portId },
  });
  if (!existing) return null;

  await prisma.demoAward.update({
    where: { id: awardId },
    // Cast — complianceBrief column added in latest schema; tolerate older client
    data: {
      complianceBrief: brief as unknown as Prisma.InputJsonValue,
      complianceBriefAt: new Date(),
    } as unknown as Prisma.DemoAwardUpdateInput,
  });

  // Re-fetch with relations so callers get a complete Award
  const updated = await prisma.demoAward.findFirst({
    where: { id: awardId, portId },
    include: { budgetCategories: true, matchLedger: true },
  });
  return updated ? toAward(updated) : null;
}

// ─── Budget Category Operations ───

export async function addBudgetCategory(
  awardId: string,
  data: { name: string; ceiling: number }
): Promise<BudgetCategory | null> {
  const portId = getPortId();
  const award = await prisma.demoAward.findFirst({
    where: { id: awardId, portId },
  });
  if (!award) return null;

  const category = await prisma.demoBudgetCategory.create({
    data: {
      portId,
      awardId,
      name: data.name,
      ceiling: data.ceiling,
      spent: 0,
    },
  });
  return toBudgetCategory(category);
}

export async function updateBudgetCategory(
  id: string,
  data: { name?: string; ceiling?: number }
): Promise<BudgetCategory | null> {
  const portId = getPortId();
  const existing = await prisma.demoBudgetCategory.findFirst({
    where: { id, portId },
  });
  if (!existing) return null;

  const category = await prisma.demoBudgetCategory.update({
    where: { id },
    data: {
      name: data.name,
      ceiling: data.ceiling,
    },
  });
  return toBudgetCategory(category);
}

// ─── Expense Operations ───

export async function getExpensesForAward(awardId: string): Promise<Expense[]> {
  const portId = getPortId();
  const expenses = await prisma.demoExpense.findMany({
    where: { awardId, portId },
    orderBy: { date: "desc" },
  });
  return expenses.map(toExpense);
}

export async function getAllExpenses(): Promise<Expense[]> {
  const portId = getPortId();
  const expenses = await prisma.demoExpense.findMany({
    where: { portId },
    orderBy: { date: "desc" },
  });
  return expenses.map(toExpense);
}

/**
 * Log a new expense, atomically:
 *   1. Verify the budget category exists, belongs to the award, and is in
 *      this tenant.
 *   2. Create the expense.
 *   3. If the expense is not flagged, conditionally increment category.spent
 *      using a single SQL UPDATE that requires `spent + amount <= ceiling`.
 *      If zero rows are updated, the transaction rolls back with an
 *      overspend error.
 *
 * Why a conditional update instead of read-then-write?
 * Prisma's interactive `$transaction(async tx => …)` does NOT default to
 * SERIALIZABLE — it uses Postgres's default isolation (READ COMMITTED). At
 * READ COMMITTED, two concurrent transactions can each read the same
 * `spent`, both pass an in-memory ceiling check, and both increment —
 * letting category.spent climb past the ceiling. The conditional UPDATE
 * forces the ceiling check into the same atomic statement as the write,
 * which Postgres serializes per-row regardless of isolation level.
 *
 * Throws on validation failure with a message safe to surface to the API
 * layer (the route handler should map to 400). Error messages avoid
 * leaking ceiling/spent dollar amounts so unauthorized callers cannot
 * probe budget state through error responses.
 */
export class ExpenseValidationError extends Error {
  constructor(message: string, public code: "category_not_found" | "overspend" | "amount_invalid") {
    super(message);
    this.name = "ExpenseValidationError";
  }
}

export async function logExpense(data: {
  awardId: string;
  categoryId: string;
  date: string;
  description: string;
  vendor: string;
  amount: number;
  status?: ExpenseStatus;
  attachments?: string[];
  flagReason?: string;
  overrideJustification?: string;
  allocations?: any;
}): Promise<Expense> {
  const portId = getPortId();

  // Basic amount validation — defense in depth (the API should also validate)
  if (!Number.isFinite(data.amount) || data.amount <= 0) {
    throw new ExpenseValidationError(
      "Amount must be a positive number",
      "amount_invalid"
    );
  }

  const status = data.status || "logged";
  const willCharge = status !== "flagged";

  const expense = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // 1. Tenant- and award-scoped category lookup. We only need to confirm
    //    existence here; the ceiling check is enforced atomically below.
    const category = await tx.demoBudgetCategory.findFirst({
      where: { id: data.categoryId, awardId: data.awardId, portId },
      select: { id: true, name: true },
    });
    if (!category) {
      throw new ExpenseValidationError(
        "Budget category not found on this award",
        "category_not_found"
      );
    }

    // 2. Create the expense row
    const created = await tx.demoExpense.create({
      data: {
        portId,
        awardId: data.awardId,
        categoryId: data.categoryId,
        date: parseDateRequired(data.date, "expense date"),
        description: data.description,
        vendor: data.vendor,
        amount: data.amount,
        status,
        attachments: data.attachments || [],
        flagReason: data.flagReason || null,
        overrideJustification: data.overrideJustification || null,
        allocations: data.allocations || null,
      },
    });

    // 3. Conditionally bump spent. Postgres serializes the row update so
    //    only one concurrent transaction can take a row from "fits under
    //    ceiling" to "fits under ceiling minus this amount". A failed
    //    conditional update aborts the whole transaction (rolling back
    //    the create above), so we never end up with an expense without
    //    its budget impact accounted for.
    if (willCharge) {
      const updated = await tx.$executeRaw`
        UPDATE "demo_budget_categories"
        SET "spent" = "spent" + ${data.amount}::numeric
        WHERE "id" = ${data.categoryId}::uuid
          AND "award_id" = ${data.awardId}::uuid
          AND "port_id" = ${portId}
          AND "spent" + ${data.amount}::numeric <= "ceiling"
      `;
      if (updated === 0) {
        throw new ExpenseValidationError(
          `Charging this expense would exceed the "${category.name}" budget category ceiling`,
          "overspend"
        );
      }
    }

    return created;
  });

  return toExpense(expense);
}

// Tenant-scoped single fetch — used by PUT handlers that need the current
// status without leaking data from other expenses.
export async function getExpenseById(expenseId: string): Promise<Expense | null> {
  const portId = getPortId();
  const expense = await prisma.demoExpense.findFirst({
    where: { id: expenseId, portId },
  });
  return expense ? toExpense(expense) : null;
}

/**
 * Update an expense's status while keeping the parent budget category's
 * `spent` counter consistent.
 *
 * Status semantics:
 *   - "logged" / "approved" / "drawn"  → counts against category.spent
 *   - "flagged"                        → does NOT count
 *
 * Crossing the flagged ↔ non-flagged boundary therefore has to bump or
 * unbump the category counter atomically. The previous implementation
 * just changed `status` and left the counter alone, so a flagged
 * expense could be approved later without ever charging the budget —
 * money silently went missing.
 *
 * On flagged → non-flagged we use the same conditional UPDATE pattern
 * as logExpense so the ceiling is enforced atomically and concurrent
 * status flips can't push the budget over.
 */
export class ExpenseStatusUpdateError extends Error {
  constructor(message: string, public code: "overspend" | "race") {
    super(message);
    this.name = "ExpenseStatusUpdateError";
  }
}

export async function updateExpenseStatus(
  expenseId: string,
  status: ExpenseStatus,
  opts: { expectedFromStatus?: ExpenseStatus } = {}
): Promise<Expense | null> {
  const portId = getPortId();

  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const existing = await tx.demoExpense.findFirst({
      where: { id: expenseId, portId },
      select: { id: true, status: true, amount: true, categoryId: true, awardId: true },
    });
    if (!existing) return null;

    // TOCTOU guard: if the caller validated against a snapshot status,
    // refuse the update unless the row still matches that snapshot.
    // Without this, a request could be racing with another status flip
    // and silently apply on top of an unexpected state.
    if (opts.expectedFromStatus && existing.status !== opts.expectedFromStatus) {
      throw new ExpenseStatusUpdateError(
        "Expense status changed concurrently — please refresh and retry",
        "race"
      );
    }

    const wasCharging = existing.status !== "flagged";
    const willCharge = status !== "flagged";
    const amount = Number(existing.amount);

    // Status unchanged or both sides charging / both sides not — no
    // bookkeeping change needed beyond the status field itself.
    if (wasCharging === willCharge) {
      const updated = await tx.demoExpense.update({
        where: { id: expenseId },
        data: { status },
      });
      return updated;
    }

    if (!wasCharging && willCharge) {
      // flagged → counted: conditionally bump spent, enforcing ceiling
      const bumped = await tx.$executeRaw`
        UPDATE "demo_budget_categories"
        SET "spent" = "spent" + ${amount}::numeric
        WHERE "id" = ${existing.categoryId}::uuid
          AND "award_id" = ${existing.awardId}::uuid
          AND "port_id" = ${portId}
          AND "spent" + ${amount}::numeric <= "ceiling"
      `;
      if (bumped === 0) {
        throw new ExpenseStatusUpdateError(
          "Reclassifying this expense as charged would exceed the budget category ceiling",
          "overspend"
        );
      }
    } else {
      // counted → flagged: refund the spent counter
      const refunded = await tx.$executeRaw`
        UPDATE "demo_budget_categories"
        SET "spent" = GREATEST("spent" - ${amount}::numeric, 0)
        WHERE "id" = ${existing.categoryId}::uuid
          AND "award_id" = ${existing.awardId}::uuid
          AND "port_id" = ${portId}
      `;
      if (refunded === 0) {
        // Category vanished out from under us — should not happen
        throw new ExpenseStatusUpdateError(
          "Failed to update budget category for status change",
          "race"
        );
      }
    }

    const updated = await tx.demoExpense.update({
      where: { id: expenseId },
      data: { status },
    });
    return updated;
  });

  return result ? toExpense(result) : null;
}

export async function getEligibleExpensesForDrawdown(
  awardId: string
): Promise<Expense[]> {
  const portId = getPortId();
  const expenses = await prisma.demoExpense.findMany({
    where: { awardId, portId, status: "approved" },
    orderBy: { date: "desc" },
  });
  return expenses.map(toExpense);
}

// ─── Match Ledger Operations ───

export async function addMatchEntry(data: {
  awardId: string;
  date: string;
  description: string;
  amount: number;
  type: MatchType;
  documentation?: string;
}): Promise<MatchLedgerEntry | null> {
  const portId = getPortId();
  const award = await prisma.demoAward.findFirst({
    where: { id: data.awardId, portId },
  });
  if (!award) return null;

  const entry = await prisma.demoMatchLedgerEntry.create({
    data: {
      portId,
      awardId: data.awardId,
      date: parseDateRequired(data.date, "match entry date"),
      description: data.description,
      amount: data.amount,
      type: data.type,
      documentation: data.documentation || null,
    },
  });

  // Update award committed amount
  await prisma.demoAward.update({
    where: { id: data.awardId },
    data: {
      matchCommitted: {
        increment: data.amount,
      },
    },
  });

  return toMatchLedgerEntry(entry);
}

export async function getMatchLedgerForAward(
  awardId: string
): Promise<MatchLedgerEntry[]> {
  const portId = getPortId();
  const entries = await prisma.demoMatchLedgerEntry.findMany({
    where: { awardId, portId },
    orderBy: { date: "desc" },
  });
  return entries.map(toMatchLedgerEntry);
}

// ─── Drawdown Operations ───

export async function getDrawdownsForAward(
  awardId: string
): Promise<DrawdownRequest[]> {
  const portId = getPortId();
  const drawdowns = await prisma.demoDrawdownRequest.findMany({
    where: { awardId, portId },
    orderBy: { createdAt: "desc" },
  });
  return drawdowns.map(toDrawdownRequest);
}

export async function getAllDrawdowns(): Promise<DrawdownRequest[]> {
  const portId = getPortId();
  const drawdowns = await prisma.demoDrawdownRequest.findMany({
    where: { portId },
    orderBy: { createdAt: "desc" },
  });
  return drawdowns.map(toDrawdownRequest);
}

// Tenant-scoped single fetch — used by PUT handlers that need the
// current state without leaking other drawdowns or scanning the table.
export async function getDrawdownById(id: string): Promise<DrawdownRequest | null> {
  const portId = getPortId();
  const drawdown = await prisma.demoDrawdownRequest.findFirst({
    where: { id, portId },
  });
  return drawdown ? toDrawdownRequest(drawdown) : null;
}

export class DrawdownValidationError extends Error {
  constructor(message: string, public code: "no_expenses" | "wrong_award" | "wrong_status" | "missing_expenses") {
    super(message);
    this.name = "DrawdownValidationError";
  }
}

/**
 * Create a draft drawdown bundling a set of expenses.
 *
 * Validates:
 *   - The expense list is non-empty and contains no duplicate IDs.
 *   - Every expense exists in this tenant.
 *   - Every expense belongs to the supplied awardId (no cross-award bundling).
 *   - Every expense is currently in "approved" status (per 2 CFR 200.305,
 *     only allowable, approved costs may be drawn down).
 *
 * The expenses are atomically claimed via a conditional updateMany that
 * matches `status = "approved"`. If the number of rows updated doesn't
 * match the expected count, the transaction aborts — this prevents two
 * concurrent createDrawdown calls from bundling the same expense into
 * two drawdowns. (READ COMMITTED, the Prisma default, would otherwise
 * let both reads see the expenses as "approved".)
 */
export async function createDrawdown(data: {
  awardId: string;
  expenseIds: string[];
  notes: string;
}): Promise<DrawdownRequest> {
  const portId = getPortId();

  if (!data.expenseIds || data.expenseIds.length === 0) {
    throw new DrawdownValidationError(
      "At least one expense is required to create a drawdown",
      "no_expenses"
    );
  }

  // De-dupe IDs so the count check below isn't tricked by `[id, id]`
  const uniqueExpenseIds = Array.from(new Set(data.expenseIds));

  const drawdown = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const expenses = await tx.demoExpense.findMany({
      where: { id: { in: uniqueExpenseIds }, portId },
      select: { id: true, awardId: true, status: true, amount: true },
    });
    type ExpRow = (typeof expenses)[number];

    // 1. All expenses must exist in this tenant
    if (expenses.length !== uniqueExpenseIds.length) {
      const found = new Set(expenses.map((e: ExpRow) => e.id));
      const missing = uniqueExpenseIds.filter((id) => !found.has(id));
      throw new DrawdownValidationError(
        `Expenses not found in this tenant: ${missing.join(", ")}`,
        "missing_expenses"
      );
    }

    // 2. All expenses must belong to the supplied award
    const wrongAward = expenses.filter((e: ExpRow) => e.awardId !== data.awardId);
    if (wrongAward.length > 0) {
      throw new DrawdownValidationError(
        `${wrongAward.length} expense(s) belong to a different award and cannot be bundled here`,
        "wrong_award"
      );
    }

    // 3. All expenses must currently be in "approved" status (per the
    //    snapshot we just read). The atomic claim below will catch any
    //    races where status changes between this read and the update.
    const notApproved = expenses.filter((e: ExpRow) => e.status !== "approved");
    if (notApproved.length > 0) {
      throw new DrawdownValidationError(
        `${notApproved.length} expense(s) are not in approved status; only approved expenses may be drawn down (2 CFR 200.305)`,
        "wrong_status"
      );
    }

    const totalAmount = expenses.reduce((s: number, e: ExpRow) => s + Number(e.amount), 0);

    // 4. Atomic claim: only flips approved → drawn. If a concurrent
    //    drawdown beat us to even one of these expenses, the count will
    //    be short and we abort, rolling back the create below if it had
    //    already happened. This is the actual race fix — the read above
    //    is informational only.
    const claim = await tx.demoExpense.updateMany({
      where: {
        id: { in: uniqueExpenseIds },
        portId,
        awardId: data.awardId,
        status: "approved",
      },
      data: { status: "drawn" },
    });
    if (claim.count !== uniqueExpenseIds.length) {
      throw new DrawdownValidationError(
        "One or more expenses were claimed by another drawdown — please refresh and retry",
        "wrong_status"
      );
    }

    // 5. Create the drawdown record now that we own the expenses. If
    //    this fails, the whole transaction rolls back and the expenses
    //    return to "approved".
    const created = await tx.demoDrawdownRequest.create({
      data: {
        portId,
        awardId: data.awardId,
        expenseIds: uniqueExpenseIds,
        totalAmount,
        status: "draft",
        notes: data.notes,
      },
    });

    return created;
  });

  return toDrawdownRequest(drawdown);
}

export class DrawdownStatusUpdateError extends Error {
  constructor(message: string, public code: "race") {
    super(message);
    this.name = "DrawdownStatusUpdateError";
  }
}

export async function updateDrawdownStatus(
  id: string,
  status: DrawdownStatus,
  opts: { expectedFromStatus?: DrawdownStatus } = {}
): Promise<DrawdownRequest | null> {
  const portId = getPortId();

  // Whole transition runs in one transaction so a recall (submitted →
  // draft) can return the bundled expenses to "approved" atomically with
  // the drawdown status change. Without this, recalling left the
  // expenses orphaned in "drawn" — they could not be re-bundled and the
  // workflow guard rejected any attempt to fix them by hand.
  const drawdown = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const existing = await tx.demoDrawdownRequest.findFirst({
      where: { id, portId },
    });
    if (!existing) return null;

    // TOCTOU guard: if the route handler validated the transition against
    // a snapshot, abort if the row has moved since.
    if (opts.expectedFromStatus && existing.status !== opts.expectedFromStatus) {
      throw new DrawdownStatusUpdateError(
        "Drawdown status changed concurrently — please refresh and retry",
        "race"
      );
    }

    const updateData: Prisma.DemoDrawdownRequestUpdateInput = { status };
    if (status === "submitted") updateData.submittedDate = new Date();
    if (status === "approved") updateData.approvedDate = new Date();
    if (status === "payment_received") updateData.paymentDate = new Date();

    // Recall: drawdown moving back to draft. Return the bundled
    // expenses from "drawn" to "approved" so they can be re-bundled or
    // edited. We only flip rows still in "drawn" — defends against any
    // expense that was somehow split off into another drawdown
    // (shouldn't happen, but the conditional is cheap insurance).
    if (existing.status === "submitted" && status === "draft") {
      const ids = (existing.expenseIds as string[]) || [];
      if (ids.length > 0) {
        await tx.demoExpense.updateMany({
          where: { id: { in: ids }, portId, status: "drawn" },
          data: { status: "approved" },
        });
      }
    }

    const updated = await tx.demoDrawdownRequest.update({
      where: { id },
      data: updateData,
    });
    return updated;
  });

  return drawdown ? toDrawdownRequest(drawdown) : null;
}

// ─── Budget Modification Operations ───

export async function getBudgetModsForAward(
  awardId: string
): Promise<BudgetModification[]> {
  const portId = getPortId();
  const mods = await prisma.demoBudgetModification.findMany({
    where: { awardId, portId },
    orderBy: { requestedDate: "desc" },
  });
  return mods.map(toBudgetModification);
}

export async function createBudgetMod(data: {
  awardId: string;
  fromCategoryId: string;
  toCategoryId: string;
  amount: number;
  justification: string;
}): Promise<BudgetModification> {
  const portId = getPortId();

  const mod = await prisma.demoBudgetModification.create({
    data: {
      portId,
      awardId: data.awardId,
      fromCategoryId: data.fromCategoryId,
      toCategoryId: data.toCategoryId,
      amount: data.amount,
      justification: data.justification,
      status: "requested",
    },
  });
  return toBudgetModification(mod);
}

export async function approveBudgetMod(
  id: string
): Promise<BudgetModification | null> {
  const portId = getPortId();

  // Run the lookup, the category-ownership check, the mod status flip,
  // and both ceiling updates in a single transaction. The previous
  // implementation looked up the mod with portId scoping but then
  // updated the from/to categories with `where: { id }` only — if a
  // budget mod somehow referenced a category in another tenant
  // (createBudgetMod doesn't validate that the categories belong to
  // this tenant), the approve would silently mutate the wrong tenant's
  // budget. We now require both categories to live in the same tenant
  // and the same award as the mod, defense in depth.
  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const existing = await tx.demoBudgetModification.findFirst({
      where: { id, portId },
    });
    if (!existing) return null;

    const [fromCat, toCat] = await Promise.all([
      tx.demoBudgetCategory.findFirst({
        where: { id: existing.fromCategoryId, portId, awardId: existing.awardId },
        select: { id: true },
      }),
      tx.demoBudgetCategory.findFirst({
        where: { id: existing.toCategoryId, portId, awardId: existing.awardId },
        select: { id: true },
      }),
    ]);
    if (!fromCat || !toCat) {
      throw new Error("Budget modification references a category outside this award/tenant");
    }

    const mod = await tx.demoBudgetModification.update({
      where: { id },
      data: {
        status: "approved",
        approvedDate: new Date(),
      },
    });

    // Conditional updates that re-assert tenant + award scoping. If
    // either fails to match a row, the whole transaction rolls back.
    const fromUpdate = await tx.demoBudgetCategory.updateMany({
      where: { id: existing.fromCategoryId, portId, awardId: existing.awardId },
      data: { ceiling: { decrement: Number(existing.amount) } },
    });
    const toUpdate = await tx.demoBudgetCategory.updateMany({
      where: { id: existing.toCategoryId, portId, awardId: existing.awardId },
      data: { ceiling: { increment: Number(existing.amount) } },
    });
    if (fromUpdate.count !== 1 || toUpdate.count !== 1) {
      throw new Error("Failed to apply budget modification to categories");
    }

    return mod;
  });

  return result ? toBudgetModification(result) : null;
}

export async function denyBudgetMod(
  id: string
): Promise<BudgetModification | null> {
  const portId = getPortId();
  const existing = await prisma.demoBudgetModification.findFirst({
    where: { id, portId },
  });
  if (!existing) return null;

  const mod = await prisma.demoBudgetModification.update({
    where: { id },
    data: { status: "denied" },
  });
  return toBudgetModification(mod);
}

// ─── Statistics ───

export async function getAwardStats(): Promise<{
  totalAwarded: number;
  totalSpent: number;
  totalDrawn: number;
  totalRemaining: number;
  activeCount: number;
  closeoutCount: number;
  totalAwards: number;
}> {
  const portId = getPortId();

  const [awards, expenses, drawdowns] = await Promise.all([
    prisma.demoAward.findMany({
      where: { portId },
      select: { totalAmount: true, status: true },
    }),
    prisma.demoExpense.findMany({
      where: { portId, status: { not: "flagged" } },
      select: { amount: true },
    }),
    prisma.demoDrawdownRequest.findMany({
      where: { portId, status: { in: ["approved", "payment_received"] } },
      select: { totalAmount: true },
    }),
  ]);

  const totalAwarded = awards.reduce((s, a) => s + Number(a.totalAmount), 0);
  const totalSpent = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const totalDrawn = drawdowns.reduce((s, d) => s + Number(d.totalAmount), 0);
  const activeCount = awards.filter((a) => a.status === "active").length;
  const closeoutCount = awards.filter((a) => a.status === "closeout_pending").length;

  return {
    totalAwarded,
    totalSpent,
    totalDrawn,
    totalRemaining: totalAwarded - totalDrawn,
    activeCount,
    closeoutCount,
    totalAwards: awards.length,
  };
}

// ─── Delete ───

export async function deleteAward(id: string): Promise<boolean> {
  const portId = getPortId();
  const existing = await prisma.demoAward.findFirst({
    where: { id, portId },
  });
  if (!existing) return false;

  await prisma.demoAward.delete({ where: { id } });
  return true;
}

// ─── Clear All (for testing) ───

export async function clearAwards(): Promise<void> {
  const portId = getPortId();
  await prisma.demoAward.deleteMany({ where: { portId } });
}
