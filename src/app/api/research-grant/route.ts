import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";
import pdf from "pdf-parse";
import { fetchGrantDetails } from "@/lib/grants-gov";
import { matchFormsInText, getCommonForms, getValidFormNumbers, FEDERAL_FORMS, type FederalForm } from "@/data/federal-forms";

export const maxDuration = 120;

// ─── Brave Search helper with sequential queuing ───

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
    if (!res.ok) {
      console.log(`[brave] ${res.status} for query: ${query.slice(0, 60)}`);
      return [];
    }
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

// ─── PDF auto-fetch helpers ───

/**
 * Search Brave specifically for PDF URLs matching a query.
 * Returns the first PDF URL found, or null.
 */
async function findPdfUrl(query: string): Promise<string | null> {
  // Search for PDF URLs
  const results = await braveSearch(query, 8);
  // Look for direct PDF links first
  for (const r of results) {
    if (r.url.toLowerCase().endsWith(".pdf")) return r.url;
  }
  // Also try URLs that contain "pdf" in path (common for gov sites)
  for (const r of results) {
    if (r.url.toLowerCase().includes(".pdf")) return r.url;
  }
  return null;
}

/**
 * Fetch a PDF from a URL and extract its text.
 * Returns null if fetch fails, PDF is too large, or text extraction fails.
 */
async function fetchAndParsePdf(url: string, maxSizeMB = 50): Promise<{ text: string; numpages: number } | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(30000),
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept": "application/pdf,*/*",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") || "";
    // Verify it's actually a PDF
    if (!contentType.includes("pdf") && !url.toLowerCase().endsWith(".pdf")) return null;

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length > maxSizeMB * 1024 * 1024) return null;

    const pdfData = await pdf(buffer);
    if (!pdfData.text || pdfData.text.trim().length < 200) return null;

    return { text: pdfData.text, numpages: pdfData.numpages };
  } catch {
    return null;
  }
}

/**
 * Extract relevant pages from ACFR (reuse logic from extract-acfr route).
 */
function extractRelevantAcfrPages(fullText: string, totalPages: number): string {
  const lines = fullText.split("\n");
  const linesPerPage = Math.ceil(lines.length / Math.max(totalPages, 1));
  const sections: string[] = [];

  // First ~20 pages (transmittal letter, MD&A)
  const mdaEnd = Math.min(20 * linesPerPage, lines.length);
  sections.push(lines.slice(0, mdaEnd).join("\n"));

  // Financial statements (~pages 20-50)
  const fsStart = Math.floor(Math.max(15, totalPages * 0.1) * linesPerPage);
  const fsEnd = Math.min(Math.floor(Math.max(50, totalPages * 0.35) * linesPerPage), lines.length);
  if (fsStart < lines.length) sections.push(lines.slice(fsStart, fsEnd).join("\n"));

  // Statistical section (last 15%)
  const statStart = Math.floor(Math.max(0, totalPages - Math.ceil(totalPages * 0.15)) * linesPerPage);
  if (statStart < lines.length) sections.push(lines.slice(statStart).join("\n"));

  const combined = sections.join("\n\n--- SECTION BREAK ---\n\n");
  return combined.length > 80_000 ? combined.slice(0, 80_000) + "\n\n[TRUNCATED]" : combined;
}

// ─── NOFO validation schema ───

const NOFOValidationSchema = z.object({
  isMatch: z.boolean().describe("true if this NOFO is for the target grant program"),
  confidence: z.enum(["high", "medium", "low"]),
  detectedProgram: z.string().describe("The program name detected in the NOFO"),
  detectedFiscalYear: z.string().describe("The fiscal year detected, e.g., 'FY 2025'"),
  reason: z.string().describe("Brief explanation of why this is or isn't a match"),
});

// ─── NOFO extraction schema (reused from extract-nofo-forms) ───

