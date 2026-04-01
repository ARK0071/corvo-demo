# Corvo Compliance Module — Implementation Plan

**Last Updated:** 2026-03-30
**Status:** Phase 2.1 complete, shipped to `main` (`b1f8320`)

---

## What's Done

### Phase 1: Foundation (Complete — pre-existing)
- Grant-level expenditure tracking with budget vs actuals
- Procurement compliance engine (threshold validation, documentation checklists)
- Immutable audit log, document attachments, gap detection
- 2 CFR 200 unallowable cost detection (8 rules)

### Phase 2.1: Federal Reporting Templates (Complete)
- SF-425 auto-population from expense/drawdown data (18 line items, validation)
- SF-270 reimbursement request generation
- SF-PPR performance progress reports with AI-drafted narrative sections
- Agency-specific templates (MARAD, FRA, EPA, FTA, FAA, FHWA, TxDOT)
- Reporting calendar with multi-award deadline view
- All in-memory. No database persistence.

---

## What's Next

### Database Migration (Prerequisite for everything below)

**Why:** All award, expense, drawdown, and report data is currently hardcoded arrays in TypeScript files. User edits (form drafts, report status changes, closeout checklist progress) are lost on page refresh. Nothing is production-viable until this moves to Postgres.

**Scope:**

New Prisma models needed:

```
Award
  - id, fain, cfda, awardingAgency, program, title, description
  - totalAmount, status, performancePeriod (start/end)
  - matchPercentage, matchTypes
  - Relations: budgetCategories[], expenses[], drawdowns[], matchLedger[], budgetModifications[], scheduledReports[]

BudgetCategory
  - id, awardId, name, ceiling
  - spent is COMPUTED (sum of expenses), not stored

Expense
  - id, awardId, categoryId, date, description, vendor, amount
  - status (logged/flagged/approved/drawn)
  - attachments (string[]), flagReason, overrideJustification
  - createdAt

DrawdownRequest
  - id, awardId, totalAmount, status (draft/submitted/approved/payment_received)
  - submittedDate, approvedDate, paymentDate, notes, createdAt
  - Relations: expenses[] (M2M)

MatchLedgerEntry
  - id, awardId, date, description, amount, type (cash/in_kind/state/other)
  - documentation

BudgetModification
  - id, awardId, fromCategoryId, toCategoryId, amount
  - justification, status (requested/approved/denied)
  - requestedDate, approvedDate

ScheduledReport
  - id, awardId, type (sf425/progress/closeout/custom)
  - title, dueDate, periodStart, periodEnd
  - status (upcoming/in_progress/draft_ready/submitted/overdue)
  - submittedDate, notes

CloseoutChecklist
  - id, awardId

CloseoutItem
  - id, checklistId, label, description, required
  - completed, completedDate

ReportDraft
  - id, reportId, formType (sf425/sf270/ppr)
  - data (JSONB — stores SF425FormData / SF270FormData / PPRFormData)
  - updatedAt

OrgSettings
  - id, name, address, uei, ein, congressionalDistrict
  - contactName, contactTitle, contactPhone, contactEmail
```

**Migration steps:**
1. Add models to `prisma/schema.prisma`
2. Run `prisma migrate dev`
3. Create seed script from existing TypeScript arrays in `awards.ts` (6 awards, 26 expenses, 6 drawdowns, 11 match entries, 1 budget mod)
4. Create a repository layer (`src/lib/db/repositories/awards.ts`, `reports.ts`) with the same function signatures as current in-memory functions
5. Swap imports in `reporting.ts` and `federal-report-templates.ts` to use repository functions
6. Move `RECIPIENT_INFO` constant to `OrgSettings` table (seeded from current hardcoded values)

**What stays in code (not database):**
- Unallowable cost rules (2 CFR 200 regulatory logic, not user data)
- Agency templates (federal agency configs, changes only when regs change)
- SF-425/SF-270 line item computation logic (always derived, never stored)
- Form validation rules (arithmetic checks)

**Estimated effort:** This is the single largest remaining task. Every subsequent feature builds on it.

---

### Phase 2.2: Reimbursement Pipeline Tracker

**Why:** PIDP grants are reimbursable — Port Freeport spends first, then requests payment. Without pipeline visibility, finance teams lose track of what's been submitted, what's approved, and what's still outstanding. Cash flow becomes unpredictable.

