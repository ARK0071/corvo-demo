/**
 * Aggregation functions + program inference for Competitive Intelligence.
 */

import type { NormalizedAward } from "./usaspending";

// ─── Program inference keyword map ───

const PROGRAM_KEYWORDS: [RegExp, string][] = [
  [/\bPIDP\b|Port Infrastructure Development Program/i, "PIDP"],
  [/\bRAISE\b/i, "RAISE"],
  [/\bINFRA\b/i, "INFRA"],
  [/\bCRISI\b/i, "CRISI"],
  [/\bDERA\b/i, "DERA"],
  [/\bMARAD\b/i, "MARAD"],
  [/\bPSGP\b|Port Security Grant/i, "PSGP"],
  [/\bTIGER\b/i, "TIGER"],
  [/\bBUILD\b/i, "BUILD"],
  [/\bMEGA\b/i, "MEGA"],
];

function inferProgram(award: NormalizedAward): string {
  if (award.assistanceListing) {
    return `AL ${award.assistanceListing}`;
  }
  const text = `${award.description ?? ""} ${award.agency} ${award.subAgency}`;
  for (const [pattern, label] of PROGRAM_KEYWORDS) {
    if (pattern.test(text)) return label;
  }
  return "Other / Unspecified";
}

// ─── Output types ───

export interface YearBucket {
  year: number;
  totalAmount: number;
  awardCount: number;
}

export interface AgencyBucket {
  agency: string;
  totalAmount: number;
  awardCount: number;
}

export interface ProgramBucket {
  program: string;
  totalAmount: number;
  awardCount: number;
}

export interface RecentAward {
  recipient: string;
  amount: number;
  startDate: string | null;
  endDate: string | null;
  agency: string;
  assistanceListing: string | null;
  description: string | null;
  stateCode: string | null;
  usaSpendingUrl: string | null;
}

export interface AggregatedPortIntel {
  portName: string;
  totalFunding: number;
  awardCount: number;
  avgAward: number;
  dateRange: { earliest: string | null; latest: string | null };
  byYear: YearBucket[];
  topAgencies: AgencyBucket[];
  topPrograms: ProgramBucket[];
  recentAwards: RecentAward[];
}

// ─── Aggregation ───

export function aggregateAwards(
  portName: string,
  awards: NormalizedAward[]
): AggregatedPortIntel {
  if (awards.length === 0) {
    return {
      portName,
      totalFunding: 0,
      awardCount: 0,
      avgAward: 0,
      dateRange: { earliest: null, latest: null },
      byYear: [],
      topAgencies: [],
      topPrograms: [],
      recentAwards: [],
    };
  }

  const totalFunding = awards.reduce((s, a) => s + a.amount, 0);
  const awardCount = awards.length;
  const avgAward = totalFunding / awardCount;

  // Date range
  const dates = awards
    .map((a) => a.startDate)
    .filter(Boolean)
    .sort() as string[];
  const earliest = dates[0] ?? null;
  const latest = dates[dates.length - 1] ?? null;

  // By year
  const yearMap = new Map<number, { total: number; count: number }>();
  for (const a of awards) {
    const yr = a.startDate ? parseInt(a.startDate.slice(0, 4), 10) : null;
    if (yr && !isNaN(yr)) {
      const entry = yearMap.get(yr) ?? { total: 0, count: 0 };
      entry.total += a.amount;
      entry.count += 1;
      yearMap.set(yr, entry);
    }
  }
  const byYear: YearBucket[] = [...yearMap.entries()]
    .map(([year, v]) => ({ year, totalAmount: v.total, awardCount: v.count }))
    .sort((a, b) => a.year - b.year);

  // Top agencies
  const agencyMap = new Map<string, { total: number; count: number }>();
  for (const a of awards) {
    const key = a.agency || "Unknown";
    const entry = agencyMap.get(key) ?? { total: 0, count: 0 };
    entry.total += a.amount;
    entry.count += 1;
    agencyMap.set(key, entry);
  }
  const topAgencies: AgencyBucket[] = [...agencyMap.entries()]
    .map(([agency, v]) => ({
      agency,
      totalAmount: v.total,
      awardCount: v.count,
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 10);

  // Top programs
  const programMap = new Map<string, { total: number; count: number }>();
  for (const a of awards) {
    const prog = inferProgram(a);
    const entry = programMap.get(prog) ?? { total: 0, count: 0 };
    entry.total += a.amount;
    entry.count += 1;
    programMap.set(prog, entry);
  }
  const topPrograms: ProgramBucket[] = [...programMap.entries()]
    .map(([program, v]) => ({
      program,
      totalAmount: v.total,
      awardCount: v.count,
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 10);

  // Recent awards (sorted by start_date desc, top 10)
  const sorted = [...awards].sort((a, b) => {
    const da = a.startDate ?? "";
    const db = b.startDate ?? "";
    return db.localeCompare(da);
  });

  const recentAwards: RecentAward[] = sorted.slice(0, 10).map((a) => ({
    recipient: a.recipient,
    amount: a.amount,
    startDate: a.startDate,
    endDate: a.endDate,
    agency: a.agency,
    assistanceListing: a.assistanceListing,
    description: a.description,
    stateCode: a.stateCode,
    usaSpendingUrl: a.usaSpendingUrl,
  }));

  return {
    portName,
    totalFunding,
    awardCount,
    avgAward,
    dateRange: { earliest, latest },
    byYear,
    topAgencies,
    topPrograms,
    recentAwards,
  };
}
