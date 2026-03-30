import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      sectionId,
      sectionTitle,
      sectionPrompt,
      awardTitle,
      program,
      periodStart,
      periodEnd,
      milestones,
      financialSummary,
    } = body;

    const milestonesText = milestones
      ?.map((m: { description: string; status: string; notes: string }) =>
        `- ${m.description}: ${m.status} (${m.notes})`
      )
      .join("\n") ?? "No milestones tracked";

    const prompt = `You are writing a specific section of a federal Performance Progress Report (SF-PPR) for the ${program} program.

Award: ${awardTitle}
Reporting Period: ${periodStart} to ${periodEnd}

Section: ${sectionTitle}
Section Guidance: ${sectionPrompt}

Project Milestones:
${milestonesText}

Financial Context:
- Total Awarded: $${financialSummary?.totalAwarded?.toLocaleString() ?? "N/A"}
- Expended This Period: $${financialSummary?.totalExpendedThisPeriod?.toLocaleString() ?? "N/A"}
- Cumulative Expenditures: $${financialSummary?.totalExpendedCumulative?.toLocaleString() ?? "N/A"}

Instructions:
- Write 2-3 paragraphs for this specific section only.
- Address the section guidance directly.
- Reference milestone progress and financial data where relevant.
- Use formal, specific language appropriate for a federal program officer.
- Do not use generic filler or boilerplate.
- Do not include section headers — just the narrative content.`;

    const result = await generateText({
      model: anthropic("claude-sonnet-4-20250514"),
      prompt,
      maxOutputTokens: 800,
    });

    return NextResponse.json({ narrative: result.text, sectionId });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: message, narrative: "Unable to generate section narrative. Please ensure ANTHROPIC_API_KEY is configured." },
      { status: 500 }
    );
  }
}
