/**
 * Tavily Search API Client
 *
 * AI-powered research search API designed for finding specific information.
 * Excellent for deep research on grant programs and extracting structured data.
 */

import type { DiscoveredGrant } from "./grants-gov";

const TAVILY_BASE_URL = "https://api.tavily.com/search";
const CACHE_DURATION_MS = 4 * 60 * 60 * 1000; // 4 hours

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const searchCache = new Map<string, CacheEntry<TavilySearchResponse>>();

interface TavilySearchResponse {
  query: string;
  response_time: number;
  results: Array<{
    title: string;
    url: string;
    content: string;
    score: number;
    published_date?: string;
  }>;
  images?: string[];
  answer?: string;
  query_context?: Record<string, any>;
}

/**
 * Search Tavily API
 */
export async function searchTavily(
  query: string,
  params: {
    search_depth?: "basic" | "advanced";
    include_answer?: boolean;
    include_images?: boolean;
    include_raw_content?: boolean;
    max_results?: number;
    include_domains?: string[];
    exclude_domains?: string[];
  } = {}
): Promise<TavilySearchResponse> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error("TAVILY_API_KEY is not configured. Add it to .env.local.");
  }

  const cacheKey = JSON.stringify({ query, params });
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
    return cached.data;
  }

  try {
    const response = await fetch(TAVILY_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: params.search_depth || "basic",
        include_answer: params.include_answer || false,
        include_images: params.include_images || false,
        include_raw_content: params.include_raw_content || false,
        max_results: params.max_results || 10,
        include_domains: params.include_domains,
        exclude_domains: params.exclude_domains,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Tavily API returned ${response.status}: ${errorText}`);
    }

    const data: TavilySearchResponse = await response.json();
    searchCache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  } catch (error) {
    console.error("Tavily API error:", error);
    throw error;
  }
}

/**
 * Search for Texas-specific grants using Tavily
 */
export async function searchTexasGrantsTavily(
  keywords: string[] = [],
  options: {
    focusAreas?: string[];
    maxResults?: number;
  } = {}
): Promise<DiscoveredGrant[]> {
  const { focusAreas = [], maxResults = 20 } = options;
  const baseKeywords = keywords.length > 0 ? keywords.join(" ") : "port maritime infrastructure";

  const grants: DiscoveredGrant[] = [];

  // Research queries for Texas grants
  const researchQueries = [
    `Texas port infrastructure grant programs 2024 2025`,
    `Gulf Coast Texas maritime infrastructure funding opportunities`,
    `Texas state grants for port development and terminal expansion`,
    `Texas coastal port resilience grants hurricane protection`,
    `Texas port security grants beyond PSGP state funding`,
  ];

  // Add focus area specific queries
  for (const area of focusAreas) {
    researchQueries.push(
      `Texas port ${area} grant funding opportunity`,
      `Gulf Coast ${area} infrastructure grant Texas`
    );
  }

  for (const query of researchQueries.slice(0, 5)) {
    try {
      const results = await searchTavily(query, {
        search_depth: "advanced",
        include_answer: true,
        max_results: maxResults,
        include_domains: ["txdot.gov", "glo.texas.gov", "twdb.texas.gov", "egrants.gov.texas.gov"],
      });

      grants.push(...extractGrantsFromTavilyResults(results, "Tavily Search"));
    } catch (err) {
      console.error(`Tavily search error for "${query}":`, err);
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
 * Extract grant opportunities from Tavily results
 */
function extractGrantsFromTavilyResults(
  results: TavilySearchResponse,
  source: string
): DiscoveredGrant[] {
  const grants: DiscoveredGrant[] = [];

  for (const result of results.results || []) {
    // Filter for grant-related results
    const text = `${result.title} ${result.content}`.toLowerCase();
    if (
      !text.includes("grant") &&
      !text.includes("funding") &&
      !text.includes("opportunity") &&
      !text.includes("nofo") &&
      !text.includes("program")
    ) {
      continue;
    }

    // Extract agency/organization from URL
    const hostname = new URL(result.url).hostname;
    const agency = extractAgencyFromHostname(hostname);

    // Try to extract funding amount
    const fundingMatch = result.content.match(/\$[\d,]+(?:\s*(?:million|billion|M|B))?/gi);
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

    // Extract deadline
    const deadlineMatch = result.content.match(/(?:deadline|due|closes?|application\s+deadline)\s+(?:on\s+)?([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})/i);
    const closeDate = deadlineMatch ? deadlineMatch[1] : "";

    // Extract eligibility
    const eligibility: string[] = [];
    const eligibilityMatch = result.content.match(/(?:eligible|eligibility)[\s:]+([^.]+)/i);
    if (eligibilityMatch) {
      const eligibleText = eligibilityMatch[1];
      if (eligibleText.includes("port")) eligibility.push("Port Authorities");
      if (eligibleText.includes("local")) eligibility.push("Local Governments");
      if (eligibleText.includes("state")) eligibility.push("State Governments");
    }

    grants.push({
      id: `tavily-${result.url.replace(/[^a-zA-Z0-9]/g, "").substring(0, 50)}`,
      opportunityNumber: "",
      title: result.title,
      agency: agency,
      agencyCode: extractAgencyCode(agency),
      description: result.content.substring(0, 500), // Limit description length
      awardFloor: 0,
      awardCeiling: totalFunding > 0 ? totalFunding : 0,
      totalFunding,
      closeDate,
      postDate: result.published_date || new Date().toISOString().split("T")[0],
      status: closeDate ? "posted" : "forecasted",
      applicationUrl: result.url,
      eligibility,
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

  let name = hostname.replace(/^www\./, "").replace(/\.(gov|org|edu|com)$/, "");
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
export function clearTavilySearchCache(): void {
  searchCache.clear();
}
