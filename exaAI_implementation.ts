import Exa from "exa-js";

// ============================================================
// Types
// ============================================================

export interface Grant {
  id: string;
  opportunityNumber: string;
  title: string;
  agency: string;
  agencyCode: string;
  description: string;
  awardFloor: number;
  awardCeiling: number;
  totalFunding: number;
  closeDate: string;
  postDate: string;
  status: string;
  applicationUrl: string;
  eligibility: string[];
  fundingCategories: string[];
  fundingInstruments: string[];
  costSharing: boolean;
  alnNumbers: string[];
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  source?: string;
}

export interface DomainSearchConfig {
  name: string;
  query: string;
}

interface ExaSearchResult {
  title: string;
  url: string;
  highlights?: string[];
  publishedDate?: string;
}

// ============================================================
// Configuration
// ============================================================

/**
 * Domains Exa is restricted to — all state, regional, and
 * association-level sources. Federal sources like grants.gov
 * and sam.gov are intentionally excluded since those are
 * covered by the Grants.gov API pipeline.
 */
const EXA_SUPPLEMENTARY_DOMAINS = [
  // Texas state agencies
  "txdot.gov",
  "glo.texas.gov",         // Texas General Land Office
  "twdb.texas.gov",        // Texas Water Development Board
  "tpwd.texas.gov",        // Texas Parks & Wildlife
  "governor.texas.gov",    // Governor's economic development office
  "comptroller.texas.gov",
  "tceq.texas.gov",        // TX Commission on Environmental Quality
  "tml.org",               // Texas Municipal League

  // Gulf Coast / regional planning
  "gulfcoastauthority.org",
  "h-gac.com",             // Houston-Galveston Area Council
  "bcsdtexas.org",         // Brazoria County
  "bravosf.org",           // Brazos Valley

  // Port / maritime associations
  "aapa-ports.org",
  "texasports.org",
  "waterwayscouncil.org",

  // Broader grant aggregators (non-federal)
  "grants.texas.gov",
  "foundationcenter.org",
  "instrumentl.com",

  // Federal Register — catches NOFOs before they land on grants.gov
  "federalregister.gov",
];

/**
 * One search config per funding domain. Queries are written
 * to surface state/regional programs, so they emphasize
 * Texas-specific agencies and avoid federal program names
 * that would just return grants.gov results.
 */
export const DOMAIN_SEARCHES: DomainSearchConfig[] = [
  {
    name: "Port Infrastructure",
    query:
      "Texas port authority terminal wharf construction grant funding 2025 state program",
  },
  {
    name: "Channel & Waterway",
    query:
      "Texas waterway navigation channel dredging grant state local funding program",
  },
  {
    name: "Clean Energy & Emissions",
    query:
      "Texas port emissions reduction clean energy zero emission equipment grant state program 2025",
  },
  {
    name: "Security & Cybersecurity",
    query:
      "Texas port maritime security cybersecurity grant state regional funding program",
  },
  {
    name: "Freight & Intermodal",
    query:
      "Texas freight rail intermodal connectivity port grant TxDOT state regional 2025",
  },
  {
    name: "Climate Resilience",
    query:
      "Texas Gulf Coast coastal resilience flood mitigation port grant state GLO TWDB 2025",
  },
  {
    name: "Workforce Development",
    query:
      "Texas maritime workforce training port jobs apprenticeship grant state program 2025",
  },
  {
    name: "Economic Development",
    query:
      "Texas port authority economic development industrial grant state regional program",
  },
  {
    name: "Energy Infrastructure",
    query:
      "Texas LNG petrochemical port energy infrastructure grant state funding program",
  },
];

// ============================================================
// LLM Extraction
// ============================================================

/**
 * Calls the Anthropic API to extract partial Grant objects
 * from raw Exa search result snippets. Fields that cannot be
 * determined with confidence are omitted entirely — no guessing.
 */
