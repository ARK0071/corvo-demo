import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const categoriesJson = formData.get("categories") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const pdfParse = (await import("pdf-parse")).default;
    const pdf = await pdfParse(buffer);
    const text = pdf.text;

    if (!text || text.trim().length < 20) {
      return NextResponse.json(
        { error: "Could not extract sufficient text from the PDF. Ensure it is a digital (not scanned) document." },
        { status: 400 }
      );
    }

    const categories = categoriesJson ? JSON.parse(categoriesJson) : [];
    const categoryList = categories.map((c: { name: string }) => c.name).join(", ");

    const result = await generateObject({
      model: anthropic("claude-sonnet-4-6"),
      schema: z.object({
        vendor: z.string().describe("The vendor/supplier name from the invoice"),
        amount: z.number().describe("The total amount due or paid"),
        date: z.string().describe("The invoice/receipt date in YYYY-MM-DD format"),
        description: z.string().describe("A brief description of what was purchased or the service rendered"),
        categoryHint: z.string().optional().describe("Best matching budget category from the provided list"),
      }),
      prompt: `Extract invoice/receipt details from the following document text.

Available budget categories: ${categoryList || "Not provided"}

Document text:
${text.slice(0, 8000)}

Extract the vendor name, total amount, date, a brief description, and suggest the best matching budget category from the list above (if provided).`,
      maxOutputTokens: 500,
    });

    return NextResponse.json({ extracted: result.object });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Extraction failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
