# Operating Expense Data Sources Research
**Date**: 2026-03-16
**Purpose**: Identify ZIP/county-level data sources to replace hardcoded national averages for property tax, insurance, vacancy, maintenance, and management fees.

## Current Problem

Every deal metric (cap rate, DSCR, cash-on-cash, IRR) depends on accurate operating expenses. We currently hardcode national averages that are dangerously wrong:

| Expense | Current Hardcode | Actual Range | Error Magnitude |
|---------|-----------------|--------------|-----------------|
| Property tax | 1.25% of value | 0.2% (HI) to 2.49% (NJ) | Up to 12x off |
| Insurance | 0.7% of value | 0.11% (HI) to 1.5%+ (OK/FL) | Up to 2-14x off |
| Vacancy | 8% flat | 3-4% (hot) to 12%+ (secondary) | Up to 3x off |
| Maintenance | Rule-of-thumb | Varies 2-5x by property age | Unquantified |
| Mgmt fees | 10% flat | 6% (CA luxury) to 12% (rural) | ~2x off |

---

## 1. PROPERTY TAX BY COUNTY/ZIP

### Source A: Census ACS (B25103 + B25077) -- RECOMMENDED: USE
- **Name**: U.S. Census American Community Survey
- **URL**: https://api.census.gov/data/2024/acs/acs5
- **What it provides**: B25103 = Median Real Estate Taxes Paid; B25077 = Median Home Value. Divide B25103 by B25077 to get effective tax rate.
- **Geographic granularity**: ZIP Code Tabulation Area (ZCTA), county, tract, state, metro
- **Update frequency**: Annual (5-year rolling estimates, released ~September each year)
- **Cost**: FREE
- **API**: Yes, free Census API with key (no rate limit published, but ~500 req/day practical). Example call: `https://api.census.gov/data/2024/acs/acs5?get=B25103_001E,B25077_001E&for=zip%20code%20tabulation%20area:*`
- **Accuracy note**: These are medians from survey data, not actual millage rates. Good for ZIP-level estimates. Off by 0.1-0.3% vs actual in some areas due to homestead exemptions included in survey responses.
- **Recommendation**: **USE as primary source.** Free, ZIP-level, API-accessible, updated annually. Already using Census API for other data.

### Source B: API Ninjas Property Tax API -- RECOMMENDED: USE AS SECONDARY
- **Name**: API Ninjas Property Tax API
- **URL**: https://api-ninjas.com/api/propertytax
- **What it provides**: 25th, 50th, 75th percentile effective property tax rates by region (mostly ZIP-based).
- **Geographic granularity**: ZIP code, county, city
- **Update frequency**: Unknown (likely annual)
- **Cost**: Free tier available (10,000 req/month on free plan based on API Ninjas general pricing). Paid plans from $9.99/mo.
- **API**: Yes, REST API. Simple GET with `zip`, `city`, or `county` params.
- **Recommendation**: **USE as validation/secondary.** Provides percentile bands (P25/P50/P75) which give confidence intervals. Cross-reference with Census.

### Source C: ATTOM Assessor Data -- RECOMMENDED: INVESTIGATE
- **Name**: ATTOM Data Solutions
- **URL**: https://api.developer.attomdata.com/docs
- **What it provides**: Actual assessed value + tax amount per property. County-level effective rates published in annual tax report.
- **Geographic granularity**: Property-level, county-level aggregates
- **Update frequency**: Quarterly (property-level), annual (county report)
- **Cost**: Starts at ~$95/month. 30-day free trial. Already in our P0 data source list.
- **API**: Yes, REST API.
- **Recommendation**: **INVESTIGATE.** We already plan to use ATTOM. Check if our ATTOM tier includes tax assessment fields. If so, this becomes the most accurate source (actual tax, not survey median).

### Source D: Lincoln Institute of Land Policy -- RECOMMENDED: SKIP
- **Name**: Significant Features of the Property Tax Database
- **URL**: https://www.lincolninst.edu/data/significant-features-property-tax/
- **What it provides**: Property tax policy comparisons (exemptions, limits, classification rules). Not rate data per se.
- **Geographic granularity**: State-level only
- **Update frequency**: Annually
- **Cost**: Free
- **API**: No (web interface + downloadable tables)
- **Recommendation**: **SKIP for rate data.** Useful reference for understanding why rates differ (homestead exemptions, assessment ratios), but state-level granularity is insufficient.

