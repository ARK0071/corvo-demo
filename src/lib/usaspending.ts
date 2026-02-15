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
  limit: number = 25
): Promise<{ results: RecipientCategoryResult[]; totalRecords: number }> {
  const cacheKey = `recipients:${naicsCodes.join(",")}:${limit}`;
  const cached = getCached<{ results: RecipientCategoryResult[]; totalRecords: number }>(cacheKey);
  if (cached) return cached;

  const res = await fetchWithRetry(`${BASE_URL}/search/spending_by_category/recipient/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filters: {
        naics_codes: naicsCodes,
        time_period: [{ start_date: "2020-01-01", end_date: "2026-12-31" }],
        award_type_codes: ["A", "B", "C", "D"],
      },
      limit,
      page: 1,
    }),
  });

  if (!res.ok) {
    throw new Error(`USASpending API returned ${res.status}`);
  }

  const data = await res.json();
  const result = {
    results: (data.results || []) as RecipientCategoryResult[],
    totalRecords: data.page_metadata?.hasNext ? limit * 10 : (data.results || []).length,
  };

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

// ─── High-level Search ───

export interface VendorSearchParams {
  naicsCodes?: string[];
  focusAreas?: string[];
  eligibleActivities?: string[];
  limit?: number;
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

  const limit = params.limit || 25;

  // Step 1: Get top recipients by NAICS
  const { results: recipients, totalRecords } = await searchRecipientsByNaics(codes, limit);

  if (recipients.length === 0) {
    return { vendors: [], totalRecords: 0 };
  }

  // Determine sector from the first NAICS code used
  const primarySector = NAICS_SECTOR_MAP[codes[0]] || "Heavy Civil/Infrastructure";

  // Step 2: Fetch profiles and awards in batches (5 vendors at a time to avoid rate limits)
  const vendors = await runInBatches(recipients, async (recipient) => {
    const [profile, awards] = await Promise.all([
      getRecipientProfile(recipient.recipient_id),
      getRecentAwards(codes!, recipient.name, 5),
    ]);
    return mapRecipientToVendor(recipient, profile, awards, primarySector);
  });

  // Add NAICS descriptions as capabilities to all vendors
  const naicsDescs = codes
    .map((c) => NAICS_DESCRIPTIONS[c])
    .filter(Boolean);
  for (const vendor of vendors) {
    vendor.capabilities = [...naicsDescs, ...vendor.capabilities];
  }

  return { vendors, totalRecords };
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
