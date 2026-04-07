/**
 * Seed script for compliance module: subrecipients, compliance checklists, audit findings.
 *
 * Run: npx tsx src/scripts/seed-compliance.ts
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { PrismaClient } from "../generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({
  host: process.env.RDS_HOST,
  port: parseInt(process.env.RDS_PORT || "5432"),
  database: process.env.RDS_DATABASE,
  user: process.env.RDS_USER,
  password: process.env.RDS_PASSWORD,
  ssl: { rejectUnauthorized: false },
});

const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const PORT_ID = "freeport";

// Award IDs from the existing seed data
const AWARDS = {
  pidp: "b16e4de2-2b61-4f42-8a0f-9e7483c937d4",
  crisi: "19406df6-9081-40b9-a407-5ac117a61045",
  epa: "1a9e8c28-3b11-413c-8345-6f7cf8917e9b",
  txdotEast5th: "8ae8ac92-6fe2-49df-b259-2aacf190c3e7",
  txdotRider37: "20558809-5c32-432d-97e3-73245a5a6043",
  txdotAccess: "37947cee-48f7-438b-8110-daf031ffcf91",
};

async function seedSubrecipients() {
  console.log("Seeding subrecipients...");

  // Clear existing
  await prisma.demoSubrecipientReport.deleteMany({ where: { portId: PORT_ID } });
  await prisma.demoSubrecipient.deleteMany({ where: { portId: PORT_ID } });

  const subs = [
    {
      portId: PORT_ID,
      awardId: AWARDS.pidp,
      entityName: "Gulf Coast Marine Construction LLC",
      uei: "KJ4MNPQ8R2T5",
      classification: "contractor",
      classificationAnswers: [
        { questionId: "q1", answer: false },
        { questionId: "q2", answer: false },
        { questionId: "q3", answer: false },
        { questionId: "q4", answer: false },
        { questionId: "q5", answer: false },
      ],
      riskLevel: "standard",
      riskFactors: { newEntity: false, priorFindings: false, highSpend: true, noSingleAudit: false, lateReporting: false },
      monitoringIntensity: "quarterly",
      subawardAmount: 8500000,
      cumulativeSpend: 3200000,
      singleAuditRequired: true,
      status: "active",
    },
    {
      portId: PORT_ID,
      awardId: AWARDS.pidp,
      entityName: "Brazoria County Environmental Authority",
      uei: "TY6WBRC4D8N1",
      classification: "subrecipient",
      classificationAnswers: [
        { questionId: "q1", answer: true },
        { questionId: "q2", answer: true },
        { questionId: "q3", answer: true },
        { questionId: "q4", answer: true },
        { questionId: "q5", answer: true },
      ],
      riskLevel: "elevated",
      riskFactors: { newEntity: true, priorFindings: false, highSpend: false, noSingleAudit: true, lateReporting: false },
      monitoringIntensity: "quarterly_plus",
      subawardAmount: 420000,
      cumulativeSpend: 185000,
      singleAuditRequired: false,
      status: "active",
    },
    {
      portId: PORT_ID,
      awardId: AWARDS.crisi,
      entityName: "Texas Rail Infrastructure Partners",
      uei: "MN9PLK7GH3J2",
      classification: "subrecipient",
      classificationAnswers: [
        { questionId: "q1", answer: false },
        { questionId: "q2", answer: true },
        { questionId: "q3", answer: true },
        { questionId: "q4", answer: true },
        { questionId: "q5", answer: true },
      ],
      riskLevel: "standard",
      riskFactors: { newEntity: false, priorFindings: false, highSpend: false, noSingleAudit: false, lateReporting: false },
      monitoringIntensity: "quarterly",
      subawardAmount: 1800000,
      cumulativeSpend: 720000,
      singleAuditRequired: false,
      status: "active",
    },
    {
      portId: PORT_ID,
      awardId: AWARDS.epa,
      entityName: "Freeport Emissions Monitoring Cooperative",
      uei: "QR5TUV8WX1Y3",
      classification: "subrecipient",
      classificationAnswers: [
        { questionId: "q1", answer: true },
        { questionId: "q2", answer: true },
        { questionId: "q3", answer: true },
        { questionId: "q4", answer: true },
        { questionId: "q5", answer: false },
      ],
      riskLevel: "high",
      riskFactors: { newEntity: true, priorFindings: true, highSpend: false, noSingleAudit: true, lateReporting: true },
      monitoringIntensity: "monthly",
      subawardAmount: 380000,
      cumulativeSpend: 95000,
      singleAuditRequired: false,
      status: "active",
    },
    {
      portId: PORT_ID,
      awardId: AWARDS.txdotRider37,
      entityName: "South Texas Paving & Concrete Inc",
      uei: "AB2CDE5FG8H0",
      classification: "contractor",
      classificationAnswers: [
        { questionId: "q1", answer: false },
        { questionId: "q2", answer: false },
        { questionId: "q3", answer: false },
        { questionId: "q4", answer: false },
        { questionId: "q5", answer: false },
      ],
      riskLevel: "low",
      riskFactors: { newEntity: false, priorFindings: false, highSpend: false, noSingleAudit: false, lateReporting: false },
      monitoringIntensity: "annual",
      subawardAmount: 2400000,
      cumulativeSpend: 680000,
      singleAuditRequired: false,
      status: "active",
    },
  ];

  for (const sub of subs) {
    const created = await prisma.demoSubrecipient.create({ data: sub });
    console.log(`  Created: ${sub.entityName} (${sub.classification}) → ${sub.riskLevel} risk`);

    // Add reports for subrecipients
    if (sub.classification === "subrecipient") {
      const reports = [
        { reportType: "financial", title: "Quarterly Financial Report", dueDate: new Date("2026-03-31"), status: "received", receivedDate: new Date("2026-03-28") },
        { reportType: "financial", title: "Quarterly Financial Report", dueDate: new Date("2026-06-30"), status: "pending", receivedDate: null },
        { reportType: "progress", title: "Semi-Annual Progress Report", dueDate: new Date("2026-06-30"), status: "pending", receivedDate: null },
      ];

      // Make one overdue for the high-risk sub
      if (sub.riskLevel === "high") {
        reports.push({
          reportType: "single_audit", title: "Single Audit Report (FY2025)", dueDate: new Date("2026-03-01"), status: "pending", receivedDate: null,
        });
      }

      for (const report of reports) {
        await prisma.demoSubrecipientReport.create({
          data: {
            portId: PORT_ID,
            subrecipientId: created.id,
            ...report,
          },
        });
      }
    }
  }

  console.log(`  ✓ ${subs.length} entities seeded with reports`);
}

async function seedComplianceChecklists() {
  console.log("Seeding compliance checklists...");

  // Clear existing
  await prisma.demoComplianceChecklistItem.deleteMany({ where: { portId: PORT_ID } });
  await prisma.demoComplianceChecklist.deleteMany({ where: { portId: PORT_ID } });

  const templates: Record<string, { title: string; items: { section: string; requirement: string; cfrReference: string }[] }> = {
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

  // Attach checklists to awards based on agency
  const assignments: { awardId: string; templateKey: string }[] = [
    // PIDP (MARAD) → Buy America + Davis-Bacon
    { awardId: AWARDS.pidp, templateKey: "buy_america" },
    { awardId: AWARDS.pidp, templateKey: "davis_bacon" },
    // CRISI (FRA) → Buy America + Davis-Bacon
    { awardId: AWARDS.crisi, templateKey: "buy_america" },
    { awardId: AWARDS.crisi, templateKey: "davis_bacon" },
    // EPA → NEPA
    { awardId: AWARDS.epa, templateKey: "nepa" },
    // TxDOT East 5th → Davis-Bacon + Title VI/DBE
    { awardId: AWARDS.txdotEast5th, templateKey: "davis_bacon" },
    { awardId: AWARDS.txdotEast5th, templateKey: "title_vi_dbe" },
    // TxDOT Rider 37 → Davis-Bacon
    { awardId: AWARDS.txdotRider37, templateKey: "davis_bacon" },
  ];

  for (const assignment of assignments) {
    const tmpl = templates[assignment.templateKey];
    const checklist = await prisma.demoComplianceChecklist.create({
      data: {
        portId: PORT_ID,
        awardId: assignment.awardId,
        template: assignment.templateKey,
        title: tmpl.title,
        status: "in_progress",
        completedItems: 0,
        totalItems: tmpl.items.length,
        items: {
          create: tmpl.items.map((item, i) => ({
            portId: PORT_ID,
            section: item.section,
            requirement: item.requirement,
            cfrReference: item.cfrReference,
            sortOrder: i,
          })),
        },
      },
    });

    // Mark some items as completed for realism
    const items = await prisma.demoComplianceChecklistItem.findMany({
      where: { checklistId: checklist.id },
      orderBy: { sortOrder: "asc" },
    });

    // Complete first 40-60% of items
    const completeCount = Math.floor(items.length * (0.4 + Math.random() * 0.2));
    for (let i = 0; i < completeCount; i++) {
      await prisma.demoComplianceChecklistItem.update({
        where: { id: items[i].id },
        data: {
          isCompleted: true,
          completedAt: new Date(Date.now() - Math.random() * 90 * 86400000), // random date in last 90 days
          completedBy: "Phyllis Saathoff",
        },
      });
    }

    await prisma.demoComplianceChecklist.update({
      where: { id: checklist.id },
      data: { completedItems: completeCount },
    });

    console.log(`  Created: ${tmpl.title} for award ${assignment.awardId.slice(0, 8)}... (${completeCount}/${tmpl.items.length} done)`);
  }

  console.log(`  ✓ ${assignments.length} checklists seeded`);
}

async function seedAuditFindings() {
  console.log("Seeding audit findings...");

  // Clear existing
  await prisma.demoCorrectiveActionPlan.deleteMany({ where: { portId: PORT_ID } });
  await prisma.demoAuditFinding.deleteMany({ where: { portId: PORT_ID } });

  const findings = [
    {
      portId: PORT_ID,
      awardId: AWARDS.pidp,
      auditYear: 2024,
      findingNumber: "2024-001",
      title: "Inadequate Documentation of Procurement Procedures",
      description: "During the FY2024 audit, it was noted that procurement files for two PIDP-funded construction contracts lacked required sole-source justification documentation. While the procurements appeared reasonable, the absence of written justification creates a compliance risk under 2 CFR 200.320.",
      complianceArea: "procurement",
      severity: "significant_deficiency",
      status: "in_progress",
    },
    {
      portId: PORT_ID,
      awardId: AWARDS.crisi,
      auditYear: 2024,
      findingNumber: "2024-002",
      title: "Late Submission of SF-425 Federal Financial Report",
      description: "The Q2 2024 SF-425 for the CRISI Rail Development award was submitted 12 days past the 30-day deadline. The delay was attributed to staff turnover in the finance department. Per 2 CFR 200.328, financial reports must be submitted within 30 days of the reporting period end.",
      complianceArea: "reporting",
      severity: "finding",
      status: "resolved",
    },
    {
      portId: PORT_ID,
      awardId: null,
      auditYear: 2023,
      findingNumber: "2023-001",
      title: "Subrecipient Monitoring Not Documented",
      description: "The FY2023 audit identified that Port Freeport did not maintain written monitoring procedures for subrecipient entities receiving federal pass-through funds. While no questioned costs were identified, the absence of documented monitoring procedures represents a material weakness in the internal control structure per 2 CFR 200.332.",
      complianceArea: "subrecipient_monitoring",
      severity: "material_weakness",
      status: "in_progress",
    },
    {
      portId: PORT_ID,
      awardId: AWARDS.epa,
      auditYear: 2025,
      findingNumber: "2025-001",
      title: "Unallowable Entertainment Costs Charged to Federal Award",
      description: "An expense of $1,250 for a community outreach event with catering and entertainment elements was charged to the EPA Clean Ports award. Per 2 CFR 200.438, entertainment costs are generally unallowable. The expense was subsequently reclassified to local match funds.",
      complianceArea: "allowable_costs",
      severity: "finding",
      status: "resolved",
    },
  ];

  for (const finding of findings) {
    const created = await prisma.demoAuditFinding.create({ data: finding });
    console.log(`  Created: ${finding.findingNumber} — ${finding.title.slice(0, 50)}... (${finding.severity}/${finding.status})`);

    // Add corrective action plans for open/in-progress findings
    if (finding.status !== "resolved") {
      const caps = [];

      if (finding.findingNumber === "2024-001") {
        caps.push(
          { action: "Develop written procurement procedures manual with 2 CFR 200.320 requirements", responsible: "Jason Cordoba", targetDate: "2026-06-30", status: "in_progress" },
          { action: "Retroactively document sole-source justifications for identified procurements", responsible: "Chris Hogan", targetDate: "2026-05-15", status: "completed" },
          { action: "Implement procurement checklist requirement for all federal procurements >$10K", responsible: "Phyllis Saathoff", targetDate: "2026-07-31", status: "pending" },
        );
      }

      if (finding.findingNumber === "2023-001") {
        caps.push(
          { action: "Develop written subrecipient monitoring policy and procedures", responsible: "Jason Cordoba", targetDate: "2026-04-30", status: "in_progress" },
          { action: "Establish risk assessment framework for all subrecipients", responsible: "Chris Hogan", targetDate: "2026-05-31", status: "pending" },
          { action: "Implement quarterly desk reviews for elevated/high risk subrecipients", responsible: "Jason Cordoba", targetDate: "2026-06-30", status: "pending" },
          { action: "Conduct initial risk assessments on all current subrecipients", responsible: "Chris Hogan", targetDate: "2026-05-15", status: "pending" },
        );
      }

      for (const cap of caps) {
        await prisma.demoCorrectiveActionPlan.create({
          data: {
            portId: PORT_ID,
            findingId: created.id,
            action: cap.action,
            responsible: cap.responsible,
            targetDate: new Date(cap.targetDate),
            status: cap.status,
            completedAt: cap.status === "completed" ? new Date("2026-03-20") : null,
          },
        });
      }
    }
  }

  console.log(`  ✓ ${findings.length} findings seeded with corrective action plans`);
}

async function main() {
  console.log("\n=== Seeding Compliance Module Data ===\n");

  try {
    await seedSubrecipients();
    console.log("");
    await seedComplianceChecklists();
    console.log("");
    await seedAuditFindings();
    console.log("\n=== Done ===\n");
  } catch (error) {
    console.error("Seed error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    pool.end();
  }
}

main();
