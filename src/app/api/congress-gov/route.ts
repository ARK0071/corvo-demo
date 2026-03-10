import { NextResponse } from "next/server";
import { searchAppropriations, getProgramAuthorization } from "@/lib/congress-gov";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, keywords, programName, ...params } = body;

    if (!process.env.CONGRESS_GOV_API_KEY) {
      return NextResponse.json(
        { error: "CONGRESS_GOV_API_KEY is not configured. Add it to .env.local." },
        { status: 500 }
      );
    }

    if (action === "searchAppropriations") {
      if (!keywords) {
        return NextResponse.json(
          { error: "keywords are required for searchAppropriations" },
          { status: 400 }
        );
      }
      const bills = await searchAppropriations(keywords, params);
      return NextResponse.json({ bills, count: bills.length });
    } else if (action === "getProgramAuthorization") {
      if (!programName) {
        return NextResponse.json(
          { error: "programName is required for getProgramAuthorization" },
          { status: 400 }
        );
      }
      const bills = await getProgramAuthorization(programName);
      return NextResponse.json({ bills, count: bills.length });
    } else {
      return NextResponse.json(
        { error: "Invalid action. Use 'searchAppropriations' or 'getProgramAuthorization'" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Congress.gov API error:", error);
    const message = error instanceof Error ? error.message : "Failed to search Congress.gov";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
