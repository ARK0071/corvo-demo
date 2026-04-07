import { createHash } from "crypto";
import type { DiscoveredGrant } from "@/lib/grants-gov";

/** Normalized keys after {@link normalizeCsvHeader} */
export interface StateLocalCsvRow {
  title?: string;
  grant_id?: string;
  source_url?: string;
  source_domain?: string;
  discovery_tier?: string;
  agency?: string;
  funding_amount_min?: string;
  funding_amount_max?: string;
  match_required?: string;
  open_date?: string;
  close_date?: string;
  status?: string;
  level?: string;
  domain_tags?: string;
  eligible_entities?: string;
  summary?: string;
  confidence_score?: string;
  scraped_date?: string;
  notes?: string;
}

export function normalizeCsvHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

/** Map arbitrary header names (e.g. truncated Excel) to canonical keys. */
const HEADER_ALIASES: Record<string, keyof StateLocalCsvRow> = {
  title: "title",
  grant_id: "grant_id",
  source_url: "source_url",
  source_domain: "source_domain",
  /** Truncated export headers */
  source_doma: "source_domain",
  discovery_tier: "discovery_tier",
  discovery_tie: "discovery_tier",
  agency: "agency",
  funding_amount_min: "funding_amount_min",
  funding_amount_max: "funding_amount_max",
  /** If only one funding column exists, map to max */
  funding_amo: "funding_amount_max",
  match_required: "match_required",
  match_requi: "match_required",
  open_date: "open_date",
  close_date: "close_date",
  status: "status",
  level: "level",
  domain_tags: "domain_tags",
  eligible_entities: "eligible_entities",
  eligible_entit: "eligible_entities",
  summary: "summary",
  confidence_score: "confidence_score",
  confidence_s: "confidence_score",
  scraped_date: "scraped_date",
  notes: "notes",
};

export function rowRecordToStateLocalRow(
  raw: Record<string, string>
): StateLocalCsvRow {
  const out: StateLocalCsvRow = {};
  for (const [k, v] of Object.entries(raw)) {
    const nk = normalizeCsvHeader(k);
    const canon = HEADER_ALIASES[nk];
    if (canon && v !== undefined && v !== null) {
      const s = String(v).trim();
      if (s !== "") (out as Record<string, string>)[canon] = s;
    }
  }
  return out;
}

function parseMoney(s: string | undefined): number {
  if (!s) return 0;
  const cleaned = s.replace(/[$,\s]/g, "");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

/** Best-effort date → YYYY-MM-DD for DiscoveredGrant */
export function parseFlexibleDate(s: string | undefined): string {
  if (!s?.trim()) return "";
  const t = s.trim();
  const iso = /^\d{4}-\d{2}-\d{2}/.exec(t);
  if (iso) return iso[0];
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(t);
  if (us) {
    let m = parseInt(us[1], 10);
    let d = parseInt(us[2], 10);
    let y = parseInt(us[3], 10);
    if (y < 100) y += y >= 70 ? 1900 : 2000;
    const dt = new Date(Date.UTC(y, m - 1, d));
    if (!Number.isNaN(dt.getTime())) {
      return dt.toISOString().split("T")[0];
    }
  }
  const d = new Date(t);
  if (!Number.isNaN(d.getTime())) {
    return d.toISOString().split("T")[0];
  }
  return "";
}

function splitTags(s: string | undefined): string[] {
  if (!s?.trim()) return [];
  return s
    .split(/[,|;]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function splitEligibility(s: string | undefined): string[] {
  if (!s?.trim()) return [];
  if (s.includes(";")) {
    return s
      .split(";")
      .map((x) => x.trim())
      .filter(Boolean);
  }
  return [s.trim()];
}

function inferCostSharing(match: string | undefined): boolean {
  if (!match?.trim()) return false;
  const m = match.trim().toLowerCase();
  if (m === "0" || m === "none" || m === "n/a" || m === "no") return false;
  return /%|\d/.test(m);
}

export function makeStateLocalGrantId(grantIdRaw: string, rowIndex: number): string {
  const raw = grantIdRaw.trim();
  const fallback = `row_${rowIndex}`;
  const idPart = raw || fallback;
  const base = `sl-${idPart.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
  if (base.length <= 50) return base;
  const h = createHash("sha256").update(idPart).digest("hex").slice(0, 40);
  return `sl-${h}`;
}

/**
 * Map a CSV row to {@link DiscoveredGrant} for scoring and display.
 * `description` is plain text (no HTML).
 */
export function rowToDiscoveredGrant(row: StateLocalCsvRow, rowIndex: number): DiscoveredGrant | null {
  const title = row.title?.trim() || "";
  if (!title) return null;

  const grantId = makeStateLocalGrantId(row.grant_id ?? "", rowIndex);
  const minAmt = parseMoney(row.funding_amount_min);
  const maxAmt = parseMoney(row.funding_amount_max);
  const awardFloor = minAmt || 0;
  const awardCeiling = maxAmt || minAmt || 0;
  const totalFunding = awardCeiling || awardFloor;

  const descParts = [
    row.summary,
    row.notes,
    row.level ? `Level: ${row.level}` : "",
    row.discovery_tier ? `Discovery: ${row.discovery_tier}` : "",
    row.match_required ? `Match: ${row.match_required}` : "",
    row.source_domain ? `Source: ${row.source_domain}` : "",
  ];

  return {
    id: grantId,
    opportunityNumber: row.grant_id?.trim() || grantId,
    title,
    agency: row.agency?.trim() || "Unknown agency",
    agencyCode: "",
    description: descParts.filter(Boolean).join("\n\n"),
    awardFloor,
    awardCeiling,
    totalFunding,
    closeDate: parseFlexibleDate(row.close_date),
    postDate: parseFlexibleDate(row.open_date) || parseFlexibleDate(row.scraped_date),
    status: row.status?.trim().toLowerCase() || "open",
    applicationUrl: row.source_url?.trim() || "",
    eligibility: splitEligibility(row.eligible_entities),
    fundingCategories: splitTags(row.domain_tags),
    fundingInstruments: [],
    costSharing: inferCostSharing(row.match_required),
    alnNumbers: [],
    source: "state-local",
  };
}
