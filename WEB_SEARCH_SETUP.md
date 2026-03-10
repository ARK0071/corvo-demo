# Web Search API Setup Guide

## Overview

The application now includes web search integration to discover niche, Texas-specific grants that aren't easily found through standard APIs. This uses **Brave Search** and **Tavily Search** to find grants from:

- Texas state agencies (TxDOT, GLO, TWDB, etc.)
- Regional development organizations
- Local governments (counties, cities)
- Private foundations
- Economic development offices

## API Keys Required

### 1. Brave Search API

**Get your API key:**
1. Go to https://brave.com/search/api/
2. Sign up for a free account
3. Navigate to API Keys section
4. Create a new API key

**Free Tier:**
- 2,000 queries/month
- After that: $3 per 1,000 queries

**Add to `.env.local`:**
```bash
BRAVE_SEARCH_API_KEY=your_brave_api_key_here
```

### 2. Tavily Search API

**Get your API key:**
1. Go to https://tavily.com/
2. Sign up for a free account
3. Navigate to API Keys section
4. Create a new API key

**Free Tier:**
- Limited queries
- After that: $0.10 per query

**Add to `.env.local`:**
```bash
TAVILY_API_KEY=your_tavily_api_key_here
```

## How It Works

### Search Strategy

The system performs multiple targeted searches:

1. **State Agency Searches** (Brave Search)
   - `site:txdot.gov port maritime grant funding opportunity`
   - `site:glo.texas.gov port grant coastal`
   - `site:twdb.texas.gov port infrastructure grant`
   - `site:egrants.gov.texas.gov port security`
   - `site:comptroller.texas.gov port economic development`

2. **Regional Development Searches** (Brave Search)
   - Texas Gulf Coast port infrastructure grants
   - Houston-Galveston port development funding
   - Texas port authority grant programs

3. **Foundation Grants** (Brave Search)
   - Texas port foundation grants
   - Gulf Coast port development foundation grants

4. **Local Government Searches** (Brave Search)
   - County-level port infrastructure grants
   - City-level grant opportunities

5. **Deep Research** (Tavily Search)
   - AI-powered research on specific grant programs
   - Extracts structured information from web pages
   - Focuses on Texas state domains

### Grant Extraction

The system automatically:
- Extracts grant information from search results
- Identifies funding amounts (if mentioned)
- Extracts deadlines (if mentioned)
- Identifies eligibility requirements
- Maps agency names from URLs
- Deduplicates results across sources

### Source Attribution

Grants from web search are tagged with:
- `"Brave Search (Texas State)"` - State agency grants
- `"Brave Search (Regional)"` - Regional development grants
- `"Brave Search (Foundation)"` - Foundation grants
- `"Brave Search (Local)"` - Local government grants
- `"Tavily Search"` - Research-based grants

## Integration

The web search is automatically integrated into the enhanced search API (`/api/grants-search-enhanced`). When you search for grants:

1. Standard APIs run (Grants.gov, Federal Register, SAM.gov)
2. Web search APIs run in parallel (if API keys are configured)
3. All results are combined and deduplicated
4. Grants are displayed with their source badges

## Performance

- **Caching**: Search results are cached for 4 hours to reduce API calls
- **Parallel Execution**: All searches run simultaneously
- **Error Handling**: If one API fails, others continue
- **Rate Limiting**: Respects API rate limits automatically

## Cost Optimization

To minimize costs:

1. **Use free tiers first**: Both APIs offer free tiers
2. **Cache aggressively**: Results are cached for 4 hours
3. **Selective searching**: Only searches when keywords are provided
4. **Limit results**: Defaults to reasonable result limits

## Testing

To test the integration:

1. Add API keys to `.env.local`
2. Restart the development server
3. Search for grants with keywords like "port", "maritime", "infrastructure"
4. Check the console logs for search results
5. Look for grants with "Brave Search" or "Tavily Search" source badges

## Troubleshooting

**No web search results appearing:**
- Check that API keys are set in `.env.local`
- Verify API keys are valid
- Check console logs for errors
- Ensure you haven't exceeded free tier limits

**Too many results:**
- Adjust `maxResults` parameter in search functions
- Filter by specific keywords
- Use more specific search terms

**API errors:**
- Check API key validity
- Verify you haven't exceeded rate limits
- Check API status pages
- Review error messages in console logs
