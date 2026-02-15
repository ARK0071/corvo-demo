# Corvo – Corvus

Procurement intelligence platform powered by Claude AI. Features two modules:

- **Corvus** — AI procurement agent with 20+ specialized tools for spend analysis, benchmarking, savings identification, vendor risk analysis, and procurement optimization.
- **Porter** — Federal grant matching for port vendors, with SAM.gov integration and automated outreach.

## Tech Stack

- Next.js 16 / React 19 / TypeScript
- Anthropic AI SDK (Claude tool use with streaming)
- Tailwind CSS 4 / shadcn/ui
- Recharts for data visualization

## Getting Started

```bash
npm install
cp .env.example .env.local  # Add your API keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude |
| `BRAVE_SEARCH_API_KEY` | Brave Search API key for market news |
| `SAM_GOV_API_KEY` | SAM.gov API key for federal opportunities |

## Project Structure

```
src/
├── app/              # Next.js pages and API routes
│   ├── api/          # Chat, grant extraction, SAM.gov search endpoints
│   ├── dashboard/    # Spend dashboard
│   ├── grant-match/  # Grant matching chat
│   ├── grants/       # Grants listing
│   └── ...           # Other feature pages
├── components/       # React components
│   ├── chat/         # Chat interface components
│   ├── grant-match/  # Grant matching UI
│   └── ui/           # shadcn/ui primitives
├── data/             # Mock data modules (vendors, transactions, grants)
├── hooks/            # Custom React hooks
├── lib/              # System prompts, API clients, utilities
└── tools/            # Claude tool definitions and implementations
    └── grant-match/  # Grant-specific tool functions
```
