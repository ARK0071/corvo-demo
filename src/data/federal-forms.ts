/**
 * Standard Federal Grant Application Forms Registry
 *
 * Most federal grants reuse the same ~15 forms. This registry
 * allows matching form numbers found in NOFOs to download links
 * without an AI call.
 */

export interface FederalForm {
  id: string;
  number: string;
  name: string;
  description: string;
  url: string;
  family: string;
  commonlyRequired: boolean;
}

export const FEDERAL_FORMS: FederalForm[] = [
  {
    id: "sf424",
    number: "SF-424",
    name: "Application for Federal Assistance",
    description: "Standard cover form for all federal grant applications. Collects applicant info, project summary, budget totals, and certifications.",
    url: "https://www.grants.gov/forms/sf-424-family",
    family: "SF-424",
    commonlyRequired: true,
  },
  {
    id: "sf424a",
    number: "SF-424A",
    name: "Budget Information — Non-Construction Programs",
    description: "Detailed budget breakdown by object class category for non-construction grants.",
    url: "https://www.grants.gov/forms/sf-424-family",
    family: "SF-424",
    commonlyRequired: true,
  },
  {
    id: "sf424b",
    number: "SF-424B",
    name: "Assurances — Non-Construction Programs",
    description: "Certifications and assurances required for non-construction grants.",
    url: "https://www.grants.gov/forms/sf-424-family",
    family: "SF-424",
    commonlyRequired: false,
  },
  {
    id: "sf424c",
    number: "SF-424C",
    name: "Budget Information — Construction Programs",
    description: "Detailed construction budget breakdown by category (administration, site work, equipment, contingencies).",
    url: "https://www.grants.gov/forms/sf-424-family",
    family: "SF-424",
    commonlyRequired: true,
  },
  {
    id: "sf424d",
    number: "SF-424D",
    name: "Assurances — Construction Programs",
    description: "Certifications and assurances required for construction grants.",
    url: "https://www.grants.gov/forms/sf-424-family",
    family: "SF-424",
    commonlyRequired: false,
  },
  {
    id: "sf-lll",
    number: "SF-LLL",
    name: "Disclosure of Lobbying Activities",
    description: "Disclosure of any lobbying activities related to the grant application.",
    url: "https://www.grants.gov/forms/sf-lll",
    family: "SF-LLL",
    commonlyRequired: true,
  },
  {
    id: "sf425",
    number: "SF-425",
    name: "Federal Financial Report",
    description: "Financial status report used during grant performance period.",
    url: "https://www.grants.gov/forms/sf-425",
    family: "SF-425",
    commonlyRequired: false,
  },
  {
    id: "sf270",
    number: "SF-270",
    name: "Request for Advance or Reimbursement",
    description: "Form for requesting payment draws against a federal grant.",
    url: "https://www.grants.gov/forms/sf-270",
    family: "SF-270",
    commonlyRequired: false,
  },
  {
    id: "cd511",
    number: "CD-511",
    name: "Certification Regarding Lobbying",
    description: "Certifies that no federal funds have been used for lobbying purposes.",
    url: "https://www.grants.gov/forms/cd-511",
    family: "CD",
    commonlyRequired: true,
  },
  {
    id: "sflll-a",
    number: "SF-LLL-A",
    name: "Disclosure of Lobbying Activities Continuation Sheet",
    description: "Continuation sheet for SF-LLL when additional space is needed.",
    url: "https://www.grants.gov/forms/sf-lll",
    family: "SF-LLL",
    commonlyRequired: false,
  },
  {
    id: "sf428",
    number: "SF-428",
    name: "Tangible Personal Property Report",
    description: "Reports on property acquired with federal grant funds.",
    url: "https://www.grants.gov/forms/sf-428",
    family: "SF-428",
    commonlyRequired: false,
  },
  {
    id: "bca-template",
    number: "BCA",
    name: "Benefit-Cost Analysis Spreadsheet",
    description: "DOT-provided BCA template using approved discount rates and methodology.",
    url: "https://www.transportation.gov/policy-initiatives/benefit-cost-analysis",
    family: "DOT",
    commonlyRequired: false,
  },
];

/**
 * Match form numbers found in a text against the registry.
 * Returns matched forms with their details and download links.
 */
export function matchFormsInText(text: string): FederalForm[] {
  const upper = text.toUpperCase();
  const matched = new Set<string>();
  const results: FederalForm[] = [];

  for (const form of FEDERAL_FORMS) {
    // Match the form number (e.g., "SF-424", "SF 424", "SF424")
    const variations = [
      form.number.toUpperCase(),
      form.number.toUpperCase().replace("-", " "),
      form.number.toUpperCase().replace("-", ""),
    ];

    for (const v of variations) {
      if (upper.includes(v) && !matched.has(form.id)) {
        matched.add(form.id);
        results.push(form);
        break;
      }
    }
  }

  return results;
}

/**
 * Get all commonly required forms (for when no NOFO is available)
 */
export function getCommonForms(): FederalForm[] {
  return FEDERAL_FORMS.filter((f) => f.commonlyRequired);
}