const NOFOExtractSchema = z.object({
  requiredForms: z.array(z.object({
    formNumber: z.string().describe("Form number, e.g., SF-424"),
    formName: z.string().describe("Full form name"),
    notes: z.string().describe("Any specific instructions for this form from the NOFO"),
    required: z.boolean().describe("true if the NOFO states this form is required, false if conditional or optional"),
  })),
  applicationSections: z.array(z.object({
    title: z.string(),
    description: z.string(),
    maxWords: z.number().describe("Word or page limit. Convert pages to words (250 words/page). Use 5000 if no limit stated."),
    weight: z.number().describe("Scoring weight as percentage. Use 0 if not stated."),
    evaluationCriteria: z.array(z.string()),
  })),
  submissionDeadline: z.string(),
  costShareRequired: z.boolean(),
  costSharePercentage: z.number(),
  maxAward: z.number(),
  eligibleApplicants: z.array(z.string()),
});

// ─── ACFR entity profile schema (reused from extract-acfr) ───

const ACFREntitySchema = z.object({
  name: z.string(),
  legalName: z.string(),
  entityType: z.string(),
  classification: z.string(),
  location: z.object({
    city: z.string(), state: z.string(), stateCode: z.string(),
    county: z.string(), region: z.string(), congressionalDistrict: z.string(),
  }),
  financials: z.object({
    annualRevenue: z.number(), operatingBudget: z.number(), capitalBudget: z.number(),
    bondRating: z.string(), totalAssets: z.number(),
  }),
  operations: z.object({
    annualTonnage: z.number(), annualTEUs: z.number(), vesselCalls: z.number(),
    employeeCount: z.number(), directJobs: z.number(), cargoTypes: z.array(z.string()),
  }),
  infrastructure: z.object({ keyFacilities: z.array(z.string()), acreage: z.number() }),
  economicImpact: z.object({ regionalEconomicImpact: z.number(), totalJobs: z.number(), tradeValue: z.number() }),
  currentProjects: z.array(z.object({ name: z.string(), description: z.string(), totalCost: z.number(), status: z.string() })),
  pastGrantAwards: z.array(z.object({ program: z.string(), awardYear: z.number(), awardAmount: z.number(), projectName: z.string() })),
  certifications: z.array(z.string()),
  strategicPriorities: z.array(z.string()),
  environmentalGoals: z.array(z.string()),
});

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

    // ─── Step 2: Parallel web searches + PDF URL discovery via Brave ───
    const [entityResults, grantNofoResults, entityFinancialResults, nofoPdfUrl, acfrPdfUrl] = await Promise.all([
      braveSearch(`${entityName} port authority overview infrastructure operations`, 8),
      braveSearch(`${grantTitle} NOFO notice of funding opportunity requirements`, 8),
      braveSearch(`${entityName} annual revenue budget capital projects financials`, 8),
      findPdfUrl(`${grantTitle} NOFO notice of funding opportunity filetype:pdf`),
      findPdfUrl(`"${entityName}" ACFR annual comprehensive financial report filetype:pdf`),
    ]);

    console.log("[research] NOFO PDF URL:", nofoPdfUrl || "not found");
    console.log("[research] ACFR PDF URL:", acfrPdfUrl || "not found");

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

    // ─── Step 3: Parallel PDF fetch + parse (NOFO & ACFR) ───
    const [nofoPdf, acfrPdf] = await Promise.all([
      nofoPdfUrl ? fetchAndParsePdf(nofoPdfUrl) : Promise.resolve(null),
      acfrPdfUrl ? fetchAndParsePdf(acfrPdfUrl, 50) : Promise.resolve(null),
    ]);

    console.log("[research] NOFO PDF parsed:", nofoPdf ? `${nofoPdf.numpages} pages` : "failed/skipped");
    console.log("[research] ACFR PDF parsed:", acfrPdf ? `${acfrPdf.numpages} pages` : "failed/skipped");

    // ─── Step 3b: Validate auto-fetched NOFO matches the target grant ───
    let nofoValidation: { isMatch: boolean; confidence: string; detectedProgram: string; detectedFiscalYear: string; reason: string } | null = null;
    let validatedNofoPdf = nofoPdf;

    if (nofoPdf) {
      try {
        const { object: validation } = await generateObject({
          model: anthropic("claude-haiku-4-5-20251001"),
          schema: NOFOValidationSchema,
          prompt: `Does this NOFO document match the grant program "${grantTitle}"?

Check the program name, NOFO number, and fiscal year. The NOFO must be for the same program - not just a related one.

NOFO TEXT (first 3000 chars):
${nofoPdf.text.slice(0, 3000)}`,
        });
        nofoValidation = validation;
        console.log("[research] NOFO validation:", validation.isMatch ? "MATCH" : "NO MATCH", `(${validation.confidence})`, validation.reason);

        if (!validation.isMatch || validation.confidence === "low") {
          console.log("[research] Discarding auto-fetched NOFO - does not match target grant");
          validatedNofoPdf = null;
        }
      } catch (e) {
        console.log("[research] NOFO validation failed, keeping NOFO:", e);
      }
    }

    // ─── Step 4: Static form matching against all available text ───
    const allSearchText = [
      grantTitle,
      grantDescription,
      ...grantNofoResults.map(r => `${r.title} ${r.description}`),
      // Include validated NOFO PDF text for form matching if available
      validatedNofoPdf ? validatedNofoPdf.text.slice(0, 10000) : "",
    ].join(" ");
    const staticForms = matchFormsInText(allSearchText);

    const grantsGovBlock = grantDetails ? `GRANTS.GOV DATA:
Agency: ${grantDetails.agency || "Unknown"}
Award Ceiling: $${grantDetails.awardCeiling || 0}
Total Funding: $${grantDetails.totalFunding || 0}
Close Date: ${grantDetails.closeDate || "Unknown"}
Cost Sharing: ${grantDetails.costSharing ? "Yes" : "No"}
Eligibility: ${(grantDetails.eligibility || []).join(", ") || "Not specified"}
Description: ${grantDescription.slice(0, 2000)}` : "No Grants.gov data available.";

    // ─── Step 5: Parallel AI extraction - different paths for PDF vs web-only ───
    // Run all extractions in parallel for maximum speed
    const aiTasks: Promise<any>[] = [];

    // Task 0: Entity profile from web (always runs as baseline)
    aiTasks.push(
      generateObject({
        model: anthropic("claude-haiku-4-5-20251001"),
        schema: EntityProfileSchema,
        prompt: `Extract a structured entity profile for "${entityName}" from the web research below.
Use 0 for unknown numbers. Use empty arrays for unknown lists. Flag unknown data in dataGaps.

WEB RESEARCH:
${entityContext || `No web results. Infer what you can from the name "${entityName}".`}

Output the entity profile.`,
      })
    );

    // Task 1: Grant requirements from web (always runs as fallback)
    aiTasks.push(
      generateObject({
        model: anthropic("claude-haiku-4-5-20251001"),
        schema: GrantRequirementsSchema,
        prompt: `Extract structured grant application requirements for "${grantTitle}".

${grantsGovBlock}

WEB RESEARCH ON NOFO:
${grantContext || "No web results. Use your knowledge of this grant program."}

FORMS ALREADY DETECTED IN GRANT TEXT: ${staticForms.map((f) => `${f.number} (${f.name})`).join(", ") || "None detected yet"}

VALID FEDERAL FORM NUMBERS (only use these): ${getValidFormNumbers().join(", ")}

Extract application sections with scoring weights, required forms, and key requirements. For forms, ONLY include form numbers from the valid list above - do not invent form numbers. If this is a known program (PIDP, RAISE, INFRA, BRIC, etc.), use your knowledge of typical requirements to select the appropriate forms.`,
      })
    );

    // Task 2: NOFO PDF extraction (if validated PDF was fetched)
    if (validatedNofoPdf) {
      const nofoText = validatedNofoPdf.text.length > 60_000
        ? validatedNofoPdf.text.slice(0, 60_000) + "\n\n[TRUNCATED]"
        : validatedNofoPdf.text;
      aiTasks.push(
        generateObject({
          model: anthropic("claude-haiku-4-5-20251001"),
          schema: NOFOExtractSchema,
          prompt: `Extract application requirements from this Notice of Funding Opportunity (NOFO).

Focus on:
1. Required forms and their specific instructions
2. Application sections/narrative requirements with word/page limits and scoring weights
3. Submission deadline and method
4. Cost sharing requirements
5. Maximum award amount
6. Eligible applicant types
7. Evaluation criteria per section

NOFO TEXT:
${nofoText}`,
        })
      );
    } else {
      aiTasks.push(Promise.resolve(null));
    }

    // Task 3: ACFR entity profile extraction (if PDF was fetched)
    if (acfrPdf) {
      const acfrText = extractRelevantAcfrPages(acfrPdf.text, acfrPdf.numpages);
      aiTasks.push(
        generateObject({
          model: anthropic("claude-haiku-4-5-20251001"),
          schema: ACFREntitySchema,
          prompt: `Extract a structured entity profile from this Annual Comprehensive Financial Report (ACFR).
For fields not found, use reasonable defaults (0 for numbers, empty arrays, "Not found" for strings).

Focus on:
1. Entity name, type, and location
2. Financial data from Statement of Net Position and Revenues/Expenses
3. Operating statistics (tonnage, TEUs, employees)
4. Capital projects from Notes or MD&A
5. Grant awards from Notes or Revenue schedules
6. Strategic priorities and environmental goals

ACFR TEXT:
${acfrText}`,
        })
      );
    } else {
      aiTasks.push(Promise.resolve(null));
    }

    const [entityResult, grantResult, nofoResult, acfrResult] = await Promise.all(aiTasks);

    const ep = entityResult.object;
    const gr = grantResult.object;
    const nofoExtracted = nofoResult?.object || null;
    const acfrExtracted = acfrResult?.object || null;

    console.log("[research] NOFO extraction:", nofoExtracted ? "success" : "skipped");
    console.log("[research] ACFR extraction:", acfrExtracted ? "success" : "skipped");

    // ─── Step 6: Reshape entity - ACFR data overrides web-estimated data ───
    const acfr = acfrExtracted; // may be null
    const entityProfile = {
      name: acfr?.name || ep.name,
      legalName: acfr?.legalName || ep.legalName,
      entityType: acfr?.entityType || ep.entityType,
      classification: acfr?.classification || ep.classification,
      location: acfr?.location || {
        city: ep.city,
        state: ep.state,
        stateCode: ep.stateCode,
        county: ep.county,
        region: ep.region,
        congressionalDistrict: ep.congressionalDistrict,
      },
      financials: acfr?.financials || {
        annualRevenue: ep.annualRevenue,
        operatingBudget: ep.operatingBudget,
        capitalBudget: ep.capitalBudget,
        bondRating: ep.bondRating,
        totalAssets: ep.totalAssets,
      },
      operations: acfr?.operations || {
        annualTonnage: ep.annualTonnage,
        annualTEUs: ep.annualTEUs,
        vesselCalls: ep.vesselCalls,
        employeeCount: ep.employeeCount,
        directJobs: ep.directJobs,
        cargoTypes: ep.cargoTypes,
      },
      infrastructure: acfr?.infrastructure || {
        keyFacilities: ep.keyFacilities,
        acreage: ep.acreage,
      },
      economicImpact: acfr?.economicImpact || {
        regionalEconomicImpact: ep.regionalEconomicImpact,
        totalJobs: ep.totalJobs,
        tradeValue: ep.tradeValue,
      },
      currentProjects: acfr?.currentProjects || ep.currentProjects.map((p: string) => {
        const parts = p.split("|").map((s: string) => s.trim());
        return {
          name: parts[0] || p,
          description: parts[1] || "",
          totalCost: parseInt((parts[2] || "0").replace(/[^0-9]/g, "")) || 0,
          status: parts[3] || "Unknown",
        };
      }),
      pastGrantAwards: acfr?.pastGrantAwards || ep.pastGrantAwards.map((g: string) => {
        const parts = g.split("|").map((s: string) => s.trim());
        return {
          program: parts[0] || g,
          awardYear: parseInt(parts[1] || "0") || 0,
          awardAmount: parseInt((parts[2] || "0").replace(/[^0-9]/g, "")) || 0,
          projectName: parts[3] || "",
        };
      }),
      certifications: acfr?.certifications || ep.certifications,
      strategicPriorities: acfr?.strategicPriorities || ep.strategicPriorities,
      environmentalGoals: acfr?.environmentalGoals || ep.environmentalGoals,
    };

    // ─── Step 7: Build grant requirements - NOFO PDF overrides AI-estimated ───
    const nofoSections = nofoExtracted?.applicationSections;
    const hasNofoSections = nofoSections && nofoSections.length > 0;

    const grantRequirements = hasNofoSections ? {
      applicationSections: nofoSections.map((s: any) => ({
        title: s.title,
        description: s.description,
        maxWords: s.maxWords,
        weight: s.weight,
        evaluationCriteria: s.evaluationCriteria || [],
      })),
      costShareRequired: nofoExtracted.costShareRequired,
      costSharePercentage: nofoExtracted.costSharePercentage,
      maxAward: nofoExtracted.maxAward || gr.maxAward,
      eligibleApplicants: nofoExtracted.eligibleApplicants,
      submissionDeadline: nofoExtracted.submissionDeadline || gr.submissionDeadline,
      source: "nofo-extracted" as const,
    } : {
      applicationSections: gr.sections.map((s: { title: string; description: string; maxWords: number; weight: number; criteria: string[] }) => ({
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
      source: "ai-estimated" as const,
    };

    // ─── Step 8: Enrich forms - only include verified registry forms ───
    // Each form carries: registry data + notes + required flag
    type EnrichedForm = FederalForm & { notes: string; required: boolean };
    const allFormNumbers = new Set<string>();
    const enrichedForms: EnrichedForm[] = [];

    // Helper to match a form number against the registry
    const findRegistry = (num: string) => FEDERAL_FORMS.find(
      (f) => f.number.toUpperCase() === num.toUpperCase()
        || f.number.toUpperCase().replace(/-/g, "") === num.toUpperCase().replace(/-/g, "")
    );

    const addForm = (form: FederalForm, notes: string, required: boolean) => {
      if (!allFormNumbers.has(form.number.toUpperCase())) {
        enrichedForms.push({ ...form, notes, required });
        allFormNumbers.add(form.number.toUpperCase());
      }
    };

    // First: add forms from NOFO PDF extraction (highest confidence)
    if (nofoExtracted?.requiredForms) {
      for (const form of nofoExtracted.requiredForms) {
        const registryMatch = findRegistry(form.formNumber);
        if (registryMatch) {
          addForm(registryMatch, form.notes || "Required per NOFO", form.required !== false);
        }
      }
    }

    // Second: add forms matched from static text search
    for (const form of staticForms) {
      addForm(form, "Required - detected in grant documentation", form.requiredLevel !== "if-applicable");
    }

    // Third: add AI-suggested forms from web research, but ONLY if they match the registry
    for (const form of gr.forms) {
      const registryMatch = findRegistry(form.number);
      if (registryMatch) {
        addForm(registryMatch, form.notes || "Identified from grant program requirements", registryMatch.requiredLevel === "required");
      }
    }

    // Fourth: for construction grants, ensure construction-specific forms; otherwise non-construction
    const isConstruction = allSearchText.toLowerCase().match(/construction|infrastructure|capital improvement|build|renovation|facility/);
    if (isConstruction) {
      for (const formId of ["sf424", "sf424c", "sf424d", "sf-lll", "cd511", "key-contacts", "project-abstract", "budget-narrative"]) {
        const form = FEDERAL_FORMS.find(f => f.id === formId);
        if (form) addForm(form, "Standard requirement for construction grants", true);
      }
    } else {
      for (const formId of ["sf424", "sf424a", "sf424b", "sf-lll", "cd511", "key-contacts", "project-abstract", "budget-narrative"]) {
        const form = FEDERAL_FORMS.find(f => f.id === formId);
        if (form) addForm(form, "Standard requirement for federal grants", true);
      }
    }

    return Response.json({
      entityProfile,
      grantRequirements,
      forms: enrichedForms,
      researchSummary: {
        entityDataQuality: acfrExtracted ? "high" : ep.dataQuality,
        grantDataQuality: nofoExtracted ? "high" : gr.dataQuality,
        keyFindings: gr.keyFindings,
        dataGaps: acfrExtracted ? [] : ep.dataGaps,
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
        nofoAutoFetched: !!nofoExtracted,
        nofoPdfUrl: nofoPdfUrl || null,
        nofoPdfPages: validatedNofoPdf?.numpages || 0,
        nofoValidation: nofoValidation || null,
        acfrAutoFetched: !!acfrExtracted,
        acfrPdfUrl: acfrPdfUrl || null,
        acfrPdfPages: acfrPdf?.numpages || 0,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Research failed";
    console.error("Grant research error:", error);
    return Response.json({ error: message }, { status: 500 });
  }
}
