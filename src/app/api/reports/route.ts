import { NextRequest, NextResponse } from "next/server";
import { setTenantConfigFromHeaders, getTenantConfig } from "@/lib/db/tenant-config";
import * as DemoReports from "@/lib/db/repositories/demo-reports";
import * as Reports from "@/lib/db/repositories/reports";
import type { ReportStatus } from "@/data/reporting";
import {
  assertReportTransition,
  transitionErrorResponse,
  type ReportStatus as TransitionReportStatus,
} from "@/lib/state-transitions";
import {
  readJsonBody,
  boundedString,
  ApiLimitError,
} from "@/lib/api-limits";

// Filing metadata field caps. Federal agency confirmation numbers are
// rarely longer than 50 chars; we cap at 200 to be generous without
// letting an attacker store megabytes of unbounded text in the DB.
const REPORT_FIELD_LIMITS = {
  type: 100,
  title: 300,
  notes: 5000,
  confirmationNumber: 200,
  agencySystem: 200,
  filedDate: 32,
  dueDate: 32,
  periodStart: 32,
  periodEnd: 32,
} as const;

// Reports POST allows a batch upsert that can be reasonably large
// (the periodic sync from the federal calendar). Cap at 1MB which is
// far above any realistic legitimate batch but blocks pathological
// floods.
const REPORTS_MAX_JSON_BYTES = 1024 * 1024;

// Helper to get the appropriate repository based on environment
function getReportsRepo() {
  const { environment } = getTenantConfig();
  return environment === "demo" ? DemoReports : Reports;
}

// GET: List all reports or filter by award
export async function GET(request: NextRequest) {
  try {
    setTenantConfigFromHeaders(request.headers);
    const repo = getReportsRepo();

    const searchParams = request.nextUrl.searchParams;
    const awardId = searchParams.get("awardId");
    const upcoming = searchParams.get("upcoming");
    const overdue = searchParams.get("overdue");
    const stats = searchParams.get("stats");

    // Return statistics
    if (stats === "true") {
      const reportStats = await repo.getReportingStats();
      return NextResponse.json(reportStats);
    }

    // Get overdue reports
    if (overdue === "true") {
      const reports = await repo.getOverdueReports();
      return NextResponse.json({ reports });
    }

    // Get upcoming reports (optionally with days parameter)
    if (upcoming === "true") {
      const days = parseInt(searchParams.get("days") || "90");
      const reports = await repo.getUpcomingReports(days);
      return NextResponse.json({ reports });
    }

    // Get reports for specific award
    if (awardId) {
      const reports = await repo.getReportsForAward(awardId);
      return NextResponse.json({ reports });
    }

    // Get all reports
    const reports = await repo.getAllReports();
    return NextResponse.json({ reports });
  } catch (error) {
    console.error("Reports GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch reports" },
      { status: 500 }
    );
  }
}

// POST: Create a new report or batch upsert
export async function POST(request: NextRequest) {
  try {
    setTenantConfigFromHeaders(request.headers);
    const repo = getReportsRepo();
    const body = await readJsonBody<Record<string, unknown>>(request, { maxBytes: REPORTS_MAX_JSON_BYTES });

    // Batch upsert reports
    if (body.reports && Array.isArray(body.reports)) {
      const result = await repo.upsertReports(body.reports);
      return NextResponse.json({
        success: true,
        created: result.created,
        updated: result.updated,
      });
    }

    // Create single report — enforce per-field caps so a malicious
    // client can't shove megabytes into the unbounded title/notes
    // columns.
    let awardId: string, type: string, title: string, dueDate: string, periodStart: string, periodEnd: string;
    try {
      awardId = boundedString(body.awardId, "awardId", 64)!;
      type = boundedString(body.type, "type", REPORT_FIELD_LIMITS.type)!;
      title = boundedString(body.title, "title", REPORT_FIELD_LIMITS.title)!;
      dueDate = boundedString(body.dueDate, "dueDate", REPORT_FIELD_LIMITS.dueDate)!;
      periodStart = boundedString(body.periodStart, "periodStart", REPORT_FIELD_LIMITS.periodStart)!;
      periodEnd = boundedString(body.periodEnd, "periodEnd", REPORT_FIELD_LIMITS.periodEnd)!;
    } catch (e) {
      if (e instanceof ApiLimitError) {
        return NextResponse.json({ error: e.message }, { status: e.status });
      }
      throw e;
    }
    const status = boundedString(body.status, "status", 32, { required: false });
    const notes = boundedString(body.notes, "notes", REPORT_FIELD_LIMITS.notes, { required: false });

    // The repo's createReport types its inputs as ReportType / ReportStatus
    // narrow unions; we've validated length but the exact enum value is the
    // caller's responsibility (DB will reject invalid values downstream).
    const report = await repo.createReport({
      awardId,
      type: type as Parameters<typeof repo.createReport>[0]["type"],
      title,
      dueDate,
      periodStart,
      periodEnd,
      status: status as Parameters<typeof repo.createReport>[0]["status"],
      notes,
    });

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    if (error instanceof ApiLimitError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Reports POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create report" },
      { status: 500 }
    );
  }
}