async function extractGrantsWithLLM(
  results: ExaSearchResult[],
  domainName: string
): Promise<Partial<Grant>[]> {
  if (results.length === 0) return [];

  const formattedResults = results
    .map(
      (r, i) => `
[Result ${i + 1}]
Title: ${r.title}
URL: ${r.url}
Published: ${r.publishedDate ?? "unknown"}
Excerpts: ${r.highlights?.join(" ... ") ?? "none"}
`.trim()
    )
    .join("\n\n");

  const prompt = `You are extracting grant funding opportunities from web search results for a public port authority.
Funding domain context: ${domainName}

Instructions:
- Extract ONE grant object per distinct grant program found across all results.
- A single result may contain 0, 1, or multiple grant programs.
- Only include fields you are highly confident about. Omit fields you cannot determine — do not guess.
- Do NOT include federal grants already on Grants.gov (e.g. PIDP, RAISE, INFRA, FEMA PSGP). Focus on state, regional, or local programs.
- For amounts, only include if an explicit dollar figure is stated. Do not estimate.
- Return a JSON array only — no markdown, no explanation, no preamble.

Fields to extract (all optional except title and applicationUrl):
{
  "title": string,                  // Official program name
  "agency": string,                 // Administering agency or organization
  "description": string,            // 1-2 sentence plain-text description
  "opportunityNumber": string,      // If explicitly stated (e.g. "TXD-2025-001")
  "awardFloor": number,             // Min award in dollars if stated
  "awardCeiling": number,           // Max award in dollars if stated
  "totalFunding": number,           // Total program funding if stated
  "closeDate": string,              // ISO date if stated (YYYY-MM-DD)
  "postDate": string,               // ISO date if stated
  "status": "posted" | "forecasted" | "closed",
  "applicationUrl": string,         // Direct URL to apply or learn more
  "eligibility": string[],          // e.g. ["port authorities", "public agencies"]
  "fundingCategories": string[],    // e.g. ["port infrastructure", "resilience"]
  "fundingInstruments": string[],   // e.g. ["Grant", "Loan", "Cooperative Agreement"]
  "costSharing": boolean,           // true if cost-share is required
  "contactEmail": string,
  "contactPhone": string,
  "source": string                  // Domain name of source (e.g. "txdot.gov")
}

Search results to analyze:
${formattedResults}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    console.error(`LLM extraction failed: ${response.status}`);
    return [];
  }

  const data = await response.json();
  const rawText: string = data.content?.[0]?.text ?? "[]";

  try {
    const cleaned = rawText.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Failed to parse LLM extraction response:", err);
    return [];
  }
}

// ============================================================
// Exa Search — Single Domain
// ============================================================

/**
 * Runs one Exa search for a given domain config and returns
 * partial Grant objects extracted by the LLM. Results are
 * tagged with the domain name in fundingCategories.
 */
async function searchDomain(
  exa: Exa,
  domain: DomainSearchConfig
): Promise<Partial<Grant>[]> {
  console.log(`[Exa] Searching domain: ${domain.name}`);

  let results: ExaSearchResult[] = [];

  try {
    const response = await exa.searchAndContents(domain.query, {
      type: "auto",
      numResults: 8,
      includeDomains: EXA_SUPPLEMENTARY_DOMAINS,
      contents: {
        highlights: {
          maxCharacters: 3000,
          // Bias highlights toward funding/grant-relevant sentences
          highlightQuery: "grant funding eligibility award deadline application",
        },
      },
    });

    results = response.results.map((r: any) => ({
      title: r.title ?? "",
      url: r.url ?? "",
      highlights: r.highlights ?? [],
      publishedDate: r.publishedDate ?? undefined,
    }));
  } catch (err) {
    console.error(`[Exa] Search failed for domain "${domain.name}":`, err);
    return [];
  }

  if (results.length === 0) {
    console.log(`[Exa] No results for domain: ${domain.name}`);
    return [];
  }

  // Extract structured data via LLM
  const extracted = await extractGrantsWithLLM(results, domain.name);

  // Tag each result with the funding domain and a stable ID
  return extracted.map((grant) => ({
    ...grant,
    id: crypto.randomUUID(),
    fundingCategories: [
      domain.name,
      ...(grant.fundingCategories ?? []),
    ],
    source: grant.source ?? "Exa Web Search",
  }));
}

// ============================================================
// Exa Search — All Domains
// ============================================================

/**
 * Runs Exa searches across all domains in parallel and returns
 * a deduplicated array of partial Grant objects.
 *
 * These results are intended to supplement — not replace — the
 * Grants.gov API results. Expect many fields to be null/missing.
 */
export async function searchExaAllDomains(
  domains: DomainSearchConfig[] = DOMAIN_SEARCHES
): Promise<Partial<Grant>[]> {
  const exa = new Exa(process.env.EXA_API_KEY);

  // Run all domain searches concurrently
  const domainResults = await Promise.allSettled(
    domains.map((domain) => searchDomain(exa, domain))
  );

  const allGrants: Partial<Grant>[] = [];
  const seen = new Set<string>();

  for (const result of domainResults) {
    if (result.status === "rejected") {
      console.error("[Exa] Domain search rejected:", result.reason);
      continue;
    }

    for (const grant of result.value) {
      // Deduplicate by applicationUrl or title as fallback
      const dedupeKey = grant.applicationUrl ?? grant.title ?? "";
      if (!dedupeKey || seen.has(dedupeKey)) continue;

      seen.add(dedupeKey);
      allGrants.push(grant);
    }
  }

  console.log(`[Exa] Total unique supplementary grants found: ${allGrants.length}`);
  return allGrants;
}

// ============================================================
// Merge with Grants.gov results
// ============================================================

/**
 * Merges Grants.gov (full schema) results with Exa supplementary
 * (partial schema) results, deduplicating on opportunityNumber
 * when available, then on applicationUrl.
 */
export function mergeGrantResults(
  grantsGovResults: Grant[],
  exaResults: Partial<Grant>[]
): Grant[] {
  const merged: Grant[] = [...grantsGovResults];
  const seenOpportunityNumbers = new Set(
    grantsGovResults.map((g) => g.opportunityNumber).filter(Boolean)
  );
  const seenUrls = new Set(
    grantsGovResults.map((g) => g.applicationUrl).filter(Boolean)
  );

  for (const partial of exaResults) {
    // Skip if we already have this from Grants.gov
    if (
      partial.opportunityNumber &&
      seenOpportunityNumbers.has(partial.opportunityNumber)
    ) {
      continue;
    }
    if (partial.applicationUrl && seenUrls.has(partial.applicationUrl)) {
      continue;
    }

    // Add as a partial grant with safe defaults for required fields
    merged.push({
      id: partial.id ?? crypto.randomUUID(),
      opportunityNumber: partial.opportunityNumber ?? "",
      title: partial.title ?? "Untitled Grant",
      agency: partial.agency ?? "",
      agencyCode: "",
      description: partial.description ?? "",
      awardFloor: partial.awardFloor ?? 0,
      awardCeiling: partial.awardCeiling ?? 0,
      totalFunding: partial.totalFunding ?? 0,
      closeDate: partial.closeDate ?? "",
      postDate: partial.postDate ?? "",
      status: partial.status ?? "posted",
      applicationUrl: partial.applicationUrl ?? "",
      eligibility: partial.eligibility ?? [],
      fundingCategories: partial.fundingCategories ?? [],
      fundingInstruments: partial.fundingInstruments ?? [],
      costSharing: partial.costSharing ?? false,
      alnNumbers: [],
      contactName: partial.contactName,
      contactEmail: partial.contactEmail,
      contactPhone: partial.contactPhone,
      source: partial.source ?? "Exa Web Search",
    });

    if (partial.opportunityNumber) seenOpportunityNumbers.add(partial.opportunityNumber);
    if (partial.applicationUrl) seenUrls.add(partial.applicationUrl);
  }

  return merged;
}