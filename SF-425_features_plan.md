# Reporting Sprint Plan — Thursday Demo (2026-04-30)

**Audience:** ODGS LLC — veteran federal grant management consultancy.
They will scrutinize every claim against 2 CFR 200 and SF-form rules.
Ship features that survive a senior grant officer's scrutiny.

**Window:** Mon 2026-04-27 → Wed 2026-04-29 (3 working days). Thu morning is pre-flight only.

**Objective:** Move the reporting module from "AI-drafted form populator" to
"auditable, certifying, reconciling system of record." Land the features that
answer the three questions every grant manager will actually ask:

1. *"Who certified this report and against what data?"*
2. *"Show me the audit trail."*
3. *"Hand me a real SF-425 PDF I could file with the agency."*

---

## Scope (Tier 1 A–G, auth deferred)

| ID | Feature | Demo-criticality |
|----|---------|------------------|
| A | Certifying-official workflow + cryptographic snapshot | **must** |
| B | Maker-checker (drafter ≠ reviewer ≠ certifier) | should |
| C | Indirect cost (SF-425 Line 11) | **must** |
| D | Match / cost share on the form (Lines 10i/j/k) | should |
| E | Period-end snapshot lock | should |
| F | Per-report audit log | **must** |
| G | Faithful SF-425 PDF output | **must** |

Real auth is **out of scope**. We will introduce a `User` table (the data
model is what auditors care about) and a server-trusted "Acting as" picker
that writes `x-corvo-user-id` alongside the existing `x-corvo-port-id`
header. NextAuth/Clerk replaces the picker drop-in later — the schema
and audit-log integration do not change.

---

## Architecture decisions (non-negotiable)

These choices remove the temptation toward over-engineering. Stick to them.

### D1. One `User` table now, no real auth yet
Foundation for A, B, F. Three seeded users per port (drafter, reviewer,
certifying official). Picker UI in [src/components/app-layout.tsx](../src/components/app-layout.tsx)
sets `x-corvo-user-id`. Server-side `getCurrentUser()` parallels the existing
`getTenantConfig()` pattern in [src/lib/db/tenant-config.ts](../src/lib/db/tenant-config.ts).

### D2. One `AuditLog` table, not many
Resist the urge to make `ReportAuditLog`, `ExpenseAuditLog`, `AIActionLog`
separately. One generic table, indexed on `reportId`/`awardId`/`userId`/`action`.
AI actions are audit entries with `userId = null` and a `metadata` JSON.

### D3. State machine in code, not in a library
No xstate. A single helper:

```ts
// src/lib/reports/state-transitions.ts
export const REPORT_TRANSITIONS = {
  drafting:           ["pending_review"],
  pending_review:     ["drafting", "ready_to_certify"],
  ready_to_certify:   ["drafting", "certified"],
  certified:          ["filed"],
  filed:              [],
} as const;

export function assertTransition(from: ReportStatus, to: ReportStatus) {
  if (!REPORT_TRANSITIONS[from]?.includes(to)) {
    throw new Error(`Illegal report transition: ${from} → ${to}`);
  }
}
```

Every status-changing route calls this. No middleware, no decorators, no class hierarchy.