// PUT: Update a report (status, notes, content)
export async function PUT(request: NextRequest) {
  try {
    setTenantConfigFromHeaders(request.headers);
    const repo = getReportsRepo();
    // Reports can carry generated narrative content, so the PUT body cap
    // is wider than the POST defaults (but still bounded).
    const body = await readJsonBody<Record<string, unknown>>(request, { maxBytes: REPORTS_MAX_JSON_BYTES });

    const reportId = typeof body.reportId === "string" ? body.reportId.slice(0, 64) : null;
    const action = typeof body.action === "string" ? body.action.slice(0, 32) : undefined;

    if (!reportId) {
      return NextResponse.json({ error: "reportId is required" }, { status: 400 });
    }

    // Mark a report as Filed With Agency — captures structured filing
    // metadata (date + confirmation number + agency system) and transitions
    // the report to submitted in one atomic operation.
    if (action === "markFiled") {
      // M-5: cap every filing metadata field. Confirmation numbers from
      // federal agency portals are short identifiers, but the previous
      // route accepted unlimited input which let an attacker pad the
      // database with megabytes of trash per report.
      let filedDate: string, confirmationNumber: string;
      let agencySystem: string | undefined;
      let notes: string | undefined;
      try {
        filedDate = boundedString(body.filedDate, "filedDate", REPORT_FIELD_LIMITS.filedDate)!;
        confirmationNumber = boundedString(
          body.confirmationNumber,
          "confirmationNumber",
          REPORT_FIELD_LIMITS.confirmationNumber
        )!;
        agencySystem = boundedString(
          body.agencySystem,
          "agencySystem",
          REPORT_FIELD_LIMITS.agencySystem,
          { required: false }
        );
        notes = boundedString(body.notes, "notes", REPORT_FIELD_LIMITS.notes, { required: false });
      } catch (e) {
        if (e instanceof ApiLimitError) {
          return NextResponse.json({ error: e.message }, { status: e.status });
        }
        throw e;
      }

      const existing = await repo.getReportById(reportId);
      if (!existing) {
        return NextResponse.json({ error: "Report not found" }, { status: 404 });
      }

      try {
        assertReportTransition(existing.status as TransitionReportStatus, "submitted");
      } catch (e) {
        const resp = transitionErrorResponse(e);
        if (resp) return NextResponse.json(resp.body, { status: resp.status });
        throw e;
      }

      const report = await repo.markReportFiled({
        reportId,
        filedDate,
        confirmationNumber,
        agencySystem,
        notes,
      });
      if (!report) {
        return NextResponse.json({ error: "Report not found" }, { status: 404 });
      }
      return NextResponse.json(report);
    }

    // Update status — server-side validates the workflow graph
    if (action === "updateStatus" || body.status) {
      const status = body.status as ReportStatus;
      const notes = body.notes as string | undefined;

      // Look up the existing report to know what we're transitioning FROM.
      const existing = await repo.getReportById(reportId);
      if (!existing) {
        return NextResponse.json({ error: "Report not found" }, { status: 404 });
      }

      try {
        assertReportTransition(
          existing.status as TransitionReportStatus,
          status as TransitionReportStatus
        );
      } catch (e) {
        const resp = transitionErrorResponse(e);
        if (resp) return NextResponse.json(resp.body, { status: resp.status });
        throw e;
      }

      const report = await repo.updateReportStatus(reportId, status, notes);
      if (!report) {
        return NextResponse.json({ error: "Report not found" }, { status: 404 });
      }
      return NextResponse.json(report);
    }

    // Update content
    if (action === "updateContent" || body.generatedContent) {
      const report = await repo.updateReportContent(
        reportId,
        body.generatedContent as Parameters<typeof repo.updateReportContent>[1],
        body.narrativeDraft as Parameters<typeof repo.updateReportContent>[2]
      );
      if (!report) {
        return NextResponse.json({ error: "Report not found" }, { status: 404 });
      }
      return NextResponse.json(report);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    if (error instanceof ApiLimitError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Reports PUT error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update report" },
      { status: 500 }
    );
  }
}