# Corvo — Project Summary

## Overview

Corvo is a Next.js procurement intelligence platform purpose-built for port authorities. It combines two AI agents — **Corvus** (procurement analytics) and **Porter** (grant intelligence) — powered by Anthropic's Claude model via the Vercel AI SDK. Corvus helps procurement teams analyze vendor spend, benchmark pricing, detect anomalies, and identify savings opportunities through a conversational chat interface backed by 20+ structured tool-use functions. Porter helps port finance and grants teams discover, score, and manage federal grant opportunities, track pipeline stages, model financial scenarios, and generate application drafts — all drawing on live federal data feeds.

The platform is multi-tenant, supporting multiple port authorities (Port Freeport, Los Angeles World Airports, Louisiana Gateway) across three isolated environments (test, demo, production). A full grant lifecycle management module handles active awards: drawdown requests, expense tracking, match ledger, federal reporting forms (SF-425, SF-270, PPR, SEFA), PDF generation, review/approval workflows, and audit trails. An admin panel manages users, API keys, and system health.

---

## Major Features

### Corvus — Procurement AI Agent (`/api/chat`)
- **Spend analysis**: breakdown by vendor, category, and time period; YoY comparison
- **Tail spend analysis**: identifies low-value vendors (<1% of spend) for consolidation
- **Duplicate vendor detection**: fuzzy name matching to find the same entity under different records
- **Purchase price variance (PPV)**: decomposes spend changes into volume, price, and mix effects
- **Anomaly detection**: z-score statistical analysis to flag fraud or erroneous transactions
- **Contract risk tracking**: expiration alerts, auto-renewal traps, above-market rates
- **Maverick spend detection**: off-contract purchases with contracted vendors
- **Supplier concentration analysis**: HHI index, single-source dependency flags
- **Benchmark comparisons**: market average and percentile positioning per category/vendor
- **Portfolio pricing comparison**: cross-entity pricing disparity analysis
- **Market price trends**: commodity forecasts (Steel, Copper, Aluminum, Plastics, Fuel)
- **Should-cost modeling**: bottom-up cost breakdowns by materials, labor, overhead, margin
- **Negotiation briefs**: auto-generated vendor negotiation preparation documents
- **Vendor recommendations**: prioritized action plan by vendor risk and opportunity
- **Commodity buy timing**: forward-buying expected value analysis
- **Action plans**: 90-day procurement improvement roadmaps
- **Alternative supplier identification**: dual-sourcing and competitive bidding candidates
- **Business case generation**: ROI, NPV, payback period for procurement initiatives
- **Savings reports**: executive-level summary of portfolio-wide savings opportunities
- **Payment terms optimization**: DPO improvement analysis

### Porter — Grant Intelligence Agent (`/api/grant-match-chat`)
- **Grant discovery**: live search across Grants.gov, SAM.gov, Federal Register, and USDOT curated feeds
- **Grant scoring (0-100)**: weighted scoring across eligibility gate, project alignment, financial fit, deadline viability, competitive position, and strategic value
- **Pipeline management**: Kanban stages (Eligible → Applied → Under Review → Awarded → Rejected)
- **Score explanation**: detailed breakdown of why a grant received its score
- **Financial scenario modeling**: grant vs. bond financing, local match affordability analysis
- **Deadline urgency analysis**: categorizes by CRITICAL / URGENT / UPCOMING / FUTURE
- **Grant comparison**: side-by-side comparison of two opportunities
- **Project-to-grant matching**: matches port infrastructure projects to aligned grant opportunities
- **Competitive intelligence**: peer port award history from USAspending.gov
- **Grant application drafting**: structured application narrative generation

### Award Management & Reporting
- **Awards dashboard**: active awards with budget, spend, drawdown, and remaining balances
- **Drawdown requests**: pipeline tracking of federal reimbursement requests (SF-270)
- **Expense tracking**: line-item expenses with AI-assisted receipt extraction
- **Match ledger**: tracks non-federal cost-share contributions
- **Subrecipient management**: pass-through entity tracking
- **Federal forms**: SF-425 (Financial Status Report), SF-270 (Reimbursement Request), PPR (Performance Progress Report), SEFA (Schedule of Expenditures)
- **PDF generation**: server-side rendering of SF-425 reports using `pdf-lib` with official template
- **Report workflow**: draft → submit for review → approve/request changes → certify
- **AI narrative generation**: auto-drafts SF-425 and PPR narrative sections
- **Reporting calendar**: deadline tracking across all active awards
- **Audit trail**: full immutable log of report field changes, certifications, and actions

### Vendor Search & Matching
- **Semantic vendor search**: vector similarity search against USAspending.gov-sourced vendor profiles
- **Vendor relevancy scoring**: capability alignment, certification match, geographic fit, financial capacity
- **Compliance engine**: Texas Water Code Subchapter N procurement tier computation, SBD eligibility

### Grant Drafting
- **NOFO form extraction**: parses Notice of Funding Opportunity PDFs for required forms and narrative sections
- **ACFR extraction**: extracts financial data from Annual Comprehensive Financial Reports
- **Application builder**: assembles full grant application documents

### Admin Panel
- **User management**: role-based access (drafter, reviewer, admin) with per-port isolation
- **API key management**: scoped keys with expiry and usage tracking
- **Audit logs**: searchable system-wide activity log
- **System health**: database connectivity and environment status

