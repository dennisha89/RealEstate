# Speed Property Analyzer - Technical Architecture

## Product Vision
Analyze any property in 60 seconds vs 30 minutes. Input address → instant buy/pass recommendation with realistic numbers.

---

## Core Features (MVP)

### 1. Instant Property Lookup
- User enters address (e.g., "123 Main St, Austin, TX")
- System pulls data in < 5 seconds:
  - Estimated value (Zillow/Redfin)
  - Bedrooms, bathrooms, sqft
  - Year built, lot size
  - Property tax amount
  - Estimated rent (Rentometer/Zillow API)

### 2. Fast Deal Analysis
- User inputs:
  - Purchase price (or use estimated value)
  - Down payment %
  - Interest rate
- System calculates in < 1 second:
  - Monthly mortgage payment
  - Cash flow (rent - all expenses)
  - Cap rate
  - Cash-on-cash return
  - Break-even occupancy
  - **REALISTIC** expenses (not optimistic BS)

### 3. Buy/Pass Recommendation
- Algorithm scores deal 0-100:
  - 80-100: "STRONG BUY" (cash flows well, below market)
  - 60-79: "GOOD DEAL" (positive cash flow)
  - 40-59: "MARGINAL" (barely breaks even)
  - 0-39: "PASS" (negative cash flow or overpriced)

### 4. Comparable Properties
- Show 3-5 similar properties sold in last 6 months
- Highlight if target is priced above/below comps

---

## Tech Stack

### Frontend
- **Next.js 14** (App Router)
- **Tailwind CSS** (fast styling)
- **shadcn/ui** (pre-built components)
- **React Hook Form** (fast form handling)

### Backend
- **Next.js API routes** (same repo)
- **Upstash Redis** (free tier, cache results)
- **PostgreSQL** (Supabase free tier - save analyses)

### Data Sources

#### Option A: Free (Scraping)
- **Zillow scraping** (via Puppeteer/Playwright)
- **Redfin scraping** (public pages)
- **Rentometer scraping** (rent estimates)
- **Risk**: IP bans, legal gray area
- **Cost**: $0/month

#### Option B: Paid APIs
- **Attom Data API** ($500-2000/month) - property data
- **HouseCanary API** ($$$) - valuations
- **RentCast API** ($50-200/month) - rent estimates
- **Cost**: $500-2000/month

#### Option C: Hybrid (RECOMMENDED)
- **Free**: Scrape Zillow for basic data (zestimate, beds/baths)
- **Paid**: RentCast API ($50/month) for rent estimates
- **Manual**: User inputs missing data
- **Cost**: $50/month

### Deployment
- **Vercel** (free tier)
- **Upstash Redis** (free tier - 10K requests/day)
- **Supabase** (free tier - 500MB)
- **Total**: $50/month (just RentCast API)

---

## Data Flow

```
1. User enters address
   ↓
2. Frontend validates address (Google Places autocomplete)
   ↓
3. API checks Redis cache (if analyzed in last 24h, return cached)
   ↓
4. If not cached:
   - Scrape Zillow for property details + zestimate
   - Call RentCast API for rent estimate
   - Pull county tax records for property tax
   ↓
5. Run calculation engine:
   - Mortgage payment = P * [r(1+r)^n] / [(1+r)^n - 1]
   - Total monthly expenses = mortgage + tax + insurance + HOA + CapEx + vacancy + PM
   - Cash flow = rent - expenses
   - Cap rate = (annual rent - annual expenses) / purchase price
   - Cash-on-cash = annual cash flow / cash invested
   ↓
6. Score the deal (algorithm):
   - If cash flow > $300/month → 80+ (strong buy)
   - If cash flow $100-300/month → 60-79 (good)
   - If cash flow $0-100/month → 40-59 (marginal)
   - If cash flow < $0 → 0-39 (pass)
   ↓
7. Save to database (user history)
   ↓
8. Return results to frontend (< 10 seconds total)
```

---

## Calculation Engine (Realistic Costs)

### Monthly Expenses Formula

