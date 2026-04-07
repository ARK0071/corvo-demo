/**
 * API Route: /api/compliance
 *
 * Compliance checklists (Buy America, Davis-Bacon, NEPA, Title VI/DBE)
 * and audit readiness (findings, corrective action plans, scorecard).
 *
 * Compliance: Various — see template definitions
 */

import { NextRequest, NextResponse } from "next/server";
import { setTenantConfigFromHeaders, getTenantConfig } from "@/lib/db/tenant-config";
import { prisma } from "@/lib/db/client";
import { Prisma } from "@/generated/prisma";

function getPortId() { return getTenantConfig().portId; }

// ─── Checklist Templates ───

const CHECKLIST_TEMPLATES: Record<string, { title: string; items: { section: string; requirement: string; cfrReference: string }[] }> = {
  buy_america: {
    title: "Buy America / BABA Compliance",
    items: [
      { section: "Domestic Content", requirement: "Verify all iron and steel products are produced in the United States", cfrReference: "41 USC 8301" },
      { section: "Domestic Content", requirement: "Obtain manufacturer certifications for domestic content", cfrReference: "41 USC 8302" },
      { section: "Domestic Content", requirement: "Document country of origin for all manufactured products", cfrReference: "2 CFR 184" },
      { section: "Vendor Certification", requirement: "Collect signed Buy America certification from each vendor", cfrReference: "41 USC 8303" },
      { section: "Vendor Certification", requirement: "Verify vendor certifications against known sources", cfrReference: "41 USC 8303" },
      { section: "Waiver Process", requirement: "Document non-availability if domestic product unavailable", cfrReference: "41 USC 8302(b)" },
      { section: "Waiver Process", requirement: "Submit waiver request with supporting documentation", cfrReference: "2 CFR 184.6" },
      { section: "Waiver Process", requirement: "Obtain written waiver approval before procurement", cfrReference: "2 CFR 184.6" },
      { section: "Record Keeping", requirement: "Maintain procurement records with Buy America documentation", cfrReference: "2 CFR 200.334" },
      { section: "Record Keeping", requirement: "Flag non-compliant expenses — block from drawdown", cfrReference: "2 CFR 184" },
    ],
  },
  davis_bacon: {
    title: "Davis-Bacon Prevailing Wage Compliance",
    items: [
      { section: "Wage Determination", requirement: "Obtain applicable wage determination from DOL", cfrReference: "40 USC 3142" },
      { section: "Wage Determination", requirement: "Include wage determination in all construction contracts", cfrReference: "40 USC 3142" },
      { section: "Wage Determination", requirement: "Post wage determination at construction site", cfrReference: "29 CFR 5.5" },
      { section: "Certified Payroll", requirement: "Collect weekly certified payroll from contractors", cfrReference: "29 CFR 5.5(a)" },
      { section: "Certified Payroll", requirement: "Verify employee classifications match wage determination", cfrReference: "29 CFR 5.5(a)" },
      { section: "Certified Payroll", requirement: "Confirm fringe benefits meet minimum requirements", cfrReference: "40 USC 3141" },
      { section: "Rate Verification", requirement: "Compare submitted rates against DOL wage determination", cfrReference: "29 CFR 5.5" },
      { section: "Rate Verification", requirement: "Document and resolve any rate discrepancies", cfrReference: "29 CFR 5.5" },
      { section: "Enforcement", requirement: "Withhold payment for non-compliant payroll periods", cfrReference: "40 USC 3144" },
    ],
  },
  nepa: {
    title: "NEPA Environmental Review Compliance",
    items: [
      { section: "Environmental Classification", requirement: "Determine level of review (CE, EA, or EIS)", cfrReference: "42 USC 4332" },
      { section: "Environmental Classification", requirement: "Document categorical exclusion if applicable", cfrReference: "40 CFR 1501.4" },
      { section: "Environmental Assessment", requirement: "Complete Environmental Assessment if required", cfrReference: "40 CFR 1501.5" },
      { section: "Environmental Assessment", requirement: "Publish Finding of No Significant Impact (FONSI)", cfrReference: "40 CFR 1501.6" },
      { section: "Permits & Approvals", requirement: "Obtain all required environmental permits", cfrReference: "42 USC 4332" },
      { section: "Permits & Approvals", requirement: "Track permit expiration dates and renewals", cfrReference: "42 USC 4332" },
      { section: "Mitigation", requirement: "Implement required mitigation measures", cfrReference: "40 CFR 1505.2" },
      { section: "Monitoring", requirement: "Document compliance with environmental conditions", cfrReference: "40 CFR 1505.3" },
    ],
  },
  title_vi_dbe: {
    title: "Title VI / DBE Compliance",
    items: [
      { section: "Title VI", requirement: "Maintain Title VI program and assurances", cfrReference: "49 CFR 21" },
      { section: "Title VI", requirement: "Post Title VI notice and complaint procedure", cfrReference: "49 CFR 21.9" },
      { section: "Title VI", requirement: "Collect and analyze demographic data on beneficiaries", cfrReference: "49 CFR 21.9" },
      { section: "DBE Program", requirement: "Establish overall DBE goal for federal fiscal year", cfrReference: "49 CFR 26.45" },
      { section: "DBE Program", requirement: "Track DBE participation on each contract", cfrReference: "49 CFR 26.37" },
      { section: "DBE Program", requirement: "Document good faith efforts when goal not met", cfrReference: "49 CFR 26.53" },
      { section: "Reporting", requirement: "Submit semi-annual DBE participation report", cfrReference: "49 CFR 26.11" },
      { section: "Reporting", requirement: "Report DBE achievements vs. goals", cfrReference: "49 CFR 26.47" },
    ],
  },
};

