/**
 * Data Bridge — connects real API connectors to the analysis engines.
 *
 * Pattern:
 * 1. Check if API key exists in env
 * 2. If yes → call real connector from data-sources.ts → transform to engine input format
 * 3. If no → return null (caller falls back to mock)
 *
 * This file is the ONLY place where env vars are read and real APIs are called.
 * Each function returns { data, source } or null if the API isn't configured.
 */

import { fetchCensusACS, fetchBLSData, fetchFREDData } from "./data-sources";
import type { RawDemographicData } from "./demographic-engine";
import type { RawEconomicData } from "./economic-engine";

// =============================================================================
// Census ACS → Demographics
// =============================================================================

/**
 * Fetches Census ACS data and transforms it into the RawDemographicData
 * format expected by the demographic-engine.
 *
 * Returns null if CENSUS_API_KEY is not configured.
 */
export async function fetchRealDemographics(
  zipCode: string
): Promise<{ data: RawDemographicData; source: string } | null> {
  const apiKey = process.env.CENSUS_API_KEY;
  if (!apiKey) return null;

  // Fetch current + historical years for trend calculation
  const [current, oneYearAgo, threeYearAgo, fiveYearAgo] = await Promise.allSettled([
    fetchCensusACS(apiKey, zipCode, 2023),
    fetchCensusACS(apiKey, zipCode, 2022),
    fetchCensusACS(apiKey, zipCode, 2020),
    fetchCensusACS(apiKey, zipCode, 2018),
  ]);

  const getCensusValue = (result: PromiseSettledResult<Awaited<ReturnType<typeof fetchCensusACS>>>, varIndex: number): number => {
    if (result.status !== "fulfilled" || result.value.status === "error") return 0;
    const rows = result.value.data;
    if (!rows || rows.length < 2) return 0;
    // Census API returns [header_row, data_row] — values are strings
    const row = rows[1];
    const keys = Object.keys(row);
    const val = row[keys[varIndex]];
    return val ? parseFloat(val) || 0 : 0;
  };

  // Variable order matches fetchCensusACS: B01003, B19013, B25077, B25064, B25003_003, B25003_002, B01002, B15003_022, B15003_023, B15003_024, B15003_025, B23025_005, B23025_002, B07001_065, B19001_017
  const pop = (r: PromiseSettledResult<Awaited<ReturnType<typeof fetchCensusACS>>>) => getCensusValue(r, 0);
  const income = (r: PromiseSettledResult<Awaited<ReturnType<typeof fetchCensusACS>>>) => getCensusValue(r, 1);
  const laborForce = (r: PromiseSettledResult<Awaited<ReturnType<typeof fetchCensusACS>>>) => getCensusValue(r, 12);
  const unemployed = (r: PromiseSettledResult<Awaited<ReturnType<typeof fetchCensusACS>>>) => getCensusValue(r, 11);
  const bachelors = (r: PromiseSettledResult<Awaited<ReturnType<typeof fetchCensusACS>>>) => getCensusValue(r, 7);
  const masters = (r: PromiseSettledResult<Awaited<ReturnType<typeof fetchCensusACS>>>) => getCensusValue(r, 8);
  const prof = (r: PromiseSettledResult<Awaited<ReturnType<typeof fetchCensusACS>>>) => getCensusValue(r, 9);
  const doctorate = (r: PromiseSettledResult<Awaited<ReturnType<typeof fetchCensusACS>>>) => getCensusValue(r, 10);
  const migration = (r: PromiseSettledResult<Awaited<ReturnType<typeof fetchCensusACS>>>) => getCensusValue(r, 13);
  const highIncome = (r: PromiseSettledResult<Awaited<ReturnType<typeof fetchCensusACS>>>) => getCensusValue(r, 14);

  const curPop = pop(current);
  const curIncome = income(current);
  const curLF = laborForce(current);
  const curBach = bachelors(current);

  // Calculate percentages where needed
  const bachPct = curPop > 0 ? (curBach / curPop) * 100 : 0;
  const gradPct = curPop > 0 ? ((masters(current) + prof(current) + doctorate(current)) / curPop) * 100 : 0;
  const highIncomePct = curPop > 0 ? (highIncome(current) / curPop) * 100 : 0;

  const data: RawDemographicData = {
    population: {
      current: curPop,
      oneYearAgo: pop(oneYearAgo),
      threeYearAgo: pop(threeYearAgo),
      fiveYearAgo: pop(fiveYearAgo),
      nationalAvg: 0,
    },
    medianIncome: {
      current: curIncome,
      oneYearAgo: income(oneYearAgo),
      threeYearAgo: income(threeYearAgo),
      fiveYearAgo: income(fiveYearAgo),
      nationalAvg: 75000,
    },
    netMigration: {
      current: migration(current),
      oneYearAgo: migration(oneYearAgo),
      threeYearAgo: migration(threeYearAgo),
      fiveYearAgo: migration(fiveYearAgo),
    },
    professionals: {
      doctors: { current: 0, oneYearAgo: 0, threeYearAgo: 0, fiveYearAgo: 0 },
      engineers: { current: 0, oneYearAgo: 0, threeYearAgo: 0, fiveYearAgo: 0 },
      tech: { current: 0, oneYearAgo: 0, threeYearAgo: 0, fiveYearAgo: 0 },
      highIncome: {
        current: highIncomePct,
        oneYearAgo: curPop > 0 ? (highIncome(oneYearAgo) / (pop(oneYearAgo) || 1)) * 100 : 0,
        threeYearAgo: curPop > 0 ? (highIncome(threeYearAgo) / (pop(threeYearAgo) || 1)) * 100 : 0,
        fiveYearAgo: curPop > 0 ? (highIncome(fiveYearAgo) / (pop(fiveYearAgo) || 1)) * 100 : 0,
      },
    },
    education: {
      bachelors: {
        current: bachPct,
        oneYearAgo: pop(oneYearAgo) > 0 ? (bachelors(oneYearAgo) / pop(oneYearAgo)) * 100 : 0,
        threeYearAgo: pop(threeYearAgo) > 0 ? (bachelors(threeYearAgo) / pop(threeYearAgo)) * 100 : 0,
        fiveYearAgo: pop(fiveYearAgo) > 0 ? (bachelors(fiveYearAgo) / pop(fiveYearAgo)) * 100 : 0,
        nationalAvg: 33,
      },
      graduate: {
        current: gradPct,
        oneYearAgo: pop(oneYearAgo) > 0 ? ((masters(oneYearAgo) + prof(oneYearAgo) + doctorate(oneYearAgo)) / pop(oneYearAgo)) * 100 : 0,
        threeYearAgo: pop(threeYearAgo) > 0 ? ((masters(threeYearAgo) + prof(threeYearAgo) + doctorate(threeYearAgo)) / pop(threeYearAgo)) * 100 : 0,
        fiveYearAgo: pop(fiveYearAgo) > 0 ? ((masters(fiveYearAgo) + prof(fiveYearAgo) + doctorate(fiveYearAgo)) / pop(fiveYearAgo)) * 100 : 0,
        nationalAvg: 13,
      },
    },
    ageCohorts: {
      millennials: { current: 28, oneYearAgo: 27, threeYearAgo: 25, fiveYearAgo: 23 },
      youngFamilies: { current: 15, oneYearAgo: 14.5, threeYearAgo: 13, fiveYearAgo: 12 },
      retirees: { current: 12, oneYearAgo: 12.5, threeYearAgo: 13, fiveYearAgo: 14 },
    },
    householdFormation: {
      current: 2.0,
      oneYearAgo: 1.8,
      threeYearAgo: 1.6,
      fiveYearAgo: 1.4,
    },
  };

  return {
    data,
    source: "Census ACS 5-Year (real)",
  };
}

