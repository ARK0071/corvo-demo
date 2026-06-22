/**
 * Unified Grant Application Builder
 *
 * Single generation pipeline used by both:
 * - /api/build-grant-application (UI-driven drafting page)
 * - Porter chat tool (build_grant_application)
 *
 * Supports streaming (SSE) and non-streaming modes.
 * Uses section-by-section parallel generation with optional Claude-based scoring.
 */

import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { GRANT_APPLICATION_SYSTEM_PROMPT } from "@/lib/grant-application-prompt";
import type {
  GenerateDraftRequest,
  RegenerateSectionRequest,
  DraftSection,
  AttachmentStatus,
  DraftResponse,
  DraftStreamEvent,
  ResearchEntityProfile,
  GrantRequirementsResearch,
  GrantApplicationSection,
  ResearchGrantDetails,
  EnrichedForm,
  UserGuidance,
  WebSource,
  SectionConfidenceDetail,
} from "./types";

const MODEL = "claude-sonnet-4-6";

// ─── Prompt Builders ───

function buildEntityContext(entity: ResearchEntityProfile, portName: string): string {
  const lines: string[] = [];

  lines.push(`# Applicant: ${portName}`);
  lines.push(`**Legal Name:** ${entity.legalName || entity.name}`);
  lines.push(`**Entity:** ${entity.entityType} — ${entity.classification}`);
  lines.push(`**Location:** ${entity.location.city}, ${entity.location.state} (${entity.location.congressionalDistrict || ""})`);

  // Financials
  const f = entity.financials;
  if (f) {
    const parts: string[] = [];
    if (f.annualRevenue) parts.push(`Revenue: $${(f.annualRevenue / 1_000_000).toFixed(0)}M`);
    if (f.operatingBudget) parts.push(`Operating: $${(f.operatingBudget / 1_000_000).toFixed(0)}M`);
    if (f.capitalBudget) parts.push(`Capital: $${(f.capitalBudget / 1_000_000).toFixed(0)}M`);
    if (f.bondRating && f.bondRating !== "Not rated") parts.push(`Bond: ${f.bondRating}`);
    if (f.totalAssets) parts.push(`Assets: $${(f.totalAssets / 1_000_000).toFixed(0)}M`);
    if (f.matchFundingCapacity) parts.push(`Match capacity: $${(f.matchFundingCapacity / 1_000_000).toFixed(0)}M`);
    if (parts.length) lines.push(parts.join(" | "));
  }

  // Operations
  const ops = entity.operations;
  if (ops) {
    const parts: string[] = [];
    if (ops.annualTonnage) parts.push(`${(ops.annualTonnage / 1_000_000).toFixed(0)}M tons/year`);
    if (ops.annualTEUs) parts.push(`${ops.annualTEUs.toLocaleString()} TEUs`);
    if (ops.vesselCalls) parts.push(`${ops.vesselCalls.toLocaleString()} vessel calls`);
    if (ops.employeeCount) parts.push(`${ops.employeeCount} employees`);
    if (ops.directJobs) parts.push(`${ops.directJobs.toLocaleString()} direct jobs`);
    if (parts.length) lines.push(`**Operations:** ${parts.join(" | ")}`);
    if (ops.cargoTypes?.length) lines.push(`**Cargo Types:** ${ops.cargoTypes.join(", ")}`);
  }

  // Infrastructure
  const infra = entity.infrastructure;
  if (infra) {
    const facilities = infra.terminalFacilities || infra.keyFacilities || [];
    if (facilities.length) lines.push(`**Facilities:** ${facilities.join("; ")}`);
    const parts: string[] = [];
    if (infra.channelDepth) parts.push(`${infra.channelDepth} ft depth`);
    if (infra.channelWidth) parts.push(`${infra.channelWidth} ft width`);
    if (infra.berths) parts.push(`${infra.berths} berths`);
    if (infra.acreage) parts.push(`${infra.acreage} acres`);
    if (parts.length) lines.push(`**Channel/Port:** ${parts.join(", ")}`);
    if (infra.railConnections?.length) lines.push(`**Rail:** ${infra.railConnections.join("; ")}`);
  }

  // Economic impact
  const econ = entity.economicImpact;
  if (econ) {
    const parts: string[] = [];
    if (econ.regionalEconomicImpact) parts.push(`$${(econ.regionalEconomicImpact / 1_000_000_000).toFixed(1)}B regional impact`);
    if (econ.totalJobs) parts.push(`${econ.totalJobs.toLocaleString()} total jobs`);
    if (econ.tradeValue) parts.push(`$${(econ.tradeValue / 1_000_000_000).toFixed(0)}B trade value`);
    if (econ.annualTaxRevenue) parts.push(`$${(econ.annualTaxRevenue / 1_000_000).toFixed(0)}M tax revenue`);
    if (parts.length) lines.push(`**Economic Impact:** ${parts.join(" | ")}`);
  }

  // Projects
  if (entity.currentProjects?.length) {
    lines.push("", "## Current Projects");
    entity.currentProjects.forEach(p => {
      lines.push(`- **${p.name}**: ${p.description} (Cost: $${(p.totalCost / 1_000_000).toFixed(0)}M, Status: ${p.status})`);
    });
  }

  // Past awards
  if (entity.pastGrantAwards?.length) {
    lines.push("", "## Past Grant Awards");
    entity.pastGrantAwards.forEach(g => {
      lines.push(`- ${g.program}${g.agency ? ` (${g.agency})` : ""}: $${(g.awardAmount / 1_000_000).toFixed(1)}M for ${g.projectName} (${g.awardYear})${g.status ? ` — ${g.status}` : ""}`);
    });
  }

  // Certifications, priorities, environmental, community
  if (entity.certifications?.length) lines.push(`**Certifications:** ${entity.certifications.join("; ")}`);
  if (entity.strategicPriorities?.length) lines.push(`**Strategic Priorities:** ${entity.strategicPriorities.join("; ")}`);
  if (entity.environmentalGoals?.length) lines.push(`**Environmental Goals:** ${entity.environmentalGoals.join("; ")}`);
  if (entity.communityImpact?.length) lines.push(`**Community Impact:** ${entity.communityImpact.join("; ")}`);

  // Disadvantaged community
  if (entity.disadvantagedCommunityData) {
    const dc = entity.disadvantagedCommunityData;
    lines.push("", "## Disadvantaged Community Data");
    if (dc.description) lines.push(dc.description);
    if (dc.povertyRate) lines.push(`Poverty rate: ${dc.povertyRate}%`);
    if (dc.pm25Percentile) lines.push(`PM2.5 percentile: ${dc.pm25Percentile}th`);
    lines.push(`Justice40: ${dc.justiceFortyTracker ? "Yes" : "No"}`);
    if (dc.censusTract) lines.push(`Census tracts: ${dc.censusTract}`);
  }

  // Climate resilience
  if (entity.climateResilienceData) {
    const cr = entity.climateResilienceData;
    lines.push("", "## Climate Resilience");
    if (cr.floodZone) lines.push(`Flood zone: ${cr.floodZone}`);
    if (cr.hurricaneExposure) lines.push(`Hurricane: ${cr.hurricaneExposure}`);
    if (cr.emissionsBaseline) lines.push(`Emissions baseline: ${cr.emissionsBaseline}`);
    if (cr.emissionsReductionTarget) lines.push(`Reduction target: ${cr.emissionsReductionTarget}`);
    if (cr.existingMitigations?.length) lines.push(`Existing mitigations: ${cr.existingMitigations.join("; ")}`);
    if (cr.plannedMitigations?.length) lines.push(`Planned mitigations: ${cr.plannedMitigations.join("; ")}`);
  }

  return lines.join("\n");
}