### D4. Snapshot lock = freeze JSON, don't fork tables
On certify, write the computed `ReportContent` into the existing
`ScheduledReport.generatedContent` JSON column. After certify, the form reads
from `generatedContent`, not the live ledger. No `CertifiedReport` shadow
table. No event sourcing. No version graph (that's a Tier 3 problem).

### D5. PDF approach: pdf-lib + official OMB AcroForm templates
Not Puppeteer + HTML. Download the real OMB form PDFs (SF-425 = OMB 4040-0014,
SF-270 = OMB 4040-0012, SF-PPR = OMB 0970-0428) into `public/forms/`. Use
`pdf-lib` to fill named AcroForm fields. Output is byte-identical to a
hand-filled OMB form. **This is the single demo-winning feature.**

### D6. No new dependencies beyond `pdf-lib`
You already have prisma, zod, ai-sdk, next, lucide. Resist `winston`,
`xstate`, `lodash`, `react-hook-form`, `zustand`, `react-query`. Native
`fetch`, native `useState`, raw zod.

### D7. Don't change file structure
Use [src/lib/db/repositories/demo-reports.ts](../src/lib/db/repositories/demo-reports.ts)
and [src/lib/db/repositories/reports.ts](../src/lib/db/repositories/reports.ts) —
same dual-write pattern (demo + prod schemas) you already maintain. New files
only when there's no obvious home.

---

## Schema migration (Day 1 morning, do once, do not parallelize)

Single migration. After this lands, every other task can run in parallel.

```prisma
// === New: User table ===
model User {
  id        String   @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  portId    String   @map("port_id") @db.VarChar(100)
  email     String   @unique
  name      String
  title     String                                        // "CFO", "Grants Director"
  phone     String?
  role      String   @default("drafter")                  // drafter | reviewer | certifying_official | admin
  active    Boolean  @default(true)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  @@index([portId])
  @@map("users")
}

// === New: ReportCertification ===
model ReportCertification {
  id              String   @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  portId          String   @map("port_id") @db.VarChar(100)
  reportId        String   @map("report_id") @db.Uuid
  certifierUserId String?  @map("certifier_user_id") @db.Uuid
  certifierName   String   @map("certifier_name")
  certifierTitle  String   @map("certifier_title")
  certifierEmail  String   @map("certifier_email")
  certifierPhone  String?  @map("certifier_phone")
  contentHash     String   @map("content_hash") @db.VarChar(64)   // sha256 hex
  attestationText String   @map("attestation_text")               // exact words user clicked
  certifiedAt     DateTime @default(now()) @map("certified_at")
  ipAddress       String?  @map("ip_address") @db.VarChar(45)
  @@index([portId])
  @@index([reportId])
  @@map("report_certifications")
}

// === New: AuditLog ===
model AuditLog {
  id           String   @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  portId       String   @map("port_id") @db.VarChar(100)
  userId       String?  @map("user_id") @db.Uuid
  reportId     String?  @map("report_id") @db.Uuid
  awardId      String?  @map("award_id") @db.Uuid
  action       String   @db.VarChar(100)
  fieldChanged String?  @map("field_changed") @db.VarChar(100)
  oldValue     Json?    @map("old_value")
  newValue     Json?    @map("new_value")
  ipAddress    String?  @map("ip_address") @db.VarChar(45)
  userAgent    String?  @map("user_agent")
  metadata     Json?
  createdAt    DateTime @default(now()) @map("created_at")
  @@index([portId])
  @@index([reportId])
  @@index([awardId])
  @@index([userId])
  @@index([action])
  @@index([createdAt])
  @@map("audit_log")
}

// === Modify: DemoAward + Award ===
//   add indirect-cost columns
indirectCostRate         Decimal? @map("indirect_cost_rate") @db.Decimal(7,4)   // percent: 42.5000
indirectCostBase         String?  @map("indirect_cost_base") @db.VarChar(20)    // MTDC | TDC | S&W
indirectCostType         String?  @map("indirect_cost_type") @db.VarChar(20)    // provisional | predetermined | fixed | final
indirectCostPeriodStart  DateTime? @map("indirect_cost_period_start") @db.Date
indirectCostPeriodEnd    DateTime? @map("indirect_cost_period_end") @db.Date
nicraDocumentUrl         String?  @map("nicra_document_url")

// === Modify: DemoScheduledReport + ScheduledReport ===
//   add maker-checker + certification linkage
drafterUserId    String?   @map("drafter_user_id") @db.Uuid
reviewerUserId   String?   @map("reviewer_user_id") @db.Uuid
reviewedAt       DateTime? @map("reviewed_at")
reviewNotes      String?   @map("review_notes")
certificationId  String?   @map("certification_id") @db.Uuid
contentLockedAt  DateTime? @map("content_locked_at")
```

After applying:

```bash
npx prisma generate
```

Then seed 3 users per port: `src/scripts/seed-users.ts` (new file). Pattern:

```ts
const users = [
  { portId, email: 'drafter@freeport.demo',  name: 'Alex Drafter',     title: 'Grants Accountant',   role: 'drafter' },
  { portId, email: 'reviewer@freeport.demo', name: 'Pat Reviewer',     title: 'Grants Director',     role: 'reviewer' },
  { portId, email: 'cfo@freeport.demo',      name: 'Jamie Certifier',  title: 'Chief Financial Officer', role: 'certifying_official' },
];
```

---

## Per-feature checklist

### A. Certifying-official workflow + cryptographic snapshot

**Defensibility:** the hash is a verifiable receipt. Anyone can recompute
canonical JSON of the snapshot and confirm. The attestation text matches
SF-425 box 13d verbatim — that's the legal weight.

#### Schema
Already in the migration above (User, ReportCertification, certificationId).

#### API
- [ ] **New:** `POST /api/reports/[id]/certify` — [src/app/api/reports/[id]/certify/route.ts](../src/app/api/reports/[id]/certify/route.ts)
  - Validate caller `role === 'certifying_official'`
  - Validate `report.status === 'ready_to_certify'`
  - Recompute `generateReportContent(reportId)` — fresh snapshot
  - Compute `contentHash = sha256(canonicalJSONStringify(content))` (use Node `crypto.createHash`)
  - Persist content into `report.generatedContent`, write `ReportCertification`, transition `report.status → 'certified'`, set `contentLockedAt = now()`
  - Audit log entry: `report.certified` with `metadata: { contentHash }`
  - Return certification record + hash

#### Helpers
- [ ] **New:** [src/lib/reports/canonical-json.ts](../src/lib/reports/canonical-json.ts) — stable JSON stringifier (keys sorted recursively, no whitespace). ~20 lines.

#### UI
Update [SF425FormView.tsx](../src/app/reporting/components/SF425FormView.tsx),
[SF270FormView.tsx](../src/app/reporting/components/SF270FormView.tsx),
[PPRFormView.tsx](../src/app/reporting/components/PPRFormView.tsx):

- [ ] If `status === 'ready_to_certify'` AND `currentUser.role === 'certifying_official'`, show "Certify & Sign" button
- [ ] Modal with **exact attestation text** (do not paraphrase):

  > By signing this report, I certify to the best of my knowledge and belief
  > that the report is true, complete, and accurate, and the expenditures,
  > disbursements and cash receipts are for the purposes and intent set forth
  > in the award documents. I am aware that any false, fictitious, or
  > fraudulent information may subject me to criminal, civil, or
  > administrative penalties. (U.S. Code, Title 18, Section 1001 and Title 31,
  > Sections 3729-3730 and 3801-3812.)

- [ ] Auto-populate name/title/email/phone from `currentUser`, editable
- [ ] On certify, show badge: *"Certified by Jamie Certifier, CFO, on 2026-04-30 14:23 UTC · Hash 4f3a7c9e…"*

---

### B. Maker-checker workflow

**Defensibility:** every state transition writes who and when. UI prevents
skipping a step. Server-side guard prevents one user wearing two hats.

#### Schema
Covered by migration (drafterUserId, reviewerUserId, reviewedAt, reviewNotes).

#### API (all new routes)
- [ ] `POST /api/reports/[id]/submit-for-review` — role `drafter`, transition `drafting → pending_review`, set `drafterUserId = currentUser.id`
- [ ] `POST /api/reports/[id]/approve-review` — role `reviewer`, transition `pending_review → ready_to_certify`, set `reviewerUserId`, `reviewedAt`
- [ ] `POST /api/reports/[id]/request-changes` — role `reviewer`, transition `pending_review → drafting`, store `reviewNotes`

**Server-side guard in each route:**
```ts
if (drafterUserId === reviewerUserId || drafterUserId === certifierUserId || reviewerUserId === certifierUserId) {
  return error(403, "Same user cannot perform multiple roles on this report");
}
```

#### UI
Action button visibility table:

| Status              | Drafter            | Reviewer                     | CO                |
|---------------------|--------------------|------------------------------|--------------------|
| drafting            | Submit for Review  | —                            | —                  |
| pending_review      | —                  | Approve · Request Changes    | —                  |
| ready_to_certify    | —                  | —                            | Certify & Sign     |
| certified           | —                  | —                            | Mark Filed         |

- [ ] Status badge color-coded per stage
- [ ] If `reviewNotes` is set, render inline as a callout

---

### C. Indirect cost (SF-425 Line 11)

**Defensibility:** SF-425 Line 11 requires rate, base, period, federal share.
The single most-asked SF-425 question in real grant management. Filling it
correctly puts Corvo ahead of half the products in market.

#### Schema
Covered by migration (5 indirectCost* fields + nicraDocumentUrl on Award/DemoAward).

#### Helpers
- [ ] **New:** [src/lib/reports/indirect-cost.ts](../src/lib/reports/indirect-cost.ts)

```ts
export interface IndirectCostLine {
  base:           number;
  rate:           number;        // 0.4250 for 42.5%
  federalShare:   number;        // base × rate
  type:           string;
  periodStart:    string;
  periodEnd:      string;
}

export function computeIndirectCost(
  award: Award,
  expenses: Expense[],
  periodStart: string,
  periodEnd: string,
): IndirectCostLine | null {
  if (!award.indirectCostRate || !award.indirectCostBase) return null;
  const rate = Number(award.indirectCostRate) / 100;

  const inWindow = expenses.filter(e =>
    e.date >= periodStart && e.date <= periodEnd && e.status !== 'flagged'
  );

  let base: number;
  switch (award.indirectCostBase) {
    case 'MTDC':
      base = inWindow
        .filter(e => !isExcludedFromMTDC(e))
        .reduce((s, e) => s + Number(e.amount), 0);
      break;
    case 'S&W':
      base = inWindow
        .filter(e => isSalariesAndWages(e))
        .reduce((s, e) => s + Number(e.amount), 0);
      break;
    case 'TDC':
    default:
      base = inWindow.reduce((s, e) => s + Number(e.amount), 0);
  }

  return {
    base,
    rate,
    federalShare: base * rate,
    type:        award.indirectCostType ?? 'provisional',
    periodStart: award.indirectCostPeriodStart?.toISOString().slice(0,10) ?? '',
    periodEnd:   award.indirectCostPeriodEnd?.toISOString().slice(0,10) ?? '',
  };
}
```

`isExcludedFromMTDC` and `isSalariesAndWages` use the budget category type
(equipment, capital, participant support are excluded from MTDC per 2 CFR
200.1).

#### UI
- [ ] [SF425FormView.tsx](../src/app/reporting/components/SF425FormView.tsx) Line 11 fields auto-populated
- [ ] "View NICRA →" link if `nicraDocumentUrl` is set
- [ ] Override slot per line item with required justification text

---

### D. Match / cost share on the form (Lines 10i/10j/10k)

**Defensibility:** match shortfall is the #2 finding in federal audits.
Surfacing it on the form prevents the "we didn't realize we were short"
excuse — and reads directly from the existing MatchLedgerEntry table.

#### Schema
No changes — `MatchLedgerEntry` already exists.

#### Helpers
- [ ] **New:** [src/lib/reports/match-summary.ts](../src/lib/reports/match-summary.ts)

```ts
export interface MatchOnReport {
  requiredCumulative:    number;
  committedCumulative:   number;
  incurredThisPeriod:    number;
  remainingToProvide:    number;
  expectedAtThisPoint:   number;          // pro-rata based on award period elapsed
  status: 'on_track' | 'at_risk' | 'shortfall';
}

export function computeMatchForPeriod(
  award:          Award,
  ledgerEntries:  MatchLedgerEntry[],
  periodStart:    string,
  periodEnd:      string,
  asOf:           string = new Date().toISOString().slice(0,10),
): MatchOnReport { /* ... */ }
```

- [ ] Wire into [src/app/reporting/hooks/useAwardFormData.ts](../src/app/reporting/hooks/useAwardFormData.ts) — add `match` field to returned shape

#### UI
- [ ] [SF425FormView.tsx](../src/app/reporting/components/SF425FormView.tsx) Lines 10i/10j/10k auto-populated
- [ ] Traffic-light indicator: green if `on_track`, amber if `at_risk` (80–90% of expected), red if `shortfall` (<80%)
- [ ] Hover tooltip: *"$X required by 2026-12-31, $Y committed to date, $Z remaining"*

---

### E. Period-end snapshot lock

**Defensibility:** auditor asks *"what did this number look like when filed?"* —
answer is in the row. *"Did anything drift since?"* — diff endpoint shows exactly what.

#### Schema
Covered by migration (`contentLockedAt` on ScheduledReport).

#### API behavior
Inside the certify endpoint (A):
- [ ] On certify: snapshot `generateReportContent(reportId)` into `report.generatedContent` JSON column
- [ ] Set `report.contentLockedAt = now()`
- [ ] On read: if `report.contentLockedAt != null`, return `generatedContent` as the source of truth — do NOT recompute

#### API: live-vs-snapshot diff
- [ ] **New:** `GET /api/reports/[id]/diff` — for locked reports only

```ts
// Returns
{
  snapshot: ReportContent,
  live:     ReportContent,
  delta: {
    line10b: { snapshot: 245000, live: 252000, delta: 7000 },
    // ...
  }
}
```

Implementation: ~30 lines.

#### UI
- [ ] [SF425FormView.tsx](../src/app/reporting/components/SF425FormView.tsx) — "🔒 Locked snapshot — taken 2026-04-30 14:23 UTC" badge
- [ ] "View live data" button → modal with side-by-side, deltas highlighted
- [ ] Form fields read-only when locked

---

### F. Per-report audit log

**Defensibility:** every "who did what when" question has a row.
SOC 2 CC7.2. 2 CFR 200.334 records-retention defensibility. **Highest-leverage trust win.**

#### Schema
Covered by migration (`AuditLog` model).

#### Helper
- [ ] **New:** [src/lib/audit/log.ts](../src/lib/audit/log.ts)

```ts
export async function audit(
  request: Request,
  entry: {
    action:        string;
    reportId?:     string;
    awardId?:      string;
    fieldChanged?: string;
    before?:       unknown;
    after?:        unknown;
    metadata?:     Record<string, unknown>;
  },
): Promise<void> {
  const portId = getPortIdFromRequest(request);
  const userId = getUserIdFromRequest(request);   // null for AI
  const ip     = request.headers.get('x-forwarded-for')?.split(',')[0] ?? null;
  const ua     = request.headers.get('user-agent') ?? null;

  // Fire and forget — never block the user-facing path.
  void prisma.auditLog.create({
    data: {
      portId, userId,
      reportId: entry.reportId,
      awardId:  entry.awardId,
      action:   entry.action,
      fieldChanged: entry.fieldChanged,
      oldValue: entry.before as Prisma.InputJsonValue,
      newValue: entry.after  as Prisma.InputJsonValue,
      ipAddress: ip,
      userAgent: ua,
      metadata: entry.metadata as Prisma.InputJsonValue,
    },
  }).catch(err => console.error('[audit] write failed', err));
}
```

#### Action vocabulary (curated, not free-form)
```
report.created
report.draft.updated
report.submitted_for_review
report.review.approved
report.review.changes_requested
report.certified
report.filed
expense.created
expense.flagged
expense.approved
drawdown.created
drawdown.submitted
ai.compliance_brief.generated
ai.expense_scan.executed
ai.draft.generated
```

#### Wire it
- [ ] [/api/reports/[id]/certify](../src/app/api/reports/[id]/certify/route.ts) — `report.certified` with `metadata: { contentHash }`
- [ ] [/api/reports/[id]/submit-for-review](../src/app/api/reports/[id]/submit-for-review/route.ts) — `report.submitted_for_review`
- [ ] [/api/reports/[id]/approve-review](../src/app/api/reports/[id]/approve-review/route.ts) — `report.review.approved`
- [ ] [/api/reports/[id]/request-changes](../src/app/api/reports/[id]/request-changes/route.ts) — `report.review.changes_requested`
- [ ] Existing [demo-reports.ts → markReportFiled](../src/lib/db/repositories/demo-reports.ts) — add `report.filed` with `metadata: { confirmationNumber, agencySystem }`
- [ ] [/api/awards/expenses/scan](../src/app/api/awards/expenses/scan/route.ts) — `ai.expense_scan.executed` with `metadata: { model, latencyMs, verdict }`
- [ ] [/api/awards/compliance-brief](../src/app/api/awards/compliance-brief/route.ts) — `ai.compliance_brief.generated` with `metadata: { model, latencyMs }`
- [ ] [/api/build-grant-application](../src/app/api/build-grant-application/route.ts) — `ai.draft.generated`

#### UI
- [ ] **New:** [src/app/reporting/components/ActivityTimeline.tsx](../src/app/reporting/components/ActivityTimeline.tsx)
- [ ] **New:** `GET /api/reports/[id]/activity` returns audit rows for the report, newest first
- [ ] Mount on every report detail view as an "Activity" tab/accordion
- [ ] Each row: icon + verb ("Certified by Jamie Certifier (CFO)" / "Porter (claude-sonnet-4-6)") + timestamp + click-to-expand metadata

---

### G. Faithful SF-425 PDF output

**Defensibility:** the output IS the official OMB form — field positions,
fonts, OMB approval expiration date, all official because the template *is*
the official PDF. **A grants officer cannot tell it from a hand-filled SF-425.**
This is the demo moment.

#### Setup (do once, before writing code — ~30 minutes)
- [ ] Download official OMB form PDFs into `public/forms/`:
  - `sf425.pdf` — OMB 4040-0014 (Federal Financial Report)
  - `sf270.pdf` — OMB 4040-0012 (Request for Advance or Reimbursement)
  - `sfppr.pdf` — OMB 0970-0428 (Performance Progress Report)

  Source: https://www.grants.gov/forms/forms-repository

- [ ] Enumerate field names with pdf-lib once, save to `field-map.json`:

```ts
import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
const doc = await PDFDocument.load(fs.readFileSync('public/forms/sf425.pdf'));
console.log(doc.getForm().getFields().map(f => f.getName()));
```

#### Dependency
- [ ] `npm i pdf-lib` (only new dep this sprint)

#### Code

[src/lib/pdf/templates.ts](../src/lib/pdf/templates.ts) — field-name registry per form:

```ts
export const FORM_TEMPLATES = {
  sf425: {
    path:   'public/forms/sf425.pdf',
    fields: {
      recipientOrg:   'form1[0].#subform[0].FederalAgency_2[0]',
      fain:           'form1[0].#subform[0].FederalGrantNumber_2[0]',
      line10a:        'form1[0].#subform[0].Line10a_2[0]',
      line10b:        'form1[0].#subform[0].Line10b_2[0]',
      // ... fill from enumeration
    },
  },
  // sf270, sfppr similar
};
```

[src/lib/pdf/sf425-mapper.ts](../src/lib/pdf/sf425-mapper.ts) — pure function, no I/O:

```ts
export function mapSF425(
  report:  ScheduledReport,
  award:   Award,
  content: ReportContent,
  cert?:   ReportCertification,
): Record<string, string> {
  return {
    recipientOrg: award.portProfile.legalName ?? '',
    fain:         award.fain,
    line10a:      content.financialSummary.totalDrawnDown.toFixed(2),
    line10b:      content.financialSummary.totalExpendedCumulative.toFixed(2),
    // ...
  };
}
```

[src/lib/pdf/render.ts](../src/lib/pdf/render.ts):

```ts
export async function renderForm(
  formKey: 'sf425' | 'sf270' | 'sfppr',
  values:  Record<string, string>,
  certificationFooter?: string,    // "Certified by Jamie Certifier, CFO, on 2026-04-30 · Hash 4f3a7c9e"
): Promise<Uint8Array> {
  const template = FORM_TEMPLATES[formKey];
  const bytes    = await fs.promises.readFile(template.path);
  const doc      = await PDFDocument.load(bytes);
  const form     = doc.getForm();

  for (const [key, fieldName] of Object.entries(template.fields)) {
    const v = values[key];
    if (v === undefined) continue;
    try {
      form.getTextField(fieldName).setText(v);
    } catch { /* checkbox / dropdown — handle per case */ }
  }
  form.flatten(); // values can no longer be edited

  if (certificationFooter) {
    const pages = doc.getPages();
    for (const page of pages) {
      page.drawText(certificationFooter, {
        x: 36, y: 18, size: 7,
        color: rgb(0.4, 0.4, 0.4),
      });
    }
  }

  return doc.save();
}
```

#### API
- [ ] **New:** `GET /api/reports/[id]/pdf?form=sf425` → `application/pdf`
- [ ] Filename: `SF-425_${award.fain}_${periodStart}_${periodEnd}.pdf`
- [ ] If certified, embed footer on every page

#### UI
- [ ] [SF425FormView.tsx](../src/app/reporting/components/SF425FormView.tsx) — "Download PDF" button
- [ ] Visible only when `status >= 'ready_to_certify'`
- [ ] Open in new tab (browser PDF viewer) — no app-side rendering

---

## Day-by-day sequencing

The dependency graph forces this order. Don't reorder.

### Monday (Day 1)

**Morning — schema + foundation (single sequential block)**
- [ ] Apply the migration above
- [ ] `prisma generate`, smoke-test that no existing query is broken
- [ ] Seed 3 users per port
- [ ] Add `getCurrentUser()` helper alongside `getTenantConfig()` in [src/lib/db/tenant-config.ts](../src/lib/db/tenant-config.ts)
- [ ] Add "Acting as" picker to [src/components/app-layout.tsx](../src/components/app-layout.tsx) — sets `x-corvo-user-id` header

**Afternoon — Feature F (audit log) end-to-end**
- [ ] `audit()` helper
- [ ] `GET /api/reports/[id]/activity` endpoint
- [ ] `ActivityTimeline` component, mounted on report detail
- [ ] Wire into the 3 AI routes + existing `markReportFiled`

**End-of-day check:** `audit_log` has rows when you do anything. ActivityTimeline renders. *That's a demo win on its own.*

### Tuesday (Day 2)

**Morning — Feature A (certification)**
- [ ] `POST /api/reports/[id]/certify` route + `canonicalJSONStringify` helper
- [ ] Certify modal with the exact SF-425 attestation text
- [ ] Certification badge on the report view
- [ ] Smoke test: certify a report → see hash → see audit log row

**Afternoon — Feature G part 1 (PDF foundation)**
- [ ] Download SF-425 OMB PDF → `public/forms/sf425.pdf`
- [ ] Enumerate fields with pdf-lib, build `templates.ts` field map
- [ ] Build `renderForm()` and stub mapper
- [ ] First wire-up: `GET /api/reports/[id]/pdf?form=sf425` returns *something* (a few fields filled)

### Wednesday (Day 3)

**Morning — Feature G part 2 (PDF complete)**
- [ ] Complete SF-425 mapper (all line items + cert footer)
- [ ] SF-270 + SF-PPR mappers and templates
- [ ] Download buttons in all three FormViews

**Afternoon — Features C + D + E**
- [ ] D (match) — wire `computeMatchForPeriod` into the form data hook, add traffic light. ~1.5 hr.
- [ ] C (indirect cost) — wire `computeIndirectCost`, populate Line 11. ~2 hr.
- [ ] E (snapshot lock) — make certify endpoint snapshot, make form read from `generatedContent` when locked. ~1 hr.
- [ ] B (maker-checker) — three new transition routes, action button visibility. ~2 hr.

**Evening — Smoke test and freeze**
- [ ] Drive the golden path 3 times: draft → submit → approve → certify → download PDF → mark filed
- [ ] No commits after Wed night. Wed PM is for breakage, not features.

### Thursday morning — pre-flight only
- [ ] No code changes
- [ ] Pre-warm caches, seed deterministic state
- [ ] Run the demo script end-to-end one final time

---

## Cut list (in order, if running short)

If Wednesday morning you're not on track, drop in this order:

1. **Cut B (maker-checker) first.** For demo, you can show the user picker switching ("now acting as CFO") and the certify flow without a true reviewer step. Add it next sprint.
2. **Cut SF-270 and SF-PPR PDFs**, keep only **SF-425 PDF**. The demo question is *"can you generate a federal form?"* — one is enough.
3. **Cut D (match traffic light) before C (indirect cost).** D is a UI nicety; C answers a specific SF-425 line item that is almost guaranteed to come up.
4. **Cut E (snapshot diff endpoint), keep snapshot lock.** Lock is one line in the certify endpoint. The diff view is the polish you don't need.

**Do not cut A, F, or G.** Those are the demo.

---

## Anti-patterns to avoid

Ordered by likelihood your AI assistant suggests them.

1. **No new state-management library.** React `useState` + the existing tenant context is enough. Resist Zustand / Redux / Jotai.
2. **No `react-hook-form`.** Forms are 5–15 fields. Native `<input>` + `useState` ships in half the LOC.
3. **No generic `BaseRepository` or `Service` abstraction.** Match the flat repository pattern in [src/lib/db/repositories/](../src/lib/db/repositories/).
4. **No Zod schemas for every internal API payload.** Prisma types are enough. Zod stays at *external* boundaries (AI extraction, user uploads).
5. **No server-side caching layers.** No `unstable_cache`, no SWR, no React Query. Routes are fast; cache invalidation on certified reports is a footgun.
6. **No strongly typed audit log per action.** Resist `AuditLogReportCertified extends AuditLog`. Vocabulary fixed at the call site, table stays generic.
7. **No "compliance officer dashboard" with charts.** Out of scope. The activity timeline is the audit story.
8. **No tests this sprint.** Smoke testing the golden path catches demo bugs. Unit tests next sprint.
9. **No making `canonicalJSONStringify` a library.** ~20 lines, single file, single export.
10. **No HTML + Puppeteer PDF rendering.** Slow, fragile, doesn't match OMB layout. AcroForm fill is faster and correct.
11. **No real auth this sprint** ("while we're in there"). Two-day sinkhole. Stay with the picker.

---

## Acceptance criteria (Wednesday night, before freeze)

If 8 of 10 are green, you have a demo. If <6 are green, cut harder.

- [ ] Pick "Acting as: Alex Drafter" → create draft → "Submit for Review"
- [ ] Switch to "Pat Reviewer" → see pending review → "Approve"
- [ ] Switch to "Jamie Certifier (CFO)" → click "Certify & Sign" → modal shows SF-425 attestation text → confirm
- [ ] Certified badge appears with name, title, timestamp, content hash (first 8 chars)
- [ ] "Download PDF" button works → produces an SF-425 PDF that looks like the OMB form
- [ ] PDF has a footer: *"Certified by Jamie Certifier, CFO, on [date] · Hash [8 chars]"*
- [ ] "Mark Filed" modal still works (existing) → captures confirmation number
- [ ] Activity timeline on the report shows every action: `report.created`, `submitted_for_review`, `review.approved`, `certified`, `filed` — each with user and timestamp
- [ ] Indirect cost (Line 11) populated automatically from `Award.indirectCostRate` × computed base
- [ ] Match (Line 10i/j/k) populated automatically with traffic-light status

---

## Demo script (Thursday, ~10 minutes for this segment)

The reporting segment of the demo. Practice this exact flow on Wed night.

| Step | Action | What you say |
|------|--------|--------------|
| 1 | Open `/reporting/forms`. Show the SF-425 list. | *"This is auto-scheduled from the award's CFDA — quarterly because it's a 20.* award."* |
| 2 | Open one SF-425. Show pre-populated financial summary. | *"Numbers come straight from the expense and drawdown ledgers. Every line item shows whether it reconciles to source."* |
| 3 | Show indirect cost Line 11 — auto-populated. | *"Award has a 42.5% provisional rate on MTDC base. Computed in code, sourced from the NICRA — link there."* |
| 4 | Show match status Line 10i/j/k — traffic light amber. | *"Match is at 76% of expected for elapsed performance period. We surface this on the form so you can't file blind."* |
| 5 | Pick "Acting as: Alex Drafter". Click "Submit for Review." | *"Drafter completes the report. They cannot certify their own work."* |
| 6 | Pick "Acting as: Pat Reviewer." Click "Approve." | *"Maker-checker: reviewer is a separate user. The transition is logged."* |
| 7 | Pick "Acting as: Jamie Certifier, CFO." | — |
| 8 | Click "Certify & Sign." Modal opens. | *"This is the exact attestation text from SF-425 box 13d — 18 USC 1001 et seq."* |
| 9 | Confirm. Show the certified badge with hash. | *"Content was canonicalized and hashed at certification. That hash is the audit receipt."* |
| 10 | Click "Download PDF." Show the official OMB SF-425. | *"This is OMB form 4040-0014. The footer carries the certifying official's name and the hash. This is what gets uploaded to PMS."* |
| 11 | Click "Mark Filed." Capture confirmation number. | *"PMS submission still happens out-of-band today — federal systems vary widely. We capture the confirmation for the audit trail."* |
| 12 | Open Activity timeline. Scroll through. | *"Every state transition. Every AI call. Every drawdown. SOC 2 CC7.2; 2 CFR 200.334 records retention."* |

---

## What this sprint is NOT solving

State explicitly. Veteran consultants will respect honesty more than overclaiming.

- **No real authentication.** User picker is for audit attribution; SSO/OAuth is the next sprint.
- **No direct PMS / Treasury / Grants.gov submission.** SF-425 PDF is the artifact; "Mark Filed" captures the manual upload metadata.
- **No FFATA / FSRS automation.** Schema supports subrecipients; FFATA is Tier 2.
- **No equipment inventory** (2 CFR 200.313). Tier 2.
- **No agency-specific report variants** (DOT PR-20, DOL ETA-9130). Tier 2.
- **No SEFA cluster grouping** (2 CFR 200.510). Tier 2 — but the $1M Single Audit threshold fix lands as part of this sprint's quick-win pass.

---

## Quick wins to pick up alongside the sprint (if 30 minutes appear)

- [ ] Fix SEFA threshold from `$750,000` → `$1,000,000` per 2024 OMB amendment to 2 CFR 200.501. One-line change in [src/data/reporting.ts:418](../src/data/reporting.ts#L418) and [src/app/api/awards/sefa/route.ts:51](../src/app/api/awards/sefa/route.ts#L51).
- [ ] On SF-425 form, show "Reconciles to source ✓ / ✗" badge per line item — comparing override vs. computed value. ~1 hour.

---

## References (existing files this sprint touches)

| File | Why |
|------|-----|
| [prisma/schema.prisma](../prisma/schema.prisma) | All migration edits |
| [src/lib/db/tenant-config.ts](../src/lib/db/tenant-config.ts) | Add `getCurrentUser()` parallel to `getTenantConfig()` |
| [src/lib/db/repositories/reports.ts](../src/lib/db/repositories/reports.ts) | New transition functions |
| [src/lib/db/repositories/demo-reports.ts](../src/lib/db/repositories/demo-reports.ts) | Mirror transition functions for demo schema |
| [src/components/app-layout.tsx](../src/components/app-layout.tsx) | "Acting as" picker |
| [src/app/reporting/components/SF425FormView.tsx](../src/app/reporting/components/SF425FormView.tsx) | Status badge, action buttons, certify modal, download PDF, line 10i/j/k, line 11 |
| [src/app/reporting/components/SF270FormView.tsx](../src/app/reporting/components/SF270FormView.tsx) | Same patterns as SF-425 |
| [src/app/reporting/components/PPRFormView.tsx](../src/app/reporting/components/PPRFormView.tsx) | Same patterns as SF-425 |
| [src/app/reporting/hooks/useAwardFormData.ts](../src/app/reporting/hooks/useAwardFormData.ts) | Add `match` and `indirectCost` to returned shape |
| [src/data/reporting.ts](../src/data/reporting.ts) | Type extensions if needed; SEFA threshold quick-win |

---

*Last updated: 2026-04-27. Single source of truth for sprint scope through Thursday demo.*