### Source E: PlainPropertyTax -- RECOMMENDED: SKIP
- **Name**: PlainPropertyTax
- **URL**: https://plainpropertytax.com
- **What it provides**: Property tax data for 3,153 counties (sourced from Census ACS)
- **Geographic granularity**: County
- **Update frequency**: Follows Census ACS releases
- **Cost**: Free (web lookup)
- **API**: No
- **Recommendation**: **SKIP.** It's a UI wrapper around Census ACS data we can query directly. No API.

---

## 2. INSURANCE BY ZIP CODE

### Source A: FEMA National Risk Index -- RECOMMENDED: USE
- **Name**: FEMA National Risk Index (NRI)
- **URL**: https://hazards.fema.gov/nri/data-resources + https://www.fema.gov/about/openfema/data-sets/national-risk-index-data
- **What it provides**: Risk scores for 18 natural hazards (flood, wildfire, earthquake, tornado, hurricane, hail, etc.) with Expected Annual Loss in dollars. Census tract level.
- **Geographic granularity**: Census tract and county (can map to ZIP via crosswalk)
- **Update frequency**: ~Annual (v1.20 current as of late 2025)
- **Cost**: FREE
- **API**: Downloadable datasets (GeoJSON, shapefile, geodatabase) via OpenFEMA. Also available as ArcGIS feature service.
- **Use case**: Not insurance premiums directly, but the risk scores are the PRIMARY driver of insurance cost variation. A high NRI composite score = high insurance cost.
- **Recommendation**: **USE.** Free, tract-level, quantifies the risk that drives premiums. Build a model: NRI score -> estimated insurance premium multiplier vs national average.

### Source B: First Street Foundation (Risk Factor) -- RECOMMENDED: INVESTIGATE
- **Name**: First Street Foundation Climate Risk Data
- **URL**: https://firststreet.org / https://riskfactor.com
- **What it provides**: Property-level flood, wildfire, wind, and heat risk scores (1-10 scale). 30-year forward-looking projections.
- **Geographic granularity**: Property-level (address)
- **Update frequency**: Continuously updated models
- **Cost**: Free for consumer lookup (riskfactor.com). API access requires commercial license -- pricing not published (contact sales). Academic/nonprofit: free aggregate data via AWS Open Data.
- **API**: Yes (Climate Risk API, Enterprise API, Raster Map API). Requires license.
- **Recommendation**: **INVESTIGATE.** Best-in-class property-level risk data. Need to determine if pricing is feasible. The free AWS Open Data aggregate dataset could work as a starting point.

### Source C: NAIC Homeowners Insurance Report -- RECOMMENDED: USE AS REFERENCE
- **Name**: National Association of Insurance Commissioners
- **URL**: https://content.naic.org/publications
- **What it provides**: Average homeowners insurance premiums by state, policy form, and coverage amount.
- **Geographic granularity**: State-level only
- **Update frequency**: Annual (latest available: 2022 data, ~2 year lag)
- **Cost**: Free (PDF reports downloadable)
- **API**: No
- **Recommendation**: **USE AS REFERENCE TABLE.** State-level baseline premiums. Combine with FEMA NRI risk scores to estimate sub-state variation. Not granular enough alone.

### Source D: Quadrant Information Services (via Insure.com/MoneyGeek) -- RECOMMENDED: SKIP (scraping risk)
- **Name**: Quadrant Information Services
- **URL**: https://www.insure.com/home-insurance/average-home-premiums.html (consumer-facing)
- **What it provides**: Homeowners insurance premiums by ZIP code from 134 insurers across ~38 million quotes.
- **Geographic granularity**: ZIP code
- **Update frequency**: Annual
- **Cost**: Enterprise-only (Quadrant sells to insurers). Consumer sites (Insure.com, MoneyGeek, NerdWallet) publish derived data.
- **API**: No public API. Quadrant sells B2B only.
- **Recommendation**: **SKIP.** ZIP-level data exists but is locked behind enterprise licensing. The consumer-facing sites cannot be scraped legally. Better to model from FEMA NRI + NAIC baselines.

### Source E: Verisk / CoreLogic -- RECOMMENDED: SKIP
- **Name**: Verisk LOCATION Suite / CoreLogic Hazard Risk
- **URL**: https://www.verisk.com/products/location-specific-risk-data/ / https://www.corelogic.com/insurance/
- **What it provides**: Address-level hazard risk data used by insurers for underwriting.
- **Geographic granularity**: Address-level
- **Update frequency**: Continuous
- **Cost**: Enterprise pricing (typically $10K+/year minimum)
- **API**: Yes
- **Recommendation**: **SKIP.** Too expensive for our stage. These power the insurance industry but are priced for carriers and large platforms.

