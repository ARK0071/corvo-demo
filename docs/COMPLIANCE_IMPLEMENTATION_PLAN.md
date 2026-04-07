# Compliance Module — Implementation Plan

> Last updated: 2026-04-05

## Current State

### What's Built & DB-Connected
- **Overview dashboard** (`/reporting/overview`) — KPIs, overdue/upcoming reports, 6-month timeline, awards table. Pulls from `/api/reports` and `/api/awards/stats` which route to Prisma.
- **Reporting calendar** (`/reporting/calendar`) — Multi-award deadline view. DB-connected via `/api/reports`.
- **Report CRUD API** (`/api/reports`) — Full GET/POST/PUT with conditional routing: `DemoReports` (demo tenant) or `Reports` (production Prisma). Supports stats, filtering, batch upsert.
- **AI narrative generation** (`/api/report-narrative`, `/api/report-ppr-narrative`) — Claude Sonnet generates SF-425/PPR narratives. Working.
- **Tools page** (`/reporting/tools`) — SEFA generation, closeout checklists. DB-connected for awards list.

### What's Built But NOT DB-Connected
- **SF-425 FormView** — Full federal template (Lines 1-12, indirect expenses, certification). Renders field-by-field with validation. **But pulls from mock data in `/src/data/awards.ts` and `/src/data/federal-report-templates.ts`** — never calls the API.
- **SF-270 FormView** — Full federal template (computation of amount requested, prior drawdowns, certification). **Same mock data problem.**
- **PPR FormView** — Narrative-focused with AI draft per section, milestone tracking. **Mock data.** Also not a true OMB SF-PPR template — it's a narrative collector, not a field-by-field form.
- **Forms page** (`/reporting/forms`) — Lists reports from `/api/reports` (DB-connected), but when you click into a form, the detail views use mock data for financial calculations.

### Database Models (Prisma — Already Exist)
| Model | Status |
|-------|--------|
| `Award` | Complete — FAIN, CFDA, agency, amounts, match, status |
| `ScheduledReport` | Complete — type, due date, period, status, generated content, narrative draft |
| `Expense` | Complete — category, vendor, amount, status (logged/flagged/approved/drawn), attachments |
| `DrawdownRequest` | Complete — expense IDs, amount, status (draft/submitted/approved/payment_received) |
| `BudgetCategory` | Complete — name, ceiling, spent |
| `BudgetModification` | Complete — from/to category, amount, justification, status |
| `MatchLedgerEntry` | Complete — date, amount, type (cash/in_kind/state/other), documentation |
| `CloseoutChecklist` | Complete — JSON items with completion tracking |

### Database Models — Missing
| Model | Needed For |
|-------|------------|
| `Subrecipient` | Subrecipient monitoring (Phase 3) |
| `SubrecipientReport` | Report collection tracking (Phase 3) |
| `ComplianceChecklist` | Infrastructure compliance checklists (Phase 4) |
| `ComplianceChecklistItem` | Per-item tracking with timestamps (Phase 4) |
| `AuditFinding` | Prior audit finding tracker (Phase 5) |
| `CorrectiveActionPlan` | CAP monitoring tied to findings (Phase 5) |

### Navigation — Current vs Planned
```
CURRENT:                          PLANNED:
/reporting                        /reporting
├── /overview      ✅             ├── /overview
├── /forms         (not in plan)  ├── /awards/[id]    ❌ (tabbed detail)
├── /calendar      ✅             ├── /drawdowns      ❌
├── /tools         (not in plan)  ├── /subrecipients  ❌
                                  ├── /calendar
                                  └── /audit          ❌
```

---

## Implementation Phases

### Phase 1: Connect Forms to Database
> Priority: HIGHEST — forms exist but run on mock data. This is the gap between "demo" and "production."

