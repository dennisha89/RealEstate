// ============================================================
// Data Source Connectors
// Integrations with external APIs to pull real market data
// for all dimensions of the analysis system.
// ============================================================

/**
 * Master registry of all data sources used by the platform.
 * Each source has a connector function, refresh schedule,
 * and data freshness tracking.
 */

// --- Types ---

export interface DataSourceConfig {
  census?: { apiKey: string };
  bls?: { apiKey: string };
  fred?: { apiKey: string };
  greatSchools?: { apiKey: string };
  walkScore?: { apiKey: string };
  rentCast?: { apiKey: string };
  attom?: { apiKey: string };
  googlePlaces?: { apiKey: string };
  realtyMole?: { apiKey: string };
}

export interface DataSourceResult<T> {
  data: T;
  source: string;
  fetchedAt: string;
  cacheExpiry: string;
  status: "fresh" | "cached" | "stale" | "error";
  error?: string;
}

// --- Census Bureau API (demographics) ---

/**
 * Fetch American Community Survey (ACS) data by zip code
 * Endpoint: https://api.census.gov/data/{year}/acs/acs5
 *
 * Key variables:
 * B01003_001E - Total population
 * B19013_001E - Median household income
 * B15003_022E - Bachelor's degree
 * B15003_025E - Doctorate degree
 * B23025_005E - Unemployed
 * B25077_001E - Median home value
 * B25064_001E - Median gross rent
 * B25003_003E - Renter occupied housing units
 * B01002_001E - Median age
 */
export async function fetchCensusACS(
  apiKey: string,
  zipCode: string,
  year: number = 2024
): Promise<DataSourceResult<Record<string, string>[]>> {
  const variables = [
    "B01003_001E", // Total population
    "B19013_001E", // Median household income
    "B25077_001E", // Median home value
    "B25064_001E", // Median gross rent
    "B25003_003E", // Renter occupied
    "B25003_002E", // Owner occupied
    "B01002_001E", // Median age
    "B15003_022E", // Bachelor's degree
    "B15003_023E", // Master's degree
    "B15003_024E", // Professional degree
    "B15003_025E", // Doctorate
    "B23025_005E", // Unemployed
    "B23025_002E", // In labor force
    "B07001_065E", // Moved from different state
    "B19001_017E", // Households with income $200k+
  ].join(",");

  const url = `https://api.census.gov/data/${year}/acs/acs5?get=${variables}&for=zip%20code%20tabulation%20area:${zipCode}&key=${apiKey}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Census API error: ${response.statusText}`);
    const data = await response.json();

    return {
      data,
      source: "Census ACS 5-Year",
      fetchedAt: new Date().toISOString(),
      cacheExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      status: "fresh",
    };
  } catch (error) {
    return {
      data: [],
      source: "Census ACS 5-Year",
      fetchedAt: new Date().toISOString(),
      cacheExpiry: new Date().toISOString(),
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Fetch building permits data via FRED API.
 * The Census BPS timeseries endpoint is undocumented/unsupported.
 * FRED series PERMIT (national) and state-level series are the reliable source.
 *
 * Series: PERMIT (total), PERMIT1 (single-family)
 */
export async function fetchBuildingPermits(
  apiKey: string,
  _stateCode: string,
  _year: number = 2024
): Promise<DataSourceResult<{ date: string; value: number }[]>> {
  // Use FRED API for building permits — the Census BPS REST API is not publicly supported
  const fredKey = process.env.FRED_API_KEY;
  if (!fredKey) {
    return { data: [], source: "FRED (Building Permits)", fetchedAt: new Date().toISOString(), cacheExpiry: new Date().toISOString(), status: "error", error: "FRED_API_KEY not configured" };
  }

  return fetchFREDData(fredKey, "PERMIT1");
}

// --- Bureau of Labor Statistics (BLS) API ---

/**
 * Fetch employment data from BLS
 * Series IDs:
 * LAUCN{FIPS}0000000003 - Unemployment rate by county
 * CEU{industry}01 - Employment by industry
 * CES0000000001 - Total nonfarm employment
 */
export async function fetchBLSData(
  apiKey: string,
  seriesIds: string[],
  startYear: number,
  endYear: number
): Promise<DataSourceResult<Record<string, unknown>>> {
  const url = "https://api.bls.gov/publicAPI/v2/timeseries/data/";

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seriesid: seriesIds,
        startyear: startYear.toString(),
        endyear: endYear.toString(),
        registrationkey: apiKey,
      }),
    });

    if (!response.ok) throw new Error(`BLS API error: ${response.statusText}`);
    const data = await response.json();
    return { data, source: "Bureau of Labor Statistics", fetchedAt: new Date().toISOString(), cacheExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), status: "fresh" };
  } catch (error) {
    return { data: {}, source: "Bureau of Labor Statistics", fetchedAt: new Date().toISOString(), cacheExpiry: new Date().toISOString(), status: "error", error: error instanceof Error ? error.message : "Unknown" };
  }
}

