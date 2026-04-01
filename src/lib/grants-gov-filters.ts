/**
 * Grants.gov search2 filter options (codes align with api.grants.gov/v1/api/search2).
 * Category & eligibility codes: https://www.grants.gov/api/status-codes
 */

export interface GrantDiscoveryFilterState {
  keyword: string;
  oppStatuses: string[];
  agencyCodes: string[];
  agenciesCustom: string;
  fundingCategories: string[];
  fundingInstruments: string[];
  eligibilities: string[];
  oppNum: string;
  aln: string;
  sortBy: string;
  rows: number;
}

export const OPP_STATUS_OPTIONS = [
  { value: "posted", label: "Posted" },
  { value: "forecasted", label: "Forecasted" },
  { value: "closed", label: "Closed" },
  { value: "archived", label: "Archived" },
] as const;

export const GRANTS_AGENCY_PRESETS: { value: string; label: string }[] = [
  { value: "EPA", label: "EPA" },
  { value: "DOT-MA", label: "DOT — MARAD" },
  { value: "DOT-FTA", label: "DOT — FTA" },
  { value: "DOT-OST", label: "DOT — OST" },
  { value: "DOC-EDA", label: "DOC — EDA" },
  { value: "DOC-DOCNOAAERA", label: "DOC — NOAA" },
  { value: "DOI", label: "DOI" },
  { value: "HUD", label: "HUD" },
  { value: "ED", label: "Education" },
  { value: "NSF", label: "NSF" },
  { value: "HHS-NIH11", label: "HHS — NIH" },
  { value: "DOD", label: "DOD" },
  { value: "USDA-NIFA", label: "USDA — NIFA" },
  { value: "NASA-HQ", label: "NASA" },
];

export const FUNDING_CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: "T", label: "Transportation" },
  { value: "ENV", label: "Environment" },
  { value: "EN", label: "Energy" },
  { value: "CD", label: "Community Development" },
  { value: "IS", label: "Information & Statistics" },
  { value: "NR", label: "Natural Resources" },
  { value: "DPR", label: "Disaster Prevention & Relief" },
  { value: "BC", label: "Business & Commerce" },
  { value: "ST", label: "Science & Technology / R&D" },
  { value: "RD", label: "Regional Development" },
  { value: "IIJ", label: "IIJA (Infrastructure)" },
  { value: "HL", label: "Health" },
  { value: "ED", label: "Education" },
  { value: "HO", label: "Housing" },
  { value: "LJL", label: "Law, Justice & Legal" },
  { value: "O", label: "Other" },
];

export const FUNDING_INSTRUMENT_OPTIONS: { value: string; label: string }[] = [
  { value: "G", label: "Grant" },
  { value: "CA", label: "Cooperative Agreement" },
  { value: "PC", label: "Procurement Contract" },
  { value: "O", label: "Other" },
];

export const ELIGIBILITY_OPTIONS: { value: string; label: string }[] = [
  { value: "00", label: "State governments" },
  { value: "01", label: "County governments" },
  { value: "02", label: "City or township governments" },
  { value: "04", label: "Special district governments" },
  { value: "05", label: "Independent school districts" },
  { value: "06", label: "Public & state IHE" },
  { value: "07", label: "Federally recognized tribal governments" },
  { value: "08", label: "Public housing / Indian housing authorities" },
  { value: "11", label: "Native American tribal organizations" },
  { value: "12", label: "501(c)(3) nonprofits" },
  { value: "13", label: "Other nonprofits" },
  { value: "20", label: "Private IHE" },
  { value: "21", label: "Individuals" },
  { value: "22", label: "For-profit (non-SB)" },
  { value: "23", label: "Small businesses" },
  { value: "25", label: "Others (see NOFO)" },
  { value: "99", label: "Unrestricted (see NOFO)" },
];

export const SORT_BY_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Default (relevance)" },
  { value: "openDate|desc", label: "Open date — newest first" },
  { value: "openDate|asc", label: "Open date — oldest first" },
  { value: "closeDate|asc", label: "Close date — soonest first" },
  { value: "closeDate|desc", label: "Close date — latest first" },
];

export const ROWS_OPTIONS = [25, 50, 100, 200] as const;

export function getDefaultGrantDiscoveryFilters(): GrantDiscoveryFilterState {
  return {
    keyword: "",
    oppStatuses: ["posted", "forecasted"],
    agencyCodes: [],
    agenciesCustom: "",
    fundingCategories: [],
    fundingInstruments: [],
    eligibilities: [],
    oppNum: "",
    aln: "",
    sortBy: "",
    rows: 100,
  };
}

export function buildAgenciesParam(state: GrantDiscoveryFilterState): string | undefined {
  const preset = state.agencyCodes.filter(Boolean);
  const custom = state.agenciesCustom
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
  const merged = [...preset, ...custom];
  if (merged.length === 0) return undefined;
  return [...new Set(merged)].join("|");
}

export function countActiveDiscoveryFilters(state: GrantDiscoveryFilterState): number {
  let n = 0;
  if (state.keyword.trim()) n++;
  if (state.oppStatuses.length > 0 && state.oppStatuses.length < OPP_STATUS_OPTIONS.length) n++;
  if (state.agencyCodes.length > 0) n++;
  if (state.agenciesCustom.trim()) n++;
  if (state.fundingCategories.length > 0) n++;
  if (state.fundingInstruments.length > 0) n++;
  if (state.eligibilities.length > 0) n++;
  if (state.oppNum.trim()) n++;
  if (state.aln.trim()) n++;
  if (state.sortBy) n++;
  if (state.rows !== 100) n++;
  return n;
}
