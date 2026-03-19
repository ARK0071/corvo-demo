import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";
import pdf from "pdf-parse";

export const maxDuration = 120;

// ─── Schema for extracted entity profile ───

const EntityProfileSchema = z.object({
  name: z.string().describe("Official entity name"),
  legalName: z.string().describe("Full legal name as it appears in the ACFR"),
  entityType: z.string().describe("e.g., Special district government, Municipal corporation"),
  classification: z.string().describe("e.g., Public Port Authority, Airport Authority"),

  location: z.object({
    city: z.string(),
    state: z.string(),
    stateCode: z.string().describe("Two-letter state abbreviation"),
    county: z.string(),
    region: z.string().describe("e.g., Gulf Coast, Pacific Northwest, Northeast"),
    congressionalDistrict: z.string().describe("e.g., TX-14. Use 'UNKNOWN' if not found."),
  }),

  financials: z.object({
    annualRevenue: z.number().describe("Total operating revenue in dollars"),
    operatingBudget: z.number().describe("Total operating expenses/budget in dollars"),
    capitalBudget: z.number().describe("Capital expenditures or capital budget in dollars. Use 0 if not found."),
    bondRating: z.string().describe("Bond/credit rating (e.g., A+, AA-). Use 'Not found' if not in document."),
    totalAssets: z.number().describe("Total assets from Statement of Net Position"),
    totalLiabilities: z.number().describe("Total liabilities from Statement of Net Position"),
    netPosition: z.number().describe("Total net position"),
    cashAndInvestments: z.number().describe("Cash, cash equivalents, and investments total"),
  }),

  operations: z.object({
    annualTonnage: z.number().describe("Annual cargo tonnage. Use 0 if not a port/maritime entity."),
    annualTEUs: z.number().describe("Annual container TEUs. Use 0 if not applicable."),
    vesselCalls: z.number().describe("Annual vessel calls. Use 0 if not applicable."),
    employeeCount: z.number().describe("Number of employees"),
    directJobs: z.number().describe("Direct jobs supported. Use employeeCount if not separately stated."),
    cargoTypes: z.array(z.string()).describe("Types of cargo handled. Empty array if not a port."),
  }),

  infrastructure: z.object({
    keyFacilities: z.array(z.string()).describe("Major facilities, terminals, or infrastructure assets"),
    acreage: z.number().describe("Total acreage/land area. Use 0 if not found."),
  }),

  economicImpact: z.object({
    regionalEconomicImpact: z.number().describe("Regional economic impact in dollars. Use 0 if not stated."),
    totalJobs: z.number().describe("Total jobs (direct + indirect). Use 0 if not stated."),
    tradeValue: z.number().describe("Total trade value. Use 0 if not stated."),
  }),

  currentProjects: z.array(z.object({
    name: z.string(),
    description: z.string(),
    totalCost: z.number(),
    status: z.string(),
  })).describe("Active capital projects mentioned in the ACFR"),

  pastGrantAwards: z.array(z.object({
    program: z.string(),
    awardYear: z.number(),
    awardAmount: z.number(),
    projectName: z.string(),
  })).describe("Federal/state grants mentioned in the ACFR. Empty array if none found."),

  certifications: z.array(z.string()).describe("Environmental, safety, or industry certifications mentioned"),
  strategicPriorities: z.array(z.string()).describe("Strategic goals or priorities mentioned in MD&A"),
  environmentalGoals: z.array(z.string()).describe("Environmental or sustainability goals mentioned"),

  disadvantagedCommunity: z.object({
    mentioned: z.boolean().describe("Whether disadvantaged community status is mentioned"),
    details: z.string().describe("Any details about environmental justice, Justice40, or disadvantaged status. Empty string if not mentioned."),
  }),

  fiscalYear: z.string().describe("The fiscal year this ACFR covers, e.g., '2024' or 'FY2023-2024'"),
});

// ─── Helpers ───

