import { NextResponse } from "next/server";
import { searchVendorsAdvanced, type AggregatedVendor } from "@/lib/govcon";
import { computeComplianceSummary } from "@/lib/compliance";
import type { EnrichedVendor, VendorSearchFilters } from "@/lib/vendor-filters";
import { NAICS_SECTOR_MAP } from "@/lib/naics";

export const maxDuration = 60;

const rateLimit = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 15;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimit.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimit.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

function enrichVendor(raw: AggregatedVendor): EnrichedVendor {
  const compliance = computeComplianceSummary({
    totalAwardValue: raw.totalAmount,
    maxSingleAward: raw.maxSingleAward,
    awardCount: raw.awardCount,
    agencies: [...raw.agencies],
    setAsideTypes: [...raw.setAsideTypes],
    samActive: true,
  });

  return {
    id: raw.name.replace(/[^a-zA-Z0-9]/g, "-").slice(0, 60),
    name: raw.name,
    dba: null,
    state: raw.state,
    city: raw.city,
    naicsCodes: [...raw.naics],
    pscCodes: [...raw.pscs],
    totalAwardValue: raw.totalAmount,
    awardCount: raw.awardCount,
    maxSingleAward: raw.maxSingleAward,
    agencies: [...raw.agencies],
    recentAwards: raw.awards.slice(0, 5).map((a) => ({
      title: a.title,
      amount: a.amount,
      date: a.date,
      agency: a.agency,
      solicitationNumber: a.solicitationNumber,
    })),
    setAsideTypes: [...raw.setAsideTypes],
    samActive: true,
    compliance,
  };
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429 }
    );
  }

  try {
    const body = (await req.json()) as Partial<VendorSearchFilters>;

    if (!process.env.GOVCON_API_KEY) {
      return NextResponse.json(
        { error: "GOVCON_API_KEY is not configured. Add it to .env.local." },
        { status: 500 }
      );
    }

    const { vendors: rawVendors, totalRecords } = await searchVendorsAdvanced({
      naicsCodes: body.naicsCodes,
      noticeType: body.noticeType || "Award Notice",
      setAsides: body.setAsides,
      states: body.states,
      agencies: body.agencies,
      agencySearch: body.agencySearch,
      valueMin: body.valueRange?.min,
      valueMax: body.valueRange?.max,
      postedFrom: body.dateRange?.from,
      postedTo: body.dateRange?.to,
      pscCodes: body.pscCodes,
    });

    const vendors: EnrichedVendor[] = rawVendors
      .map(enrichVendor)
      .sort((a, b) => b.totalAwardValue - a.totalAwardValue);

    return NextResponse.json({
      vendors,
      totalRecords,
      filtersApplied: {
        naics: body.naicsCodes?.length || 0,
        states: body.states?.length || 0,
        noticeType: body.noticeType || "Award Notice",
        setAsides: body.setAsides?.length || 0,
        agencies: body.agencies?.length || 0,
        dateRange: body.dateRange ? `${body.dateRange.from} to ${body.dateRange.to}` : null,
        valueRange: body.valueRange?.min || body.valueRange?.max ? body.valueRange : null,
        psc: body.pscCodes?.length || 0,
      },
    });
  } catch (error) {
    console.error("Vendor Search API error:", error);
    const message = error instanceof Error ? error.message : "Failed to search vendors";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