// =============================================================================
// FRED → Macro Economic Data
// =============================================================================

export interface FREDMacroData {
  mortgageRate30yr: number;
  mortgageRate30yrPrior: number;
  medianHomePrice: number;
  medianHomePricePrior: number;
  unemploymentRate: number;
  cpi: number;
  gdpGrowth: number;
  fedFundsRate: number;
}

/**
 * Fetches key macro indicators from FRED.
 * Returns null if FRED_API_KEY is not configured.
 */
export async function fetchRealFREDData(): Promise<{
  data: FREDMacroData;
  source: string;
} | null> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) return null;

  const series = [
    "MORTGAGE30US",
    "MSPUS",
    "UNRATE",
    "CPIAUCSL",
    "GDP",
    "FEDFUNDS",
  ];

  const results = await Promise.allSettled(
    series.map((id) => fetchFREDData(apiKey, id))
  );

  const getValue = (index: number, offset: number = 0): number => {
    const result = results[index];
    if (result.status !== "fulfilled" || result.value.status === "error") return 0;
    const obs = result.value.data;
    return obs[offset]?.value ?? 0;
  };

  return {
    data: {
      mortgageRate30yr: getValue(0, 0),
      mortgageRate30yrPrior: getValue(0, 12),
      medianHomePrice: getValue(1, 0),
      medianHomePricePrior: getValue(1, 4),
      unemploymentRate: getValue(2, 0),
      cpi: getValue(3, 0),
      gdpGrowth: getValue(4, 0),
      fedFundsRate: getValue(5, 0),
    },
    source: "FRED (real)",
  };
}

