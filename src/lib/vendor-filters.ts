// ─── Vendor Filtering System ───
// Types, constants, and presets for the Subchapter N–compliant vendor search.
// Every filter maps to a Texas Water Code Ch. 60 procurement requirement.

// ─── NAICS Codes (Filter 1) ───
// Pre-loaded port-relevant codes per Sec. 60.404 spec requirements

export interface NaicsOption {
  code: string;
  label: string;
  description: string;
}

export const PORT_NAICS_OPTIONS: NaicsOption[] = [
  { code: "488310", label: "488310", description: "Port & Harbor Operations" },
  { code: "237990", label: "237990", description: "Heavy Civil Engineering (Dredging, Marine)" },
  { code: "541330", label: "541330", description: "Engineering Services" },
  { code: "336611", label: "336611", description: "Ship Building & Repairing" },
  { code: "488390", label: "488390", description: "Other Support Activities for Water Transportation" },
  { code: "562211", label: "562211", description: "Hazardous Waste Treatment & Disposal" },
  { code: "238910", label: "238910", description: "Site Preparation Contractors" },
  { code: "237110", label: "237110", description: "Water & Sewer Line Construction" },
  { code: "237310", label: "237310", description: "Highway, Street & Bridge Construction" },
  { code: "541620", label: "541620", description: "Environmental Consulting" },
  { code: "333923", label: "333923", description: "Overhead Crane & Hoist Manufacturing" },
  { code: "238210", label: "238210", description: "Electrical Contractors" },
  { code: "221114", label: "221114", description: "Solar Electric Power Generation" },
  { code: "561612", label: "561612", description: "Security Guards & Patrol Services" },
];

// ─── Notice Type (Filter 2) ───
// GovCon tracks the full procurement lifecycle

export type NoticeType = "Award Notice" | "Presolicitation" | "Solicitation" | "";

export const NOTICE_TYPE_OPTIONS: { value: NoticeType; label: string; description: string }[] = [
  { value: "Award Notice", label: "Award Notices", description: "Proven winners — vendors who actually delivered" },
  { value: "Solicitation", label: "Active Solicitations", description: "Vendors actively pursuing port work" },
  { value: "", label: "All Notices", description: "Full procurement lifecycle view" },
];

// ─── Set-Aside Status (Filter 3) ───
// Maps to Sec. 60.404(d)(4) and 60.458(6) — SBD program consideration

export interface SetAsideOption {
  value: string;
  label: string;
  description: string;
}

export const SET_ASIDE_OPTIONS: SetAsideOption[] = [
  { value: "SBA", label: "Small Business", description: "SBA Small Business Set-Aside" },
  { value: "HZC", label: "HUBZone", description: "Historically Underutilized Business Zones" },
  { value: "8A", label: "8(a)", description: "SBA 8(a) Business Development" },
  { value: "SDVOSBC", label: "Service-Disabled Veteran-Owned", description: "SDVOSB Set-Aside" },
  { value: "WOSB", label: "Woman-Owned", description: "Women-Owned Small Business" },
  { value: "", label: "Unrestricted", description: "No set-aside restriction" },
];

// ─── State / Geography (Filter 4) ───
// Sec. 60.458(7) total long-term cost includes mobilization/logistics

export interface StateOption {
  code: string;
  label: string;
}

export const GULF_COAST_STATES: StateOption[] = [
  { code: "TX", label: "Texas" },
  { code: "LA", label: "Louisiana" },
  { code: "MS", label: "Mississippi" },
  { code: "AL", label: "Alabama" },
  { code: "FL", label: "Florida" },
];

export const ALL_STATES: StateOption[] = [
  { code: "AL", label: "Alabama" }, { code: "AK", label: "Alaska" }, { code: "AZ", label: "Arizona" },
  { code: "AR", label: "Arkansas" }, { code: "CA", label: "California" }, { code: "CO", label: "Colorado" },
  { code: "CT", label: "Connecticut" }, { code: "DE", label: "Delaware" }, { code: "FL", label: "Florida" },
  { code: "GA", label: "Georgia" }, { code: "HI", label: "Hawaii" }, { code: "ID", label: "Idaho" },
  { code: "IL", label: "Illinois" }, { code: "IN", label: "Indiana" }, { code: "IA", label: "Iowa" },
  { code: "KS", label: "Kansas" }, { code: "KY", label: "Kentucky" }, { code: "LA", label: "Louisiana" },
  { code: "ME", label: "Maine" }, { code: "MD", label: "Maryland" }, { code: "MA", label: "Massachusetts" },
  { code: "MI", label: "Michigan" }, { code: "MN", label: "Minnesota" }, { code: "MS", label: "Mississippi" },
  { code: "MO", label: "Missouri" }, { code: "MT", label: "Montana" }, { code: "NE", label: "Nebraska" },
  { code: "NV", label: "Nevada" }, { code: "NH", label: "New Hampshire" }, { code: "NJ", label: "New Jersey" },
  { code: "NM", label: "New Mexico" }, { code: "NY", label: "New York" }, { code: "NC", label: "North Carolina" },
  { code: "ND", label: "North Dakota" }, { code: "OH", label: "Ohio" }, { code: "OK", label: "Oklahoma" },
  { code: "OR", label: "Oregon" }, { code: "PA", label: "Pennsylvania" }, { code: "RI", label: "Rhode Island" },
  { code: "SC", label: "South Carolina" }, { code: "SD", label: "South Dakota" }, { code: "TN", label: "Tennessee" },
  { code: "TX", label: "Texas" }, { code: "UT", label: "Utah" }, { code: "VT", label: "Vermont" },
  { code: "VA", label: "Virginia" }, { code: "WA", label: "Washington" }, { code: "WV", label: "West Virginia" },
  { code: "WI", label: "Wisconsin" }, { code: "WY", label: "Wyoming" }, { code: "DC", label: "District of Columbia" },
];

