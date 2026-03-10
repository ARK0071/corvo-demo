/**
 * Brave Search API Client
 *
 * Used to discover niche, Texas-specific grants that aren't easily found
 * through standard APIs. Brave Search has an independent index and is
 * excellent for finding local government and regional development grants.
 */

import type { DiscoveredGrant } from "./grants-gov";

const BRAVE_SEARCH_BASE_URL = "https://api.search.brave.com/res/v1/web/search";
const CACHE_DURATION_MS = 4 * 60 * 60 * 1000; // 4 hours

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const searchCache = new Map<string, CacheEntry<BraveSearchResponse>>();

interface BraveSearchResponse {
  web: {
    results: Array<{
      title: string;
      url: string;
      description: string;
      meta_url?: {
        hostname?: string;
      };
    }>;
  };
  query?: {
    original: string;
  };
}

/**
 * Search Brave Search API
 */
export async function searchBrave(
  query: string,
  params: {
    count?: number;
    safesearch?: "off" | "moderate" | "strict";
    freshness?: string; // e.g., "pd" (past day), "pw" (past week), "pm" (past month)
  } = {}
): Promise<BraveSearchResponse> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) {
    throw new Error("BRAVE_SEARCH_API_KEY is not configured. Add it to .env.local.");
  }

  const cacheKey = JSON.stringify({ query, params });
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
    return cached.data;
  }

  const searchParams = new URLSearchParams();
  searchParams.set("q", query);
  searchParams.set("count", String(params.count || 20));
  searchParams.set("safesearch", params.safesearch || "moderate");
  if (params.freshness) {
    searchParams.set("freshness", params.freshness);
  }

  const url = `${BRAVE_SEARCH_BASE_URL}?${searchParams.toString()}`;

  try {
    const response = await fetch(url, {
      headers: {
        "X-Subscription-Token": apiKey,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Brave Search API returned ${response.status}: ${errorText}`);
    }

    const data: BraveSearchResponse = await response.json();
    searchCache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  } catch (error) {
    console.error("Brave Search API error:", error);
    throw error;
  }
}

/**
 * Search for Texas-specific grants
 */
export async function searchTexasGrants(
  keywords: string[] = [],
  options: {
    includeStateAgencies?: boolean;
    includeRegional?: boolean;
    includeFoundations?: boolean;
    includeLocal?: boolean;
    freshness?: string;
  } = {}
): Promise<DiscoveredGrant[]> {
  const {
    includeStateAgencies = true,
    includeRegional = true,
    includeFoundations = true,
    includeLocal = true,
    freshness,
  } = options;

  const baseKeywords = keywords.length > 0 ? keywords.join(" ") : "port maritime infrastructure";
  const grants: DiscoveredGrant[] = [];

  // State agency searches
  if (includeStateAgencies) {
    const stateSearches = [
      `site:txdot.gov ${baseKeywords} grant funding opportunity`,
      `site:glo.texas.gov ${baseKeywords} grant coastal`,
      `site:twdb.texas.gov ${baseKeywords} infrastructure grant`,
      `site:egrants.gov.texas.gov ${baseKeywords} port security`,
      `site:comptroller.texas.gov ${baseKeywords} economic development`,
    ];

    for (const query of stateSearches) {
      try {
        const results = await searchBrave(query, { count: 10, freshness });
        grants.push(...extractGrantsFromBraveResults(results, "Brave Search (Texas State)"));
      } catch (err) {
        console.error(`Brave search error for "${query}":`, err);
      }
    }
  }

  // Regional development searches
  if (includeRegional) {
    const regionalSearches = [
      `${baseKeywords} Texas Gulf Coast port infrastructure grant`,
      `${baseKeywords} Houston-Galveston port development funding`,
      `${baseKeywords} Texas port authority grant program`,
      `${baseKeywords} Gulf Coast maritime infrastructure funding`,
    ];

    for (const query of regionalSearches) {
      try {
        const results = await searchBrave(query, { count: 10, freshness });
        grants.push(...extractGrantsFromBraveResults(results, "Brave Search (Regional)"));
      } catch (err) {
        console.error(`Brave search error for "${query}":`, err);
      }
    }
  }

  // Foundation grants
  if (includeFoundations) {
    const foundationSearches = [
      `Texas port foundation grant ${baseKeywords}`,
      `Gulf Coast port development grant foundation ${baseKeywords}`,
      `Texas maritime infrastructure foundation grant`,
    ];

    for (const query of foundationSearches) {
      try {
        const results = await searchBrave(query, { count: 10, freshness });
        grants.push(...extractGrantsFromBraveResults(results, "Brave Search (Foundation)"));
      } catch (err) {
        console.error(`Brave search error for "${query}":`, err);
      }
    }
  }

  // Local government searches
  if (includeLocal) {
    const localSearches = [
      `site:*.gov Brazoria County ${baseKeywords} grant`,
      `site:*.gov Freeport Texas ${baseKeywords} grant opportunity`,
      `site:*.gov Texas coastal county port infrastructure grant`,
    ];

    for (const query of localSearches) {
      try {
        const results = await searchBrave(query, { count: 10, freshness });
        grants.push(...extractGrantsFromBraveResults(results, "Brave Search (Local)"));
      } catch (err) {
        console.error(`Brave search error for "${query}":`, err);
      }
    }
  }

  // Deduplicate by URL
  const uniqueGrants = new Map<string, DiscoveredGrant>();
  for (const grant of grants) {
    const key = grant.applicationUrl || grant.id;
    if (!uniqueGrants.has(key)) {
      uniqueGrants.set(key, grant);
    }
  }

  return Array.from(uniqueGrants.values());
}

/**
 * Extract grant opportunities from Brave Search results
 */
function extractGrantsFromBraveResults(
  results: BraveSearchResponse,
  source: string
): DiscoveredGrant[] {
  const grants: DiscoveredGrant[] = [];

  for (const result of results.web?.results || []) {
    // Filter for grant-related results
    const text = `${result.title} ${result.description}`.toLowerCase();
    if (
      !text.includes("grant") &&
      !text.includes("funding") &&
      !text.includes("opportunity") &&
      !text.includes("nofo")
    ) {
      continue;
    }

    // Extract agency/organization from URL
    const hostname = result.meta_url?.hostname || new URL(result.url).hostname;
    const agency = extractAgencyFromHostname(hostname);

    // Try to extract funding amount from description
    const fundingMatch = result.description.match(/\$[\d,]+(?:\s*(?:million|billion|M|B))?/gi);
    let totalFunding = 0;
    if (fundingMatch) {
      const amountStr = fundingMatch[0].replace(/[$,]/g, "");
      const num = parseFloat(amountStr);
      if (!isNaN(num)) {
        totalFunding = amountStr.toLowerCase().includes("billion") || amountStr.toLowerCase().includes("b")
          ? num * 1_000_000_000
          : amountStr.toLowerCase().includes("million") || amountStr.toLowerCase().includes("m")
            ? num * 1_000_000
            : num;
      }
    }

    // Extract deadline if mentioned
    const deadlineMatch = result.description.match(/(?:deadline|due|closes?)\s+(?:on\s+)?([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})/i);
    const closeDate = deadlineMatch ? deadlineMatch[1] : "";

    grants.push({
      id: `brave-${result.url.replace(/[^a-zA-Z0-9]/g, "").substring(0, 50)}`,
      opportunityNumber: "",
      title: result.title,
      agency: agency,
      agencyCode: extractAgencyCode(agency),
      description: result.description,
      awardFloor: 0,
      awardCeiling: totalFunding > 0 ? totalFunding : 0,
      totalFunding,
      closeDate,
      postDate: new Date().toISOString().split("T")[0], // Use current date as fallback
      status: closeDate ? "posted" : "forecasted",
      applicationUrl: result.url,
      eligibility: [],
      fundingCategories: [],
      fundingInstruments: [],
      costSharing: false,
      alnNumbers: [],
      source,
    });
  }

  return grants;
}

/**
 * Extract agency name from hostname
 */
function extractAgencyFromHostname(hostname: string): string {
  // Remove www. and common TLDs
  let name = hostname.replace(/^www\./, "").replace(/\.(gov|org|edu|com)$/, "");

  // Map common Texas agency domains
  const agencyMap: Record<string, string> = {
    "txdot.gov": "Texas Department of Transportation",
    "glo.texas.gov": "Texas General Land Office",
    "twdb.texas.gov": "Texas Water Development Board",
    "egrants.gov.texas.gov": "Texas Governor's Office",
    "comptroller.texas.gov": "Texas Comptroller",
    "tceq.texas.gov": "Texas Commission on Environmental Quality",
  };

  if (agencyMap[hostname]) {
    return agencyMap[hostname];
  }

  // Format domain name
  const parts = name.split(".");
  if (parts.length > 1) {
    const org = parts[parts.length - 2];
    return org
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * Extract agency code from agency name
 */
function extractAgencyCode(agency: string): string {
  if (agency.includes("Transportation")) return "TXDOT";
  if (agency.includes("Land Office")) return "GLO";
  if (agency.includes("Water Development")) return "TWDB";
  if (agency.includes("Comptroller")) return "TXC";
  if (agency.includes("Environmental")) return "TCEQ";
  return agency
    .split(" ")
    .map((word) => word.substring(0, 2).toUpperCase())
    .join("")
    .substring(0, 10);
}

/**
 * Clear the cache
 */
export function clearBraveSearchCache(): void {
  searchCache.clear();
}
