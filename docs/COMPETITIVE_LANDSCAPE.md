# Competitive Landscape Analysis

## Where We Sit vs. Major Players

### Consumer Platforms (Zillow, Redfin, Realtor.com)

**What they do well:**
- Zillow: 100M+ property Zestimates with 2.4% median error, consumer search dominance, real-time listing data refreshing every 15-30 min
- Redfin: Direct MLS access for fastest public data, proprietary tour/offer data nobody else has, investor tracking (33% of purchases in Q2 2025)
- Realtor.com: IDX/MLS integration, New Home Source builder listings

**What they DON'T do:**
- No money-flow tracking (who's buying, capital source analysis)
- No investment-grade analytics (cap rates, cash-on-cash, DSCR analysis)
- No alternative data integration (LLC formations, permit pipelines, SBA loans)
- Zillow API is effectively closed to commercial use
- No neighborhood-level capital flow signals
- No predictive "where is money moving next" analysis

**Our gap to exploit:** They serve consumers finding homes. We serve investors finding alpha.

---

### Commercial/Enterprise (CoStar Group — $35B market cap)

**What they do well:**
- 6M+ commercial properties, 11M+ lease/sale comps, 20M+ transactions
- 1,600+ field researchers logging 5.1M data changes/day
- Risk analytics with NOI/property value forecasting, stress testing
- 3,000+ market/submarket analytics with vacancy/rent projections
- Near-monopoly on commercial real estate data

**What they DON'T do:**
- Focused on commercial, not residential investor market
- No alternative data signals (LLC formations, utility connections, permit velocity)
- Expensive ($10K-$50K+/year enterprise pricing)
- No money-flow tracking from public data sources
- No AI-driven pattern recognition across multiple signal types

**Our gap to exploit:** CoStar owns commercial CRE data. The residential investor intelligence market ($400B+ in annual residential investor transactions) has no CoStar equivalent.

---

### Investor Analytics Tools (Mashvisor, BatchData, PropStream)

**What they do well:**
- Mashvisor: STR/LTR analytics, 36-month performance trends, rental comps
- BatchData: 155M properties, 1,000+ data points, $0.01/API call
- PropStream: Marketing lists, skip tracing, comp analysis for wholesalers/flippers
- ATTOM: Deepest property data API ($95/mo+), tax/deed/mortgage records

**What they DON'T do:**
- No capital flow analysis — they show property data, not money movement patterns
- No predictive signals (they report what happened, not what's about to happen)
- No multi-signal fusion (combining LLC formations + permits + HMDA + SBA data)
- No neighborhood-level trend detection before it shows up in prices
- No institutional vs. retail capital tracking

**Our gap to exploit:** They're property-centric. We're capital-flow-centric. They answer "what is this property worth?" We answer "where is capital flowing before prices move?"

---

## Our Unique Value Proposition

### What nobody else does:
1. **Multi-signal fusion** — Combining 20+ free/public data sources into a unified capital flow score
2. **Leading indicators** — LLC formations, permit velocity, SBA 504 loans signal investment 6-18 months before price movement
3. **Neighborhood-level granularity** — Census tract precision vs. metro-level analytics
4. **Capital source decomposition** — Breaking down whether money comes from 1031 exchanges, DSCR loans, foreign capital, institutional buyers, or retail investors
5. **Free data advantage** — Building on Census, HMDA, HUD, SBA, USPS data that competitors ignore

### Signal Categories We Track (That Competitors Don't):

| Signal | Lead Time | Source | Competitor Coverage |
|--------|-----------|--------|-------------------|
| LLC/Entity Formations | 6-18 mo | Census Bureau | **Nobody** |
| SBA 504 Loans by Zip | 3-12 mo | SBA | **Nobody** |
| HMDA Investment Flag | 3-6 mo | CFPB | Redfin (limited) |
| HUD/USPS Vacancy | Real-time | HUD | **Nobody** |
| Permit Velocity | 6-24 mo | Local/Census | PropStream (basic) |
| OZ Capital Flows | Annual | IRS (new 2025+) | **Nobody** |
| Insurance Repricing | Real-time | State DOI | **Nobody** |
| DSCR Lending Volume | 1-3 mo | Industry data | **Nobody** |

### Architecture Already Built:
- **6 Follow The Money engines** covering all major capital flow categories
- **Hyper-multidimensional analysis** with 50+ property dimensions
- **AI Property Analyzer** with natural language querying
- **Microeconomics engine** for neighborhood-level economic analysis
- **4 API routes** for programmatic access
- **Database schema** ready for multi-tenant SaaS

---

## Go-To-Market Positioning

**Tagline:** "See where the money moves before prices do."

**Target users:**
- Real estate investors making 5+ transactions/year
- Small funds and syndicators deploying $1M-$50M
- Wholesalers identifying emerging markets
- Commercial brokers crossing into residential investment

**Pricing advantage:** Built on free public data, so our COGS is compute, not data licensing. This allows aggressive pricing vs. CoStar ($30K+/yr) and ATTOM ($1K+/yr).

---

## Key Risk: Data Moats

Our biggest competitive risk is that a well-funded player (Zillow, CoStar, or a VC-backed startup) decides to build the same multi-signal fusion. Mitigations:
1. **Speed** — First to productize these public data signals
2. **Signal quality** — Proprietary algorithms for weighting and combining signals
3. **Network effects** — User-contributed deal data creates a flywheel competitors can't replicate
4. **Vertical depth** — Going deep on investor workflow (underwriting, portfolio tracking, exit timing) vs. broad consumer features

---

*Research sources: Redfin Data Center, Zillow Group APIs, CoStar Products, BatchData, Mashvisor, Census Bureau, HMDA/CFPB, HUD, SBA*