// --- Federal Reserve (FRED) API ---

/**
 * Fetch economic data from FRED
 * Key series:
 * MORTGAGE30US - 30-year fixed mortgage rate
 * MSPUS - Median sales price of houses sold
 * CSUSHPINSA - Case-Shiller Home Price Index
 * GDP - Gross Domestic Product
 * UNRATE - Unemployment rate
 * CPIAUCSL - Consumer Price Index
 * FEDFUNDS - Federal Funds Rate
 */
export async function fetchFREDData(
  apiKey: string,
  seriesId: string,
  startDate?: string,
  endDate?: string
): Promise<DataSourceResult<{ date: string; value: number }[]>> {
  const params = new URLSearchParams({
    series_id: seriesId,
    api_key: apiKey,
    file_type: "json",
    sort_order: "desc",
    limit: "60", // 5 years of monthly data
  });
  if (startDate) params.set("observation_start", startDate);
  if (endDate) params.set("observation_end", endDate);

  const url = `https://api.stlouisfed.org/fred/series/observations?${params}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`FRED API error: ${response.statusText}`);
    const json = await response.json();
    const data = json.observations?.map((obs: { date: string; value: string }) => ({
      date: obs.date,
      value: parseFloat(obs.value),
    })).filter((d: { value: number }) => !isNaN(d.value)) || [];

    return { data, source: `FRED (${seriesId})`, fetchedAt: new Date().toISOString(), cacheExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), status: "fresh" };
  } catch (error) {
    return { data: [], source: `FRED (${seriesId})`, fetchedAt: new Date().toISOString(), cacheExpiry: new Date().toISOString(), status: "error", error: error instanceof Error ? error.message : "Unknown" };
  }
}

// --- GreatSchools API ---

/**
 * Fetch school ratings near an address
 */
export async function fetchSchoolRatings(
  apiKey: string,
  lat: number,
  lng: number,
  radius: number = 5 // miles
): Promise<DataSourceResult<{ name: string; type: string; rating: number; distance: number }[]>> {
  const url = `https://gs-api.greatschools.org/nearby-schools?lat=${lat}&lon=${lng}&radius=${radius}&limit=20`;

  try {
    const response = await fetch(url, {
      headers: { "x-api-key": apiKey },
    });

    if (!response.ok) throw new Error(`GreatSchools API error: ${response.statusText}`);
    const json = await response.json();
    const data = json.schools?.map((s: Record<string, unknown>) => ({
      name: s.name,
      type: s.level,
      rating: s.rating,
      distance: s.distance,
    })) || [];

    return { data, source: "GreatSchools", fetchedAt: new Date().toISOString(), cacheExpiry: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), status: "fresh" };
  } catch (error) {
    return { data: [], source: "GreatSchools", fetchedAt: new Date().toISOString(), cacheExpiry: new Date().toISOString(), status: "error", error: error instanceof Error ? error.message : "Unknown" };
  }
}

// --- Walk Score API ---

