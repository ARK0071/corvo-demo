import type { PortVendor } from "@/data/port-vendors";
export { NAICS_SECTOR_MAP, PORT_NAICS_CODES, FOCUS_TO_NAICS } from "./naics";
import { NAICS_SECTOR_MAP, FOCUS_TO_NAICS, PORT_NAICS_CODES } from "./naics";

// ─── GovCon API Client ───

const GOVCON_BASE_URL = "https://govconapi.com/api/v1";
const GOVCON_OPPORTUNITIES_URL = `${GOVCON_BASE_URL}/opportunities/search`;

// ─── GovCon Response Types ───

interface GovConEntityRegistration {
  registered: boolean;
  uei: string;
  cageCode: string | null;
  legalBusinessName: string;
  dbaName: string | null;
  registrationStatus: string;
  registrationDate: string;
  lastUpdateDate: string;
  registrationExpirationDate: string;
  activationDate: string;
  exclusionStatus: string | null;
}

interface GovConAddress {
  addressLine1: string | null;
  addressLine2: string | null;
  city: string;
  stateOrProvinceCode: string | null;
  zipCode: string | null;
  countryCode: string;
}

interface GovConBusinessType {
  businessTypeCode: string;
  businessTypeDescription: string;
}

interface GovConSbaBusinessType {
  sbaBusinessTypeCode: string;
  sbaBusinessTypeDesc: string;
  certificationEntryDate: string;
  certificationExitDate: string | null;
}

interface GovConNaics {
  naicsCode: string;
  naicsDescription: string;
  sbaSmallBusiness: string | null;
}

interface GovConPsc {
  pscCode: string;
  pscDescription: string;
}

interface GovConEntity {
  entityRegistration: GovConEntityRegistration;
  coreData?: {
    physicalAddress?: GovConAddress;
    mailingAddress?: GovConAddress;
    businessTypes?: {
      businessTypeList?: GovConBusinessType[];
      sbaBusinessTypeList?: GovConSbaBusinessType[];
    };
    generalInformation?: {
      entityStructureDesc?: string;
    };
  };
  assertions?: {
    goodsAndServices?: {
      primaryNaics?: string;
      naicsList?: GovConNaics[];
      pscList?: GovConPsc[];
    };
    disasterReliefData?: {
      bondingFlag?: string;
    };
  };
}

interface GovConApiResponse {
  totalRecords: number;
  entityData: GovConEntity[];
  links?: {
    selfLink?: string;
    nextLink?: string;
  };
}

// ─── Cache ───

interface CacheEntry {
  data: PortVendor[];
  timestamp: number;
  totalRecords: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

function getCacheKey(params: Record<string, string | undefined>): string {
  return JSON.stringify(params);
}

function getCached(key: string): CacheEntry | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry;
}

// ─── Business Type Mapping ───

const BUSINESS_TYPE_TO_CERT: Record<string, string> = {
  "27": "SDB",
  "23": "MBE",
  A2: "WBE",
  "8W": "WOSB",
  QF: "SDVOSB",
  A5: "Veteran Owned",
  A8: "Non-Profit",
};

const SBA_TYPE_TO_CERT: Record<string, string> = {
  "8(a)": "DBE",
  HUBZone: "HUBZone",
  WOSB: "WBE",
  EDWOSB: "WBE",
  SDVOSB: "SDVOSB",
};

function mapDisadvantagedBusiness(
  businessTypes?: GovConBusinessType[],
  sbaTypes?: GovConSbaBusinessType[]
): string | null {
  // Check SBA certifications first (more authoritative)
  if (sbaTypes) {
    for (const sba of sbaTypes) {
      const desc = sba.sbaBusinessTypeDesc.toLowerCase();
      if (desc.includes("8(a)")) return "DBE";
      if (desc.includes("sdvosb") || desc.includes("service-disabled")) return "SDVOSB";
      if (desc.includes("hubzone")) return "HUBZone";
      if (desc.includes("wosb") || desc.includes("woman")) return "WBE";
    }
  }
  // Fall back to self-certified business types
  if (businessTypes) {
    for (const bt of businessTypes) {
      if (bt.businessTypeCode === "27") return "SDB";
      if (bt.businessTypeCode === "23") return "MBE";
      if (bt.businessTypeCode === "A2" || bt.businessTypeCode === "8W") return "WBE";
      if (bt.businessTypeCode === "QF") return "SDVOSB";
    }
  }
  return null;
}

