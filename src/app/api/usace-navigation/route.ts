import { NextResponse } from "next/server";
import { getPortTonnage, getPortCommerce } from "@/lib/usace-navigation";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { portName, year, dataType } = body;

    if (!portName || !year) {
      return NextResponse.json(
        { error: "portName and year are required" },
        { status: 400 }
      );
    }

    if (dataType === "commerce") {
      const commerce = await getPortCommerce(portName, year);
      return NextResponse.json({ commerce });
    } else {
      const tonnage = await getPortTonnage(portName, year);
      return NextResponse.json({ tonnage });
    }
  } catch (error) {
    console.error("USACE Navigation API error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch USACE navigation data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