/**
 * Fetch Walk Score, Transit Score, and Bike Score
 */
export async function fetchWalkScore(
  apiKey: string,
  address: string,
  lat: number,
  lng: number
): Promise<DataSourceResult<{ walkScore: number; transitScore: number; bikeScore: number }>> {
  const url = `https://api.walkscore.com/score?format=json&address=${encodeURIComponent(address)}&lat=${lat}&lon=${lng}&transit=1&bike=1&wsapikey=${apiKey}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Walk Score API error: ${response.statusText}`);
    const json = await response.json();

    return {
      data: {
        walkScore: json.walkscore || 0,
        transitScore: json.transit?.score || 0,
        bikeScore: json.bike?.score || 0,
      },
      source: "Walk Score",
      fetchedAt: new Date().toISOString(),
      cacheExpiry: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      status: "fresh",
    };
  } catch (error) {
    return { data: { walkScore: 0, transitScore: 0, bikeScore: 0 }, source: "Walk Score", fetchedAt: new Date().toISOString(), cacheExpiry: new Date().toISOString(), status: "error", error: error instanceof Error ? error.message : "Unknown" };
  }
}

// --- RentCast API (rental estimates) ---

/**
 * Fetch rental estimates and comparable rentals
 */
export async function fetchRentalEstimate(
  apiKey: string,
  address: string
): Promise<DataSourceResult<{ estimate: number; rangeLow: number; rangeHigh: number; comparables: Record<string, unknown>[] }>> {
  const url = `https://api.rentcast.io/v1/avm/rent/long-term?address=${encodeURIComponent(address)}`;

  try {
    const response = await fetch(url, {
      headers: { "X-Api-Key": apiKey, Accept: "application/json" },
    });

    if (!response.ok) throw new Error(`RentCast API error: ${response.statusText}`);
    const json = await response.json();

    return {
      data: {
        estimate: json.rent || 0,
        rangeLow: json.rentRangeLow || 0,
        rangeHigh: json.rentRangeHigh || 0,
        comparables: json.comparables || [],
      },
      source: "RentCast",
      fetchedAt: new Date().toISOString(),
      cacheExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: "fresh",
    };
  } catch (error) {
    return { data: { estimate: 0, rangeLow: 0, rangeHigh: 0, comparables: [] }, source: "RentCast", fetchedAt: new Date().toISOString(), cacheExpiry: new Date().toISOString(), status: "error", error: error instanceof Error ? error.message : "Unknown" };
  }
}

// --- ATTOM Data API (property data, sales history, valuations) ---

/**
 * Fetch property details and sales history
 */
export async function fetchPropertyDetails(
  apiKey: string,
  address: string
): Promise<DataSourceResult<Record<string, unknown>>> {
  const url = `https://api.gateway.attomdata.com/propertyapi/v1.0.0/property/detail?address=${encodeURIComponent(address)}`;

  try {
    const response = await fetch(url, {
      headers: { APIKey: apiKey, Accept: "application/json" },
    });

    if (!response.ok) throw new Error(`ATTOM API error: ${response.statusText}`);
    const data = await response.json();

    return { data, source: "ATTOM Data", fetchedAt: new Date().toISOString(), cacheExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), status: "fresh" };
  } catch (error) {
    return { data: {}, source: "ATTOM Data", fetchedAt: new Date().toISOString(), cacheExpiry: new Date().toISOString(), status: "error", error: error instanceof Error ? error.message : "Unknown" };
  }
}

/**
 * Fetch sales history for a property (price over time)
 */
