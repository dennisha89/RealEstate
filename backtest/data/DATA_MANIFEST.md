# Backtest Data Manifest
Generated: 2026-03-16

## Months of Supply / Inventory Files (New This Session)

### months_supply_redfin.csv
- Source: Redfin Data Center (S3 public)
- URL: https://redfin-public-data.s3.us-west-2.amazonaws.com/redfin_market_tracker/redfin_metro_market_tracker.tsv000.gz
- Coverage: 932 metro areas, All Residential property type
- Date range: 2012-01-01 to 2026-01-01
- Rows: 158,830
- Key columns: period_begin, region, state_code, months_of_supply, inventory, homes_sold, new_listings, median_sale_price, median_dom
- Notes: 49 of top 50 US metros covered. Albuquerque NM not in Redfin metro coverage.

### months_supply_new_homes_MSACSR.csv
- Source: FRED (U.S. Census Bureau, HUD)
- Series ID: MSACSR
- URL: https://fred.stlouisfed.org/series/MSACSR
- Coverage: National (United States)
- Date range: 2000-01-01 to 2025-12-01
- Rows: 312
- Notes: New homes only (not existing). Seasonally adjusted. Ratio of new homes for sale to homes sold.

### inventory_active_listings_national_ACTLISCOUUS.csv
- Source: FRED (Realtor.com data)
- Series ID: ACTLISCOUUS
- URL: https://fred.stlouisfed.org/series/ACTLISCOUUS
- Coverage: National (United States)
- Date range: 2016-07-01 to 2025-12-01
- Rows: 114
- Notes: Count of active listings for sale. Not seasonally adjusted.

### inventory_active_listings_msa_ACTLISCOU.csv
- Source: FRED (Realtor.com data)
- Series pattern: ACTLISCOU{CBSA_CODE}
- Coverage: Top 50 US metros by population (50 series)
- Date range: 2016-07-01 to 2025-12-01 (most series); Cleveland starts 2018
- Rows: 5,684
- Columns: observation_date, cbsa_code, metro_name, fred_series_id, active_listing_count
- Notes: 50/50 metros successful. Active listing count, not seasonally adjusted.
- CBSA codes included: 35620 (NYC), 31080 (LA), 16980 (Chicago), 19100 (Dallas), 26420 (Houston),
  47900 (DC), 37980 (Philadelphia), 33100 (Miami), 12060 (Atlanta), 38060 (Phoenix),
  14460 (Boston), 41860 (SF), 41740 (San Diego), 42660 (Seattle), 19820 (Detroit),
  33460 (Minneapolis), 41180 (St Louis), 40140 (Riverside), 26900 (Indianapolis), 17460 (Cleveland),
  18140 (Columbus), 19740 (Denver), 28140 (Kansas City), 40380 (Rochester), 39300 (Providence),
  36540 (Orlando), 45300 (Tampa), 27260 (Jacksonville), 49340 (Tucson), 27980 (Knoxville),
  12420 (Austin), 29820 (Las Vegas), 32820 (Memphis), 13820 (Birmingham), 34980 (Nashville),
  39580 (Raleigh), 16740 (Charlotte), 24340 (Grand Rapids), 25540 (Hartford), 36420 (Oklahoma City),
  46140 (Tulsa), 20500 (El Paso), 41620 (Salt Lake City), 45820 (Bakersfield), 44600 (Stockton),
  12580 (Baltimore), 38300 (Pittsburgh), 10740 (Albuquerque), 17140 (Cincinnati), 30460 (Louisville)

### inventory_supply_score_msa_SUSCMSA.csv
- Source: FRED (Realtor.com data)
- Series pattern: SUSCMSA{CBSA_CODE}
- Coverage: 49 of top 50 US metros (Stockton CA / CBSA 44600 has no series)
- Date range: 2017-08-01 to 2026-01-01 (most series)
- Rows: 4,959
- Columns: observation_date, cbsa_code, metro_name, fred_series_id, supply_score
- Notes: Supply score is an index (0-100) comparing metro's median days on market ranking vs other metros.
  Higher score = more supply (buyer's market). Lower score = less supply (seller's market).
  This is NOT months of supply — it is a relative ranking index.

## FRED Series Not Available at MSA Level
- HOSSUPUSM673N (Existing Homes Months Supply): Only available nationally. FRED only has this
  series starting from early 2025 — NAR has not published historical MSA-level months supply
  data through FRED.
- True months-of-supply at MSA level (existing homes, 2012+) is only available from:
  1. Redfin (months_supply_redfin.csv — best option, 2012+)
  2. AEI Housing Center Excel (100 metros, 2012+, requires manual download)
  3. NAR (paid subscription for historical MSA data)

## Previously Existing Files
- fhfa_hpi_msa.csv — FHFA House Price Index, MSA level
- fhfa_hpi_state.csv — FHFA House Price Index, state level
- fred_employment_*.csv — MSA-level employment (32 metros)
- fred_permits_*.csv — Building permits (32 metros + national)
- fred_mortgage30.csv — 30-year fixed mortgage rate (national)
- fred_m2v.csv — M2 money velocity
- fred_us_hpi.csv — US national HPI
- irs_migration_*.csv — IRS SOI county-to-county migration (2010-2022)
- zillow_zhvi_metro.csv — Zillow Home Value Index, metro level
- zillow_zhvi_state.csv — Zillow Home Value Index, state level
- wrluri_2018.zip — Wharton Residential Land Use Regulatory Index (2018)

## Richmond Fed R-squared Note
The Richmond Fed (March 2025) finding of R2=0.347 for months-of-supply as
the single strongest predictor of house price growth used existing home sales
months supply. The Redfin MONTHS_OF_SUPPLY column is the best available
free proxy for this at MSA level (2012-present). FRED ACTLISCOU series
(active listing count) can be used to construct an implied months supply
by dividing by a rolling 12-month average of homes sold if needed.
