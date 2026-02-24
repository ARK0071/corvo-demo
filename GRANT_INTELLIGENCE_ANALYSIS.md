# Grant Intelligence System - Comprehensive Analysis

## Overview

Grant Intelligence is an AI-powered assistant (Corvo) that helps port authorities evaluate, score, and manage federal grant opportunities. It's built as a chat interface that uses Claude AI with specialized tools to provide grant scoring, financial analysis, and pipeline management.

## Architecture

### Core Components

1. **Frontend Chat Interface** (`src/components/grant-intelligence-chat.tsx`)
   - React component with streaming chat UI
   - Sidebar implementation that can be toggled open/closed
   - Integrated into the grants page (`/grants`)
   - Handles message state and streaming responses

2. **API Route** (`src/app/api/grant-match-chat/route.ts`)
   - Next.js API route handling chat requests
   - Uses Anthropic Claude Sonnet 4.5 model
   - Implements rate limiting (20 requests/minute per IP)
   - Includes prompt injection protection
   - Streams responses using AI SDK

3. **System Prompt** (`src/lib/grant-match-system-prompt.ts`)
   - Defines Corvo's persona as a grant strategist
   - Detailed scoring rubric (0-100 scale)
   - Instructions for financial calculations
   - Security guidelines to prevent prompt leakage

4. **Tools** (`src/tools/grant-intelligence/`)
   - **definitions.ts**: Tool schemas using Zod
   - **tools.ts**: Implementation functions
   - 6 specialized tools for grant intelligence

5. **Data Layer**
   - **grant-pipeline.ts**: Pipeline state management (Eligible → Applied → Under Review → Awarded → Rejected)
   - **grant-scoring.ts**: Scoring algorithm implementation
   - **port-profile.ts**: Port authority profile data
   - **grants-gov.ts**: Grants.gov API client

## Grant Intelligence Tools

### 1. `get_pipeline_status`
- **Purpose**: Get grants in the pipeline, optionally filtered by stage or urgency
- **Parameters**: 
  - `stage` (optional): Filter by pipeline stage
  - `urgent` (optional): Only show grants with ≤14 days to deadline
- **Returns**: Count, total value, and list of grants with key details

### 2. `explain_grant_score`
- **Purpose**: Explain why a grant received its fit score (0-100)
- **Parameters**: `grantId` (string)
- **Returns**: Detailed breakdown including:
  - Overall score and recommendation
  - Eligibility status
  - Breakdown by category (eligibility, alignment, impact, competitiveness)
  - Strengths, concerns, key requirements
  - Deadline urgency classification

### 3. `calculate_financial_scenario`
- **Purpose**: Calculate financial scenarios comparing grant funding vs bond financing
- **Parameters**: 
  - `grantId` (string)
  - `requestAmount` (optional number)
- **Returns**:
  - Grant funding breakdown (federal share, local match)
  - Bond alternative calculation (20-year, 5% interest)
  - Savings comparison
  - Affordability assessment from operating budget

### 4. `get_deadline_urgency`
- **Purpose**: Categorize grants by deadline urgency
- **Parameters**: `includeApplied` (optional boolean)
- **Returns**: Grants categorized as:
  - CRITICAL (≤7 days)
  - URGENT (8-14 days)
  - UPCOMING (15-30 days)
  - FUTURE (>30 days)

### 5. `recommend_next_actions`
- **Purpose**: Recommend what the port should do next
- **Parameters**: None
- **Returns**: Prioritized list of actions with:
  - Priority level (high/medium/low)
  - Action description
  - Reason
  - Associated grant ID (if applicable)

### 6. `compare_two_grants`
- **Purpose**: Side-by-side comparison of two grants
- **Parameters**: `grantId1`, `grantId2` (strings)
- **Returns**: Comparison metrics and detailed analysis for both grants

## Grant Scoring Algorithm

Located in `src/data/grant-scoring.ts`, the scoring system evaluates grants on multiple dimensions:

### Scoring Components

1. **Eligibility Score (0-100, 35% weight)**
   - Checks for port authority, special district, state/local government eligibility
   - Keywords matching against eligibility text
   - Status: eligible, likely_eligible, unclear, not_eligible

2. **Alignment Score (0-100, 35% weight)**
   - Matches grant keywords against port priorities and needs
   - Keyword extraction with stop word filtering
   - Priority matches weighted 60%, needs matches 40%

3. **Impact Score (0-100, 15% weight)**
   - Award size relative to operating budget
   - Total program funding (indicates program importance)
   - Cost sharing requirements

4. **Competitiveness Score (0-100, 15% weight)**
   - Regional focus (Texas/Gulf Coast)
   - Transportation/port focus
   - Existing certifications
   - Operational track record

### Overall Score Calculation
```
overallScore = 
  eligibilityScore * 0.35 +
  alignmentScore * 0.35 +
  impactScore * 0.15 +
  competitivenessScore * 0.15
```

### Recommendation Tiers
- **highly_recommended**: Score ≥75 AND eligible
- **recommended**: Score ≥60
- **consider**: Score ≥45
- **not_recommended**: Score <45 OR alignment <20

## Pipeline Management

The grant pipeline tracks grants through 5 stages:

1. **Eligible**: Grants that match criteria, ready for consideration
2. **Applied**: Application submitted
3. **Under Review**: Application being reviewed by agency
4. **Awarded**: Grant awarded to port
5. **Rejected**: Application rejected or grant declined

