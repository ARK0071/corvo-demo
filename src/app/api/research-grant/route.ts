import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";
import { fetchGrantDetails } from "@/lib/grants-gov";
import { matchFormsInText, getCommonForms, type FederalForm } from "@/data/federal-forms";

export const maxDuration = 120;

// ─── Brave Search helper ───

interface WebResult {
  title: string;
  url: string;
  description: string;
}

async function braveSearch(query: string, count = 5): Promise<WebResult[]> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) return [];

  try {
    const params = new URLSearchParams({ q: query, count: String(count) });
    const res = await fetch(
      `https://api.search.brave.com/res/v1/web/search?${params}`,
      {
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip",
          "X-Subscription-Token": apiKey,
        },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.web?.results ?? []).slice(0, count).map(
      (r: { title?: string; url?: string; description?: string }) => ({
        title: r.title ?? "",
        url: r.url ?? "",
        description: r.description ?? "",
      })
    );
  } catch {
    return [];
  }
}

// ─── Smaller schemas for parallel Haiku calls ───

const EntityProfileSchema = z.object({
  name: z.string(),
  legalName: z.string(),
  entityType: z.string(),
  classification: z.string(),
  city: z.string(),
  state: z.string(),
  stateCode: z.string(),
  county: z.string(),
  region: z.string(),
  congressionalDistrict: z.string(),
  annualRevenue: z.number(),
  operatingBudget: z.number(),
  capitalBudget: z.number(),
  bondRating: z.string(),
  totalAssets: z.number(),
  annualTonnage: z.number(),
  annualTEUs: z.number(),
  vesselCalls: z.number(),
  employeeCount: z.number(),
  directJobs: z.number(),
  cargoTypes: z.array(z.string()),
  keyFacilities: z.array(z.string()),
  acreage: z.number(),
  regionalEconomicImpact: z.number(),
  totalJobs: z.number(),
  tradeValue: z.number(),
  currentProjects: z.array(z.string()).describe("Format: 'Name | Description | $Cost | Status'"),
  pastGrantAwards: z.array(z.string()).describe("Format: 'Program | Year | $Amount | Project Name'"),
  certifications: z.array(z.string()),
  strategicPriorities: z.array(z.string()),
  environmentalGoals: z.array(z.string()),
  dataQuality: z.enum(["high", "medium", "low"]),
  dataGaps: z.array(z.string()),
});

const GrantRequirementsSchema = z.object({
  sections: z.array(z.object({
    title: z.string(),
    description: z.string(),
    maxWords: z.number(),
    weight: z.number(),
    criteria: z.array(z.string()),
  })),
  costShareRequired: z.boolean(),
  costSharePercentage: z.number(),
  maxAward: z.number(),
  eligibleApplicants: z.array(z.string()),
  submissionDeadline: z.string(),
  forms: z.array(z.object({
    number: z.string(),
    name: z.string(),
    notes: z.string(),
  })),
  dataQuality: z.enum(["high", "medium", "low"]),
  keyFindings: z.array(z.string()),
});

