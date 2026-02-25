/**
 * Federal Register API Client
 *
 * Provides access to Federal Register documents including NOFOs,
 * rules, and policy changes. Catches new programs BEFORE they hit Grants.gov.
 *
 * API Documentation: https://www.federalregister.gov/api/v1/documents
 */

import type { DiscoveredGrant } from "./grants-gov";

const FEDERAL_REGISTER_BASE_URL = "https://www.federalregister.gov/api/v1/documents";
const CACHE_DURATION_MS = 15 * 60 * 1000; // 15 minutes

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const searchCache = new Map<string, CacheEntry<DiscoveredGrant[]>>();

interface FederalRegisterDocument {
  document_number: string;
  title: string;
  abstract?: string;
  agencies: Array<{ name: string; id: number }>;
  document_type: string;
  publication_date: string;
  html_url: string;
  pdf_url?: string;
  action?: string;
}

interface FederalRegisterResponse {
  count: number;
  results: FederalRegisterDocument[];
  next_page_url?: string;
  previous_page_url?: string;
}

export interface FederalRegisterSearchParams {
  query?: string;
  agencies?: string[]; // e.g., ["DOT", "DHS", "EPA"]
  document_type?: string; // e.g., "NOTICE"
  per_page?: number;
  page?: number;
  order?: "newest" | "oldest" | "relevance";
}

/**
 * Search Federal Register for grant-related documents
 */
export async function searchFederalRegister(
  params: FederalRegisterSearchParams = {}
): Promise<DiscoveredGrant[]> {
  const cacheKey = JSON.stringify(params);
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
    return cached.data;
  }

  const queryParams = new URLSearchParams();

  // Build query string
  // Use the provided query, or default to grant-related terms
  const query = params.query || "port OR maritime OR infrastructure OR transportation OR grant OR funding opportunity OR NOFO";
  queryParams.set("q", query);

  // Filter by document type (NOTICE for NOFOs)
  queryParams.set("per_page", String(params.per_page || 100));
  queryParams.set("page", String(params.page || 1));
  queryParams.set("order", params.order || "newest");

  // Filter by agencies if provided
  if (params.agencies && params.agencies.length > 0) {
    params.agencies.forEach((agency) => {
      queryParams.append("agencies[]", agency);
    });
  }

  // Filter by document type
  if (params.document_type) {
    queryParams.set("type", params.document_type);
  } else {
    // Default to NOTICE for grant opportunities
    queryParams.set("type", "NOTICE");
  }

  try {
    const url = `${FEDERAL_REGISTER_BASE_URL}?${queryParams.toString()}`;
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Federal Register API returned ${response.status}`);
    }

    const data: FederalRegisterResponse = await response.json();

    // Map Federal Register documents to DiscoveredGrant format
    const grants: DiscoveredGrant[] = data.results
      .filter((doc) => {
        // Filter for grant-related documents
        const text = `${doc.title} ${doc.abstract || ""}`.toLowerCase();
        return (
          text.includes("grant") ||
          text.includes("funding") ||
          text.includes("nofo") ||
          text.includes("opportunity")
        );
      })
      .map((doc) => {
        // Extract agency name
        const agencyName = doc.agencies.length > 0 ? doc.agencies[0].name : "Federal Government";
        const agencyCode = agencyName
          .replace(/Department of /, "")
          .replace(/ /g, "")
          .substring(0, 10)
          .toUpperCase();

        // Try to extract funding amounts from abstract
        const abstract = doc.abstract || doc.title;
        const fundingMatch = abstract.match(/\$[\d,]+(?:\s*(?:million|billion|M|B))?/gi);
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

        return {
          id: `fr-${doc.document_number}`,
          opportunityNumber: doc.document_number,
          title: doc.title,
          agency: agencyName,
          agencyCode,
          description: doc.abstract || doc.title,
          awardFloor: 0,
          awardCeiling: totalFunding > 0 ? totalFunding : 0,
          totalFunding,
          closeDate: "", // Federal Register doesn't have deadlines
          postDate: doc.publication_date,
          status: "posted",
          applicationUrl: doc.html_url,
          eligibility: [],
          fundingCategories: [],
          fundingInstruments: [],
          costSharing: false,
          alnNumbers: [],
          source: "Federal Register",
        };
      });

    searchCache.set(cacheKey, { data: grants, timestamp: Date.now() });
    return grants;
  } catch (error) {
    console.error("Federal Register API error:", error);
    throw error;
  }
}

/**
 * Clear the cache
 */
export function clearFederalRegisterCache(): void {
  searchCache.clear();
}
