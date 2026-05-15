/**
 * Awards State Management
 *
 * Financial compliance engine for won grants. Tracks award budgets, expenses,
 * drawdowns, match commitments, and budget modifications for federal and state grants.
 *
 * Data modeled on Port Freeport, TX: 6 active awards, $46M+ total.
 */

// ─── Types ───

export type AwardStatus = "active" | "suspended" | "closeout_pending" | "closed";
export type MatchType = "cash" | "in_kind" | "state" | "other";
export type DrawdownStatus = "draft" | "submitted" | "approved" | "payment_received";
export type BudgetModStatus = "requested" | "approved" | "denied";
export type ExpenseStatus = "logged" | "flagged" | "approved" | "drawn";

export interface BudgetCategory {
  id: string;
  name: string;
  ceiling: number;
  spent: number; // computed from expenses
}

export interface MatchRequirement {
  percentage: number; // e.g., 20 means 20%
  types: MatchType[];
  committed: number;
  required: number; // computed: totalAward * (percentage / (100 - percentage))
}

export interface MatchLedgerEntry {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: MatchType;
  documentation?: string;
}

export interface Expense {
  id: string;
  awardId: string;
  categoryId: string;
  date: string;
  description: string;
  vendor: string;
  amount: number;
  status: ExpenseStatus;
  attachments: string[]; // filenames (mock)
  flagReason?: string;
  overrideJustification?: string;
  allocations?: CostAllocation[]; // for split expenses
  createdAt: string;
}

export interface CostAllocation {
  awardId: string;
  percentage: number;
  amount: number;
  methodology: string;
}

export interface DrawdownRequest {
  id: string;
  awardId: string;
  expenseIds: string[];
  totalAmount: number;
  status: DrawdownStatus;
  submittedDate?: string;
  approvedDate?: string;
  paymentDate?: string;
  notes: string;
  createdAt: string;
}

export interface BudgetModification {
  id: string;
  awardId: string;
  fromCategoryId: string;
  toCategoryId: string;
  amount: number;
  justification: string;
  status: BudgetModStatus;
  requestedDate: string;
  approvedDate?: string;
}

export interface Award {
  id: string;
  fain: string; // Federal Award Identification Number
  cfda: string; // CFDA/ALN number
  awardingAgency: string;
  program: string;
  title: string;
  description: string;
  totalAmount: number;
  budgetCategories: BudgetCategory[];
  performancePeriod: { start: string; end: string };
  matchRequirement: MatchRequirement;
  matchLedger: MatchLedgerEntry[];
  status: AwardStatus;
  pipelineGrantId?: string;
  projectIds: string[];
  indirectCostRate?: number | null;
  indirectCostBase?: string | null;
  indirectCostType?: string | null;
  indirectCostPeriodStart?: string | null;
  indirectCostPeriodEnd?: string | null;
  nicraDocumentUrl?: string | null;
  createdAt: string;
}

// ─── 2 CFR 200 Unallowable Cost Rules Engine ───

export interface CostRule {
  id: string;
  pattern: RegExp;
  category: string;
  description: string;
  severity: "block" | "warn";
}

const UNALLOWABLE_COST_RULES: CostRule[] = [
  { id: "alcohol", pattern: /\b(alcohol|beer|wine|liquor|spirits|bar\s*tab)\b/i, category: "Alcohol", description: "Alcoholic beverages are unallowable under 2 CFR 200.423", severity: "block" },
  { id: "lobbying", pattern: /\b(lobby|lobbying|lobbyist|political\s*contribution|campaign)\b/i, category: "Lobbying", description: "Lobbying and political activities are unallowable under 2 CFR 200.450", severity: "block" },
  { id: "entertainment", pattern: /\b(entertainment|amusement|social\s*activit|recreation|ticket[s]?\s*(to|for))\b/i, category: "Entertainment", description: "Entertainment costs are unallowable under 2 CFR 200.438", severity: "block" },
  { id: "fines", pattern: /\b(fine[s]?|penalt|sanction|violation\s*fee)\b/i, category: "Fines & Penalties", description: "Fines, penalties, and sanctions are unallowable under 2 CFR 200.441", severity: "block" },
  { id: "fundraising", pattern: /\b(fundrais|fund\s*rais|donation\s*drive|charity\s*event)\b/i, category: "Fundraising", description: "Fundraising and investment management costs are unallowable under 2 CFR 200.442", severity: "block" },
  { id: "first_class", pattern: /\b(first\s*class|business\s*class|premium\s*cabin)\b/i, category: "Travel", description: "First-class or business-class airfare is unallowable under 2 CFR 200.474", severity: "warn" },
  { id: "membership_clubs", pattern: /\b(country\s*club|social\s*club|athletic\s*club|membership\s*dues.*club)\b/i, category: "Memberships", description: "Social organization memberships and country club dues are unallowable under 2 CFR 200.454", severity: "block" },
  { id: "goods_services_personal", pattern: /\b(personal\s*use|personal\s*expense|gift\s*card|employee\s*gift)\b/i, category: "Personal Use", description: "Goods or services for personal use are unallowable under 2 CFR 200.445", severity: "block" },
];

export function checkExpenseAllowability(description: string): { allowed: boolean; violations: { rule: CostRule; match: string }[] } {
  const violations: { rule: CostRule; match: string }[] = [];

  for (const rule of UNALLOWABLE_COST_RULES) {
    const match = description.match(rule.pattern);
    if (match) {
      violations.push({ rule, match: match[0] });
    }
  }

  const hasBlocking = violations.some((v) => v.rule.severity === "block");
  return { allowed: !hasBlocking, violations };
}