**1a. Wire SF-425 to real award/expense/drawdown data**
- Replace `generateSF425()` mock data source with API calls to `/api/awards/expenses` and `/api/awards/drawdowns`
- SF-425 line items should compute from real `Expense` records (by period) and `DrawdownRequest` records
- Line 10a (Cash Receipts) = sum of `DrawdownRequest` where status = `payment_received`
- Line 10b (Cash Disbursements) = sum of `Expense` where status in (`approved`, `drawn`)
- Line 10d-10h = computed from `Award.totalAmount`, cumulative expenses, obligations
- Line 10i-10k = computed from `Award.matchRequired`, `MatchLedgerEntry` sum
- Save completed form data to `ScheduledReport.generatedContent` via PUT `/api/reports`

**1b. Wire SF-270 to real drawdown data**
- Replace `generateSF270()` mock source with API calls
- Computation period expenses from `Expense` table filtered by date range
- Prior drawdown history from `DrawdownRequest` table
- Federal/non-federal share calculated from `Award.matchPercentage`
- Link SF-270 submission to `DrawdownRequest` creation (submitting an SF-270 should create a drawdown record)

**1c. Wire PPR to real data + improve template**
- Pull milestones from `BudgetCategory` spend progress (real data)
- Pull financial summary from `/api/awards/stats` per award
- AI narrative sections already work — just need real data as context input
- Consider: should PPR match the actual OMB SF-PPR field structure? Current implementation is narrative-only.

**1d. Create shared data-fetching layer for forms**
- Build `useAwardFormData(awardId, periodStart, periodEnd)` hook that fetches:
  - Award details
  - Expenses for the period
  - Cumulative expenses
  - Drawdown history
  - Match ledger entries
  - Budget categories with spend
- All form views consume this hook instead of mock data
- Eliminates duplicate fetch logic across SF-425, SF-270, PPR components

**1e. Form draft persistence**
- Currently saves to localStorage — move to `ScheduledReport.generatedContent` (JSON field already exists)
- Auto-save drafts on edit via PUT `/api/reports`
- Load saved draft when re-opening a form

### Phase 2: Reimbursement Pipeline (2 CFR 200.305)
> Depends on: Phase 1b (SF-270 connected to drawdowns)

**2a. Drawdown pipeline dashboard** (`/reporting/drawdowns`)
- Cross-award view of all `DrawdownRequest` records
- Columns: Award, Amount, Status, Submitted Date, Days Outstanding
- Filter by status: draft, submitted, approved, payment_received
- Sort by days outstanding (descending)

**2b. Expense status workflow enforcement**
- Enforce: `logged → flagged → approved → drawn`
- Expenses can only be added to a `DrawdownRequest` when status = `approved`
- When a `DrawdownRequest` reaches `payment_received`, mark all linked expenses as `drawn`
- `drawn` expenses become immutable (API rejects updates)
- Add status transition validation in `/api/awards/expenses` PUT handler

**2c. Aging reports**
- 30/60/90 day buckets for submitted drawdowns awaiting payment
- Query: `DrawdownRequest` where status = `submitted` or `approved`, grouped by age
- Display as summary cards + detail table on the drawdowns page

**2d. Cash flow snapshot**
- Pending reimbursements: sum of `DrawdownRequest` where status in (`submitted`, `approved`)
- Upcoming spend: sum of `Expense` where status = `logged` or `approved` (not yet drawn)
- Available cash: last `DrawdownRequest` with `payment_received` minus expenses since
- Display on overview dashboard + drawdowns page

### Phase 3: Subrecipient Monitoring (2 CFR 200.331-332)
> New models required. No existing code to build on.

