import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { fetchGrantDetails } from "@/lib/grants-gov";
import type { DiscoveredGrant } from "@/lib/grants-gov";
import { GRANT_APPLICATION_SYSTEM_PROMPT } from "@/lib/grant-application-prompt";
import { getGrantRequirements, type GrantRequirements } from "@/data/grant-requirements";
import type { PortProfile } from "@/data/port-profile";
import type { Project } from "@/data/projects";

export interface BuildGrantApplicationParams {
  grantId: string;
  portName?: string;
  portProfile?: PortProfile;
  project?: Project;
  customPrompt?: string;
}

/**
 * Build grant application content using Anthropic.
 *
 * Two modes:
 * - With NOFO requirements: Section-by-section generation (one Claude call per scored section).
 *   Each section gets focused context and evaluation criteria, producing tighter output.
 * - Without NOFO requirements: Single-pass generation with standard federal structure.
 */
export async function buildGrantApplication(params: BuildGrantApplicationParams): Promise<string> {
  const { grantId, portName = "the port authority", portProfile, project, customPrompt } = params;

  const grant = await fetchGrantDetails(grantId);
  const requirements = matchGrantToRequirements(grant);

  // If we have structured NOFO sections, generate section-by-section
  if (requirements && !customPrompt) {
    return buildSectionBySection(grant, portName, portProfile, project, requirements);
  }

  // Otherwise, single-pass generation
  const userPrompt = buildUserPrompt(grant, portName, portProfile, project, requirements);
  const systemPrompt = customPrompt ?? GRANT_APPLICATION_SYSTEM_PROMPT;

  const { text } = await generateText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: systemPrompt,
    prompt: userPrompt,
  });

  return text;
}

/**
 * Generate the application section-by-section for NOFO-aligned grants.
 * Each scored section gets its own Claude call with focused context.
 */
async function buildSectionBySection(
  grant: DiscoveredGrant,
  portName: string,
  portProfile: PortProfile | undefined,
  project: Project | undefined,
  requirements: GrantRequirements,
): Promise<string> {
  const systemPrompt = GRANT_APPLICATION_SYSTEM_PROMPT;

  // Step 1: Generate the forms/attachments section
  const formsPrompt = buildFormsOnlyPrompt(grant, requirements);
  const formsResult = await generateText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: systemPrompt,
    prompt: formsPrompt,
  });

  // Step 2: Generate each scored section individually
  const sectionResults: string[] = [];
  for (const section of requirements.sections) {
    const sectionPrompt = buildSectionPrompt(grant, portName, portProfile, project, requirements, section);
    const result = await generateText({
      model: anthropic("claude-sonnet-4-20250514"),
      system: systemPrompt,
      prompt: sectionPrompt,
    });
    sectionResults.push(result.text);
  }

  // Step 3: Generate the "Before You Submit" checklist
  const checklistPrompt = buildChecklistPrompt(grant, portName, project, requirements);
  const checklistResult = await generateText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: systemPrompt,
    prompt: checklistPrompt,
  });

  // Combine all sections
  return [
    formsResult.text,
    `<h2>Application Narrative</h2>`,
    ...sectionResults,
    checklistResult.text,
  ].join("\n\n");
}

function buildFormsOnlyPrompt(grant: DiscoveredGrant, requirements: GrantRequirements): string {
  const lines = [
    `# Grant: ${grant.title}`,
    `**Agency:** ${grant.agency}`,
    `**Program:** ${requirements.programName}`,
    "",
    `# Required Attachments`,
  ];
  for (const a of requirements.requiredAttachments) {
    lines.push(`- **${a.name}** ${a.required ? "(Required)" : "(Optional)"}: ${a.description}`);
  }
  lines.push("", `# Task`, `Generate ONLY the "Required Forms & Attachments" section. List each form with its purpose and download link. Use ONLY the attachments listed above.`);
  return lines.join("\n");
}

