import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      awardTitle,
      program,
      periodStart,
      periodEnd,
      description,
      financialSummary,
      matchSummary,
      completionPercentage,
    } = body;

    const prompt = `Write a federal grant progress report narrative for the ${program} program.

Award: ${awardTitle}
Description: ${description}
Reporting Period: ${periodStart} to ${periodEnd}
Overall Completion: ${completionPercentage}%

Financial Summary:
- Total Awarded: $${financialSummary?.totalAwarded?.toLocaleString() ?? "N/A"}
- Expended This Period: $${financialSummary?.totalExpendedThisPeriod?.toLocaleString() ?? "N/A"}
- Cumulative Expenditures: $${financialSummary?.totalExpendedCumulative?.toLocaleString() ?? "N/A"}
- Remaining Balance: $${financialSummary?.remainingBalance?.toLocaleString() ?? "N/A"}

Budget Categories:
${financialSummary?.byCategory?.map((c: { name: string; budgeted: number; spent: number }) =>
  `- ${c.name}: $${c.spent.toLocaleString()} spent of $${c.budgeted.toLocaleString()} budgeted`
).join("\n") ?? "N/A"}

Match Status: ${matchSummary?.status ?? "N/A"} (${Math.round(matchSummary?.percentage ?? 0)}% of required match committed)

Instructions:
- Write 3-4 paragraphs appropriate for a federal program officer audience.
- Reference specific milestones completed and financial progress during this reporting period.
- Note any challenges encountered and mitigation strategies.
- Describe planned activities for the next reporting period.
- Use formal but clear language. Be specific, not generic.
- Do not use filler or boilerplate statements.
- Do not include headers or section labels - just narrative paragraphs.`;

    const result = await generateText({
      model: anthropic("claude-sonnet-4-20250514"),
      prompt,
      maxOutputTokens: 1000,
    });

    return NextResponse.json({ narrative: result.text });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: message, narrative: "Unable to generate narrative. Please ensure ANTHROPIC_API_KEY is configured." },
      { status: 500 }
    );
  }
}
