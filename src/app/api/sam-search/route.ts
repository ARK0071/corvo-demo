import { searchVendors, deriveNaicsFromGrant } from "@/lib/usaspending";
import { PORT_NAICS_CODES } from "@/lib/naics";
import type { PortVendor } from "@/data/port-vendors";

export const maxDuration = 60;

const rateLimit = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 10;

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

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";
  if (isRateLimited(ip)) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Please wait a moment." }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json();
    const { naicsCodes, focusAreas, eligibleActivities, limit, maxPages, state, query, source } = body as {
      naicsCodes?: string[];
      focusAreas?: string[];
      eligibleActivities?: string[];
      limit?: number;
      maxPages?: number;
      state?: string;
      query?: string;
      source?: "recipients" | "awards" | "both";
    };

    // Derive NAICS codes from grant focus areas if not provided directly
    let codes = naicsCodes;
    if (!codes && focusAreas && eligibleActivities) {
      codes = deriveNaicsFromGrant(focusAreas, eligibleActivities);
    }
    if (!codes || codes.length === 0) {
      codes = PORT_NAICS_CODES;
    }

    const cappedMaxPages = Math.min(maxPages || 5, 10);
    const dataSource = source || "both";

    const result = await searchVendors({
      naicsCodes: codes,
      focusAreas,
      eligibleActivities,
      limit: limit || 100,
      maxPages: cappedMaxPages,
      state,
      query,
      source: dataSource,
    });

    return new Response(
      JSON.stringify({ vendors: result.vendors, totalRecords: result.totalRecords }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
