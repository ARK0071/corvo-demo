import { searchVendors } from "@/lib/usaspending";
import { deriveNaicsFromGrant } from "@/lib/govcon";
import { PORT_NAICS_CODES } from "@/lib/naics";
import type { PortVendor } from "@/data/port-vendors";
import { setTenantConfigFromHeaders, getTenantConfig } from "@/lib/db/tenant-config";
import * as DemoVendors from "@/lib/db/repositories/demo-vendors";

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

  // Set tenant config from request headers
  setTenantConfigFromHeaders(req.headers as unknown as Headers);
  const tenantConfig = getTenantConfig();

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

    // Store vendors in database (non-blocking)
    if (result.vendors.length > 0 && process.env.DATABASE_URL) {
      // Demo environment - use DemoVendors repository
      if (tenantConfig.environment === "demo") {
        DemoVendors.upsertVendors(result.vendors)
          .then((dbResult) => {
            console.log(
              `[sam-search] Persisted ${dbResult.created} new, ${dbResult.updated} updated vendors to demo DB`
            );
          })
          .catch((err: unknown) => {
            console.error("Failed to persist vendors to demo database:", err);
          });
      } else if (process.env.RDS_HOST) {
        // Production environment - use ActiveVendors with embeddings
        import("@/lib/db/repositories").then(async ({ ActiveVendors }) => {
          const { embedAndStoreVendors } = await import("@/lib/db/embedding-service");
          const dbResult = await ActiveVendors.upsertVendors(result.vendors);
          console.log(`[sam-search] Persisted ${dbResult.created} new, ${dbResult.updated} updated vendors`);
          if (dbResult.created > 0 || dbResult.updated > 0) {
            await embedAndStoreVendors(result.vendors);
          }
        }).catch((err: unknown) => {
          console.error("Failed to persist vendors to database:", err);
        });
      }
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
