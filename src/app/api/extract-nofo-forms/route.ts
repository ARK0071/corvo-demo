import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";
import pdf from "pdf-parse";
import { matchFormsInText, getCommonForms, type FederalForm } from "@/data/federal-forms";

export const maxDuration = 60;

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
  submissionDeadline: z.string().describe("Application deadline. Use 'Not found' if not stated."),
  submissionMethod: z.string().describe("How to submit (e.g., Grants.gov, email, portal URL)"),
  costShareRequired: z.boolean(),
  costSharePercentage: z.number().describe("Minimum cost share percentage. Use 0 if none required."),
  maxAward: z.number().describe("Maximum award amount in dollars. Use 0 if not stated."),
  eligibleApplicants: z.array(z.string()).describe("Types of eligible applicants"),
  contactInfo: z.string().describe("Program contact info if provided"),
});

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "ANTHROPIC_API_KEY is not configured." }, { status: 500 });
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    let nofoText = "";
    let fileName = "unknown";

    if (contentType.includes("multipart/form-data")) {
      // PDF upload
      const formData = await req.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return Response.json({ error: "No file provided" }, { status: 400 });
      }

      fileName = file.name;

      if (file.name.toLowerCase().endsWith(".pdf")) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const pdfData = await pdf(buffer);
        nofoText = pdfData.text;
      } else {
        // Plain text file
        nofoText = await file.text();
      }
    } else {
      // JSON body with text content
      const body = await req.json();
      nofoText = body.text || "";
      fileName = body.fileName || "pasted-text";
    }

    if (!nofoText || nofoText.trim().length < 200) {
      return Response.json({ error: "Insufficient text content" }, { status: 400 });
    }

    // Step 1: Try static form matching first (free - no AI cost)
    const staticMatches = matchFormsInText(nofoText);

    // Step 2: Truncate NOFO text to relevant sections for AI extraction
    // Focus on: application instructions, forms required, evaluation criteria, eligibility
    const truncated = nofoText.length > 60_000
      ? nofoText.slice(0, 60_000) + "\n\n[TRUNCATED]"
      : nofoText;

    // Step 3: Use Haiku for structured extraction (~$0.01)
    const { object: extracted } = await generateObject({
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
${truncated}`,
    });

    // Step 4: Merge AI-extracted forms with static registry matches
    const allFormNumbers = new Set<string>();
    const enrichedForms: (FederalForm & { notes: string; required: boolean })[] = [];

    // Add AI-extracted forms, enriched with registry data
    for (const form of extracted.requiredForms) {
      const registryMatch = staticMatches.find(
        (f) => f.number.toUpperCase() === form.formNumber.toUpperCase()
      );
      if (registryMatch) {
        enrichedForms.push({ ...registryMatch, notes: form.notes, required: form.required !== false });
        allFormNumbers.add(registryMatch.number.toUpperCase());
      } else {
        // Form found by AI but not in our registry - include with generic URL
        enrichedForms.push({
          id: form.formNumber.toLowerCase().replace(/[^a-z0-9]/g, "-"),
          number: form.formNumber,
          name: form.formName,
          description: form.notes,
          url: "https://www.grants.gov/forms/forms-repository",
          family: "Other",
          commonlyRequired: false,
          requiredLevel: form.required ? "required" : "if-applicable",
          notes: form.notes,
          required: form.required !== false,
        });
        allFormNumbers.add(form.formNumber.toUpperCase());
      }
    }

    // Add static matches the AI might have missed
    for (const form of staticMatches) {
      if (!allFormNumbers.has(form.number.toUpperCase())) {
        enrichedForms.push({ ...form, notes: "Detected in NOFO text", required: form.requiredLevel !== "if-applicable" });
      }
    }

    return Response.json({
      forms: enrichedForms,
      sections: extracted.applicationSections,
      requirements: {
        submissionDeadline: extracted.submissionDeadline,
        submissionMethod: extracted.submissionMethod,
        costShareRequired: extracted.costShareRequired,
        costSharePercentage: extracted.costSharePercentage,
        maxAward: extracted.maxAward,
        eligibleApplicants: extracted.eligibleApplicants,
        contactInfo: extracted.contactInfo,
      },
      metadata: {
        fileName,
        extractedAt: new Date().toISOString(),
        staticFormMatches: staticMatches.length,
        aiFormMatches: extracted.requiredForms.length,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to process NOFO";
    console.error("NOFO extraction error:", error);
    return Response.json({ error: message }, { status: 500 });
  }
}