**Compliance reference:** 2 CFR 200.305 (Payment), 2 CFR 200.302 (Financial management)

**Features:**

1. **Invoice-to-Reimbursement Workflow**
   - Visual pipeline: Incurred → Documented → Submitted → Approved → Payment Received
   - Drag expenses into drawdown groups
   - Batch submission with SF-270 auto-generation
   - Status transitions with date stamps and audit trail

2. **Drawdown Status Tracking**
   - Table/kanban view of all drawdown requests across awards
   - Filter by award, status, date range
   - Link to SF-270 form for each drawdown
   - Track federal payment lag (days between submission and receipt)

3. **Aging Reports**
   - Days-since-submission for each outstanding drawdown
   - Flag requests >30 days without response
   - Aging buckets: 0-30, 31-60, 61-90, 90+ days
   - Alert when cumulative outstanding exceeds threshold

4. **Cash Flow Projection**
   - Upcoming expenditure forecast (from budget categories and burn rate)
   - Pending reimbursements timeline
   - Net cash position projection (30/60/90 day view)
   - Flag periods where outflows exceed expected inflows

**Data dependencies:** Requires database migration (DrawdownRequest with payment tracking, Expense status workflow)

**UI location:** New tab in `/reporting` or dedicated `/reimbursements` page. TBD based on UX complexity.

---

### Phase 2.3: Subrecipient Monitoring

**Why:** When Port Freeport passes federal funds to subrecipients, it becomes a pass-through entity with monitoring obligations under 2 CFR 200.332. Failure to monitor subrecipients is one of the top Single Audit findings.

**Compliance reference:** 2 CFR 200.331 (Subrecipient vs contractor determination), 2 CFR 200.332 (Requirements for pass-through entities)

**Features:**

1. **Subrecipient vs Contractor Classification**
   - Decision tree tool based on 2 CFR 200.331 criteria
   - Guided questionnaire (determines own eligibility? has programmatic decision-making authority? performance measured against program objectives?)
   - Classification stored per vendor per award
   - Reclassification audit trail

2. **Risk Assessment Framework**
   - Scoring on: financial stability, audit history (prior findings), federal award experience, past performance with entity
   - Risk tiers: Low / Medium / High
   - Monitoring plan auto-generated based on risk tier (low = annual desk review, high = quarterly site visits)
   - Re-assessment triggers (new audit findings, late reporting, budget overruns)

3. **Subaward Agreement Templates**
   - Generate subaward agreements with required pass-through terms from 2 CFR 200.332
   - Include: CFDA number, award name, federal agency, subaward period, budget, indirect cost rate
   - Attach applicable compliance requirements (Buy America, Davis-Bacon, etc. based on parent award)

4. **Subrecipient Reporting Collection**
   - Track which sub-reports are due and which have been received
   - Upload and store subrecipient SF-425s and progress reports
   - Flag late or missing reports
   - Roll up subrecipient expenditures into parent award reporting

5. **Single Audit Threshold Alerts**
   - Track cumulative federal expenditures per subrecipient
   - Alert at $750K (Single Audit threshold per 2 CFR 200 Subpart F)
   - Alert at $1M (major program threshold)
   - Require audit report collection when thresholds met

**New data models:**
```
Subrecipient
  - id, vendorId, awardId, classification (subrecipient/contractor)
  - classificationDate, classificationJustification
  - riskTier, riskAssessmentDate, riskFactors (JSONB)

SubawardAgreement
  - id, subrecipientId, awardId
  - subawardAmount, periodStart, periodEnd
  - complianceTerms (JSONB), status

SubrecipientReport
  - id, subrecipientId, awardId, reportType, periodEnd
  - status (pending/received/reviewed), receivedDate
  - documentUrl
```

---

### Phase 3: Vertical-Specific Compliance (PIDP/MARAD Differentiation)

**Why:** No horizontal grant management tool builds PIDP/MARAD-specific compliance. This is where Corvo becomes irreplaceable for port authorities.

#### 3.1 Buy America / BABA Compliance
- Material origin tracking per procurement
- Buy America waiver request workflow (with template generation)
- Domestic content certification collection from vendors
- Flag non-compliant purchases before they hit the ledger
- **Compliance:** 41 USC 8301-8305, P.L. 117-58 Sec. 70914