// ─── Main route ───

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "ANTHROPIC_API_KEY is not configured." }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { grantId, grantTitle, entityName = "Port Freeport" } = body;

    if (!grantId || !grantTitle) {
      return Response.json({ error: "grantId and grantTitle are required" }, { status: 400 });
    }

    // ─── Step 1: Fetch grant details from Grants.gov (free, no auth) ───
    let grantDetails: any = null;
    let grantDescription = "";
    try {
      grantDetails = await fetchGrantDetails(grantId);
      grantDescription = grantDetails.description || "";
    } catch (e) {
      console.log("Could not fetch from Grants.gov, using title only:", grantId);
    }

    // ─── Step 2: Parallel web searches via Brave (if key available) ───
    const [entityResults, grantNofoResults, entityFinancialResults] = await Promise.all([
      braveSearch(`${entityName} ACFR annual comprehensive financial report`),
      braveSearch(`${grantTitle} NOFO notice of funding opportunity requirements`),
      braveSearch(`${entityName} annual revenue budget capital projects infrastructure`),
    ]);

    const entityContext = [
      entityResults.length > 0
        ? entityResults.map((r) => `- ${r.title}: ${r.description}`).join("\n")
        : "",
      entityFinancialResults.length > 0
        ? entityFinancialResults.map((r) => `- ${r.title}: ${r.description}`).join("\n")
        : "",
    ].filter(Boolean).join("\n");

    const grantContext = grantNofoResults.length > 0
      ? grantNofoResults.map((r) => `- ${r.title}: ${r.description}`).join("\n")
      : "";

    // ─── Step 3: Static form matching ───
    const combinedText = `${grantTitle} ${grantDescription}`;
    const staticForms = matchFormsInText(combinedText);

    const grantsGovBlock = grantDetails ? `GRANTS.GOV DATA:
Agency: ${grantDetails.agency || "Unknown"}
Award Ceiling: $${grantDetails.awardCeiling || 0}
Total Funding: $${grantDetails.totalFunding || 0}
Close Date: ${grantDetails.closeDate || "Unknown"}
Cost Sharing: ${grantDetails.costSharing ? "Yes" : "No"}
Eligibility: ${(grantDetails.eligibility || []).join(", ") || "Not specified"}
Description: ${grantDescription.slice(0, 2000)}` : "No Grants.gov data available.";

    // ─── Step 4: Two parallel Haiku calls (smaller schemas = no grammar issues) ───
    const [entityResult, grantResult] = await Promise.all([
      generateObject({
        model: anthropic("claude-haiku-4-5-20251001"),
        schema: EntityProfileSchema,
        prompt: `Extract a structured entity profile for "${entityName}" from the web research below.
Use 0 for unknown numbers. Use empty arrays for unknown lists. Flag unknown data in dataGaps.

WEB RESEARCH:
${entityContext || `No web results. Infer what you can from the name "${entityName}".`}

Output the entity profile.`,
      }),
      generateObject({
        model: anthropic("claude-haiku-4-5-20251001"),
        schema: GrantRequirementsSchema,
        prompt: `Extract structured grant application requirements for "${grantTitle}".

${grantsGovBlock}

WEB RESEARCH ON NOFO:
${grantContext || "No web results. Use your knowledge of this grant program."}

FORMS DETECTED IN TEXT: ${staticForms.map((f) => f.number).join(", ") || "None — include standard federal forms (SF-424, SF-LLL, CD-511)"}

Extract application sections with scoring weights, required forms, and key requirements. If this is a known program (PIDP, RAISE, INFRA, BRIC, etc.), use your knowledge of typical requirements.`,
      }),
    ]);

    const ep = entityResult.object;
    const gr = grantResult.object;

    // ─── Step 5: Reshape flat entity into nested structure for the draft API ───
    const entityProfile = {
      name: ep.name,
      legalName: ep.legalName,
      entityType: ep.entityType,
      classification: ep.classification,
      location: {
        city: ep.city,
        state: ep.state,
        stateCode: ep.stateCode,
        county: ep.county,
        region: ep.region,
        congressionalDistrict: ep.congressionalDistrict,
      },
      financials: {
        annualRevenue: ep.annualRevenue,
        operatingBudget: ep.operatingBudget,
        capitalBudget: ep.capitalBudget,
        bondRating: ep.bondRating,
        totalAssets: ep.totalAssets,
      },
      operations: {
        annualTonnage: ep.annualTonnage,
        annualTEUs: ep.annualTEUs,
        vesselCalls: ep.vesselCalls,
        employeeCount: ep.employeeCount,
        directJobs: ep.directJobs,
        cargoTypes: ep.cargoTypes,
      },
      infrastructure: {
        keyFacilities: ep.keyFacilities,
        acreage: ep.acreage,
      },
      economicImpact: {
        regionalEconomicImpact: ep.regionalEconomicImpact,
        totalJobs: ep.totalJobs,
        tradeValue: ep.tradeValue,
      },
      currentProjects: ep.currentProjects.map((p) => {
        const parts = p.split("|").map((s) => s.trim());
        return {
          name: parts[0] || p,
          description: parts[1] || "",
          totalCost: parseInt((parts[2] || "0").replace(/[^0-9]/g, "")) || 0,
          status: parts[3] || "Unknown",
        };
      }),
      pastGrantAwards: ep.pastGrantAwards.map((g) => {
        const parts = g.split("|").map((s) => s.trim());
        return {
          program: parts[0] || g,
          awardYear: parseInt(parts[1] || "0") || 0,
          awardAmount: parseInt((parts[2] || "0").replace(/[^0-9]/g, "")) || 0,
          projectName: parts[3] || "",
        };
      }),
      certifications: ep.certifications,
      strategicPriorities: ep.strategicPriorities,
      environmentalGoals: ep.environmentalGoals,
    };

    const grantRequirements = {
      applicationSections: gr.sections.map((s) => ({
        title: s.title,
        description: s.description,
        maxWords: s.maxWords,
        weight: s.weight,
        evaluationCriteria: s.criteria,
      })),
      costShareRequired: gr.costShareRequired,
      costSharePercentage: gr.costSharePercentage,
      maxAward: gr.maxAward,
      eligibleApplicants: gr.eligibleApplicants,
      submissionDeadline: gr.submissionDeadline,
    };

    // ─── Step 6: Enrich forms with registry download links ───
    const allFormNumbers = new Set<string>();
    const enrichedForms: (FederalForm & { notes: string })[] = [];

    for (const form of gr.forms) {
      const registryMatch = staticForms.find(
        (f) => f.number.toUpperCase() === form.number.toUpperCase()
      ) || getCommonForms().find(
        (f) => f.number.toUpperCase() === form.number.toUpperCase()
      );

      if (registryMatch && !allFormNumbers.has(registryMatch.number.toUpperCase())) {
        enrichedForms.push({ ...registryMatch, notes: form.notes });
        allFormNumbers.add(registryMatch.number.toUpperCase());
      } else if (!allFormNumbers.has(form.number.toUpperCase())) {
        enrichedForms.push({
          id: form.number.toLowerCase().replace(/[^a-z0-9]/g, "-"),
          number: form.number,
          name: form.name,
          description: form.notes,
          url: "https://www.grants.gov/forms",
          family: "Other",
          commonlyRequired: false,
          notes: form.notes,
        });
        allFormNumbers.add(form.number.toUpperCase());
      }
    }

    for (const form of staticForms) {
      if (!allFormNumbers.has(form.number.toUpperCase())) {
        enrichedForms.push({ ...form, notes: "Detected in grant description" });
      }
    }

    return Response.json({
      entityProfile,
      grantRequirements,
      forms: enrichedForms,
      researchSummary: {
        entityDataQuality: ep.dataQuality,
        grantDataQuality: gr.dataQuality,
        keyFindings: gr.keyFindings,
        dataGaps: ep.dataGaps,
      },
      grantDetails: grantDetails ? {
        agency: grantDetails.agency,
        awardCeiling: grantDetails.awardCeiling,
        awardFloor: grantDetails.awardFloor,
        totalFunding: grantDetails.totalFunding,
        closeDate: grantDetails.closeDate,
        costSharing: grantDetails.costSharing,
        eligibility: grantDetails.eligibility,
        applicationUrl: grantDetails.applicationUrl,
        contactName: grantDetails.contactName,
        contactEmail: grantDetails.contactEmail,
      } : null,
      webSources: {
        entitySources: entityResults.map((r) => ({ title: r.title, url: r.url })),
        grantSources: grantNofoResults.map((r) => ({ title: r.title, url: r.url })),
      },
      metadata: {
        researchedAt: new Date().toISOString(),
        grantsGovAvailable: !!grantDetails,
        braveSearchAvailable: !!process.env.BRAVE_SEARCH_API_KEY,
        webResultsFound: entityResults.length + grantNofoResults.length + entityFinancialResults.length,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Research failed";
    console.error("Grant research error:", error);
    return Response.json({ error: message }, { status: 500 });
  }
}