function mapCertifications(
  businessTypes?: GovConBusinessType[],
  sbaTypes?: GovConSbaBusinessType[]
): string[] {
  const certs: Set<string> = new Set();
  if (businessTypes) {
    for (const bt of businessTypes) {
      const cert = BUSINESS_TYPE_TO_CERT[bt.businessTypeCode];
      if (cert) certs.add(cert);
    }
  }
  if (sbaTypes) {
    for (const sba of sbaTypes) {
      for (const [key, cert] of Object.entries(SBA_TYPE_TO_CERT)) {
        if (sba.sbaBusinessTypeDesc.toLowerCase().includes(key.toLowerCase())) {
          certs.add(cert);
        }
      }
    }
  }
  return [...certs];
}

// ─── Entity → PortVendor Mapping ───

export function mapGovConEntityToVendor(entity: GovConEntity): PortVendor {
  const reg = entity.entityRegistration;
  const core = entity.coreData;
  const assertions = entity.assertions;

  const addr = core?.physicalAddress;
  const city = addr?.city || "Unknown";
  const state = addr?.stateOrProvinceCode || "";
  const headquarters = state ? `${city}, ${state}` : city;

  // Determine sector from primary NAICS
  const primaryNaics = assertions?.goodsAndServices?.primaryNaics || "";
  const sector = NAICS_SECTOR_MAP[primaryNaics] || "Other";

  // Build capabilities from NAICS + PSC descriptions
  const capabilities: string[] = [];
  if (assertions?.goodsAndServices?.naicsList) {
    for (const n of assertions.goodsAndServices.naicsList) {
      capabilities.push(n.naicsDescription);
    }
  }
  if (assertions?.goodsAndServices?.pscList) {
    for (const p of assertions.goodsAndServices.pscList) {
      capabilities.push(p.pscDescription);
    }
  }

  const businessTypes = core?.businessTypes?.businessTypeList;
  const sbaTypes = core?.businessTypes?.sbaBusinessTypeList;

  const certifications = mapCertifications(businessTypes, sbaTypes);
  const disadvantagedBusiness = mapDisadvantagedBusiness(businessTypes, sbaTypes);

  // Bonding flag from disaster relief data
  const hasBonding = assertions?.disasterReliefData?.bondingFlag === "Y";
  const bondingCapacity = hasBonding ? 50_000_000 : 0; // placeholder

  // Build description from NAICS descriptions
  const naicsDescs = assertions?.goodsAndServices?.naicsList?.map((n) => n.naicsDescription) || [];
  const description = naicsDescs.length > 0
    ? `${reg.legalBusinessName} specializes in ${naicsDescs.slice(0, 3).join(", ")}. Registered in GovCon (UEI: ${reg.uei}).`
    : `${reg.legalBusinessName} - GovCon registered entity (UEI: ${reg.uei}).`;

  return {
    id: reg.uei,
    name: reg.dbaName || reg.legalBusinessName,
    sector,
    headquarters,
    annualRevenue: 0,
    employeeCount: 0,
    capabilities,
    certifications,
    pastPortProjects: [],
    bondingCapacity,
    safetyRecord: 0.8,
    disadvantagedBusiness,
    keyPersonnel: [],
    description,
  };
}

// ─── Vendor Search via Award Notices ───

export interface GovConSearchParams {
  naicsCodes?: string[];
  state?: string;
  query?: string;
  page?: number;
  size?: number;
}

/**
 * Search for vendors by finding Award Notice records via /opportunities/search.
 * Extracts vendor info (awardee_name, state, naics, award_amount) from awards.
 */
