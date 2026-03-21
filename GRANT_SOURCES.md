

3 of many
grant source
Inbox

Amsh Reddy
Attachments
Fri, Feb 20, 3:23 PM (3 days ago)
to me


Best,
Amsh Reddy
Founder | Corvo
www.getcorvo.com | Book a Meeting 


 





Mailsuite
Email tracked with Mailsuite  ·  Opt out
02/20/26, 03:22:37 PM

 One attachment
  •  Scanned by Gmail
amsh @getcorvo.com. Press tab to insert.
# All Grant Data Sources for Port Freeport
## What Corvo Can Pull Into the Dashboard

---

## TIER 1 — LIVE APIs (Automated Pull, Build Into Pipeline)

### 1. Grants.gov API
**What it gives you:** Every federal grant opportunity in the US. This is the single source of truth for federal NOFOs.
**Endpoint:** `https://api.grants.gov/v1/api/search2` (legacy) or `https://api.simpler.grants.gov/v1/opportunities/search` (new Simpler Grants API)
**Auth:** API key required (free, request via Grants.gov account)
**Rate limit:** Reasonable for daily pulls
**Key fields:** opportunityId, title, agency, oppStatus (posted/forecasted/closed), openDate, closeDate, awardFloor, awardCeiling, estimatedFunding, eligibleApplicants, fundingCategories, costSharing, description
**Pull strategy for Freeport:**
- Filter by fundingCategories: T (transportation), EN (environment), IS (security), CD (community development), ELT (energy)
- Filter by agencies: DOT, DHS, EPA, DOC, DOE, USDA, DOD
- Keyword catch-all: "port maritime freight intermodal terminal harbor navigation channel"
- oppStatuses: posted, forecasted
- Deduplicate across queries
**You already have this.** ✅

### 2. USAspending.gov API
**What it gives you:** Every federal dollar spent — who got it, how much, what for. Use this to find vendors who have executed federally funded port work.
**Endpoint:** `https://api.usaspending.gov/api/v2/search/spending_by_award/`
**Auth:** No key needed (public, no auth)
**Rate limit:** Generous
**Key fields:** Award ID, Recipient Name, Award Amount, Total Outlays, Awarding Agency, Award Type, Description, Place of Performance, NAICS Code, CFDA Number, Start/End Date
**Pull strategy for Freeport:**
- Contracts (A-D award types): keywords "port infrastructure", "marine construction", "terminal", "dredging", "crane", "wharf", "paving heavy civil" — filter TX + adjacent states, last 5 years, awards >$500K
- Grants (02-05 award types): keywords "port", "maritime", "harbor" — competitive intel on what other ports won
- Also useful: `/api/v2/recipient/` for vendor profiles, `/api/v2/search/spending_by_category/` for aggregate views
**You already have this.** ✅

### 3. SAM.gov Opportunities API
**What it gives you:** Federal contracting opportunities (solicitations, presolicitations, award notices). Overlaps with Grants.gov for grants but is THE source for contracts. Also: entity registration status validation.
**Endpoints:**
- Opportunities: `https://api.sam.gov/prod/opportunities/v2/search`
- Entity validation: `https://api.sam.gov/entity-information/v2/entities`
**Auth:** API key required (free, via SAM.gov account). 10 requests/day basic, 1,000/day with system account.
**Key fields:** noticeId, title, solicitationNumber, department, postedDate, responseDeadLine, naicsCode, award (date, amount, awardee), type (presolicitation, solicitation, award notice)
**Why you need it:** 
- Validates that Port Freeport's SAM registration is active (critical for all federal grants)
- Monitors SAM expiration date and alerts before it lapses
- Surfaces contract opportunities that complement grants (e.g., USACE contracts for channel work)
**Priority: P1 — wire up for demo if possible, definitely for production.**