export async function fetchSalesHistory(
  apiKey: string,
  address: string
): Promise<DataSourceResult<{ date: string; price: number; type: string }[]>> {
  const url = `https://api.gateway.attomdata.com/propertyapi/v1.0.0/saleshistory/detail?address=${encodeURIComponent(address)}`;

  try {
    const response = await fetch(url, {
      headers: { APIKey: apiKey, Accept: "application/json" },
    });

    if (!response.ok) throw new Error(`ATTOM Sales History API error: ${response.statusText}`);
    const json = await response.json();
    const sales = json.property?.[0]?.saleHistory?.map((s: Record<string, unknown>) => ({
      date: s.saleTransDate,
      price: s.saleAmt,
      type: s.saleTransType,
    })) || [];

    return { data: sales, source: "ATTOM Data (Sales History)", fetchedAt: new Date().toISOString(), cacheExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), status: "fresh" };
  } catch (error) {
    return { data: [], source: "ATTOM Data (Sales History)", fetchedAt: new Date().toISOString(), cacheExpiry: new Date().toISOString(), status: "error", error: error instanceof Error ? error.message : "Unknown" };
  }
}

// --- IRS SOI Migration Data ---

/**
 * Fetch IRS Statistics of Income migration data
 * Shows where people are moving from/to by county
 * Available at: https://www.irs.gov/statistics/soi-tax-stats-migration-data
 */
export async function fetchIRSMigration(
  stateCode: string,
  countyCode: string,
  year: number = 2022
): Promise<DataSourceResult<{ inflow: number; outflow: number; netMigration: number; avgIncome: number }>> {
  // IRS SOI data is typically downloaded as CSV files
  // In production, these would be pre-loaded into the database
  // This connector would query our database of parsed IRS data
  const url = `https://www.irs.gov/statistics/soi-tax-stats-migration-data-${year}`;

  return {
    data: { inflow: 0, outflow: 0, netMigration: 0, avgIncome: 0 },
    source: "IRS SOI Migration",
    fetchedAt: new Date().toISOString(),
    cacheExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    status: "stale",
    error: "IRS data requires manual download and database import",
  };
}

// --- Census ACS Expense Estimates (property tax + vacancy by ZIP) ---

/**
 * Fetches ZIP-level property tax rate and rental vacancy rate from the
 * Census ACS 5-Year API.
 *
 * Census variables:
 *   B25103_001E — Median real estate taxes paid (owner-occupied, dollars)
 *   B25077_001E — Median home value (owner-occupied, dollars)
 *   B25004_002E — Vacant units: for rent
 *   B25004_003E — Vacant units: rented, not occupied
 *   B25003_003E — Renter-occupied units
 *
 * Effective tax rate = B25103_001E / B25077_001E
 * Rental vacancy rate = (B25004_002E + B25004_003E) /
 *                       (B25003_003E + B25004_002E + B25004_003E)
 *
 * Fallback: ZIP → state → national average (0.90% tax, 5.8% vacancy)
 *
 * Cache TTL: 30 days (Census ACS updates annually).
 */
