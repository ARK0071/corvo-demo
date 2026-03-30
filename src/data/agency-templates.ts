/**
 * Agency-Specific Report Templates
 *
 * Defines reporting requirements by federal awarding agency.
 * Each template specifies report types, frequencies, submission portals,
 * and any agency-specific supplemental fields.
 *
 * Referenced agencies match the awards in the Port Freeport seed data.
 */

import type { ReportType, ReportFrequency } from "./reporting";

// ─── Types ───

export type AgencyCode = "MARAD" | "FTA" | "FAA" | "FHWA" | "FRA" | "EPA" | "TxDOT";

export interface AgencyReportType {
  type: ReportType;
  frequency: ReportFrequency;
  customTitle?: string;
  dueAfterDays: number; // days after period end
}

export interface AgencyField {
  id: string;
  label: string;
  fieldType: "text" | "number" | "date" | "select";
  required: boolean;
  helpText: string;
  options?: string[]; // for select type
}

export interface AgencyReportTemplate {
  agencyCode: AgencyCode;
  agencyName: string;
  reportTypes: AgencyReportType[];
  submissionPortal: string;
  submissionMethod: string;
  additionalFields: AgencyField[];
  instructions: string;
  specialRequirements: string[];
}

// ─── Agency Template Registry ───

const AGENCY_TEMPLATES: AgencyReportTemplate[] = [
  {
    agencyCode: "MARAD",
    agencyName: "Maritime Administration",
    reportTypes: [
      { type: "sf425", frequency: "quarterly", dueAfterDays: 30 },
      { type: "progress", frequency: "quarterly", customTitle: "MARAD Quarterly Performance Report", dueAfterDays: 30 },
    ],
    submissionPortal: "MARAD Grants Online",
    submissionMethod: "Upload via MARAD Grants Online portal",
    additionalFields: [
      { id: "marad-jobs", label: "Jobs Created/Retained", fieldType: "number", required: true, helpText: "Direct and indirect jobs attributable to the project this period" },
      { id: "marad-cargo", label: "Cargo Throughput Impact (TEUs)", fieldType: "number", required: false, helpText: "Estimated change in container throughput if applicable" },
      { id: "marad-vessel-calls", label: "Vessel Call Impact", fieldType: "number", required: false, helpText: "Change in vessel calls attributable to project improvements" },
      { id: "marad-safety", label: "Safety Incidents", fieldType: "number", required: true, helpText: "Number of safety incidents on project site this period" },
    ],
    instructions: "Submit SF-425 and performance report via MARAD Grants Online within 30 days of quarter end. Include project photos with each progress report.",
    specialRequirements: [
      "Buy America/BABA compliance documentation required with each progress report",
      "Davis-Bacon certified payrolls required for construction activities",
      "Project photos required with each quarterly report",
      "Benefit-Cost Analysis update required at 50% and 100% completion",
    ],
  },
  {
    agencyCode: "FRA",
    agencyName: "Federal Railroad Administration",
    reportTypes: [
      { type: "sf425", frequency: "quarterly", dueAfterDays: 30 },
      { type: "progress", frequency: "quarterly", customTitle: "FRA Quarterly Progress Report", dueAfterDays: 30 },
    ],
    submissionPortal: "FRA Grants Management System",
    submissionMethod: "Upload via FRA grants portal",
    additionalFields: [
      { id: "fra-track-miles", label: "Track Miles Improved", fieldType: "number", required: false, helpText: "Miles of track improved or constructed this period" },
      { id: "fra-crossings", label: "Grade Crossings Improved", fieldType: "number", required: false, helpText: "Number of grade crossings improved" },
    ],
    instructions: "Submit quarterly reports within 30 days of quarter end. Include rail safety metrics.",
    specialRequirements: [
      "FRA safety compliance documentation",
      "Railroad coordination agreements must be on file",
      "Buy America compliance for track materials",
    ],
  },
  {
    agencyCode: "EPA",
    agencyName: "Environmental Protection Agency",
    reportTypes: [
      { type: "sf425", frequency: "semi_annual", dueAfterDays: 30 },
      { type: "progress", frequency: "semi_annual", customTitle: "EPA Semi-Annual Progress Report", dueAfterDays: 30 },
    ],
    submissionPortal: "EPA Grants Management System (GMS)",
    submissionMethod: "Upload via EPA GMS",
    additionalFields: [
      { id: "epa-emissions", label: "Emissions Reduced (tons CO2e)", fieldType: "number", required: true, helpText: "Estimated greenhouse gas emissions reduced this period" },
      { id: "epa-community", label: "Community Engagement Events", fieldType: "number", required: true, helpText: "Number of community engagement or outreach events held" },
      { id: "epa-ej", label: "Environmental Justice Impact", fieldType: "text", required: false, helpText: "Describe any environmental justice benefits or impacts" },
    ],
    instructions: "Submit semi-annual reports via EPA GMS within 30 days of period end. Include emissions data and community engagement metrics.",
    specialRequirements: [
      "NEPA documentation must be current",
      "Emissions baseline must be established before equipment deployment",
      "Community benefit plan progress required semi-annually",
    ],
  },
  {
    agencyCode: "FTA",
    agencyName: "Federal Transit Administration",
    reportTypes: [
      { type: "sf425", frequency: "quarterly", dueAfterDays: 30 },
      { type: "progress", frequency: "quarterly", customTitle: "FTA Milestone Progress Report", dueAfterDays: 30 },
    ],
    submissionPortal: "TrAMS (Transit Award Management System)",
    submissionMethod: "Submit via TrAMS",
    additionalFields: [
      { id: "fta-ridership", label: "Ridership Impact", fieldType: "number", required: false, helpText: "Change in ridership if applicable" },
      { id: "fta-ada", label: "ADA Compliance Status", fieldType: "select", required: true, helpText: "Current ADA compliance status", options: ["Compliant", "In Progress", "Remediation Needed"] },
    ],
    instructions: "Submit via TrAMS within 30 days of quarter end. FTA milestone reports require updated project schedules.",
    specialRequirements: [
      "Title VI compliance report required annually",
      "DBE goal tracking required quarterly",
      "Buy America pre-award and post-delivery reviews",
      "ADA compliance documentation for all infrastructure",
    ],
  },
  {
    agencyCode: "FAA",
    agencyName: "Federal Aviation Administration",
    reportTypes: [
      { type: "sf425", frequency: "quarterly", dueAfterDays: 30 },
      { type: "progress", frequency: "quarterly", customTitle: "FAA Quarterly Status Report", dueAfterDays: 30 },
    ],
    submissionPortal: "FAA Delphi eInvoicing System",
    submissionMethod: "Submit via Delphi eInvoicing",
    additionalFields: [
      { id: "faa-ops-impact", label: "Operations Impact", fieldType: "text", required: false, helpText: "Impact on airport operations during construction" },
    ],
    instructions: "Submit via FAA Delphi system. Include updated construction schedule with each quarterly report.",
    specialRequirements: [
      "AIP grant assurances must be current",
      "Buy American preferences per 49 USC 50101",
      "DBE program compliance",
      "Environmental review documentation",
    ],
  },
  {
    agencyCode: "FHWA",
    agencyName: "Federal Highway Administration",
    reportTypes: [
      { type: "sf425", frequency: "quarterly", dueAfterDays: 30 },
      { type: "progress", frequency: "quarterly", customTitle: "FHWA Quarterly Progress Report", dueAfterDays: 30 },
    ],
    submissionPortal: "FMIS (Fiscal Management Information System)",
    submissionMethod: "Submit via State DOT / FMIS",
    additionalFields: [
      { id: "fhwa-lane-miles", label: "Lane Miles Improved", fieldType: "number", required: false, helpText: "Lane miles constructed or improved" },
    ],
    instructions: "Submit through State DOT to FHWA via FMIS. Davis-Bacon compliance required for all construction.",
    specialRequirements: [
      "Davis-Bacon prevailing wage compliance",
      "NEPA environmental clearance required before construction",
      "Buy America for steel and iron",
      "DBE program requirements per 49 CFR Part 26",
    ],
  },
  {
    agencyCode: "TxDOT",
    agencyName: "Texas Department of Transportation",
    reportTypes: [
      { type: "sf425", frequency: "semi_annual", dueAfterDays: 45 },
      { type: "progress", frequency: "semi_annual", customTitle: "TxDOT Semi-Annual Progress Report", dueAfterDays: 45 },
    ],
    submissionPortal: "TxDOT eGrants",
    submissionMethod: "Upload via TxDOT eGrants portal",
    additionalFields: [
      { id: "txdot-huc", label: "HUB Utilization (%)", fieldType: "number", required: true, helpText: "Historically Underutilized Business utilization percentage" },
      { id: "txdot-safety", label: "Safety Metrics", fieldType: "text", required: false, helpText: "Report on safety performance and any incidents" },
    ],
    instructions: "Submit semi-annual reports via TxDOT eGrants within 45 days of period end. Include HUB utilization data.",
    specialRequirements: [
      "Texas Government Code Chapter 2161 HUB requirements",
      "Texas Water Code Chapter 60 compliance",
      "State match documentation required with each report",
      "Quarterly expenditure reports to TxDOT Grants Office",
    ],
  },
];

