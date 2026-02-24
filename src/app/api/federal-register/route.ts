import { NextResponse } from "next/server";
import { searchFederalRegister } from "@/lib/federal-register";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { query, agencies, document_type, per_page, page, order } = body;

    const grants = await searchFederalRegister({
      query,
      agencies,
      document_type,
      per_page,
      page,
      order,
    });

    return NextResponse.json({ grants, count: grants.length });
  } catch (error) {
    console.error("Federal Register API error:", error);
    const message = error instanceof Error ? error.message : "Failed to search Federal Register";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
