import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { PORT_FREEPORT_ENTITY, type EntityProfile } from "@/data/entity-profile";
import { PIDP_FY2026, type GrantRequirements, type GrantSection } from "@/data/grant-requirements";

export const maxDuration = 120;

/**
 * Merge a partial entity profile (from ACFR extraction) with sensible defaults
 * so the prompt builder doesn't crash on missing fields.
 */
function mergeWithDefaults(partial: Record<string, any>): EntityProfile {
  const defaults = PORT_FREEPORT_ENTITY;
  return {
    name: partial.name || defaults.name,
    legalName: partial.legalName || partial.name || defaults.legalName,
    entityType: partial.entityType || defaults.entityType,
    classification: partial.classification || defaults.classification,
    uei: partial.uei || "PENDING",
    ein: partial.ein || "PENDING",
    location: { ...defaults.location, ...(partial.location || {}) },
    leadership: { ...defaults.leadership, ...(partial.leadership || {}) },
    financials: {
      annualRevenue: partial.financials?.annualRevenue || 0,
      operatingBudget: partial.financials?.operatingBudget || 0,
      capitalBudget: partial.financials?.capitalBudget || 0,
      bondRating: partial.financials?.bondRating || "Not rated",
      matchFundingCapacity: partial.financials?.matchFundingCapacity || partial.financials?.cashAndInvestments || 0,
      totalAssets: partial.financials?.totalAssets || 0,
    },
    infrastructure: {
      terminalFacilities: partial.infrastructure?.keyFacilities || partial.infrastructure?.terminalFacilities || [],
      channelDepth: partial.infrastructure?.channelDepth || 0,
      channelWidth: partial.infrastructure?.channelWidth || 0,
      berths: partial.infrastructure?.berths || 0,
      railConnections: partial.infrastructure?.railConnections || [],
      acreage: partial.infrastructure?.acreage || 0,
    },
    operations: {
      annualTonnage: partial.operations?.annualTonnage || 0,
      annualTEUs: partial.operations?.annualTEUs || 0,
      vesselCalls: partial.operations?.vesselCalls || 0,
      employeeCount: partial.operations?.employeeCount || 0,
      directJobs: partial.operations?.directJobs || partial.operations?.employeeCount || 0,
      cargoTypes: partial.operations?.cargoTypes || [],
    },
    economicImpact: {
      regionalEconomicImpact: partial.economicImpact?.regionalEconomicImpact || 0,
      directJobs: partial.operations?.directJobs || partial.operations?.employeeCount || 0,
      totalJobs: partial.economicImpact?.totalJobs || 0,
      tradeValue: partial.economicImpact?.tradeValue || 0,
      annualTaxRevenue: partial.economicImpact?.annualTaxRevenue || 0,
    },
    currentProjects: (partial.currentProjects || []).map((p: any) => ({
      name: p.name || "",
      description: p.description || "",
      totalCost: p.totalCost || 0,
      status: p.status || "Unknown",
      partnerAgencies: p.partnerAgencies || [],
    })),
    pastGrantAwards: (partial.pastGrantAwards || []).map((g: any) => ({
      program: g.program || "",
      awardYear: g.awardYear || 0,
      awardAmount: g.awardAmount || 0,
      projectName: g.projectName || "",
      agency: g.agency || "",
      status: g.status || "Unknown",
    })),
    certifications: partial.certifications || [],
    strategicPriorities: partial.strategicPriorities || [],
    environmentalGoals: partial.environmentalGoals || [],
    communityImpact: partial.communityImpact || [],
    disadvantagedCommunityData: {
      description: partial.disadvantagedCommunity?.details || "",
      povertyRate: 0,
      pm25Percentile: 0,
      justiceFortyTracker: partial.disadvantagedCommunity?.mentioned || false,
      censusTract: "",
    },
    climateResilienceData: {
      floodZone: "",
      hurricaneExposure: "",
      emissionsBaseline: "",
      emissionsReductionTarget: "",
      existingMitigations: [],
      plannedMitigations: [],
    },
  };
}

interface SectionDraft {
  sectionId: string;
  title: string;
  content: string;
  confidence: "high" | "medium" | "low";
  confidenceReason: string;
  gapAnnotations: string[];
  wordCount: number;
  maxWords: number;
  weight: number;
}

