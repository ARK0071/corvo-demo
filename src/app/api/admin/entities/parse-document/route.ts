import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";
import { withRole } from "@/lib/auth/api-guard";

export const maxDuration = 120;

const ExtractedProfileSchema = z.object({
  name: z.string().describe("Official entity name"),
  entityType: z.string().describe("e.g., Special district government, Municipal corporation, Airport authority"),
  classification: z.string().describe("e.g., Public Port Authority, Airport Authority, Transit Agency"),

  location: z.object({
    city: z.string(),
    state: z.string(),
    stateCode: z.string().describe("Two-letter state abbreviation"),
    county: z.string(),
    region: z.string().describe("e.g., Gulf Coast, Pacific Northwest, Northeast"),
  }),

  characteristics: z.object({
    cargoTypes: z.array(z.string()).describe("Types of cargo/services. Empty array if not applicable."),
    annualTonnage: z.number().describe("Annual tonnage. 0 if not a port."),
    employeeCount: z.number().describe("Number of employees. 0 if not found."),
    operatingBudget: z.number().describe("Operating budget/expenses in dollars. 0 if not found."),
  }),

  priorities: z.array(z.string()).describe("Strategic priorities or goals"),
  capabilities: z.array(z.string()).describe("Current capabilities or key services"),
  needs: z.array(z.string()).describe("Infrastructure or operational needs"),
  certifications: z.array(z.string()).describe("Certifications or designations"),
  environmentalGoals: z.array(z.string()).describe("Environmental or sustainability goals"),
  communityImpact: z.array(z.string()).describe("Community impact initiatives or outcomes"),

  // Extra data that can be used for pre-filling projects, awards, etc.
  projects: z.array(z.object({
    name: z.string(),
    description: z.string(),
    budget: z.number(),
    status: z.string(),
    focusAreas: z.array(z.string()),
  })).describe("Capital projects or major initiatives found in the document"),

  grantAwards: z.array(z.object({
    program: z.string(),
    amount: z.number(),
    year: z.number(),
    projectName: z.string(),
    agency: z.string(),
  })).describe("Federal/state grant awards mentioned in the document"),

  financials: z.object({
    annualRevenue: z.number().describe("Total revenue. 0 if not found."),
    totalAssets: z.number().describe("Total assets. 0 if not found."),
    bondRating: z.string().describe("Bond/credit rating. 'Not found' if absent."),
  }).describe("Key financial metrics for the entity"),
});

export const POST = withRole(["admin"], async (request) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "ANTHROPIC_API_KEY is not configured." }, { status: 500 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }

    // 20MB limit
    if (file.size > 20 * 1024 * 1024) {
      return Response.json({ error: "File too large (max 20MB)" }, { status: 400 });
    }

    let text: string;

    if (file.name.toLowerCase().endsWith(".pdf")) {
      const pdf = (await import("pdf-parse")).default;
      const buffer = Buffer.from(await file.arrayBuffer());
      const pdfData = await pdf(buffer);
      text = pdfData.text;
    } else {
      // Plain text or other readable format
      text = await file.text();
    }

    if (!text || text.trim().length < 100) {
      return Response.json({
        error: "Could not extract sufficient text from the document.",
      }, { status: 422 });
    }

    // Truncate to ~80K characters to stay within limits
    if (text.length > 80_000) {
      text = text.slice(0, 80_000) + "\n\n[TRUNCATED]";
    }

    const { object: extracted } = await generateObject({
      model: anthropic("claude-haiku-4-5-20251001"),
      schema: ExtractedProfileSchema,
      prompt: `Extract a structured entity profile from this document. This could be an ACFR (Annual Comprehensive Financial Report), a financial report, a strategic plan, or other organizational document for a government entity (port authority, airport, transit agency, etc.).

Extract all available data into the schema. For fields not found, use reasonable defaults (0 for numbers, empty arrays for lists, descriptive placeholders for strings).

Focus on:
1. Entity name, type, classification, and location
2. Key operational characteristics (cargo types, tonnage, employees, budget)
3. Strategic priorities and goals
4. Current capabilities and infrastructure needs
5. Active capital projects with budgets
6. Any federal/state grant awards
7. Environmental goals and community impact programs
8. Certifications or designations
9. Financial metrics (revenue, assets, bond rating)

DOCUMENT TEXT:
${text}`,
    });

    return Response.json({
      extracted,
      metadata: {
        fileName: file.name,
        fileSize: file.size,
        extractedAt: new Date().toISOString(),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to parse document";
    console.error("Entity document parsing error:", error);
    return Response.json({ error: message }, { status: 500 });
  }
});
