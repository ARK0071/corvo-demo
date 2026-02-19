import type { PortVendor } from "@/data/port-vendors";
import { NAICS_SECTOR_MAP, NAICS_DESCRIPTIONS, PORT_NAICS_CODES, FOCUS_TO_NAICS } from "./naics";

// ─── USASpending.gov API Client ───

const BASE_URL = "https://api.usaspending.gov/api/v2";

// ─── Business Type Mapping ───

const BUSINESS_TYPE_TO_CERT: Record<string, string> = {
  small_business: "SDB",
  woman_owned_business: "WBE",
  veteran_owned_business: "Veteran Owned",
  service_disabled_veteran_owned_business: "SDVOSB",
  "8a_program_participant": "DBE",
  hubzone_firm: "HUBZone",
  minority_owned_business: "MBE",
  economically_disadvantaged: "DBE",
  self_certified_small_disadvantaged_business: "SDB",
  women_owned_small_business: "WOSB",
};

const BUSINESS_TYPE_TO_DBE: Record<string, string> = {
  "8a_program_participant": "DBE",
  service_disabled_veteran_owned_business: "SDVOSB",
  hubzone_firm: "HUBZone",
  minority_owned_business: "MBE",
  woman_owned_business: "WBE",
  economically_disadvantaged: "DBE",
  self_certified_small_disadvantaged_business: "SDB",
};

function mapCertifications(businessTypes: string[]): string[] {
  const certs = new Set<string>();
  for (const bt of businessTypes) {
    const cert = BUSINESS_TYPE_TO_CERT[bt];
    if (cert) certs.add(cert);
  }
  return [...certs];
}

function mapDisadvantagedBusiness(businessTypes: string[]): string | null {
  for (const bt of businessTypes) {
    const dbe = BUSINESS_TYPE_TO_DBE[bt];
    if (dbe) return dbe;
  }
  return null;
}

// ─── Response Types ───

interface RecipientCategoryResult {
  amount: number;
  recipient_id: string;
  name: string;
  code: string;
  uei: string;
  total_outlays: number | null;
}

interface RecipientProfile {
  name: string;
  alternate_names: string[];
  duns: string;
  uei: string;
  recipient_id: string;
  recipient_level: string;
  parent_id: string | null;
  parent_name: string | null;
  parent_uei: string | null;
  business_types: string[];
  location: {
    address_line1: string | null;
    city_name: string;
    state_code: string | null;
    zip: string | null;
    country_name: string;
    country_code: string;
  };
  total_transaction_amount: number;
  total_transactions: number;
}

interface AwardResult {
  internal_id: number;
  "Award ID": string;
  "Recipient Name": string;
  "Award Amount": number;
  "Awarding Agency": string;
  "Place of Performance State Code": string;
  "Start Date": string;
  Description: string;
  generated_internal_id: string;
}

// ─── Cache ───

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hours — USASpending data changes slowly

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache(key: string, data: unknown): void {
  cache.set(key, { data, timestamp: Date.now() });
}

// ─── Concurrency Control ───

const CONCURRENCY_LIMIT = 5; // Max parallel requests to USASpending
const REQUEST_DELAY_MS = 200; // Delay between batches

async function runInBatches<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  batchSize: number = CONCURRENCY_LIMIT
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
    // Small delay between batches to avoid rate limits
    if (i + batchSize < items.length) {
      await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY_MS));
    }
  }
  return results;
}

// ─── Fetch with Retry (handles 429 rate limits) ───

async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  maxRetries: number = 3
): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(url, init);
    if (res.status === 429 && attempt < maxRetries) {
      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
      continue;
    }
    return res;
  }
  // Should never reach here, but satisfy TypeScript
  return fetch(url, init);
}

// ─── API Functions ───