### Insurance Strategy Summary
**Best approach**: NAIC state-level baseline + FEMA NRI risk multiplier. Formula:
```
estimated_premium = naic_state_avg * (1 + nri_risk_adjustment)
```
Where `nri_risk_adjustment` is calibrated from the Expected Annual Loss fields in the NRI dataset. This gives sub-state variation without paying for Quadrant/Verisk data.

---

## 3. VACANCY BY ZIP/MSA

### Source A: Census ACS B25004 -- RECOMMENDED: USE
- **Name**: U.S. Census ACS Table B25004 (Vacancy Status)
- **URL**: https://api.census.gov/data/2024/acs/acs5 (table B25004)
- **What it provides**: Count of vacant units by type: for rent, for sale, rented/sold not occupied, seasonal, migrant, other. Calculate rental vacancy rate = (for-rent vacant) / (total rental units).
- **Geographic granularity**: ZCTA, county, tract, state, metro
- **Update frequency**: Annual (5-year ACS)
- **Cost**: FREE
- **API**: Yes, same Census API. Example: `?get=B25004_002E,B25004_001E&for=zip%20code%20tabulation%20area:*`
- **Accuracy note**: 5-year estimates smooth volatility. Good for structural vacancy, less responsive to current market conditions. Margin of error can be large for small ZCTAs.
- **Recommendation**: **USE as baseline.** Free, ZIP-level. Pair with a more current source for market-responsive adjustments.

### Source B: HUD Aggregated USPS Vacancy Data -- RECOMMENDED: USE
- **Name**: HUD USPS Vacancy Data
- **URL**: https://www.huduser.gov/portal/datasets/usps.html
- **What it provides**: Aggregate count of addresses identified as vacant (no mail collected for 90+ days) by USPS carriers. Residential and business, vacant and no-stat.
- **Geographic granularity**: Census tract (publicly), county, congressional district. ZIP-level requires sublicense agreement.
- **Update frequency**: QUARTERLY (much more current than ACS)
- **Cost**: FREE (click-through license agreement)
- **API**: No API -- downloadable flat files (CSV)
- **Recommendation**: **USE.** Quarterly updates make this the most current free vacancy signal. Tract-level maps to ZIP via crosswalk. Captures actual physical vacancy (no mail = no occupant), not survey estimates.

### Source C: Zillow Research Data (ZORI) -- RECOMMENDED: USE (INDIRECT)
- **Name**: Zillow Observed Rent Index + Research Data
- **URL**: https://www.zillow.com/research/data/
- **What it provides**: Rent indices, inventory, days on market, price cuts -- all proxies for vacancy pressure. No direct vacancy rate published.
- **Geographic granularity**: ZIP code, city, county, metro, state
- **Update frequency**: Monthly
- **Cost**: FREE (CSV downloads)
- **API**: No public API for research data (CSV download only). Zillow API exists but focuses on property data.
- **Recommendation**: **USE as supplementary signal.** Days-on-market and inventory metrics are leading indicators of vacancy changes. Download monthly CSVs. Already tracking Zillow data in some engines.

### Source D: RentCast -- RECOMMENDED: INVESTIGATE
- **Name**: RentCast API
- **URL**: https://developers.rentcast.io
- **What it provides**: Rent estimates, market statistics, listings data. Market endpoint includes vacancy-related signals.
- **Geographic granularity**: ZIP code, city
- **Update frequency**: Real-time (listings-based)
- **Cost**: Free tier: 50 API calls/month. Paid starts at $40/mo (1,000 calls). Already in our P0 data source list.
- **API**: Yes, REST API.
- **Recommendation**: **INVESTIGATE.** Already planned as a data source. Check if market statistics endpoint returns vacancy rate or proxy metrics.

### Vacancy Strategy Summary
**Best approach**: Census ACS B25004 as structural baseline + HUD/USPS quarterly data for trend adjustment + Zillow days-on-market as leading indicator.

---

## 4. MAINTENANCE / CAPEX BY PROPERTY AGE

### Source A: Census American Housing Survey (AHS) -- RECOMMENDED: USE
- **Name**: U.S. Census American Housing Survey
- **URL**: https://www.census.gov/programs-surveys/ahs/data/interactive/ahstablecreator.html
- **What it provides**: Maintenance costs, home improvement costs, disaster repair costs -- cross-tabulated by year built, region, tenure, structure type.
- **Geographic granularity**: National + 25 metro areas (biennial rotation)
- **Update frequency**: Biennial (odd years). Latest: 2023 data.
- **Cost**: FREE
- **API**: AHS Table Creator (interactive) + Public Use Microdata (downloadable)
- **Key limitation**: Only 25 metros sampled per cycle. National data is useful for age-based curves; metro data limited.
- **Recommendation**: **USE for age-based maintenance curves.** Extract maintenance cost by decade-of-construction from national data. Apply as multiplier: 1960s home = X% more than 2010s home.