export async function searchGovConEntities(
  params: GovConSearchParams
): Promise<{ vendors: PortVendor[]; totalRecords: number }> {
  const apiKey = process.env.GOVCON_API_KEY;
  if (!apiKey) {
    throw new Error("GOVCON_API_KEY is not configured. Add it to .env.local.");
  }

  const qp = new URLSearchParams();
  qp.set("notice_type", "Award Notice");
  qp.set("limit", String(Math.min(params.size || 50, 50)));

  if (params.page && params.page > 0) {
    qp.set("offset", String(params.page * (params.size || 50)));
  }

  const keywords = params.query || "port maritime infrastructure";
  qp.set("keywords", keywords);

  if (params.state) {
    qp.set("state", params.state);
  }

  const cacheKey = getCacheKey(Object.fromEntries(qp.entries()));
  const cached = getCached(cacheKey);
  if (cached) {
    return { vendors: cached.data, totalRecords: cached.totalRecords };
  }

  const url = `${GOVCON_OPPORTUNITIES_URL}?${qp.toString()}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    const errorMsg = errorBody?.error?.message || `GovCon API returned ${res.status}`;
    throw new Error(errorMsg);
  }

  const data: GovConOpportunitiesResponse = await res.json();
  const awards = data.data || [];

  // Aggregate awards by awardee to build vendor list
  const vendorMap = new Map<string, {
    name: string;
    totalAmount: number;
    awardCount: number;
    state: string;
    naics: Set<string>;
    agencies: Set<string>;
    titles: string[];
  }>();

  for (const award of awards) {
    const name = award.awardee_name;
    if (!name) continue;

    const key = name.toLowerCase().trim();
    const existing = vendorMap.get(key);
    if (existing) {
      existing.totalAmount += award.award_amount || 0;
      existing.awardCount++;
      if (award.naics) award.naics.forEach((n) => existing.naics.add(n));
      if (award.agency) existing.agencies.add(award.agency);
      if (existing.titles.length < 5) existing.titles.push(award.title);
    } else {
      vendorMap.set(key, {
        name,
        totalAmount: award.award_amount || 0,
        awardCount: 1,
        state: award.performance_state_code || "",
        naics: new Set(award.naics || []),
        agencies: new Set(award.agency ? [award.agency] : []),
        titles: [award.title],
      });
    }
  }

  const vendors: PortVendor[] = [...vendorMap.values()].map((v) => {
    let sector = "Other";
    for (const code of v.naics) {
      if (NAICS_SECTOR_MAP[code]) { sector = NAICS_SECTOR_MAP[code]; break; }
    }
    const headquarters = v.state || "USA";
    const agencyList = [...v.agencies].slice(0, 3).join(", ");
    const pastProjects = v.titles.slice(0, 5).map((t, i) => ({
      name: t.slice(0, 100),
      port: [...v.agencies][0] || "Federal",
      value: v.totalAmount / v.awardCount,
      year: new Date().getFullYear(),
    }));

    return {
      id: v.name.replace(/[^a-zA-Z0-9]/g, "-").slice(0, 40),
      name: v.name,
      sector,
      headquarters,
      annualRevenue: v.totalAmount,
      employeeCount: 0,
      capabilities: [...v.naics].map((c) => NAICS_SECTOR_MAP[c] || c),
      certifications: [],
      pastPortProjects: pastProjects,
      bondingCapacity: v.totalAmount > 100_000_000 ? 100_000_000 : v.totalAmount > 10_000_000 ? 50_000_000 : 0,
      safetyRecord: 0.8,
      disadvantagedBusiness: null,
      keyPersonnel: [],
      description: `${v.name} - ${headquarters}. ${v.awardCount} federal award${v.awardCount !== 1 ? "s" : ""} totaling $${(v.totalAmount / 1_000_000).toFixed(1)}M.${agencyList ? ` Agencies: ${agencyList}.` : ""}`,
    };
  });

  cache.set(cacheKey, { data: vendors, timestamp: Date.now(), totalRecords: data.pagination?.total || 0 });

  return { vendors, totalRecords: data.pagination?.total || 0 };
}

// ─── GovCon Opportunities API ───
// Docs: https://govconapi.com - GET /api/v1/opportunities/search

export interface GovConOpportunity {
  notice_id: string;
  title: string;
  solicitation_number?: string;
  agency: string;
  posted_date: string;
  response_deadline?: string;
  naics?: string[];
  psc?: string;
  set_aside_type?: string;
  notice_type?: string;
  description_text?: string;
  award_amount?: number;
  awardee_name?: string;
  contact_name?: string;
  contact_email?: string;
  sam_url?: string;
  performance_city_name?: string;
  performance_state_code?: string;
}

export interface GovConOpportunitiesResponse {
  data: GovConOpportunity[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    has_next: boolean;
  };
  filters_applied: Record<string, string | null>;
}

export interface GovConOpportunitiesSearchParams {
  keywords?: string;
  state?: string;
  notice_type?: string;
  limit?: number;
  offset?: number;
}

/**
 * Search GovCon opportunities (federal contract notices)
 */
export async function searchGovConOpportunities(
  params: GovConOpportunitiesSearchParams = {}
): Promise<GovConOpportunity[]> {
  const apiKey = process.env.GOVCON_API_KEY;
  if (!apiKey) {
    throw new Error("GOVCON_API_KEY is not configured. Add it to .env.local.");
  }

  const qp = new URLSearchParams();

  const keywords = params.keywords || "port maritime infrastructure grant";
  qp.set("keywords", keywords);

  if (params.state) {
    qp.set("state", params.state);
  }
  if (params.notice_type) {
    qp.set("notice_type", params.notice_type);
  }

  qp.set("limit", String(Math.min(params.limit || 50, 50)));

  if (params.offset && params.offset > 0) {
    qp.set("offset", String(params.offset));
  }

  const url = `${GOVCON_OPPORTUNITIES_URL}?${qp.toString()}`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      let errorMsg = `GovCon API returned ${response.status}`;
      try {
        const errorBody = await response.json();
        errorMsg = errorBody?.error?.message || errorBody?.message || errorBody?.error || JSON.stringify(errorBody) || errorMsg;
      } catch {
        const text = await response.text().catch(() => "");
        if (text) errorMsg = text;
      }
      console.error("GovCon API error:", { status: response.status, url, errorMsg });
      throw new Error(errorMsg);
    }

    const data: GovConOpportunitiesResponse = await response.json();
    console.log(`[GovCon] ${data.pagination.total} total results, returned ${data.data.length}`);
    return data.data || [];
  } catch (error) {
    console.error("GovCon Opportunities API error:", error);
    throw error;
  }
}

// ─── Advanced Vendor Search via Award Notices ───
// Supports all 8 filter types for the Subchapter N vendor search system.

export interface AdvancedVendorSearchParams {
  naicsCodes?: string[];
  noticeType?: string;
  setAsides?: string[];
  states?: string[];
  agencies?: string[];
  agencySearch?: string;
  valueMin?: number | null;
  valueMax?: number | null;
  postedFrom?: string;
  postedTo?: string;
  pscCodes?: string[];
  limit?: number;
  offset?: number;
}

export interface AggregatedVendor {
  name: string;
  totalAmount: number;
  awardCount: number;
  maxSingleAward: number;
  state: string;
  city: string;
  naics: Set<string>;
  pscs: Set<string>;
  agencies: Set<string>;
  setAsideTypes: Set<string>;
  awards: {
    title: string;
    amount: number;
    date: string;
    agency: string;
    solicitationNumber: string;
    noticeId: string;
  }[];
}

// GovCon API `agency` filter does partial text match on full agency names.
// Our UI presets use abbreviations; this maps them to search-friendly strings.
const AGENCY_SEARCH_TERMS: Record<string, string> = {
  USACE: "Corps of Engineers",
  MARAD: "Maritime Administration",
  DOT: "Department of Transportation",
  EPA: "Environmental Protection",
  DHS: "Homeland Security",
};

function resolveAgencySearchTerm(agencies: string[], agencySearch?: string): string | undefined {
  if (agencies.length > 0) {
    const terms = agencies.map((a) => AGENCY_SEARCH_TERMS[a] || a);
    return terms[0];
  }
  return agencySearch?.trim() || undefined;
}

/**
 * Build query params for a single GovCon /opportunities/search request.
 * Handles correct param names per API docs (naics vs naics_multiple,
 * date_from/date_to, single-value state, etc.).
 */
function buildSearchParams(
  params: AdvancedVendorSearchParams,
  singleState: string | undefined,
  pageSize: number,
  offset: number,
): URLSearchParams {
  const qp = new URLSearchParams();

  if (params.noticeType !== undefined && params.noticeType !== "") {
    qp.set("notice_type", params.noticeType);
  }

  // NAICS: single code uses `naics`, multiple codes use `naics_multiple` (Developer plan)
  if (params.naicsCodes && params.naicsCodes.length > 0) {
    if (params.naicsCodes.length === 1) {
      qp.set("naics", params.naicsCodes[0]);
    } else {
      qp.set("naics_multiple", params.naicsCodes.join(","));
    }
  }

  // State: API only accepts a single state per request
  if (singleState) {
    qp.set("state", singleState);
  }

  // Agency: partial text match — resolve abbreviations to full names
  const agencyTerm = resolveAgencySearchTerm(
    params.agencies || [],
    params.agencySearch,
  );
  if (agencyTerm) {
    qp.set("agency", agencyTerm);
  }

  // Value range
  if (params.valueMin != null && params.valueMin > 0) {
    qp.set("value_min", String(params.valueMin));
  }
  if (params.valueMax != null && params.valueMax > 0) {
    qp.set("value_max", String(params.valueMax));
  }

  // Date range — API uses date_from / date_to
  if (params.postedFrom) {
    qp.set("date_from", params.postedFrom);
  }
  if (params.postedTo) {
    qp.set("date_to", params.postedTo);
  }

  // PSC: single code per request
  if (params.pscCodes && params.pscCodes.length > 0) {
    qp.set("psc", params.pscCodes[0]);
  }

  // Set-aside
  if (params.setAsides && params.setAsides.length > 0) {
    qp.set("set_aside", params.setAsides[0]);
  }

  qp.set("limit", String(pageSize));
  qp.set("offset", String(offset));

  return qp;
}

/**
 * Merge a GovConOpportunity award into the vendor aggregation map.
 */
function mergeAwardIntoVendorMap(
  vendorMap: Map<string, AggregatedVendor>,
  award: GovConOpportunity,
): void {
  const name = award.awardee_name;
  if (!name) return;

  const key = name.toLowerCase().trim();
  const existing = vendorMap.get(key);
  const awardEntry = {
    title: award.title,
    amount: award.award_amount || 0,
    date: award.posted_date,
    agency: award.agency || "",
    solicitationNumber: award.solicitation_number || "",
    noticeId: award.notice_id,
  };

  if (existing) {
    existing.totalAmount += award.award_amount || 0;
    existing.awardCount++;
    existing.maxSingleAward = Math.max(existing.maxSingleAward, award.award_amount || 0);
    if (award.naics) award.naics.forEach((n) => existing.naics.add(n));
    if (award.psc) existing.pscs.add(award.psc);
    if (award.agency) existing.agencies.add(award.agency);
    if (award.set_aside_type) existing.setAsideTypes.add(award.set_aside_type);
    if (existing.awards.length < 10) existing.awards.push(awardEntry);
  } else {
    vendorMap.set(key, {
      name,
      totalAmount: award.award_amount || 0,
      awardCount: 1,
      maxSingleAward: award.award_amount || 0,
      state: award.performance_state_code || "",
      city: award.performance_city_name || "",
      naics: new Set(award.naics || []),
      pscs: new Set(award.psc ? [award.psc] : []),
      agencies: new Set(award.agency ? [award.agency] : []),
      setAsideTypes: new Set(award.set_aside_type ? [award.set_aside_type] : []),
      awards: [awardEntry],
    });
  }
}

/**
 * Run paginated requests for a single state and return collected awards.
 */
async function fetchAwardsForState(
  apiKey: string,
  params: AdvancedVendorSearchParams,
  state: string | undefined,
  maxPages: number,
): Promise<{ awards: GovConOpportunity[]; totalRecords: number }> {
  const pageSize = Math.min(params.limit || 50, 50);
  let totalRecords = 0;
  const allAwards: GovConOpportunity[] = [];

  for (let page = 0; page < maxPages; page++) {
    const qp = buildSearchParams(params, state, pageSize, page * pageSize);
    const url = `${GOVCON_OPPORTUNITIES_URL}?${qp.toString()}`;

    console.log(`[GovCon] Fetching: state=${state || "any"} page=${page}`);

    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!res.ok) {
      const errorBody = await res.json().catch(() => null);
      const errorMsg =
        errorBody?.error?.message ||
        errorBody?.message ||
        errorBody?.detail ||
        `GovCon API returned ${res.status}`;
      throw new Error(errorMsg);
    }

    const data: GovConOpportunitiesResponse = await res.json();
    totalRecords = data.pagination?.total || 0;
    const awards = data.data || [];

    console.log(
      `[GovCon] state=${state || "any"} page=${page}: ${awards.length} awards (${totalRecords} total). Filters: ${JSON.stringify(data.filters_applied || {})}`
    );

    allAwards.push(...awards);

    if (!data.pagination?.has_next || awards.length < pageSize) break;
  }

  return { awards: allAwards, totalRecords };
}

/**
 * Search GovCon /opportunities/search with full filter support.
 * Aggregates results by awardee_name to produce a vendor list.
 *
 * When multiple states are selected, runs one set of paginated requests
 * per state (the API only accepts a single state per request) and merges.
 */
export async function searchVendorsAdvanced(
  params: AdvancedVendorSearchParams,
  maxPages: number = 3
): Promise<{ vendors: AggregatedVendor[]; totalRecords: number }> {
  const apiKey = process.env.GOVCON_API_KEY;
  if (!apiKey) {
    throw new Error("GOVCON_API_KEY is not configured. Add it to .env.local.");
  }

  const states = params.states && params.states.length > 0 ? params.states : [undefined];
  const pagesPerState = Math.max(1, Math.ceil(maxPages / states.length));

  // Fetch awards for each state in parallel, then merge sequentially
  const stateResults = await Promise.all(
    states.map((state) =>
      fetchAwardsForState(apiKey, params, state, pagesPerState)
    )
  );

  const vendorMap = new Map<string, AggregatedVendor>();
  let totalRecords = 0;

  for (const { awards, totalRecords: count } of stateResults) {
    totalRecords += count;
    for (const award of awards) {
      mergeAwardIntoVendorMap(vendorMap, award);
    }
  }

  return { vendors: [...vendorMap.values()], totalRecords };
}

// Fetch multiple pages to get more results (respects rate limits)
export async function searchGovConEntitiesMultiPage(
  params: GovConSearchParams,
  maxPages: number = 5
): Promise<{ vendors: PortVendor[]; totalRecords: number }> {
  const allVendors: PortVendor[] = [];
  let totalRecords = 0;

  for (let page = 0; page < maxPages; page++) {
    const result = await searchGovConEntities({ ...params, page });
    allVendors.push(...result.vendors);
    totalRecords = result.totalRecords;

    // Stop if we got fewer than page size (no more results)
    if (result.vendors.length < (params.size || 10)) break;
  }

  // Deduplicate by UEI
  const seen = new Set<string>();
  const unique = allVendors.filter((v) => {
    if (seen.has(v.id)) return false;
    seen.add(v.id);
    return true;
  });

  return { vendors: unique, totalRecords };
}

// Derive NAICS codes from grant focus areas
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

  // If no specific matches, return all port-relevant codes
  if (codes.size === 0) {
    return PORT_NAICS_CODES;
  }

  return [...codes];
}
