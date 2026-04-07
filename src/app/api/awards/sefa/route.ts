/**
 * API Route: /api/awards/sefa
 *
 * Generates Schedule of Expenditures of Federal Awards (SEFA) from DB records.
 * Compliance: 2 CFR 200 Subpart F (Single Audit threshold = $750,000)
 */

import { NextRequest, NextResponse } from "next/server";
import { setTenantConfigFromHeaders } from "@/lib/db/tenant-config";
import * as DemoAwards from "@/lib/db/repositories/demo-awards";

export async function GET(request: NextRequest) {
  try {
    setTenantConfigFromHeaders(request.headers);

    const fyEnd = request.nextUrl.searchParams.get("fyEnd") || "2025-09-30";
    const fyEndDate = new Date(fyEnd);
    const fyStartDate = new Date(fyEndDate.getFullYear() - 1, fyEndDate.getMonth(), fyEndDate.getDate() + 1);
    const fyStartStr = fyStartDate.toISOString().split("T")[0];

    const [awards, allExpenses] = await Promise.all([
      DemoAwards.getAllAwards(),
      DemoAwards.getAllExpenses(),
    ]);

    const entries = [];
    for (const award of awards) {
      const awardExpenses = allExpenses.filter(
        (e) => e.awardId === award.id && e.status !== "flagged" && e.date >= fyStartStr && e.date <= fyEnd
      );
      const totalExpenditures = awardExpenses.reduce((s, e) => s + e.amount, 0);

      if (totalExpenditures > 0) {
        entries.push({
          cfdaNumber: award.cfda,
          programName: `${award.program} - ${award.title}`,
          awardingAgency: award.awardingAgency,
          fain: award.fain,
          passThrough: award.awardingAgency.includes("Texas") ? "Texas Department of Transportation" : null,
          totalExpenditures,
          awardId: award.id,
        });
      }
    }

    const totalExpenditures = entries.reduce((s, e) => s + e.totalExpenditures, 0);

    return NextResponse.json({
      entries,
      totalExpenditures,
      meetsAuditThreshold: totalExpenditures >= 750_000,
    });
  } catch (error) {
    console.error("SEFA GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate SEFA" },
      { status: 500 }
    );
  }
}
