import { NextResponse } from "next/server";
import { searchGovConOpportunities } from "@/lib/govcon";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { keywords, state, notice_type, limit, offset } = body;

    if (!process.env.GOVCON_API_KEY) {
      return NextResponse.json(
        { error: "GOVCON_API_KEY is not configured. Add it to .env.local." },
        { status: 500 }
      );
    }

    const opportunities = await searchGovConOpportunities({
      keywords,
      state,
      notice_type,
      limit,
      offset,
    });

    return NextResponse.json({ opportunities, count: opportunities.length });
  } catch (error) {
    console.error("GovCon Opportunities API error:", error);
    const message = error instanceof Error ? error.message : "Failed to search GovCon opportunities";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