// ─── GET ───

export async function GET(request: NextRequest) {
  try {
    setTenantConfigFromHeaders(request.headers);
    const portId = getPortId();
    const params = request.nextUrl.searchParams;
    const section = params.get("section"); // checklists, findings, scorecard
    const awardId = params.get("awardId");

    // ─── Checklists ───
    if (section === "checklists" || !section) {
      const where: Record<string, unknown> = { portId };
      if (awardId) where.awardId = awardId;

      const checklists = await prisma.demoComplianceChecklist.findMany({
        where,
        include: {
          items: { orderBy: { sortOrder: "asc" } },
          award: { select: { title: true, program: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json({ checklists, templates: Object.keys(CHECKLIST_TEMPLATES) });
    }

    // ─── Audit Findings ───
    if (section === "findings") {
      const findings = await prisma.demoAuditFinding.findMany({
        where: { portId },
        include: {
          correctiveActions: { orderBy: { targetDate: "asc" } },
          award: { select: { title: true, program: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json({ findings });
    }

    // ─── Scorecard ───
    if (section === "scorecard") {
      const [findings, checklists, subs, reports, drawdowns, expenses] = await Promise.all([
        prisma.demoAuditFinding.findMany({ where: { portId } }),
        prisma.demoComplianceChecklist.findMany({ where: { portId }, include: { items: true } }),
        prisma.demoSubrecipient.findMany({ where: { portId }, include: { reports: true } }),
        prisma.demoScheduledReport.findMany({ where: { portId } }),
        prisma.demoDrawdownRequest.findMany({ where: { portId } }),
        prisma.demoExpense.findMany({ where: { portId } }),
      ]);

      const openFindings = findings.filter((f) => f.status === "open" || f.status === "in_progress");
      const materialWeaknesses = openFindings.filter((f) => f.severity === "material_weakness");
      const overdueReports = reports.filter((r) => r.status !== "submitted" && new Date(r.dueDate) < new Date());
      const overdueSubReports = subs.flatMap((s) => s.reports).filter((r) => r.status === "pending" && new Date(r.dueDate) < new Date());

      // 12 Single Audit compliance areas
      const areas = [
        { id: "activities_allowed", name: "Activities Allowed/Unallowed", status: openFindings.some((f) => f.complianceArea === "activities_allowed") ? "red" : "green" },
        { id: "allowable_costs", name: "Allowable Costs/Cost Principles", status: expenses.some((e) => e.status === "flagged") ? "yellow" : "green" },
        { id: "cash_management", name: "Cash Management", status: drawdowns.some((d) => d.status === "submitted" && new Date(d.submittedDate!).getTime() < Date.now() - 90 * 86400000) ? "yellow" : "green" },
        { id: "eligibility", name: "Eligibility", status: "green" },
        { id: "equipment", name: "Equipment/Real Property", status: "green" },
        { id: "matching", name: "Matching/Level of Effort", status: openFindings.some((f) => f.complianceArea === "matching") ? "red" : "green" },
        { id: "period_of_performance", name: "Period of Performance", status: "green" },
        { id: "procurement", name: "Procurement/Suspension/Debarment", status: checklists.some((c) => c.status === "non_compliant") ? "red" : checklists.length === 0 ? "yellow" : "green" },
        { id: "program_income", name: "Program Income", status: "green" },
        { id: "reporting", name: "Reporting", status: overdueReports.length > 0 ? "red" : "green" },
        { id: "subrecipient_monitoring", name: "Subrecipient Monitoring", status: overdueSubReports.length > 0 ? "red" : subs.length > 0 && subs.every((s) => s.riskLevel === "low" || s.riskLevel === "standard") ? "green" : subs.length > 0 ? "yellow" : "green" },
        { id: "special_tests", name: "Special Tests and Provisions", status: materialWeaknesses.length > 0 ? "red" : "green" },
      ];

      const red = areas.filter((a) => a.status === "red").length;
      const yellow = areas.filter((a) => a.status === "yellow").length;
      const green = areas.filter((a) => a.status === "green").length;

      return NextResponse.json({
        areas,
        summary: { red, yellow, green, total: 12 },
        openFindings: openFindings.length,
        materialWeaknesses: materialWeaknesses.length,
        overdueReports: overdueReports.length,
      });
    }

    return NextResponse.json({ error: "Invalid section" }, { status: 400 });
  } catch (error) {
    console.error("Compliance GET error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}

// ─── POST: Create checklist or finding ───

export async function POST(request: NextRequest) {
  try {
    setTenantConfigFromHeaders(request.headers);
    const portId = getPortId();
    const body = await request.json();
    const { action } = body;

    // Create compliance checklist from template
    if (action === "createChecklist") {
      const { awardId, template } = body;
      const tmpl = CHECKLIST_TEMPLATES[template];
      if (!tmpl) return NextResponse.json({ error: "Unknown template" }, { status: 400 });

      const checklist = await prisma.demoComplianceChecklist.create({
        data: {
          portId,
          awardId,
          template,
          title: tmpl.title,
          status: "in_progress",
          completedItems: 0,
          totalItems: tmpl.items.length,
          items: {
            create: tmpl.items.map((item, i) => ({
              portId,
              section: item.section,
              requirement: item.requirement,
              cfrReference: item.cfrReference,
              sortOrder: i,
            })),
          },
        },
        include: { items: true },
      });

      return NextResponse.json(checklist, { status: 201 });
    }

    // Create audit finding
    if (action === "createFinding") {
      const { awardId, auditYear, findingNumber, title, description, complianceArea, severity } = body;
      const finding = await prisma.demoAuditFinding.create({
        data: {
          portId,
          awardId: awardId || null,
          auditYear,
          findingNumber,
          title,
          description,
          complianceArea,
          severity,
          status: "open",
        },
      });
      return NextResponse.json(finding, { status: 201 });
    }

    // Create corrective action plan
    if (action === "createCAP") {
      const { findingId, actionText, responsible, targetDate } = body;
      const cap = await prisma.demoCorrectiveActionPlan.create({
        data: {
          portId,
          findingId,
          action: actionText,
          responsible,
          targetDate: new Date(targetDate),
          status: "pending",
        },
      });
      return NextResponse.json(cap, { status: 201 });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Compliance POST error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}

// ─── PUT: Update checklist item or finding ───

export async function PUT(request: NextRequest) {
  try {
    setTenantConfigFromHeaders(request.headers);
    const portId = getPortId();
    const body = await request.json();
    const { action } = body;

    // Toggle checklist item
    if (action === "toggleItem") {
      const { itemId, completed, completedBy } = body;
      const item = await prisma.demoComplianceChecklistItem.update({
        where: { id: itemId },
        data: {
          isCompleted: completed,
          completedAt: completed ? new Date() : null,
          completedBy: completed ? completedBy || "System" : null,
        },
      });

      // Update checklist completion count
      const checklistItems = await prisma.demoComplianceChecklistItem.findMany({
        where: { checklistId: item.checklistId },
      });
      const completedCount = checklistItems.filter((i) => i.isCompleted).length;
      const allDone = completedCount === checklistItems.length;

      await prisma.demoComplianceChecklist.update({
        where: { id: item.checklistId },
        data: {
          completedItems: completedCount,
          status: allDone ? "compliant" : "in_progress",
        },
      });

      return NextResponse.json(item);
    }

    // Update finding status
    if (action === "updateFindingStatus") {
      const { findingId, status } = body;
      const finding = await prisma.demoAuditFinding.update({
        where: { id: findingId },
        data: { status },
      });
      return NextResponse.json(finding);
    }

    // Update CAP status
    if (action === "updateCAPStatus") {
      const { capId, status } = body;
      const cap = await prisma.demoCorrectiveActionPlan.update({
        where: { id: capId },
        data: {
          status,
          completedAt: status === "completed" ? new Date() : null,
        },
      });
      return NextResponse.json(cap);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Compliance PUT error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}