```javascript
// Mortgage payment (PITI)
const principal = purchasePrice - downPayment;
const monthlyRate = annualRate / 12 / 100;
const numPayments = loanTermYears * 12;
const mortgagePayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);

// Property tax (annual / 12)
const propertyTax = (purchasePrice * localTaxRate) / 12;

// Insurance (industry standard: 0.5-1% of home value annually)
const insurance = (purchasePrice * 0.007) / 12; // 0.7% average

// HOA (if applicable, default $0)
const hoa = hoaFees || 0;

// Property Management (10% of rent - industry standard)
const propertyManagement = monthlyRent * 0.10;

// Maintenance & Repairs (1% of home value annually)
const maintenance = (purchasePrice * 0.01) / 12;

// CapEx reserves (roof, HVAC, appliances - 1% annually)
const capex = (purchasePrice * 0.01) / 12;

// Vacancy (8% of rent - realistic, not 0%)
const vacancy = monthlyRent * 0.08;

// TOTAL MONTHLY EXPENSES
const totalExpenses = mortgagePayment + propertyTax + insurance + hoa + propertyManagement + maintenance + capex + vacancy;

// CASH FLOW
const cashFlow = monthlyRent - totalExpenses;
```

### Key Differentiator: REALISTIC Defaults
Most calculators let users input "0%" for vacancy or skip CapEx. We FORCE realistic numbers:
- Vacancy: 8% minimum (not 0%)
- Maintenance: 1% of value (not user-optional)
- CapEx: 1% of value (forced)
- Property management: 10% (even if self-managing - accounts for your time)

---

## Scoring Algorithm

```javascript
function scoreDeal(cashFlow, capRate, purchasePrice, estimatedValue) {
  let score = 50; // baseline

  // Cash flow scoring (most important)
  if (cashFlow > 500) score += 30;
  else if (cashFlow > 300) score += 20;
  else if (cashFlow > 100) score += 10;
  else if (cashFlow > 0) score += 5;
  else if (cashFlow < -100) score -= 30;
  else score -= 10;

  // Cap rate scoring
  if (capRate > 8) score += 15;
  else if (capRate > 6) score += 10;
  else if (capRate > 4) score += 5;
  else score -= 5;

  // Price vs value scoring
  const priceRatio = purchasePrice / estimatedValue;
  if (priceRatio < 0.85) score += 20; // 15%+ below market
  else if (priceRatio < 0.95) score += 10; // 5-15% below market
  else if (priceRatio > 1.10) score -= 20; // 10%+ above market

  // Cap score 0-100
  return Math.max(0, Math.min(100, score));
}

function getRecommendation(score) {
  if (score >= 80) return { label: "STRONG BUY", color: "green", emoji: "🔥" };
  if (score >= 60) return { label: "GOOD DEAL", color: "blue", emoji: "👍" };
  if (score >= 40) return { label: "MARGINAL", color: "yellow", emoji: "⚠️" };
  return { label: "PASS", color: "red", emoji: "❌" };
}
```

---

## UI/UX Design

### Page 1: Input (10 seconds)
```
┌─────────────────────────────────────────┐
│  🏠 Analyze Any Property in 60 Seconds  │
├─────────────────────────────────────────┤
│                                         │
│  Property Address:                      │
│  [________________________]  [Analyze]  │
│   (autocomplete: 123 Main St, Austin TX)│
│                                         │
│  Optional Inputs (we'll estimate):      │
│  Purchase Price: [$______] (or use est.)│
│  Down Payment: [20%]                    │
│  Interest Rate: [7.5%]                  │
│                                         │
└─────────────────────────────────────────┘
```