### Pipeline Functions
- `getAllPipelineGrants()`: Get all grants
- `getGrantsByStage(stage)`: Filter by stage
- `addToPipeline(grant)`: Add new grant (defaults to "eligible")
- `moveGrantToStage(id, stage)`: Move grant between stages
- `updateGrantNotes(id, notes)`: Add user notes
- `removeFromPipeline(id)`: Remove grant
- `getPipelineStats()`: Get counts by stage

**Note**: Currently uses in-memory storage (array). Data is not persisted between sessions.

## Data Sources

### Grants.gov API
- **Client**: `src/lib/grants-gov.ts`
- **Endpoints**:
  - Search: `https://api.grants.gov/v1/api/search2`
  - Fetch Details: `https://api.grants.gov/v1/api/fetchOpportunity`
- **Caching**: 15-minute in-memory cache
- **No Authentication Required**

### Port Profile
- **Location**: `src/data/port-profile.ts` and `src/data/profiles/`
- **Default Profile**: Port Freeport (Texas)
- **Profile Structure**:
  - Location (city, state, county, region)
  - Entity type and classification
  - Characteristics (cargo types, tonnage, budget)
  - Priorities and needs
  - Capabilities and certifications
  - Environmental goals

## UI Integration

### Grants Page (`/grants`)
- Main dashboard with tabs: Discover, Pipeline, Vendor Outreach
- Grant Intelligence chat sidebar is always available
- Toggle button on right side of screen
- Sidebar opens as fixed overlay (384px wide on desktop)

### Chat Interface Features
- Streaming responses
- Message history
- Loading states
- Empty state with example questions
- Auto-scroll to latest message
- Markdown rendering for responses

## Security Features

1. **Rate Limiting**: 20 requests per minute per IP address
2. **Prompt Injection Protection**: Pattern matching against common injection attempts
3. **Message Length Limit**: 4000 characters max
4. **System Prompt Protection**: Instructions to never reveal system prompt or tool details

## Financial Calculations

### Bond Alternative
- Assumes 20-year bond term
- 5% annual interest rate
- Calculates monthly payment using standard amortization formula
- Compares total bond cost vs grant local match

### Affordability Assessment
- Compares local match to operating budget
- Rule of thumb: match should be <20% of annual budget
- Categories:
  - <10%: Highly affordable
  - 10-20%: Affordable with planning
  - 20-30%: Tight, may require financing
  - >30%: Not affordable from operating budget

## Current Limitations

1. **No Persistence**: Pipeline data is in-memory only
2. **No Real-time Updates**: Grants.gov data cached for 15 minutes
3. **Fixed Port Profile**: Uses default Port Freeport profile
4. **Simplified Match Calculation**: Assumes 20% local match rate
5. **No Historical Tracking**: No audit trail of pipeline changes
6. **Single User**: No multi-user or authentication support

## Technology Stack

- **Framework**: Next.js 16 with React 19
- **AI**: Anthropic Claude Sonnet 4.5 (via @ai-sdk/anthropic)
- **Streaming**: AI SDK streaming with tool use
- **UI**: Tailwind CSS 4, shadcn/ui components
- **Validation**: Zod for tool input schemas
- **Type Safety**: TypeScript throughout

## API Configuration

### Required Environment Variables
- `ANTHROPIC_API_KEY`: Required for chat functionality

### API Route Configuration
- `maxDuration`: 60 seconds
- Model: `claude-sonnet-4-5-20250929`
- Max tool steps: 8 (via `stopWhen: stepCountIs(8)`)

## Example User Interactions

1. **"What grants are in the pipeline?"**
   - Tool: `get_pipeline_status`
   - Returns summary of all grants by stage

2. **"Explain the score for EPA Clean Ports"**
   - Tool: `explain_grant_score`
   - Returns detailed breakdown of scoring factors

3. **"What should I do next?"**
   - Tool: `recommend_next_actions`
   - Returns prioritized action list

4. **"Show me critical deadlines"**
   - Tool: `get_deadline_urgency`
   - Returns grants with ≤7 days remaining

5. **"Compare INFRA and BRIC grants"**
   - Tool: `compare_two_grants`
   - Returns side-by-side comparison

6. **"Calculate financial scenario for grant X"**
   - Tool: `calculate_financial_scenario`
   - Returns grant vs bond comparison

## Future Enhancement Opportunities

1. **Persistence Layer**: Database integration for pipeline state
2. **Multi-Port Support**: Allow switching between port profiles
3. **Real-time Sync**: WebSocket updates for grant deadline changes
4. **Historical Analytics**: Track application success rates
5. **Document Management**: Attach application documents to grants
6. **Team Collaboration**: Multi-user support with roles
7. **Automated Alerts**: Email/SMS for critical deadlines
8. **Advanced Scoring**: Machine learning for better alignment prediction
9. **Integration**: Connect with actual grant application systems
10. **Reporting**: Export pipeline reports and analytics

## Code Quality Notes

- **Type Safety**: Strong TypeScript typing throughout
- **Error Handling**: Try-catch blocks in API routes and tools
- **Caching**: In-memory caching for grant scores and API responses
- **Separation of Concerns**: Clear separation between UI, API, tools, and data layers
- **Documentation**: Good inline comments and JSDoc-style documentation

## Testing Considerations

- No test files currently present
- Would benefit from:
  - Unit tests for scoring algorithm
  - Integration tests for API routes
  - E2E tests for chat flow
  - Mock data for Grants.gov API