**3a. Data models**
```prisma
model Subrecipient {
  id                    String   @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  portProfileId         String   @map("port_profile_id") @db.Uuid
  awardId               String   @map("award_id") @db.Uuid
  entityName            String   @map("entity_name") @db.VarChar(255)
  uei                   String?  @db.VarChar(20)
  classification        String   @db.VarChar(20)  // "subrecipient" | "contractor"
  classificationAnswers Json     @default("[]") @map("classification_answers")
  riskLevel             String   @default("standard") @map("risk_level") @db.VarChar(20)
  riskFactors           Json     @default("[]") @map("risk_factors")
  monitoringIntensity   String   @default("standard") @map("monitoring_intensity") @db.VarChar(20)
  subawardAmount        Decimal  @map("subaward_amount") @db.Decimal(15, 2)
  cumulativeSpend       Decimal  @default(0) @map("cumulative_spend") @db.Decimal(15, 2)
  singleAuditRequired   Boolean  @default(false) @map("single_audit_required")
  status                String   @default("active") @db.VarChar(20)
  createdAt             DateTime @default(now()) @map("created_at")
  updatedAt             DateTime @updatedAt @map("updated_at")

  award                 Award       @relation(fields: [awardId], references: [id], onDelete: Cascade)
  portProfile           PortProfile @relation(fields: [portProfileId], references: [id], onDelete: Cascade)
  reports               SubrecipientReport[]

  @@index([awardId])
  @@index([portProfileId])
}

model SubrecipientReport {
  id              String    @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  subrecipientId  String    @map("subrecipient_id") @db.Uuid
  reportType      String    @map("report_type") @db.VarChar(50)
  title           String    @db.VarChar(255)
  dueDate         DateTime  @map("due_date") @db.Date
  status          String    @default("pending") @db.VarChar(20)
  receivedDate    DateTime? @map("received_date") @db.Date
  notes           String    @default("")
  attachments     Json      @default("[]")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  subrecipient    Subrecipient @relation(fields: [subrecipientId], references: [id], onDelete: Cascade)

  @@index([subrecipientId])
  @@index([dueDate])
}
```

**3b. Classification wizard**
- 5-question decision tree per 2 CFR 200.331:
  1. Does the entity determine who is eligible to receive federal assistance?
  2. Does the entity have its performance measured against program objectives?
  3. Does the entity have responsibility for programmatic decision-making?
  4. Does the entity have responsibility for adherence to applicable federal program requirements?
  5. Does the entity use federal funds to carry out a program as compared to providing goods/services?
- Mostly "yes" → subrecipient. Mostly "no" → contractor.
- Store answers in `classificationAnswers` for audit trail
- Classification is per-award (same entity can differ across awards)

**3c. Risk assessment engine**
- Auto-score based on: new entity (yes/no), prior findings, spend volume, single audit status, monitoring history
- Map score to risk level: low / standard / elevated / high
- Risk level drives monitoring intensity:
  - Low: annual report review
  - Standard: quarterly report review
  - Elevated: quarterly + site visit
  - High: monthly + site visit + desk review

**3d. Subrecipients page** (`/reporting/subrecipients`)
- Cross-award list of all subrecipients
- Columns: Entity, Award, Classification, Risk Level, Cumulative Spend, Reports Status
- Alert badge when cumulative spend approaching $1M (Single Audit threshold per 2 CFR 200.501)
- Click into subrecipient detail: report collection tracker, spend history, risk assessment

**3e. Report collection tracker**
- Per-subrecipient list of required reports with due dates
- Status tracking: pending → received / overdue
- Overdue alerts surface on overview dashboard
- Upload capability for received reports (stored as attachments)

### Phase 4: Infrastructure Compliance Checklists
> One checklist engine, four regulation templates. Auto-attached to awards based on grant type.