export async function fetchExpenseEstimates(
  apiKey: string,
  zip: string
): Promise<DataSourceResult<{
  zip: string;
  propertyTaxRate: number;
  rentalVacancyRate: number;
  medianHomeValue: number;
  medianTaxPaid: number;
  managementFeeRate: number;
  state: string;
  source: string;
  asOfDate: string;
  confidence: "high" | "medium" | "low";
  dataGaps: string[];
}>> {
  const CENSUS_VARS =
    "B25103_001E,B25077_001E,B25004_002E,B25004_003E,B25003_003E";
  const CENSUS_ACS_YEAR = 2022;
  const CENSUS_NULL_VALUE = -666666666;

  // State-level management fee averages (NARPM industry data, 2024)
  const MGMT_FEE_BY_STATE: Record<string, number> = {
    AL: 0.1, AK: 0.1, AZ: 0.08, AR: 0.1, CA: 0.07, CO: 0.08, CT: 0.09,
    DE: 0.09, DC: 0.08, FL: 0.09, GA: 0.09, HI: 0.1, ID: 0.09, IL: 0.08,
    IN: 0.1, IA: 0.1, KS: 0.1, KY: 0.1, LA: 0.1, ME: 0.1, MD: 0.08,
    MA: 0.07, MI: 0.09, MN: 0.08, MS: 0.1, MO: 0.1, MT: 0.1, NE: 0.1,
    NV: 0.08, NH: 0.09, NJ: 0.08, NM: 0.1, NY: 0.07, NC: 0.09, ND: 0.1,
    OH: 0.09, OK: 0.1, OR: 0.08, PA: 0.09, RI: 0.09, SC: 0.1, SD: 0.1,
    TN: 0.1, TX: 0.09, UT: 0.09, VT: 0.1, VA: 0.08, WA: 0.08, WV: 0.1,
    WI: 0.09, WY: 0.1,
  };

  const STATE_FIPS: Record<string, string> = {
    AL: "01", AK: "02", AZ: "04", AR: "05", CA: "06", CO: "08", CT: "09",
    DE: "10", DC: "11", FL: "12", GA: "13", HI: "15", ID: "16", IL: "17",
    IN: "18", IA: "19", KS: "20", KY: "21", LA: "22", ME: "23", MD: "24",
    MA: "25", MI: "26", MN: "27", MS: "28", MO: "29", MT: "30", NE: "31",
    NV: "32", NH: "33", NJ: "34", NM: "35", NY: "36", NC: "37", ND: "38",
    OH: "39", OK: "40", OR: "41", PA: "42", RI: "44", SC: "45", SD: "46",
    TN: "47", TX: "48", UT: "49", VT: "50", VA: "51", WA: "53", WV: "54",
    WI: "55", WY: "56", PR: "72",
  };

  // Coarse ZIP-prefix → state mapping (USPS allocation)
  const stateFromZip = (z: string): string => {
    const p = parseInt(z.substring(0, 3), 10);
    if (p <= 9) return "PR";
    if (p <= 27) return "MA";
    if (p <= 29) return "RI";
    if (p <= 39) return "NH";
    if (p <= 49) return "ME";
    if (p <= 59) return "VT";
    if (p <= 69) return "CT";
    if (p <= 99) return "NJ";
    if (p <= 149) return "NY";
    if (p <= 196) return "PA";
    if (p <= 199) return "DE";
    if (p <= 205) return "DC";
    if (p <= 219) return "MD";
    if (p <= 246) return "VA";
    if (p <= 268) return "WV";
    if (p <= 289) return "NC";
    if (p <= 299) return "SC";
    if (p <= 319) return "GA";
    if (p <= 349) return "FL";
    if (p <= 369) return "AL";
    if (p <= 385) return "TN";
    if (p <= 399) return "MS";
    if (p <= 427) return "KY";
    if (p <= 458) return "OH";
    if (p <= 479) return "IN";
    if (p <= 499) return "MI";
    if (p <= 528) return "IA";
    if (p <= 549) return "WI";
    if (p <= 567) return "MN";
    if (p <= 577) return "SD";
    if (p <= 588) return "ND";
    if (p <= 599) return "MT";
    if (p <= 629) return "IL";
    if (p <= 658) return "MO";
    if (p <= 679) return "KS";
    if (p <= 693) return "NE";
    if (p <= 714) return "LA";
    if (p <= 729) return "AR";
    if (p <= 749) return "OK";
    if (p <= 799) return "TX";
    if (p <= 816) return "CO";
    if (p <= 831) return "WY";
    if (p <= 838) return "ID";
    if (p <= 847) return "UT";
    if (p <= 865) return "AZ";
    if (p <= 884) return "NM";
    if (p <= 885) return "TX";
    if (p <= 898) return "NV";
    if (p <= 961) return "CA";
    if (p <= 979) return "OR";
    if (p <= 994) return "WA";
    if (p <= 999) return "AK";
    return "US";
  };

  const fetchVars = async (geography: string) => {
    const url = `https://api.census.gov/data/${CENSUS_ACS_YEAR}/acs/acs5?get=${CENSUS_VARS}&for=${encodeURIComponent(geography)}&key=${apiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    const json: unknown = await res.json();
    if (!Array.isArray(json) || json.length < 2) return null;
    const [header, data] = json as [string[], string[]];
    const idx = (v: string) => header.indexOf(v);
    const val = (v: string) => {
      const i = idx(v);
      if (i === -1) return 0;
      const n = parseFloat(data[i] ?? "0");
      if (!isFinite(n) || n === CENSUS_NULL_VALUE || n < 0) return 0;
      return n;
    };
    return {
      medianTaxPaid: val("B25103_001E"),
      medianHomeValue: val("B25077_001E"),
      vacantForRent: val("B25004_002E"),
      vacantRentedNotOccupied: val("B25004_003E"),
      renterOccupied: val("B25003_003E"),
    };
  };

  const computeRates = (row: NonNullable<Awaited<ReturnType<typeof fetchVars>>>) => {
    const dataGaps: string[] = [];
    let propertyTaxRate = 0.009;
    if (row.medianTaxPaid > 0 && row.medianHomeValue > 0) {
      propertyTaxRate = Math.max(0.001, Math.min(0.04, row.medianTaxPaid / row.medianHomeValue));
    } else {
      dataGaps.push("property_tax_rate");
    }
    const totalVacantRental = row.vacantForRent + row.vacantRentedNotOccupied;
    const totalRentalUnits = row.renterOccupied + totalVacantRental;
    let rentalVacancyRate = 0.058;
    if (totalRentalUnits > 0) {
      rentalVacancyRate = Math.max(0.01, Math.min(0.3, totalVacantRental / totalRentalUnits));
    } else {
      dataGaps.push("rental_vacancy_rate");
    }
    return {
      propertyTaxRate: Math.round(propertyTaxRate * 100000) / 100000,
      rentalVacancyRate: Math.round(rentalVacancyRate * 100000) / 100000,
      medianHomeValue: row.medianHomeValue,
      medianTaxPaid: row.medianTaxPaid,
      dataGaps,
    };
  };

  const state = stateFromZip(zip);
  const mgmtFeeRate = MGMT_FEE_BY_STATE[state] ?? 0.085;
  const cacheExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const fetchedAt = new Date().toISOString();

  try {
    // Attempt 1: ZIP-level (ZCTA)
    const zipRow = await fetchVars(`zip code tabulation area:${zip}`);
    if (zipRow && (zipRow.medianTaxPaid > 0 || zipRow.medianHomeValue > 0)) {
      const computed = computeRates(zipRow);
      return {
        data: {
          zip,
          ...computed,
          managementFeeRate: mgmtFeeRate,
          state,
          source: `Census ACS 5-Year ${CENSUS_ACS_YEAR}`,
          asOfDate: String(CENSUS_ACS_YEAR),
          confidence: computed.dataGaps.length === 0 ? "high" : "medium",
        },
        source: `Census ACS 5-Year ${CENSUS_ACS_YEAR} (ZCTA)`,
        fetchedAt,
        cacheExpiry,
        status: "fresh",
      };
    }

    // Attempt 2: State-level fallback
    const stateFips = STATE_FIPS[state];
    if (stateFips) {
      const stateRow = await fetchVars(`state:${stateFips}`);
      if (stateRow && (stateRow.medianTaxPaid > 0 || stateRow.medianHomeValue > 0)) {
        const computed = computeRates(stateRow);
        return {
          data: {
            zip,
            ...computed,
            managementFeeRate: mgmtFeeRate,
            state,
            source: `Census ACS 5-Year ${CENSUS_ACS_YEAR} (state-level fallback: ${state})`,
            asOfDate: String(CENSUS_ACS_YEAR),
            confidence: "medium",
            dataGaps: [...computed.dataGaps, "zip_level_data_unavailable"],
          },
          source: `Census ACS 5-Year ${CENSUS_ACS_YEAR} (state)`,
          fetchedAt,
          cacheExpiry,
          status: "fresh",
        };
      }
    }

    // Attempt 3: National averages
    return {
      data: {
        zip,
        propertyTaxRate: 0.009,
        rentalVacancyRate: 0.058,
        medianHomeValue: 0,
        medianTaxPaid: 0,
        managementFeeRate: mgmtFeeRate,
        state,
        source: `National average — Census ACS ${CENSUS_ACS_YEAR} unavailable for this area`,
        asOfDate: String(CENSUS_ACS_YEAR),
        confidence: "low",
        dataGaps: ["zip_level_data_unavailable", "state_level_data_unavailable"],
      },
      source: "national_average",
      fetchedAt,
      cacheExpiry,
      status: "stale",
    };
  } catch (error) {
    return {
      data: {
        zip,
        propertyTaxRate: 0.009,
        rentalVacancyRate: 0.058,
        medianHomeValue: 0,
        medianTaxPaid: 0,
        managementFeeRate: mgmtFeeRate,
        state,
        source: "Error fallback — national averages",
        asOfDate: String(CENSUS_ACS_YEAR),
        confidence: "low",
        dataGaps: ["api_error"],
      },
      source: "error_fallback",
      fetchedAt,
      cacheExpiry: new Date().toISOString(),
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// --- Data Source Registry ---

export const DATA_SOURCE_REGISTRY = {
  demographics: {
    primary: "Census ACS 5-Year",
    secondary: "IRS SOI Migration",
    refreshFrequency: "annually",
    apiDocs: "https://www.census.gov/data/developers/data-sets/acs-5year.html",
  },
  employment: {
    primary: "Bureau of Labor Statistics (QCEW)",
    secondary: "BLS Current Employment Statistics",
    refreshFrequency: "monthly",
    apiDocs: "https://www.bls.gov/developers/",
  },
  economicIndicators: {
    primary: "Federal Reserve (FRED)",
    secondary: "Census Bureau Economic Indicators",
    refreshFrequency: "daily-monthly",
    apiDocs: "https://fred.stlouisfed.org/docs/api/fred/",
  },
  schools: {
    primary: "GreatSchools API",
    refreshFrequency: "annually",
    apiDocs: "https://www.greatschools.org/api/",
  },
  walkability: {
    primary: "Walk Score API",
    refreshFrequency: "quarterly",
    apiDocs: "https://www.walkscore.com/professional/api.php",
  },
  rentals: {
    primary: "RentCast API",
    secondary: "Zillow ZORI (Zillow Observed Rent Index)",
    refreshFrequency: "weekly",
    apiDocs: "https://developers.rentcast.io/",
  },
  propertyData: {
    primary: "ATTOM Data API",
    secondary: "Zillow/Redfin scraping via Playwright",
    refreshFrequency: "daily",
    apiDocs: "https://api.gateway.attomdata.com/",
  },
  permits: {
    primary: "City Open Data Portals (Socrata API)",
    secondary: "Census Building Permits Survey",
    refreshFrequency: "monthly",
    apiDocs: "https://dev.socrata.com/",
  },
  crime: {
    primary: "FBI UCR API",
    secondary: "Local police department APIs",
    refreshFrequency: "annually",
    apiDocs: "https://crime-data-explorer.fr.cloud.gov/pages/docApi",
  },
  climate: {
    primary: "First Street Foundation API",
    secondary: "FEMA flood map API",
    refreshFrequency: "annually",
    apiDocs: "https://firststreet.org/api/",
  },
  taxAssessment: {
    primary: "ATTOM Data API",
    secondary: "County assessor websites",
    refreshFrequency: "annually",
  },
  expenseEstimates: {
    primary: "Census ACS 5-Year (B25103, B25077, B25004, B25003)",
    secondary: "State-level Census fallback → national averages",
    refreshFrequency: "annually",
    apiDocs: "https://www.census.gov/data/developers/data-sets/acs-5year.html",
  },
  migration: {
    primary: "IRS SOI Migration Data",
    secondary: "Census ACS Migration Tables",
    refreshFrequency: "annually",
    apiDocs: "https://www.irs.gov/statistics/soi-tax-stats-migration-data",
  },
};