### 4. Federal Register API
**What it gives you:** NOFOs, rules, and policy changes published in the Federal Register. This catches new programs BEFORE they hit Grants.gov.
**Endpoint:** `https://www.federalregister.gov/api/v1/documents`
**Auth:** None required (fully public)
**Rate limit:** 1,000 requests/hour
**Key fields:** title, abstract, agencies, document_type, publication_date, action, html_url, pdf_url
**Pull strategy:**
- Filter by document_type: "notice" 
- Filter by agencies: DOT, DHS/FEMA, EPA, DOC/EDA, DOE, USDA
- Keywords: "funding opportunity", "NOFO", "port", "maritime", "infrastructure grant"
- This is your early warning system — NOFOs often appear in the Federal Register days before Grants.gov
**Priority: P2 — nice to have for production, not needed for demo.**

---

## TIER 2 — PROGRAM-SPECIFIC SOURCES (Structured Data, Periodic Pull or Scrape)

### 5. MARAD PIDP Awards Database
**What it gives you:** Complete list of every PIDP award ever made — recipient, project, amount, location.
**Source:** https://www.maritime.dot.gov/PIDPgrants (award lists published as PDFs/web pages for each year: 2020-2024)
**Access method:** Web scrape or manual data entry (no API). MARAD publishes award tables per year.
**Why you need it:** Competitive intelligence. Shows which ports won, what project types score well, award size distribution, geographic patterns. Essential for scoring Freeport's PIDP application strength.
**Data points:** Recipient port, project description, award amount, federal share %, state, year
**Priority: P1 — scrape and store all historical PIDP awards. Critical for fit scoring.**

### 6. USDOT Grant Award Dashboard
**What it gives you:** Consolidated view of all USDOT discretionary grant awards (PIDP, BUILD/RAISE, INFRA, Mega, Rural, CRISI, PROTECT, etc.)
**Source:** https://www.transportation.gov/rural/grant-toolkit (and individual program pages)
**Access method:** Web scrape. DOT publishes award announcements and maintains program-specific lists.
**Why you need it:** Cross-program competitive intel. See which ports won multiple DOT grants, what project types succeed across programs, identify patterns.
**Priority: P2 — build a historical awards database across all DOT programs.**

### 7. FEMA PSGP Award Data
**What it gives you:** Port Security Grant Program award history — which ports got PSGP funding, how much, what for.
**Source:** https://www.fema.gov/grants/preparedness/port-security + FEMA GO system
**Access method:** USAspending.gov (CFDA 97.056) is the best programmatic source. Supplement with FEMA's published award announcements.
**Why you need it:** Freeport already taps PSGP. Historical data shows their award track record and competitive positioning.
**Data available in USAspending:** Filter by CFDA 97.056, filter recipients by "port" keyword, TX geography
**Priority: P1 — already queryable via USAspending API.** ✅

### 8. EPA Clean Ports Awards
**What it gives you:** $3B Clean Ports Program award recipients — zero-emission technology, shore power, clean equipment.
**Source:** https://www.epa.gov/ports-initiative/cleanports
**Access method:** EPA published first round awards (53 grants). Monitor for supplemental rounds.
**Why you need it:** Freeport ordered 2 new STS cranes, has ESG committee. If electric/hybrid crane options qualify, this could be significant funding.
**Data: USAspending (CFDA lookup) + EPA press releases.**
**Priority: P2 — monitor for next funding cycle.**

### 9. FRA CRISI Awards
**What it gives you:** Consolidated Rail Infrastructure and Safety Improvement grant awards.
**Source:** https://railroads.dot.gov/grants-loans/crisi + USAspending (CFDA 20.325)
**Access method:** USAspending API + FRA program page
**Why you need it:** Freeport already received $5.48M CRISI for rail infrastructure. Rail traffic up 71% YoY (7,232 railcars). Strong candidate for future rounds.
**Priority: P2 — queryable via USAspending.** ✅

---

## TIER 3 — TEXAS STATE SOURCES (Manual or Scrape)

### 10. TxDOT Maritime Infrastructure Program (Rider 37 / Port Access Account)
**What it gives you:** Texas state port infrastructure grants. The 88th Legislature reestablished the Port Access Account for maritime port capital improvement projects.
**Source:** https://www.txdot.gov/business/grants-and-funding/maritime-infrastructure-program.html
**Access method:** No API. Monitor TxDOT announcements and legislative appropriations.
**Why you need it:** Freeport has $6.2M Rider 37 entitlement with $5.4M remaining. This is their most reliable state funding source. Track disbursement schedule and future appropriations.
**Data: Manual entry from TxDOT correspondence + Freeport's ACFR.**
**Priority: P1 — hardcode current Rider 37 status, monitor for future appropriations.**

