# Short-Term Rental (STR) Calculator Engine - Financial Assumptions Research Report

**Date**: 2026-03-16
**Purpose**: Validate every financial assumption before building the STR calculator engine
**Methodology**: Web research across industry sources, platform documentation, and market data providers

---

## 1. Platform Fees (2025-2026 Current Rates)

### Airbnb

| Fee Model | Rate | Status | Source |
|-----------|------|--------|--------|
| **Host-only fee (NEW default)** | **15.5%** | Mandatory as of Dec 1, 2025 | [Airbnb Help Center](https://www.airbnb.com/help/article/1857), [Beyond Pricing](https://www.beyondpricing.com/blog/airbnb-service-fee-changes-2025) |
| Split-fee (LEGACY, discontinued) | 3% host + 14-16% guest | Phased out Oct-Dec 2025 | [Hostaway](https://www.hostaway.com/blog/airbnb-host-only-fee-what-to-know-about-the-15-percent-host-fee/) |
| Brazil rate | 16% | Active | [Lodgify](https://www.lodgify.com/blog/airbnb-host-fees/) |

**Verdict on "3% host fee" assumption: WRONG. The 3% split-fee model was eliminated in late 2025. All hosts now pay 15.5% host-only. This is the single most important correction -- using 3% would massively overstate net revenue.**

### VRBO

| Fee Model | Rate | Status | Source |
|-----------|------|--------|--------|
| **Pay-per-booking** | **5% commission + 3% payment processing = 8% total** | Default for all new hosts | [VRBO Help](https://help.vrbo.com/articles/How-is-the-booking-fee-calculated), [Host Tools](https://hosttools.com/blog/short-term-rental-tips/vrbo-host-fees/) |
| Annual subscription | $699/year (no commission, still 3% processing) | Being phased out; only existing subscribers can renew | [Lodgify](https://www.lodgify.com/guides/vrbo/fees/) |

**Verdict on "5% fee" assumption: PARTIALLY CORRECT. The 5% is the commission only. Total effective cost is 8% when including the 3% payment processing fee. Calculator should use 8%.**

### Booking.com

| Item | Rate | Source |
|------|------|--------|
| **Commission** | **15% average** (range: 10-25%) | [Your.Rentals](https://your.rentals/blog/booking-com-fees-how-are-they-calculated/), [Hostaway](https://www.hostaway.com/blog/commission-rates-airbnb-vrbo/) |
| Payment processing fee | 2.2% additional | [Guesty](https://www.guesty.com/blog/how-much-does-booking-com-charge-hosts/) |
| **Effective total** | **~17.2%** | Calculated |

**Note**: Starting Jan 2026, all STR hosts on Booking.com must use host-only model. Rates vary by region and marketing program participation.

### Direct Booking Costs

| Item | Rate | Source |
|------|------|--------|
| Payment processing (Stripe/Square) | 2.9% + $0.30 per transaction | Industry standard |
| Channel manager software | $29-$100/month per property | [SuiteOp](https://suiteop.com/blog/best-short-term-rental-management-tools-airbnb-hosts-2025) |
| Direct booking website (Lodgify, etc.) | $13-$60/month | [Lodgify Pricing](https://get.lodgify.com/pricing) |
| **Total effective cost** | **4.9-7.5% of booking** | [BuildUp Bookings](https://www.buildupbookings.com/blog/direct-booking-fees/) |

### Platform Fee Summary for Calculator

| Channel | Calculator Default | Notes |
|---------|-------------------|-------|
| Airbnb | 15.5% | Mandatory host-only fee |
| VRBO | 8.0% | 5% commission + 3% processing |
| Booking.com | 15.0% | Average; range 10-25% |
| Direct booking | 5.0% | Processing + software amortized |
| **Blended (typical mix)** | **~12-13%** | Weighted by channel distribution |

---

## 2. Operating Expenses (Industry Benchmarks)

### Cleaning Costs

| Metric | Value | Source |
|--------|-------|--------|
| **% of gross revenue** | **10-15%** | [AvantStay NOI Guide](https://avantstay.com/blog/calculate-noi-short-term-rentals/) |
| Per-turnover: 1BR | $40-$90 (avg $53) | [AirDNA](https://www.airdna.co/blog/airbnb-cleaning-fees-what-hosts-need-to-know) |
| Per-turnover: 2BR | $50-$130 (avg $72) | [AirDNA](https://www.airdna.co/blog/airbnb-cleaning-fees-what-hosts-need-to-know) |
| Per-turnover: 3BR | $70-$150 (avg $100) | [AirDNA](https://www.airdna.co/blog/airbnb-cleaning-fees-what-hosts-need-to-know) |
| Per-turnover: 4BR+ | $100-$250+ | [4Way Contractors](https://www.4waycontractors.com/rental-turnover-cleaning-2026-standards-checklists/) |

**Calculator recommendation**: Use per-turnover model (more accurate than % of revenue). Default by bedroom count. Allow user override.

### Furnishing & Replacement Budget

| Metric | Value | Source |
|--------|-------|--------|
| Initial furnishing | $15,000-$45,000 (varies by size/tier) | [BeeSetups 2025 Report](https://www.beesetups.com/str-furnishing-benchmark-report-2025) |
| Annual replacement reserve | **~2% of gross revenue** | [BuildYourBnB](https://www.buildyourbnb.com/blog-post/how-to-properly-forecast-expenses-for-your-short-term-rental-property) |
| Full refurnish cycle | Every 5+ years | [BeeSetups](https://www.beesetups.com/str-furnishing-benchmark-report-2025) |
| ROI of furnishing quality | +10% spend = +6% revenue, +0.6 star reviews | [BeeSetups](https://www.beesetups.com/str-furnishing-benchmark-report-2025) |

**Calculator recommendation**: Use 2% of gross revenue for annual FF&E reserve. Initial furnishing as a startup CapEx input.

### Insurance

| Type | Annual Cost | Source |
|------|------------|--------|
| **Landlord insurance (LTR baseline)** | **$800-$3,000/yr** (national avg ~$1,516) | [Steadily](https://www.steadily.com/faq/how-much-does-landlord-insurance-cost) |
| **STR insurance** | **$1,200-$3,000/yr** (can reach $9,000 in FL) | [Proper Insure](https://www.proper.insure/blog/how-much-does-short-term-rental-insurance-cost/), [Obie Insurance](https://www.obieinsurance.com/blog/short-term-rental-insurance-cost) |
| Implied multiplier | **~1.3-2.0x** landlord insurance | Calculated from ranges |

**Verdict on "2.5x multiplier" assumption: TOO HIGH for most markets. Data suggests 1.3-2.0x is more typical. 2.5x would only apply in high-risk coastal/hurricane zones (FL, Gulf Coast). Recommend default of 1.5x with adjustable range.**

### Maintenance

| Metric | Value | Source |
|--------|-------|--------|
| LTR maintenance benchmark | $0.90-$1.30/sqft/yr or 5-10% of rental income | [Belong Home](https://belonghome.com/blog/rental-property-maintenance-costs) |
| STR premium factors | Higher turnover, more wear, guest damage | [Mashvisor](https://www.mashvisor.com/blog/short-term-vs-long-term-rentals-2026/) |
| STR maintenance reserve | **2% of revenue** (in addition to FF&E reserve) | [BuildYourBnB](https://www.buildyourbnb.com/blog-post/how-to-properly-forecast-expenses-for-your-short-term-rental-property) |

**Verdict on "1.5x maintenance multiplier" assumption: REASONABLE. Industry data doesn't provide an explicit multiplier, but higher turnover and guest usage patterns support 1.3-1.5x over LTR. Using 1.5x is defensible. Could also express as ~7-10% of STR revenue vs ~5-7% for LTR.**

### Property Management Fees

| Management Type | Fee Range | Source |
|----------------|-----------|--------|
| **Full-service STR management** | **25-40% of revenue** | [Baselane](https://www.baselane.com/resources/how-much-do-property-managers-charge), [Hospitable](https://hospitable.com/how-much-property-managers-charge) |
| Airbnb-specific managers | 15-25% of revenue | [AirDNA](https://www.airdna.co/blog/how-much-do-property-managers-charge) |
| Self-managed with tools | $29-$100/month flat | Software costs only |
| LTR management (comparison) | 8-12% of revenue | [Baselane](https://www.baselane.com/resources/how-much-do-property-managers-charge) |

**Verdict on "20-35% range" assumption: SLIGHTLY LOW on the upper end. Full-service ranges up to 40%. Recommend 20-40% range with 25% as default for professionally managed, 0% for self-managed.**

### Monthly Technology & Utility Costs

| Item | Monthly Cost | Source |
|------|-------------|--------|
| High-speed WiFi/Internet | $40-$70 | [ApartmentList](https://www.apartmentlist.com/renter-life/estimating-apartment-utilities-cost) |
| Electricity | $100-$300 (climate dependent) | [ApartmentList](https://www.apartmentlist.com/renter-life/estimating-apartment-utilities-cost) |
| Water/sewer | $30-$70 | [ApartmentList](https://www.apartmentlist.com/renter-life/estimating-apartment-utilities-cost) |
| Gas/heating | $50-$100 | [ApartmentList](https://www.apartmentlist.com/renter-life/estimating-apartment-utilities-cost) |
| Dynamic pricing tool (PriceLabs) | $20-$40 or 1% of booking | [PriceLabs](https://hello.pricelabs.co/) |
| Smart lock (amortized) | $8-$25 (hardware $100-$300, no subscription for 33Lock) | [SuiteOp](https://suiteop.com/blog/best-short-term-rental-management-tools-airbnb-hosts-2025) |
| PMS software | $29-$100 | [Guesty](https://www.guesty.com/blog/how-to-build-your-ultimate-short-term-rental-tech-stack/) |
| Smart thermostat (amortized) | $5-$10 | One-time $130 purchase |
| **Total utilities** | **$200-$500/month** | Calculated |
| **Total tech stack** | **$60-$175/month** | Calculated |
| **Grand total monthly overhead** | **$260-$675/month** | Calculated |

---

## 3. Revenue Benchmarks (2025-2026)

### Average Daily Rate (ADR)

| Metric | Value | Source |
|--------|-------|--------|
| **US national average ADR** | **$230-$260/night** (market dependent) | [PriceLabs](https://hello.pricelabs.co/airbnb-trends-2025/) |
| Airbnb global ADR | $173/night | [Affinco](https://affinco.com/airbnb-statistics/) |
| Airbnb North America ADR | $208/night | [Affinco](https://affinco.com/airbnb-statistics/) |
| AirDNA 2026 ADR forecast | ~1.5% growth over 2025 | [AirDNA Outlook](https://www.airdna.co/outlook-report) |

**Note**: Wide variance by market. Urban markets $150-$250, resort/beach $250-$500+, rural $100-$175.

### Occupancy Rate

| Metric | Value | Source |
|--------|-------|--------|
| **US national average occupancy** | **50-55%** | [PriceLabs](https://hello.pricelabs.co/airbnb-trends-2025/), [Guesty](https://www.guesty.com/blog/airbnb-average-occupancy-rates/) |
| Peak month (July) | ~67.5% | [AirDNA](https://www.airdna.co/blog/short-term-rentals-reshaping-seasonality-trends) |
| Low month (January) | ~41.6% | [AirDNA](https://www.airdna.co/blog/short-term-rentals-reshaping-seasonality-trends) |
| Top performers (professional mgmt) | 70-90% | [Mashvisor](https://www.mashvisor.com/blog/airbnb-growth-trends/) |
| 2026 forecast | ~1% decline from 2025 | [AirDNA Outlook](https://www.airdna.co/outlook-report) |

### RevPAR (Revenue Per Available Rental)

| Metric | Value | Source |
|--------|-------|--------|
| RevPAR formula | ADR x Occupancy Rate | Industry standard |
| US RevPAR Y/Y growth (Jan 2025) | +8.1% | [Engine](https://engine.com/travel-trends-tech/the-2025-hospitality-showdown-a-data-driven-analysis-of-airbnbs-momentum-vs-the-hotel-sectors-resilience) |
| Summer 2025 RevPAR growth | +5-6% Y/Y | [PriceLabs](https://hello.pricelabs.co/airbnb-trends-2025/) |
| National average RevPAR (estimated) | ~$125-$145/night | Calculated: $245 ADR x 53% occ |
| Top 10% performers RevPAR | ~$175-$250/night | [Key Data](https://www.keydatadashboard.com/blog/what-the-top-10-of-short-term-rental-builds-get-right) |

### Seasonality Impact

| Metric | Value | Source |
|--------|-------|--------|
| Peak-to-trough occupancy swing | ~26 percentage points (42% to 68%) | [AirDNA](https://www.airdna.co/blog/short-term-rentals-reshaping-seasonality-trends) |
| Peak season revenue multiplier | **1.5-2.5x** off-season revenue | Calculated from occupancy + ADR swings |
| Florida peak (March) | 84% occupancy | [AirDNA](https://www.airdna.co/blog/short-term-rentals-reshaping-seasonality-trends) |
| Seasonal revenue coefficient (high seasonality markets) | 0.40-0.43 (Croatia, Portugal) | [AirROI](https://www.airroi.com/blog/short-term-rental-seasonality) |
| Low seasonality markets | Urban centers, business travel hubs | Industry knowledge |

**Calculator recommendation**: Apply monthly seasonality curve. Default to US average, with market-specific adjustments. Peak months (Jun-Aug) at 1.3-1.5x annual average; trough months (Nov-Jan) at 0.6-0.8x.

### Average Length of Stay

| Metric | Value | Source |
|--------|-------|--------|
| **Overall average** | **3.7-4.3 nights** | [SearchLogistics](https://www.searchlogistics.com/learn/statistics/airbnb-statistics/), [Backlinko](https://backlinko.com/airbnb-stats) |
| Long-term stays (28+ days) | 17% of all gross nights | [Backlinko](https://backlinko.com/airbnb-stats) |
| Trend | Slightly declining Y/Y (was 3.8 in 2023, 3.7 in 2024) | [Airbtics](https://airbtics.com/average-airbnb-stay-length/) |
| Professional/unique properties | Up to 5.5 nights (LA example) | [Open Air Homes](https://openairhomes.com/2025-airbnb-average-length-of-stay/) |

**Verdict on "3-5 nights" assumption: CORRECT. National average of 3.7-4.3 nights falls squarely in this range. Use 4.0 nights as default for turnover frequency calculations.**

---

## 4. STR vs LTR Comparison

### Breakeven Occupancy

| Metric | Value | Source |
|--------|-------|--------|
| **Typical breakeven vs LTR** | **~50% occupancy** | [Nowistay](https://www.nowistay.com/ressources/short-term-vs-long-term-rental-profitability) |
| With automation/lower costs | 35-40% occupancy | [Nowistay](https://www.nowistay.com/ressources/short-term-vs-long-term-rental-profitability) |
| In premium tourist markets | 40-45% | Estimated from data |
| In competitive/oversupplied markets | 55-65% | Estimated from data |

### Revenue Premium

| Metric | Value | Source |
|--------|-------|--------|
| **Gross revenue STR vs LTR** | **~77% higher** | [The Offer Sheet](https://local.theoffersheet.com/guides/str-vs-ltr/) |
| Premium tourist markets (net) | 80-100% higher net profit | Market data |
| **Net income retention: STR** | **40-50% of gross** | [AvantStay](https://avantstay.com/blog/calculate-noi-short-term-rentals/) |
| **Net income retention: LTR** | **~65% of gross** | [AvantStay](https://avantstay.com/blog/calculate-noi-short-term-rentals/) |

### Hidden Costs That Erode STR Profitability

1. **Platform fees**: 8-15.5% of every booking (vs 0% for LTR)
2. **Cleaning/turnover**: 10-15% of revenue (vs near-zero for LTR)
3. **Furnishing & replacement**: $15K-$45K initial + 2% annual (vs minimal for LTR)
4. **Higher utilities**: Host-paid, guests use more ($200-$500/mo vs tenant-paid for LTR)
5. **Technology stack**: $60-$175/month in software/tools (vs $0 for LTR)
6. **Vacancy/seasonality risk**: Revenue swings 40-60% between seasons (vs stable LTR)
7. **Higher insurance**: 1.3-2.0x LTR insurance costs
8. **Occupancy taxes/TOT**: 3-15% depending on jurisdiction (vs none for LTR)
9. **Guest supplies/amenities**: $20-$50/turnover for consumables
10. **Time/management**: 3-5x more active management required (or 25-40% PM fee)

**Key insight**: STR gross revenue is ~77% higher, but operating expenses consume 50-60% vs 35-40% for LTR. After all costs, the net advantage is closer to 20-40% in favorable markets, and can be negative in oversupplied or highly regulated markets.

---

## 5. Regulatory Risk

### Scale of Restrictions

| Metric | Value | Source |
|--------|-------|--------|
| Regulatory approach | Primarily local (city/county), not state | [Minut](https://www.minut.com/blog/short-term-rental-laws-us) |
| Cities with some form of STR regulation | **Hundreds** (no exact count; virtually every major metro) | [Hostaway](https://www.hostaway.com/blog/short-term-rental-regulations-in-the-usa/) |
| Trend (2025-2026) | Moving toward regulation/taxation, not outright bans | [Rent Responsibly](https://www.rentresponsibly.org/year-end-2025-state-short-term-rental-bills-and-whats-ahead-in-2026/) |

### Most Common Restriction Types

1. **Registration/licensing requirements** -- most common; requires permit, fee, and safety compliance
2. **Primary residence requirements** -- host must live in the property (NYC, SF, Boston)
3. **Night caps** -- limit on annual unhosted nights (SF: 90 nights/yr)
4. **Zoning restrictions** -- STR only allowed in certain zones (Nashville, many suburbs)
5. **Occupancy taxes** -- 3-15% lodging/transient occupancy tax
6. **Safety requirements** -- fire extinguishers, smoke detectors, liability insurance minimums
7. **HOA/condo restrictions** -- many HOAs prohibit or restrict STR
8. **Density caps** -- limit % of units in a building/area that can be STR

### Major Markets with Severe Restrictions or Effective Bans

| City | Restriction | Source |
|------|-------------|--------|
| **New York City** | Local Law 18: host must be present, max 2 guests, registration required. Whole-unit STR effectively banned. | [AirDNA](https://www.airdna.co/blog/new-york-city-airbnb-crackdown) |
| **San Francisco** | Primary residence only, 90-night cap for unhosted stays, registration required | [IGMS](https://www.igms.com/airbnb-regulations-by-state/) |
| **Boston** | Investor-owned apartments banned for STR; only primary residence or room | [BAM](https://nowbam.com/airbnb-restrictions-25-cities-cracking-down-on-short-term-rentals/) |
| **Miami Beach** | Rentals under 6 months banned in most residential areas | [Truvi](https://truvi.com/blog/airbnb-regulations-by-city/) |
| **Nashville** | Non-owner-occupied permits limited to certain zones only | [IGMS](https://www.igms.com/airbnb-regulations-by-state/) |
| **Dallas** | Attempted ban on STR in single-family zones (court injunction, status TBD) | [Minut](https://www.minut.com/blog/short-term-rental-laws-us) |
| **Houston** | New 2026 ordinance requiring registration and safety compliance | [Idyllic Pursuit](https://www.idyllicpursuit.com/10-cities-that-effectively-outlawed-airbnb-in-2025-and-where-to-stay-instead/) |
| **Los Angeles** | Primary residence only, recordkeeping required | [Minut](https://www.minut.com/blog/short-term-rental-laws-us) |

### Occupancy/Lodging Tax Rates (Examples)

| Jurisdiction | Tax Rate | Source |
|-------------|----------|--------|
| Phoenix, AZ | 8.6% sales + 14.5% lodging = ~23% total | [Minut](https://www.minut.com/blog/short-term-rental-tax) |
| San Diego, CA | 11.75-13.75% | [Avalara](https://www.avalara.com/mylodgetax/en/blog/2025/04/new-lodging-tax-rates-for-san-diego-short-term-rentals-take-effect-may-1-2025.html) |
| Chicago, IL | 6.5% + additional surcharges | [Minut](https://www.minut.com/blog/short-term-rental-tax) |
| Massachusetts | 5.7% state + local option | [Mass.gov](https://www.mass.gov/info-details/room-occupancy-excise-tax) |
| NYC | 5.875% + $2/day | [NY.gov](https://www.tax.ny.gov/pubs_and_bulls/tg_bulletins/st/hotel_and_motel_occupancy.htm) |

**Calculator recommendation**: Include occupancy tax as a required input with a default of 10% (US median estimate). Flag this prominently -- many new STR investors forget this cost entirely.

---

## 6. Key Formulas Used in Industry

### AirDNA Rentalizer

| Component | Methodology | Source |
|-----------|-------------|--------|
| Comparable selection | Properties within 10-mile radius, matched on bedrooms, bathrooms, guest count | [AirDNA Help](https://help.airdna.co/en/articles/10559022-rentalizer-revenue-calculator) |
| Revenue calculation | Weighted average of comps' ADR x Occupancy, adjusted for seasonality | [AirDNA Help](https://help.airdna.co/en/articles/8374548-how-does-airdna-calculate-revenue) |
| Revenue definition | Sum of nightly rates + cleaning fees - host discounts - OTA service fees | [AirDNA Help](https://help.airdna.co/en/articles/8374548-how-does-airdna-calculate-revenue) |
| Output | 12-month projected revenue, monthly breakdown, revenue range (confidence interval) | [AirDNA Help](https://help.airdna.co/en/articles/10559022-rentalizer-revenue-calculator) |

### Mashvisor

| Component | Methodology | Source |
|-----------|-------------|--------|
| Revenue formula | Daily Rate x Occupancy Rate (days) | [Mashvisor](https://www.mashvisor.com/blog/short-term-rental-income-calculator/) |
| Expense calculation | Itemized from expenses_map API (cleaning, utilities, management, platform fees, reserves) | [Mashvisor](https://www.mashvisor.com/blog/how-to-forecast-rental-income/) |
| ROI | (Revenue - Expenses) / Total Investment x 100 | [Mashvisor](https://www.mashvisor.com/blog/mashvisors-rental-property-calculator/) |
| Data source | Aggregated comparable properties, updated regularly | [Mashvisor](https://www.mashvisor.com/blog/rental-estimate-calculator/) |

### Rabbu

| Component | Methodology | Source |
|-----------|-------------|--------|
| Core metric | **RevPAN** (Revenue Per Available Night) = ADR x Occupancy | [Rabbu](https://rabbu.com/blog/how-rabbu-uses-our-airbnb-calculator-internally) |
| Comp selection | Narrowed by photos and amenity similarity, not just bedroom count | [Rabbu](https://rabbu.com/blog/how-rabbu-uses-our-airbnb-calculator-internally) |
| Data refresh | Weekly | [Rabbu](https://rabbu.com/blog/how-rabbu-uses-our-airbnb-calculator-internally) |
| Output | Seasonalized monthly revenue, 25th/75th percentile range | [Rabbu](https://rabbu.com/airbnb-calculator) |
| Important caveat | **Gross revenue only** -- does not include cleaning fees, platform fees, or PM fees | [Rabbu](https://rabbu.com/blog/how-rabbu-uses-our-airbnb-calculator-internally) |

### Industry-Standard STR Formulas

```
Gross Revenue = ADR x Occupancy Rate x 365

RevPAR (Revenue Per Available Room/Rental) = ADR x Occupancy Rate

Net Revenue = Gross Revenue - Platform Fees - Occupancy Taxes

NOI = Net Revenue - Operating Expenses
    where Operating Expenses = Cleaning + Utilities + Insurance + Maintenance
                             + Property Management + Technology + Supplies
                             + FF&E Reserve + Licensing/Permits

Cash Flow = NOI - Debt Service (mortgage P&I)

Cap Rate = NOI / Property Value

Cash-on-Cash Return = Annual Cash Flow / Total Cash Invested

STR Premium = (STR Annual Revenue / LTR Annual Rent) - 1

Breakeven Occupancy = (All Fixed Costs + Variable Costs at 0% occ) /
                      (ADR - Variable Cost per Occupied Night)
```

---

## 7. Summary: Assumption Validation Scorecard

| Assumption | Our Value | Actual Value | Verdict |
|-----------|-----------|-------------|---------|
| Airbnb host fee | 3% | **15.5%** | **WRONG -- critical error. Must use 15.5%.** |
| Airbnb split fee (host/guest) | 3%/14% | **Discontinued** | **WRONG -- model no longer exists.** |
| VRBO fee | 5% | **8% total** (5% + 3% processing) | **TOO LOW -- use 8%.** |
| Booking.com commission | Not specified | **15% avg + 2.2% processing** | Use 15% default |
| Cleaning % of revenue | Not specified | **10-15%** | Use 12% default |
| Per-turnover cleaning | Not specified | **$50-$150** (by bedroom count) | Use bedroom-based defaults |
| Annual furnishing reserve | Not specified | **~2% of gross revenue** | Use 2% |
| STR insurance multiplier vs LTR | 2.5x | **1.3-2.0x** | **TOO HIGH -- use 1.5x default** |
| STR maintenance multiplier | 1.5x | **~1.3-1.5x** | **CORRECT** |
| PM fees | 20-35% | **20-40%** (full service 25-40%) | **SLIGHTLY LOW on upper end** |
| WiFi/Internet | Not specified | **$40-$70/month** | Use $60 default |
| Utilities total | Not specified | **$200-$500/month** | Use $350 default |
| Dynamic pricing tools | Not specified | **$20-$40/month** | Use $30 default |
| Smart lock (amortized) | Not specified | **$8-$25/month** | Use $15 default |
| National average ADR | Not specified | **$230-$260** (US) | Use $245 default |
| National occupancy rate | Not specified | **50-55%** | Use 52% default |
| Seasonality swing | Not specified | **Peak 1.5-2.5x off-season** | Apply monthly curve |
| Average stay length | 3-5 nights | **3.7-4.3 nights** | **CORRECT** |
| STR breakeven vs LTR | Not specified | **~50% occupancy** | Use in comparison tool |
| STR revenue premium | Not specified | **~77% gross, ~20-40% net** | Use in comparison tool |
| Occupancy tax | Not specified | **3-15%** (varies by city) | Use 10% default, require input |

---

## 8. Recommendations for Calculator Engine Design

### Critical Corrections
1. **Airbnb fee must be 15.5%**, not 3%. This is the #1 most impactful correction.
2. **VRBO fee should be 8%**, not 5%. Include processing fee.
3. **Insurance multiplier should default to 1.5x**, not 2.5x.
4. **PM fee range should be 20-40%**, with 25% as default.

### Must-Have Features
1. **Per-channel fee calculation** -- allow users to input booking mix (% Airbnb, % VRBO, % direct)
2. **Seasonality curve** -- monthly revenue projection, not flat annual average
3. **Turnover-based cleaning** -- calculate from (365 x occupancy rate) / avg stay length
4. **Occupancy tax input** -- too variable to assume, must be user-provided
5. **STR vs LTR comparison** -- show breakeven occupancy and net income comparison
6. **Confidence intervals** -- show P25/P50/P75 scenarios, not just point estimates

### Revenue Formula (Recommended)
```
Monthly Gross = ADR x Days_in_Month x Occupancy_Rate x Seasonality_Factor

Cleaning Revenue = Turnovers_per_Month x Cleaning_Fee_Charged
  (where Turnovers = Occupied_Nights / Avg_Stay_Length)

Total Gross = Monthly Gross + Cleaning Revenue

Platform Fees = Total Gross x Weighted_Platform_Fee_Rate
Occupancy Tax = Total Gross x Local_Tax_Rate

Net Revenue = Total Gross - Platform Fees - Occupancy Tax

Operating Expenses:
  Cleaning Cost = Turnovers x Cost_per_Clean
  Utilities = Fixed monthly (host input)
  Insurance = Annual / 12
  Maintenance = Property Value x 1% / 12 (or 1.5x LTR rate)
  PM Fee = Net Revenue x PM_Rate (if applicable)
  Technology = Monthly stack cost
  FF&E Reserve = Total Gross x 2% / 12
  Supplies = Turnovers x $25

NOI = Net Revenue - Sum(Operating Expenses)
Cash Flow = NOI - Monthly Mortgage Payment
```

---

## Sources

### Platform Fees
- [Airbnb Help Center - Service Fees](https://www.airbnb.com/help/article/1857)
- [Beyond Pricing - Airbnb Fee Changes 2025](https://www.beyondpricing.com/blog/airbnb-service-fee-changes-2025)
- [Hostaway - Airbnb Host-Only Fee](https://www.hostaway.com/blog/airbnb-host-only-fee-what-to-know-about-the-15-percent-host-fee/)
- [Lodgify - Airbnb Host Fees 2026](https://www.lodgify.com/blog/airbnb-host-fees/)
- [VRBO Help - Booking Fee](https://help.vrbo.com/articles/How-is-the-booking-fee-calculated)
- [Host Tools - VRBO Host Fees 2025](https://hosttools.com/blog/short-term-rental-tips/vrbo-host-fees/)
- [Your.Rentals - Booking.com Fees 2025](https://your.rentals/blog/booking-com-fees-how-are-they-calculated/)
- [Hostaway - OTA Commission Rates](https://www.hostaway.com/blog/commission-rates-airbnb-vrbo/)
- [BuildUp Bookings - Direct Booking Fees](https://www.buildupbookings.com/blog/direct-booking-fees/)

### Operating Expenses
- [AirDNA - Airbnb Cleaning Fees 2026](https://www.airdna.co/blog/airbnb-cleaning-fees-what-hosts-need-to-know)
- [4Way Contractors - Rental Turnover Cleaning 2026](https://www.4waycontractors.com/rental-turnover-cleaning-2026-standards-checklists/)
- [BeeSetups - STR Furnishing Benchmark Report 2025](https://www.beesetups.com/str-furnishing-benchmark-report-2025)
- [BuildYourBnB - Forecast STR Expenses](https://www.buildyourbnb.com/blog-post/how-to-properly-forecast-expenses-for-your-short-term-rental-property)
- [Steadily - Landlord Insurance Cost 2025](https://www.steadily.com/faq/how-much-does-landlord-insurance-cost)
- [Proper Insure - STR Insurance Cost](https://www.proper.insure/blog/how-much-does-short-term-rental-insurance-cost/)
- [Obie Insurance - STR Insurance Cost Guide](https://www.obieinsurance.com/blog/short-term-rental-insurance-cost)
- [Baselane - Property Management Fees 2026](https://www.baselane.com/resources/how-much-do-property-managers-charge)
- [AirDNA - Property Manager Charges](https://www.airdna.co/blog/how-much-do-property-managers-charge)
- [Hospitable - Property Manager Charges](https://hospitable.com/how-much-property-managers-charge)
- [Belong Home - Rental Property Maintenance Costs 2025](https://belonghome.com/blog/rental-property-maintenance-costs)

### Revenue Benchmarks
- [PriceLabs - US Airbnb Trends 2025](https://hello.pricelabs.co/airbnb-trends-2025/)
- [Affinco - Airbnb Statistics 2026](https://affinco.com/airbnb-statistics/)
- [AirDNA - 2026 STR Outlook Report](https://www.airdna.co/outlook-report)
- [AirDNA - Seasonality Trends](https://www.airdna.co/blog/short-term-rentals-reshaping-seasonality-trends)
- [Guesty - Airbnb Average Occupancy Rates](https://www.guesty.com/blog/airbnb-average-occupancy-rates/)
- [Backlinko - Airbnb Stats 2026](https://backlinko.com/airbnb-stats)
- [Airbtics - Average Airbnb Stay Length](https://airbtics.com/average-airbnb-stay-length/)
- [Engine - Airbnb vs Hotels 2025](https://engine.com/travel-trends-tech/the-2025-hospitality-showdown-a-data-driven-analysis-of-airbnbs-momentum-vs-the-hotel-sectors-resilience)

### STR vs LTR
- [Nowistay - STR vs LTR Profitability 2026](https://www.nowistay.com/ressources/short-term-vs-long-term-rental-profitability)
- [The Offer Sheet - STR vs LTR Guide](https://local.theoffersheet.com/guides/str-vs-ltr/)
- [AvantStay - Calculate STR NOI 2026](https://avantstay.com/blog/calculate-noi-short-term-rentals/)
- [Mashvisor - STR vs LTR 2026](https://www.mashvisor.com/blog/short-term-vs-long-term-rentals-2026/)

### Regulatory
- [Minut - Short-Term Rental Laws US 2026](https://www.minut.com/blog/short-term-rental-laws-us)
- [Rent Responsibly - 2025 STR Bills and 2026 Outlook](https://www.rentresponsibly.org/year-end-2025-state-short-term-rental-bills-and-whats-ahead-in-2026/)
- [AirDNA - NYC Airbnb Crackdown](https://www.airdna.co/blog/new-york-city-airbnb-crackdown)
- [IGMS - Airbnb Regulations by State](https://www.igms.com/airbnb-regulations-by-state/)
- [Avalara - San Diego Lodging Tax 2025](https://www.avalara.com/mylodgetax/en/blog/2025/04/new-lodging-tax-rates-for-san-diego-short-term-rentals-take-effect-may-1-2025.html)

### Industry Calculators
- [AirDNA Help - Rentalizer](https://help.airdna.co/en/articles/10559022-rentalizer-revenue-calculator)
- [AirDNA Help - Revenue Calculation](https://help.airdna.co/en/articles/8374548-how-does-airdna-calculate-revenue)
- [Mashvisor - Short-Term Rental Income Calculator](https://www.mashvisor.com/blog/short-term-rental-income-calculator/)
- [Rabbu - How We Use Our Calculator](https://rabbu.com/blog/how-rabbu-uses-our-airbnb-calculator-internally)
- [Rabbu - Airbnb Calculator](https://rabbu.com/airbnb-calculator)
