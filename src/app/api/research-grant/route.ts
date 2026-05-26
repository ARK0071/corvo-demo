import { anthropic } from "@ai-sdk/anthropic";
import { generateObject, generateText, stepCountIs } from "ai";
import { z } from "zod";
import pdf from "pdf-parse";
import { fetchGrantDetails, fetchNofoAttachmentUrl } from "@/lib/grants-gov";
import { matchFormsInText, getValidFormNumbers, FEDERAL_FORMS, type FederalForm } from "@/data/federal-forms";

export const maxDuration = 120;

// ─── PDF helpers ───

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

// ─── Claude web search helper ───

/**
 * Use Claude with built-in web search to research a topic and return structured JSON.
 * Returns the text response and any source URLs cited.
 */
async function claudeWebResearch(prompt: string, maxSearches = 5): Promise<{ text: string; sources: { title: string; url: string }[] }> {
  try {
    const result = await generateText({
      model: anthropic("claude-haiku-4-5-20251001"),
      tools: {
        web_search: anthropic.tools.webSearch_20250305({ maxUses: maxSearches }),
      },
      stopWhen: stepCountIs(6),
      prompt,
    });

    // Extract source URLs from the result (AI SDK v6 populates sources automatically from web search)
    const sources: { title: string; url: string }[] = [];
    const seenUrls = new Set<string>();
    for (const source of result.sources || []) {
      if ("url" in source && source.url && !seenUrls.has(source.url)) {
        seenUrls.add(source.url);
        sources.push({ title: source.title || "", url: source.url });
      }
    }

    return { text: result.text, sources };
  } catch (error) {
    console.error("[research] Claude web search error:", error);
    return { text: "", sources: [] };
  }
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

// ─── Smaller schemas for parallel AI calls ───

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
  acfrPdfUrl: z.string().describe("URL to the entity's most recent ACFR PDF, or empty string if not found"),
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
  // Auth check
  const { auth } = await import("@/lib/auth/auth");
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  // Rate limit
  const { checkResearchRateLimit } = await import("@/lib/grant-drafting/rate-limit");
  const rateLimit = checkResearchRateLimit(session.user.id);
  if (!rateLimit.allowed) {
    return Response.json(
      { error: "Rate limit exceeded. Try again later.", resetAt: rateLimit.resetAt.toISOString() },
      { status: 429 },
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "ANTHROPIC_API_KEY is not configured." }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { grantId, grantTitle, entityName } = body;

    if (!grantId || !grantTitle) {
      return Response.json({ error: "grantId and grantTitle are required" }, { status: 400 });
    }

    if (!entityName) {
      return Response.json({ error: "entityName is required" }, { status: 400 });
    }

    // ─── Step 1: Fetch grant details from Grants.gov (free, no auth) ───
    let grantDetails: Awaited<ReturnType<typeof fetchGrantDetails>> | null = null;
    let grantDescription = "";
    try {
      grantDetails = await fetchGrantDetails(grantId);
      grantDescription = grantDetails.description || "";
    } catch (e) {
      console.log("Could not fetch from Grants.gov, using title only:", grantId);
    }

    // ─── Step 2: Parallel Claude web research + NOFO PDF discovery ───
    const opportunityNumber = grantDetails?.opportunityNumber;

    // Run entity research, grant research, and NOFO attachment fetch in parallel
    const [entityResearch, grantResearch, officialNofo] = await Promise.all([
      // Entity research with Claude web search — also finds ACFR PDF URL
      claudeWebResearch(
        `Research the entity "${entityName}" thoroughly. Search for:
1. Overview, operations, infrastructure, and facilities
2. Financial data: annual revenue, operating budget, capital budget, bond ratings, total assets
3. Current capital projects and their costs
4. Past federal grant awards (programs, amounts, years)
5. Employee count, economic impact figures
6. Strategic priorities and environmental/sustainability goals
7. The entity's most recent Annual Comprehensive Financial Report (ACFR) PDF — search for "${entityName} ACFR annual comprehensive financial report" and provide the direct URL to the PDF if found

Provide a comprehensive summary with specific numbers, dollar amounts, and facts. Cite your sources with URLs.`,
        5,
      ),
      // Grant requirements research with Claude web search
      claudeWebResearch(
        `Research the federal grant program "${grantTitle}"${opportunityNumber ? ` (opportunity number: ${opportunityNumber})` : ""}.
Search for:
1. The Notice of Funding Opportunity (NOFO) requirements and application sections
2. Scoring criteria and weights for each section
3. Required forms (SF-424, etc.)
4. Cost sharing / match requirements
5. Maximum award amounts
6. Eligible applicant types
7. Submission deadlines and methods
8. Any specific program priorities or evaluation criteria

Provide detailed findings with specific requirements. Cite your sources with URLs.`,
        5,
      ),
      // Official NOFO attachment from Grants.gov API
      fetchNofoAttachmentUrl(grantId),
    ]);

    // Extract ACFR PDF URL from entity research if Claude found one
    let acfrPdfUrl: string | null = null;
    const acfrUrlMatch = entityResearch.text.match(/https?:\/\/[^\s"'<>]+\.pdf/gi);
    if (acfrUrlMatch) {
      // Prefer URLs containing "acfr" or "annual comprehensive"
      for (const url of acfrUrlMatch) {
        if (url.toLowerCase().includes("acfr") || url.toLowerCase().includes("annual") || url.toLowerCase().includes("financial")) {
          acfrPdfUrl = url;
          break;
        }
      }
      // Fallback to first PDF URL from entity research
      if (!acfrPdfUrl) acfrPdfUrl = acfrUrlMatch[0];
    }

    // NOFO from Grants.gov API (no web search fallback needed)
    const nofoPdfUrl: string | null = officialNofo?.url || null;
    const nofoSource = officialNofo ? "grants.gov-api" : "none";
    console.log("[research] NOFO PDF URL:", nofoPdfUrl || "not found", `(source: ${nofoSource})`);
    console.log("[research] ACFR PDF URL:", acfrPdfUrl || "not found");

    // Collect web sources from Claude's research
    const entitySources = entityResearch.sources;
    const grantSources = grantResearch.sources;

    // ─── Step 3: Parallel PDF fetch + parse (NOFO & ACFR) ───
    const [nofoPdf, acfrPdf] = await Promise.all([
      nofoPdfUrl ? fetchAndParsePdf(nofoPdfUrl) : Promise.resolve(null),
      acfrPdfUrl ? fetchAndParsePdf(acfrPdfUrl, 50) : Promise.resolve(null),
    ]);

    console.log("[research] NOFO PDF parsed:", nofoPdf ? `${nofoPdf.numpages} pages` : "failed/skipped");
    console.log("[research] ACFR PDF parsed:", acfrPdf ? `${acfrPdf.numpages} pages` : "failed/skipped");

    // ─── Step 3b: Validate auto-fetched NOFO matches the target grant ───
    // Skip validation when NOFO came from the official Grants.gov API (it's the correct document)
    let nofoValidation: { isMatch: boolean; confidence: string; detectedProgram: string; detectedFiscalYear: string; reason: string } | null = null;
    let validatedNofoPdf = nofoPdf;

    if (nofoPdf && nofoSource === "grants.gov-api") {
      console.log("[research] NOFO from Grants.gov API — skipping validation (trusted source)");
      nofoValidation = {
        isMatch: true,
        confidence: "high",
        detectedProgram: grantTitle,
        detectedFiscalYear: "",
        reason: "Official NOFO from Grants.gov API attachment",
      };
    } else if (nofoPdf) {
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
      grantResearch.text,
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

    // ─── Step 5: Parallel AI extraction ───
    // Use Claude's web research results as context for structured extraction
    const aiTasks: Promise<any>[] = [];

    // Task 0: Entity profile from Claude web research
    aiTasks.push(
      generateObject({
        model: anthropic("claude-haiku-4-5-20251001"),
        schema: EntityProfileSchema,
        prompt: `Extract a structured entity profile for "${entityName}" from the research below.
Use 0 for unknown numbers. Use empty arrays for unknown lists. Flag unknown data in dataGaps.
If an ACFR PDF URL was found in the research, include it in acfrPdfUrl.

RESEARCH FINDINGS:
${entityResearch.text || `No research results. Infer what you can from the name "${entityName}".`}

SOURCES:
${entitySources.map(s => `- ${s.title}: ${s.url}`).join("\n") || "No sources"}

Output the entity profile.`,
      })
    );

    // Task 1: Grant requirements from Claude web research
    aiTasks.push(
      generateObject({
        model: anthropic("claude-haiku-4-5-20251001"),
        schema: GrantRequirementsSchema,
        prompt: `Extract structured grant application requirements for "${grantTitle}".

${grantsGovBlock}

RESEARCH FINDINGS:
${grantResearch.text || "No research results. Use your knowledge of this grant program."}

SOURCES:
${grantSources.map(s => `- ${s.title}: ${s.url}`).join("\n") || "No sources"}

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

    // Use ACFR URL from structured extraction if the regex approach didn't find one
    if (!acfrPdfUrl && ep.acfrPdfUrl) {
      acfrPdfUrl = ep.acfrPdfUrl;
    }

    console.log("[research] NOFO extraction:", nofoExtracted ? "success" : "skipped");
    console.log("[research] ACFR extraction:", acfrExtracted ? "success" : "skipped");

    // ─── Step 6: Reshape entity - ACFR data overrides web-estimated data ───
    // Uses mergeValue/mergeArray to distinguish "value is 0" from "value is missing"
    const { mergeValue: mv, mergeArray: ma } = await import("@/lib/grant-drafting/types");
    const acfr = acfrExtracted; // may be null

    const webLocation = {
      city: ep.city, state: ep.state, stateCode: ep.stateCode,
      county: ep.county, region: ep.region, congressionalDistrict: ep.congressionalDistrict,
    };
    const webFinancials = {
      annualRevenue: ep.annualRevenue, operatingBudget: ep.operatingBudget,
      capitalBudget: ep.capitalBudget, bondRating: ep.bondRating, totalAssets: ep.totalAssets,
    };
    const webOps = {
      annualTonnage: ep.annualTonnage, annualTEUs: ep.annualTEUs, vesselCalls: ep.vesselCalls,
      employeeCount: ep.employeeCount, directJobs: ep.directJobs, cargoTypes: ep.cargoTypes,
    };
    const webInfra = { keyFacilities: ep.keyFacilities, acreage: ep.acreage };
    const webEcon = {
      regionalEconomicImpact: ep.regionalEconomicImpact, totalJobs: ep.totalJobs, tradeValue: ep.tradeValue,
    };

    // Parse web-extracted string arrays into structured objects
    const webProjects = (ep.currentProjects || []).map((p: string) => {
      const parts = p.split("|").map((s: string) => s.trim());
      return {
        name: parts[0] || p,
        description: parts[1] || "",
        totalCost: parseInt((parts[2] || "0").replace(/[^0-9]/g, "")) || 0,
        status: parts[3] || "Unknown",
      };
    });
    const webAwards = (ep.pastGrantAwards || []).map((g: string) => {
      const parts = g.split("|").map((s: string) => s.trim());
      return {
        program: parts[0] || g,
        awardYear: parseInt(parts[1] || "0") || 0,
        awardAmount: parseInt((parts[2] || "0").replace(/[^0-9]/g, "")) || 0,
        projectName: parts[3] || "",
      };
    });

    // Merge: ACFR field-by-field over web data (ACFR wins when present, web fills gaps)
    const entityProfile = {
      name: mv(acfr?.name, ep.name),
      legalName: mv(acfr?.legalName, ep.legalName),
      entityType: mv(acfr?.entityType, ep.entityType),
      classification: mv(acfr?.classification, ep.classification),
      location: acfr?.location
        ? {
            city: mv(acfr.location.city, webLocation.city),
            state: mv(acfr.location.state, webLocation.state),
            stateCode: mv(acfr.location.stateCode, webLocation.stateCode),
            county: mv(acfr.location.county, webLocation.county),
            region: mv(acfr.location.region, webLocation.region),
            congressionalDistrict: mv(acfr.location.congressionalDistrict, webLocation.congressionalDistrict),
          }
        : webLocation,
      financials: acfr?.financials
        ? {
            annualRevenue: mv(acfr.financials.annualRevenue, webFinancials.annualRevenue),
            operatingBudget: mv(acfr.financials.operatingBudget, webFinancials.operatingBudget),
            capitalBudget: mv(acfr.financials.capitalBudget, webFinancials.capitalBudget),
            bondRating: mv(acfr.financials.bondRating, webFinancials.bondRating),
            totalAssets: mv(acfr.financials.totalAssets, webFinancials.totalAssets),
          }
        : webFinancials,
      operations: acfr?.operations
        ? {
            annualTonnage: mv(acfr.operations.annualTonnage, webOps.annualTonnage),
            annualTEUs: mv(acfr.operations.annualTEUs, webOps.annualTEUs),
            vesselCalls: mv(acfr.operations.vesselCalls, webOps.vesselCalls),
            employeeCount: mv(acfr.operations.employeeCount, webOps.employeeCount),
            directJobs: mv(acfr.operations.directJobs, webOps.directJobs),
            cargoTypes: ma(acfr.operations.cargoTypes, webOps.cargoTypes),
          }
        : webOps,
      infrastructure: acfr?.infrastructure
        ? {
            keyFacilities: ma(acfr.infrastructure.keyFacilities, webInfra.keyFacilities),
            acreage: mv(acfr.infrastructure.acreage, webInfra.acreage),
          }
        : webInfra,
      economicImpact: acfr?.economicImpact
        ? {
            regionalEconomicImpact: mv(acfr.economicImpact.regionalEconomicImpact, webEcon.regionalEconomicImpact),
            totalJobs: mv(acfr.economicImpact.totalJobs, webEcon.totalJobs),
            tradeValue: mv(acfr.economicImpact.tradeValue, webEcon.tradeValue),
          }
        : webEcon,
      currentProjects: ma(acfr?.currentProjects, webProjects),
      pastGrantAwards: ma(acfr?.pastGrantAwards, webAwards),
      certifications: ma(acfr?.certifications, ep.certifications),
      strategicPriorities: ma(acfr?.strategicPriorities, ep.strategicPriorities),
      environmentalGoals: ma(acfr?.environmentalGoals, ep.environmentalGoals),
    };

    // ─── Step 7: Build grant requirements - NOFO PDF overrides AI-estimated ───
    const nofoSections = nofoExtracted?.applicationSections;
    const hasNofoSections = nofoSections && nofoSections.length > 0;

    const grantRequirements = hasNofoSections ? {
      applicationSections: nofoSections.map((s: { title: string; description: string; maxWords: number; weight: number; evaluationCriteria?: string[] }) => ({
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
        entitySources: entitySources.map((r) => ({ title: r.title, url: r.url })),
        grantSources: grantSources.map((r) => ({ title: r.title, url: r.url })),
      },
      metadata: {
        researchedAt: new Date().toISOString(),
        grantsGovAvailable: !!grantDetails,
        claudeWebSearchUsed: true,
        webResultsFound: entitySources.length + grantSources.length,
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
