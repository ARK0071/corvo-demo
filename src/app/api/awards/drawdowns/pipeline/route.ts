/**
 * API Route: /api/awards/drawdowns/pipeline
 *
 * Cross-award drawdown pipeline data: all drawdowns with award context,
 * aging buckets, and cash flow snapshot.
 *
 * Compliance: 2 CFR 200.305 (Payment)
 */

import { NextRequest, NextResponse } from "next/server";
import { resolveSecureTenant } from "@/lib/db/tenant-config.server";
import * as Awards from "@/lib/db/repositories/awards";

export async function GET(request: NextRequest) {
  try {
    await resolveSecureTenant(request.headers);

    const [allDrawdowns, allAwards, allExpenses] = await Promise.all([
      Awards.getAllDrawdowns(),
      Awards.getAllAwards(),
      Awards.getAllExpenses(),
    ]);

    // Build award lookup
    const awardMap = new Map(allAwards.map((a) => [a.id, a]));

    // Enrich drawdowns with award context
    const enrichedDrawdowns = allDrawdowns.map((d) => {
      const award = awardMap.get(d.awardId);
      const daysOutstanding = d.submittedDate
        ? Math.ceil((Date.now() - new Date(d.submittedDate).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      return {
        ...d,
        awardTitle: award?.title || "Unknown",
        program: award?.program || "Unknown",
        fain: award?.fain || "",
        daysOutstanding,
      };
    });

    // Aging buckets (for submitted/approved, not yet paid)
    const outstanding = enrichedDrawdowns.filter((d) => d.status === "submitted" || d.status === "approved");
    const aging = {
      current: outstanding.filter((d) => d.daysOutstanding <= 30),
      thirtyToSixty: outstanding.filter((d) => d.daysOutstanding > 30 && d.daysOutstanding <= 60),
      sixtyToNinety: outstanding.filter((d) => d.daysOutstanding > 60 && d.daysOutstanding <= 90),
      overNinety: outstanding.filter((d) => d.daysOutstanding > 90),
    };

    const agingSummary = {
      "0-30": { count: aging.current.length, amount: aging.current.reduce((s, d) => s + d.totalAmount, 0) },
      "31-60": { count: aging.thirtyToSixty.length, amount: aging.thirtyToSixty.reduce((s, d) => s + d.totalAmount, 0) },
      "61-90": { count: aging.sixtyToNinety.length, amount: aging.sixtyToNinety.reduce((s, d) => s + d.totalAmount, 0) },
      "90+": { count: aging.overNinety.length, amount: aging.overNinety.reduce((s, d) => s + d.totalAmount, 0) },
    };

    // Cash flow snapshot
    const pendingReimbursements = enrichedDrawdowns
      .filter((d) => d.status === "submitted" || d.status === "approved")
      .reduce((s, d) => s + d.totalAmount, 0);

    const nonFlaggedExpenses = allExpenses.filter((e) => e.status !== "flagged");
    const totalExpensesNotDrawn = nonFlaggedExpenses
      .filter((e) => e.status === "logged" || e.status === "approved")
      .reduce((s, e) => s + e.amount, 0);

    const totalPaymentsReceived = enrichedDrawdowns
      .filter((d) => d.status === "payment_received")
      .reduce((s, d) => s + d.totalAmount, 0);

    const totalExpended = nonFlaggedExpenses.reduce((s, e) => s + e.amount, 0);

    const cashFlow = {
      pendingReimbursements,
      upcomingSpend: totalExpensesNotDrawn,
      totalPaymentsReceived,
      totalExpended,
      netPosition: totalPaymentsReceived - totalExpended,
    };

    // Pipeline summary
    const pipeline = {
      draft: enrichedDrawdowns.filter((d) => d.status === "draft"),
      submitted: enrichedDrawdowns.filter((d) => d.status === "submitted"),
      approved: enrichedDrawdowns.filter((d) => d.status === "approved"),
      paymentReceived: enrichedDrawdowns.filter((d) => d.status === "payment_received"),
    };

    const pipelineSummary = {
      draft: { count: pipeline.draft.length, amount: pipeline.draft.reduce((s, d) => s + d.totalAmount, 0) },
      submitted: { count: pipeline.submitted.length, amount: pipeline.submitted.reduce((s, d) => s + d.totalAmount, 0) },
      approved: { count: pipeline.approved.length, amount: pipeline.approved.reduce((s, d) => s + d.totalAmount, 0) },
      paymentReceived: { count: pipeline.paymentReceived.length, amount: pipeline.paymentReceived.reduce((s, d) => s + d.totalAmount, 0) },
    };

    return NextResponse.json({
      drawdowns: enrichedDrawdowns,
      agingSummary,
      cashFlow,
      pipelineSummary,
    });
  } catch (error) {
    console.error("Drawdowns pipeline GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch pipeline data" },
      { status: 500 }
    );
  }
}