### Source B: IREM Income/Expense IQ -- RECOMMENDATION: SKIP (DISCONTINUED)
- **Name**: IREM Income/Expense Analysis
- **URL**: https://www.irem.org/tools/income-expense-iq (DEFUNCT as of Dec 31, 2025)
- **What it provided**: Detailed operating expense benchmarks by metro, property type, and age. 4,800+ property submissions. 2023 national average: OpEx ratio = 41% of gross rent.
- **Geographic granularity**: Was metro-level (109 markets)
- **Update frequency**: Was annual
- **Cost**: Was subscription-based
- **API**: None
- **Recommendation**: **SKIP.** Platform shut down December 31, 2025. Data no longer available for purchase. The 41% OpEx ratio is useful as a sanity check reference point.

### Source C: NAA Income/Expense Survey -- RECOMMENDATION: SKIP (DISCONTINUED)
- **Name**: National Apartment Association Income/Expense Survey
- **URL**: https://naahq.org/previous-income-expenses-surveys (historical only)
- **What it provided**: Operating income and expenses for 1M+ multifamily units across 109 metros. Line-item expense breakdown.
- **Geographic granularity**: Was metro-level
- **Update frequency**: Was annual
- **Cost**: Was subscription-based
- **Recommendation**: **SKIP.** Also shut down along with IREM/IEQ platform on Dec 31, 2025. Historical reports may be findable but no longer updated.

### Source D: HelloData.ai -- RECOMMENDED: INVESTIGATE
- **Name**: HelloData Multifamily Expense Benchmarks
- **URL**: https://www.hellodata.ai/features/multifamily-operating-expense-benchmarks
- **What it provides**: Operating expense benchmarks from 25,000+ multifamily properties. Benchmarks expenses using 10 most similar properties by year built, unit count, location, and GPR per unit. Line-item breakdown as % of EGI.
- **Geographic granularity**: Property-level (address-based, benchmarked against nearby comps)
- **Update frequency**: Continuously updated
- **Cost**: $0.50/record (pay-per-use) to unlimited tier (contact for pricing)
- **API**: Yes (Expense Benchmarks API)
- **Recommendation**: **INVESTIGATE.** This is the closest replacement for the defunct IREM/NAA data. $0.50/lookup is affordable for on-demand analysis. Key question: does their data include SFR or multifamily only?

### Maintenance/CapEx Strategy Summary
**Best approach**: Build an age-based maintenance cost curve from Census AHS data (free, national). Structure:
```
maintenance_multiplier = f(year_built, region, structure_type)
base: 1.0 for properties built 2010-2024
1.2x for 2000-2009
1.5x for 1990-1999
1.8x for 1980-1989
2.2x for 1970-1979
2.8x for pre-1970
```
Calibrate actual dollar amounts from AHS data. Investigate HelloData for property-specific benchmarks at scale.

---

## 5. MANAGEMENT FEES BY MARKET

### Finding: Fees vary by state/market but are well-documented without API needed.

Published averages from iPropertyManagement.com (2026 survey of management companies):

| State/Market | Avg Fee (% of rent) |
|-------------|---------------------|
| California | 7.44% |
| Florida | 9.04% |
| Arizona | 8.92% |
| Texas | 6.5-7.0% |
| New York | 6-12% |
| National avg | 8.49% |
| Major metros | 8-10% |
| Smaller markets | 10-12% |
| Rural | 12-15% |

**Key factors**: Higher rents = lower percentage (fees have a floor in absolute dollars). SFR = higher % than multifamily. Full-service = higher than leasing-only.

### Recommendation: BUILD STATIC LOOKUP TABLE
- **No API needed.** Management fees are relatively stable and well-documented.
- Build a state-level lookup table from the iPropertyManagement survey data.
- Apply adjustments: SFR vs MF (+1-2%), vacancy inclusion, leasing fee inclusion.
- Update annually from published surveys.
- This is the least critical expense to get ZIP-level precision on -- state-level is sufficient.

---

## IMPLEMENTATION PRIORITY

### Phase 1: Free APIs (Immediate -- 1-2 days of work)
1. **Census ACS API** for property tax rate (B25103/B25077) and vacancy rate (B25004) by ZCTA
   - Already have Census API key
   - Single integration covers two expense categories
   - ZIP-level granularity

2. **HUD/USPS vacancy data** download (quarterly CSVs)
   - Free, tract-level, quarterly updates
   - Augments Census ACS vacancy with more current data

3. **Management fee lookup table** (static data, no API)
   - State-level from published surveys
   - Hardcode the table, update annually

