# Grant Intelligence Architecture Diagram

## System Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Interface                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Grants Page (/grants)                                    │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │  │
│  │  │   Discover   │  │   Pipeline   │  │   Vendor     │  │  │
│  │  │     Tab      │  │     Tab      │  │   Outreach   │  │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Grant Intelligence Chat Sidebar                         │  │
│  │  (Toggle button → Fixed sidebar overlay)                 │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ User Message
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API Route Layer                               │
│  /api/grant-match-chat (POST)                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  • Rate Limiting (20 req/min per IP)                     │  │
│  │  • Prompt Injection Protection                           │  │
│  │  • Message Validation                                     │  │
│  │  • Stream Response via AI SDK                            │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Tool Calls
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AI Model Layer                               │
│  Anthropic Claude Sonnet 4.5                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  System Prompt: GRANT_MATCH_SYSTEM_PROMPT                │  │
│  │  • Grant scoring rubric                                  │  │
│  │  • Financial calculation rules                           │  │
│  │  • Response guidelines                                  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Tool Selection
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Tool Layer                                   │
│  grantIntelligenceTools (6 tools)                               │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  1. get_pipeline_status                                   │  │
│  │  2. explain_grant_score                                   │  │
│  │  3. calculate_financial_scenario                          │  │
│  │  4. get_deadline_urgency                                   │  │
│  │  5. recommend_next_actions                                │  │
│  │  6. compare_two_grants                                   │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Function Calls
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Data Layer                                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │ grant-pipeline  │  │ grant-scoring    │  │ port-profile │  │
│  │                 │  │                  │  │              │  │
│  │ • getAllPipeline│  │ • scoreGrantFor  │  │ • currentPort│  │
│  │ • moveGrantTo   │  │   Port()         │  │   Profile     │  │
│  │ • updateNotes   │  │ • Eligibility    │  │ • Priorities │  │
│  │                 │  │   Scoring        │  │ • Needs      │  │
│  │ (In-memory)     │  │ • Alignment      │  │              │  │
│  │                 │  │ • Impact         │  │              │  │
│  │                 │  │ • Competitiveness│  │              │  │
│  └──────────────────┘  └──────────────────┘  └──────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  External APIs                                            │  │
│  │  • Grants.gov API (search2, fetchOpportunity)            │  │
│  │    - 15-minute cache                                     │  │
│  │    - No auth required                                    │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Component Interaction

```
┌─────────────────────────────────────────────────────────────┐
│  GrantIntelligenceChat Component                            │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  State: messages[], input, isLoading                  │  │
│  │  ┌─────────────────────────────────────────────────┐ │  │
│  │  │  handleSubmit()                                  │ │  │
│  │  │    ↓                                             │ │  │
│  │  │  fetch('/api/grant-match-chat')                  │ │  │
│  │  │    ↓                                             │ │  │
│  │  │  Stream Response                                 │ │  │
│  │  │    ↓                                             │ │  │
│  │  │  Update messages state                           │ │  │
│  │  └─────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │
┌─────────────────────────────────────────────────────────────┐
│  API Route Handler                                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  POST /api/grant-match-chat                           │  │
│  │  ┌─────────────────────────────────────────────────┐ │  │
│  │  │  1. Validate request                             │ │  │
│  │  │  2. Check rate limit                             │ │  │
│  │  │  3. Check injection patterns                      │ │  │
│  │  │  4. Convert messages to model format             │ │  │
│  │  │  5. Call streamText() with:                      │ │  │
│  │  │     - model: anthropic("claude-sonnet-4-5")     │ │  │
│  │  │     - system: GRANT_MATCH_SYSTEM_PROMPT         │ │  │
│  │  │     - tools: grantIntelligenceTools             │ │  │
│  │  │  6. Stream response back                         │ │  │
│  │  └─────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Tool Execution
                              │
┌─────────────────────────────────────────────────────────────┐
│  Tool Implementations                                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  tools.ts                                             │  │
│  │  ┌─────────────────────────────────────────────────┐ │  │
│  │  │  getPipelineGrants()                           │ │  │
│  │  │    → getAllPipelineGrants()                     │ │  │
│  │  │                                                  │ │  │
│  │  │  explainGrantScore()                            │ │  │
│  │  │    → getPipelineGrantById() OR                  │ │  │
│  │  │    → fetchGrantDetails()                        │ │  │
│  │  │    → scoreGrantForPort()                        │ │  │
│  │  │                                                  │ │  │
│  │  │  calculateFinancialScenario()                   │ │  │
│  │  │    → Bond calculation (20yr, 5%)                 │ │  │
│  │  │    → Affordability check                        │ │  │
│  │  │                                                  │ │  │
│  │  │  getDeadlineUrgency()                           │ │  │
│  │  │    → Categorize by days remaining               │ │  │
│  │  │                                                  │ │  │
│  │  │  recommendNextActions()                        │ │  │
│  │  │    → Check critical deadlines                   │ │  │
│  │  │    → Find high-value opportunities              │ │  │
│  │  │                                                  │ │  │
│  │  │  compareTwoGrants()                             │ │  │
│  │  │    → Get both grants                            │ │  │
│  │  │    → Score both                                 │ │  │
│  │  │    → Compare metrics                            │ │  │
│  │  └─────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow: Grant Scoring Example

```
User: "Explain the score for EPA Clean Ports grant"
  │
  ▼