### 11. TxDOT Ship Channel Improvement Revolving Fund
**What it gives you:** Texas funding specifically for ship channel improvements.
**Source:** TxDOT Maritime Division
**Access method:** Direct inquiry / legislative monitoring
**Why you need it:** Freeport's $295M channel deepening project. Any additional state participation reduces port's bonded debt.
**Priority: P3 — low urgency, channel project near completion.**

### 12. Texas General Land Office (GLO) — Coastal Management & Erosion Grants
**What it gives you:** Grants for coastal protection, erosion control, resilience along Texas coast.
**Source:** https://www.glo.texas.gov/coast/grant-projects/
**Access method:** GLO publishes funding cycles. No API.
**Why you need it:** Freeport is a coastal port in hurricane zone. Resilience projects (seawall, dock protection, cathodic protection) could qualify.
**Priority: P3 — monitor for relevant cycles.**

### 13. Texas Water Development Board (TWDB)
**What it gives you:** Flood infrastructure, water/wastewater grants and low-interest loans.
**Source:** https://www.twdb.texas.gov/financial/programs/
**Access method:** TWDB publishes funding availability. No public API.
**Why you need it:** Stormwater management, flood resilience at port facilities. Niche but could apply to specific projects.
**Priority: P3.**

### 14. Texas Governor's Office — eGrants (Public Safety Grants)
**What it gives you:** State-level public safety and criminal justice grants.
**Source:** https://egrants.gov.texas.gov/
**Access method:** Portal with published opportunities. No API.
**Why you need it:** Port security overlap. Freeport has Director of Protective Services. Could supplement PSGP for surveillance, access control, cybersecurity.
**Priority: P3.**