export async function searchRecipientsByNaics(
  naicsCodes: string[],
  limit: number = 25,
  maxPages: number = 1
): Promise<{ results: RecipientCategoryResult[]; totalRecords: number }> {
  const cacheKey = `recipients:${naicsCodes.join(",")}:${limit}:${maxPages}`;
  const cached = getCached<{ results: RecipientCategoryResult[]; totalRecords: number }>(cacheKey);
  if (cached) return cached;

  const perPage = Math.min(limit, 100); // USASpending max per page is 100
  const allResults: RecipientCategoryResult[] = [];
  let totalRecords = 0;

  for (let page = 1; page <= maxPages; page++) {
    const res = await fetchWithRetry(`${BASE_URL}/search/spending_by_category/recipient/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filters: {
          naics_codes: naicsCodes,
          time_period: [{ start_date: "2020-01-01", end_date: "2026-12-31" }],
          award_type_codes: ["A", "B", "C", "D"],
        },
        limit: perPage,
        page,
      }),
    });

    if (!res.ok) {
      throw new Error(`USASpending API returned ${res.status}`);
    }

    const data = await res.json();
    const pageResults = (data.results || []) as RecipientCategoryResult[];
    allResults.push(...pageResults);

    if (page === 1) {
      totalRecords = data.page_metadata?.total ?? (data.page_metadata?.hasNext ? perPage * 100 : pageResults.length);
    }

    // Stop if no more results
    if (pageResults.length < perPage || !data.page_metadata?.hasNext) break;

    // Small delay between pages
    if (page < maxPages) {
      await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY_MS));
    }
  }

  const result = { results: allResults, totalRecords };
  setCache(cacheKey, result);
  return result;
}

export async function getRecipientProfile(recipientId: string): Promise<RecipientProfile | null> {
  const cacheKey = `profile:${recipientId}`;
  const cached = getCached<RecipientProfile>(cacheKey);
  if (cached) return cached;

  const res = await fetchWithRetry(`${BASE_URL}/recipient/${recipientId}/`, {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) return null;

  const profile = (await res.json()) as RecipientProfile;
  setCache(cacheKey, profile);
  return profile;
}

export async function getRecentAwards(
  naicsCodes: string[],
  recipientName: string,
  limit: number = 5
): Promise<AwardResult[]> {
  const cacheKey = `awards:${recipientName}:${naicsCodes.join(",")}`;
  const cached = getCached<AwardResult[]>(cacheKey);
  if (cached) return cached;

  const res = await fetchWithRetry(`${BASE_URL}/search/spending_by_award/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filters: {
        naics_codes: naicsCodes,
        recipient_search_text: [recipientName],
        time_period: [{ start_date: "2020-01-01", end_date: "2026-12-31" }],
        award_type_codes: ["A", "B", "C", "D"],
      },
      fields: [
        "Award ID",
        "Recipient Name",
        "Award Amount",
        "Awarding Agency",
        "Place of Performance State Code",
        "Start Date",
        "Description",
      ],
      limit,
      page: 1,
      sort: "Award Amount",
      order: "desc",
    }),
  });

  if (!res.ok) return [];

  const data = await res.json();
  const awards = (data.results || []) as AwardResult[];
  setCache(cacheKey, awards);
  return awards;
}

// ─── Mapping: USASpending → PortVendor ───

function mapAwardsToProjects(awards: AwardResult[]): PortVendor["pastPortProjects"] {
  return awards
    .filter((a) => a["Award Amount"] > 0)
    .slice(0, 5)
    .map((a) => ({
      name: (a.Description || a["Award ID"] || "Federal Contract").slice(0, 100),
      port: a["Awarding Agency"] || "Federal",
      value: a["Award Amount"],
      year: a["Start Date"] ? parseInt(a["Start Date"].slice(0, 4)) : 2024,
    }));
}

