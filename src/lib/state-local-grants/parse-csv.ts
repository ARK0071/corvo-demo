import Papa from "papaparse";
import type { DiscoveredGrant } from "@/lib/grants-gov";
import {
  rowRecordToStateLocalRow,
  rowToDiscoveredGrant,
} from "./csv-to-discovered";

export interface ParseStateLocalCsvResult {
  grants: DiscoveredGrant[];
  rowCount: number;
  errors: string[];
}

/**
 * Parse CSV file contents into {@link DiscoveredGrant}[].
 */
export function parseStateLocalCsvContents(csvText: string): ParseStateLocalCsvResult {
  const errors: string[] = [];
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h: string) => h.trim(),
  });

  if (parsed.errors?.length) {
    for (const e of parsed.errors) {
      if (e.type === "Delimiter" || e.type === "Quotes") {
        errors.push(`${e.type}: ${e.message} (row ${e.row})`);
      }
    }
  }

  const rows = parsed.data ?? [];
  const grants: DiscoveredGrant[] = [];
  let i = 0;
  for (const raw of rows) {
    if (!raw || typeof raw !== "object") continue;
    const hasAny = Object.values(raw).some((v) => String(v ?? "").trim() !== "");
    if (!hasAny) continue;
    const row = rowRecordToStateLocalRow(raw);
    const g = rowToDiscoveredGrant(row, i);
    if (g) grants.push(g);
    i++;
  }

  return { grants, rowCount: rows.length, errors };
}
