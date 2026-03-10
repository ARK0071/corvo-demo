import { NextRequest, NextResponse } from "next/server";
import { searchPortAwards } from "@/lib/competitiveIntel/usaspending";
import {
  aggregateAwards,
  type AggregatedPortIntel,
} from "@/lib/competitiveIntel/aggregate";

// ─── In-memory cache (10 min TTL) ───

interface CacheEntry {
  data: AggregatedPortIntel;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 10 * 60 * 1000;

function cacheKey(portName: string, start: string, end: string) {
  return `${portName.toLowerCase().trim()}|${start}|${end}`;
}

// ─── Route handler ───

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const portName = sp.get("port_name")?.trim();

  if (!portName) {
    return NextResponse.json(
      { error: "port_name query parameter is required" },
      { status: 400 }
    );
  }

  const today = new Date();
  const fiveYearsAgo = new Date(today);
  fiveYearsAgo.setFullYear(today.getFullYear() - 5);

  const endDate =
    sp.get("end_date") || today.toISOString().split("T")[0];
  const startDate =
    sp.get("start_date") || fiveYearsAgo.toISOString().split("T")[0];

  const key = cacheKey(portName, startDate, endDate);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  try {
    console.log(
      `[CI API] Searching USAspending for "${portName}" (${startDate} → ${endDate})`
    );

    const awards = await searchPortAwards({
      portName,
      startDate,
      endDate,
      maxResults: 200,
    });

    console.log(`[CI API] Found ${awards.length} awards for "${portName}"`);

    const aggregated = aggregateAwards(portName, awards);

    cache.set(key, { data: aggregated, timestamp: Date.now() });

    return NextResponse.json(aggregated);
  } catch (error) {
    console.error("[CI API] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch competitive intelligence",
        detail: String(error),
      },
      { status: 500 }
    );
  }
}
