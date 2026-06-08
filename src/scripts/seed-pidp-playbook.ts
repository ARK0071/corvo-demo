/**
 * Seed PIDP (Port Infrastructure Development Program) Playbook
 *
 * Creates a full compliance task template for a PIDP award covering:
 * - Quarterly SF-425 Financial Reports
 * - Performance Reports
 * - Buy America / BABA checkpoints
 * - DBE goal reviews
 * - FFATA/FSRS filing reminders
 * - Single Audit reminders
 * - Closeout tasks
 *
 * Run: npx tsx src/scripts/seed-pidp-playbook.ts
 */

import "dotenv/config";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding PIDP playbook...");

  // Upsert: delete existing PIDP template if present
  const existing = await prisma.taskTemplate.findFirst({
    where: { program: "PIDP" },
  });
  if (existing) {
    await prisma.taskTemplate.delete({ where: { id: existing.id } });
    console.log("Deleted existing PIDP template");
  }

  const template = await prisma.taskTemplate.create({
    data: {
      program: "PIDP",
      name: "PIDP Full Compliance Plan",
      description:
        "Complete compliance task plan for a PIDP (Port Infrastructure Development Program) award. Covers financial reporting, performance reporting, Buy America, DBE, FFATA, Single Audit, and closeout.",
      active: true,
      items: {
        create: [
          // ── Quarterly SF-425 Financial Reports ──
          {
            title: "Complete SF-425 Federal Financial Report",
            description:
              "Prepare and submit the SF-425 Federal Financial Report for the reporting period. Must include all federal expenditures, recipient share, and program income. Due 30 days after each quarter end.",
            area: "financial_reporting",
            priority: "high",
            dueRule: "30 days after reporting period end",
            dueOffsetDays: 30,
            dueReference: "period_end",
            deliverableType: "scheduled_report",
            sortOrder: 10,
            recurring: true,
            recurrenceRule: "quarterly",
          },

          // ── Performance Reports ──
          {
            title: "Submit Semi-Annual Performance Report",
            description:
              "Prepare narrative performance report covering project milestones, accomplishments, challenges, and planned activities for next period. Include updated project schedule and budget narrative.",
            area: "performance_reporting",
            priority: "high",
            dueRule: "30 days after semi-annual period end",
            dueOffsetDays: 30,
            dueReference: "period_end",
            deliverableType: "scheduled_report",
            sortOrder: 20,
            recurring: true,
            recurrenceRule: "semi_annually",
          },

          // ── Buy America / BABA Compliance ──
          {
            title: "Buy America/BABA Pre-Procurement Review",
            description:
              "Before issuing any procurement, verify Buy America/Build America Buy America Act compliance. Document domestic content requirements in solicitation documents. Review material sourcing for iron, steel, manufactured products, and construction materials.",
            area: "buy_america",
            priority: "high",
            dueRule: "60 days after award start",
            dueOffsetDays: 60,
            dueReference: "period_start",
            sortOrder: 30,
            recurring: false,
          },
          {
            title: "Buy America Certification - Annual Review",
            description:
              "Conduct annual review of all procurements for Buy America compliance. Collect and file manufacturer certifications. Document any waiver requests submitted or approved.",
            area: "buy_america",
            priority: "medium",
            dueRule: "Annually from award start",
            dueOffsetDays: 0,
            dueReference: "period_end",
            sortOrder: 31,
            recurring: true,
            recurrenceRule: "annually",
          },

          // ── DBE / Title VI ──
          {
            title: "Establish DBE Goal and Program",
            description:
              "Set Disadvantaged Business Enterprise participation goal for the award. Document methodology, outreach efforts, and submit DBE program plan to MARAD.",
            area: "dbe",
            priority: "high",
            dueRule: "90 days after award start",
            dueOffsetDays: 90,
            dueReference: "period_start",
            sortOrder: 40,
            recurring: false,
          },
          {
            title: "DBE Semi-Annual Attainment Report",
            description:
              "Report DBE participation attainment vs. goal. Document all DBE-certified firms used, contract amounts, and payments made. Include good faith efforts documentation if goal not met.",
            area: "dbe",
            priority: "medium",
            dueRule: "30 days after semi-annual period end",
            dueOffsetDays: 30,
            dueReference: "period_end",
            sortOrder: 41,
            recurring: true,
            recurrenceRule: "semi_annually",
          },

          // ── FFATA / FSRS ──
          {
            title: "FFATA Subaward Reporting (FSRS)",
            description:
              "Report all first-tier subawards of $30,000+ in the FFATA Subaward Reporting System (FSRS) within 30 days of subaward execution. Include subaward amount, entity, and performance site.",
            area: "ffata",
            priority: "high",
            dueRule: "Quarterly, 30 days after quarter end",
            dueOffsetDays: 30,
            dueReference: "period_end",
            sortOrder: 50,
            recurring: true,
            recurrenceRule: "quarterly",
          },

          // ── Single Audit ──
          {
            title: "Single Audit Readiness Check",
            description:
              "Review whether the entity expended $750,000+ in federal funds during the fiscal year, triggering Single Audit requirement under 2 CFR 200 Subpart F. Ensure audit firm is engaged and timeline is on track.",
            area: "single_audit",
            priority: "medium",
            dueRule: "Annually, 6 months after fiscal year end",
            dueOffsetDays: 0,
            dueReference: "period_end",
            sortOrder: 60,
            recurring: true,
            recurrenceRule: "annually",
          },

          // ── Davis-Bacon ──
          {
            title: "Davis-Bacon Wage Determination",
            description:
              "Obtain applicable Davis-Bacon wage determination from DOL for the project location. Include in all construction contracts and solicitations.",
            area: "davis_bacon",
            priority: "high",
            dueRule: "Before first construction procurement",
            dueOffsetDays: 90,
            dueReference: "period_start",
            sortOrder: 70,
            recurring: false,
          },
          {
            title: "Davis-Bacon Certified Payroll Review",
            description:
              "Review certified payrolls from contractors for Davis-Bacon compliance. Verify wage rates, fringe benefits, and apprentice ratios meet determination requirements.",
            area: "davis_bacon",
            priority: "medium",
            dueRule: "Quarterly during construction",
            dueOffsetDays: 15,
            dueReference: "period_end",
            sortOrder: 71,
            recurring: true,
            recurrenceRule: "quarterly",
          },

          // ── Environmental / NEPA ──
          {
            title: "NEPA Compliance Documentation",
            description:
              "Complete and file required NEPA documentation (Categorical Exclusion, Environmental Assessment, or EIS as applicable). No construction activity may begin until NEPA clearance is obtained.",
            area: "environmental",
            priority: "urgent",
            dueRule: "Before any construction begins",
            dueOffsetDays: 60,
            dueReference: "period_start",
            sortOrder: 80,
            recurring: false,
          },

          // ── Subrecipient Monitoring ──
          {
            title: "Subrecipient Risk Assessment",
            description:
              "Conduct risk assessment for all subrecipients per 2 CFR 200.332. Evaluate prior audit findings, experience with federal awards, and financial stability. Determine monitoring intensity.",
            area: "subrecipient_monitoring",
            priority: "high",
            dueRule: "Within 60 days of each subaward",
            dueOffsetDays: 120,
            dueReference: "period_start",
            sortOrder: 90,
            recurring: false,
          },
          {
            title: "Subrecipient Annual Monitoring Review",
            description:
              "Conduct annual monitoring of all subrecipients. Review financial reports, Single Audit reports, programmatic progress, and compliance with subaward terms.",
            area: "subrecipient_monitoring",
            priority: "medium",
            dueRule: "Annually",
            dueOffsetDays: 0,
            dueReference: "period_end",
            sortOrder: 91,
            recurring: true,
            recurrenceRule: "annually",
          },

          // ── Closeout ──
          {
            title: "Final SF-425 Financial Report",
            description:
              "Prepare and submit the final SF-425 within 120 days after the end of the period of performance. Must account for all federal expenditures and reconcile with drawdowns.",
            area: "closeout",
            priority: "urgent",
            dueRule: "120 days after period of performance end",
            dueOffsetDays: 120,
            dueReference: "period_end",
            deliverableType: "scheduled_report",
            sortOrder: 100,
            recurring: false,
          },
          {
            title: "Final Performance Report",
            description:
              "Submit final performance/progress report summarizing all project accomplishments, outcomes, and lessons learned over the full period of performance.",
            area: "closeout",
            priority: "urgent",
            dueRule: "120 days after period of performance end",
            dueOffsetDays: 120,
            dueReference: "period_end",
            deliverableType: "scheduled_report",
            sortOrder: 101,
            recurring: false,
          },
          {
            title: "Return Unexpended Funds",
            description:
              "Calculate and return any unexpended federal funds to MARAD. Reconcile total drawdowns vs. allowable expenditures.",
            area: "closeout",
            priority: "high",
            dueRule: "120 days after period of performance end",
            dueOffsetDays: 120,
            dueReference: "period_end",
            sortOrder: 102,
            recurring: false,
          },
          {
            title: "Equipment Disposition",
            description:
              "Inventory all equipment purchased with federal funds ($5,000+ per unit). Follow 2 CFR 200.313 for disposition. File equipment inventory report.",
            area: "closeout",
            priority: "medium",
            dueRule: "90 days after period of performance end",
            dueOffsetDays: 90,
            dueReference: "period_end",
            sortOrder: 103,
            recurring: false,
          },
          {
            title: "Record Retention Notice",
            description:
              "Ensure all financial records, supporting documents, and program records are retained for 3 years after final report submission per 2 CFR 200.334.",
            area: "closeout",
            priority: "low",
            dueRule: "At closeout",
            dueOffsetDays: 120,
            dueReference: "period_end",
            sortOrder: 104,
            recurring: false,
          },
        ],
      },
    },
    include: { items: true },
  });

  console.log(`Created PIDP template with ${template.items.length} task items`);
  console.log("Template ID:", template.id);
  console.log("\nItems:");
  for (const item of template.items) {
    console.log(`  [${item.area}] ${item.title} (${item.recurring ? item.recurrenceRule : "one-time"})`);
  }

  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
