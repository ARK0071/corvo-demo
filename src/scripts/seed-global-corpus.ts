/**
 * Seed Global Reference Corpus for Porter Document RAG
 *
 * Ingests foundational compliance references as global (scope='global') documents:
 * - 2 CFR 200 (Uniform Guidance) — key subparts for grant compliance
 * - Common agency GT&Cs (MARAD, FHWA, FTA boilerplate)
 *
 * These are shared across all tenants and always included in document search.
 *
 * Run: npx tsx src/scripts/seed-global-corpus.ts
 * Requires: DATABASE_URL and OPENAI_API_KEY in .env.local
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma";
import { parseText } from "@/lib/rag/parsers/text-parser";
import { chunkDocument } from "@/lib/rag/chunker";
import { embedTexts } from "@/lib/embeddings";
import { formatVectorForPg } from "@/lib/db/vector";
import crypto from "crypto";

// --- Database connection (same pattern as other seed scripts) ---
const pool = new pg.Pool({
  host: process.env.RDS_HOST,
  port: parseInt(process.env.RDS_PORT || "5432"),
  database: process.env.RDS_DATABASE,
  user: process.env.RDS_USER,
  password: process.env.RDS_PASSWORD,
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ---------------------------------------------------------------------------
// Inline ingestion (bypasses @/lib/rag/ingest which imports the app's prisma)
// ---------------------------------------------------------------------------

async function ingestDoc(params: {
  docType: string;
  title: string;
  content: string;
  sourceUrl?: string;
}): Promise<{ chunksCreated: number }> {
  const contentBytes = Buffer.from(params.content);
  const checksum = crypto.createHash("sha256").update(contentBytes).digest("hex");

  // Dedup check
  const existing = await prisma.documentSource.findFirst({
    where: {
      checksum,
      docType: params.docType,
      grantId: null,
      awardId: null,
    },
    select: { id: true, title: true },
  });

  if (existing) {
    const count = await prisma.documentChunk.count({ where: { documentId: existing.id } });
    console.log(`  (already ingested: ${count} chunks)`);
    return { chunksCreated: count };
  }

  // Parse
  const parsed = parseText(params.content, params.title);

  // Chunk
  const chunks = chunkDocument(parsed.pages);
  if (chunks.length === 0) {
    console.log("  (no chunks produced)");
    return { chunksCreated: 0 };
  }

  // Create document source
  const docSource = await prisma.documentSource.create({
    data: {
      docType: params.docType,
      title: params.title,
      sourceUrl: params.sourceUrl,
      scope: "global",
      pageCount: parsed.pageCount,
      checksum,
    },
  });

  // Embed in batches
  const BATCH_SIZE = 50;
  const allEmbeddings: number[][] = [];
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const texts = batch.map((c) => c.content);
    const embeddings = await embedTexts(texts);
    allEmbeddings.push(...embeddings);
  }

  // Store chunks (raw SQL for vector column)
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedding = allEmbeddings[i];
    if (!embedding || embedding.length === 0) continue;

    const vectorStr = formatVectorForPg(embedding);
    await prisma.$executeRawUnsafe(
      `INSERT INTO document_chunks (
        id, document_id, chunk_index, content, section, page_number, metadata, embedding
      ) VALUES (
        uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7::vector
      )`,
      docSource.id,
      chunk.chunkIndex,
      chunk.content,
      chunk.section,
      chunk.pageNumber,
      JSON.stringify(chunk.metadata),
      vectorStr
    );
  }

  return { chunksCreated: chunks.length };
}

// ---------------------------------------------------------------------------
// 2 CFR 200 Content
// ---------------------------------------------------------------------------

const CFR200_SUBPART_A = `# 2 CFR Part 200 — Subpart A: Acronyms and Definitions

§200.1 Definitions.

(a) "Acquisition cost" means the cost of the asset including the cost to ready the asset for its intended use.

(b) "Administrative cost" means the cost for administrative functions and activities necessary to support the direct conduct of the Federal award.

(c) "Advance payment" means a payment that a Federal awarding agency or pass-through entity makes before the non-Federal entity incurs the related expenditure.

(d) "Allocation" means the process of assigning a cost, or a group of costs, to one or more cost objective(s) in reasonable proportion to the benefit provided.

(e) "Audit finding" means deficiencies which the auditor is required by §200.516 to report in the schedule of findings and questioned costs.

(f) "Closeout" means the process by which the Federal awarding agency or pass-through entity determines that all applicable administrative actions and all required work of the Federal award have been completed.

(g) "Cognizant agency for audit" means the Federal agency designated to carry out the responsibilities described in §200.513(a).

(h) "Contract" means a legal instrument by which a recipient or subrecipient purchases property or services needed to carry out the project or program under a Federal award.

(i) "Cooperative agreement" means a legal instrument of financial assistance between a Federal awarding agency and a non-Federal entity.

(j) "Cost objective" means a program, function, activity, award, organizational subdivision, contract, or work unit for which cost data are desired.

(k) "Cost sharing or matching" means the portion of project costs not paid by Federal funds or contributions (unless otherwise authorized by Federal statute).

(l) "Direct cost" means any cost that can be identified specifically with a particular final cost objective.

(m) "Equipment" means tangible personal property having a useful life of more than one year and a per-unit acquisition cost which equals or exceeds $10,000.

(n) "Federal award" means the Federal financial assistance that a non-Federal entity receives directly from a Federal awarding agency or indirectly from a pass-through entity.

(o) "Grant agreement" means a legal instrument of financial assistance between a Federal awarding agency and a non-Federal entity.

(p) "Indirect costs" means those costs incurred for a common or joint purpose benefitting more than one cost objective, and not readily assignable to the cost objectives specifically benefitted.

(q) "Internal controls" means a process designed to provide reasonable assurance regarding the achievement of objectives in effectiveness and efficiency of operations, reliability of reporting, and compliance with applicable laws and regulations.

(r) "Modified Total Direct Cost (MTDC)" means all direct salaries and wages, applicable fringe benefits, materials and supplies, services, travel, and up to the first $25,000 of each subaward.

(s) "Non-Federal entity" means a state, local government, Indian tribe, Institution of Higher Education (IHE), or nonprofit organization that carries out a Federal award.

(t) "Pass-through entity" means a non-Federal entity that provides a subaward to a subrecipient to carry out part of a Federal program.

(u) "Period of performance" means the total estimated time interval between the start of an initial Federal award and the planned end date.

(v) "Program income" means gross income earned by the non-Federal entity that is directly generated by a supported activity or earned as a result of the Federal award during the period of performance.

(w) "Questioned cost" means a cost that is questioned by the auditor because of an audit finding.

(x) "Single Audit" means an audit which includes both the entity's financial statements and the Federal awards as described in §200.514.

(y) "Subaward" means an award provided by a pass-through entity to a subrecipient to carry out part of a Federal award.

(z) "Subrecipient" means an entity that receives a subaward from a pass-through entity to carry out part of a Federal award.`;

const CFR200_SUBPART_D = `# 2 CFR Part 200 — Subpart D: Post-Federal Award Requirements

## §200.302 Financial Management

The financial management system of each non-Federal entity must provide for: identification of all Federal awards received and expended; accurate, current, and complete disclosure of financial results; records identifying the source and application of funds; effective control over all funds, property, and other assets; comparison of expenditures with budget amounts; written procedures for payment requirements; and written procedures for determining cost allowability.

## §200.303 Internal Controls

The non-Federal entity must establish and maintain effective internal control over the Federal award that provides reasonable assurance of compliance with Federal statutes, regulations, and the terms and conditions of the Federal award. Must take prompt action when noncompliance is identified.

## §200.305 Federal Payment

Non-Federal entities must be paid in advance when they maintain written procedures that minimize time between transfer and disbursement. Reimbursement is preferred when advance payment requirements cannot be met.

## §200.308 Revision of Budget and Program Plans

Recipients must request prior approvals for: change in scope or objective; change in key personnel; disengagement of project director for more than three months; inclusion of costs requiring prior approval; transfer of participant support cost funds; subaward or contracting out of work; and changes in cost-sharing or matching.

## §200.313 Equipment

Title to equipment acquired under a Federal award vests upon acquisition in the non-Federal entity. Property records must be maintained including description, serial number, source of funding, title holder, acquisition date, cost, percentage of Federal participation, location, use, condition, and disposition data. Physical inventory must be taken at least every two years.

## §200.318 General Procurement Standards

Non-Federal entities must have documented procurement procedures, maintain written standards of conduct covering conflicts of interest, and avoid unnecessary or duplicative acquisitions.

## §200.320 Methods of Procurement

Methods include: micro-purchases (below micro-purchase threshold); small purchase procedures (below simplified acquisition threshold); sealed bids (formal advertising); competitive proposals; and noncompetitive proposals (single source, only when specifically justified).

## §200.328 Financial Reporting

The Federal awarding agency may only use these forms: SF-270 (Request for Advance or Reimbursement), SF-271 (Outlay Report for Construction), SF-425 (Federal Financial Report).

## §200.332 Requirements for Pass-Through Entities

Must: clearly identify every subaward; evaluate each subrecipient's risk of noncompliance; consider imposing specific subaward conditions; monitor subrecipient activities to ensure compliance.

## §200.338 Remedies for Noncompliance

Actions include: temporarily withhold cash payments; disallow costs; suspend or terminate the Federal award; initiate suspension or debarment proceedings; withhold further awards.

## §200.344 Closeout

Non-Federal entity must submit all final reports no later than 120 calendar days after the end of the period of performance. Federal awarding agency must complete closeout within one year after acceptance of final reports.`;

const CFR200_SUBPART_E = `# 2 CFR Part 200 — Subpart E: Cost Principles

## §200.403 Factors Affecting Allowability of Costs

Costs must: be necessary and reasonable; conform to limitations in the Federal award; be consistent with policies applying uniformly to Federal and non-Federal activities; be accorded consistent treatment; be determined in accordance with GAAP; not be included as a cost of any other Federal program; and be adequately documented.

## §200.404 Reasonable Costs

A cost is reasonable if it does not exceed what a prudent person would incur under similar circumstances.

## §200.405 Allocable Costs

A cost is allocable to a particular Federal award if the goods or services are chargeable in accordance with relative benefits received. Costs may not be shifted between Federal awards to overcome fund deficiencies or avoid restrictions.

## §200.413 Direct Costs

Direct costs can be identified specifically with a particular cost objective. Salaries of administrative and clerical staff should normally be treated as indirect costs unless they are integral to a specific project.

## §200.414 Indirect (F&A) Costs

The de minimis rate is 10% of modified total direct costs (MTDC) for entities that have never received a negotiated indirect cost rate. This rate may be used indefinitely.

## §200.431 Compensation — Fringe Benefits

Fringe benefits are allowable if provided under established written policies, equitably allocated, and consistently treated.

## §200.438 Entertainment Costs

Costs of entertainment, amusement, diversion, and social activities are unallowable, except where they have a programmatic purpose and are authorized.

## §200.439 Equipment and Other Capital Expenditures

Capital expenditures for general purpose equipment are unallowable as direct charges without prior written approval. Special purpose equipment over $10,000 requires prior approval.

## §200.458 Pre-Award Costs

Pre-award costs are allowable only to the extent they would have been allowable if incurred after the award date, and only with written approval.

## §200.474 Travel Costs

Travel costs must be reasonable and not exceed charges normally allowed in regular operations. Lodging, subsistence, and incidental expenses must conform to the entity's travel policies.`;

const CFR200_SUBPART_F = `# 2 CFR Part 200 — Subpart F: Audit Requirements

## §200.501 Audit Requirements

A non-Federal entity that expends $1,000,000 or more in Federal awards during its fiscal year must have a single audit. Entities expending less than $1,000,000 are exempt but must maintain records for review.

## §200.510 Financial Statements

The auditee must prepare financial statements and a schedule of expenditures of Federal awards (SEFA).

## §200.512 Report Submission

The audit must be completed and submitted within the earlier of 30 calendar days after receipt of the auditor's report, or 9 months after the end of the audit period.

## §200.514 Scope of Audit

The auditor must determine compliance with Federal statutes, regulations, and terms and conditions that may have a direct and material effect on each major program. Must gain understanding of internal controls sufficient to support a low assessed level of control risk.

## §200.516 Audit Findings

The auditor must report: significant deficiencies and material weaknesses in internal control over major programs; material noncompliance; known questioned costs greater than $25,000; known or likely fraud; and instances where prior audit findings were materially misrepresented.

## §200.521 Management Decision

The management decision must clearly state whether the audit finding is sustained, the reasons, and expected corrective action. Must be issued within 6 months of acceptance of the audit report.`;

const BUY_AMERICA_GUIDANCE = `# Build America, Buy America Act (BABA) / Buy America Requirements

## Overview
The Build America, Buy America Act (BABA), enacted as part of the Infrastructure Investment and Jobs Act, establishes domestic content procurement preferences for all Federal financial assistance programs for infrastructure.

## Requirements
All iron and steel must be produced in the United States. All manufactured products must be manufactured in the United States with greater than 55% domestic component cost. All construction materials must be manufactured in the United States.

## Waivers
Waivers available for: public interest; nonavailability (items not produced domestically in sufficient quantities); and unreasonable cost (domestic content increases overall project cost by more than 25%).

## Documentation
Recipients must maintain: certifications from manufacturers and suppliers; mill test reports for iron and steel; component cost analyses; waiver requests and approvals; and records of domestic content verification procedures.

## MARAD-Specific Requirements
For PIDP, RRIF, and other maritime infrastructure programs: iron and steel must be produced in the U.S.; Buy America applies to all PIDP-funded construction; MARAD may grant waivers on a project-by-project basis.`;

const DAVIS_BACON_GUIDANCE = `# Davis-Bacon and Related Acts (DBRA) Requirements

## Overview
The Davis-Bacon Act requires that all laborers and mechanics on Federal or Federally-assisted construction contracts over $2,000 be paid prevailing wages and fringe benefits.

## Key Requirements
Recipients must obtain wage determinations from SAM.gov before advertising for bids. Contractors must submit weekly certified payrolls (WH-347). Workers must be classified per the wage determination. Overtime must be paid at 1.5x for hours over 40 per week.

## Compliance Documentation
Maintain: wage determinations in contracts; weekly certified payrolls; documentation of payroll reviews; worker interview records; correspondence regarding violations; and evidence of required contract clauses.`;

const FFATA_GUIDANCE = `# FFATA/FSRS Subaward Reporting Requirements

## Overview
The Federal Funding Accountability and Transparency Act requires information on Federal awards to be made available to the public via USAspending.gov.

## Subaward Reporting
Prime recipients must report subaward information through FSRS (fsrs.gov) for each subaward of $30,000 or more. Reports are due by the end of the month following the month the subaward was made.

## Required Data Elements
Subrecipient UEI number, name and address, subaward amount and date, description, place of performance, and executive compensation data if applicable.

## SAM.gov Registration
All recipients and subrecipients must maintain active SAM.gov registration throughout the period of performance. Registration must be renewed annually.`;

const SINGLE_AUDIT_GUIDANCE = `# Single Audit Requirements (2 CFR 200, Subpart F)

## Threshold
Entities expending $1,000,000 or more in Federal awards must have a single audit. Below $1,000,000 is exempt but records must be available for review.

## Major Program Determination
Type A programs exceed the larger of $750,000 or 3% of total Federal awards expended. High-risk Type A programs are identified by criteria such as prior audit findings and oversight changes.

## Audit Report Package
Must include: financial statements and SEFA; summary schedule of prior audit findings; auditor's reports on compliance and internal controls; schedule of findings and questioned costs; and corrective action plan.

## Submission
Due within 30 days of auditor's report or 9 months after audit period end. Submitted to the Federal Audit Clearinghouse (FAC).

## Management Decision
Must be issued within 6 months of audit report acceptance. Must state whether findings are sustained and describe expected corrective action.`;

// ---------------------------------------------------------------------------
// Corpus definition
// ---------------------------------------------------------------------------

const CORPUS = [
  { docType: "2cfr200", title: "2 CFR 200, Subpart A — Definitions", content: CFR200_SUBPART_A, sourceUrl: "https://www.ecfr.gov/current/title-2/subtitle-A/chapter-II/part-200/subpart-A" },
  { docType: "2cfr200", title: "2 CFR 200, Subpart D — Post-Federal Award Requirements", content: CFR200_SUBPART_D, sourceUrl: "https://www.ecfr.gov/current/title-2/subtitle-A/chapter-II/part-200/subpart-D" },
  { docType: "2cfr200", title: "2 CFR 200, Subpart E — Cost Principles", content: CFR200_SUBPART_E, sourceUrl: "https://www.ecfr.gov/current/title-2/subtitle-A/chapter-II/part-200/subpart-E" },
  { docType: "2cfr200", title: "2 CFR 200, Subpart F — Audit Requirements", content: CFR200_SUBPART_F, sourceUrl: "https://www.ecfr.gov/current/title-2/subtitle-A/chapter-II/part-200/subpart-F" },
  { docType: "agency_gtc", title: "Buy America / BABA Compliance Guide", content: BUY_AMERICA_GUIDANCE, sourceUrl: "https://www.whitehouse.gov/omb/management/made-in-america/" },
  { docType: "agency_gtc", title: "Davis-Bacon and Related Acts Requirements", content: DAVIS_BACON_GUIDANCE, sourceUrl: "https://www.dol.gov/agencies/whd/government-contracts/construction" },
  { docType: "agency_gtc", title: "FFATA/FSRS Subaward Reporting Requirements", content: FFATA_GUIDANCE, sourceUrl: "https://www.fsrs.gov/" },
  { docType: "agency_gtc", title: "Single Audit Requirements Guide", content: SINGLE_AUDIT_GUIDANCE, sourceUrl: "https://www.ecfr.gov/current/title-2/subtitle-A/chapter-II/part-200/subpart-F" },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=== Seeding Global Reference Corpus ===\n");

  // Apply porter indexes first
  console.log("Applying porter indexes...");
  try {
    const fs = await import("fs");
    const path = await import("path");
    const sql = fs.readFileSync(path.join(process.cwd(), "prisma/porter-indexes.sql"), "utf-8");
    await prisma.$executeRawUnsafe(sql);
    console.log("  Indexes applied.\n");
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log(`  Index application: ${msg}\n`);
  }

  console.log(`Documents to ingest: ${CORPUS.length}\n`);
  let totalChunks = 0;

  for (const doc of CORPUS) {
    console.log(`Ingesting: ${doc.title}...`);
    try {
      const result = await ingestDoc(doc);
      console.log(`  OK — ${result.chunksCreated} chunks`);
      totalChunks += result.chunksCreated;
    } catch (error) {
      console.error(`  FAILED:`, error instanceof Error ? error.message : error);
    }
  }

  console.log(`\n=== Done ===`);
  console.log(`Total documents: ${CORPUS.length}`);
  console.log(`Total chunks: ${totalChunks}`);
}

main()
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  })
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
    process.exit(0);
  });
