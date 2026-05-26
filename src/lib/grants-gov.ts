/**
 * Grants.gov API Client
 *
 * Provides access to the Grants.gov search2 and fetchOpportunity REST APIs
 * to search federal grant opportunities and retrieve detailed information.
 *
 * API Documentation:
 * - https://www.grants.gov/api
 * - https://api.grants.gov/v1/api/search2 (no auth required)
 * - https://api.grants.gov/v1/api/fetchOpportunity (no auth required)
 */

const GRANTS_GOV_BASE_URL = "https://api.grants.gov/v1/api";
const CACHE_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// In-memory cache
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const searchCache = new Map<string, CacheEntry<GrantsSearchResponse>>();
const detailsCache = new Map<string, CacheEntry<DiscoveredGrant>>();

// Normalized grant type for our application
export interface DiscoveredGrant {
  id: string;                    // Grants.gov opportunity ID
  opportunityNumber: string;      // e.g., "NOFO-123456"
  title: string;
  agency: string;
  agencyCode: string;
  description: string;            // Synopsis description (HTML)
  awardFloor: number;            // Min award amount
  awardCeiling: number;          // Max award amount
  totalFunding: number;          // Estimated total funding
  closeDate: string;             // ISO date string
  postDate: string;              // ISO date string
  status: string;                // "posted", "forecasted", "closed", "archived"
  applicationUrl: string;        // Link to apply
  eligibility: string[];         // Eligible applicant types
  fundingCategories: string[];   // Focus areas
  fundingInstruments: string[];  // Grant types (e.g., "Cooperative Agreement")
  costSharing: boolean;
  alnNumbers: string[];          // ALN/CFDA numbers
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  source?: string;                // Data source (e.g., "USDOT", "Grants.gov")
}

// Raw API response types
interface GrantsSearchResponse {
  errorcode: number;
  msg: string;
  data: {
    hitCount: number;
    startRecord: number;
    oppHits: OpportunityHit[];
  };
}

interface OpportunityHit {
  id: number;
  number: string;
  title: string;
  agencyCode: string;
  agency: string;  // Note: field is "agency" not "agencyName" in the API
  openDate: string;
  closeDate: string;
  oppStatus: string;
  docType: string;
  cfdaList?: string[];  // Note: field is "cfdaList" not "alnist" in the API
}

interface OpportunityDetail {
  errorcode: number;
  msg: string;
  data: {
    id: number;
    opportunityNumber: string;
    opportunityTitle: string;
    owningAgencyCode: string;
    synopsis?: {
      agencyName?: string;
      agencyCode?: string;
      synopsisDesc?: string;
      awardCeilingUnformatted?: number;
      awardFloorUnformatted?: number;
      estimatedTotalProgramFundingUnformatted?: number;
      postingDate?: string;
      responseDateDesc?: string;
      originalDueDateDesc?: string;
      costSharing?: string | boolean;
      applicantTypes?: Array<{ id: string; description: string }>;
      fundingActivityCategories?: Array<{ id: string; description: string }>;
      fundingInstruments?: Array<{ id: string; description: string }>;
      agencyContactName?: string;
      agencyContactEmail?: string;
      agencyContactPhone?: string;
    };
    alns?: Array<{ alnNum: string; programTitle: string }>;
    oppStatus?: string;
    assistURL?: string;
    synopsisAttachmentFolders?: Array<{
      id: number;
      folderType: string;
      folderName: string;
      synopsisAttachments?: Array<{
        id: number;
        mimeType: string;
        fileName: string;
        fileDescription: string;
      }>;
    }>;
  };
}

export interface GrantsSearchParams {
  keyword?: string;
  /** Grants.gov `agencies` — pipe-separated office codes (e.g. `DOT-MA|EPA`). */
  agencies?: string;
  /** @deprecated Prefer `agencies` */
  agency?: string;
  oppStatuses?: string[];        // ["posted", "forecasted", "closed", "archived"]
  fundingCategories?: string[];
  fundingInstruments?: string[];
  eligibilities?: string[];
  oppNum?: string;
  aln?: string;
  rows?: number;                 // Results per page (default: 25)
  startRecordNum?: number;       // Pagination offset
  sortBy?: string;               // e.g. openDate|desc
}