export function mapRecipientToVendor(
  recipient: RecipientCategoryResult,
  profile: RecipientProfile | null,
  awards: AwardResult[],
  sector: string
): PortVendor {
  const businessTypes = profile?.business_types || [];
  const certifications = mapCertifications(businessTypes);
  const disadvantagedBusiness = mapDisadvantagedBusiness(businessTypes);

  const city = profile?.location?.city_name || "Unknown";
  const state = profile?.location?.state_code || "";
  const headquarters = state ? `${city}, ${state}` : city;

  // Build capabilities from the NAICS descriptions
  const capabilities: string[] = [];
  // Add sector as a capability
  if (sector !== "Other") capabilities.push(sector);
  // Add mapped business type info as capabilities
  for (const bt of businessTypes) {
    if (bt === "us_owned_business") capabilities.push("US-Owned Business");
    else if (bt === "corporate_entity_not_tax_exempt") capabilities.push("Corporate Entity");
    else if (bt === "limited_liability_corporation") capabilities.push("LLC");
  }

  const pastPortProjects = mapAwardsToProjects(awards);

  const totalAwards = profile?.total_transaction_amount || recipient.amount || 0;
  const totalTransactions = profile?.total_transactions || 0;

  const description = profile
    ? `${profile.name} — ${headquarters}. Total federal awards: $${(totalAwards / 1_000_000).toFixed(1)}M across ${totalTransactions} transactions.${profile.parent_name ? ` Subsidiary of ${profile.parent_name}.` : ""}`
    : `${recipient.name} — Federal contractor with $${(recipient.amount / 1_000_000).toFixed(1)}M in awards.`;

  return {
    id: recipient.uei || recipient.recipient_id,
    name: recipient.name,
    sector,
    headquarters,
    annualRevenue: totalAwards,
    employeeCount: 0,
    capabilities,
    certifications,
    pastPortProjects,
    bondingCapacity: totalAwards > 100_000_000 ? 100_000_000 : totalAwards > 10_000_000 ? 50_000_000 : 0,
    safetyRecord: 0.8,
    disadvantagedBusiness,
    keyPersonnel: [],
    description,
  };
}

// ─── Award-based Vendor Search (broader coverage) ───

interface AwardSearchResult {
  internal_id: number;
  "Award ID": string;
  "Recipient Name": string;
  "Recipient UEI": string;
  "Award Amount": number;
  "Awarding Agency": string;
  "Awarding Sub Agency": string;
  "Place of Performance State Code": string;
  "Place of Performance City Code": string;
  "Start Date": string;
  "NAICS Code": string;
  Description: string;
  "Recipient State Code": string;
  "Recipient Address Line 1": string;
  generated_internal_id: string;
}

