import type { PortVendor } from "@/data/port-vendors";
export { NAICS_SECTOR_MAP, PORT_NAICS_CODES, FOCUS_TO_NAICS } from "./naics";
import { NAICS_SECTOR_MAP, FOCUS_TO_NAICS, PORT_NAICS_CODES } from "./naics";

// ─── SAM.gov Entity Management API v3 Client ───

const SAM_BASE_URL = "https://api.sam.gov/entity-information/v3/entities";

// ─── SAM.gov Response Types ───

interface SamEntityRegistration {
  samRegistered: string;
  ueiSAM: string;
  cageCode: string | null;
  legalBusinessName: string;
  dbaName: string | null;
  registrationStatus: string;
  registrationDate: string;
  lastUpdateDate: string;
  registrationExpirationDate: string;
  activationDate: string;
  exclusionStatusFlag: string | null;
}

interface SamAddress {
  addressLine1: string | null;
  addressLine2: string | null;
  city: string;
  stateOrProvinceCode: string | null;
  zipCode: string | null;
  countryCode: string;
}

interface SamBusinessType {
  businessTypeCode: string;
  businessTypeDescription: string;
}

interface SamSbaBusinessType {
  sbaBusinessTypeCode: string;
  sbaBusinessTypeDesc: string;
  certificationEntryDate: string;
  certificationExitDate: string | null;
}

interface SamNaics {
  naicsCode: string;
  naicsDescription: string;
  sbaSmallBusiness: string | null;
}

interface SamPsc {
  pscCode: string;
  pscDescription: string;
}

interface SamEntity {
  entityRegistration: SamEntityRegistration;
  coreData?: {
    physicalAddress?: SamAddress;
    mailingAddress?: SamAddress;
    businessTypes?: {
      businessTypeList?: SamBusinessType[];
      sbaBusinessTypeList?: SamSbaBusinessType[];
    };
    generalInformation?: {
      entityStructureDesc?: string;
    };
  };
  assertions?: {
    goodsAndServices?: {
      primaryNaics?: string;
      naicsList?: SamNaics[];
      pscList?: SamPsc[];
    };
    disasterReliefData?: {
      bondingFlag?: string;
    };
  };
}

interface SamApiResponse {
  totalRecords: number;
  entityData: SamEntity[];
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
  businessTypes?: SamBusinessType[],
  sbaTypes?: SamSbaBusinessType[]
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
  businessTypes?: SamBusinessType[],
  sbaTypes?: SamSbaBusinessType[]
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

export function mapSamEntityToVendor(entity: SamEntity): PortVendor {
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
    ? `${reg.legalBusinessName} specializes in ${naicsDescs.slice(0, 3).join(", ")}. Registered in SAM.gov (UEI: ${reg.ueiSAM}).`
    : `${reg.legalBusinessName} — SAM.gov registered entity (UEI: ${reg.ueiSAM}).`;

  return {
    id: reg.ueiSAM,
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

// ─── API Functions ───

export interface SamSearchParams {
  naicsCodes?: string[];
  state?: string;
  query?: string;
  page?: number;
  size?: number;
}

export async function searchSamEntities(
  params: SamSearchParams
): Promise<{ vendors: PortVendor[]; totalRecords: number }> {
  const apiKey = process.env.SAM_GOV_API_KEY;
  if (!apiKey) {
    throw new Error("SAM_GOV_API_KEY is not configured. Add it to .env.local.");
  }

  // Build query parameters
  const queryParams = new URLSearchParams();
  queryParams.set("api_key", apiKey);
  queryParams.set("registrationStatus", "A");
  queryParams.set("samRegistered", "Yes");
  queryParams.set("includeSections", "entityRegistration,coreData,assertions");
  queryParams.set("size", String(params.size || 10));

  if (params.page && params.page > 0) {
    queryParams.set("page", String(params.page));
  }

  if (params.naicsCodes && params.naicsCodes.length > 0) {
    // SAM.gov supports ~ for OR logic in parameter values
    queryParams.set("naicsCode", params.naicsCodes.join("~"));
  }

  if (params.state) {
    queryParams.set("physicalAddressProvinceOrStateCode", params.state);
  }

  if (params.query) {
    queryParams.set("q", params.query);
  }

  // Check cache
  const cacheKey = getCacheKey(Object.fromEntries(queryParams.entries()));
  const cached = getCached(cacheKey);
  if (cached) {
    return { vendors: cached.data, totalRecords: cached.totalRecords };
  }

  const url = `${SAM_BASE_URL}?${queryParams.toString()}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    const errorMsg = errorBody?.error?.message || `SAM.gov API returned ${res.status}`;
    throw new Error(errorMsg);
  }

  const data: SamApiResponse = await res.json();
  const vendors = (data.entityData || []).map(mapSamEntityToVendor);

  // Cache the results
  cache.set(cacheKey, {
    data: vendors,
    timestamp: Date.now(),
    totalRecords: data.totalRecords || 0,
  });

  return { vendors, totalRecords: data.totalRecords || 0 };
}

// Fetch multiple pages to get more results (respects rate limits)
export async function searchSamEntitiesMultiPage(
  params: SamSearchParams,
  maxPages: number = 5
): Promise<{ vendors: PortVendor[]; totalRecords: number }> {
  const allVendors: PortVendor[] = [];
  let totalRecords = 0;

  for (let page = 0; page < maxPages; page++) {
    const result = await searchSamEntities({ ...params, page });
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