### Other Pages
- **Spend Analysis**: interactive spend breakdown by category/vendor
- **Taxonomy**: spend category hierarchy browser
- **Tariff analysis**: tariff impact modeling
- **Vendor graph**: vendor relationship visualization
- **Competitive Intel**: port-to-port benchmarking via USAspending.gov
- **Newsroom**: AI-curated port industry news via Brave Search
- **GovCon opportunities**: government contract discovery via SAM.gov
- **State & local grants**: non-federal grant discovery

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| UI | React 19, Tailwind CSS v4, shadcn/ui (new-york style), Radix UI |
| AI | Anthropic Claude (`claude-sonnet-4-20250514`) via Vercel AI SDK (`ai`, `@ai-sdk/anthropic`) |
| Database | PostgreSQL with `pgvector` extension |
| ORM | Prisma 7 with `@prisma/adapter-pg` + `pg.Pool` |
| Auth | NextAuth v5 beta with `@auth/prisma-adapter` |
| Embeddings (demo) | OpenAI `text-embedding-3-small` (1536 dims) |
| Embeddings (prod/test) | EC2-hosted Qwen3 model (2560 dims) |
| PDF | `pdf-lib` (server-side rendering with template overlay) |
| Cloud | AWS S3 (file storage), AWS SSM (parameter store) |
| Schema validation | Zod v4 |
| Data parsing | `papaparse` (CSV), `pdf-parse` (PDF text), `jszip`, `npyjs` (numpy arrays) |
| Scripting | `tsx` for ad-hoc scripts |

---

## Key APIs & Integrations

| API | Purpose |
|---|---|
| Grants.gov REST API | Federal grant opportunity search and detail fetch (no auth required) |
| USAspending.gov API | Federal award recipients — vendor profiles and competitive intel |
| SAM.gov API | Contract opportunities, vendor entity lookup |
| Federal Register API | Regulatory notices related to port funding |
| Congress.gov API | Legislative tracking |
| Brave Search API | Web search for newsroom and research tools |
| USACE Navigation API | Army Corps of Engineers waterway data |
| DOT Navigator | Department of Transportation program guidance |
| Anthropic API | Claude model inference for both AI agents |
| OpenAI API | Text embeddings for demo environment |

---

## Data Models & Core Abstractions

### Core Entities (Prisma schema)

| Model | Description |
|---|---|
| `User` | Platform users, scoped to a `portId`; roles: drafter, reviewer, admin |
| `Account` / `Session` | NextAuth OAuth accounts and sessions |
| `ApiKey` | Scoped API keys with hash storage |
| `AuditLog` | Immutable change log across all entities |
| `ReportCertification` | Signed certification records for submitted reports |
| `PortProfile` | Port authority profile: location, entity type, priorities, capabilities, needs, certifications, financials — stored with a 2560-dim vector embedding |
| `DiscoveredGrant` | Synced grant opportunities from Grants.gov and other sources — with eligibility, funding categories, ALN numbers, and a vector embedding |
| `PortVendor` | Vendor profiles sourced from USAspending.gov — capabilities, certifications, bonding capacity, with a vector embedding |
| `PipelineGrant` | Per-port pipeline entry linking a grant to a port profile; tracks Kanban stage and scoring dimensions |
| `GrantVendorMatch` | Scored pairing of a vendor to a grant opportunity; includes vector similarity and capability alignment scores |
| `Project` | Port infrastructure projects with type, budget, location, and readiness; used for grant-to-project matching |
| `Award` | Active federal award grants being managed; tracks total amount, period, and program |
| `GrantDraft` | In-progress grant application drafts |
| `BudgetCategory` | Budget line items per award |
| `MatchLedger` | Non-federal cost-share contributions per award |
| `Expense` | Expenditure records against awards |
| `DrawdownRequest` | Federal reimbursement requests |
| `GrantRequirements` | Extracted NOFO requirements per grant |

### Key Abstractions

**Multi-tenant system** (`src/lib/db/tenant-config.ts`): Three environments — `test` (EC2 embeddings, shared tables with `test_` prefix), `demo` (OpenAI embeddings, shared `demo_` tables filtered by `portId`), `production` (EC2 embeddings, base tables). The active tenant is resolved from HTTP headers (`x-corvo-environment`, `x-corvo-port-id`, `x-corvo-port-slug`) on the server and from `localStorage` on the client.

**Repository pattern** (`src/lib/db/repositories/`): Separate repository files for demo vs. production, each exporting typed query functions. Demo repositories always filter by `portId`; production repositories query base tables.

**Dual embedding system** (`src/lib/db/embedding-service.ts`): Abstracts over OpenAI (demo, 1536 dims) and EC2/Qwen3 (production/test, 2560 dims) to generate embeddings for grant, vendor, and port profile records.

**Tool-use AI agents**: Both chat endpoints use Vercel AI SDK `streamText` with Zod-defined tool schemas. Tool implementations live in `src/tools/` (Corvus) and `src/tools/grant-intelligence/` (Porter). Each agent is capped at 8 sequential tool-call steps per request.

**AI security layer**: Both chat routes implement in-memory per-IP rate limiting (20 req/min), message length limits (4000 chars), and regex-based prompt injection detection before forwarding to the model.

**Grant scoring engine**: Porter scores each opportunity across five weighted dimensions and applies a hard eligibility gate. Scores, recommendations, strengths, and concerns are persisted on the `PipelineGrant` record.

**Report state machine** (`src/lib/reports/`): Reports progress through `draft → pending_review → approved / changes_requested → certified`. Transitions are enforced server-side via dedicated API endpoints, each writing to the audit log.

**PDF rendering** (`src/lib/pdf/`): SF-425 reports are rendered server-side by overlaying computed values onto an official PDF template using `pdf-lib`.
