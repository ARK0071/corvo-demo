import { NextResponse } from "next/server";
import { searchSamOpportunities } from "@/lib/sam-gov";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { keyword, naicsCode, postedFrom, postedTo, limit, offset } = body;

    if (!process.env.SAM_GOV_API_KEY) {
      return NextResponse.json(
        { error: "SAM_GOV_API_KEY is not configured. Add it to .env.local." },
        { status: 500 }
      );
    }

    const opportunities = await searchSamOpportunities({
      keyword,
      naicsCode,
      postedFrom,
      postedTo,
      limit,
      offset,
    });

    return NextResponse.json({ opportunities, count: opportunities.length });
  } catch (error) {
    console.error("SAM.gov Opportunities API error:", error);
    const message = error instanceof Error ? error.message : "Failed to search SAM.gov opportunities";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