function buildGrantContext(
  grantTitle: string,
  grantReqs: GrantRequirementsResearch,
  grantDetails: ResearchGrantDetails | null | undefined,
): string {
  const lines: string[] = [];

  lines.push(`# Grant: ${grantTitle}`);
  if (grantDetails) {
    lines.push(`**Agency:** ${grantDetails.agency}`);
    lines.push(`**Award Range:** $${grantDetails.awardFloor?.toLocaleString() || "0"} - $${grantDetails.awardCeiling?.toLocaleString() || "TBD"}`);
    lines.push(`**Total Funding:** $${grantDetails.totalFunding?.toLocaleString() || "TBD"}`);
    lines.push(`**Close Date:** ${grantDetails.closeDate || "TBD"}`);
    lines.push(`**Cost Sharing:** ${grantDetails.costSharing ? "Required" : "Not required"}`);
    if (grantDetails.eligibility?.length) lines.push(`**Eligibility:** ${grantDetails.eligibility.join("; ")}`);
  }
  lines.push(`**Cost Share:** ${grantReqs.costSharePercentage}%`);
  lines.push(`**Max Award:** $${grantReqs.maxAward?.toLocaleString() || "TBD"}`);
  lines.push(`**Deadline:** ${grantReqs.submissionDeadline || "TBD"}`);

  return lines.join("\n");
}

