/**
 * Standard Federal Grant Application Forms Registry
 *
 * Comprehensive registry of federal grant forms with download links,
 * requirement levels, and text-matching capabilities.
 */

export interface FederalForm {
  id: string;
  number: string;
  name: string;
  description: string;
  url: string;
  family: string;
  commonlyRequired: boolean;
  requiredLevel: "required" | "if-applicable" | "post-award";
}

export const FEDERAL_FORMS: FederalForm[] = [
  // ─── SF-424 Family (Core Application Forms) ───
  {
    id: "sf424",
    number: "SF-424",
    name: "Application for Federal Assistance",
    description: "Standard cover form for all federal grant applications. Collects applicant info, project summary, budget totals, and certifications.",
    url: "https://www.grants.gov/forms/forms-repository/sf-424-family",
    family: "SF-424",
    commonlyRequired: true,
    requiredLevel: "required",
  },
  {
    id: "sf424a",
    number: "SF-424A",
    name: "Budget Information, Non-Construction Programs",
    description: "Detailed budget breakdown by object class category for non-construction grants.",
    url: "https://www.grants.gov/forms/forms-repository/sf-424-family",
    family: "SF-424",
    commonlyRequired: true,
    requiredLevel: "required",
  },
  {
    id: "sf424b",
    number: "SF-424B",
    name: "Assurances, Non-Construction Programs",
    description: "Certifications and assurances required for non-construction grants.",
    url: "https://www.grants.gov/forms/forms-repository/sf-424-family",
    family: "SF-424",
    commonlyRequired: false,
    requiredLevel: "required",
  },
  {
    id: "sf424c",
    number: "SF-424C",
    name: "Budget Information, Construction Programs",
    description: "Detailed construction budget breakdown by category (administration, site work, equipment, contingencies).",
    url: "https://www.grants.gov/forms/forms-repository/sf-424-family",
    family: "SF-424",
    commonlyRequired: true,
    requiredLevel: "required",
  },
  {
    id: "sf424d",
    number: "SF-424D",
    name: "Assurances, Construction Programs",
    description: "Certifications and assurances required for construction grants.",
    url: "https://www.grants.gov/forms/forms-repository/sf-424-family",
    family: "SF-424",
    commonlyRequired: false,
    requiredLevel: "required",
  },
  {
    id: "sf424-supp",
    number: "SF-424 Supplement",
    name: "Survey on Ensuring Equal Opportunity for Applicants",
    description: "Optional demographic survey for grant applicant organizations.",
    url: "https://www.grants.gov/forms/forms-repository/sf-424-family",
    family: "SF-424",
    commonlyRequired: false,
    requiredLevel: "if-applicable",
  },

  // ─── Lobbying & Certification Forms ───
  {
    id: "sf-lll",
    number: "SF-LLL",
    name: "Disclosure of Lobbying Activities",
    description: "Disclosure of any lobbying activities related to the grant application.",
    url: "https://www.grants.gov/forms/forms-repository/sf-424-family",
    family: "SF-LLL",
    commonlyRequired: true,
    requiredLevel: "required",
  },
  {
    id: "sflll-a",
    number: "SF-LLL-A",
    name: "Disclosure of Lobbying Activities Continuation Sheet",
    description: "Continuation sheet for SF-LLL when additional space is needed.",
    url: "https://www.grants.gov/forms/forms-repository/sf-424-family",
    family: "SF-LLL",
    commonlyRequired: false,
    requiredLevel: "if-applicable",
  },
  {
    id: "cd511",
    number: "CD-511",
    name: "Certification Regarding Lobbying",
    description: "Certifies that no federal funds have been used for lobbying purposes.",
    url: "https://www.grants.gov/forms/forms-repository/sf-424-family",
    family: "CD",
    commonlyRequired: true,
    requiredLevel: "required",
  },
  {
    id: "lobbying-cert",
    number: "Lobbying Certification",
    name: "Certification for Contracts, Grants, Loans, and Cooperative Agreements",
    description: "Standard certification that applicant has not used federal funds to pay for lobbying Congress or federal agencies.",
    url: "https://www.grants.gov/forms/forms-repository/sf-424-family",
    family: "Certification",
    commonlyRequired: false,
    requiredLevel: "required",
  },
  {
    id: "debarment-cert",
    number: "Debarment Certification",
    name: "Certification Regarding Debarment, Suspension, and Other Responsibility Matters",
    description: "Certifies that applicant and principals are not debarred, suspended, or proposed for debarment by any federal agency.",
    url: "https://www.grants.gov/forms/forms-repository",
    family: "Certification",
    commonlyRequired: false,
    requiredLevel: "required",
  },
  {
    id: "drug-free",
    number: "Drug-Free Workplace",
    name: "Drug-Free Workplace Certification",
    description: "Certifies that applicant will provide a drug-free workplace as required by the Drug-Free Workplace Act of 1988.",
    url: "https://www.grants.gov/forms/forms-repository",
    family: "Certification",
    commonlyRequired: false,
    requiredLevel: "if-applicable",
  },
  {
    id: "civil-rights",
    number: "Civil Rights Assurance",
    name: "Assurance of Compliance with Civil Rights Requirements",
    description: "Assures compliance with Title VI of the Civil Rights Act, Section 504, Title IX, and Age Discrimination Act.",
    url: "https://www.grants.gov/forms/forms-repository",
    family: "Certification",
    commonlyRequired: false,
    requiredLevel: "required",
  },

  // ─── Narrative & Supporting Forms ───
  {
    id: "key-contacts",
    number: "Key Contacts",
    name: "Key Contacts Form",
    description: "Identifies the authorized representative, project director, and other key personnel for the grant application.",
    url: "https://www.grants.gov/forms/forms-repository/sf-424-family",
    family: "SF-424",
    commonlyRequired: true,
    requiredLevel: "required",
  },
  {
    id: "project-abstract",
    number: "Project Abstract",
    name: "Project Abstract Summary",
    description: "One-page summary of the proposed project including objectives, methods, and expected outcomes.",
    url: "https://www.grants.gov/forms/forms-repository",
    family: "Narrative",
    commonlyRequired: true,
    requiredLevel: "required",
  },
  {
    id: "budget-narrative",
    number: "Budget Narrative",
    name: "Budget Narrative / Justification",
    description: "Detailed written justification for each budget line item explaining costs and necessity for the project.",
    url: "https://www.grants.gov/forms/forms-repository",
    family: "Budget",
    commonlyRequired: true,
    requiredLevel: "required",
  },

  // ─── Registration & Administrative ───
  {
    id: "sam-registration",
    number: "SAM Registration",
    name: "SAM.gov Active Registration",
    description: "Applicants must have active registration in the System for Award Management (SAM.gov) with a valid UEI number.",
    url: "https://sam.gov",
    family: "Registration",
    commonlyRequired: true,
    requiredLevel: "required",
  },
  {
    id: "indirect-cost",
    number: "Indirect Cost Rate",
    name: "Negotiated Indirect Cost Rate Agreement",
    description: "Documentation of federally-negotiated indirect cost rate. Required if claiming indirect costs in the budget.",
    url: "https://www.grants.gov/forms/forms-repository",
    family: "Financial",
    commonlyRequired: false,
    requiredLevel: "if-applicable",
  },

  // ─── Environmental Forms ───
  {
    id: "nepa-ce",
    number: "NEPA CE",
    name: "Categorical Exclusion Documentation",
    description: "Documentation supporting a categorical exclusion from detailed NEPA environmental review.",
    url: "https://www.grants.gov/forms/forms-repository",
    family: "Environmental",
    commonlyRequired: false,
    requiredLevel: "if-applicable",
  },
  {
    id: "nepa-ea",
    number: "NEPA EA/FONSI",
    name: "Environmental Assessment / Finding of No Significant Impact",
    description: "Environmental assessment document and finding for projects not categorically excluded but below EIS threshold.",
    url: "https://www.grants.gov/forms/forms-repository",
    family: "Environmental",
    commonlyRequired: false,
    requiredLevel: "if-applicable",
  },

  // ─── DOT-Specific ───
  {
    id: "bca-template",
    number: "BCA",
    name: "Benefit-Cost Analysis Spreadsheet",
    description: "DOT-provided BCA template using approved discount rates and methodology.",
    url: "https://www.transportation.gov/policy-initiatives/benefit-cost-analysis",
    family: "DOT",
    commonlyRequired: false,
    requiredLevel: "if-applicable",
  },

  // ─── Post-Award Reporting ───
  {
    id: "sf425",
    number: "SF-425",
    name: "Federal Financial Report",
    description: "Financial status report used during grant performance period.",
    url: "https://www.grants.gov/forms/forms-repository/post-award-reporting-forms",
    family: "SF-425",
    commonlyRequired: false,
    requiredLevel: "post-award",
  },
  {
    id: "sf270",
    number: "SF-270",
    name: "Request for Advance or Reimbursement",
    description: "Form for requesting payment draws against a federal grant.",
    url: "https://www.grants.gov/forms/forms-repository/post-award-reporting-forms",
    family: "SF-270",
    commonlyRequired: false,
    requiredLevel: "post-award",
  },
  {
    id: "sf428",
    number: "SF-428",
    name: "Tangible Personal Property Report",
    description: "Reports on property acquired with federal grant funds.",
    url: "https://www.grants.gov/forms/forms-repository/post-award-reporting-forms",
    family: "SF-428",
    commonlyRequired: false,
    requiredLevel: "post-award",
  },
];

