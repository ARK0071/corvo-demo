import { prisma } from "../client";
import {
  Award as PrismaAward,
  BudgetCategory as PrismaBudgetCategory,
  MatchLedgerEntry as PrismaMatchLedger,
  Expense as PrismaExpense,
  DrawdownRequest as PrismaDrawdown,
  BudgetModification as PrismaBudgetMod,
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
} from "@/data/awards";

const profileIdCache = new Map<string, string>();

async function getPortProfileId(): Promise<string> {
  const portId = getTenantConfig().portId;
  const cached = profileIdCache.get(portId);
  if (cached) return cached;

  const profile = await prisma.portProfile.findFirst({
    where: { slug: portId },
    select: { id: true },
  });
  if (!profile) throw new Error(`No PortProfile found for slug: ${portId}`);
  profileIdCache.set(portId, profile.id);
  return profile.id;
}

async function resolvePortProfileId(portProfileIdOrSlug: string): Promise<string | null> {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(portProfileIdOrSlug)) return portProfileIdOrSlug;

  const profile = await prisma.portProfile.findFirst({
    where: { slug: portProfileIdOrSlug },
    select: { id: true },
  });
  return profile?.id ?? null;
}

type AwardWithRelations = PrismaAward & {
  budgetCategories: PrismaBudgetCategory[];
  matchLedger: PrismaMatchLedger[];
};

function toBudgetCategory(cat: PrismaBudgetCategory): BudgetCategory {
  return {
    id: cat.id,
    name: cat.name,
    ceiling: Number(cat.ceiling),
    spent: Number(cat.spent),
  };
}

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

function toAward(award: AwardWithRelations): Award {
  const matchLedger = award.matchLedger.map(toMatchLedgerEntry);
  const committed = matchLedger.reduce((s, e) => s + e.amount, 0);
  const matchPercentage = award.matchPercentage;
  const required = Number(award.totalAmount) * (matchPercentage / (100 - matchPercentage));

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
    indirectCostRate: award.indirectCostRate ? Number(award.indirectCostRate) : null,
    indirectCostBase: award.indirectCostBase ?? null,
    indirectCostType: award.indirectCostType ?? null,
    indirectCostPeriodStart: award.indirectCostPeriodStart
      ? award.indirectCostPeriodStart.toISOString().split("T")[0]
      : null,
    indirectCostPeriodEnd: award.indirectCostPeriodEnd
      ? award.indirectCostPeriodEnd.toISOString().split("T")[0]
      : null,
    nicraDocumentUrl: award.nicraDocumentUrl ?? null,
    createdAt: award.createdAt.toISOString(),
  };
}

// ─── Award CRUD ───