function buildUserGuidanceContext(guidance: UserGuidance): string {
  const lines: string[] = [];
  lines.push("# APPLICANT'S PRIORITIES AND OUTLINE (use this to guide the narrative)");
  lines.push("");

  if (guidance.coreFundingNeed.trim()) {
    lines.push("## Core Funding Need");
    lines.push(guidance.coreFundingNeed);
    lines.push("");
  }
  if (guidance.internalJustification.trim()) {
    lines.push("## Internal Justification");
    lines.push(guidance.internalJustification);
    lines.push("");
  }
  if (guidance.impactJustification.trim()) {
    lines.push("## Investment / Impact Justification");
    lines.push(guidance.impactJustification);
    lines.push("");
  }
  if (guidance.budgetPriorities.trim()) {
    lines.push("## Budget Priorities");
    lines.push(guidance.budgetPriorities);
    lines.push("");
  }
  if (guidance.strategicEmphasis.trim()) {
    lines.push("## Strategic Emphasis / Themes");
    lines.push(guidance.strategicEmphasis);
    lines.push("");
  }
  if (guidance.additionalNotes.trim()) {
    lines.push("## Additional Notes");
    lines.push(guidance.additionalNotes);
    lines.push("");
  }

  lines.push("IMPORTANT: The applicant provided these priorities. Weave them throughout the narrative. The core funding need should be the central thread. The impact justification should appear in outcomes sections. Budget priorities should inform the budget narrative. Strategic emphasis themes should be echoed across all sections.");

  return lines.join("\n");
}

function buildSectionPrompt(
  section: GrantApplicationSection,
  portName: string,
  entity: ResearchEntityProfile,
  grantReqs: GrantRequirementsResearch,
  grantDetails: ResearchGrantDetails | null | undefined,
  userGuidance?: UserGuidance,
  webSources?: WebSource[],
): string {
  const lines: string[] = [];

  lines.push(buildGrantContext("", grantReqs, grantDetails));
  lines.push("");

  // Selection priorities from grant requirements (if we have them from NOFO sections)
  // These are encoded in the evaluation criteria of each section

  lines.push(buildEntityContext(entity, portName));
  lines.push("");

  // Reference sources for citations
  if (webSources && webSources.length > 0) {
    lines.push("# REFERENCE SOURCES (cite these using <a> links where relevant)");
    webSources.forEach(s => {
      lines.push(`- ${s.title}: ${s.url}`);
    });
    lines.push("");
  }

  // User guidance
  if (userGuidance && hasUserGuidance(userGuidance)) {
    lines.push(buildUserGuidanceContext(userGuidance));
    lines.push("");
  }

  // The specific section to write
  lines.push(`# WRITE THIS SECTION ONLY`);
  lines.push(`## ${section.title} (${section.weight}% of score — max ${section.maxWords} words)`);
  lines.push("");
  lines.push(section.description);
  lines.push("");

  if (section.requiredElements?.length) {
    lines.push("**Required elements (address ALL of these):**");
    section.requiredElements.forEach(e => lines.push(`- ${e}`));
    lines.push("");
  }

  if (section.evaluationCriteria?.length) {
    lines.push("**Evaluation criteria (the reviewer scores on these):**");
    section.evaluationCriteria.forEach(c => lines.push(`- ${c}`));
    lines.push("");
  }

  lines.push("# Task");
  lines.push(`Write ONLY the "${section.title}" section for ${portName}'s application. Stay within ${section.maxWords} words. Address every required element. Write to the evaluation criteria. Cite all data — use <a class="citation"> links for web sources and <span class="citation-internal"> for applicant data. If the project budget exceeds $5M, include phasing.`);
  if (userGuidance && hasUserGuidance(userGuidance)) {
    lines.push(`Incorporate the applicant's priorities and outline into this section where relevant.`);
  }

  return lines.join("\n");
}