/**
 * Match form numbers found in a text against the registry.
 * Returns matched forms with their details and download links.
 * Matches by form number variations and full form names.
 */
export function matchFormsInText(text: string): FederalForm[] {
  const upper = text.toUpperCase();
  const matched = new Set<string>();
  const results: FederalForm[] = [];

  for (const form of FEDERAL_FORMS) {
    if (matched.has(form.id)) continue;

    // Match the form number (e.g., "SF-424", "SF 424", "SF424")
    const variations = [
      form.number.toUpperCase(),
      form.number.toUpperCase().replace(/-/g, " "),
      form.number.toUpperCase().replace(/-/g, ""),
      // Also match "Standard Form 424" style references
      form.number.toUpperCase().replace("SF-", "STANDARD FORM "),
      form.number.toUpperCase().replace("SF-", "FORM SF-"),
    ];

    for (const v of variations) {
      if (upper.includes(v) && !matched.has(form.id)) {
        matched.add(form.id);
        results.push(form);
        break;
      }
    }

    // Also match by full form name (for longer, distinctive names)
    if (!matched.has(form.id) && form.name.length > 20) {
      if (upper.includes(form.name.toUpperCase())) {
        matched.add(form.id);
        results.push(form);
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

/**
 * Get all valid form numbers for AI prompt constraints
 */
export function getValidFormNumbers(): string[] {
  return FEDERAL_FORMS.map((f) => f.number);
}
