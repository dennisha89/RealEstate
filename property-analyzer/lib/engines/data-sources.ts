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
  migration: {
    primary: "IRS SOI Migration Data",
    secondary: "Census ACS Migration Tables",
    refreshFrequency: "annually",
    apiDocs: "https://www.irs.gov/statistics/soi-tax-stats-migration-data",
  },
};