**4a. Data models**
```prisma
model ComplianceChecklist {
  id             String   @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  awardId        String   @map("award_id") @db.Uuid
  template       String   @db.VarChar(50)  // "buy_america", "davis_bacon", "nepa", "title_vi_dbe"
  title          String   @db.VarChar(255)
  status         String   @default("in_progress") @db.VarChar(20)
  completedItems Int      @default(0) @map("completed_items")
  totalItems     Int      @map("total_items")
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  award          Award    @relation(fields: [awardId], references: [id], onDelete: Cascade)
  items          ComplianceChecklistItem[]

  @@unique([awardId, template])
  @@index([awardId])
}

model ComplianceChecklistItem {
  id            String    @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  checklistId   String    @map("checklist_id") @db.Uuid
  section       String    @db.VarChar(100)
  requirement   String
  cfrReference  String?   @map("cfr_reference") @db.VarChar(50)
  isCompleted   Boolean   @default(false) @map("is_completed")
  completedAt   DateTime? @map("completed_at")
  completedBy   String?   @map("completed_by") @db.VarChar(255)
  notes         String    @default("")
  attachments   Json      @default("[]")
  sortOrder     Int       @default(0) @map("sort_order")
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  checklist     ComplianceChecklist @relation(fields: [checklistId], references: [id], onDelete: Cascade)

  @@index([checklistId])
}
```

**4b. Checklist engine**
- Render any checklist template with: section grouping, item checkoff, document upload, notes, timestamps
- Single reusable component — template data defines the items, engine renders them
- All interactions logged to audit trail (who checked what, when, with what evidence)

**4c. Buy America / BABA template** (41 USC 8301-8305, 2 CFR 184)
- Per-procurement domestic content tracking
- Vendor certification collection (manufacturer + country of origin)
- Waiver workflow: request → review → approved/denied (with justification)
- **Drawdown blocking**: expenses linked to non-compliant procurements cannot be included in `DrawdownRequest`

**4d. Davis-Bacon template** (40 USC 3141-3148)
- Prevailing wage determination tracking (per project/location)
- Certified payroll collection schedule
- Rate verification: compare submitted rates against DOL wage determination
- Alert when payroll not received on schedule

**4e. NEPA template** (42 USC 4321 et seq.)
- Environmental review milestone tracker (categorical exclusion, EA, EIS)
- Permit tracking with expiration dates
- Delay alerts when milestones slip past expected dates
- Link to award timeline impact

**4f. Title VI / DBE template** (49 CFR Part 26)
- Civil rights documentation checklist
- DBE participation goal tracking (goal % vs actual %)
- Good faith effort documentation
- Semi-annual reporting data collection

**4g. Auto-attach checklists to awards**
- When an award is created or updated, determine applicable checklists based on:
  - Awarding agency (FTA/FHWA → Davis-Bacon, Buy America; FAA → Buy America, DBE; EPA → NEPA)
  - Grant type / CFDA number
  - Award amount thresholds
- Create `ComplianceChecklist` + items automatically
- Surface on award detail page compliance tab

### Phase 5: Audit Readiness
> Derives from existing data. Last phase because it needs the prior phases' data to be meaningful.

**5a. Data models**
```prisma
model AuditFinding {
  id                String   @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  portProfileId     String   @map("port_profile_id") @db.Uuid
  awardId           String?  @map("award_id") @db.Uuid
  auditYear         Int      @map("audit_year")
  findingNumber     String   @map("finding_number") @db.VarChar(50)
  title             String   @db.VarChar(255)
  description       String
  complianceArea    String   @map("compliance_area") @db.VarChar(100)
  severity          String   @db.VarChar(20)  // material_weakness, significant_deficiency, finding
  status            String   @default("open") @db.VarChar(20)
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")

  portProfile       PortProfile @relation(fields: [portProfileId], references: [id], onDelete: Cascade)
  award             Award?      @relation(fields: [awardId], references: [id])
  correctiveActions CorrectiveActionPlan[]

  @@index([portProfileId])
  @@index([awardId])
  @@index([status])
}

model CorrectiveActionPlan {
  id          String    @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  findingId   String    @map("finding_id") @db.Uuid
  action      String
  responsible String    @db.VarChar(255)
  targetDate  DateTime  @map("target_date") @db.Date
  status      String    @default("pending") @db.VarChar(20)
  evidence    Json      @default("[]")
  completedAt DateTime? @map("completed_at")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  finding     AuditFinding @relation(fields: [findingId], references: [id], onDelete: Cascade)

  @@index([findingId])
  @@index([status])
}
```

