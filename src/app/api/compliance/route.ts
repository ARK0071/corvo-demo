/**
 * API Route: /api/compliance
 *
 * Compliance checklists (Buy America, Davis-Bacon, NEPA, Title VI/DBE)
 * and audit readiness (findings, corrective action plans, scorecard).
 *
 * Compliance: Various — see template definitions
 */

import { NextRequest, NextResponse } from "next/server";
import { resolveSecureTenant } from "@/lib/db/tenant-config.server";
import { getTenantConfig } from "@/lib/db/tenant-config";
import { prisma } from "@/lib/db/client";
import { Prisma } from "@/generated/prisma";

async function getPortProfileId(): Promise<string> {
  const portId = getTenantConfig().portId;
  const profile = await prisma.portProfile.findFirst({
    where: { slug: portId },
    select: { id: true },
  });
  if (!profile) throw new Error(`No PortProfile found for slug: ${portId}`);
  return profile.id;
}

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
    await resolveSecureTenant(request.headers);
    const portProfileId = await getPortProfileId();
    const params = request.nextUrl.searchParams;
    const section = params.get("section"); // checklists, findings, scorecard
    const awardId = params.get("awardId");

    // ─── Checklists ───
    if (section === "checklists" || !section) {
      const where: Record<string, unknown> = { award: { portProfileId } };
      if (awardId) where.awardId = awardId;

      const checklists = await prisma.complianceChecklist.findMany({
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
      const findings = await prisma.auditFinding.findMany({
        where: {
          OR: [
            { award: { portProfileId } },
            { awardId: null },
          ],
        },
        include: {
          correctiveActions: { orderBy: { targetDate: "asc" } },
          award: { select: { id: true, title: true, program: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json({ findings });
    }

    // ─── Scorecard ───
    if (section === "scorecard") {
      const [findings, checklists, subs, reports, drawdowns, expenses, awards] = await Promise.all([
        prisma.auditFinding.findMany({ where: { award: { portProfileId } }, include: { award: { select: { title: true } } } }),
        prisma.complianceChecklist.findMany({ where: { award: { portProfileId } }, include: { items: true, award: { select: { title: true } } } }),
        prisma.subrecipient.findMany({ where: { award: { portProfileId } }, include: { reports: true } }),
        prisma.scheduledReport.findMany({ where: { award: { portProfileId } }, include: { award: { select: { title: true } } } }),
        prisma.drawdownRequest.findMany({ where: { award: { portProfileId } } }),
        prisma.expense.findMany({ where: { award: { portProfileId } }, include: { award: { select: { title: true } } } }),
        prisma.award.findMany({ where: { portProfileId }, select: { id: true, title: true, matchPercentage: true, matchRequired: true, matchCommitted: true, performancePeriodEnd: true, status: true } }),
      ]);

      const now = new Date();
      const openFindings = findings.filter((f: typeof findings[number]) => f.status === "open" || f.status === "in_progress");
      const materialWeaknesses = openFindings.filter((f: typeof findings[number]) => f.severity === "material_weakness");
      const overdueReports = reports.filter((r: typeof reports[number]) => r.status !== "submitted" && new Date(r.dueDate) < now);
      const overdueSubReports = subs.flatMap((s: typeof subs[number]) => s.reports).filter((r: typeof subs[number]["reports"][number]) => r.status === "pending" && new Date(r.dueDate) < now);

      type Finding = typeof findings[number];
      type Expense = typeof expenses[number];
      type Drawdown = typeof drawdowns[number];
      type Checklist = typeof checklists[number];
      type Subrecipient = typeof subs[number];
      type AwardRow = typeof awards[number];
      type Reason = { type: string; label: string; entityId?: string; severity?: string };

      function buildArea(id: string, name: string, status: string, reasons: Reason[]) {
        return { id, name, status, reasons };
      }

      // Activities Allowed
      const activitiesFindings = openFindings.filter((f: Finding) => f.complianceArea === "activities_allowed");
      const activitiesReasons: Reason[] = activitiesFindings.map((f: Finding) => ({
        type: "finding", label: `Finding ${f.findingNumber}: ${f.title}`, entityId: f.id, severity: f.severity,
      }));

      // Allowable Costs
      const flaggedExpenses = expenses.filter((e: Expense) => e.status === "flagged");
      const allowableCostReasons: Reason[] = flaggedExpenses.map((e: Expense) => ({
        type: "flagged_expense", label: `Flagged: ${e.description} ($${Number(e.amount).toLocaleString()}) — ${(e as unknown as { award?: { title: string } }).award?.title || "Unknown award"}`, entityId: e.id,
      }));

      // Cash Management
      const staleDrawdowns = drawdowns.filter((d: Drawdown) => d.status === "submitted" && new Date(d.submittedDate!).getTime() < Date.now() - 90 * 86400000);
      const cashReasons: Reason[] = staleDrawdowns.map((d: Drawdown) => {
        const days = Math.round((Date.now() - new Date(d.submittedDate!).getTime()) / 86400000);
        return { type: "stale_drawdown", label: `Drawdown of $${Number(d.totalAmount).toLocaleString()} pending ${days} days (>90 day threshold)`, entityId: d.id };
      });

      // Matching
      const matchFindings = openFindings.filter((f: Finding) => f.complianceArea === "matching");
      const matchReasons: Reason[] = matchFindings.map((f: Finding) => ({
        type: "finding", label: `Finding ${f.findingNumber}: ${f.title}`, entityId: f.id, severity: f.severity,
      }));
      const awardsWithMatchGap = awards.filter((a: AwardRow) => Number(a.matchPercentage) > 0 && Number(a.matchCommitted) < Number(a.matchRequired));
      awardsWithMatchGap.forEach((a: AwardRow) => {
        const gap = Number(a.matchRequired) - Number(a.matchCommitted);
        matchReasons.push({ type: "match_gap", label: `${a.title}: $${gap.toLocaleString()} match shortfall ($${Number(a.matchCommitted).toLocaleString()} of $${Number(a.matchRequired).toLocaleString()})` });
      });

      // Period of Performance
      const popReasons: Reason[] = [];
      const soonExpiring = awards.filter((a: AwardRow) => a.status === "active" && a.performancePeriodEnd && (new Date(a.performancePeriodEnd).getTime() - now.getTime()) < 90 * 86400000 && new Date(a.performancePeriodEnd) > now);
      soonExpiring.forEach((a: AwardRow) => {
        const days = Math.round((new Date(a.performancePeriodEnd).getTime() - now.getTime()) / 86400000);
        popReasons.push({ type: "expiring_soon", label: `${a.title}: performance period ends in ${days} days` });
      });
      const expired = awards.filter((a: AwardRow) => a.status === "active" && a.performancePeriodEnd && new Date(a.performancePeriodEnd) < now);
      expired.forEach((a: AwardRow) => {
        popReasons.push({ type: "expired", label: `${a.title}: performance period ended ${new Date(a.performancePeriodEnd).toLocaleDateString()}` });
      });

      // Procurement
      const nonCompliantChecklists = checklists.filter((c: Checklist) => c.status === "non_compliant");
      const procurementReasons: Reason[] = nonCompliantChecklists.map((c: Checklist) => ({
        type: "non_compliant_checklist", label: `${c.title} — ${(c as unknown as { award?: { title: string } }).award?.title || "Unknown"}: non-compliant`, entityId: c.id,
      }));
      if (checklists.length === 0) {
        procurementReasons.push({ type: "no_checklists", label: "No compliance checklists have been created — attach checklists to awards to track procurement compliance" });
      }

      // Reporting
      const reportingReasons: Reason[] = overdueReports.map((r: typeof reports[number]) => {
        const days = Math.round((now.getTime() - new Date(r.dueDate).getTime()) / 86400000);
        return { type: "overdue_report", label: `${r.type === "sf425" ? "SF-425" : r.type === "progress" ? "Progress Report" : r.type} overdue by ${days} days — ${(r as unknown as { award?: { title: string } }).award?.title || "Unknown"}`, entityId: r.id };
      });

      // Subrecipient Monitoring
      const subReasons: Reason[] = [];
      overdueSubReports.forEach((r: typeof subs[number]["reports"][number]) => {
        const days = Math.round((now.getTime() - new Date(r.dueDate).getTime()) / 86400000);
        subReasons.push({ type: "overdue_sub_report", label: `Subrecipient report overdue by ${days} days`, entityId: r.id });
      });
      const highRiskSubs = subs.filter((s: Subrecipient) => s.riskLevel === "high" || s.riskLevel === "elevated");
      highRiskSubs.forEach((s: Subrecipient) => {
        subReasons.push({ type: "high_risk_sub", label: `${s.entityName}: ${s.riskLevel} risk`, entityId: s.id });
      });

      // Special Tests
      const specialReasons: Reason[] = materialWeaknesses.map((f: Finding) => ({
        type: "material_weakness", label: `Material weakness: ${f.title} (${f.findingNumber})`, entityId: f.id, severity: f.severity,
      }));

      const areas = [
        buildArea("activities_allowed", "Activities Allowed/Unallowed", activitiesFindings.length > 0 ? "red" : "green", activitiesReasons),
        buildArea("allowable_costs", "Allowable Costs/Cost Principles", flaggedExpenses.length > 0 ? "yellow" : "green", allowableCostReasons),
        buildArea("cash_management", "Cash Management", staleDrawdowns.length > 0 ? "yellow" : "green", cashReasons),
        buildArea("eligibility", "Eligibility", "green", []),
        buildArea("equipment", "Equipment/Real Property", "green", []),
        buildArea("matching", "Matching/Level of Effort", matchFindings.length > 0 ? "red" : awardsWithMatchGap.length > 0 ? "yellow" : "green", matchReasons),
        buildArea("period_of_performance", "Period of Performance", expired.length > 0 ? "red" : popReasons.length > 0 ? "yellow" : "green", popReasons),
        buildArea("procurement", "Procurement/Suspension/Debarment", nonCompliantChecklists.length > 0 ? "red" : checklists.length === 0 ? "yellow" : "green", procurementReasons),
        buildArea("program_income", "Program Income", "green", []),
        buildArea("reporting", "Reporting", overdueReports.length > 0 ? "red" : "green", reportingReasons),
        buildArea("subrecipient_monitoring", "Subrecipient Monitoring", overdueSubReports.length > 0 ? "red" : highRiskSubs.length > 0 ? "yellow" : subs.length > 0 ? "green" : "green", subReasons),
        buildArea("special_tests", "Special Tests and Provisions", materialWeaknesses.length > 0 ? "red" : "green", specialReasons),
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

    // ─── Awards list (for checklist dialog) ───
    if (section === "awards") {
      const awardsList = await prisma.award.findMany({
        where: { portProfileId },
        select: {
          id: true, title: true, program: true, awardingAgency: true,
          budgetCategories: { select: { name: true } },
          complianceChecklists: { select: { template: true } },
        },
        orderBy: { title: "asc" },
      });

      const mapped = awardsList.map((a: typeof awardsList[number]) => ({
        id: a.id,
        title: a.title,
        program: a.program,
        awardingAgency: a.awardingAgency,
        budgetCategoryNames: a.budgetCategories.map((bc: { name: string }) => bc.name),
        existingTemplates: a.complianceChecklists.map((cl: { template: string }) => cl.template),
      }));

      return NextResponse.json({
        awards: mapped,
        templates: Object.entries(CHECKLIST_TEMPLATES).map(([key, val]) => ({ key, title: val.title, itemCount: val.items.length })),
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
    await resolveSecureTenant(request.headers);
    const body = await request.json();
    const { action } = body;

    // Create compliance checklist from template
    if (action === "createChecklist") {
      const { awardId, template } = body;
      const tmpl = CHECKLIST_TEMPLATES[template];
      if (!tmpl) return NextResponse.json({ error: "Unknown template" }, { status: 400 });

      const checklist = await prisma.complianceChecklist.create({
        data: {
          awardId,
          template,
          title: tmpl.title,
          status: "in_progress",
          completedItems: 0,
          totalItems: tmpl.items.length,
          items: {
            create: tmpl.items.map((item, i) => ({
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
      const finding = await prisma.auditFinding.create({
        data: {
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
      const cap = await prisma.correctiveActionPlan.create({
        data: {
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
    await resolveSecureTenant(request.headers);
    const body = await request.json();
    const { action } = body;

    // Toggle checklist item
    if (action === "toggleItem") {
      const { itemId, completed, completedBy } = body;
      const item = await prisma.complianceChecklistItem.update({
        where: { id: itemId },
        data: {
          isCompleted: completed,
          completedAt: completed ? new Date() : null,
          completedBy: completed ? completedBy || "System" : null,
        },
      });

      // Update checklist completion count
      const checklistItems = await prisma.complianceChecklistItem.findMany({
        where: { checklistId: item.checklistId },
      });
      const completedCount = checklistItems.filter((i: typeof checklistItems[number]) => i.isCompleted).length;
      const allDone = completedCount === checklistItems.length;

      await prisma.complianceChecklist.update({
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
      const finding = await prisma.auditFinding.update({
        where: { id: findingId },
        data: { status },
      });
      return NextResponse.json(finding);
    }

    // Update CAP status
    if (action === "updateCAPStatus") {
      const { capId, status } = body;
      const cap = await prisma.correctiveActionPlan.update({
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

// ─── DELETE: Remove findings, CAPs, or checklists ───

export async function DELETE(request: NextRequest) {
  try {
    await resolveSecureTenant(request.headers);
    const params = request.nextUrl.searchParams;
    const entity = params.get("entity");
    const id = params.get("id");

    if (!entity || !id) {
      return NextResponse.json({ error: "entity and id are required" }, { status: 400 });
    }

    if (entity === "finding") {
      await prisma.correctiveActionPlan.deleteMany({ where: { findingId: id } });
      await prisma.auditFinding.delete({ where: { id } });
      return NextResponse.json({ deleted: true });
    }

    if (entity === "cap") {
      await prisma.correctiveActionPlan.delete({ where: { id } });
      return NextResponse.json({ deleted: true });
    }

    if (entity === "checklist") {
      await prisma.complianceChecklistItem.deleteMany({ where: { checklistId: id } });
      await prisma.complianceChecklist.delete({ where: { id } });
      return NextResponse.json({ deleted: true });
    }

    return NextResponse.json({ error: "Invalid entity type" }, { status: 400 });
  } catch (error) {
    console.error("Compliance DELETE error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}
