export interface IndirectCostLine {
  base: number;
  rate: number;
  federalShare: number;
  type: string;
  periodStart: string;
  periodEnd: string;
}

interface AwardIndirectCost {
  indirectCostRate?: number | null;
  indirectCostBase?: string | null;
  indirectCostType?: string | null;
  indirectCostPeriodStart?: string | Date | null;
  indirectCostPeriodEnd?: string | Date | null;
}

interface ExpenseItem {
  date: string;
  amount: number;
  status?: string;
  categoryName?: string;
}

const MTDC_EXCLUDED_CATEGORIES = [
  "equipment",
  "capital expenditures",
  "participant support",
  "subawards over $25k",
  "rental costs of real property",
  "tuition remission",
  "scholarships and fellowships",
];

function isExcludedFromMTDC(expense: ExpenseItem): boolean {
  if (!expense.categoryName) return false;
  const lower = expense.categoryName.toLowerCase();
  return MTDC_EXCLUDED_CATEGORIES.some(cat => lower.includes(cat));
}

function isSalariesAndWages(expense: ExpenseItem): boolean {
  if (!expense.categoryName) return false;
  const lower = expense.categoryName.toLowerCase();
  return lower.includes("salary") || lower.includes("salaries") ||
         lower.includes("wage") || lower.includes("personnel") ||
         lower.includes("fringe") || lower.includes("labor");
}

export function computeIndirectCost(
  award: AwardIndirectCost,
  expenses: ExpenseItem[],
  periodStart: string,
  periodEnd: string,
): IndirectCostLine | null {
  if (!award.indirectCostRate || !award.indirectCostBase) return null;
  const rate = Number(award.indirectCostRate) / 100;

  const inWindow = expenses.filter(e =>
    e.date >= periodStart && e.date <= periodEnd && e.status !== "flagged"
  );

  let base: number;
  switch (award.indirectCostBase) {
    case "MTDC":
      base = inWindow
        .filter(e => !isExcludedFromMTDC(e))
        .reduce((s, e) => s + Number(e.amount), 0);
      break;
    case "S&W":
      base = inWindow
        .filter(e => isSalariesAndWages(e))
        .reduce((s, e) => s + Number(e.amount), 0);
      break;
    case "TDC":
    default:
      base = inWindow.reduce((s, e) => s + Number(e.amount), 0);
  }

  const icpStart = award.indirectCostPeriodStart
    ? (award.indirectCostPeriodStart instanceof Date
        ? award.indirectCostPeriodStart.toISOString().slice(0, 10)
        : String(award.indirectCostPeriodStart).slice(0, 10))
    : "";
  const icpEnd = award.indirectCostPeriodEnd
    ? (award.indirectCostPeriodEnd instanceof Date
        ? award.indirectCostPeriodEnd.toISOString().slice(0, 10)
        : String(award.indirectCostPeriodEnd).slice(0, 10))
    : "";

  return {
    base,
    rate,
    federalShare: base * rate,
    type: award.indirectCostType ?? "provisional",
    periodStart: icpStart,
    periodEnd: icpEnd,
  };
}