export function getAllCostRules(): CostRule[] {
  return [...UNALLOWABLE_COST_RULES];
}

import {
  polestarDefenseAwards,
  polestarDefenseExpenses,
  polestarDefenseDrawdowns,
  polestarDefenseBudgetMods,
} from "./polestar-defense-awards";

// ─── In-Memory State ───

const awards: Award[] = [];
const expenses: Expense[] = [];
const drawdowns: DrawdownRequest[] = [];
const budgetModifications: BudgetModification[] = [];
let initializedAwardsProfileId: string | null = null;

function ensureInitialized() {
  if (initializedAwardsProfileId === null) {
    initializeAwardsForProfile("port-freeport");
  }
}

export function initializeAwardsForProfile(profileId: string): void {
  if (initializedAwardsProfileId === profileId) return;
  awards.length = 0;
  expenses.length = 0;
  drawdowns.length = 0;
  budgetModifications.length = 0;
  initializedAwardsProfileId = profileId;

  if (profileId === "polestar-defense") {
    initializePolestarDefenseAwards();
  } else {
    initializePortFreeportAwards();
  }
}

function initializePolestarDefenseAwards(): void {
  polestarDefenseAwards.forEach((a) => awards.push(a));

  polestarDefenseExpenses.forEach((e, i) => {
    expenses.push({
      ...e,
      id: `exp-seed-${String(i + 1).padStart(3, "0")}`,
      createdAt: new Date(e.date).toISOString(),
    });
  });

  polestarDefenseDrawdowns.forEach((d, i) => {
    drawdowns.push({
      ...d,
      id: `dw-seed-${String(i + 1).padStart(3, "0")}`,
      createdAt: new Date().toISOString(),
    });
  });

  polestarDefenseBudgetMods.forEach((m, i) => {
    budgetModifications.push({
      ...m,
      id: `bmod-seed-${String(i + 1).padStart(3, "0")}`,
    });
  });
}

// ─── Award CRUD ───

export function getAllAwards(): Award[] {
  ensureInitialized();
  return awards;
}

export function getAwardById(id: string): Award | undefined {
  ensureInitialized();
  return awards.find((a) => a.id === id);
}

export function getAwardsByStatus(status: AwardStatus): Award[] {
  ensureInitialized();
  return awards.filter((a) => a.status === status);
}

export function getAwardStats() {
  ensureInitialized();
  const totalAwarded = awards.reduce((s, a) => s + a.totalAmount, 0);
  const totalSpent = expenses.filter((e) => e.status !== "flagged").reduce((s, e) => s + e.amount, 0);
  const totalDrawn = drawdowns.filter((d) => d.status === "approved" || d.status === "payment_received").reduce((s, d) => s + d.totalAmount, 0);
  const activeCount = awards.filter((a) => a.status === "active").length;
  const closeoutCount = awards.filter((a) => a.status === "closeout_pending").length;

  return { totalAwarded, totalSpent, totalDrawn, totalRemaining: totalAwarded - totalDrawn, activeCount, closeoutCount, totalAwards: awards.length };
}

// ─── Expense Operations ───

export function getExpensesForAward(awardId: string): Expense[] {
  ensureInitialized();
  return expenses.filter((e) => e.awardId === awardId);
}

export function getAllExpenses(): Expense[] {
  ensureInitialized();
  return expenses;
}