// Clear expired cache entries
function cleanCache<T>(cache: Map<string, CacheEntry<T>>) {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp > CACHE_DURATION_MS) {
      cache.delete(key);
    }
  }
}

/**
 * Search federal grant opportunities using Grants.gov search2 API
 */
export async function searchGrants(params: GrantsSearchParams): Promise<{
  grants: DiscoveredGrant[];
  totalCount: number;
}> {
  cleanCache(searchCache);

  const cacheKey = JSON.stringify(params);
  const cached = searchCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
    return {
      grants: (cached.data.data.oppHits || []).map(mapOpportunityHitToGrant),
      totalCount: cached.data.data.hitCount || 0,
    };
  }

  const requestBody: Record<string, unknown> = {
    rows: params.rows || 25,
    startRecordNum: params.startRecordNum || 0,
  };

  if (params.keyword) requestBody.keyword = params.keyword;
  const agencies = params.agencies?.trim() || params.agency?.trim();
  if (agencies) requestBody.agencies = agencies;
  if (params.oppStatuses && params.oppStatuses.length > 0) {
    requestBody.oppStatuses = params.oppStatuses.join("|");
  }
  if (params.fundingCategories && params.fundingCategories.length > 0) {
    requestBody.fundingCategories = params.fundingCategories.join("|");
  }
  if (params.fundingInstruments && params.fundingInstruments.length > 0) {
    requestBody.fundingInstruments = params.fundingInstruments.join("|");
  }
  if (params.eligibilities && params.eligibilities.length > 0) {
    requestBody.eligibilities = params.eligibilities.join("|");
  }
  if (params.oppNum?.trim()) requestBody.oppNum = params.oppNum.trim();
  if (params.aln?.trim()) requestBody.aln = params.aln.trim();
  if (params.sortBy) requestBody.sortBy = params.sortBy;

  try {
    const response = await fetch(`${GRANTS_GOV_BASE_URL}/search2`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Grants.gov API error: ${response.status} ${response.statusText}`);
    }

    const data: GrantsSearchResponse = await response.json();

    if (data.errorcode !== 0) {
      throw new Error(`Grants.gov error: ${data.msg}`);
    }

    // Cache the response
    searchCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });

    return {
      grants: (data.data.oppHits || []).map(mapOpportunityHitToGrant),
      totalCount: data.data.hitCount || 0,
    };
  } catch (error) {
    console.error("Error searching Grants.gov:", error);
    throw error;
  }
}

/**
 * Fetch detailed grant information using Grants.gov fetchOpportunity API
 */
export async function fetchGrantDetails(opportunityId: number | string): Promise<DiscoveredGrant> {
  cleanCache(detailsCache);

  const idStr = String(opportunityId);
  const cached = detailsCache.get(idStr);

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
    return cached.data;
  }

  try {
    const response = await fetch(`${GRANTS_GOV_BASE_URL}/fetchOpportunity`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        opportunityId: Number(opportunityId),
      }),
    });

    if (!response.ok) {
      throw new Error(`Grants.gov API error: ${response.status} ${response.statusText}`);
    }

    const data: OpportunityDetail = await response.json();

    if (data.errorcode !== 0) {
      throw new Error(`Grants.gov error: ${data.msg}`);
    }

    const grant = mapOpportunityDetailToGrant(data.data);

    // Cache the response
    detailsCache.set(idStr, {
      data: grant,
      timestamp: Date.now(),
    });

    return grant;
  } catch (error) {
    console.error("Error fetching grant details:", error);
    throw error;
  }
}

const GRANTS_GOV_ATTACHMENT_BASE = "https://apply07.grants.gov/grantsws/rest/opportunity/att/download";

/**
 * Fetch NOFO PDF attachment URL directly from the Grants.gov API.
 * The API returns synopsisAttachmentFolders which contain the actual NOFO documents.
 * Returns the download URL for the best NOFO match, or null if none found.
 */
export async function fetchNofoAttachmentUrl(opportunityId: number | string): Promise<{ url: string; fileName: string; attachmentId: number } | null> {
  try {
    const response = await fetch(`${GRANTS_GOV_BASE_URL}/fetchOpportunity`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ opportunityId: Number(opportunityId) }),
    });

    if (!response.ok) return null;

    const data: OpportunityDetail = await response.json();
    if (data.errorcode !== 0) return null;

    const folders = data.data.synopsisAttachmentFolders || [];

    // Strategy: Find the NOFO PDF in attachment folders
    // Priority 1: "Full Announcement" folder (standard location for NOFOs)
    // Priority 2: Any folder/file with "NOFO" or "notice" in the name
    // Priority 3: Any PDF in any folder
    for (const folder of folders) {
      if (folder.folderType === "Full Announcement") {
        const pdfAtt = folder.synopsisAttachments?.find(a => a.mimeType === "application/pdf");
        if (pdfAtt) {
          return {
            url: `${GRANTS_GOV_ATTACHMENT_BASE}/${pdfAtt.id}`,
            fileName: pdfAtt.fileName,
            attachmentId: pdfAtt.id,
          };
        }
      }
    }

    // Fallback: look for NOFO-named attachments in any folder
    for (const folder of folders) {
      for (const att of folder.synopsisAttachments || []) {
        if (att.mimeType === "application/pdf") {
          const name = (att.fileName + " " + att.fileDescription).toLowerCase();
          if (name.includes("nofo") || name.includes("notice") || name.includes("announcement")) {
            return {
              url: `${GRANTS_GOV_ATTACHMENT_BASE}/${att.id}`,
              fileName: att.fileName,
              attachmentId: att.id,
            };
          }
        }
      }
    }

    // Last resort: first PDF in any folder
    for (const folder of folders) {
      const pdfAtt = folder.synopsisAttachments?.find(a => a.mimeType === "application/pdf");
      if (pdfAtt) {
        return {
          url: `${GRANTS_GOV_ATTACHMENT_BASE}/${pdfAtt.id}`,
          fileName: pdfAtt.fileName,
          attachmentId: pdfAtt.id,
        };
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Map search result hit to normalized grant format
 */
function mapOpportunityHitToGrant(hit: OpportunityHit): DiscoveredGrant {
  return {
    id: String(hit.id),
    opportunityNumber: hit.number || "",
    title: hit.title || "Untitled Opportunity",
    agency: hit.agency || "Unknown Agency",
    agencyCode: hit.agencyCode || "",
    description: "",
    awardFloor: 0,
    awardCeiling: 0,
    totalFunding: 0,
    closeDate: hit.closeDate || "",
    postDate: hit.openDate || "",
    status: hit.oppStatus || "unknown",
    applicationUrl: `https://www.grants.gov/search-results-detail/${hit.id}`,
    eligibility: [],
    fundingCategories: [],
    fundingInstruments: [],
    costSharing: false,
    alnNumbers: hit.cfdaList || [],
  };
}