function buildFormsPrompt(
  grantTitle: string,
  forms: EnrichedForm[],
): string {
  const lines = [
    `# Grant: ${grantTitle}`,
    "",
    "# Required Attachments",
  ];
  for (const f of forms) {
    lines.push(`- **${f.number}: ${f.name}** ${f.required ? "(Required)" : "(Optional)"}: ${f.description || f.notes || ""}`);
  }
  lines.push("", "# Task", 'Generate ONLY the "Required Forms & Attachments" section. List each form with its purpose. Use ONLY the forms listed above.');
  return lines.join("\n");
}

function buildChecklistPrompt(
  portName: string,
  grantTitle: string,
  grantReqs: GrantRequirementsResearch,
  forms: EnrichedForm[],
): string {
  const lines = [
    `# Grant: ${grantTitle}`,
    `**Deadline:** ${grantReqs.submissionDeadline || "TBD"}`,
    `**Cost Share:** ${grantReqs.costSharePercentage}%`,
    "",
    "# Required Attachments",
  ];
  for (const f of forms) {
    lines.push(`- ${f.number}: ${f.name} (${f.required ? "Required" : "Optional"})`);
  }
  lines.push(
    "",
    "# Task",
    `Generate ONLY the "Before You Submit" checklist for ${portName}. Max 10 items. Be specific — reference actual form names, dollar amounts, and deadlines.`,
  );
  return lines.join("\n");
}

function hasUserGuidance(g: UserGuidance): boolean {
  return !!(
    g.coreFundingNeed.trim() ||
    g.internalJustification.trim() ||
    g.impactJustification.trim() ||
    g.budgetPriorities.trim() ||
    g.strategicEmphasis.trim() ||
    g.additionalNotes.trim()
  );
}

// ─── Section Confidence Assessment ───

function assessConfidenceMechanical(
  content: string,
  maxWords: number,
): { confidence: "high" | "medium" | "low"; reason: string } {
  const needsGaps = (content.match(/\[NEEDS:[^\]]+\]/g) || []).length;
  const tbpGaps = (content.match(/\[To be provided by applicant\]/g) || []).length;
  const gaps = needsGaps + tbpGaps;
  const wordCount = content.split(/\s+/).length;
  // Use a reasonable floor so default maxWords (5000) doesn't penalize shorter sections
  const effectiveMax = Math.min(maxWords, wordCount * 2.5);
  const wordRatio = effectiveMax > 0 ? wordCount / effectiveMax : 0;

  if (gaps === 0 && wordCount >= 300 && wordRatio >= 0.4) {
    return { confidence: "high", reason: "All required data available. Section fully drafted." };
  }
  if (gaps <= 2 && wordCount >= 150) {
    return { confidence: "medium", reason: `${gaps} data gap(s) flagged for human verification.` };
  }
  return { confidence: "low", reason: `${gaps} data gap(s) require input. Section needs significant review.` };
}

// ─── Attachments Assessment ───