function buildSectionPrompt(
  grant: DiscoveredGrant,
  portName: string,
  portProfile: PortProfile | undefined,
  project: Project | undefined,
  requirements: GrantRequirements,
  section: GrantRequirements["sections"][0],
): string {
  const lines = [
    `# Grant: ${grant.title}`,
    `**Agency:** ${grant.agency}`,
    `**Award Range:** $${grant.awardFloor.toLocaleString()} - $${grant.awardCeiling.toLocaleString()}`,
    `**Cost Share:** ${requirements.costShareMinimum}%`,
    "",
    `# Selection Priorities`,
  ];
  requirements.selectionPriorities.forEach((p, i) => lines.push(`${i + 1}. ${p}`));

  // Add port profile context
  if (portProfile) {
    lines.push("", `# Applicant: ${portProfile.name}`);
    lines.push(`**Entity:** ${portProfile.entityType} — ${portProfile.classification}`);
    lines.push(`**Location:** ${portProfile.location.city}, ${portProfile.location.state}`);
    if (portProfile.characteristics) {
      const chars: string[] = [];
      if (portProfile.characteristics.annualTonnage) chars.push(`${portProfile.characteristics.annualTonnage.toLocaleString()} tons/year`);
      if (portProfile.characteristics.employeeCount) chars.push(`${portProfile.characteristics.employeeCount} employees`);
      if (portProfile.characteristics.operatingBudget) chars.push(`$${portProfile.characteristics.operatingBudget.toLocaleString()} operating budget`);
      if (chars.length) lines.push(chars.join(" | "));
    }
    if (portProfile.capabilities.length) lines.push(`**Capabilities:** ${portProfile.capabilities.join(", ")}`);
    if (portProfile.certifications.length) lines.push(`**Certifications:** ${portProfile.certifications.join(", ")}`);
  }

  // Add project context
  if (project) {
    lines.push("", `# Project: ${project.name}`);
    lines.push(`${project.description}`);
    lines.push(`**Budget:** $${project.budget.toLocaleString()} | **Status:** ${project.status} | **Location:** ${project.location || "TBD"}`);
    if (project.startDate && project.endDate) lines.push(`**Timeline:** ${project.startDate} to ${project.endDate}`);
    if (project.fundingSource) lines.push(`**Funding:** ${project.fundingSource}`);
    if (project.costShareSource) lines.push(`**Cost Share:** ${project.costShareSource}`);

    if (project.readiness) {
      const r = project.readiness;
      lines.push("", `## Readiness`);
      lines.push(`Shovel Ready: ${r.shovelReady ? "YES" : "NO"} | NEPA: ${r.nepaStatus.replace(/_/g, " ")}${r.nepaDocument ? ` (${r.nepaDocument})` : ""} | Design: ${r.designCompletion}% (${r.designPhase})`);
      if (r.permits.length) {
        lines.push(`Permits: ${r.permits.map((p) => `${p.name} [${p.status}]`).join(", ")}`);
      }
      if (r.procurementApproach) lines.push(`Procurement: ${r.procurementApproach}`);
    }

    if (project.pastPerformance) {
      const pp = project.pastPerformance;
      lines.push(`Past Performance: ${pp.onTimeCompletion}% on-time | Audit findings: ${pp.auditFindings}`);
      if (pp.priorFederalAwards.length) {
        lines.push(`Prior Awards: ${pp.priorFederalAwards.map((a) => `${a.program} $${a.amount.toLocaleString()} (${a.year})`).join("; ")}`);
      }
    }

    if (project.metrics) {
      const m = project.metrics;
      lines.push("", `## Metrics (cite these in the narrative)`);
      if (m.jobsCreated) lines.push(`- Jobs created: ${m.jobsCreated.toLocaleString()} [Source: Project Metrics]`);
      if (m.jobsRetained) lines.push(`- Jobs retained: ${m.jobsRetained.toLocaleString()} [Source: Project Metrics]`);
      if (m.tonnageImpact) lines.push(`- Tonnage impact: ${m.tonnageImpact.toLocaleString()} tons/year [Source: Project Metrics]`);
      if (m.emissionsReduction) lines.push(`- Emissions: ${m.emissionsReduction} [Source: Project Metrics]`);
      if (m.economicImpact) lines.push(`- Economic impact: ${m.economicImpact} [Source: Project Metrics]`);
      if (m.communitiesBenefited) lines.push(`- Communities: ${m.communitiesBenefited} [Source: Project Metrics]`);
    }
  }

  // The specific section to write
  lines.push(
    "",
    `# WRITE THIS SECTION ONLY`,
    `## ${section.title} (${section.weight}% of score — max ${section.maxWords} words)`,
    "",
    section.description,
    "",
    `**Required elements (address ALL of these):**`,
  );
  section.requiredElements.forEach((e) => lines.push(`- ${e}`));
  lines.push("", `**Evaluation criteria (the reviewer scores on these):**`);
  section.evaluationCriteria.forEach((c) => lines.push(`- ${c}`));

  lines.push(
    "",
    `# Task`,
    `Write ONLY the "${section.title}" section for ${portName}'s application. Stay within ${section.maxWords} words. Address every required element. Write to the evaluation criteria. Cite all data with [Source: ...] tags. If the project budget exceeds $5M, include phasing.`,
  );

  return lines.join("\n");
}