// ─── Public API ───

export function getAgencyTemplate(awardingAgency: string): AgencyReportTemplate | null {
  const agencyLower = awardingAgency.toLowerCase();

  for (const template of AGENCY_TEMPLATES) {
    if (agencyLower.includes(template.agencyName.toLowerCase())) return template;
    if (agencyLower.includes(template.agencyCode.toLowerCase())) return template;
  }

  // Check for common patterns
  if (agencyLower.includes("maritime")) return AGENCY_TEMPLATES.find((t) => t.agencyCode === "MARAD") || null;
  if (agencyLower.includes("railroad")) return AGENCY_TEMPLATES.find((t) => t.agencyCode === "FRA") || null;
  if (agencyLower.includes("transit")) return AGENCY_TEMPLATES.find((t) => t.agencyCode === "FTA") || null;
  if (agencyLower.includes("aviation")) return AGENCY_TEMPLATES.find((t) => t.agencyCode === "FAA") || null;
  if (agencyLower.includes("highway")) return AGENCY_TEMPLATES.find((t) => t.agencyCode === "FHWA") || null;
  if (agencyLower.includes("texas")) return AGENCY_TEMPLATES.find((t) => t.agencyCode === "TxDOT") || null;
  if (agencyLower.includes("environmental protection")) return AGENCY_TEMPLATES.find((t) => t.agencyCode === "EPA") || null;

  return null;
}

export function getAllAgencyTemplates(): AgencyReportTemplate[] {
  return AGENCY_TEMPLATES;
}

export function getAgencyTemplateByCode(code: AgencyCode): AgencyReportTemplate | null {
  return AGENCY_TEMPLATES.find((t) => t.agencyCode === code) || null;
}