function assessAttachments(
  forms: EnrichedForm[],
  entity: ResearchEntityProfile,
  costShareMin: number,
): AttachmentStatus[] {
  return forms.map((f): AttachmentStatus => {
    const id = f.id.toLowerCase();
    let notes = f.notes || "Verify requirements with grants team.";

    if (id.includes("sf424") && !id.includes("sf424c") && !id.includes("sf424a") && !id.includes("sf424b") && !id.includes("sf424d")) {
      notes = `Standard form - populate from entity registration data (UEI${entity.uei ? `: ${entity.uei}` : ""}).`;
    } else if (id.includes("budget") || id.includes("sf424c") || id.includes("sf424a")) {
      notes = "Requires detailed budget breakdown from project team.";
    } else if (id.includes("bca") || id.includes("benefit-cost")) {
      notes = "Benefit-cost analysis must use agency-approved methodology.";
    } else if (id.includes("financial") || id.includes("audit")) {
      const bondNote = entity.financials.bondRating && entity.financials.bondRating !== "Not rated"
        ? ` Bond rating: ${entity.financials.bondRating}.`
        : "";
      notes = `Provide most recent audited financial statements.${bondNote}`;
    } else if (id.includes("letter") || id.includes("support")) {
      notes = "Obtain letters from partner agencies, elected officials, and stakeholders.";
    } else if (id.includes("environmental") || id.includes("nepa")) {
      notes = "Provide NEPA documentation or status letter from lead federal agency.";
    } else if (id.includes("match") || id.includes("commitment")) {
      notes = costShareMin > 0
        ? `Board resolution needed committing ${costShareMin}% match.`
        : "Documentation of any committed matching funds.";
    } else if (id.includes("schedule") || id.includes("gantt") || id.includes("timeline")) {
      notes = "Project schedule showing milestones and critical path.";
    } else if (id.includes("map") || id.includes("drawing") || id.includes("diagram")) {
      notes = "Site maps and relevant engineering or design drawings.";
    }

    return {
      id: f.id,
      name: `${f.number}: ${f.name}`,
      description: f.description || "",
      required: f.required,
      status: "needs_preparation",
      notes,
    };
  });
}

// ─── Core Generation ───

/**
 * Generate a single section. Used by both full generation and individual regen.
 */
export async function generateSection(
  section: GrantApplicationSection,
  sectionIndex: number,
  portName: string,
  entity: ResearchEntityProfile,
  grantReqs: GrantRequirementsResearch,
  grantDetails: ResearchGrantDetails | null | undefined,
  userGuidance?: UserGuidance,
  webSources?: WebSource[],
): Promise<DraftSection> {
  const prompt = buildSectionPrompt(section, portName, entity, grantReqs, grantDetails, userGuidance, webSources);

  const result = await generateText({
    model: anthropic(MODEL),
    system: GRANT_APPLICATION_SYSTEM_PROMPT,
    prompt,
  });

  const content = result.text;
  const wordCount = content.split(/\s+/).length;
  const gapAnnotations = (content.match(/\[NEEDS:[^\]]+\]/g) || [])
    .map(g => g.replace(/^\[NEEDS:\s*/, "").replace(/\]$/, ""));
  const { confidence, reason } = assessConfidenceMechanical(content, section.maxWords);

  return {
    sectionId: `section-${sectionIndex}`,
    title: section.title,
    content,
    confidence,
    confidenceReason: reason,
    gapAnnotations,
    wordCount,
    maxWords: section.maxWords,
    weight: section.weight,
    aiGenerated: true,
    lastEditedAt: new Date().toISOString(),
  };
}

/**
 * Generate a full draft (all sections in parallel). Non-streaming.
 */
export async function generateDraft(req: GenerateDraftRequest): Promise<DraftResponse> {
  const portName = req.portName || req.entityProfile.name;
  const sections = req.grantRequirements.applicationSections;

  // Generate all sections in parallel
  const sectionPromises = sections.map((section, i) =>
    generateSection(section, i, portName, req.entityProfile, req.grantRequirements, req.grantDetails, req.userGuidance, req.webSources)
  );
  const generatedSections = await Promise.all(sectionPromises);

  // Calculate completeness
  const totalWeight = generatedSections.reduce((sum, s) => sum + s.weight, 0);
  const weightedCompleteness = generatedSections.reduce((sum, s) => {
    const c = s.confidence === "high" ? 1.0 : s.confidence === "medium" ? 0.7 : 0.4;
    return sum + c * s.weight;
  }, 0);
  const overallCompleteness = totalWeight > 0 ? Math.round((weightedCompleteness / totalWeight) * 100) : 0;

  // Assess attachments
  const attachmentsChecklist = assessAttachments(
    req.forms,
    req.entityProfile,
    req.grantRequirements.costSharePercentage,
  );

  return {
    sections: generatedSections,
    overallCompleteness,
    attachmentsChecklist,
    generatedAt: new Date().toISOString(),
    grantProgram: req.grantTitle,
    applicantName: portName,
  };
}