### Phase 2: Risk-Based Insurance Model (3-5 days)
4. **FEMA NRI dataset** download + build insurance cost model
   - Free, tract-level risk scores for 18 hazards
   - Combine with NAIC state-level premium baselines
   - Model: `estimated_premium = state_baseline * risk_multiplier(NRI_score)`
   - Calibrate multiplier against known premium data from Bankrate/Insure.com published tables

### Phase 3: Property-Level Refinement (When budget allows)
5. **ATTOM assessor data** for actual property tax amounts
   - Already planning ATTOM integration (P0 source)
   - Check if current tier includes tax assessment fields

6. **First Street Foundation** for property-level hazard risk
   - Contact for commercial API pricing
   - Would improve insurance estimates significantly

7. **HelloData** for multifamily expense benchmarks
   - $0.50/property for detailed OpEx breakdown
   - Investigate SFR coverage

### Phase 4: Maintenance Model (Ongoing)
8. **Census AHS** for age-based maintenance curves
   - Download and analyze biennial microdata
   - Build decade-of-construction multiplier table

---

## IMPACT ANALYSIS

### Example: Same property in different markets with corrected expenses

**Property**: $300,000 SFR, $2,000/mo gross rent

| Expense | National Avg (current) | Newark NJ (corrected) | Honolulu HI (corrected) | Tampa FL (corrected) |
|---------|----------------------|----------------------|------------------------|---------------------|
| Property tax | $3,750 (1.25%) | $7,200 (2.4%) | $600 (0.2%) | $4,500 (1.5%) |
| Insurance | $2,100 (0.7%) | $1,800 (0.6%) | $900 (0.3%) | $4,500 (1.5%) |
| Vacancy | $1,920 (8%) | $1,440 (6%) | $960 (4%) | $1,680 (7%) |
| Maintenance | $2,400 (1%) | $2,400 | $2,400 | $2,400 |
| Mgmt fee | $2,400 (10%) | $2,160 (9%) | $1,680 (7%) | $2,160 (9%) |
| **Total OpEx** | **$12,570** | **$15,000** | **$6,540** | **$15,240** |
| **NOI** | **$11,430** | **$9,000** | **$17,460** | **$8,760** |
| **Cap Rate** | **3.81%** | **3.00%** | **5.82%** | **2.92%** |

**The cap rate swings from 2.92% to 5.82% -- a 2x difference -- purely from expense accuracy.** This is why this matters.

---

## SOURCES

- [Census ACS API](https://www.census.gov/data/developers/data-sets/acs-5year.html) -- Free, ZIP-level property tax + vacancy
- [Census ACS B25103 Table](https://data.census.gov/table/ACSDT1Y2024.B25103) -- Median real estate taxes paid
- [Census ACS B25004 Table](https://data.census.gov/table/ACSDT1Y2022.B25004) -- Vacancy status
- [HUD USPS Vacancy Data](https://www.huduser.gov/portal/datasets/usps.html) -- Quarterly tract-level vacancy
- [FEMA National Risk Index](https://hazards.fema.gov/nri/data-resources) -- Free, tract-level hazard risk scores
- [NAIC Homeowners Report](https://content.naic.org/publications) -- State-level insurance premiums
- [Census AHS](https://www.census.gov/programs-surveys/ahs.html) -- Maintenance cost by property age
- [API Ninjas Property Tax](https://api-ninjas.com/api/propertytax) -- ZIP-level tax rate percentiles
- [ATTOM Assessor Data](https://www.attomdata.com/data/property-data/assessor-data/) -- Property-level tax assessment
- [First Street Foundation](https://firststreet.org/) -- Property-level climate risk
- [HelloData](https://www.hellodata.ai/) -- Multifamily expense benchmarks ($0.50/record)
- [iPropertyManagement Fee Survey](https://ipropertymanagement.com/research/average-property-management-fees) -- Mgmt fees by state
- [Zillow Research Data](https://www.zillow.com/research/data/) -- Monthly market indicators (free CSV)
- [RentCast API](https://developers.rentcast.io) -- Property + market data (50 free calls/mo)
- [Lincoln Institute Property Tax](https://www.lincolninst.edu/data/significant-features-property-tax/) -- Policy reference (state-level)
- [Bankrate Insurance by State](https://www.bankrate.com/insurance/homeowners-insurance/states/) -- Published premium comparisons
- [PlainPropertyTax](https://plainpropertytax.com/) -- Census-derived county tax rates (no API)
- [GitHub: property-tax-map](https://github.com/mikeasilva/property-tax-map) -- Example Census ACS tax rate calculation