// =============================================================================
// BLS → Employment Data
// =============================================================================

export interface BLSEmploymentData {
  unemploymentRate: number;
  totalEmployment: number;
  yearAgoEmployment: number;
  jobGrowthPct: number;
}

/**
 * Fetches employment data from BLS.
 * Returns null if BLS_API_KEY is not configured.
 */
export async function fetchRealBLSData(
  fipsCode: string
): Promise<{ data: BLSEmploymentData; source: string } | null> {
  const apiKey = process.env.BLS_API_KEY;
  if (!apiKey) return null;

  const currentYear = new Date().getFullYear();
  const seriesIds = [
    `LAUCN${fipsCode}0000000003`, // Unemployment rate
    `LAUCN${fipsCode}0000000005`, // Employment level
  ];

  const result = await fetchBLSData(apiKey, seriesIds, currentYear - 2, currentYear);
  if (result.status === "error") return null;

  const data = result.data as Record<string, unknown>;
  const seriesResults = (data.Results as Record<string, unknown>)?.series as Array<{
    seriesID: string;
    data: Array<{ year: string; period: string; value: string }>;
  }> | undefined;

  if (!seriesResults || seriesResults.length < 2) return null;

  const latestUnemployment = parseFloat(seriesResults[0]?.data?.[0]?.value ?? "0");
  const latestEmployment = parseFloat(seriesResults[1]?.data?.[0]?.value ?? "0");
  const yearAgoEmployment = parseFloat(seriesResults[1]?.data?.[12]?.value ?? "0");
  const jobGrowthPct = yearAgoEmployment > 0
    ? ((latestEmployment - yearAgoEmployment) / yearAgoEmployment) * 100
    : 0;

  return {
    data: {
      unemploymentRate: latestUnemployment,
      totalEmployment: latestEmployment,
      yearAgoEmployment,
      jobGrowthPct,
    },
    source: "BLS (real)",
  };
}

// =============================================================================
// Status helper
// =============================================================================

/** Returns which data sources are available based on configured env vars */
export function getAvailableDataSources(): {
  census: boolean;
  fred: boolean;
  bls: boolean;
  attom: boolean;
  rentcast: boolean;
  walkScore: boolean;
  greatSchools: boolean;
} {
  return {
    census: !!process.env.CENSUS_API_KEY,
    fred: !!process.env.FRED_API_KEY,
    bls: !!process.env.BLS_API_KEY,
    attom: !!process.env.ATTOM_API_KEY,
    rentcast: !!process.env.RENTCAST_API_KEY,
    walkScore: !!process.env.WALKSCORE_API_KEY,
    greatSchools: !!process.env.GREATSCHOOLS_API_KEY,
  };
}