/**
 * Map detailed opportunity to normalized grant format
 */
function mapOpportunityDetailToGrant(opp: OpportunityDetail["data"]): DiscoveredGrant {
  const syn = opp.synopsis || {};

  return {
    id: String(opp.id),
    opportunityNumber: opp.opportunityNumber || "",
    title: opp.opportunityTitle || "Untitled Opportunity",
    agency: syn.agencyName || "Unknown Agency",
    agencyCode: syn.agencyCode || opp.owningAgencyCode || "",
    description: syn.synopsisDesc || "",
    awardFloor: syn.awardFloorUnformatted || 0,
    awardCeiling: syn.awardCeilingUnformatted || 0,
    totalFunding: syn.estimatedTotalProgramFundingUnformatted || 0,
    closeDate: syn.originalDueDateDesc || syn.responseDateDesc || "",
    postDate: syn.postingDate || "",
    status: opp.oppStatus || "unknown",
    applicationUrl: opp.assistURL || `https://www.grants.gov/search-results-detail/${opp.id}`,
    eligibility: syn.applicantTypes?.map((t: any) => t.description || t) || [],
    fundingCategories: syn.fundingActivityCategories?.map((c: any) => c.description || c) || [],
    fundingInstruments: syn.fundingInstruments?.map((i: any) => i.description || i) || [],
    costSharing: syn.costSharing === "Y" || syn.costSharing === true,
    alnNumbers: opp.alns?.map((a) => a.alnNum) || [],
    contactName: syn.agencyContactName,
    contactEmail: syn.agencyContactEmail,
    contactPhone: syn.agencyContactPhone,
  };
}

/**
 * Clear all caches (useful for testing)
 */
export function clearGrantsCache() {
  searchCache.clear();
  detailsCache.clear();
}