### 15. Texas Comptroller — Economic Development Programs
**What it gives you:** Tax incentives, enterprise zones, economic development grants.
**Source:** https://comptroller.texas.gov/economy/
**Access method:** Published programs. No API.
**Why you need it:** Freeport is in a Foreign Trade Zone (#149). Economic development incentives for port tenants could increase port revenue, indirectly supporting capital plan.
**Priority: P3.**

---

## TIER 4 — COMPETITIVE INTELLIGENCE SOURCES (Enrich the Scoring Engine)

### 16. USACE Navigation Data Center
**What it gives you:** Waterborne commerce statistics — tonnage by port, commodity type, vessel movements. The authoritative source for port traffic data.
**Source:** https://www.navigationdatacenter.us/ + https://www.iwr.usace.army.mil/
**Access method:** Downloadable datasets (CSV/Excel). Some data available via USACE Open Data portal.
**Why you need it:** Validates Freeport's tonnage claims in grant applications. Shows growth trends that strengthen BCA (benefit-cost analysis). Benchmarks against competing ports.
**Priority: P2 — pull for Freeport and comparable Gulf Coast ports.**

### 17. Bureau of Transportation Statistics (BTS) — Port Performance
**What it gives you:** Port performance freight statistics — container throughput, dwell times, capacity metrics.
**Source:** https://www.bts.gov/ports
**Access method:** Published reports and downloadable data.
**Why you need it:** PIDP and INFRA applications scored partly on demonstrating capacity constraints and performance improvement potential. BTS data supports those narratives.
**Priority: P2.**

### 18. Census Bureau — Foreign Trade Statistics
**What it gives you:** Import/export data by port, commodity, trading partner.
**Source:** https://usatrade.census.gov/ (USA Trade Online)
**Access method:** Downloadable data, some API access.
**Why you need it:** Strengthens economic impact arguments in grant applications. Shows trade volume, trading partners, commodity diversity.
**Priority: P3.**

### 19. AAPA (American Association of Port Authorities) Data
**What it gives you:** Industry benchmarks, port statistics, member directory.
**Source:** https://www.aapa-ports.org/
**Access method:** Member-only data. Freeport is likely a member.
**Why you need it:** Peer comparison data for grant applications. Industry talking points.
**Priority: P3 — request from Freeport if they're a member.**

---

## TIER 5 — MONITORING & ALERTING SOURCES (Web Scrape / RSS)

### 20. Congressional Appropriations & Authorization Tracking
**What it gives you:** New program authorizations, funding levels for existing programs, earmarks.
**Source:** Congress.gov API (https://api.congress.gov/) + appropriations committee websites
**Auth:** API key required (free)
**Why you need it:** Catch new programs early. Track whether PIDP/BUILD/INFRA get reauthorized beyond BIL expiration. Monitor for TX-14 district earmarks.
**Priority: P2.**

### 21. DOT Navigator / Grants Dashboard
**What it gives you:** Consolidated view of all DOT grant programs with eligibility checker.
**Source:** https://www.transportation.gov/dot-navigator
**Access method:** Web scrape. DOT updates this as NOFOs open/close.
**Why you need it:** Single source for DOT program status. Catches programs the Grants.gov keyword search might miss.
**Priority: P2.**

### 22. FEMA Grants Outcomes (FEMA GO)
**What it gives you:** Application submission portal and award tracking for all FEMA preparedness grants.
**Source:** https://go.fema.gov/
**Access method:** Requires account (Freeport already has one for PSGP). No public API — monitor via Freeport's login.
**Why you need it:** Tracks PSGP application status, award notifications, reporting deadlines.
**Priority: P1 for production (Freeport provides access), not needed for demo.**

### 23. Grants.gov Email Alerts / RSS
**What it gives you:** Push notifications when new opportunities matching saved searches are posted.
**Source:** Grants.gov saved search alerts
**Access method:** Email subscription or RSS feed
**Why you need it:** Backup to API polling. Catches opportunities between scheduled API pulls.
**Priority: P3 — redundant if API polling is reliable.**

### 24. Federal Register Daily Digest
**What it gives you:** Daily summary of all new Federal Register entries.
**Source:** https://www.federalregister.gov/reader-aids/getting-started
**Access method:** RSS/email subscription or API
**Why you need it:** Catches rule changes that affect grant eligibility, new programs, policy shifts.
**Priority: P3.**

---

## SUMMARY: WHAT TO BUILD WHEN

### Demo (1 week)
| Source | Status | Action |
|--------|--------|--------|
| Grants.gov API | ✅ Have it | Fix scoring/ranking with AI prompt |
| USAspending.gov API | ✅ Have it | Fix vendor extraction (contracts not grants) |
| Port Freeport profile | Hardcode | Bake ACFR data into prompt |
| MARAD PIDP awards | Manual | Enter historical awards as static data for competitive intel |

### Post-Demo (Month 1-2)
| Source | Action |
|--------|--------|
| SAM.gov API | Wire up entity validation + contract opportunities |
| Federal Register API | Early warning for new NOFOs |
| USACE Navigation Data | Pull tonnage/commerce stats for BCA support |
| TxDOT Maritime Program | Monitor for new appropriations |
| FEMA PSGP via USAspending | Automated competitive intel pulls |
| PIDP/RAISE/INFRA award history | Scrape and build historical awards DB |

### Production (Month 3+)
| Source | Action |
|--------|--------|
| Congress.gov API | Track appropriations and program reauthorization |
| BTS Port Performance | Automate performance data pulls |
| Texas GLO/TWDB/eGrants | Monitor state cycles |
| DOT Navigator | Scrape for program status changes |
| Census trade data | Support economic impact narratives |
| FEMA GO integration | Track application status (requires client auth) |

---

## DATA ARCHITECTURE NOTE

All sources funnel into three collections in your Corvo DB:

1. **grant_opportunities** — from Grants.gov, Federal Register, SAM.gov, agency program pages
   - Deduplicated by opportunity number
   - Enriched with AI fit scores
   - Displayed on Kanban SCAN column

2. **vendor_awards** — from USAspending, SAM.gov contracts
   - Filtered to relevant NAICS codes and geographies
   - Enriched with AI vendor match scores
   - Displayed in vendor match panel on AWARDED cards

3. **competitive_intel** — from USAspending grant awards, MARAD/DOT/FEMA published award lists
   - Historical: who won what, how much, which projects
   - Used by AI to calibrate fit scores and advise on application strategy
   - Not directly displayed but powers the scoring engine