function buildChecklistPrompt(
  grant: DiscoveredGrant,
  portName: string,
  project: Project | undefined,
  requirements: GrantRequirements,
): string {
  const lines = [
    `# Grant: ${grant.title}`,
    `**Deadline:** ${grant.closeDate || "TBD"}`,
    `**Cost Share:** ${requirements.costShareMinimum}%`,
    "",
    `# Required Attachments`,
  ];
  for (const a of requirements.requiredAttachments) {
    lines.push(`- ${a.name} (${a.required ? "Required" : "Optional"})`);
  }
  if (project?.readiness) {
    lines.push("", `# Current Readiness Gaps`);
    const r = project.readiness;
    if (!r.shovelReady) lines.push(`- Project is NOT shovel-ready`);
    r.permits.filter((p) => p.status === "pending").forEach((p) => lines.push(`- Permit pending: ${p.name}`));
    if (r.nepaStatus.includes("in_progress")) lines.push(`- NEPA review in progress (not yet complete)`);
    if (r.designCompletion < 100) lines.push(`- Design at ${r.designCompletion}% (not final)`);
  }
  lines.push(
    "",
    `# Task`,
    `Generate ONLY the "Before You Submit" checklist for ${portName}. Max 10 items. Be specific — reference actual form names, dollar amounts, and deadlines. Flag any readiness gaps that need resolution before submission.`,
  );
  return lines.join("\n");
}

/**
 * Match a Grants.gov grant to known NOFO requirements by ALN number or title keyword.
 */
function matchGrantToRequirements(grant: DiscoveredGrant): GrantRequirements | null {
  // Direct ALN match (PIDP = 20.823)
  if (grant.alnNumbers.some((aln) => aln.startsWith("20.823"))) {
    return getGrantRequirements("pidp-fy2026");
  }

  // Title keyword match
  const titleLower = grant.title.toLowerCase();
  if (titleLower.includes("port infrastructure development")) {
    return getGrantRequirements("pidp-fy2026");
  }

  return null;
}