interface DraftResponse {
  sections: SectionDraft[];
  overallCompleteness: number;
  attachmentsChecklist: AttachmentStatus[];
  generatedAt: string;
  grantProgram: string;
  applicantName: string;
}

interface AttachmentStatus {
  id: string;
  name: string;
  description: string;
  required: boolean;
  status: "on_file" | "needs_preparation" | "missing";
  notes: string;
}

function buildSectionPrompt(
  section: GrantSection,
  entity: EntityProfile,
  grantReqs: GrantRequirements
): string {
  return `You are an expert federal grant writer specializing in maritime and transportation infrastructure grants. Write the "${section.title}" section for a ${grantReqs.programName} application.

APPLICANT: ${entity.name} (${entity.legalName})
Location: ${entity.location.city}, ${entity.location.state} (${entity.location.congressionalDistrict})
Entity Type: ${entity.entityType} — ${entity.classification}

PROJECT: Freeport Harbor Channel Improvement Project (FHCIP) — Deepening the Freeport Harbor Channel from 46 ft to 56 ft MLLW in partnership with USACE, combined with Velasco Terminal Phase 2 expansion and zero-emission equipment deployment.

GRANT PROGRAM: ${grantReqs.programName}
Agency: ${grantReqs.agency}
Max Award: $${(grantReqs.maxAward / 1_000_000).toFixed(0)}M | Cost Share: ${grantReqs.costShareMinimum}% minimum

SECTION REQUIREMENTS:
${section.description}

Word Limit: ${section.maxWords} words
Scoring Weight: ${section.weight}% of total score

EVALUATION CRITERIA (write to maximize points on each):
${section.evaluationCriteria.map((c, i) => `${i + 1}. ${c}`).join("\n")}

REQUIRED ELEMENTS (must address each):
${section.requiredElements.map((e, i) => `${i + 1}. ${e}`).join("\n")}

APPLICANT BACKGROUND DATA:
- Annual Revenue: $${(entity.financials.annualRevenue / 1_000_000).toFixed(0)}M
- Operating Budget: $${(entity.financials.operatingBudget / 1_000_000).toFixed(0)}M
- Capital Budget: $${(entity.financials.capitalBudget / 1_000_000).toFixed(0)}M
- Bond Rating: ${entity.financials.bondRating}
- Match Funding Capacity: $${(entity.financials.matchFundingCapacity / 1_000_000).toFixed(0)}M
- Total Assets: $${(entity.financials.totalAssets / 1_000_000).toFixed(0)}M

INFRASTRUCTURE:
${entity.infrastructure.terminalFacilities.map(f => `- ${f}`).join("\n")}
- Channel: ${entity.infrastructure.channelDepth} ft depth, ${entity.infrastructure.channelWidth} ft width
- Berths: ${entity.infrastructure.berths}
- Rail: ${entity.infrastructure.railConnections.join("; ")}

OPERATIONS:
- Annual Tonnage: ${(entity.operations.annualTonnage / 1_000_000).toFixed(0)}M metric tons
- Annual TEUs: ${entity.operations.annualTEUs.toLocaleString()}
- Vessel Calls: ${entity.operations.vesselCalls.toLocaleString()}/year
- Employees: ${entity.operations.employeeCount} (direct port jobs: ${entity.operations.directJobs.toLocaleString()})

ECONOMIC IMPACT:
- Regional Economic Impact: $${(entity.economicImpact.regionalEconomicImpact / 1_000_000_000).toFixed(1)}B annually
- Direct Jobs: ${entity.economicImpact.directJobs.toLocaleString()}
- Total Jobs (direct + indirect): ${entity.economicImpact.totalJobs.toLocaleString()}
- Trade Value: $${(entity.economicImpact.tradeValue / 1_000_000_000).toFixed(0)}B
- Tax Revenue: $${(entity.economicImpact.annualTaxRevenue / 1_000_000).toFixed(0)}M

CURRENT PROJECTS:
${entity.currentProjects.map(p => `- ${p.name}: ${p.description} (Cost: $${(p.totalCost / 1_000_000).toFixed(0)}M, Status: ${p.status})`).join("\n")}

PAST GRANT AWARDS:
${entity.pastGrantAwards.map(g => `- ${g.program} (${g.awardYear}): $${(g.awardAmount / 1_000_000).toFixed(1)}M for ${g.projectName}`).join("\n")}

CERTIFICATIONS: ${entity.certifications.join("; ")}

ENVIRONMENTAL GOALS:
${entity.environmentalGoals.map(g => `- ${g}`).join("\n")}

DISADVANTAGED COMMUNITY DATA:
${entity.disadvantagedCommunityData.description}
- Poverty Rate: ${entity.disadvantagedCommunityData.povertyRate}%
- PM2.5 Percentile: ${entity.disadvantagedCommunityData.pm25Percentile}th
- Justice40 Qualifying: ${entity.disadvantagedCommunityData.justiceFortyTracker ? "Yes" : "No"}

CLIMATE RESILIENCE:
- Flood Zone: ${entity.climateResilienceData.floodZone}
- Hurricane Exposure: ${entity.climateResilienceData.hurricaneExposure}
- Emissions Baseline: ${entity.climateResilienceData.emissionsBaseline}
- Reduction Target: ${entity.climateResilienceData.emissionsReductionTarget}
- Existing Mitigations: ${entity.climateResilienceData.existingMitigations.join("; ")}
- Planned Mitigations: ${entity.climateResilienceData.plannedMitigations.join("; ")}

STRATEGIC PRIORITIES:
${entity.strategicPriorities.map(p => `- ${p}`).join("\n")}

COMMUNITY IMPACT PROGRAMS:
${entity.communityImpact.map(c => `- ${c}`).join("\n")}

INSTRUCTIONS:
1. Write in formal federal grant prose — the kind a port director or CFO would recognize as a credible first draft.
2. Optimize for the evaluation criteria above. Each criterion should be clearly addressed.
3. Use specific data from the applicant background. Cite real numbers — tonnage, jobs, economic impact, past awards.
4. Where data is missing or you need human verification, insert an inline annotation in exactly this format: [NEEDS: specific description of what's missing]. Be specific, not generic — e.g., "[NEEDS: updated Phase 2 construction cost estimate from engineer]" not "[NEEDS: more information]".
5. Stay within the word limit of ${section.maxWords} words.
6. Do NOT hallucinate data. If a specific number or fact is not provided above, flag it with a [NEEDS: ...] annotation.
7. Structure with clear paragraphs. Use no markdown headers — this will be rendered as flowing prose sections.
8. Reference the PIDP statutory priorities and DOT strategic goals where relevant.

Write the complete section now. Output ONLY the section text — no preamble, no meta-commentary.`;
}