### Page 2: Results (< 10 seconds load)
```
┌─────────────────────────────────────────────────┐
│  123 Main St, Austin, TX 78701                  │
│  ⭐ Deal Score: 85/100  🔥 STRONG BUY           │
├─────────────────────────────────────────────────┤
│  Property Details:                              │
│  • Estimated Value: $450,000                    │
│  • Beds: 3  Baths: 2  Sqft: 1,800               │
│  • Year Built: 2010                             │
│                                                 │
│  Financial Analysis:                            │
│  • Purchase Price: $420,000 (7% below market) ✅│
│  • Down Payment (20%): $84,000                  │
│  • Estimated Rent: $2,800/month                 │
│                                                 │
│  Monthly Numbers:                               │
│  Income:               $2,800                   │
│  - Mortgage (P&I):    -$2,100                   │
│  - Property Tax:        -$450                   │
│  - Insurance:           -$260                   │
│  - Maintenance (1%):    -$350                   │
│  - CapEx (1%):          -$350                   │
│  - Vacancy (8%):        -$224                   │
│  - Prop Mgmt (10%):     -$280                   │
│  ───────────────────────────────                │
│  Net Cash Flow:        -$214/month  ⚠️          │
│                                                 │
│  Key Metrics:                                   │
│  • Cap Rate: 4.2%                               │
│  • Cash-on-Cash Return: -3.1%                   │
│                                                 │
│  ⚠️ WARNING: Negative cash flow!                │
│  This property won't cash flow in year 1.       │
│  Only buy if betting on appreciation.           │
│                                                 │
│  [Adjust Inputs] [Save Analysis] [Try Another] │
└─────────────────────────────────────────────────┘
```

---

## Competitive Advantages

### vs BiggerPockets Calculator
- **Them**: Complex, 50+ input fields, takes 20 minutes
- **Us**: 1 input (address), 60 seconds, auto-fills everything

### vs Mashvisor
- **Them**: $39-99/month, focuses on Airbnb, limited markets
- **Us**: $20/month, any property type, nationwide

### vs PropStream
- **Them**: $97/month, focuses on lead gen, analysis is secondary
- **Us**: $20/month, ONLY analysis (do one thing perfectly)

### vs Spreadsheets
- **Them**: Manual data entry, error-prone, slow
- **Us**: Automated, instant, always accurate

---

## Monetization

### Free Tier
- 3 property analyses per month
- Basic recommendations
- No saved history

### Pro ($20/month)
- Unlimited analyses
- Save analysis history
- Export to PDF
- Advanced comps view
- Email alerts for price drops

### Premium ($50/month)
- Everything in Pro
- API access (analyze from other tools)
- Batch analysis (upload CSV of addresses)
- Custom expense assumptions (override defaults)

**Target:** 500 Pro users in Year 1 = $10K MRR

---

## MVP Timeline (4 Weeks)

### Week 1: Core Infrastructure
- Next.js setup
- Supabase database
- Redis caching
- Address autocomplete
- Basic UI

### Week 2: Data Pipeline
- Zillow scraping (Puppeteer)
- RentCast API integration
- Calculation engine
- Scoring algorithm

### Week 3: UI/UX
- Results dashboard
- Adjustment sliders
- Save/export functionality
- Mobile responsive

### Week 4: Polish & Launch
- Error handling
- Loading states
- SEO optimization
- Beta user testing
- ProductHunt launch

---

## Success Metrics

### Week 1
- 50 sign-ups
- 200 analyses run
- 10 paying users ($200 MRR)

### Month 3
- 500 sign-ups
- 5,000 analyses run
- 50 paying users ($1,000 MRR)

### Month 6
- 2,000 sign-ups
- 20,000 analyses run
- 200 paying users ($4,000 MRR)

---

## Risks & Mitigation

### Risk 1: Zillow blocks scraping
- **Mitigation**: Rotate IPs, use residential proxies ($50/month), fallback to manual input

### Risk 2: Data accuracy issues
- **Mitigation**: Show confidence scores, allow user overrides, disclaimer: "estimates only"

### Risk 3: Users don't trust "black box"
- **Mitigation**: Show full calculation breakdown, let users adjust every assumption

### Risk 4: Market is too crowded
- **Mitigation**: SPEED is the differentiator - no one does 60 seconds

---

## Next Steps

1. Initialize Next.js project
2. Set up Supabase database schema
3. Build address input + autocomplete
4. Integrate Zillow scraping
5. Build calculation engine
6. Create results UI
7. Deploy to Vercel
8. Test with 10 real properties
9. Launch

**LET'S BUILD IT NOW.**