/**
 * Generate a full draft with SSE streaming. Sends events as each section completes.
 */
export async function generateDraftStreaming(
  req: GenerateDraftRequest,
  sendEvent: (event: DraftStreamEvent) => void,
): Promise<DraftResponse> {
  const portName = req.portName || req.entityProfile.name;
  const sections = req.grantRequirements.applicationSections;

  // Send start events for all sections
  sections.forEach((section, i) => {
    sendEvent({ type: "section_start", sectionId: `section-${i}`, title: section.title, index: i, total: sections.length });
  });

  // Generate all sections in parallel, sending completion events as they finish
  const sectionResults = await Promise.allSettled(
    sections.map(async (section, i) => {
      const result = await generateSection(
        section, i, portName, req.entityProfile, req.grantRequirements, req.grantDetails, req.userGuidance, req.webSources,
      );
      sendEvent({ type: "section_complete", section: result });
      return result;
    })
  );

  const generatedSections: DraftSection[] = [];
  const errors: string[] = [];
  sectionResults.forEach((result, i) => {
    if (result.status === "fulfilled") {
      generatedSections.push(result.value);
    } else {
      const errMsg = result.reason instanceof Error ? result.reason.message : "Unknown error";
      errors.push(`Section "${sections[i].title}": ${errMsg}`);
      generatedSections.push({
        sectionId: `section-${i}`,
        title: sections[i].title,
        content: `[Generation failed: ${errMsg}. Click "Regenerate" to retry this section.]`,
        confidence: "low",
        confidenceReason: `Generation failed: ${errMsg}`,
        gapAnnotations: [],
        wordCount: 0,
        maxWords: sections[i].maxWords,
        weight: sections[i].weight,
        aiGenerated: true,
        lastEditedAt: new Date().toISOString(),
      });
      sendEvent({ type: "section_complete", section: generatedSections[generatedSections.length - 1] });
    }
  });

  if (generatedSections.length === 0) {
    throw new Error("All sections failed to generate. Please try again.");
  }

  // Calculate completeness
  const totalWeight = generatedSections.reduce((sum, s) => sum + s.weight, 0);
  const weightedCompleteness = generatedSections.reduce((sum, s) => {
    const c = s.confidence === "high" ? 1.0 : s.confidence === "medium" ? 0.7 : 0.4;
    return sum + c * s.weight;
  }, 0);
  const overallCompleteness = totalWeight > 0 ? Math.round((weightedCompleteness / totalWeight) * 100) : 0;

  // Assess attachments
  const attachmentsChecklist = assessAttachments(
    req.forms,
    req.entityProfile,
    req.grantRequirements.costSharePercentage,
  );
  sendEvent({ type: "attachments", attachments: attachmentsChecklist });

  const response: DraftResponse = {
    sections: generatedSections,
    overallCompleteness,
    attachmentsChecklist,
    generatedAt: new Date().toISOString(),
    grantProgram: req.grantTitle,
    applicantName: portName,
  };

  sendEvent({ type: "complete", response });

  return response;
}

/**
 * Regenerate a single section with updated context.
 */
