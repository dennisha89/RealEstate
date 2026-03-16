# House Flip & BRRRR Calculator: Financial Assumptions Validation Report

**Date:** 2026-03-16
**Purpose:** Validate every formula, threshold, and assumption before building the House Flip (with ARV) and BRRRR calculator engines.
**Method:** Web research across industry sources, competitor tools, lender data, and ATTOM/FRED statistics.

---

## PART 1: HOUSE FLIP VALIDATION

### 1. The 70% Rule (MAO Formula)

**Formula:** `MAO = ARV x 0.70 - Rehab Costs`

| Question | Finding | Source | Our Assumption Correct? |
|----------|---------|--------|------------------------|
| Is 70% still the standard? | Yes, but it's a **baseline, not law**. The 30% cushion covers closing costs, holding costs, and profit — it does NOT equal 30% net profit. | [Real Estate Skills (2026)](https://www.realestateskills.com/blog/what-is-70-rule-in-house-flipping), [DealCheck](https://dealcheck.io/blog/what-is-the-70-percent-rule/) | YES — use as default |
| Do experienced flippers vary? | Yes. **65% in slow/declining markets**, **70% standard**, **75% in competitive/hot markets**, **80% only for cosmetic flips by experienced pros** | [Money Vibes (2025)](https://moneyvibes.medium.com/house-flipping-in-2025-why-i-ditched-the-70-rule-and-how-you-should-too-7afaef562e78), [Lima One](https://www.limaone.com/70-rule-real-estate/) | IMPLEMENT: Configurable 65-80% with 70% default |
| What do competitors use? | DealCheck uses the 70% rule as a quick-screen but also does full itemized analysis. FlipperForce uses the same MAO formula. | [DealCheck Blog](https://dealcheck.io/blog/what-is-the-70-percent-rule/), [FlipperForce](https://www.flipperforce.com/how-to-flip-houses/chapter-4-how-to-analyze-house-flip-deals/70-percent-rule-formula) | MATCH competitors |
| Regional variations? | Yes. 75% in tight inventory/high demand. 65% in slow neighborhoods where houses sit for months. | [Stormfield Capital (2026)](https://stormfieldcapital.com/blog/the-master-guide-to-house-flipping-calculators-maximizing-profit-in-the-2026-market) | IMPLEMENT: Market condition adjustment |

**Recommendation for Engine:**
- Default MAO percentage: 70%
- User-adjustable slider: 65% to 80%
- Show warning when >75% ("thin margin — experienced flippers only")
- Show warning when <65% ("conservative — may limit deal flow")

---

### 2. Cost Benchmarks

#### 2a. Buying Closing Costs

| Component | Typical Range | Source | Our Assumption (2-3%) |
|-----------|--------------|--------|----------------------|
| Total buyer closing costs | **1-3% of purchase price** | [FlipperForce](https://www.flipperforce.com/how-to-flip-houses/chapter-4-how-to-analyze-house-flip-deals/calculating-selling-costs), [REIkit](https://www.reikit.com/house-flipping-guide/fix-and-flip-project-costs-purchase-sale-holding) | CORRECT |
| Breakdown | Title insurance, escrow fees, recording fees, transfer tax, attorney fees | [Rocket Mortgage](https://www.rocketmortgage.com/learn/closing-costs) | N/A |
| Hard money origination | 1-4 points ON TOP of closing costs | [Multifamily Loans](https://www.multifamily.loans/fix-and-flip-hard-money-loans/) | Separate line item |

**Recommendation:** Default 2% for buying closing costs (excluding lender points, which are in financing section).

#### 2b. Selling Costs

| Component | Typical Range | Source | Our Assumption (6-8%) |
|-----------|--------------|--------|----------------------|
| Agent commissions | **5.70% average** (2.82% listing + 2.75% buyer agent) as of Feb 2026 | [ListWithClever (2026)](https://listwithclever.com/average-real-estate-commission-rate/), [AnytimeEstimate (2026)](https://anytimeestimate.com/home-selling/average-real-estate-commission-rates/) | Slightly high on top end |
| Commission range | 4.50% to 6.20% | [ListWithClever (2026)](https://listwithclever.com/average-real-estate-commission-rate/) | Use 5.5% default |
| Total seller closing costs (incl. commissions) | **8-10% of sale price** | [Stormfield Capital (2026)](https://stormfieldcapital.com/blog/the-master-guide-to-house-flipping-calculators-maximizing-profit-in-the-2026-market) | Our 6-8% is LOW |
| Seller closing costs ex-commission | 1-3% | [EffectiveAgents](https://www.effectiveagents.com/resources/seller-closing-costs-complete-fee-breakdown-calculator-savings-guide) | Combined with commission = ~8% |

**CORRECTION NEEDED:** Our 6-8% assumption is on the low side. Industry data shows:
- Agent commissions: 5-6%
- Other seller closing costs: 1-3%
- **Total: 6-9%, with 8% as a solid default**

**Recommendation:** Default 8% total selling costs. Itemized view: 5.5% commissions + 2.5% other closing costs. User-adjustable.

#### 2c. Holding Costs (Monthly)

| Component | Typical Monthly | Source |
|-----------|----------------|--------|
| Property taxes | $200-$800/mo | [FlipperForce](https://www.flipperforce.com/how-to-flip-houses/chapter-4-how-to-analyze-house-flip-deals/calculating-holding-costs) |
| Vacant property insurance | $100-$300/mo | [FlipperForce](https://www.flipperforce.com/how-to-flip-houses/chapter-4-how-to-analyze-house-flip-deals/calculating-holding-costs) |
| Utilities (electric + water + gas) | $200-$400/mo | [FlipperForce](https://www.flipperforce.com/how-to-flip-houses/chapter-4-how-to-analyze-house-flip-deals/calculating-holding-costs), [BusinessDojo](https://dojobusiness.com/blogs/news/house-flipping-holding-costs) |
| Lawn/maintenance | $100-$200/mo | [FlipperForce](https://www.flipperforce.com/how-to-flip-houses/chapter-4-how-to-analyze-house-flip-deals/calculating-holding-costs) |
| HOA (if applicable) | $0-$500/mo | Variable |
| Loan interest (on $200K at 10%) | ~$1,667/mo | Calculated |
| **Total (excl. loan interest)** | **$600-$1,700/mo** | Composite |
| **Total (incl. loan interest)** | **$1,000-$3,000/mo** | [BusinessDojo](https://dojobusiness.com/blogs/news/house-flipping-holding-costs) |

**Recommendation:** Engine should calculate holding costs as sum of itemized components. Provide defaults:
- Taxes: User enters annual, engine divides by 12
- Insurance: $150/mo default
- Utilities: $300/mo default
- Maintenance: $150/mo default
- Loan interest: Calculated from financing inputs

#### 2d. Hard Money Rates (2025-2026)

| Parameter | Range | Best Data Point | Source | Our Assumption (10-14% + 2-4 pts) |
|-----------|-------|----------------|--------|-----------------------------------|
| Interest rate | 8-15% | **Average 10.43%** (Sept 2025) | [OfferMarket (2025)](https://www.offermarket.us/blog/hard-money-loan-interest-rate-2025), [Stormfield Capital (2026)](https://stormfieldcapital.com/blog/fix-and-flip-loan-rates-pricing-2026) | Top end slightly high |
| Origination points | 1-3 points | 2 points typical | [Multifamily Loans](https://www.multifamily.loans/fix-and-flip-hard-money-loans/), [Stormfield Capital (2026)](https://stormfieldcapital.com/blog/fix-and-flip-loan-rates-pricing-2026) | Our 2-4 pts is slightly high |
| Loan term | 6-24 months | 12 months typical | [Rocket Mortgage](https://www.rocketmortgage.com/learn/hard-money-loans) | Correct |
| LTV (purchase) | 70-80% of purchase | 75% typical | [Easy Street Capital](https://easystreetcap.com/easyfix/) | Correct |
| LTC (incl. rehab) | Up to 90% of total cost | Varies by lender | [Stormfield Capital](https://stormfieldcapital.com/blog/fix-and-flip-loan-rates-pricing-2026) | Add this metric |

**ADJUSTMENT NEEDED:** Our range of 10-14% is reasonable but slightly wide. Better defaults:
- Interest rate default: **11%** (midpoint of current market)
- Points default: **2 points**
- User-adjustable range: 8-15% interest, 1-4 points

#### 2e. Rehab Cost Per Square Foot

| Rehab Level | Cost/SqFt | Description | Source |
|-------------|-----------|-------------|--------|
| Light cosmetic | $15-25/sqft | Paint, flooring, appliances, cleanup | [Real Estate Skills (2026)](https://www.realestateskills.com/blog/estimating-rehab-costs), [HomeGuide (2026)](https://homeguide.com/costs/house-remodeling-cost) |
| Medium rehab | $25-50/sqft | Kitchen, bath, windows, light systems | [Real Estate Skills (2026)](https://www.realestateskills.com/blog/estimating-rehab-costs) |
| Full gut | $60-150/sqft | Down to studs, complete rebuild | [HomeGuide (2026)](https://homeguide.com/costs/house-remodeling-cost), [Assembly Service IL](https://www.assemblyserviceil.com/gut-rehab-chicago.html) |

**By Market Tier (2026):**

| Market Tier | Range | Example Markets |
|-------------|-------|----------------|
| Low-cost | $80-$200/sqft (full) | Atlanta, Phoenix |
| Mid-cost | $110-$300/sqft (full) | Chicago, Denver |
| High-cost | $225-$600/sqft (full) | NYC, San Francisco |

**Recommendation:** Provide 3-tier rehab presets (light/medium/full) with regional multipliers. Default to medium ($35/sqft) as starting point for quick estimates. Allow full itemized breakdown for detailed analysis.

---

### 3. Flip Profitability Thresholds

| Metric | Value | Year | Source | Our Assumption |
|--------|-------|------|--------|----------------|
| Average ROI (gross) | **23.1%** (Q3 2025), **25.3%** (Q1 2026) | 2025-2026 | [ATTOM Data (Q3 2025)](https://www.attomdata.com/news/market-trends/flipping/q3-2025-home-flipping-report/), [HomeStimulus (2026)](https://www.homestimulus.com/investing/house-flipping-in-2026-is-it-still-profitable/) | Our >15% = STRONG is conservative |
| Average gross profit | ~$65,000 on ~$325K sale | Q1 2026 | [Real Estate Skills (2026)](https://www.realestateskills.com/blog/flipping-houses-salary) | Reference benchmark |
| Average time to flip | **166 days** (~5.5 months) | 2025 | [FairFigure (2026)](https://fairfigure.com/blog/house-flipping-statistics) | Use 6 months default |
| Flips as % of sales | 6.8% (Q3 2025) | 2025 | [ATTOM Data (Q3 2025)](https://www.attomdata.com/news/market-trends/flipping/q3-2025-home-flipping-report/) | Context metric |
| Failure rate | **~22%** of flips don't profit | 2023 | [ReSimpli (2025)](https://resimpli.com/blog/house-flipping-statistics/) | Critical risk metric |
| Declining trend | ROI down for **6 consecutive quarters** by Q3 2025 | 2025 | [ATTOM Data (Q3 2025)](https://www.attomdata.com/news/market-trends/flipping/q3-2025-home-flipping-report/) | Show trend context |

**CORRECTION NEEDED on Profit Thresholds:**

Current gross ROI averages ~25%, but operating expenses eat 20-33% of ARV. After all costs:

| Net Profit Margin | Rating | Justification |
|-------------------|--------|---------------|
| < 0% | LOSS | 22% of flips fall here |
| 0-10% | WEAK | Barely covers time/risk. One surprise wipes profit |
| 10-15% | ACCEPTABLE | Minimum viable flip in 2026 market |
| 15-25% | STRONG | Above-average deal |
| > 25% | EXCEPTIONAL | Top-quartile deal, rare in 2025-2026 |

**Our >15% = STRONG is VALIDATED** as a good threshold but should be contextualized: "above national average ROI of 23-25% gross, which nets ~10-15% after all costs."

---

### 4. ARV Calculation

| Method | Description | Source |
|--------|-------------|--------|
| **Comparable Sales (Gold Standard)** | 3-5 recently sold similar properties within 0.5-1 mile, sold in last 60-90 days | [Wall Street Prep](https://www.wallstreetprep.com/knowledge/after-repair-value-arv/), [Stessa](https://www.stessa.com/blog/arv-after-repair-value/) |
| Per-square-foot method | Avg $/sqft of comps x subject property sqft | [FlipSmrt](http://flipsmrt.com/blog/arv-calculator-free-how-to-calculate-after-repair-value), [PropLab (2026)](https://proplab.app/learn/how-to-calculate-arv) |
| Hybrid approach | Start with comps, adjust for specific differences | [HouseCanary](https://www.housecanary.com/blog/arv), [BiggerPockets](https://www.biggerpockets.com/forums/67/topics/181594-adjusting-comps-to-determine-arv) |

**Standard Comp Adjustments:**

| Feature | Typical Adjustment | Frequency | Source |
|---------|-------------------|-----------|--------|
| Square footage | $20-50/sqft | Nearly always | [PropLab (2026)](https://proplab.app/learn/what-is-arv) |
| Bedrooms | $3,000-$10,000 each | Common | [PropLab (2026)](https://proplab.app/learn/what-is-arv) |
| Bathrooms | $5,000-$15,000 each | Common | [PropLab (2026)](https://proplab.app/learn/what-is-arv) |
| Condition/renovated | 5-15% of value | ~50% of appraisals | [Appraisers Blogs](https://appraisersblogs.com/appraisal/adjustment-values-frequency-dollar-amount/) |
| Age of home | ~$1,000 | ~25% of appraisals | [Appraisers Blogs](https://appraisersblogs.com/appraisal/adjustment-values-frequency-dollar-amount/) |
| Garage (2-car) | $5,000-$15,000 | When applicable | Industry standard |
| Pool | $5,000-$25,000 (market-dependent) | When applicable | Industry standard |
| Lot size | $/sqft varies by market | When applicable | [Riverfront Appraisals](https://riverfrontappraisals.com/how-to-determine-adjustments/) |

**Comp Selection Criteria (for our engine):**
1. Same neighborhood/subdivision (priority) or within 1 mile
2. Sold within 90 days (prefer 30-60 days)
3. Similar size: +/- 20% square footage
4. Similar bed/bath count: +/- 1
5. Similar age: +/- 10 years
6. **Post-renovation condition** (must be comparable to planned finish level)

**Recommendation:** Build ARV calculator with:
- Manual comp entry (3-5 comps)
- Auto-adjustment engine for bed/bath/sqft/condition
- $/sqft quick estimate mode
- Confidence score based on comp quality (distance, recency, similarity)

---

## PART 2: BRRRR VALIDATION

### 5. Refinance Phase

#### 5a. Cash-Out Refinance LTV

| Loan Type | Max LTV (Cash-Out) | Source | Our Assumption (70-80%) |
|-----------|-------------------|--------|------------------------|
| Fannie Mae conventional (1-unit investment) | **75%** | [Fannie Mae Selling Guide](https://selling-guide.fanniemae.com/sel/b2-1.3-03/cash-out-refinance-transactions) | CORRECT |
| Fannie Mae conventional (2-4 unit investment) | **70%** | [Fannie Mae Selling Guide](https://selling-guide.fanniemae.com/sel/b2-1.3-03/cash-out-refinance-transactions) | CORRECT |
| DSCR loan (cash-out) | **75% typical**, some lenders 80% | [Easy Street Capital](https://easystreetcap.com/dscr-loan-cash-out-refinance-guide/) | CORRECT |
| DSCR loan (rate-and-term) | **80%** | [Easy Street Capital](https://easystreetcap.com/dscr-loan-cash-out-refinance-guide/) | N/A |
| Fannie Mae ARM (1-unit investment) | **65%** | [Fannie Mae Selling Guide](https://selling-guide.fanniemae.com/sel/b2-1.3-03/cash-out-refinance-transactions) | Below our range |

**VALIDATED:** 70-80% is correct. Use **75% as default** for most BRRRR scenarios.

#### 5b. Seasoning Period

| Scenario | Seasoning Required | Source | Our Assumption (6-12 mo) |
|----------|-------------------|--------|--------------------------|
| Fannie Mae conventional | **6 months minimum** | [MoTheBroker (2026)](https://www.mothebroker.com/blog/cash-out-refinance-seasoning-requirements-2026) | CORRECT (low end) |
| DSCR loan — most lenders | **3-6 months** | [HonestCasa](https://honestcasa.com/blog/dscr-loan-seasoning-requirements), [Easy Street Capital](https://easystreetcap.com/dscr-loan-cash-out-refinance-guide/) | Our range is slightly long |
| DSCR loan — aggressive lenders | **0-3 months (no seasoning)** | [OfferMarket](https://www.offermarket.us/blog/cash-out-refi-no-seasoning), [Tidal Loans](https://www.tidalloans.com/no-seasoning-cash-out-refinance/) | Below our range |
| Clock starts from | **Deed recording date** (NOT renovation completion) | [MoTheBroker (2026)](https://www.mothebroker.com/blog/cash-out-refinance-seasoning-requirements-2026) | Important note |

**ADJUSTMENT NEEDED:** Our 6-12 months is conservative. Better model:
- Default: **6 months** (Fannie Mae standard)
- DSCR option: **3 months** (faster cycle)
- Show "no seasoning" as aggressive option with note about higher rates
- **Important:** Engine should calculate from purchase date, not rehab completion date

#### 5c. Refinance Closing Costs

| Component | Range | Source |
|-----------|-------|--------|
| Total refi closing costs | **2-6% of new loan amount** | [The Mortgage Reports (2026)](https://themortgagereports.com/74024/cost-to-refinance-a-mortgage) |
| DSCR refi premium | +0.25% to +0.50% higher rate vs. purchase | [ConstLending (2026)](https://www.constlending.com/blog/dscr-loan-rates) |
| Investment property premium | +0.5% to +1.0% higher rate vs. primary residence | [HomeAbroad (2026)](https://homeabroadinc.com/mortgages/dscr-loan-interest-rates/) |
| Points (DSCR cash-out) | 2-3 points | [Various lenders](https://geltfinancial.com/hard-money-loans/bridge-dscr-2026-refinance-hard-money-loan-checklist-timeline/) |

**Recommendation:** Default 3% of new loan amount for refi closing costs. User-adjustable.

---

### 6. BRRRR Success Metrics

#### 6a. What Defines Success?

| Metric | Definition | Target | Source |
|--------|-----------|--------|--------|
| **Capital Recycled %** | Cash returned at refi / Total cash invested x 100 | 80-100%+ | [Better.com](https://better.com/content/brrrr-method), [Nasdaq](https://www.nasdaq.com/articles/this-real-estate-strategy-lets-you-make-infinite-investments-after-putting-down-just-a) |
| **"Infinite Return"** | 100%+ capital recycled (you get ALL your cash back or more) | Aspirational goal | [BiggerPockets](https://www.biggerpockets.com/blog/real-estate-769) |
| **Monthly cash flow** | Rent - PITI - vacancy - maintenance - CapEx - management | $300-500+/mo | [Henderson Investment Group (2025)](https://www.hendersoninvestmentgroup.com/2025/03/brrrr-method/) |
| **Cash-on-Cash Return** | Annual cash flow / Remaining invested capital | 10%+ (higher if less capital left in) | [DealCheck](https://dealcheck.io/features/brrrr-calculator/) |
| **Equity captured** | ARV - New loan balance | Positive equity position | [Generational Wealth MD](https://www.generationalwealthmd.com/blog/Infinite-Returns) |

#### 6b. Realistic Expectations

| Question | Answer | Source |
|----------|--------|--------|
| How often is "infinite return" achieved? | **Not common in 2025-2026.** Realistic target is 80-90% capital recovery. 100%+ requires buying well below market. | [BiggerPockets Forum](https://www.biggerpockets.com/forums/88/topics/876001-the-infinite-return-brrrr-is-bs), [Generational Wealth MD](https://www.generationalwealthmd.com/blog/Infinite-Returns) |
| Is chasing 100% return smart? | **Not always.** 80-90% capital recovery with strong cash flow may be better than 100% recovery with thin margins. | [Graystoneig](https://graystoneig.com/articles/100-return-in-brrrr-isnt-always-a-good-idea) |
| Typical equity extraction | $50K-$100K from a $200K purchase (with forced appreciation) | [Henderson Investment Group (2025)](https://www.hendersoninvestmentgroup.com/2025/03/brrrr-method/) |
| DSCR required post-refi | **1.0 minimum**, **1.2-1.25 preferred**, **1.25+ for best rates** | [Society Mortgage (2025)](https://societymortgage.com/purchase/dscr-loan-requirements/), [ConstLending (2026)](https://www.constlending.com/blog/dscr-loan-rates) |

**Recommendation for Engine:**

BRRRR success tiers:
| Capital Recycled | Cash Flow | Rating |
|-----------------|-----------|--------|
| < 50% | Any | POOR — too much capital trapped |
| 50-75% | < $200/mo | WEAK — moderate capital trap, thin cash flow |
| 75-90% | $200-400/mo | GOOD — solid BRRRR execution |
| 90-100% | $300-500/mo | STRONG — near-infinite return with cash flow |
| 100%+ | $300+/mo | EXCEPTIONAL — true infinite return |

---

### 7. Financing Options for BRRRR

#### 7a. Standard BRRRR Financing Path

**Phase 1 (Acquisition + Rehab):** Hard money / bridge loan
**Phase 2 (Refinance):** DSCR loan or conventional

This **bridge-to-DSCR** path is confirmed as the **standard approach** in 2026.

Sources: [Park Place Finance](https://parkplacefinance.com/brrrr-method-dscr/), [Gelt Financial (2026)](https://geltfinancial.com/hard-money-loans/bridge-dscr-2026-refinance-hard-money-loan-checklist-timeline/), [Newfi](https://newfi.com/brrrr-loans/), [AHLend](https://ahlend.com/brrrr-strategy-financing-guide/)

#### 7b. DSCR Loan Terms for Refi Phase (March 2026)

| Parameter | Value | Source |
|-----------|-------|--------|
| Interest rate range | **5.875% - 7.375%** | [HomeAbroad (March 2026)](https://homeabroadinc.com/mortgages/dscr-loan-interest-rates/) |
| Typical rate | **6.12% - 6.62%** | [HomeAbroad (March 2026)](https://homeabroadinc.com/mortgages/dscr-loan-interest-rates/) |
| Expected range going forward | **6.5% - 7.5%** | [ConstLending (2026)](https://www.constlending.com/blog/dscr-loan-rates) |
| LTV (cash-out) | 75% max | [Easy Street Capital](https://easystreetcap.com/dscr-loan-cash-out-refinance-guide/) |
| Min DSCR | 1.0 (some lenders), 1.2+ preferred | [Society Mortgage (2025)](https://societymortgage.com/purchase/dscr-loan-requirements/) |
| Loan term | 30-year fixed or 5/6 ARM | [Griffin Funding (2026)](https://griffinfunding.com/non-qm-mortgages/dscr-loans/) |
| Prepayment penalty | Typical 5-4-3-2-1 (5yr step-down) | [ConstLending (2026)](https://www.constlending.com/blog/dscr-loan-rates) |
| Credit score minimum | 620-680 depending on lender | [Ridge Street Cap](https://www.ridgestreetcap.com/blog/dscr-loan-rates) |

#### 7c. Private Money vs. Hard Money

| Factor | Hard Money | Private Money | Source |
|--------|-----------|---------------|--------|
| Rate | 9.5-15% | Negotiable (often 8-12%) | [Stormfield Capital (2026)](https://stormfieldcapital.com/blog/private-lending-hard-money-guide-2026-real-estate-trends-2) |
| Points | 1-3 | 0-2 | [BiggerPockets](https://www.biggerpockets.com/blog/hard-money-vs-private-money) |
| Speed | Fast (7-14 days) | Variable (depends on relationship) | [Lima One](https://www.limaone.com/private-lending-vs-hard-money-loans/) |
| Regulation | Licensed, institutional | Less regulated, relationship-based | [Lima One](https://www.limaone.com/private-lending-vs-hard-money-loans/) |
| Which is more common? | **Hard money is more common** for BRRRR initial purchase due to speed and scalability. Private money is used by experienced investors with established networks. | [Capital Fund 1](https://capitalfund1.com/blog/hard-money-brrrr-loans/), [Stormfield Capital (2026)](https://stormfieldcapital.com/blog/private-lending-hard-money-guide-2026-real-estate-trends-2) |

**Recommendation:** Default to hard money for acquisition phase. Offer private money as alternative with user-defined terms.

---

### 8. Industry Calculator Comparison

#### How Competitors Model These Deals

| Tool | Flip Model | BRRRR Model | Key Differentiator | Source |
|------|-----------|-------------|-------------------|--------|
| **DealCheck** | Full itemized: purchase, rehab, holding, selling costs. Shows net profit, after-tax profit, LTV, LTC, ROI, annualized ROI | 4-phase: acquisition, rehab+holding, refinance, long-term rental. Shows capital recycled, cash flow, 35-year projections | Most comprehensive — shows dozens of metrics with formula tooltips | [DealCheck](https://dealcheck.io/features/house-flipping-calculator/), [DealCheck BRRRR](https://dealcheck.io/features/brrrr-calculator/) |
| **BiggerPockets** | Basic calculator with PDF report generation | BRRRR calculator with visual reports | Simplicity + community integration | [BiggerPockets](https://www.biggerpockets.com/brrrr-calculator) |
| **FlipperForce** | Step-by-step wizard, 500+ repair item database, buying costs 1-2%, selling costs 6-8% | BRRRR with pre-built rehab templates by housing type | Best rehab estimation with granular cost database | [FlipperForce](https://www.flipperforce.com/software-features/house-flipping-calculator) |
| **Rehab Valuator** | Deal analysis for rehab, BRRRR, wholesale, traditional flip | Multi-strategy analysis | All-in-one strategy comparison | [Rehab Valuator](https://rehabvaluator.com/) |

**What LootVue Should Do Differently:**
1. **Signal integration** — connect flip/BRRRR analysis to our 52-engine intelligence layer (market signals, risk scoring, capital migration data)
2. **Confidence scoring** — every output gets a confidence interval, not just a point estimate
3. **Scenario engine** — stress test the deal (rate shock, rehab overrun, extended hold, lower ARV)
4. **Market context** — show how this deal compares to local flip ROI averages from ATTOM data
5. **Timeline visualization** — cash flow waterfall across the project lifecycle

---

## PART 3: VALIDATED DEFAULTS TABLE

### House Flip Engine Defaults

| Parameter | Default Value | Range | Validation Status |
|-----------|--------------|-------|-------------------|
| MAO percentage | 70% | 65-80% | VALIDATED |
| Buying closing costs | 2% of purchase | 1-3% | VALIDATED |
| Selling costs (total) | 8% of sale price | 6-10% | CORRECTED (was 6-8%) |
| Agent commission | 5.5% | 4.5-6.2% | VALIDATED (2026 data) |
| Other seller closing costs | 2.5% | 1-3% | VALIDATED |
| Hard money interest rate | 11% | 8-15% | ADJUSTED (was 10-14%) |
| Hard money points | 2 | 1-4 | ADJUSTED (was 2-4) |
| Hard money LTV | 75% of purchase | 70-80% | VALIDATED |
| Hard money term | 12 months | 6-24 mo | VALIDATED |
| Holding cost (excl. interest) | $600/mo | $400-$1,700/mo | NEW — itemized |
| Rehab $/sqft (light) | $20/sqft | $15-25 | VALIDATED |
| Rehab $/sqft (medium) | $37/sqft | $25-50 | VALIDATED |
| Rehab $/sqft (full gut) | $85/sqft | $60-150 | VALIDATED |
| Project duration | 6 months | 3-12 mo | VALIDATED (avg 166 days) |
| Profit margin — STRONG | > 15% net | — | VALIDATED |
| Profit margin — ACCEPTABLE | 10-15% net | — | VALIDATED |
| Flip failure rate | ~22% | — | REFERENCE (risk warning) |

### BRRRR Engine Defaults

| Parameter | Default Value | Range | Validation Status |
|-----------|--------------|-------|-------------------|
| Cash-out refi LTV | 75% | 70-80% | VALIDATED |
| Seasoning period | 6 months | 0-12 mo | VALIDATED (Fannie Mae standard) |
| DSCR loan interest rate | 7.0% | 5.875-7.5% | VALIDATED (March 2026) |
| DSCR minimum for approval | 1.0 | 1.0-1.25 | VALIDATED |
| DSCR target for best rates | 1.25+ | — | VALIDATED |
| Refi closing costs | 3% of new loan | 2-6% | VALIDATED |
| Prepayment penalty | 5-4-3-2-1 step-down | Varies | VALIDATED |
| Capital recycled — STRONG | > 90% | — | NEW |
| Capital recycled — GOOD | 75-90% | — | NEW |
| Monthly cash flow target | $300-500/mo | — | VALIDATED |
| Hard money (acquisition) | Same as flip defaults | — | VALIDATED |
| DSCR loan term | 30-year fixed | 30yr fixed or ARM | VALIDATED |

---

## PART 4: FORMULAS TO IMPLEMENT

### House Flip Formulas

```
# Core Flip Analysis
MAO = ARV * mao_percentage - rehab_costs
Total_Project_Cost = Purchase + Rehab + Buying_Closing + Holding_Costs + Financing_Costs
Net_Profit = ARV - Total_Project_Cost - Selling_Costs
ROI = Net_Profit / Total_Cash_Invested * 100
Annualized_ROI = (1 + ROI)^(365/hold_days) - 1

# Financing Costs
Origination_Fee = Loan_Amount * points / 100
Monthly_Interest = Loan_Amount * annual_rate / 12
Total_Interest = Monthly_Interest * hold_months
Total_Financing_Cost = Origination_Fee + Total_Interest

# Holding Costs
Monthly_Holding = Taxes_Mo + Insurance_Mo + Utilities_Mo + Maintenance_Mo + HOA_Mo
Total_Holding = Monthly_Holding * hold_months + Total_Interest

# Selling Costs
Total_Selling = ARV * selling_cost_pct
Agent_Commission = ARV * commission_pct
Other_Selling = ARV * other_selling_pct
```

### BRRRR Formulas

```
# Phase 1: Acquisition
Total_Acquisition_Cost = Purchase + Rehab + Buying_Closing + Holding_Costs + Financing_Costs_Bridge

# Phase 2: Refinance
New_Appraised_Value = ARV  (after rehab)
New_Loan_Amount = ARV * refi_LTV
Cash_Back = New_Loan_Amount - Refi_Closing_Costs
Capital_Recycled_Pct = Cash_Back / Total_Cash_Invested * 100
Capital_Left_In_Deal = Total_Cash_Invested - Cash_Back

# Phase 3: Rental (Post-Refi)
Monthly_PITI = Mortgage_Payment + Taxes_Mo + Insurance_Mo
DSCR = Monthly_Rent / Monthly_PITI
Monthly_Cash_Flow = Monthly_Rent - Monthly_PITI - Vacancy - Maintenance - CapEx - Management
Annual_Cash_Flow = Monthly_Cash_Flow * 12
Cash_on_Cash = Annual_Cash_Flow / Capital_Left_In_Deal * 100

# If Capital_Left_In_Deal <= 0: "Infinite Return" (display Cash_on_Cash as "Infinite")

# Success Score
BRRRR_Score = weighted_average(
    capital_recycled_pct * 0.35,
    monthly_cash_flow_score * 0.25,
    dscr_score * 0.20,
    equity_position_score * 0.20
)
```

### ARV Calculation

```
# Per-Square-Foot Method
avg_price_per_sqft = sum(comp_prices) / sum(comp_sqft)
ARV_quick = avg_price_per_sqft * subject_sqft

# Adjusted Comps Method
For each comp:
  adjusted_price = sale_price
  adjusted_price += (subject_sqft - comp_sqft) * price_per_sqft_adjustment
  adjusted_price += (subject_beds - comp_beds) * bed_adjustment
  adjusted_price += (subject_baths - comp_baths) * bath_adjustment
  adjusted_price += condition_adjustment
  adjusted_price += age_adjustment

ARV = median(adjusted_prices)  # or weighted average by comp quality
ARV_confidence = f(comp_count, comp_recency, comp_distance, adjustment_magnitude)
```

---

## SOURCES

### 70% Rule & MAO
- [Real Estate Skills — The 70% Rule Ultimate Guide (2026)](https://www.realestateskills.com/blog/what-is-70-rule-in-house-flipping)
- [Money Vibes — Why I Ditched the 70% Rule (2025)](https://moneyvibes.medium.com/house-flipping-in-2025-why-i-ditched-the-70-rule-and-how-you-should-too-7afaef562e78)
- [DealCheck — What Is the 70% Rule](https://dealcheck.io/blog/what-is-the-70-percent-rule/)
- [Lima One — Investor's Guide to the 70% Rule](https://www.limaone.com/70-rule-real-estate/)
- [FlipperForce — 70% Rule Formula](https://www.flipperforce.com/how-to-flip-houses/chapter-4-how-to-analyze-house-flip-deals/70-percent-rule-formula)
- [Stormfield Capital — House Flipping Calculators Guide (2026)](https://stormfieldcapital.com/blog/the-master-guide-to-house-flipping-calculators-maximizing-profit-in-the-2026-market)
- [Preferred Capital Investors — MAO Formula Guide](https://preferredcapitalinvestors.com/2024/03/26/mao-formula-real-estate/)

### Closing Costs & Commissions
- [ListWithClever — Average Commission Rates (2026)](https://listwithclever.com/average-real-estate-commission-rate/)
- [AnytimeEstimate — Commission Rates (2026)](https://anytimeestimate.com/home-selling/average-real-estate-commission-rates/)
- [FlipperForce — Calculating Selling Costs](https://www.flipperforce.com/how-to-flip-houses/chapter-4-how-to-analyze-house-flip-deals/calculating-selling-costs)
- [REIkit — Fix and Flip Project Costs](https://www.reikit.com/house-flipping-guide/fix-and-flip-project-costs-purchase-sale-holding)
- [Mortgage-Info — Seller Closing Cost Calculator (2026)](https://mortgage-info.com/blog/closing-cost-calculator-sellers-net-proceeds-2026)

### Hard Money & Financing
- [OfferMarket — Hard Money Interest Rates 2025](https://www.offermarket.us/blog/hard-money-loan-interest-rate-2025)
- [Stormfield Capital — Fix and Flip Loan Rates 2026](https://stormfieldcapital.com/blog/fix-and-flip-loan-rates-pricing-2026)
- [Multifamily Loans — Fix and Flip Hard Money Loans](https://www.multifamily.loans/fix-and-flip-hard-money-loans/)
- [Rocket Mortgage — Hard Money Loans](https://www.rocketmortgage.com/learn/hard-money-loans)
- [TheClose — 5 Best Hard Money Lenders (2026)](https://theclose.com/best-hard-money-lenders/)
- [AmeriSave — House Flipping Loans (2026)](https://www.amerisave.com/learn/house-flipping-loans-your-complete-financing-guide-for-fixandflip-success)

### Flip Statistics & ROI
- [ATTOM Data — Q3 2025 Home Flipping Report](https://www.attomdata.com/news/market-trends/flipping/q3-2025-home-flipping-report/)
- [FairFigure — House Flipping Statistics (2026)](https://fairfigure.com/blog/house-flipping-statistics)
- [Motley Fool — House Flipping Statistics](https://www.fool.com/research/house-flipping-statistics/)
- [ReSimpli — House Flipping Statistics (2025)](https://resimpli.com/blog/house-flipping-statistics/)
- [Real Estate Skills — Flipping Houses Salary (2026)](https://www.realestateskills.com/blog/flipping-houses-salary)
- [HomeStimulus — House Flipping 2026](https://www.homestimulus.com/investing/house-flipping-in-2026-is-it-still-profitable/)

### ARV Calculation
- [Wall Street Prep — After Repair Value Formula + Calculator](https://www.wallstreetprep.com/knowledge/after-repair-value-arv/)
- [Stessa — How Investors Estimate ARV](https://www.stessa.com/blog/arv-after-repair-value/)
- [PropLab — How to Calculate ARV (2026)](https://proplab.app/learn/how-to-calculate-arv)
- [HouseCanary — How to Calculate ARV Step by Step](https://www.housecanary.com/blog/arv)
- [Appraisers Blogs — Adjustment Values & Dollar Amounts](https://appraisersblogs.com/appraisal/adjustment-values-frequency-dollar-amount/)
- [Riverfront Appraisals — How to Determine Adjustments](https://riverfrontappraisals.com/how-to-determine-adjustments/)

### Rehab Costs
- [Real Estate Skills — Estimating Rehab Costs (2026)](https://www.realestateskills.com/blog/estimating-rehab-costs)
- [HomeGuide — House Remodeling Cost (2026)](https://homeguide.com/costs/house-remodeling-cost)
- [Assembly Service IL — Chicago Gut Rehab Cost (2026)](https://www.assemblyserviceil.com/gut-rehab-chicago.html)
- [BhumiCalculator — Renovation Cost Per SqFt (2026)](https://bhumicalculator.com/countries/united-states/renovation-cost-per-square-foot)

### Holding Costs
- [FlipperForce — Calculating Holding Costs](https://www.flipperforce.com/how-to-flip-houses/chapter-4-how-to-analyze-house-flip-deals/calculating-holding-costs)
- [BusinessDojo — Holding Costs for House Flipping](https://dojobusiness.com/blogs/news/house-flipping-holding-costs)

### BRRRR & Refinance
- [AHLend — BRRRR Strategy Financing Guide](https://ahlend.com/brrrr-strategy-financing-guide/)
- [Easy Street Capital — DSCR Loan Cash-Out Refinance Guide](https://easystreetcap.com/dscr-loan-cash-out-refinance-guide/)
- [MoTheBroker — Cash-Out Refinance Seasoning Requirements (2026)](https://www.mothebroker.com/blog/cash-out-refinance-seasoning-requirements-2026)
- [OfferMarket — Cash Out Refi No Seasoning](https://www.offermarket.us/blog/cash-out-refi-no-seasoning)
- [HonestCasa — DSCR Loan Seasoning Requirements](https://honestcasa.com/blog/dscr-loan-seasoning-requirements)
- [Fannie Mae — Cash-Out Refinance Transactions](https://selling-guide.fanniemae.com/sel/b2-1.3-03/cash-out-refinance-transactions)
- [Gelt Financial — Bridge-to-DSCR in 2026](https://geltfinancial.com/hard-money-loans/bridge-dscr-2026-refinance-hard-money-loan-checklist-timeline/)
- [Park Place Finance — BRRRR with DSCR Loans](https://parkplacefinance.com/brrrr-method-dscr/)
- [Newfi — BRRRR Loans](https://newfi.com/brrrr-loans/)
- [The Mortgage Reports — Cash-Out Refinance Closing Costs (2026)](https://themortgagereports.com/74024/cost-to-refinance-a-mortgage)

### DSCR Loan Rates & Requirements
- [HomeAbroad — DSCR Loan Rates (March 2026)](https://homeabroadinc.com/mortgages/dscr-loan-interest-rates/)
- [ConstLending — DSCR Loan Rates (2026)](https://www.constlending.com/blog/dscr-loan-rates)
- [Ridge Street Cap — DSCR Loan Rates (2025)](https://www.ridgestreetcap.com/blog/dscr-loan-rates)
- [Society Mortgage — DSCR Loan Requirements (2025)](https://societymortgage.com/purchase/dscr-loan-requirements/)
- [Griffin Funding — DSCR Loans (2026)](https://griffinfunding.com/non-qm-mortgages/dscr-loans/)

### BRRRR Success Metrics & Infinite Return
- [BiggerPockets Forum — "Infinite Return" BRRRR Is BS](https://www.biggerpockets.com/forums/88/topics/876001-the-infinite-return-brrrr-is-bs)
- [BiggerPockets — Beginner's Guide to Infinite Investing](https://www.biggerpockets.com/blog/real-estate-769)
- [Generational Wealth MD — Are Infinite Returns Slowing You Down?](https://www.generationalwealthmd.com/blog/Infinite-Returns)
- [BestEverCRE — Are Infinite Returns Real or a Myth?](https://www.bestevercre.com/blog/infinite-returns-real-or-investing-myth)
- [Graystoneig — 100% Return in BRRRR Isn't Always a Good Idea](https://graystoneig.com/articles/100-return-in-brrrr-isnt-always-a-good-idea)
- [Henderson Investment Group — BRRRR Method (2025)](https://www.hendersoninvestmentgroup.com/2025/03/brrrr-method/)
- [Moneywise — BRRRR Strategy 2026](https://moneywise.com/real-estate/the-brrrr-strategy-is-becoming-2026s-go-to-real-estate-approach-for-more-predictable-returns-what-it-means-for-investors-and-if-its-right-for-you)

### Competitor Calculators
- [DealCheck — House Flipping Calculator](https://dealcheck.io/features/house-flipping-calculator/)
- [DealCheck — BRRRR Calculator](https://dealcheck.io/features/brrrr-calculator/)
- [DealCheck — How to Analyze BRRRR Deals](https://help.dealcheck.io/en/articles/3546945-how-to-analyze-brrrr-deals)
- [DealCheck — How to Calculate ROI for Flips](https://dealcheck.io/blog/how-to-calculate-return-on-investment-flips/)
- [BiggerPockets — BRRRR Calculator](https://www.biggerpockets.com/brrrr-calculator)
- [FlipperForce — House Flipping Calculator](https://www.flipperforce.com/software-features/house-flipping-calculator)
- [Rehab Valuator](https://rehabvaluator.com/)
- [FlipperForce Review (2026)](https://www.realestateskills.com/blog/flipperforce)
