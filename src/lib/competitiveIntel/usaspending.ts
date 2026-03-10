/**
 * USAspending fetch + normalize for Competitive Intelligence tab.
 * Server-side only. Searches for assistance (grant) awards by recipient name.
 */

const BASE_URL = "https://api.usaspending.gov/api/v2";

// ─── Raw response types ───

export interface RawAwardRow {
  internal_id: number;
  generated_internal_id: string;
  "Award ID": string;
  "Recipient Name": string;
  "Award Amount": number;
  "Total Outlays": number | null;
  "Awarding Agency": string;
  "Awarding Sub Agency": string;
  "CFDA Number": string | null;
  "Place of Performance State Code": string | null;
  "Start Date": string | null;
  "End Date": string | null;
  Description: string | null;
  "Award Type": string | null;
  "Assistance Listing": string | null;
}

// ─── Normalized award ───

export interface NormalizedAward {
  awardId: string;
  internalId: string;
  recipient: string;
  amount: number;
  agency: string;
  subAgency: string;
  assistanceListing: string | null;
  stateCode: string | null;
  startDate: string | null;
  endDate: string | null;
  description: string | null;
  awardType: string | null;
  usaSpendingUrl: string | null;
}

// ─── Fetch helpers ───

async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  maxRetries = 3
): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, init);
      if (res.status === 429 && attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
        continue;
      }
      return res;
    } catch (err) {
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
        continue;
      }
      throw err;
    }
  }
  return fetch(url, init);
}

function normalize(row: RawAwardRow): NormalizedAward {
  const genId = row.generated_internal_id || "";
  let usaSpendingUrl: string | null = null;
  if (genId) {
    usaSpendingUrl = `https://www.usaspending.gov/award/${genId}`;
  }

  return {
    awardId: row["Award ID"] || String(row.internal_id || ""),
    internalId: genId,
    recipient: row["Recipient Name"] || "",
    amount: row["Award Amount"] || 0,
    agency: row["Awarding Agency"] || "",
    subAgency: row["Awarding Sub Agency"] || "",
    assistanceListing: row["CFDA Number"] || row["Assistance Listing"] || null,
    stateCode: row["Place of Performance State Code"] || null,
    startDate: row["Start Date"] || null,
    endDate: row["End Date"] || null,
    description: row["Description"] || null,
    awardType: row["Award Type"] || null,
    usaSpendingUrl,
  };
}

// ─── Public API ───

export interface PortSearchParams {
  portName: string;
  startDate: string;
  endDate: string;
  maxResults?: number;
}

export async function searchPortAwards(
  params: PortSearchParams
): Promise<NormalizedAward[]> {
  const { portName, startDate, endDate, maxResults = 200 } = params;

  const allAwards: NormalizedAward[] = [];
  const perPage = 100;
  const maxPages = Math.ceil(maxResults / perPage);

  for (let page = 1; page <= maxPages; page++) {
    const body = {
      filters: {
        recipient_search_text: [portName],
        award_type_codes: ["02", "03", "04", "05"],
        time_period: [{ start_date: startDate, end_date: endDate }],
      },
      fields: [
        "Award ID",
        "Recipient Name",
        "Award Amount",
        "Total Outlays",
        "Awarding Agency",
        "Awarding Sub Agency",
        "CFDA Number",
        "Place of Performance State Code",
        "Start Date",
        "End Date",
        "Description",
        "Award Type",
        "Assistance Listing",
      ],
      limit: perPage,
      page,
      sort: "Start Date",
      order: "desc",
    };

    const res = await fetchWithRetry(
      `${BASE_URL}/search/spending_by_award/`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(
        `[CI USAspending] API error ${res.status} for "${portName}":`,
        text.slice(0, 500)
      );
      if (page === 1) break;
      break;
    }

    const data = await res.json();
    const rows = (data.results || []) as RawAwardRow[];
    for (const row of rows) {
      allAwards.push(normalize(row));
    }

    const hasNext = data.page_metadata?.hasNext ?? rows.length >= perPage;
    if (!hasNext || rows.length < perPage) break;
    if (allAwards.length >= maxResults) break;

    await new Promise((r) => setTimeout(r, 200));
  }

  return allAwards.filter((a) => a.amount > 0);
}