// ─── Awarding Agency (Filter 5) ───
// Strategic filter — agency experience signals specific federal compliance knowledge

export interface AgencyOption {
  value: string;
  label: string;
  shortLabel: string;
  description: string;
}

export const PRESET_AGENCIES: AgencyOption[] = [
  { value: "USACE", label: "U.S. Army Corps of Engineers", shortLabel: "USACE", description: "Federal waterway compliance, Sec. 408 permits" },
  { value: "MARAD", label: "Maritime Administration", shortLabel: "MARAD", description: "Port infrastructure funding, Buy America" },
  { value: "DOT", label: "Department of Transportation", shortLabel: "DOT", description: "NEPA, transportation planning" },
  { value: "EPA", label: "Environmental Protection Agency", shortLabel: "EPA", description: "Environmental compliance, remediation" },
  { value: "DHS", label: "Department of Homeland Security", shortLabel: "DHS/USCG", description: "Coast Guard, maritime security" },
];

// ─── Contract Value Range (Filter 6) ───
// Ties to Subchapter N procurement thresholds

export interface ValueRange {
  min: number | null;
  max: number | null;
}

export const PROCUREMENT_TIERS = [
  { label: "Under $50K — Routine Purchase (Sec. 60.403)", min: 0, max: 50_000 },
  { label: "$50K–$100K — Delegated Authority", min: 50_000, max: 100_000 },
  { label: "Over $100K — Full Competitive (Sec. 60.404/405)", min: 100_000, max: null },
] as const;

// ─── Date Range (Filter 7) ───

export interface DateRange {
  from: string; // ISO date string YYYY-MM-DD
  to: string;
}

export function getDefaultDateRange(): DateRange {
  const to = new Date();
  const from = new Date();
  from.setMonth(from.getMonth() - 24);
  return {
    from: from.toISOString().split("T")[0],
    to: to.toISOString().split("T")[0],
  };
}

// ─── PSC Codes (Filter 8) ───
// Product Service Codes complement NAICS — what was actually purchased

export interface PscOption {
  code: string;
  label: string;
}

export const PORT_PSC_OPTIONS: PscOption[] = [
  { code: "Y1LZ", label: "Construction of Waterways/Harbors" },
  { code: "Y1JZ", label: "Construction of Highways/Roads" },
  { code: "Y1KZ", label: "Construction of Dams" },
  { code: "Y1PZ", label: "Construction of Utilities" },
  { code: "Z2JZ", label: "Repair of Highways/Roads" },
  { code: "Z2LZ", label: "Repair of Waterways/Harbors" },
  { code: "F108", label: "Environmental Systems Protection" },
  { code: "C219", label: "Architect-Engineering: Marine" },
  { code: "C211", label: "Architect-Engineering: Structural" },
  { code: "R425", label: "Engineering & Technical Services" },
  { code: "S208", label: "Housekeeping: Warehousing & Distribution" },
  { code: "V119", label: "Transportation: Marine Charter" },
];

// ─── Combined Filter State ───

export interface VendorSearchFilters {
  naicsCodes: string[];
  noticeType: NoticeType;
  setAsides: string[];
  states: string[];
  agencies: string[];
  agencySearch: string;
  valueRange: ValueRange;
  dateRange: DateRange;
  pscCodes: string[];
}

export function getDefaultFilters(): VendorSearchFilters {
  return {
    naicsCodes: ["488310", "237990", "541330"],
    noticeType: "Award Notice",
    setAsides: [],
    states: ["TX"],
    agencies: [],
    agencySearch: "",
    valueRange: { min: null, max: null },
    dateRange: getDefaultDateRange(),
    pscCodes: [],
  };
}

// ─── Enriched Vendor (result type) ───

export interface ComplianceSummary {
  procurementTier: "routine" | "delegated" | "competitive";
  procurementTierLabel: string;
  sbdQualification: string | null;
  agencyBadges: string[];
  samRegistrationActive: boolean;
  bondCapacitySignal: "high" | "medium" | "low" | "unknown";
  bondCapacityLabel: string;
  maxContractValue: number;
}

export interface EnrichedVendor {
  id: string;
  name: string;
  dba: string | null;
  state: string;
  city: string;
  naicsCodes: string[];
  pscCodes: string[];
  totalAwardValue: number;
  awardCount: number;
  maxSingleAward: number;
  agencies: string[];
  recentAwards: {
    title: string;
    amount: number;
    date: string;
    agency: string;
    solicitationNumber: string;
  }[];
  setAsideTypes: string[];
  samActive: boolean;
  compliance: ComplianceSummary;
}
