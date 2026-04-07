import fs from "fs";
import path from "path";
import type { DiscoveredGrant } from "@/lib/grants-gov";
import { parseStateLocalCsvContents, type ParseStateLocalCsvResult } from "./parse-csv";

export function getStateLocalGrantsFilePath(profileId: string): string {
  return path.join(process.cwd(), "data", "state-local-grants", `${profileId}.csv`);
}

export type LoadStateLocalGrantsResult = ParseStateLocalCsvResult & {
  missingFile: boolean;
  profileId: string;
};

/**
 * Read `data/state-local-grants/<profileId>.csv` from the repo root.
 */
export function loadStateLocalGrantsFromDisk(profileId: string): LoadStateLocalGrantsResult {
  const filePath = getStateLocalGrantsFilePath(profileId);
  if (!fs.existsSync(filePath)) {
    return {
      grants: [] as DiscoveredGrant[],
      rowCount: 0,
      errors: [],
      missingFile: true,
      profileId,
    };
  }
  const text = fs.readFileSync(filePath, "utf-8");
  const parsed = parseStateLocalCsvContents(text);
  return { ...parsed, missingFile: false, profileId };
}