function extractRelevantPages(fullText: string, totalPages: number): string {
  // Split text roughly by page (pdf-parse concatenates all pages)
  // We want: first ~10% (transmittal/MD&A), financial statements (~pages 20-50),
  // and last ~15% (statistical section)
  const lines = fullText.split("\n");
  const linesPerPage = Math.ceil(lines.length / Math.max(totalPages, 1));

  const sections: string[] = [];

  // First ~20 pages (transmittal letter, MD&A — the narrative gold)
  const mdaEnd = Math.min(20 * linesPerPage, lines.length);
  sections.push(lines.slice(0, mdaEnd).join("\n"));

  // Financial statements (~pages 20-50)
  const fsStart = Math.floor(Math.max(15, totalPages * 0.1) * linesPerPage);
  const fsEnd = Math.min(Math.floor(Math.max(50, totalPages * 0.35) * linesPerPage), lines.length);
  if (fsStart < lines.length) {
    sections.push(lines.slice(fsStart, fsEnd).join("\n"));
  }

  // Statistical section (last 15% of document — has tonnage, TEUs, jobs, etc.)
  const statStart = Math.floor(Math.max(0, totalPages - Math.ceil(totalPages * 0.15)) * linesPerPage);
  if (statStart < lines.length) {
    sections.push(lines.slice(statStart).join("\n"));
  }

  // Capital projects / notes section (middle of document — look for keywords)
  const capitalKeywords = ["capital project", "construction in progress", "capital asset", "grant"];
  const noteStart = Math.floor(totalPages * 0.35 * linesPerPage);
  const noteEnd = Math.floor(totalPages * 0.7 * linesPerPage);
  const noteSection = lines.slice(noteStart, noteEnd);
  const relevantNoteLines: string[] = [];

  for (let i = 0; i < noteSection.length; i++) {
    const line = noteSection[i].toLowerCase();
    if (capitalKeywords.some((kw) => line.includes(kw))) {
      // Grab context around the match (±15 lines)
      const start = Math.max(0, i - 15);
      const end = Math.min(noteSection.length, i + 15);
      relevantNoteLines.push(...noteSection.slice(start, end));
      i = end; // Skip ahead
    }
  }
  if (relevantNoteLines.length > 0) {
    sections.push(relevantNoteLines.join("\n"));
  }

  const combined = sections.join("\n\n--- SECTION BREAK ---\n\n");

  // Truncate to ~80K characters (~20K tokens) to stay well within Haiku limits
  if (combined.length > 80_000) {
    return combined.slice(0, 80_000) + "\n\n[TRUNCATED — document too long]";
  }

  return combined;
}

// ─── API Route ───

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "ANTHROPIC_API_KEY is not configured." }, { status: 500 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return Response.json({ error: "File must be a PDF" }, { status: 400 });
    }

    // 50MB limit
    if (file.size > 50 * 1024 * 1024) {
      return Response.json({ error: "File too large (max 50MB)" }, { status: 400 });
    }

    // Step 1: Extract text from PDF (free — no AI cost)
    const buffer = Buffer.from(await file.arrayBuffer());
    const pdfData = await pdf(buffer);

    if (!pdfData.text || pdfData.text.trim().length < 500) {
      return Response.json({
        error: "Could not extract sufficient text from PDF. The file may be image-based (scanned). Try an OCR'd version.",
      }, { status: 422 });
    }

    // Step 2: Extract only relevant sections to minimize token usage
    const relevantText = extractRelevantPages(pdfData.text, pdfData.numpages);

    // Step 3: Use Haiku (cheapest model) for structured extraction
    const { object: profile } = await generateObject({
      model: anthropic("claude-haiku-4-5-20251001"),
      schema: EntityProfileSchema,
      prompt: `Extract a structured entity profile from this Annual Comprehensive Financial Report (ACFR).

This is a government entity's ACFR document. Extract all available data into the schema. For fields not found in the document, use reasonable defaults (0 for numbers, empty arrays, "Not found" for strings).

Focus on:
1. Entity name, type, and location from the cover/transmittal letter
2. Financial data from the Statement of Net Position and Statement of Revenues/Expenses
3. Operating statistics from the Statistical Section (tonnage, TEUs, employees, etc.)
4. Capital projects from Notes to Financial Statements or MD&A
5. Grant awards from Notes or Revenue schedules
6. Strategic priorities from the MD&A section
7. Environmental or sustainability goals if mentioned

ACFR TEXT (extracted from relevant sections):
${relevantText}`,
    });

    return Response.json({
      profile,
      metadata: {
        fileName: file.name,
        fileSize: file.size,
        totalPages: pdfData.numpages,
        extractedChars: relevantText.length,
        extractedAt: new Date().toISOString(),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to process ACFR";
    console.error("ACFR extraction error:", error);
    return Response.json({ error: message }, { status: 500 });
  }
}
