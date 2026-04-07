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

  const expense = await prisma.demoExpense.create({
    data: {
      portId,
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

  // Update category spent amount if not flagged
  if ((data.status || "logged") !== "flagged") {
    await prisma.demoBudgetCategory.update({
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
  const portId = getPortId();
  const existing = await prisma.demoExpense.findFirst({
    where: { id: expenseId, portId },
  });
  if (!existing) return null;

  const expense = await prisma.demoExpense.update({
    where: { id: expenseId },
    data: { status },
  });
  return toExpense(expense);
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

export async function createDrawdown(data: {
  awardId: string;
  expenseIds: string[];
  notes: string;
}): Promise<DrawdownRequest> {
  const portId = getPortId();

  // Calculate total from expenses
  const expenses = await prisma.demoExpense.findMany({
    where: { id: { in: data.expenseIds }, portId },
  });
  const totalAmount = expenses.reduce((s, e) => s + Number(e.amount), 0);

  const drawdown = await prisma.demoDrawdownRequest.create({
    data: {
      portId,
      awardId: data.awardId,
      expenseIds: data.expenseIds,
      totalAmount,
      status: "draft",
      notes: data.notes,
    },
  });

  // Mark expenses as drawn
  await prisma.demoExpense.updateMany({
    where: { id: { in: data.expenseIds } },
    data: { status: "drawn" },
  });

  return toDrawdownRequest(drawdown);
}

export async function updateDrawdownStatus(
  id: string,
  status: DrawdownStatus
): Promise<DrawdownRequest | null> {
  const portId = getPortId();
  const existing = await prisma.demoDrawdownRequest.findFirst({
    where: { id, portId },
  });
  if (!existing) return null;

  const updateData: Prisma.DemoDrawdownRequestUpdateInput = { status };
  if (status === "submitted") updateData.submittedDate = new Date();
  if (status === "approved") updateData.approvedDate = new Date();
  if (status === "payment_received") updateData.paymentDate = new Date();

  const drawdown = await prisma.demoDrawdownRequest.update({
    where: { id },
    data: updateData,
  });
  return toDrawdownRequest(drawdown);
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
  const existing = await prisma.demoBudgetModification.findFirst({
    where: { id, portId },
  });
  if (!existing) return null;

  // Update the modification status
  const mod = await prisma.demoBudgetModification.update({
    where: { id },
    data: {
      status: "approved",
      approvedDate: new Date(),
    },
  });

  // Update category ceilings
  await prisma.$transaction([
    prisma.demoBudgetCategory.update({
      where: { id: existing.fromCategoryId },
      data: { ceiling: { decrement: Number(existing.amount) } },
    }),
    prisma.demoBudgetCategory.update({
      where: { id: existing.toCategoryId },
      data: { ceiling: { increment: Number(existing.amount) } },
    }),
  ]);

  return toBudgetModification(mod);
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
