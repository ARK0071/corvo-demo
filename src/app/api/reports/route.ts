import { NextRequest, NextResponse } from "next/server";
import { resolveSecureTenant } from "@/lib/db/tenant-config.server";
import * as Reports from "@/lib/db/repositories/reports";
import type { ReportStatus } from "@/data/reporting";

// GET: List all reports or filter by award
export async function GET(request: NextRequest) {
  try {
    await resolveSecureTenant(request.headers);

    const searchParams = request.nextUrl.searchParams;
    const reportId = searchParams.get("reportId");
    const awardId = searchParams.get("awardId");
    const upcoming = searchParams.get("upcoming");
    const overdue = searchParams.get("overdue");
    const stats = searchParams.get("stats");

    // Get single report by ID
    if (reportId) {
      const report = await Reports.getReportById(reportId);
      return NextResponse.json({ reports: report ? [report] : [] });
    }

    // Return statistics
    if (stats === "true") {
      const reportStats = await Reports.getReportingStats();
      return NextResponse.json(reportStats);
    }

    // Get overdue reports
    if (overdue === "true") {
      const reports = await Reports.getOverdueReports();
      return NextResponse.json({ reports });
    }

    // Get upcoming reports (optionally with days parameter)
    if (upcoming === "true") {
      const days = parseInt(searchParams.get("days") || "90");
      const reports = await Reports.getUpcomingReports(days);
      return NextResponse.json({ reports });
    }

    // Get reports for specific award
    if (awardId) {
      const reports = await Reports.getReportsForAward(awardId);
      return NextResponse.json({ reports });
    }

    const reports = await Reports.getAllReports();
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
    await resolveSecureTenant(request.headers);
    const body = await request.json();

    // Batch upsert reports
    if (body.reports && Array.isArray(body.reports)) {
      const result = await Reports.upsertReports(body.reports);
      return NextResponse.json({
        success: true,
        created: result.created,
        updated: result.updated,
      });
    }

    // Create single report
    const { awardId, type, title, dueDate, periodStart, periodEnd, status, notes } = body;

    if (!awardId || !type || !title || !dueDate || !periodStart || !periodEnd) {
      return NextResponse.json(
        { error: "awardId, type, title, dueDate, periodStart, and periodEnd are required" },
        { status: 400 }
      );
    }

    const report = await Reports.createReport({
      awardId,
      type,
      title,
      dueDate,
      periodStart,
      periodEnd,
      status,
      notes,
    });

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
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
    await resolveSecureTenant(request.headers);
    const body = await request.json();

    const { reportId, action } = body;

    if (!reportId) {
      return NextResponse.json({ error: "reportId is required" }, { status: 400 });
    }

    // Update status
    if (action === "updateStatus" || body.status) {
      const status = body.status as ReportStatus;
      const notes = body.notes as string | undefined;

      const report = await Reports.updateReportStatus(reportId, status, notes);
      if (!report) {
        return NextResponse.json({ error: "Report not found" }, { status: 404 });
      }
      return NextResponse.json(report);
    }

    // Update content
    if (action === "updateContent" || body.generatedContent) {
      const report = await Reports.updateReportContent(
        reportId,
        body.generatedContent,
        body.narrativeDraft
      );
      if (!report) {
        return NextResponse.json({ error: "Report not found" }, { status: 404 });
      }
      return NextResponse.json(report);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Reports PUT error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update report" },
      { status: 500 }
    );
  }
}