export function buildUserPrompt(
  grant: DiscoveredGrant,
  portName: string,
  portProfile?: PortProfile,
  project?: Project,
  requirements?: GrantRequirements | null,
): string {
  const sections: string[] = [];

  // ─── Grant Opportunity (from API) ───
  sections.push(
    `# Grant Opportunity`,
    `**Title:** ${grant.title}`,
    `**Agency:** ${grant.agency}`,
    `**Opportunity Number:** ${grant.opportunityNumber}`,
    `**Award Range:** ${grant.awardFloor > 0 ? `$${grant.awardFloor.toLocaleString()} - ` : ""}${grant.awardCeiling > 0 ? `$${grant.awardCeiling.toLocaleString()}` : "TBD"}`,
    `**Total Program Funding:** ${grant.totalFunding > 0 ? `$${grant.totalFunding.toLocaleString()}` : "TBD"}`,
    `**Close Date:** ${grant.closeDate || "TBD"}`,
    `**Cost Sharing:** ${grant.costSharing ? "Required" : "Not required"}`,
    `**ALN/CFDA:** ${grant.alnNumbers.length > 0 ? grant.alnNumbers.join(", ") : "Not listed"}`,
    `**Funding Instruments:** ${grant.fundingInstruments.length > 0 ? grant.fundingInstruments.join(", ") : "Grant"}`,
    `**Application URL:** ${grant.applicationUrl || "See Grants.gov"}`,
  );

  if (grant.contactName || grant.contactEmail) {
    sections.push(`**Agency Contact:** ${[grant.contactName, grant.contactEmail, grant.contactPhone].filter(Boolean).join(" | ")}`);
  }

  sections.push("");

  // ─── Synopsis ───
  const cleanDescription = grant.description
    ? grant.description.replace(/<[^>]*>/g, "").replace(/&[a-z]+;/gi, " ").trim()
    : "No description available.";
  sections.push(`# Grant Synopsis`, cleanDescription.slice(0, 5000), "");

  // ─── Eligibility ───
  if (grant.eligibility.length > 0) {
    sections.push(`# Eligible Applicants`, grant.eligibility.join("; "), "");
  }

  // ─── Funding Categories ───
  if (grant.fundingCategories.length > 0) {
    sections.push(`# Funding Categories / Focus Areas`, grant.fundingCategories.join(", "), "");
  }

  // ─── Known NOFO Requirements (when available) ───
  if (requirements) {
    sections.push(`# OFFICIAL NOFO REQUIREMENTS (USE THESE — DO NOT INVENT SECTIONS)`);
    sections.push(`**Program:** ${requirements.programName}`);
    sections.push(`**Cost Share Minimum:** ${requirements.costShareMinimum}%`);
    sections.push(`**Application Deadline:** ${requirements.applicationDeadline}`);
    sections.push(`**Evaluation Process:** ${requirements.evaluationProcess}`);
    sections.push("");

    sections.push(`## Selection Priorities`);
    requirements.selectionPriorities.forEach((p, i) => sections.push(`${i + 1}. ${p}`));
    sections.push("");

    sections.push(`## Application Sections (scored)`);
    for (const s of requirements.sections) {
      sections.push(`### ${s.title} (${s.weight}% of score, max ${s.maxWords} words)`);
      sections.push(s.description);
      sections.push(`**Required elements:**`);
      s.requiredElements.forEach((e) => sections.push(`- ${e}`));
      sections.push(`**Evaluation criteria:**`);
      s.evaluationCriteria.forEach((c) => sections.push(`- ${c}`));
      sections.push("");
    }

    sections.push(`## Required Attachments`);
    for (const a of requirements.requiredAttachments) {
      sections.push(`- **${a.name}** ${a.required ? "(Required)" : "(Optional)"}: ${a.description}`);
    }
    sections.push("");
  }

  // ─── Port Profile (applicant context) ───
  if (portProfile) {
    sections.push(`# Applicant Profile: ${portProfile.name}`);
    sections.push(`**Entity Type:** ${portProfile.entityType} — ${portProfile.classification}`);
    sections.push(`**Location:** ${portProfile.location.city}, ${portProfile.location.state} (${portProfile.location.region})`);

    if (portProfile.characteristics) {
      const chars: string[] = [];
      if (portProfile.characteristics.cargoTypes?.length) chars.push(`Cargo: ${portProfile.characteristics.cargoTypes.join(", ")}`);
      if (portProfile.characteristics.annualTonnage) chars.push(`Annual tonnage: ${portProfile.characteristics.annualTonnage.toLocaleString()} tons`);
      if (portProfile.characteristics.employeeCount) chars.push(`Employees: ${portProfile.characteristics.employeeCount}`);
      if (portProfile.characteristics.operatingBudget) chars.push(`Operating budget: $${portProfile.characteristics.operatingBudget.toLocaleString()}`);
      sections.push(chars.join(" | "));
    }

    if (portProfile.priorities.length > 0) {
      sections.push(`**Strategic Priorities:** ${portProfile.priorities.join(", ")}`);
    }
    if (portProfile.capabilities.length > 0) {
      sections.push(`**Capabilities:** ${portProfile.capabilities.join(", ")}`);
    }
    if (portProfile.needs.length > 0) {
      sections.push(`**Infrastructure Needs:** ${portProfile.needs.join(", ")}`);
    }
    if (portProfile.certifications.length > 0) {
      sections.push(`**Certifications:** ${portProfile.certifications.join(", ")}`);
    }
    if (portProfile.environmentalGoals.length > 0) {
      sections.push(`**Environmental Goals:** ${portProfile.environmentalGoals.join(", ")}`);
    }
    if (portProfile.communityImpact.length > 0) {
      sections.push(`**Community Impact:** ${portProfile.communityImpact.join(", ")}`);
    }
    sections.push("");
  }

  // ─── Project Details (if applying for a specific project) ───
  if (project) {
    sections.push(`# Project for This Application: ${project.name}`);
    sections.push(`**Description:** ${project.description}`);
    sections.push(`**Type:** ${project.projectType} | **Status:** ${project.status} | **Priority:** ${project.priority}`);
    sections.push(`**Budget:** $${project.budget.toLocaleString()}`);
    if (project.location) sections.push(`**Location:** ${project.location}`);
    if (project.startDate && project.endDate) sections.push(`**Timeline:** ${project.startDate} to ${project.endDate}`);
    if (project.focusAreas.length > 0) sections.push(`**Focus Areas:** ${project.focusAreas.join(", ")}`);
    if (project.notes) sections.push(`**Notes:** ${project.notes}`);
    if (project.fundingSource) sections.push(`**Funding Source:** ${project.fundingSource}`);
    if (project.costShareSource) sections.push(`**Cost Share Source:** ${project.costShareSource}`);

    // Readiness data
    if (project.readiness) {
      const r = project.readiness;
      sections.push("");
      sections.push(`## Project Readiness`);
      sections.push(`**Shovel Ready:** ${r.shovelReady ? "YES" : "NO"}`);
      sections.push(`**NEPA Status:** ${r.nepaStatus.replace(/_/g, " ")}${r.nepaDocument ? ` (${r.nepaDocument})` : ""}${r.nepaCompletionDate ? ` — completed ${r.nepaCompletionDate}` : ""}`);
      sections.push(`**Design:** ${r.designCompletion}% complete (${r.designPhase} phase)`);
      sections.push(`**Right-of-Way:** ${r.rightOfWay.replace(/_/g, " ")}`);
      if (r.procurementApproach) sections.push(`**Procurement Approach:** ${r.procurementApproach}`);
      if (r.constructionStartTarget) sections.push(`**Construction Start Target:** ${r.constructionStartTarget}`);
      if (r.permits.length > 0) {
        sections.push(`**Permits:**`);
        r.permits.forEach((p) => sections.push(`- ${p.name}: ${p.status}${p.date ? ` (${p.date})` : ""}`));
      }
    }

    // Past performance
    if (project.pastPerformance) {
      const pp = project.pastPerformance;
      sections.push("");
      sections.push(`## Past Performance`);
      sections.push(`**On-Time Completion Rate:** ${pp.onTimeCompletion}%`);
      sections.push(`**Audit Findings:** ${pp.auditFindings}`);
      if (pp.priorFederalAwards.length > 0) {
        sections.push(`**Prior Federal Awards:**`);
        pp.priorFederalAwards.forEach((a) => sections.push(`- ${a.program}: $${a.amount.toLocaleString()} (${a.year}) — ${a.status.replace(/_/g, " ")}`));
      }
    }

    // Metrics
    if (project.metrics) {
      const m = project.metrics;
      sections.push("");
      sections.push(`## Project Metrics (use these as citations in the narrative)`);
      if (m.jobsCreated) sections.push(`- Jobs created: ${m.jobsCreated.toLocaleString()}`);
      if (m.jobsRetained) sections.push(`- Jobs retained: ${m.jobsRetained.toLocaleString()}`);
      if (m.tonnageImpact) sections.push(`- Tonnage impact: ${m.tonnageImpact.toLocaleString()} tons/year`);
      if (m.emissionsReduction) sections.push(`- Emissions reduction: ${m.emissionsReduction}`);
      if (m.safetyImpact) sections.push(`- Safety impact: ${m.safetyImpact}`);
      if (m.economicImpact) sections.push(`- Economic impact: ${m.economicImpact}`);
      if (m.communitiesBenefited) sections.push(`- Communities benefited: ${m.communitiesBenefited}`);
    }

    sections.push("");
  }

  // ─── Task Instructions ───
  sections.push(`# Your Task`);

  if (requirements) {
    sections.push(
      `Draft a grant application for ${portName} for this opportunity.`,
      ``,
      `IMPORTANT: Follow the OFFICIAL NOFO REQUIREMENTS above exactly. Structure your application with the scored sections in the order shown, respecting the word limits. Address every required element and evaluation criterion listed for each section.`,
      ``,
      `For the Required Forms section, use ONLY the forms listed in the Required Attachments above. Do not invent or guess additional forms.`,
    );
  } else {
    sections.push(
      `Draft a grant application for ${portName} for this opportunity.`,
      ``,
      `Since official NOFO section requirements are not available for this grant, structure the application with standard federal grant sections: Project Narrative, Statement of Need, Project Description & Scope, Expected Outcomes & Benefits, Organizational Capacity, Budget Narrative.`,
      ``,
      `For the Required Forms section, list ONLY standard federal forms that are commonly required (SF-424, SF-424A/C). Add a note: "Verify required forms against the official NOFO before submitting."`,
      ``,
      `Do NOT fabricate specific forms, page limits, or scoring criteria. If you are uncertain about a requirement, say so explicitly.`,
    );
  }

  if (portProfile) {
    sections.push(``, `Use the applicant profile data above to make the narrative specific to ${portProfile.name}. Reference real capabilities, certifications, and infrastructure needs — not generic boilerplate.`);
  }

  if (project) {
    sections.push(``, `This application is specifically for the "${project.name}" project. Reference the project details above throughout the narrative. Tie project outcomes to the grant's funding categories and priorities.`);
  }

  sections.push(``, `Be specific and persuasive. Every claim should be grounded in the data provided above.`);

  return sections.join("\n");
}