export async function searchAwardVendors(params: {
  naicsCodes?: string[];
  state?: string;
  query?: string;
  maxPages?: number;
  size?: number;
}): Promise<{ vendors: PortVendor[]; totalRecords: number }> {
  const { naicsCodes, state, query, maxPages = 5, size = 100 } = params;

  const cacheKey = `award-vendors:${JSON.stringify(params)}`;
  const cached = getCached<{ vendors: PortVendor[]; totalRecords: number }>(cacheKey);
  if (cached) return cached;

  // Build filters
  const filters: Record<string, unknown> = {
    time_period: [{ start_date: "2019-01-01", end_date: "2026-12-31" }],
    award_type_codes: ["A", "B", "C", "D"], // Contracts only
  };

  if (naicsCodes && naicsCodes.length > 0) {
    filters.naics_codes = naicsCodes;
  }
  if (state) {
    filters.recipient_locations = [{ country: "USA", state: state }];
  }
  if (query) {
    filters.recipient_search_text = [query];
  }

  const vendorMap = new Map<string, {
    name: string;
    uei: string;
    totalAmount: number;
    awardCount: number;
    state: string;
    naicsCodes: Set<string>;
    agencies: Set<string>;
    awards: AwardSearchResult[];
  }>();

  let totalRecords = 0;

  for (let page = 1; page <= maxPages; page++) {
    const res = await fetchWithRetry(`${BASE_URL}/search/spending_by_award/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filters,
        fields: [
          "Award ID",
          "Recipient Name",
          "Recipient UEI",
          "Award Amount",
          "Awarding Agency",
          "Awarding Sub Agency",
          "Place of Performance State Code",
          "Start Date",
          "NAICS Code",
          "Description",
          "Recipient State Code",
        ],
        limit: size,
        page,
        sort: "Award Amount",
        order: "desc",
      }),
    });

    if (!res.ok) {
      if (page === 1) throw new Error(`USASpending API returned ${res.status}`);
      break;
    }

    const data = await res.json();
    const awards = (data.results || []) as AwardSearchResult[];

    if (page === 1) {
      totalRecords = data.page_metadata?.total ?? 0;
    }

    // Aggregate awards by recipient
    for (const award of awards) {
      const key = award["Recipient UEI"] || award["Recipient Name"];
      if (!key) continue;

      const existing = vendorMap.get(key);
      if (existing) {
        existing.totalAmount += award["Award Amount"] || 0;
        existing.awardCount++;
        if (award["NAICS Code"]) existing.naicsCodes.add(award["NAICS Code"]);
        if (award["Awarding Agency"]) existing.agencies.add(award["Awarding Agency"]);
        if (existing.awards.length < 5) existing.awards.push(award);
      } else {
        vendorMap.set(key, {
          name: award["Recipient Name"],
          uei: award["Recipient UEI"] || key,
          totalAmount: award["Award Amount"] || 0,
          awardCount: 1,
          state: award["Recipient State Code"] || award["Place of Performance State Code"] || "",
          naicsCodes: new Set(award["NAICS Code"] ? [award["NAICS Code"]] : []),
          agencies: new Set(award["Awarding Agency"] ? [award["Awarding Agency"]] : []),
          awards: [award],
        });
      }
    }

    if (awards.length < size || !data.page_metadata?.hasNext) break;

    if (page < maxPages) {
      await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY_MS));
    }
  }

  // Convert aggregated data to PortVendor[]
  const vendors: PortVendor[] = [];
  for (const [, v] of vendorMap) {
    // Determine sector from NAICS codes
    let sector = "Other";
    for (const code of v.naicsCodes) {
      if (NAICS_SECTOR_MAP[code]) {
        sector = NAICS_SECTOR_MAP[code];
        break;
      }
    }

    const capabilities: string[] = [];
    for (const code of v.naicsCodes) {
      if (NAICS_DESCRIPTIONS[code]) capabilities.push(NAICS_DESCRIPTIONS[code]);
    }

    const pastPortProjects = v.awards
      .filter((a) => a["Award Amount"] > 0)
      .slice(0, 5)
      .map((a) => ({
        name: (a.Description || a["Award ID"] || "Federal Contract").slice(0, 100),
        port: a["Awarding Agency"] || "Federal",
        value: a["Award Amount"],
        year: a["Start Date"] ? parseInt(a["Start Date"].slice(0, 4)) : 2024,
      }));

    const headquarters = v.state ? `${v.state}` : "USA";
    const agencyList = [...v.agencies].slice(0, 3).join(", ");

    vendors.push({
      id: v.uei,
      name: v.name,
      sector,
      headquarters,
      annualRevenue: v.totalAmount,
      employeeCount: 0,
      capabilities,
      certifications: [],
      pastPortProjects,
      bondingCapacity: v.totalAmount > 100_000_000 ? 100_000_000 : v.totalAmount > 10_000_000 ? 50_000_000 : 0,
      safetyRecord: 0.8,
      disadvantagedBusiness: null,
      keyPersonnel: [],
      description: `${v.name} — ${headquarters}. ${v.awardCount} federal contract${v.awardCount !== 1 ? "s" : ""} totaling $${(v.totalAmount / 1_000_000).toFixed(1)}M.${agencyList ? ` Agencies: ${agencyList}.` : ""}`,
    });
  }

  const result = { vendors, totalRecords };
  setCache(cacheKey, result);
  return result;
}

// ─── High-level Search ───

export interface VendorSearchParams {
  naicsCodes?: string[];
  focusAreas?: string[];
  eligibleActivities?: string[];
  limit?: number;
  maxPages?: number;
  state?: string;
  query?: string;
  source?: "recipients" | "awards" | "both";
}

export async function searchVendors(
  params: VendorSearchParams
): Promise<{ vendors: PortVendor[]; totalRecords: number }> {
  // Derive NAICS codes from grant focus areas if not provided
  let codes = params.naicsCodes;
  if (!codes && params.focusAreas && params.eligibleActivities) {
    codes = deriveNaicsFromGrant(params.focusAreas, params.eligibleActivities);
  }
  if (!codes || codes.length === 0) {
    codes = PORT_NAICS_CODES;
  }

  const limit = params.limit || 100;
  const maxPages = params.maxPages || 1;
  const source = params.source || "both";

  const promises: Promise<{ vendors: PortVendor[]; totalRecords: number }>[] = [];

  // Source 1: Top recipients by spending category (current approach)
  if (source === "recipients" || source === "both") {
    promises.push(
      (async () => {
        const { results: recipients, totalRecords } = await searchRecipientsByNaics(codes!, limit, maxPages);
        if (recipients.length === 0) return { vendors: [], totalRecords: 0 };

        const primarySector = NAICS_SECTOR_MAP[codes![0]] || "Heavy Civil/Infrastructure";
        const HYDRATE_THRESHOLD = 50;
        let vendors: PortVendor[];

        if (recipients.length <= HYDRATE_THRESHOLD) {
          vendors = await runInBatches(recipients, async (recipient) => {
            const [profile, awards] = await Promise.all([
              getRecipientProfile(recipient.recipient_id),
              getRecentAwards(codes!, recipient.name, 5),
            ]);
            return mapRecipientToVendor(recipient, profile, awards, primarySector);
          });
        } else {
          vendors = recipients.map((recipient) =>
            mapRecipientToVendor(recipient, null, [], primarySector)
          );
        }

        const naicsDescs = codes!.map((c) => NAICS_DESCRIPTIONS[c]).filter(Boolean);
        for (const vendor of vendors) {
          vendor.capabilities = [...naicsDescs, ...vendor.capabilities];
        }

        return { vendors, totalRecords };
      })()
    );
  }

  // Source 2: Award-based search (much broader vendor coverage)
  if (source === "awards" || source === "both") {
    promises.push(
      searchAwardVendors({
        naicsCodes: codes,
        state: params.state,
        query: params.query,
        maxPages,
        size: 100,
      })
    );
  }

  const results = await Promise.all(promises);

  // Merge all vendors
  let allVendors: PortVendor[] = [];
  let totalRecords = 0;
  for (const result of results) {
    allVendors.push(...result.vendors);
    totalRecords += result.totalRecords;
  }

  // Deduplicate by ID (UEI), keeping the one with more data
  const seen = new Map<string, PortVendor>();
  for (const v of allVendors) {
    const existing = seen.get(v.id);
    if (!existing || v.pastPortProjects.length > existing.pastPortProjects.length) {
      seen.set(v.id, v);
    }
  }

  return { vendors: [...seen.values()], totalRecords };
}

// ─── NAICS Derivation (reuse from sam-gov) ───

export function deriveNaicsFromGrant(focusAreas: string[], eligibleActivities: string[]): string[] {
  const codes = new Set<string>();
  const allText = [...focusAreas, ...eligibleActivities].map((t) => t.toLowerCase());

  for (const text of allText) {
    for (const [keyword, naicsCodes] of Object.entries(FOCUS_TO_NAICS)) {
      if (text.includes(keyword)) {
        for (const code of naicsCodes) {
          codes.add(code);
        }
      }
    }
  }

  if (codes.size === 0) {
    return PORT_NAICS_CODES;
  }

  return [...codes];
}