#### 3.2 Davis-Bacon Act Compliance
- Prevailing wage rate lookup by project location (DOL API integration)
- Certified payroll tracking for construction contracts
- Contractor wage verification against DOL wage determinations
- **Compliance:** 40 USC 3141-3148

#### 3.3 NEPA & Environmental Milestones
- NEPA status tracker per project (Categorical Exclusion / EA / EIS)
- Environmental review milestone timeline with dependency mapping
- Permit and approval tracking (Corps of Engineers, state agencies)
- Alert system for NEPA delays that impact grant timelines
- **Compliance:** 42 USC 4321 et seq.

#### 3.4 Civil Rights & Title VI Compliance
- Title VI program checklist and documentation tracker
- ADA compliance verification for infrastructure projects
- DBE goal tracking and reporting per 49 CFR Part 26
- EEO compliance documentation
- **Compliance:** 42 USC 2000d

**Note:** Phase 3 features are mostly documentation tracking and workflow — lighter on computation, heavier on checklists and status tracking. Can be built incrementally per sub-phase.

---

### Phase 4: Audit Readiness & Intelligence (Premium Tier)

**Why:** Once a port runs compliance through Corvo, audit readiness becomes the expansion play — especially for entities with $50M+ in federal awards.

#### 4.1 Single Audit Readiness Dashboard
- SEFA auto-generation (already built in Phase 2.1)
- Compliance area self-assessment scorecards mapped to Compliance Supplement
- Internal control checklist aligned to Green Book / COSO frameworks
- Prior audit finding tracker with corrective action plan (CAP) monitoring
- Mock audit simulation — flag likely findings before the real audit
- **Compliance:** 2 CFR 200 Subpart F

#### 4.2 Grant Compliance Matrix
- Per-award compliance requirement aggregation (pull terms from award docs)
- Cross-award compliance calendar (all deadlines, all awards, one view)
- Risk heat map — which awards have the highest compliance exposure
- Automated alerts for approaching deadlines, expiring periods, unmet conditions

#### 4.3 Compliance Analytics (Porter AI Layer)
- Natural language Q&A against award terms ("Can I charge X to this grant?")
- Allowability assessment for proposed expenditures against Subpart E cost principles
- Pattern detection on procurement anomalies and documentation gaps
- Audit finding prediction based on current compliance posture

**Note:** Phase 4.3 leverages the existing Claude integration and tool infrastructure. The AI layer already has 20+ procurement tools — compliance analytics extends this with award-specific context.

---

## Recommended Build Sequence

```
Database Migration          ← do this first, everything depends on it
  │
  ├── Phase 2.2 (Reimbursement Pipeline)
  │     └── builds on DrawdownRequest + Expense models
  │
  ├── Phase 2.3 (Subrecipient Monitoring)
  │     └── new models, can parallel with 2.2
  │
  ├── Phase 3.1 (Buy America/BABA)
  │     └── extends procurement/expense tracking
  │
  ├── Phase 3.2 (Davis-Bacon)
  │     └── new DOL API integration
  │
  ├── Phase 3.3 (NEPA)
  │     └── independent milestone tracker
  │
  ├── Phase 3.4 (Title VI/DBE)
  │     └── independent checklist tracker
  │
  └── Phase 4 (Audit Readiness + AI)
        └── builds on everything above
```

Phases 3.1-3.4 are independent of each other and can be built in any order based on customer demand. Phase 4 should come last as it aggregates data from all prior phases.

---

## Key Regulatory References

| Regulation | Scope | Phases |
|-----------|-------|--------|
| 2 CFR 200 Subpart D | Post-award requirements | 2.1, 2.2, 2.3 |
| 2 CFR 200 Subpart E | Cost principles | 1 (done), 4.3 |
| 2 CFR 200 Subpart F | Audit requirements | 4.1 |
| 2 CFR 200.305 | Payment | 2.2 |
| 2 CFR 200.318-327 | Procurement standards | 1 (done) |
| 2 CFR 200.331-332 | Subrecipient monitoring | 2.3 |
| 41 USC 8301-8305 | Buy American Act | 3.1 |
| P.L. 117-58 Sec. 70914 | BABA | 3.1 |
| 40 USC 3141-3148 | Davis-Bacon Act | 3.2 |
| 42 USC 4321 et seq. | NEPA | 3.3 |
| 42 USC 2000d | Title VI | 3.4 |
| 49 CFR Part 26 | DBE Program | 3.4 |