API Route receives message
  │
  ▼
Claude AI analyzes request
  │
  ▼
Selects tool: explain_grant_score
  │
  ▼
Tool Implementation:
  1. getPipelineGrantById("grant-123")
     └─> Returns PipelineGrant OR null
  2. If not found: fetchGrantDetails("grant-123")
     └─> Calls Grants.gov API
     └─> Returns DiscoveredGrant
  3. scoreGrantForPort(discoveredGrant, portProfile)
     ├─> scoreEligibility()
     │   └─> Keyword matching against eligibility text
     ├─> scoreAlignment()
     │   └─> Match grant keywords vs port priorities/needs
     ├─> scoreImpact()
     │   └─> Award size vs operating budget
     └─> scoreCompetitiveness()
         └─> Regional focus, certifications, etc.
  4. Return detailed breakdown
  │
  ▼
Claude formats response with explanation
  │
  ▼
Streamed back to user
  │
  ▼
Displayed in chat interface
```

## Scoring Algorithm Flow

```
Grant Input
  │
  ▼
┌─────────────────────────────────────┐
│  Eligibility Scoring (35% weight)  │
│  ┌───────────────────────────────┐ │
│  │ Check keywords:               │ │
│  │ • port authority              │ │
│  │ • special district            │ │
│  │ • state/local government      │ │
│  │ • public entity               │ │
│  └───────────────────────────────┘ │
│  Output: score (0-100), status     │
└─────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────┐
│  Alignment Scoring (35% weight)    │
│  ┌───────────────────────────────┐ │
│  │ Extract keywords from grant   │ │
│  │ Match against:                │ │
│  │ • Port priorities (60%)       │ │
│  │ • Port needs (40%)            │ │
│  └───────────────────────────────┘ │
│  Output: score (0-100), matches    │
└─────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────┐
│  Impact Scoring (15% weight)       │
│  ┌───────────────────────────────┐ │
│  │ • Award size / budget ratio   │ │
│  │ • Total program funding       │ │
│  │ • Cost sharing requirements   │ │
│  └───────────────────────────────┘ │
│  Output: score (0-100)              │
└─────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────┐
│  Competitiveness (15% weight)      │
│  ┌───────────────────────────────┐ │
│  │ • Regional focus match        │ │
│  │ • Transportation/port focus   │ │
│  │ • Certifications              │ │
│  │ • Track record                │ │
│  └───────────────────────────────┘ │
│  Output: score (0-100), factors     │
└─────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────┐
│  Weighted Overall Score             │
│  overallScore =                     │
│    eligibility * 0.35 +            │
│    alignment * 0.35 +               │
│    impact * 0.15 +                  │
│    competitiveness * 0.15           │
└─────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────┐
│  Recommendation Tier                │
│  • ≥75 + eligible → highly_recommended│
│  • ≥60 → recommended                │
│  • ≥45 → consider                   │
│  • <45 or alignment <20 → not_recommended│
└─────────────────────────────────────┘
```

## File Structure

```
src/
├── app/
│   ├── api/
│   │   └── grant-match-chat/
│   │       └── route.ts          # API endpoint
│   └── grants/
│       └── page.tsx              # Main grants page (includes chat)
│
├── components/
│   └── grant-intelligence-chat.tsx  # Chat UI component
│
├── lib/
│   ├── grant-match-system-prompt.ts  # Corvo's instructions
│   └── grants-gov.ts                 # Grants.gov API client
│
├── tools/
│   └── grant-intelligence/
│       ├── definitions.ts        # Tool schemas (Zod)
│       └── tools.ts              # Tool implementations
│
└── data/
    ├── grant-pipeline.ts         # Pipeline state management
    ├── grant-scoring.ts          # Scoring algorithm
    └── port-profile.ts           # Port authority profile
```

## Key Design Decisions

1. **In-Memory State**: Pipeline uses array storage (no persistence)
   - Simple for demo
   - Easy to reset
   - No database dependency

2. **Caching Strategy**: 
   - Grant scores cached in Map
   - Grants.gov API cached 15 minutes
   - Reduces API calls and computation

3. **Streaming Responses**: 
   - Better UX (feels faster)
   - Uses AI SDK streaming
   - Handles tool calls gracefully

4. **Tool-Based Architecture**:
   - Clear separation of concerns
   - Each tool has single responsibility
   - Easy to add new tools

5. **Security Layers**:
   - Rate limiting
   - Injection detection
   - System prompt protection
   - Message length limits