export async function regenerateSingleSection(req: RegenerateSectionRequest): Promise<DraftSection> {
  const portName = req.portName || req.entityProfile.name;
  const grantReqs = req.grantRequirements;

  // Find the matching section spec
  const sectionSpec = grantReqs.applicationSections.find(
    (s, i) => `section-${i}` === req.sectionId
  );
  const sectionIndex = grantReqs.applicationSections.findIndex(
    (s, i) => `section-${i}` === req.sectionId
  );

  if (!sectionSpec || sectionIndex === -1) {
    throw new Error(`Section ${req.sectionId} not found in grant requirements`);
  }

  // Build a context-aware prompt with other sections as reference
  const otherSectionsContext = req.otherSections
    .filter(s => s.sectionId !== req.sectionId && s.content.trim().length > 0)
    .map(s => `## ${s.title} (already written)\n${s.content.slice(0, 500)}...`)
    .join("\n\n");

  const basePrompt = buildSectionPrompt(
    sectionSpec, portName, req.entityProfile, grantReqs, req.grantDetails, req.userGuidance, req.webSources,
  );

  let prompt = basePrompt;
  if (otherSectionsContext) {
    prompt += `\n\n# Context: Other sections already written (avoid repeating content)\n${otherSectionsContext}`;
  }
  if (req.additionalInstructions) {
    prompt += `\n\n# Additional Instructions from Applicant\n${req.additionalInstructions}`;
  }

  const result = await generateText({
    model: anthropic(MODEL),
    system: GRANT_APPLICATION_SYSTEM_PROMPT,
    prompt,
  });

  const content = result.text;
  const wordCount = content.split(/\s+/).length;
  const gapAnnotations = (content.match(/\[NEEDS:[^\]]+\]/g) || [])
    .map(g => g.replace(/^\[NEEDS:\s*/, "").replace(/\]$/, ""));
  const { confidence, reason } = assessConfidenceMechanical(content, sectionSpec.maxWords);

  return {
    sectionId: req.sectionId,
    title: sectionSpec.title,
    content,
    confidence,
    confidenceReason: reason,
    gapAnnotations,
    wordCount,
    maxWords: sectionSpec.maxWords,
    weight: sectionSpec.weight,
    aiGenerated: true,
    lastEditedAt: new Date().toISOString(),
  };
}

// ─── Claude-Based Confidence Scoring ───

export async function scoreSection(
  section: DraftSection,
  sectionSpec: GrantApplicationSection,
  portName: string,
): Promise<{ confidence: "high" | "medium" | "low"; confidenceReason: string; details: SectionConfidenceDetail[] }> {
  const prompt = `Score this grant application section for "${portName}".

SECTION: ${section.title}
WEIGHT: ${sectionSpec.weight}% of total score
MAX WORDS: ${sectionSpec.maxWords}
ACTUAL WORDS: ${section.wordCount}

EVALUATION CRITERIA:
${(sectionSpec.evaluationCriteria || []).map((c, i) => `${i + 1}. ${c}`).join("\n")}

REQUIRED ELEMENTS:
${(sectionSpec.requiredElements || []).map((e, i) => `${i + 1}. ${e}`).join("\n")}

SECTION CONTENT:
${section.content}

For each evaluation criterion, score 0-100 and give brief feedback.
For each required element, check if it is adequately addressed.

Respond in this exact JSON format:
{
  "criteriaScores": [
    { "criterionName": "...", "score": 85, "feedback": "..." }
  ],
  "overallConfidence": "high|medium|low",
  "overallReason": "..."
}

Scoring guide:
- high (80-100): All criteria well-addressed, data-rich, persuasive
- medium (50-79): Most criteria addressed, some gaps or weak areas
- low (0-49): Major criteria missing, insufficient data, needs significant work`;

  try {
    const result = await generateText({
      model: anthropic("claude-haiku-4-5-20251001"),
      prompt,
    });

    const parsed = JSON.parse(result.text);
    return {
      confidence: parsed.overallConfidence || "medium",
      confidenceReason: parsed.overallReason || "Scored by AI reviewer.",
      details: (parsed.criteriaScores || []).map((c: { criterionName: string; score: number; feedback: string }) => ({
        criterionName: c.criterionName,
        score: c.score,
        feedback: c.feedback,
      })),
    };
  } catch {
    // Fallback to mechanical scoring if Claude scoring fails
    const mechanical = assessConfidenceMechanical(section.content, sectionSpec.maxWords);
    return {
      confidence: mechanical.confidence,
      confidenceReason: mechanical.reason + " (AI scoring unavailable)",
      details: [],
    };
  }
}

/**
 * Score all sections with Claude and update their confidence fields.
 */
export async function scoreDraftSections(
  sections: DraftSection[],
  sectionSpecs: GrantApplicationSection[],
  portName: string,
): Promise<DraftSection[]> {
  const scored = await Promise.all(
    sections.map(async (section, i) => {
      const spec = sectionSpecs[i];
      if (!spec) return section;
      const result = await scoreSection(section, spec, portName);
      return {
        ...section,
        confidence: result.confidence,
        confidenceReason: result.confidenceReason,
        confidenceDetails: result.details,
      };
    })
  );
  return scored;
}
