# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev          # Start Next.js dev server (localhost:3000)
npm run build        # Generate Prisma client + build Next.js
npm run lint         # ESLint with next/core-web-vitals + typescript configs
npm run generate-embeddings  # Run tsx src/scripts/generate-embeddings.ts
```

Prisma commands (requires `DATABASE_URL` in env):
```bash
npx prisma generate  # Generate client to src/generated/prisma
npx prisma db push   # Push schema changes to database
```

Ad-hoc scripts use `tsx`: `npx tsx src/scripts/<script>.ts`

No test framework is configured yet (vitest is in devDependencies but no config/tests exist).

## Architecture

**Corvo** is a Next.js 16 (App Router) procurement intelligence platform with two AI modules:

1. **Corvus** — Procurement AI agent at `/api/chat`. Uses Claude with 20+ tool-use functions for spend analysis, benchmarking, savings identification, and vendor risk.
2. **Porter** — Grant intelligence agent at `/api/grant-match-chat`. Uses Claude with grant-specific tools for federal grant discovery, scoring, pipeline management, and application drafting.

### Key Architectural Patterns

- **AI SDK (Vercel `ai` package)**: Both chat endpoints use `streamText` from the AI SDK with Anthropic's Claude model and Zod-defined tool schemas.
- **Multi-tenant environments**: Three environments (test/demo/production) controlled by `src/lib/db/tenant-config.ts`. Demo tables use `portId` filtering; production uses base table names; test uses `test_` prefix.
- **Dual embedding systems**: Demo uses OpenAI `text-embedding-3-small` (1536 dims); test/production use EC2-hosted Qwen3 (2560 dims). Configured via tenant config.
- **Prisma + pg adapter**: Database client at `src/lib/db/client.ts` uses `@prisma/adapter-pg` with a raw `pg.Pool`. Falls back gracefully when DB is unavailable.
- **Repository pattern**: `src/lib/db/repositories/` has separate files for demo vs production queries (e.g., `demo-grants.ts` vs `grants.ts`).

### Directory Layout

```
src/
├── app/api/          # API routes (chat, grants, awards, reports, pipeline, etc.)
├── app/reporting/    # Multi-page reporting module (SF-425, drawdowns, calendar, audit)
├── components/       # React components (chat/, grant-match/, ui/, vendor-search/)
├── data/             # Static/mock data modules + pre-computed embeddings (JSON)
├── hooks/            # Custom hooks (use-db-data, use-grants-data, use-vendors-data)
├── lib/              # Core logic
│   ├── db/           # Prisma client, tenant config, repositories, vector search
│   ├── pdf/          # SF-425 PDF template + rendering with pdf-lib
│   ├── reports/      # Report state machine, indirect costs, match summaries
│   └── ...           # API clients (SAM.gov, Grants.gov, USAspending, Brave Search)
├── tools/            # Claude tool definitions + implementations
│   ├── definitions.ts              # Corvus procurement tools (20+)
│   └── grant-intelligence/         # Porter grant tools
└── scripts/          # One-off scripts (seed, import, embeddings)
prisma/
├── schema.prisma     # Full schema (production, test, demo table sets)
└── *.sql             # Setup/seed SQL files
```

### Important Conventions

- **shadcn/ui**: UI components in `src/components/ui/` use "new-york" style. Add new ones via `npx shadcn add <component>`.
- **Path aliases**: `@/` maps to `src/` (configured in tsconfig).
- **Environment variables**: DB connection uses `RDS_HOST`, `RDS_PORT`, `RDS_DATABASE`, `RDS_USER`, `RDS_PASSWORD`. API keys: `ANTHROPIC_API_KEY`, `SAM_GOV_API_KEY`, `BRAVE_SEARCH_API_KEY`, `OPENAI_API_KEY`.
- **Tenant headers**: API routes read `x-corvo-environment`, `x-corvo-port-id`, `x-corvo-port-slug` headers to determine which tenant/environment to query.
- **Prisma output**: Generated client goes to `src/generated/prisma` (gitignored). Must run `prisma generate` before build.
- **PDF generation**: SF-425 reports rendered server-side using `pdf-lib` with template at `src/lib/pdf/SF-425_template.pdf`.
