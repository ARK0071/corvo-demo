import { searchVendors } from "@/lib/usaspending";
import { deriveNaicsFromGrant } from "@/lib/govcon";
import { PORT_NAICS_CODES } from "@/lib/naics";
import type { PortVendor } from "@/data/port-vendors";
import { ActiveVendors } from "@/lib/db/repositories";
import { embedAndStoreVendors } from "@/lib/db/embedding-service";

export const maxDuration = 60;

const rateLimit = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 10;

const responseCache = new Map<string, { data: any; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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
      source?: "recipients" | "awards" | "sam" | "both" | "all";
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
    // Default to "all" for comprehensive vendor search (USAspending + SAM)
    const dataSource = source || "all";

    // Check cache first
    const cacheKey = JSON.stringify({ codes, limit, maxPages: cappedMaxPages, state, query, source: dataSource });
    const cached = responseCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return new Response(
        JSON.stringify(cached.data),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

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

    const responseData = { vendors: result.vendors, totalRecords: result.totalRecords };

    // Cache the response
    responseCache.set(cacheKey, { data: responseData, expiresAt: Date.now() + CACHE_TTL });

    // Store vendors in database and generate embeddings (non-blocking)
    if (result.vendors.length > 0) {
      ActiveVendors.upsertVendors(result.vendors)
        .then(async (dbResult: { created: number; updated: number }) => {
          console.log(`[sam-search] Persisted ${dbResult.created} new, ${dbResult.updated} updated vendors`);
          // Generate embeddings for newly stored vendors
          if (dbResult.created > 0 || dbResult.updated > 0) {
            try {
              await embedAndStoreVendors(result.vendors);
            } catch (embErr: unknown) {
              console.error("Failed to generate vendor embeddings:", embErr);
            }
          }
        })
        .catch((err: unknown) => {
          console.error("Failed to persist vendors to database:", err);
        });
    }

    return new Response(
      JSON.stringify(responseData),
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