export async function getAllAwards(): Promise<Award[]> {
  const portProfileId = await getPortProfileId();
  const awards = await prisma.award.findMany({
    where: { portProfileId },
    include: {
      budgetCategories: true,
      matchLedger: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return awards.map(toAward);
}

export async function getAwardById(id: string): Promise<Award | undefined> {
  const portProfileId = await getPortProfileId();
  const award = await prisma.award.findFirst({
    where: { id, portProfileId },
    include: {
      budgetCategories: true,
      matchLedger: true,
    },
  });
  return award ? toAward(award) : undefined;
}

export async function getAwardsByStatus(status: AwardStatus): Promise<Award[]> {
  const portProfileId = await getPortProfileId();
  const awards = await prisma.award.findMany({
    where: { portProfileId, status },
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
    indirectCostRate?: number;
    indirectCostBase?: string;
    indirectCostType?: string;
    indirectCostPeriodStart?: string;
    indirectCostPeriodEnd?: string;
    nicraDocumentUrl?: string;
  },
  portProfileIdOrSlug: string
): Promise<Award> {
  const portProfileId = await resolvePortProfileId(portProfileIdOrSlug);
  if (!portProfileId) {
    throw new Error(`Could not resolve port profile for: ${portProfileIdOrSlug}`);
  }

  const award = await prisma.award.create({
    data: {
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
      indirectCostRate: data.indirectCostRate ?? null,
      indirectCostBase: data.indirectCostBase ?? null,
      indirectCostType: data.indirectCostType ?? null,
      indirectCostPeriodStart: data.indirectCostPeriodStart
        ? parseDateRequired(data.indirectCostPeriodStart, "indirectCostPeriodStart")
        : null,
      indirectCostPeriodEnd: data.indirectCostPeriodEnd
        ? parseDateRequired(data.indirectCostPeriodEnd, "indirectCostPeriodEnd")
        : null,
      nicraDocumentUrl: data.nicraDocumentUrl ?? null,
      budgetCategories: {
        create: (data.budgetCategories || []).map((c) => ({
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
  const portProfileId = await getPortProfileId();
  const existing = await prisma.award.findFirst({
    where: { id, portProfileId },
  });
  if (!existing) return null;

  const award = await prisma.award.update({
    where: { id },
    data: { status },
    include: {
      budgetCategories: true,
      matchLedger: true,
    },
  });
  return toAward(award);
}

// ─── Budget Category Operations ───

export async function addBudgetCategory(
  awardId: string,
  data: { name: string; ceiling: number }
): Promise<BudgetCategory | null> {
  const portProfileId = await getPortProfileId();
  const award = await prisma.award.findFirst({
    where: { id: awardId, portProfileId },
  });
  if (!award) return null;

  const category = await prisma.budgetCategory.create({
    data: {
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
  const portProfileId = await getPortProfileId();
  const existing = await prisma.budgetCategory.findFirst({
    where: { id, award: { portProfileId } },
  });
  if (!existing) return null;

  const category = await prisma.budgetCategory.update({
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
  const portProfileId = await getPortProfileId();
  const expenses = await prisma.expense.findMany({
    where: { awardId, award: { portProfileId } },
    orderBy: { date: "desc" },
  });
  return expenses.map(toExpense);
}

export async function getAllExpenses(): Promise<Expense[]> {
  const portProfileId = await getPortProfileId();
  const expenses = await prisma.expense.findMany({
    where: { award: { portProfileId } },
    orderBy: { date: "desc" },
  });
  return expenses.map(toExpense);
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
  const expense = await prisma.expense.create({
    data: {
      awardId: data.awardId,
      categoryId: data.categoryId,
      date: parseDateRequired(data.date, "expense date"),
      description: data.description,
      vendor: data.vendor,
      amount: data.amount,
      status: data.status || "logged",
      attachments: data.attachments || [],
      flagReason: data.flagReason || null,
      overrideJustification: data.overrideJustification || null,
      allocations: data.allocations || null,
    },
  });

  if ((data.status || "logged") !== "flagged") {
    await prisma.budgetCategory.update({
      where: { id: data.categoryId },
      data: {
        spent: {
          increment: data.amount,
        },
      },
    });
  }

  return toExpense(expense);
}

export async function updateExpenseStatus(
  expenseId: string,
  status: ExpenseStatus
): Promise<Expense | null> {
  const portProfileId = await getPortProfileId();
  const existing = await prisma.expense.findFirst({
    where: { id: expenseId, award: { portProfileId } },
  });
  if (!existing) return null;

  const expense = await prisma.expense.update({
    where: { id: expenseId },
    data: { status },
  });

  const wasCountedBefore = existing.status !== "flagged";
  const isCountedAfter = status !== "flagged";

  if (wasCountedBefore && !isCountedAfter) {
    await prisma.budgetCategory.update({
      where: { id: existing.categoryId },
      data: { spent: { decrement: Number(existing.amount) } },
    });
  } else if (!wasCountedBefore && isCountedAfter) {
    await prisma.budgetCategory.update({
      where: { id: existing.categoryId },
      data: { spent: { increment: Number(existing.amount) } },
    });
  }

  return toExpense(expense);
}

export async function getEligibleExpensesForDrawdown(
  awardId: string
): Promise<Expense[]> {
  const portProfileId = await getPortProfileId();
  const expenses = await prisma.expense.findMany({
    where: { awardId, award: { portProfileId }, status: "approved" },
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
  const portProfileId = await getPortProfileId();
  const award = await prisma.award.findFirst({
    where: { id: data.awardId, portProfileId },
  });
  if (!award) return null;

  const entry = await prisma.matchLedgerEntry.create({
    data: {
      awardId: data.awardId,
      date: parseDateRequired(data.date, "match entry date"),
      description: data.description,
      amount: data.amount,
      type: data.type,
      documentation: data.documentation || null,
    },
  });

  await prisma.award.update({
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
  const portProfileId = await getPortProfileId();
  const entries = await prisma.matchLedgerEntry.findMany({
    where: { awardId, award: { portProfileId } },
    orderBy: { date: "desc" },
  });
  return entries.map(toMatchLedgerEntry);
}

// ─── Drawdown Operations ───

export async function getDrawdownsForAward(
  awardId: string
): Promise<DrawdownRequest[]> {
  const portProfileId = await getPortProfileId();
  const drawdowns = await prisma.drawdownRequest.findMany({
    where: { awardId, award: { portProfileId } },
    orderBy: { createdAt: "desc" },
  });
  return drawdowns.map(toDrawdownRequest);
}

export async function getAllDrawdowns(): Promise<DrawdownRequest[]> {
  const portProfileId = await getPortProfileId();
  const drawdowns = await prisma.drawdownRequest.findMany({
    where: { award: { portProfileId } },
    orderBy: { createdAt: "desc" },
  });
  return drawdowns.map(toDrawdownRequest);
}

export async function createDrawdown(data: {
  awardId: string;
  expenseIds: string[];
  notes: string;
}): Promise<DrawdownRequest> {
  const portProfileId = await getPortProfileId();

  const expenses = await prisma.expense.findMany({
    where: { id: { in: data.expenseIds }, award: { portProfileId } },
  });
  const totalAmount = expenses.reduce((s: number, e: typeof expenses[number]) => s + Number(e.amount), 0);

  const drawdown = await prisma.drawdownRequest.create({
    data: {
      awardId: data.awardId,
      expenseIds: data.expenseIds,
      totalAmount,
      status: "draft",
      notes: data.notes,
    },
  });

  await prisma.expense.updateMany({
    where: { id: { in: data.expenseIds } },
    data: { status: "drawn" },
  });

  return toDrawdownRequest(drawdown);
}

export async function updateDrawdownStatus(
  id: string,
  status: DrawdownStatus
): Promise<DrawdownRequest | null> {
  const portProfileId = await getPortProfileId();
  const existing = await prisma.drawdownRequest.findFirst({
    where: { id, award: { portProfileId } },
  });
  if (!existing) return null;

  const updateData: Prisma.DrawdownRequestUpdateInput = { status };
  if (status === "submitted") updateData.submittedDate = new Date();
  if (status === "approved") updateData.approvedDate = new Date();
  if (status === "payment_received") updateData.paymentDate = new Date();

  const drawdown = await prisma.drawdownRequest.update({
    where: { id },
    data: updateData,
  });
  return toDrawdownRequest(drawdown);
}

// ─── Budget Modification Operations ───

export async function getBudgetModsForAward(
  awardId: string
): Promise<BudgetModification[]> {
  const portProfileId = await getPortProfileId();
  const mods = await prisma.budgetModification.findMany({
    where: { awardId, award: { portProfileId } },
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
  const mod = await prisma.budgetModification.create({
    data: {
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
  const portProfileId = await getPortProfileId();
  const existing = await prisma.budgetModification.findFirst({
    where: { id, award: { portProfileId } },
  });
  if (!existing) return null;

  const mod = await prisma.budgetModification.update({
    where: { id },
    data: {
      status: "approved",
      approvedDate: new Date(),
    },
  });

  await prisma.$transaction([
    prisma.budgetCategory.update({
      where: { id: existing.fromCategoryId },
      data: { ceiling: { decrement: Number(existing.amount) } },
    }),
    prisma.budgetCategory.update({
      where: { id: existing.toCategoryId },
      data: { ceiling: { increment: Number(existing.amount) } },
    }),
  ]);

  return toBudgetModification(mod);
}

export async function denyBudgetMod(
  id: string
): Promise<BudgetModification | null> {
  const portProfileId = await getPortProfileId();
  const existing = await prisma.budgetModification.findFirst({
    where: { id, award: { portProfileId } },
  });
  if (!existing) return null;

  const mod = await prisma.budgetModification.update({
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
  const portProfileId = await getPortProfileId();

  const [awards, expenses, drawdowns] = await Promise.all([
    prisma.award.findMany({
      where: { portProfileId },
      select: { totalAmount: true, status: true },
    }),
    prisma.expense.findMany({
      where: { award: { portProfileId }, status: { not: "flagged" } },
      select: { amount: true },
    }),
    prisma.drawdownRequest.findMany({
      where: { award: { portProfileId }, status: { in: ["approved", "payment_received"] } },
      select: { totalAmount: true },
    }),
  ]);

  const totalAwarded = awards.reduce((s: number, a: typeof awards[number]) => s + Number(a.totalAmount), 0);
  const totalSpent = expenses.reduce((s: number, e: typeof expenses[number]) => s + Number(e.amount), 0);
  const totalDrawn = drawdowns.reduce((s: number, d: typeof drawdowns[number]) => s + Number(d.totalAmount), 0);
  const activeCount = awards.filter((a: typeof awards[number]) => a.status === "active").length;
  const closeoutCount = awards.filter((a: typeof awards[number]) => a.status === "closeout_pending").length;

  return {
    totalAwarded,
    totalSpent,
    totalDrawn,
    totalRemaining: totalAwarded - totalSpent,
    activeCount,
    closeoutCount,
    totalAwards: awards.length,
  };
}

// ─── Delete ───

export async function deleteAward(id: string): Promise<boolean> {
  const portProfileId = await getPortProfileId();
  const existing = await prisma.award.findFirst({
    where: { id, portProfileId },
  });
  if (!existing) return false;

  await prisma.award.delete({ where: { id } });
  return true;
}

export async function deleteExpense(id: string): Promise<boolean> {
  const portProfileId = await getPortProfileId();
  const existing = await prisma.expense.findFirst({
    where: { id, award: { portProfileId } },
  });
  if (!existing) return false;

  if (existing.status !== "flagged") {
    await prisma.budgetCategory.update({
      where: { id: existing.categoryId },
      data: { spent: { decrement: Number(existing.amount) } },
    });
  }

  await prisma.expense.delete({ where: { id } });
  return true;
}

export async function deleteDrawdown(id: string): Promise<boolean> {
  const portProfileId = await getPortProfileId();
  const existing = await prisma.drawdownRequest.findFirst({
    where: { id, award: { portProfileId } },
  });
  if (!existing) return false;
  await prisma.drawdownRequest.delete({ where: { id } });
  return true;
}

// ─── Clear All ───

export async function clearAwards(): Promise<void> {
  const portProfileId = await getPortProfileId();
  await prisma.award.deleteMany({ where: { portProfileId } });
}