function assessConfidence(
  content: string,
  section: GrantSection,
): { confidence: "high" | "medium" | "low"; reason: string } {
  const gaps = (content.match(/\[NEEDS:[^\]]+\]/g) || []).length;
  const wordCount = content.split(/\s+/).length;
  const wordRatio = wordCount / section.maxWords;

  if (gaps === 0 && wordRatio >= 0.6) {
    return { confidence: "high", reason: "All required data available from entity profile. Section fully drafted." };
  }
  if (gaps <= 2 && wordRatio >= 0.5) {
    return { confidence: "medium", reason: `${gaps} data gap(s) flagged for human verification. Core content is solid.` };
  }
  return { confidence: "low", reason: `${gaps} data gap(s) require input. Section needs significant review.` };
}

function assessAttachments(entity: EntityProfile, grantReqs: GrantRequirements): AttachmentStatus[] {
  return grantReqs.requiredAttachments.map((att) => {
    switch (att.id) {
      case "sf424":
        return { ...att, status: "needs_preparation" as const, notes: "Standard form — populate from entity registration data (UEI, EIN, DUNS)." };
      case "sf424c":
        return { ...att, status: "needs_preparation" as const, notes: "Requires detailed construction budget breakdown from project engineer." };
      case "bca-spreadsheet":
        return { ...att, status: "needs_preparation" as const, notes: "BCA spreadsheet must be developed using DOT-approved methodology. Consider engaging economic consultant." };
      case "project-schedule":
        return { ...att, status: "needs_preparation" as const, notes: "Gantt chart needed from project manager showing milestones through completion." };
      case "letters-of-support":
        return { ...att, status: "needs_preparation" as const, notes: "Obtain letters from USACE, TX-14 Congressional office, Brazoria County, BNSF Railway, and local workforce board." };
      case "environmental-docs":
        return {
          ...att,
          status: "on_file" as const,
          notes: "NEPA documentation available from USACE for FHCIP. Verify current status and obtain copy of Record of Decision or Finding of No Significant Impact.",
        };
      case "financial-statements":
        return { ...att, status: "on_file" as const, notes: `FY${new Date().getFullYear() - 1} audited financials on file. Bond rating: ${entity.financials.bondRating}.` };
      case "match-commitment":
        return {
          ...att,
          status: "needs_preparation" as const,
          notes: `Board resolution needed committing ${grantReqs.costShareMinimum}% match ($${(grantReqs.costShareMinimum * grantReqs.maxAward / 100 / 1_000_000).toFixed(0)}M at max award). Match capacity: $${(entity.financials.matchFundingCapacity / 1_000_000).toFixed(0)}M available.`,
        };
      case "maps-drawings":
        return { ...att, status: "on_file" as const, notes: "Site maps and preliminary engineering drawings available from FHCIP and Velasco Terminal Phase 2 planning." };
      case "equity-analysis":
        return { ...att, status: "needs_preparation" as const, notes: "Generate CEJST and EJScreen reports for census tracts 48039-7101, 7102, 7103. Data points available in entity profile." };
      case "resilience-assessment":
        return { ...att, status: "needs_preparation" as const, notes: "Compile from existing Port Hurricane Preparedness Plan and FHCIP engineering resilience analysis." };
      default:
        return { ...att, status: "missing" as const, notes: "Status unknown — verify with grants team." };
    }
  });
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY is not configured." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json();
    const _grantId = body.grantId || "pidp-fy2026";
    const _portName = body.portName || "Port Freeport";

    // Use uploaded/extracted profile if provided, otherwise fall back to hardcoded demo
    const entity: EntityProfile = body.entityProfile
      ? mergeWithDefaults(body.entityProfile)
      : PORT_FREEPORT_ENTITY;

    // Use custom grant sections if provided (from NOFO extraction), otherwise use PIDP defaults
    const grantReqs: GrantRequirements = body.grantRequirements
      ? { ...PIDP_FY2026, ...body.grantRequirements }
      : PIDP_FY2026;

    // Generate all sections in parallel for speed
    const sectionPromises = grantReqs.sections.map(async (section): Promise<SectionDraft> => {
      const prompt = buildSectionPrompt(section, entity, grantReqs);

      const result = await generateText({
        model: anthropic("claude-sonnet-4-5-20250929"),
        prompt,
      });

      const content = result.text;
      const wordCount = content.split(/\s+/).length;
      const gapAnnotations = (content.match(/\[NEEDS:[^\]]+\]/g) || []).map((g) => g.replace(/^\[NEEDS:\s*/, "").replace(/\]$/, ""));
      const { confidence, reason } = assessConfidence(content, section);

      return {
        sectionId: section.id,
        title: section.title,
        content,
        confidence,
        confidenceReason: reason,
        gapAnnotations,
        wordCount,
        maxWords: section.maxWords,
        weight: section.weight,
      };
    });

    const sections = await Promise.all(sectionPromises);

    // Calculate overall completeness
    const totalWeight = sections.reduce((sum, s) => sum + s.weight, 0);
    const weightedCompleteness = sections.reduce((sum, s) => {
      const sectionCompleteness =
        s.confidence === "high" ? 1.0 : s.confidence === "medium" ? 0.7 : 0.4;
      return sum + sectionCompleteness * s.weight;
    }, 0);
    const overallCompleteness = Math.round((weightedCompleteness / totalWeight) * 100);

    // Assess attachment readiness
    const attachmentsChecklist = assessAttachments(entity, grantReqs);

    const response: DraftResponse = {
      sections,
      overallCompleteness,
      attachmentsChecklist,
      generatedAt: new Date().toISOString(),
      grantProgram: grantReqs.programName,
      applicantName: entity.name,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    console.error("Grant draft error:", error);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