**5b. Compliance scorecard** (`/reporting/audit`)
- 12 Single Audit compliance areas (per 2 CFR 200.516):
  1. Activities Allowed/Unallowed
  2. Allowable Costs/Cost Principles
  3. Cash Management
  4. Eligibility
  5. Equipment/Real Property Management
  6. Matching/Level of Effort
  7. Period of Performance
  8. Procurement/Suspension/Debarment
  9. Program Income
  10. Reporting
  11. Subrecipient Monitoring
  12. Special Tests and Provisions
- Each area scored red/yellow/green derived from existing data:
  - Red: known non-compliance or open material weakness
  - Yellow: incomplete documentation, approaching thresholds, overdue items
  - Green: fully documented, no open issues
- Roll up across all awards for an org-level view

**5c. Prior audit finding tracker**
- CRUD for `AuditFinding` records
- Link to corrective action plans with milestones
- Status tracking: open → in_progress → resolved (or repeat)
- Surface repeat findings prominently
- Overdue corrective actions alert on overview dashboard

**5d. One-click audit package generator**
- ZIP export containing:
  - All submitted federal reports (SF-425, SF-270, PPR) as PDF
  - SEFA
  - Expense ledger by award (CSV)
  - Drawdown history (CSV)
  - Match documentation summary
  - Subrecipient monitoring records
  - Compliance checklist status per award
  - Prior findings + corrective action status
- Use server-side ZIP generation via API route
- Button on `/reporting/audit` page

**5e. Porter AI compliance queries**
- Chat interface on audit page using existing Claude integration
- Context-aware: pass award data, expense summaries, compliance status as system context
- Example queries:
  - "Are we at risk on any compliance areas for [award]?"
  - "What documentation are we missing for Buy America on [procurement]?"
  - "Summarize our drawdown status across all awards"
- Uses existing `/api/report-narrative` pattern but with compliance-specific prompts

### Phase 6: Navigation Restructure & Award Detail Page
> Can be done incrementally alongside other phases.

**6a. Award detail page** (`/reporting/awards/[id]`)
- Tabbed layout:
  - **Budget** — categories, spend tracking, modifications (exists as data, needs UI)
  - **Procurement** — expense list with compliance flags (exists as data, needs UI)
  - **Reports** — SF-425/SF-270/PPR for this award (filter existing forms page by award)
  - **Drawdowns** — drawdown history for this award (filter from pipeline)
  - **Subrecipients** — subs on this award (Phase 3)
  - **Compliance** — checklists attached to this award (Phase 4)
  - **Audit** — award-level scorecard, findings (Phase 5)

**6b. Update sidebar navigation**
- Replace: `Overview | Forms | Calendar | Tools`
- With: `Overview | Awards | Drawdowns | Subrecipients | Calendar | Audit`
- Forms functionality moves into award detail Reports tab
- Tools functionality (SEFA, closeout) moves into Audit page
- Keep `/reporting/forms` as a redirect or cross-award form list

---

## Recommended Build Order

| Order | Phase | Effort | Why This Order |
|-------|-------|--------|----------------|
| **1** | 1a-1e: Connect forms to DB | Medium | Highest impact — turns demo into production. Everything else builds on real data. |
| **2** | 6a: Award detail page (Budget + Procurement + Reports tabs) | Medium | Creates the per-award home. Forms move here. Foundation for later tabs. |
| **3** | 2a-2d: Reimbursement pipeline | Medium | Natural extension of connected SF-270. Drawdowns page + aging + cash flow. |
| **4** | 6b: Navigation restructure | Small | Now that drawdowns page exists, update the nav. |
| **5** | 3a-3e: Subrecipient monitoring | Large | New models, new UI, new logic. No dependencies on other unbuilt phases. |
| **6** | 4a-4g: Infrastructure compliance checklists | Large | New models, four templates. Buy America drawdown-blocking depends on Phase 2. |
| **7** | 5a-5e: Audit readiness | Large | Needs data from all prior phases to produce meaningful scores. Build last. |
