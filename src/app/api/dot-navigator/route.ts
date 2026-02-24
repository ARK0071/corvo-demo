import { NextResponse } from "next/server";
import { getDOTProgramStatus, getDOTOpportunities } from "@/lib/dot-navigator";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "getProgramStatus") {
      const programs = await getDOTProgramStatus();
      return NextResponse.json({ programs, count: programs.length });
    } else if (action === "getOpportunities") {
      const opportunities = await getDOTOpportunities();
      return NextResponse.json({ opportunities, count: opportunities.length });
    } else {
      return NextResponse.json(
        { error: "Invalid action. Use 'getProgramStatus' or 'getOpportunities'" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("DOT Navigator API error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch DOT Navigator data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
