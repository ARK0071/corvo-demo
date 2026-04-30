export interface MatchOnReport {
  requiredCumulative: number;
  committedCumulative: number;
  incurredThisPeriod: number;
  remainingToProvide: number;
  expectedAtThisPoint: number;
  status: "on_track" | "at_risk" | "shortfall";
}

interface AwardMatch {
  totalAmount: number;
  matchPercentage: number;
  performancePeriodStart: string;
  performancePeriodEnd: string;
}

interface LedgerEntry {
  date: string;
  amount: number;
}

export function computeMatchForPeriod(
  award: AwardMatch,
  ledgerEntries: LedgerEntry[],
  periodStart: string,
  periodEnd: string,
  asOf: string = new Date().toISOString().slice(0, 10),
): MatchOnReport {
  const matchPct = award.matchPercentage;
  if (matchPct <= 0) {
    return {
      requiredCumulative: 0,
      committedCumulative: 0,
      incurredThisPeriod: 0,
      remainingToProvide: 0,
      expectedAtThisPoint: 0,
      status: "on_track",
    };
  }

  const requiredCumulative = award.totalAmount * (matchPct / (100 - matchPct));

  const committedCumulative = ledgerEntries
    .filter(e => e.date <= asOf)
    .reduce((s, e) => s + Number(e.amount), 0);

  const incurredThisPeriod = ledgerEntries
    .filter(e => e.date >= periodStart && e.date <= periodEnd)
    .reduce((s, e) => s + Number(e.amount), 0);

  const remainingToProvide = Math.max(0, requiredCumulative - committedCumulative);

  const perfStart = new Date(award.performancePeriodStart).getTime();
  const perfEnd = new Date(award.performancePeriodEnd).getTime();
  const now = new Date(asOf).getTime();
  const elapsed = Math.max(0, Math.min(1, (now - perfStart) / (perfEnd - perfStart)));
  const expectedAtThisPoint = requiredCumulative * elapsed;

  let status: "on_track" | "at_risk" | "shortfall";
  if (expectedAtThisPoint <= 0 || committedCumulative >= expectedAtThisPoint * 0.9) {
    status = "on_track";
  } else if (committedCumulative >= expectedAtThisPoint * 0.8) {
    status = "at_risk";
  } else {
    status = "shortfall";
  }

  return {
    requiredCumulative,
    committedCumulative,
    incurredThisPeriod,
    remainingToProvide,
    expectedAtThisPoint,
    status,
  };
}