export interface ExpenseValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateExpense(
  awardId: string,
  categoryId: string,
  amount: number,
  date: string,
  description: string
): ExpenseValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const award = getAwardById(awardId);
  if (!award) {
    errors.push("Award not found.");
    return { valid: false, errors, warnings };
  }

  // Check performance period
  const expDate = new Date(date);
  const periodStart = new Date(award.performancePeriod.start);
  const periodEnd = new Date(award.performancePeriod.end);
  if (expDate < periodStart || expDate > periodEnd) {
    errors.push(`Expense date ${date} falls outside the performance period (${award.performancePeriod.start} to ${award.performancePeriod.end}).`);
  }

  // Check category ceiling
  const category = award.budgetCategories.find((c) => c.id === categoryId);
  if (!category) {
    errors.push("Budget category not found for this award.");
  } else {
    const categoryExpenses = expenses.filter((e) => e.awardId === awardId && e.categoryId === categoryId && e.status !== "flagged");
    const currentSpent = categoryExpenses.reduce((s, e) => s + e.amount, 0);
    if (currentSpent + amount > category.ceiling) {
      errors.push(`This expense ($${amount.toLocaleString()}) would exceed the ${category.name} category ceiling of $${category.ceiling.toLocaleString()}. Current spent: $${currentSpent.toLocaleString()}, remaining: $${(category.ceiling - currentSpent).toLocaleString()}.`);
    } else if (currentSpent + amount > category.ceiling * 0.9) {
      warnings.push(`This expense would bring ${category.name} spending to over 90% of the category ceiling.`);
    }
  }

  // Check award status
  if (award.status === "closed") {
    errors.push("Cannot log expenses against a closed award.");
  } else if (award.status === "suspended") {
    errors.push("This award is currently suspended. Expenses cannot be logged until the suspension is lifted.");
  }

  // Check 2 CFR 200 allowability
  const allowabilityCheck = checkExpenseAllowability(description);
  for (const v of allowabilityCheck.violations) {
    if (v.rule.severity === "block") {
      errors.push(`Potentially unallowable cost: ${v.rule.description} (matched: "${v.match}").`);
    } else {
      warnings.push(`Review recommended: ${v.rule.description} (matched: "${v.match}").`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function logExpense(data: {
  awardId: string;
  categoryId: string;
  date: string;
  description: string;
  vendor: string;
  amount: number;
  attachments?: string[];
  overrideJustification?: string;
  allocations?: CostAllocation[];
}): Expense {
  ensureInitialized();

  const validation = validateExpense(data.awardId, data.categoryId, data.amount, data.date, data.description);
  const allowability = checkExpenseAllowability(data.description);

  const expense: Expense = {
    id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    awardId: data.awardId,
    categoryId: data.categoryId,
    date: data.date,
    description: data.description,
    vendor: data.vendor,
    amount: data.amount,
    status: !validation.valid && !data.overrideJustification ? "flagged" : "logged",
    attachments: data.attachments ?? [],
    flagReason: !validation.valid ? validation.errors.join("; ") : undefined,
    overrideJustification: data.overrideJustification,
    allocations: data.allocations,
    createdAt: new Date().toISOString(),
  };

  expenses.push(expense);

  // Update budget category spent amount
  const award = getAwardById(data.awardId);
  if (award && expense.status !== "flagged") {
    const cat = award.budgetCategories.find((c) => c.id === data.categoryId);
    if (cat) cat.spent += data.amount;
  }

  return expense;
}

export function updateExpenseStatus(expenseId: string, status: ExpenseStatus): Expense | null {
  ensureInitialized();
  const exp = expenses.find((e) => e.id === expenseId);
  if (!exp) return null;
  exp.status = status;
  return exp;
}

// ─── Match Ledger Operations ───

export function addMatchEntry(data: {
  awardId: string;
  date: string;
  description: string;
  amount: number;
  type: MatchType;
  documentation?: string;
}): MatchLedgerEntry | null {
  ensureInitialized();
  const award = awards.find((a) => a.id === data.awardId);
  if (!award) return null;

  const entry: MatchLedgerEntry = {
    id: `ml-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    date: data.date,
    description: data.description,
    amount: data.amount,
    type: data.type,
    documentation: data.documentation,
  };

  award.matchLedger.push(entry);
  return entry;
}

// ─── Drawdown Operations ───

export function getDrawdownsForAward(awardId: string): DrawdownRequest[] {
  ensureInitialized();
  return drawdowns.filter((d) => d.awardId === awardId);
}

export function getAllDrawdowns(): DrawdownRequest[] {
  ensureInitialized();
  return drawdowns;
}

export function getEligibleExpensesForDrawdown(awardId: string): Expense[] {
  ensureInitialized();
  return expenses.filter((e) => e.awardId === awardId && e.status === "approved");
}

export function createDrawdown(data: { awardId: string; expenseIds: string[]; notes: string }): DrawdownRequest {
  ensureInitialized();

  const selectedExpenses = expenses.filter((e) => data.expenseIds.includes(e.id));
  const totalAmount = selectedExpenses.reduce((s, e) => s + e.amount, 0);

  const drawdown: DrawdownRequest = {
    id: `dw-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    awardId: data.awardId,
    expenseIds: data.expenseIds,
    totalAmount,
    status: "draft",
    notes: data.notes,
    createdAt: new Date().toISOString(),
  };

  drawdowns.push(drawdown);

  // Mark expenses as drawn
  for (const e of selectedExpenses) {
    e.status = "drawn";
  }

  return drawdown;
}

export function updateDrawdownStatus(id: string, status: DrawdownStatus): DrawdownRequest | null {
  const d = drawdowns.find((dr) => dr.id === id);
  if (!d) return null;
  d.status = status;
  if (status === "submitted") d.submittedDate = new Date().toISOString();
  if (status === "approved") d.approvedDate = new Date().toISOString();
  if (status === "payment_received") d.paymentDate = new Date().toISOString();
  return d;
}

// ─── Budget Modification Operations ───

export function getBudgetModsForAward(awardId: string): BudgetModification[] {
  ensureInitialized();
  return budgetModifications.filter((m) => m.awardId === awardId);
}

export function createBudgetMod(data: {
  awardId: string;
  fromCategoryId: string;
  toCategoryId: string;
  amount: number;
  justification: string;
}): BudgetModification {
  ensureInitialized();

  const mod: BudgetModification = {
    id: `bmod-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    awardId: data.awardId,
    fromCategoryId: data.fromCategoryId,
    toCategoryId: data.toCategoryId,
    amount: data.amount,
    justification: data.justification,
    status: "requested",
    requestedDate: new Date().toISOString(),
  };

  budgetModifications.push(mod);
  return mod;
}

export function approveBudgetMod(id: string): BudgetModification | null {
  const mod = budgetModifications.find((m) => m.id === id);
  if (!mod) return null;

  const award = getAwardById(mod.awardId);
  if (!award) return null;

  mod.status = "approved";
  mod.approvedDate = new Date().toISOString();

  // Update category ceilings
  const fromCat = award.budgetCategories.find((c) => c.id === mod.fromCategoryId);
  const toCat = award.budgetCategories.find((c) => c.id === mod.toCategoryId);
  if (fromCat) fromCat.ceiling -= mod.amount;
  if (toCat) toCat.ceiling += mod.amount;

  return mod;
}

// ─── Match Tracking ───

export function getMatchStatus(awardId: string): {
  required: number;
  committed: number;
  percentage: number;
  target: number;
  status: "on_track" | "at_risk" | "shortfall";
  periodProgress: number;
} {
  ensureInitialized();

  const award = getAwardById(awardId);
  if (!award) return { required: 0, committed: 0, percentage: 0, target: 0, status: "on_track", periodProgress: 0 };

  const req = award.matchRequirement;
  // Required match = totalAward * (matchPct / (100 - matchPct))
  // e.g., 20% match on $1M federal = $250K local ($1M is 80%, so local 20% = $250K)
  const required = award.totalAmount * (req.percentage / (100 - req.percentage));
  const committed = award.matchLedger.reduce((s, e) => s + e.amount, 0);
  const percentage = required > 0 ? (committed / required) * 100 : 100;

  // Calculate period progress
  const now = Date.now();
  const start = new Date(award.performancePeriod.start).getTime();
  const end = new Date(award.performancePeriod.end).getTime();
  const periodProgress = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));

  // Determine status based on match pace vs period progress
  let status: "on_track" | "at_risk" | "shortfall";
  if (percentage >= periodProgress * 0.8) {
    status = "on_track";
  } else if (percentage >= periodProgress * 0.5) {
    status = "at_risk";
  } else {
    status = "shortfall";
  }

  return { required, committed, percentage, target: req.percentage, status, periodProgress };
}

// ─── Attention Items (Dashboard) ───

export interface AttentionItem {
  id: string;
  type: "deadline" | "budget" | "match" | "drawdown" | "closeout";
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  awardId: string;
  awardTitle: string;
}

export function getAttentionItems(): AttentionItem[] {
  ensureInitialized();

  const items: AttentionItem[] = [];
  const now = Date.now();

  for (const award of awards) {
    if (award.status === "closed") continue;

    // Performance period ending soon
    const daysToEnd = Math.ceil((new Date(award.performancePeriod.end).getTime() - now) / (1000 * 60 * 60 * 24));
    if (daysToEnd <= 90 && daysToEnd > 0 && award.status === "active") {
      items.push({
        id: `attn-period-${award.id}`,
        type: "deadline",
        severity: daysToEnd <= 30 ? "critical" : "warning",
        title: `Performance period ends in ${daysToEnd} days`,
        description: `${award.title} ends ${award.performancePeriod.end}. Ensure all expenses are logged and final drawdown is prepared.`,
        awardId: award.id,
        awardTitle: award.title,
      });
    }

    // Budget categories over 80%
    for (const cat of award.budgetCategories) {
      const pctUsed = cat.ceiling > 0 ? (cat.spent / cat.ceiling) * 100 : 0;
      if (pctUsed >= 80) {
        items.push({
          id: `attn-budget-${award.id}-${cat.id}`,
          type: "budget",
          severity: pctUsed >= 95 ? "critical" : "warning",
          title: `${cat.name} at ${Math.round(pctUsed)}% of ceiling`,
          description: `${award.title}: $${cat.spent.toLocaleString()} of $${cat.ceiling.toLocaleString()} spent in ${cat.name}.`,
          awardId: award.id,
          awardTitle: award.title,
        });
      }
    }

    // Match shortfalls
    const matchStatus = getMatchStatus(award.id);
    if (matchStatus.status === "shortfall") {
      items.push({
        id: `attn-match-${award.id}`,
        type: "match",
        severity: "critical",
        title: `Match shortfall on ${award.program}`,
        description: `${award.title}: ${Math.round(matchStatus.percentage)}% of required match committed, but ${Math.round(matchStatus.periodProgress)}% through performance period.`,
        awardId: award.id,
        awardTitle: award.title,
      });
    } else if (matchStatus.status === "at_risk") {
      items.push({
        id: `attn-match-${award.id}`,
        type: "match",
        severity: "warning",
        title: `Match pace at risk on ${award.program}`,
        description: `${award.title}: Match commitment trending behind schedule. ${Math.round(matchStatus.percentage)}% committed vs ${Math.round(matchStatus.periodProgress)}% through period.`,
        awardId: award.id,
        awardTitle: award.title,
      });
    }

    // Pending drawdowns
    const awardDrawdowns = drawdowns.filter((d) => d.awardId === award.id && d.status === "draft");
    if (awardDrawdowns.length > 0) {
      const total = awardDrawdowns.reduce((s, d) => s + d.totalAmount, 0);
      items.push({
        id: `attn-drawdown-${award.id}`,
        type: "drawdown",
        severity: "info",
        title: `${awardDrawdowns.length} pending drawdown(s)`,
        description: `${award.title}: $${total.toLocaleString()} in draft drawdowns awaiting submission.`,
        awardId: award.id,
        awardTitle: award.title,
      });
    }

    // Closeout
    if (award.status === "closeout_pending") {
      items.push({
        id: `attn-closeout-${award.id}`,
        type: "closeout",
        severity: "critical",
        title: `Closeout in progress`,
        description: `${award.title}: Performance period ended. Complete final drawdown and closeout documentation within 120 days.`,
        awardId: award.id,
        awardTitle: award.title,
      });
    }
  }

  // Sort: critical first, then warning, then info
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  items.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return items;
}

// ─── Seed Data: Port Freeport, TX ───

function initializePortFreeportAwards() {

  const now = new Date();
  const today = now.toISOString().split("T")[0];

  // ── Award 1: PIDP Velasco Terminal Sustainability Expansion ($15.96M) ──
  awards.push({
    id: "award-pidp-velasco",
    fain: "693JF72240015",
    cfda: "20.823",
    awardingAgency: "U.S. Department of Transportation / Maritime Administration",
    program: "PIDP",
    title: "Velasco Terminal Sustainability Expansion",
    description: "Construction of a new 36,900 sq ft cross-dock warehouse, related site improvements on a 10-acre site, and a new terminal access truck gate at Velasco Container Terminal to reduce congestion and improve cargo throughput.",
    totalAmount: 15_960_000,
    budgetCategories: [
      { id: "pidp-warehouse", name: "Warehouse Construction", ceiling: 9_200_000, spent: 6_440_000 },
      { id: "pidp-site", name: "Site Improvements", ceiling: 3_800_000, spent: 2_660_000 },
      { id: "pidp-gate", name: "Truck Gate Infrastructure", ceiling: 1_960_000, spent: 1_372_000 },
      { id: "pidp-admin", name: "Project Administration", ceiling: 1_000_000, spent: 620_000 },
    ],
    performancePeriod: { start: "2023-04-01", end: "2027-03-31" },
    matchRequirement: { percentage: 20, types: ["cash", "in_kind"], committed: 3_200_000, required: 3_990_000 },
    matchLedger: [
      { id: "ml-1", date: "2023-06-15", description: "Port Freeport cash contribution - Phase 1", amount: 1_200_000, type: "cash" },
      { id: "ml-2", date: "2024-01-10", description: "In-kind: Land value contribution (10-acre site)", amount: 850_000, type: "in_kind" },
      { id: "ml-3", date: "2024-08-01", description: "Port Freeport cash contribution - Phase 2", amount: 1_150_000, type: "cash" },
    ],
    status: "active",
    projectIds: ["proj-velasco-expansion"],
    indirectCostRate: 42.5,
    indirectCostBase: "MTDC",
    indirectCostType: "provisional",
    indirectCostPeriodStart: "2023-01-01",
    indirectCostPeriodEnd: "2025-12-31",
    nicraDocumentUrl: null,
    createdAt: "2023-03-01T00:00:00.000Z",
  });

  // ── Award 2: CRISI Parcel 14 Rail Development Phase 2 ($6.3M) ──
  awards.push({
    id: "award-crisi-rail",
    fain: "FR-CRISI-0284-2024",
    cfda: "20.325",
    awardingAgency: "U.S. Department of Transportation / Federal Railroad Administration",
    program: "CRISI",
    title: "Parcel 14 Rail Development Phase 2",
    description: "Addition of approximately 24,000 feet of ladder tracks adjacent to existing 21,000 linear feet of rail on the 200+ acre Parcel 14 multimodal industrial park, connecting to the Union Pacific main line.",
    totalAmount: 6_300_000,
    budgetCategories: [
      { id: "crisi-track", name: "Track Construction", ceiling: 4_200_000, spent: 1_680_000 },
      { id: "crisi-signal", name: "Signaling & Crossings", ceiling: 1_100_000, spent: 440_000 },
      { id: "crisi-engineering", name: "Engineering & Design", ceiling: 650_000, spent: 585_000 },
      { id: "crisi-admin", name: "Project Management", ceiling: 350_000, spent: 175_000 },
    ],
    performancePeriod: { start: "2024-01-15", end: "2027-01-14" },
    matchRequirement: { percentage: 20, types: ["cash"], committed: 1_260_000, required: 1_575_000 },
    matchLedger: [
      { id: "ml-4", date: "2024-03-01", description: "Port Freeport cash match - rail project", amount: 800_000, type: "cash" },
      { id: "ml-5", date: "2025-01-15", description: "Port Freeport cash match - Phase 2", amount: 460_000, type: "cash" },
    ],
    status: "active",
    projectIds: ["proj-parcel14-rail"],
    createdAt: "2023-11-20T00:00:00.000Z",
  });

  // ── Award 3: EPA Clean Ports Planning ($1.487M) ──
  awards.push({
    id: "award-epa-cleanports",
    fain: "EPA-OAR-OTAQ-24-06-FPT",
    cfda: "66.956",
    awardingAgency: "U.S. Environmental Protection Agency",
    program: "EPA Clean Ports",
    title: "Port Freeport Clean Ports Planning & Emissions Inventory",
    description: "Comprehensive emissions inventory, port resiliency and zero-emission implementation plan, and performance measurement framework under the Inflation Reduction Act Clean Ports Program.",
    totalAmount: 1_487_000,
    budgetCategories: [
      { id: "epa-emissions", name: "Emissions Inventory", ceiling: 620_000, spent: 248_000 },
      { id: "epa-planning", name: "Resiliency Planning", ceiling: 520_000, spent: 104_000 },
      { id: "epa-framework", name: "Performance Framework", ceiling: 197_000, spent: 39_000 },
      { id: "epa-admin", name: "Administration & Outreach", ceiling: 150_000, spent: 75_000 },
    ],
    performancePeriod: { start: "2024-10-01", end: "2027-09-30" },
    matchRequirement: { percentage: 0, types: [], committed: 0, required: 0 },
    matchLedger: [],
    status: "active",
    projectIds: ["proj-clean-ports"],
    createdAt: "2024-09-15T00:00:00.000Z",
  });

  // ── Award 4: TxDOT SCP East 5th Street Reconstruction ($4.8M) ──
  awards.push({
    id: "award-txdot-scp-5thst",
    fain: "SCP-2024-FPT-0018",
    cfda: "20.205",
    awardingAgency: "Texas Department of Transportation",
    program: "TxDOT SCP",
    title: "East 5th Street Reconstruction & Truck Queuing",
    description: "Complete reconstruction of East 5th Street with dedicated truck queuing lanes, improved drainage, pavement reinforcement for heavy cargo traffic, and enhanced pedestrian safety infrastructure near the Velasco Terminal.",
    totalAmount: 4_800_000,
    budgetCategories: [
      { id: "scp-road", name: "Road Construction", ceiling: 3_200_000, spent: 2_880_000 },
      { id: "scp-drainage", name: "Drainage & Utilities", ceiling: 900_000, spent: 810_000 },
      { id: "scp-engineering", name: "Engineering", ceiling: 450_000, spent: 432_000 },
      { id: "scp-admin", name: "Project Management", ceiling: 250_000, spent: 188_000 },
    ],
    performancePeriod: { start: "2023-06-01", end: "2026-05-31" },
    matchRequirement: { percentage: 20, types: ["cash", "in_kind"], committed: 960_000, required: 1_200_000 },
    matchLedger: [
      { id: "ml-6", date: "2023-08-01", description: "Port Freeport cash match", amount: 400_000, type: "cash" },
      { id: "ml-7", date: "2024-02-15", description: "In-kind: Port staff project oversight", amount: 160_000, type: "in_kind" },
      { id: "ml-8", date: "2024-09-01", description: "Port Freeport cash match - Phase 2", amount: 400_000, type: "cash" },
    ],
    status: "active",
    projectIds: ["proj-5thst-reconstruction"],
    createdAt: "2023-05-10T00:00:00.000Z",
  });

  // ── Award 5: TxDOT Rider 37 Storage Area 5 ($8.2M) ──
  awards.push({
    id: "award-txdot-rider37",
    fain: "R37-2024-FPT-0006",
    cfda: "20.205",
    awardingAgency: "Texas Department of Transportation",
    program: "TxDOT Rider 37",
    title: "Storage Area 5 Container Expansion",
    description: "Development of a 15-acre container storage expansion at the Velasco Container Terminal, including heavy-duty pavement, reefer plug infrastructure, lighting, and stormwater management to increase TEU capacity.",
    totalAmount: 8_200_000,
    budgetCategories: [
      { id: "r37-paving", name: "Heavy-Duty Paving", ceiling: 4_800_000, spent: 1_440_000 },
      { id: "r37-reefer", name: "Reefer Infrastructure", ceiling: 1_600_000, spent: 320_000 },
      { id: "r37-stormwater", name: "Stormwater Management", ceiling: 1_200_000, spent: 480_000 },
      { id: "r37-engineering", name: "Engineering & Permitting", ceiling: 600_000, spent: 540_000 },
    ],
    performancePeriod: { start: "2024-04-01", end: "2027-09-30" },
    matchRequirement: { percentage: 10, types: ["cash"], committed: 820_000, required: 911_111 },
    matchLedger: [
      { id: "ml-9", date: "2024-05-15", description: "Port Freeport 10% cash match", amount: 820_000, type: "cash" },
    ],
    status: "active",
    projectIds: ["proj-storage-area5"],
    createdAt: "2024-02-28T00:00:00.000Z",
  });

  // ── Award 6: TxDOT SCP Terminal Access Road ($3.6M) ─ (closeout_pending for demo)
  awards.push({
    id: "award-txdot-scp-access",
    fain: "SCP-2022-FPT-0009",
    cfda: "20.205",
    awardingAgency: "Texas Department of Transportation",
    program: "TxDOT SCP",
    title: "Velasco Terminal Access Road Widening",
    description: "Widening and reconstruction of the primary terminal access road from SH 36 to the Velasco Terminal gate, including turn lanes, signalization, and heavy-vehicle pavement design for container truck traffic.",
    totalAmount: 3_600_000,
    budgetCategories: [
      { id: "access-construction", name: "Road Widening & Paving", ceiling: 2_200_000, spent: 2_200_000 },
      { id: "access-signals", name: "Signalization & Safety", ceiling: 750_000, spent: 738_000 },
      { id: "access-engineering", name: "Engineering & Design", ceiling: 400_000, spent: 392_000 },
      { id: "access-admin", name: "Project Administration", ceiling: 250_000, spent: 241_000 },
    ],
    performancePeriod: { start: "2022-07-01", end: "2025-06-30" },
    matchRequirement: { percentage: 20, types: ["cash"], committed: 900_000, required: 900_000 },
    matchLedger: [
      { id: "ml-10", date: "2022-08-01", description: "Port Freeport cash match - access road", amount: 500_000, type: "cash" },
      { id: "ml-11", date: "2023-06-01", description: "Port Freeport cash match - Phase 2", amount: 400_000, type: "cash" },
    ],
    status: "closeout_pending",
    projectIds: ["proj-access-road"],
    createdAt: "2022-06-01T00:00:00.000Z",
  });

  // ── Seed Expenses (realistic spread across past 12 months) ──
  const seedExpenses: Omit<Expense, "id" | "createdAt">[] = [
    // PIDP Velasco Terminal - warehouse construction heavy
    { awardId: "award-pidp-velasco", categoryId: "pidp-warehouse", date: "2024-06-15", description: "Cross-dock warehouse foundation and steel erection", vendor: "McCarthy Building Companies", amount: 2_150_000, status: "drawn", attachments: ["invoice-mccarthy-0615.pdf"] },
    { awardId: "award-pidp-velasco", categoryId: "pidp-warehouse", date: "2024-09-20", description: "Warehouse envelope and roofing installation", vendor: "McCarthy Building Companies", amount: 1_840_000, status: "drawn", attachments: ["invoice-mccarthy-0920.pdf"] },
    { awardId: "award-pidp-velasco", categoryId: "pidp-site", date: "2024-07-10", description: "Site grading and utility infrastructure", vendor: "Webber LLC", amount: 1_420_000, status: "approved", attachments: ["invoice-webber-0710.pdf", "progress-photos-jul.zip"] },
    { awardId: "award-pidp-velasco", categoryId: "pidp-gate", date: "2024-11-01", description: "Truck gate OCR system and barrier installation", vendor: "IDENTEC Solutions", amount: 872_000, status: "approved", attachments: ["invoice-identec-1101.pdf"] },
    { awardId: "award-pidp-velasco", categoryId: "pidp-admin", date: "2024-10-01", description: "Quarterly project management and MARAD reporting", vendor: "HDR Engineering", amount: 155_000, status: "logged", attachments: ["invoice-hdr-q3.pdf"] },
    { awardId: "award-pidp-velasco", categoryId: "pidp-site", date: "2025-01-15", description: "Parking and container staging area paving", vendor: "Webber LLC", amount: 1_240_000, status: "logged", attachments: ["invoice-webber-0115.pdf"] },

    // CRISI Rail - track construction
    { awardId: "award-crisi-rail", categoryId: "crisi-engineering", date: "2024-03-15", description: "Track alignment design and UP coordination", vendor: "HNTB Corporation", amount: 385_000, status: "drawn", attachments: ["invoice-hntb-0315.pdf"] },
    { awardId: "award-crisi-rail", categoryId: "crisi-track", date: "2024-08-01", description: "Ladder track grading and ballast - Phase 1", vendor: "Herzog Contracting", amount: 890_000, status: "approved", attachments: ["invoice-herzog-0801.pdf"] },
    { awardId: "award-crisi-rail", categoryId: "crisi-track", date: "2025-01-10", description: "Rail installation and welding - 12,000 LF", vendor: "Herzog Contracting", amount: 790_000, status: "logged", attachments: ["invoice-herzog-0110.pdf"] },
    { awardId: "award-crisi-rail", categoryId: "crisi-signal", date: "2024-11-15", description: "Grade crossing signal system design", vendor: "Wabtec Corporation", amount: 440_000, status: "approved", attachments: ["invoice-wabtec-1115.pdf"] },

    // EPA Clean Ports - consulting heavy
    { awardId: "award-epa-cleanports", categoryId: "epa-emissions", date: "2025-01-10", description: "Baseline emissions inventory - mobile sources", vendor: "ERG (Eastern Research Group)", amount: 148_000, status: "approved", attachments: ["invoice-erg-0110.pdf"] },
    { awardId: "award-epa-cleanports", categoryId: "epa-emissions", date: "2025-02-15", description: "Stationary source emissions assessment", vendor: "ERG (Eastern Research Group)", amount: 100_000, status: "logged", attachments: ["invoice-erg-0215.pdf"] },
    { awardId: "award-epa-cleanports", categoryId: "epa-planning", date: "2025-02-01", description: "Stakeholder engagement and workshop facilitation", vendor: "ICF International", amount: 104_000, status: "logged", attachments: ["invoice-icf-0201.pdf"] },
    { awardId: "award-epa-cleanports", categoryId: "epa-admin", date: "2024-12-15", description: "Program administration and EPA reporting", vendor: "Port Freeport Staff", amount: 75_000, status: "approved", attachments: ["admin-report-q1.pdf"] },

    // TxDOT SCP 5th Street - nearly complete
    { awardId: "award-txdot-scp-5thst", categoryId: "scp-road", date: "2024-04-15", description: "Road base and pavement - Phase 2", vendor: "Texas Sterling Construction", amount: 1_450_000, status: "drawn", attachments: ["invoice-tsc-0415.pdf"] },
    { awardId: "award-txdot-scp-5thst", categoryId: "scp-road", date: "2024-08-01", description: "Truck queuing lane construction", vendor: "Texas Sterling Construction", amount: 1_430_000, status: "drawn", attachments: ["invoice-tsc-0801.pdf"] },
    { awardId: "award-txdot-scp-5thst", categoryId: "scp-drainage", date: "2024-05-01", description: "Storm drain and retention system installation", vendor: "Binkley & Barfield", amount: 810_000, status: "drawn", attachments: ["invoice-bb-0501.pdf"] },
    { awardId: "award-txdot-scp-5thst", categoryId: "scp-engineering", date: "2024-01-15", description: "Construction engineering and inspection", vendor: "Lockwood Andrews & Newnam", amount: 432_000, status: "drawn", attachments: ["invoice-lan-0115.pdf"] },

    // Rider 37 Storage Area 5 - early/mid stages
    { awardId: "award-txdot-rider37", categoryId: "r37-engineering", date: "2024-06-01", description: "Site engineering and permitting", vendor: "Freese and Nichols", amount: 540_000, status: "drawn", attachments: ["invoice-fn-0601.pdf"] },
    { awardId: "award-txdot-rider37", categoryId: "r37-paving", date: "2024-11-01", description: "Subgrade preparation and stabilization", vendor: "Webber LLC", amount: 720_000, status: "approved", attachments: ["invoice-webber-1101.pdf"] },
    { awardId: "award-txdot-rider37", categoryId: "r37-paving", date: "2025-02-01", description: "Heavy-duty concrete paving - Phase 1", vendor: "Webber LLC", amount: 720_000, status: "logged", attachments: ["invoice-webber-0201.pdf"] },
    { awardId: "award-txdot-rider37", categoryId: "r37-stormwater", date: "2024-09-15", description: "Detention pond and outfall construction", vendor: "Binkley & Barfield", amount: 480_000, status: "approved", attachments: ["invoice-bb-0915.pdf"] },
    { awardId: "award-txdot-rider37", categoryId: "r37-reefer", date: "2025-01-20", description: "Reefer rack electrical conduit and pad installation", vendor: "MMR Group", amount: 320_000, status: "logged", attachments: ["invoice-mmr-0120.pdf"] },

    // Terminal Access Road - nearly complete (closeout)
    { awardId: "award-txdot-scp-access", categoryId: "access-construction", date: "2024-06-01", description: "Final pavement overlay and striping", vendor: "Texas Sterling Construction", amount: 580_000, status: "drawn", attachments: ["invoice-tsc-0601.pdf"] },
    { awardId: "award-txdot-scp-access", categoryId: "access-signals", date: "2024-08-15", description: "Traffic signal installation at SH 36 intersection", vendor: "Paradigm Traffic Systems", amount: 438_000, status: "drawn", attachments: ["invoice-pts-0815.pdf"] },
    { awardId: "award-txdot-scp-access", categoryId: "access-engineering", date: "2024-10-01", description: "As-built documentation and final inspection", vendor: "Lockwood Andrews & Newnam", amount: 92_000, status: "approved", attachments: ["invoice-lan-1001.pdf"] },
    { awardId: "award-txdot-scp-access", categoryId: "access-admin", date: "2025-02-01", description: "Final project closeout documentation", vendor: "Port Freeport Staff", amount: 41_000, status: "logged", attachments: ["closeout-prep.pdf"] },
  ];

  seedExpenses.forEach((e, i) => {
    expenses.push({
      ...e,
      id: `exp-seed-${String(i + 1).padStart(3, "0")}`,
      createdAt: new Date(e.date).toISOString(),
    });
  });

  // ── Seed Drawdowns ──
  drawdowns.push(
    {
      id: "dw-seed-001",
      awardId: "award-pidp-velasco",
      expenseIds: ["exp-seed-001", "exp-seed-002"],
      totalAmount: 3_990_000,
      status: "payment_received",
      submittedDate: "2024-10-15",
      approvedDate: "2024-11-05",
      paymentDate: "2024-11-25",
      notes: "Q3-Q4 FY2024 drawdown - warehouse construction",
      createdAt: "2024-10-10T00:00:00.000Z",
    },
    {
      id: "dw-seed-002",
      awardId: "award-txdot-scp-5thst",
      expenseIds: ["exp-seed-015", "exp-seed-016", "exp-seed-017", "exp-seed-018"],
      totalAmount: 4_122_000,
      status: "approved",
      submittedDate: "2024-09-15",
      approvedDate: "2024-10-05",
      notes: "FY2024 annual drawdown - road construction and drainage",
      createdAt: "2024-09-10T00:00:00.000Z",
    },
    {
      id: "dw-seed-003",
      awardId: "award-crisi-rail",
      expenseIds: ["exp-seed-007"],
      totalAmount: 385_000,
      status: "payment_received",
      submittedDate: "2024-05-01",
      approvedDate: "2024-05-20",
      paymentDate: "2024-06-10",
      notes: "Initial engineering drawdown - rail design",
      createdAt: "2024-04-28T00:00:00.000Z",
    },
    {
      id: "dw-seed-004",
      awardId: "award-pidp-velasco",
      expenseIds: ["exp-seed-003", "exp-seed-004"],
      totalAmount: 2_292_000,
      status: "draft",
      notes: "Q1 FY2025 drawdown - site work and truck gate",
      createdAt: "2025-02-15T00:00:00.000Z",
    },
    {
      id: "dw-seed-005",
      awardId: "award-txdot-scp-access",
      expenseIds: ["exp-seed-024", "exp-seed-025"],
      totalAmount: 1_018_000,
      status: "submitted",
      submittedDate: "2025-01-15",
      notes: "Final drawdown - terminal access road closeout",
      createdAt: "2025-01-10T00:00:00.000Z",
    },
    {
      id: "dw-seed-006",
      awardId: "award-txdot-rider37",
      expenseIds: ["exp-seed-019"],
      totalAmount: 540_000,
      status: "payment_received",
      submittedDate: "2024-07-15",
      approvedDate: "2024-08-01",
      paymentDate: "2024-08-20",
      notes: "Engineering and permitting drawdown",
      createdAt: "2024-07-10T00:00:00.000Z",
    }
  );

  // ── Seed Budget Modification ──
  budgetModifications.push({
    id: "bmod-seed-001",
    awardId: "award-pidp-velasco",
    fromCategoryId: "pidp-admin",
    toCategoryId: "pidp-warehouse",
    amount: 75_000,
    justification: "Administration costs running under budget; additional warehouse MEP work identified during construction requiring reallocation.",
    status: "approved",
    requestedDate: "2024-08-01",
    approvedDate: "2024-08-20",
  });
}
