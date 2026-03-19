/**
 * Grant Application Requirements
 *
 * Defines the required sections, evaluation criteria, scoring rubric,
 * and word limits for specific grant programs. This data drives the
 * AI-powered application drafting.
 */

export interface GrantSection {
  id: string;
  title: string;
  description: string;
  maxWords: number;
  weight: number; // percentage of total score
  evaluationCriteria: string[];
  requiredElements: string[];
}

export interface RequiredAttachment {
  id: string;
  name: string;
  description: string;
  required: boolean;
  fileTypes: string[];
}

export interface GrantRequirements {
  grantId: string;
  programName: string;
  agency: string;
  nofoNumber: string;
  fiscalYear: number;
  totalFunding: number;
  maxAward: number;
  minAward: number;
  costShareRequired: boolean;
  costShareMinimum: number; // percentage
  applicationDeadline: string;
  sections: GrantSection[];
  requiredAttachments: RequiredAttachment[];
  evaluationProcess: string;
  selectionPriorities: string[];
}

/**
 * PIDP FY2026 — Port Infrastructure Development Program
 * MARAD / U.S. Department of Transportation
 */
export const PIDP_FY2026: GrantRequirements = {
  grantId: "pidp-fy2026",
  programName: "Port Infrastructure Development Program (PIDP) FY2026",
  agency: "Maritime Administration (MARAD), U.S. Department of Transportation",
  nofoNumber: "MARAD-PIDP-FY2026-001",
  fiscalYear: 2026,
  totalFunding: 750_000_000,
  maxAward: 150_000_000,
  minAward: 1_000_000,
  costShareRequired: true,
  costShareMinimum: 20,
  applicationDeadline: "2026-08-15",
  evaluationProcess:
    "Applications are evaluated by a multi-disciplinary review panel using the criteria below. Each section is scored independently and weighted according to the percentages shown. MARAD reserves the right to request additional information during the review period. Final selections are made by the MARAD Administrator in consultation with the Secretary of Transportation.",

  selectionPriorities: [
    "Projects that improve the safety, efficiency, or reliability of goods movement through ports",
    "Projects in or benefiting disadvantaged communities (Justice40)",
    "Projects that reduce emissions and address climate change",
    "Projects that improve port resilience to extreme weather and climate impacts",
    "Projects that advance workforce development and create good-paying jobs",
    "Projects that address supply chain vulnerabilities and improve national freight network performance",
  ],

  sections: [
    {
      id: "project-narrative",
      title: "Project Narrative",
      description:
        "Provide a comprehensive description of the proposed project, including the problem or need being addressed, the proposed solution, project scope, and expected outcomes. Explain how the project fits within the applicant's strategic plan and the broader national freight network.",
      maxWords: 5000,
      weight: 30,
      evaluationCriteria: [
        "Clarity and specificity of project description",
        "Strength of the problem statement and needs assessment",
        "Alignment with PIDP program goals and DOT strategic objectives",
        "Feasibility and technical soundness of the proposed approach",
        "Connection to the applicant's capital improvement plan and strategic priorities",
      ],
      requiredElements: [
        "Project title and location",
        "Problem statement with supporting data",
        "Detailed project description and scope of work",
        "Project goals and measurable objectives",
        "Alignment with PIDP statutory priorities",
        "Connection to National Multimodal Freight Network",
        "Timeline and key milestones",
      ],
    },
    {
      id: "benefit-cost-analysis",
      title: "Benefit-Cost Analysis (BCA)",
      description:
        "Provide a quantitative assessment of the project's benefits relative to its costs, using DOT-approved methodologies. Include both quantified and qualitative benefits. The BCA should cover a minimum 20-year analysis period and use a 3.1% real discount rate per current DOT guidance.",
      maxWords: 3000,
      weight: 25,
      evaluationCriteria: [
        "Rigor and credibility of the economic analysis methodology",
        "Reasonableness of assumptions and inputs",
        "Magnitude of net benefits (benefit-cost ratio)",
        "Quality of data sources and documentation",
        "Inclusion of both quantified and qualitative benefits",
      ],
      requiredElements: [
        "Project costs (capital, O&M, lifecycle)",
        "Quantified benefits (safety, economic competitiveness, mobility, environmental)",
        "Benefit-Cost Ratio and Net Present Value",
        "Discount rate and analysis period",
        "Sensitivity analysis",
        "Description of qualitative benefits not captured in BCR",
        "Data sources and methodology documentation",
      ],
    },
    {
      id: "project-readiness",
      title: "Project Readiness and Management",
      description:
        "Demonstrate the applicant's capacity to initiate and complete the project on time and within budget. Address environmental review status, permitting requirements, land acquisition, design status, procurement approach, and project management capabilities.",
      maxWords: 2500,
      weight: 20,
      evaluationCriteria: [
        "NEPA and environmental review status",
        "Permitting and regulatory approval progress",
        "Design completion level (conceptual, preliminary, final)",
        "Project delivery method and procurement approach",
        "Management capacity and track record",
        "Risk mitigation strategy",
      ],
      requiredElements: [
        "NEPA status and environmental document type",
        "Required permits and their status",
        "Design completion percentage",
        "Right-of-way and land acquisition status",
        "Project delivery method",
        "Project management team qualifications",
        "Risk register and mitigation approach",
        "Past performance on federal grants",
      ],
    },
    {
      id: "environmental-review",
      title: "Environmental Review and Sustainability",
      description:
        "Describe the project's environmental impacts and benefits. Address NEPA compliance status, emissions impacts, sustainability features, and how the project advances environmental justice and climate goals.",
      maxWords: 2000,
      weight: 10,
      evaluationCriteria: [
        "Environmental benefits (emissions reduction, air quality improvement)",
        "Climate change mitigation and adaptation features",
        "Environmental justice considerations",
        "Sustainability features and green infrastructure",
        "NEPA compliance pathway and timeline",
      ],
      requiredElements: [
        "NEPA compliance status and expected document type",
        "Emissions impact analysis (GHG, criteria pollutants)",
        "Environmental justice analysis",
        "Climate resilience and adaptation measures",
        "Sustainability features",
        "Mitigation measures for adverse impacts",
      ],
    },
    {
      id: "equity-climate",
      title: "Equity, Climate, and Workforce Impact",
      description:
        "Describe how the project advances equity goals, addresses climate change, and creates workforce opportunities. Address Justice40 benefits, disadvantaged community impacts, good-paying jobs, workforce development, and climate resilience.",
      maxWords: 2500,
      weight: 15,
      evaluationCriteria: [
        "Benefits to disadvantaged communities (Justice40)",
        "Good-paying job creation and workforce development",
        "Labor standards and local hire commitments",
        "Climate resilience and emissions reduction",
        "Community engagement process and outcomes",
        "Equity in project design and implementation",
      ],
      requiredElements: [
        "Justice40 community identification and benefits",
        "Job creation estimates (direct, indirect, construction, permanent)",
        "Wage and labor standards (Davis-Bacon, Project Labor Agreements)",
        "Workforce development plan",
        "Community engagement description",
        "Climate resilience measures",
        "Equity considerations in design and access",
      ],
    },
  ],

  requiredAttachments: [
    {
      id: "sf424",
      name: "SF-424 Application for Federal Assistance",
      description: "Standard federal application form with applicant information, project summary, budget, and certifications.",
      required: true,
      fileTypes: ["pdf"],
    },
    {
      id: "sf424c",
      name: "SF-424C Budget Information (Construction)",
      description: "Detailed construction budget breakdown by category.",
      required: true,
      fileTypes: ["pdf", "xlsx"],
    },
    {
      id: "bca-spreadsheet",
      name: "Benefit-Cost Analysis Spreadsheet",
      description: "Supporting spreadsheet for the BCA with all calculations, assumptions, and data sources.",
      required: true,
      fileTypes: ["xlsx"],
    },
    {
      id: "project-schedule",
      name: "Project Schedule / Gantt Chart",
      description: "Detailed project schedule showing major milestones, critical path, and phase durations.",
      required: true,
      fileTypes: ["pdf", "mpp"],
    },
    {
      id: "letters-of-support",
      name: "Letters of Support / Partnership Commitments",
      description: "Letters from partner agencies, elected officials, and stakeholders demonstrating support.",
      required: true,
      fileTypes: ["pdf"],
    },
    {
      id: "environmental-docs",
      name: "Environmental Review Documentation",
      description: "NEPA documentation (CE, EA, or EIS) or status letter from lead federal agency.",
      required: true,
      fileTypes: ["pdf"],
    },
    {
      id: "financial-statements",
      name: "Audited Financial Statements",
      description: "Most recent audited financial statements demonstrating fiscal capacity.",
      required: true,
      fileTypes: ["pdf"],
    },
    {
      id: "match-commitment",
      name: "Match Funding Commitment Letter",
      description: "Documentation of non-federal match funding commitment (board resolution, appropriation, bond authorization).",
      required: true,
      fileTypes: ["pdf"],
    },
    {
      id: "maps-drawings",
      name: "Project Maps and Drawings",
      description: "Site maps, conceptual/preliminary design drawings, and location context.",
      required: false,
      fileTypes: ["pdf", "dwg"],
    },
    {
      id: "equity-analysis",
      name: "Equity and Justice40 Analysis",
      description: "Documentation of disadvantaged community identification using CEJST or EJScreen tools.",
      required: false,
      fileTypes: ["pdf"],
    },
    {
      id: "resilience-assessment",
      name: "Climate Resilience Assessment",
      description: "Assessment of climate risks and resilience features incorporated into project design.",
      required: false,
      fileTypes: ["pdf"],
    },
  ],
};

export function getGrantRequirements(grantId: string): GrantRequirements | null {
  const registry: Record<string, GrantRequirements> = {
    "pidp-fy2026": PIDP_FY2026,
  };
  return registry[grantId] || null;
}

export function getDefaultGrantRequirements(): GrantRequirements {
  return PIDP_FY2026;
}
