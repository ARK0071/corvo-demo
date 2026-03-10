/**
 * Congress.gov API Client
 *
 * Provides access to congressional appropriations, authorizations, and bills.
 * Used to track new program authorizations and funding levels.
 *
 * API Documentation: https://api.congress.gov/
 */

const CONGRESS_GOV_BASE_URL = "https://api.congress.gov/v3";
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const searchCache = new Map<string, CacheEntry<any>>();

export interface CongressBill {
  congress: number;
  type: string;
  number: number;
  title: string;
  url: string;
  updateDate: string;
  latestAction?: {
    text: string;
    actionDate: string;
  };
}

export interface CongressSearchParams {
  query?: string;
  billType?: string; // e.g., "HR", "S"
  congress?: number; // e.g., 118 for 118th Congress
  limit?: number;
  offset?: number;
}

/**
 * Search for appropriations bills
 */
export async function searchAppropriations(
  keywords: string,
  params: Omit<CongressSearchParams, "query"> = {}
): Promise<CongressBill[]> {
  const apiKey = process.env.CONGRESS_GOV_API_KEY;
  if (!apiKey) {
    throw new Error("CONGRESS_GOV_API_KEY is not configured. Add it to .env.local.");
  }

  const cacheKey = JSON.stringify({ keywords, ...params });
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
    return cached.data;
  }

  const queryParams = new URLSearchParams();
  queryParams.set("api_key", apiKey);
  queryParams.set("format", "json");
  queryParams.set("limit", String(params.limit || 100));
  queryParams.set("offset", String(params.offset || 0));

  // Build query with appropriations keywords
  const query = `${keywords} appropriations funding`;
  queryParams.set("q", query);

  if (params.billType) {
    queryParams.set("billType", params.billType);
  }
  if (params.congress) {
    queryParams.set("congress", String(params.congress));
  }

  try {
    const url = `${CONGRESS_GOV_BASE_URL}/bill?${queryParams.toString()}`;
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Congress.gov API returned ${response.status}`);
    }

    const data = await response.json();
    const bills: CongressBill[] = (data.bills || []).map((bill: any) => ({
      congress: bill.congress,
      type: bill.type,
      number: bill.number,
      title: bill.title,
      url: bill.url,
      updateDate: bill.updateDate,
      latestAction: bill.latestAction,
    }));

    searchCache.set(cacheKey, { data: bills, timestamp: Date.now() });
    return bills;
  } catch (error) {
    console.error("Congress.gov API error:", error);
    throw error;
  }
}

/**
 * Get program authorization status
 */
export async function getProgramAuthorization(programName: string): Promise<CongressBill[]> {
  return searchAppropriations(programName);
}

/**
 * Clear cache
 */
export function clearCongressCache(): void {
  searchCache.clear();
}
